import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { emailService } from '../services/email.service';
import { EmailTemplateService } from '../services/emailTemplate.service';
import { commonSlotService } from '../services/commonSlot.service';
import { generateJWT } from '../utils/jwt';
import { calculateEndTime, calculateCandidateSlots, checkMinNoticeHours } from '../utils/timeSlots';
import { logger } from '../utils/logger';
import { buildFrontendUrl, buildInterviewerLoginLink } from '../utils/frontendUrl';
import dayjs from 'dayjs';

export const interviewRouter = Router();

// 면접 생성 스키마 (N:N 구조)
const createInterviewSchema = z.object({
  mainNotice: z.string().min(1, '공고명을 입력해주세요'),
  teamName: z.string().min(1, '팀명을 입력해주세요'),
  proposedSlots: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다 (HH:mm)'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다 (HH:mm)'),
  }).refine((slot) => slot.startTime < slot.endTime, {
    message: '시작 시간은 종료 시간보다 빨라야 합니다',
    path: ['endTime'],
  })).min(1, '최소 1개의 제안 일정을 입력해주세요').max(5, '제안 일정은 최대 5개까지 입력 가능합니다'),
  candidates: z.array(z.object({
    name: z.string().min(1, '이름을 입력해주세요'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    positionApplied: z.string().min(1, '지원 직무를 입력해주세요'),
    interviewerIds: z.array(z.string()).min(1, '최소 1명의 면접관을 선택해주세요').max(5, '최대 5명까지 선택 가능합니다'),
  })).min(1, '최소 1명의 면접자를 입력해주세요'),
}).refine(async (data) => {
  // 팀장급 필수 체크
  const allInterviewers = await dataService.getAllInterviewers();
  const allInterviewerIds = new Set(data.candidates.flatMap(c => c.interviewerIds));
  
  for (const interviewerId of allInterviewerIds) {
    const interviewer = allInterviewers.find(iv => iv.interviewer_id === interviewerId);
    if (interviewer?.is_team_lead) {
      return true; // 팀장급이 하나라도 있으면 통과
    }
  }
  
  return false; // 팀장급이 없으면 실패
}, {
  message: '팀장급 이상 1명은 필수로 포함해야 합니다',
});

// 고급 검색
interviewRouter.get('/search', adminAuth, async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      status,
      interviewerId,
      candidateId,
      candidateName,
      mainNotice,
      teamName,
      roomId,
      hasCommonSlot,
      sortBy = 'created',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;
    
    let interviews = await dataService.getAllInterviews();
    
    // 필터링
    if (startDate) {
      interviews = interviews.filter(i => {
        const date = i.proposed_date || i.confirmed_date;
        return date && date >= startDate;
      });
    }
    if (endDate) {
      interviews = interviews.filter(i => {
        const date = i.proposed_date || i.confirmed_date;
        return date && date <= endDate;
      });
    }
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      interviews = interviews.filter(i => statusArray.includes(i.status));
    }
    if (mainNotice) {
      const search = (mainNotice as string).toLowerCase();
      interviews = interviews.filter(i => 
        i.main_notice?.toLowerCase().includes(search)
      );
    }
    if (teamName) {
      const search = (teamName as string).toLowerCase();
      interviews = interviews.filter(i => 
        i.team_name?.toLowerCase().includes(search)
      );
    }
    if (roomId) {
      interviews = interviews.filter(i => i.room_id === roomId);
    }
    
    // 면접관 필터
    if (interviewerId) {
      const filtered = [];
      for (const interview of interviews) {
        const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        if (mappings.some(m => m.interviewer_id === interviewerId)) {
          filtered.push(interview);
        }
      }
      interviews = filtered;
    }
    
    // 지원자 필터
    if (candidateId || candidateName) {
      const filtered = [];
      for (const interview of interviews) {
        const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
        if (candidateId) {
          if (candidates.some(c => c.candidate_id === candidateId)) {
            filtered.push(interview);
          }
        }
        if (candidateName) {
          const search = (candidateName as string).toLowerCase();
          if (candidates.some(c => c.name?.toLowerCase().includes(search))) {
            filtered.push(interview);
          }
        }
      }
      interviews = filtered;
    }
    
    // 공통 일정 필터
    if (hasCommonSlot !== undefined) {
      const filtered = [];
      for (const interview of interviews) {
        const schedule = await dataService.getConfirmedSchedule(interview.interview_id);
        if (hasCommonSlot === 'true' && schedule) {
          filtered.push(interview);
        } else if (hasCommonSlot === 'false' && !schedule) {
          filtered.push(interview);
        }
      }
      interviews = filtered;
    }
    
    // 정렬
    interviews.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortBy === 'date') {
        aValue = a.proposed_date || a.confirmed_date || '';
        bValue = b.proposed_date || b.confirmed_date || '';
      } else if (sortBy === 'created') {
        aValue = a.created_at || '';
        bValue = b.created_at || '';
      } else if (sortBy === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
      } else {
        aValue = a.created_at || '';
        bValue = b.created_at || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    // 페이징
    const total = interviews.length;
    const totalPages = Math.ceil(total / Number(limit));
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedInterviews = interviews.slice(startIndex, startIndex + Number(limit));
    
    // 사용 가능한 필터 옵션
    const allInterviews = await dataService.getAllInterviews();
    const allStatuses = [...new Set(allInterviews.map(i => i.status))];
    const allInterviewers = await dataService.getAllInterviewers();
    const allRooms = await dataService.getAllRooms();
    
    res.json({
      success: true,
      data: {
        interviews: paginatedInterviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
        },
        filters: {
          applied: {
            startDate: startDate || null,
            endDate: endDate || null,
            status: status || null,
            interviewerId: interviewerId || null,
            candidateId: candidateId || null,
            candidateName: candidateName || null,
            mainNotice: mainNotice || null,
            teamName: teamName || null,
            roomId: roomId || null,
            hasCommonSlot: hasCommonSlot || null,
          },
          available: {
            statuses: allStatuses,
            interviewers: allInterviewers.map(iv => ({
              interviewer_id: iv.interviewer_id,
              name: iv.name,
              email: iv.email,
            })),
            rooms: allRooms.map(r => ({
              room_id: r.room_id,
              room_name: r.room_name,
            })),
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error searching interviews:', error);
    throw new AppError(500, '면접 검색 실패');
  }
});

// 대시보드 통계 조회
interviewRouter.get('/dashboard', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviews = await dataService.getAllInterviews();

    const stats = {
      pending: interviews.filter(i => i.status === 'PENDING').length,
      partial: interviews.filter(i => i.status === 'PARTIAL').length,
      pendingApproval: interviews.filter(i => i.status === 'PENDING_APPROVAL').length,
      confirmed: interviews.filter(i => i.status === 'CONFIRMED').length,
      noCommon: interviews.filter(i => i.status === 'NO_COMMON').length,
      scheduled: interviews.filter(i => i.status === 'SCHEDULED').length,
      inProgress: interviews.filter(i => i.status === 'IN_PROGRESS').length,
      completed: interviews.filter(i => i.status === 'COMPLETED').length,
      cancelled: interviews.filter(i => i.status === 'CANCELLED').length,
      noShow: interviews.filter(i => i.status === 'NO_SHOW').length,
    };

    // 최근 면접 50개 (최신순) - 대시보드와 목록 노출 일치
    const recentInterviews = interviews
      .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))
      .slice(0, 50)
      .map(interview => ({
        interviewId: interview.interview_id,
        mainNotice: interview.main_notice,
        teamName: interview.team_name,
        status: interview.status,
        createdAt: interview.created_at,
      }));

    res.json({
      success: true,
      data: {
        stats,
        recentInterviews,
      },
    });
  } catch (error) {
    throw new AppError(500, '대시보드 데이터 조회 실패');
  }
});

// 면접 목록 조회
interviewRouter.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviews = await dataService.getAllInterviews();
    
    res.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    throw new AppError(500, '면접 목록 조회 실패');
  }
});

// 면접 상세 조회
interviewRouter.get('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 면접관 및 응답 현황 조회
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));

    const responseStatus = mappings.map(mapping => {
      const interviewer = interviewerMap.get(mapping.interviewer_id);
      const notFound = !interviewer;
      return {
        interviewerId: mapping.interviewer_id,
        name: interviewer?.name || `미등록 (ID: ${mapping.interviewer_id})`,
        email: interviewer?.email ?? '',
        responded: !!mapping.responded_at,
        respondedAt: mapping.responded_at,
        notFound, // 프론트에서 미등록 면접관 안내용
      };
    });

    // 시간 선택 조회
    const timeSelections = await dataService.getTimeSelectionsByInterview(interviewId);
    const proposedSlotsRaw = await dataService.getProposedSlots(interviewId);
    const timeSelectionsWithNames = timeSelections.map(selection => {
      const interviewer = interviewerMap.get(selection.interviewer_id);
      return {
        ...selection,
        interviewerName: interviewer?.name || 'Unknown',
      };
    });
    const proposedSlots = proposedSlotsRaw.length > 0
      ? proposedSlotsRaw.map((slot) => ({
        slotId: slot.slot_id,
        date: slot.slot_date,
        startTime: slot.start_time,
        endTime: slot.end_time,
      }))
      : [{
        slotId: 'LEGACY_SLOT_1',
        date: interview.proposed_date || '',
        startTime: interview.proposed_start_time || '',
        endTime: interview.proposed_end_time || '',
      }];

    // 공통 일정 계산
    const commonSlotsResult = await commonSlotService.findCommonSlots(interviewId);

    // 확정 일정 조회
    const confirmedSchedule = await dataService.getConfirmedSchedule(interviewId);

    // 상세 화면용 interview 보강: candidates 요약, start_datetime, end_datetime
    const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
    const candidateNames: string[] = [];
    for (const ic of interviewCandidates) {
      const candidate = await dataService.getCandidateById(ic.candidate_id);
      if (candidate?.name) candidateNames.push(candidate.name);
    }
    const padTime = (t: string) => {
      if (!t || typeof t !== 'string') return '09:00';
      const parts = t.trim().split(':');
      const h = parts[0]?.replace(/\D/g, '') || '9';
      const m = parts[1]?.replace(/\D/g, '') || '0';
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`.slice(0, 5);
    };
    const startTime = confirmedSchedule
      ? padTime(confirmedSchedule.confirmed_start_time)
      : padTime(interview.proposed_start_time);
    const endTime = confirmedSchedule
      ? padTime(confirmedSchedule.confirmed_end_time)
      : padTime(interview.proposed_end_time);
    const interviewEnriched = {
      ...interview,
      candidates: candidateNames.length > 0 ? candidateNames.join(', ') : '-',
      start_datetime: confirmedSchedule
        ? `${confirmedSchedule.confirmed_date}T${startTime}:00`
        : (interview.proposed_date ? `${interview.proposed_date}T${startTime}:00` : interview.created_at || new Date().toISOString()),
      end_datetime: confirmedSchedule
        ? `${confirmedSchedule.confirmed_date}T${endTime}:00`
        : (interview.proposed_date ? `${interview.proposed_date}T${endTime}:00` : interview.created_at || new Date().toISOString()),
    };

    res.json({
      success: true,
      data: {
        interview: interviewEnriched,
        responseStatus,
        timeSelections: timeSelectionsWithNames,
        proposedSlots,
        commonSlots: commonSlotsResult.commonSlots,
        confirmedSchedule,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, '면접 상세 조회 실패');
  }
});

// 면접 삭제
interviewRouter.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 면접 및 관련 데이터 삭제 (cascade)
    await dataService.deleteInterview(interviewId);

    logger.info(`Interview ${interviewId} deleted by admin`);

    res.json({
      success: true,
      message: '면접이 삭제되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting interview:', error);
    throw new AppError(500, '면접 삭제 실패');
  }
});

// 면접별 평가 목록 조회 (관리자)
interviewRouter.get('/:id/evaluations', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    const evaluations = await dataService.getEvaluationsByInterview(interviewId);
    res.json({
      success: true,
      data: { evaluations },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '평가 목록 조회 실패');
  }
});

// 포털 링크 생성 (면접관별)
interviewRouter.get('/:id/portal-link/:interviewerId', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interviewerId = req.params.interviewerId;

    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    const allInterviewers = await dataService.getAllInterviewers();
    const interviewer = allInterviewers.find(iv => iv.interviewer_id === interviewerId);

    if (!interviewer || !interviewer.email) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }

    const token = generateJWT({
      email: interviewer.email,
      role: 'INTERVIEWER',
      interviewerId: interviewer.interviewer_id,
      interviewId,
    });

    const confirmPath = `/confirm/${token}`;
    const portalLink = buildInterviewerLoginLink(confirmPath);

    res.json({
      success: true,
      data: {
        portalLink,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error generating portal link:', error);
    throw new AppError(500, '포털 링크 생성 실패');
  }
});

// #10: 일정 확인 링크 재발송 (특정 면접관에게 새 토큰으로 이메일 발송)
interviewRouter.post('/:id/resend-confirm-link', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const { interviewerId } = req.body || {};
    if (!interviewerId) {
      throw new AppError(400, 'interviewerId가 필요합니다');
    }
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewer = allInterviewers.find((iv: any) => iv.interviewer_id === interviewerId);
    if (!interviewer || !interviewer.email) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }
    const config = await dataService.getConfig();
    const templateService = new EmailTemplateService({
      company_logo_url: config.company_logo_url,
      company_address: config.company_address,
      parking_info: config.parking_info,
      dress_code: config.dress_code || '비즈니스 캐주얼',
      email_greeting: config.email_greeting,
      email_company_name: config.email_company_name,
      email_department_name: config.email_department_name,
      email_contact_email: config.email_contact_email,
      email_footer_text: config.email_footer_text,
    });
    const token = generateJWT({
      email: interviewer.email,
      role: 'INTERVIEWER',
      interviewerId: interviewer.interviewer_id,
      interviewId,
    });
    const confirmPath = `/confirm/${token}`;
    const confirmLink = buildFrontendUrl(confirmPath);
    const loginLink = buildInterviewerLoginLink(confirmPath);
    const candidates = await dataService.getCandidatesByInterview(interviewId);
    const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
    const assignedCandidates: Array<{ name: string; positionApplied: string; time: string }> = [];
    for (const c of candidates) {
      const cis = await dataService.getCandidateInterviewers(interviewId, c.candidate_id);
      if (cis.some((ci: any) => ci.interviewer_id === interviewerId)) {
        const ic = interviewCandidates.find((ic: any) => ic.candidate_id === c.candidate_id);
        assignedCandidates.push({
          name: c.name,
          positionApplied: c.position_applied || '',
          time: ic ? `${ic.scheduled_start_time} ~ ${ic.scheduled_end_time}` : '',
        });
      }
    }
    const emailContent = templateService.generateInterviewerInvitation({
      interviewerName: interviewer.name,
      mainNotice: interview.main_notice,
      teamName: interview.team_name,
      candidates: assignedCandidates,
      proposedDate: dayjs(interview.proposed_date).format('YYYY년 MM월 DD일 (ddd)'),
      confirmLink,
      loginLink,
    });
    await emailService.sendEmail({
      to: [interviewer.email],
      subject: `[일정 확인 링크 재발송] ${interview.main_notice} - ${interview.team_name}`,
      htmlBody: emailContent,
    });
    res.json({
      success: true,
      data: { message: '일정 확인 링크가 재발송되었습니다', portalLink: buildInterviewerLoginLink(confirmPath) },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '링크 재발송 실패');
  }
});

// #14: NO_COMMON 재시도 — 슬롯/응답 초기화 후 PENDING으로 되돌리고 일정 확인 메일 재발송
interviewRouter.post('/:id/retry-schedule', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    if (interview.status !== 'NO_COMMON') {
      throw new AppError(400, '공통 일정 없음(NO_COMMON) 상태인 면접만 재시도할 수 있습니다');
    }
    await dataService.deleteTimeSelectionsByInterview(interviewId);
    await dataService.clearRespondedAtByInterview(interviewId);
    await dataService.updateInterviewStatus(interviewId, 'PENDING');
    const config = await dataService.getConfig();
    const templateService = new EmailTemplateService({
      company_logo_url: config.company_logo_url,
      company_address: config.company_address,
      parking_info: config.parking_info,
      dress_code: config.dress_code || '비즈니스 캐주얼',
      email_greeting: config.email_greeting,
      email_company_name: config.email_company_name,
      email_department_name: config.email_department_name,
      email_contact_email: config.email_contact_email,
      email_footer_text: config.email_footer_text,
    });
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewerMap = new Map(allInterviewers.map((iv: any) => [iv.interviewer_id, iv]));
    const candidates = await dataService.getCandidatesByInterview(interviewId);
    const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
    let sentCount = 0;
    for (const mapping of mappings) {
      const interviewer = interviewerMap.get(mapping.interviewer_id);
      if (!interviewer?.email || !interviewer.is_active) continue;
      const assignedCandidates: Array<{ name: string; positionApplied: string; time: string }> = [];
      for (const c of candidates) {
        const cis = await dataService.getCandidateInterviewers(interviewId, c.candidate_id);
        if (cis.some((ci: any) => ci.interviewer_id === mapping.interviewer_id)) {
          const ic = interviewCandidates.find((ic: any) => ic.candidate_id === c.candidate_id);
          assignedCandidates.push({
            name: c.name,
            positionApplied: c.position_applied || '',
            time: ic ? `${ic.scheduled_start_time} ~ ${ic.scheduled_end_time}` : '',
          });
        }
      }
      const token = generateJWT({
        email: interviewer.email,
        role: 'INTERVIEWER',
        interviewerId: interviewer.interviewer_id,
        interviewId,
      });
      const confirmPath = `/confirm/${token}`;
      const confirmLink = buildFrontendUrl(confirmPath);
      const loginLink = buildInterviewerLoginLink(confirmPath);
      const emailContent = templateService.generateInterviewerInvitation({
        interviewerName: interviewer.name,
        mainNotice: interview.main_notice,
        teamName: interview.team_name,
        candidates: assignedCandidates,
        proposedDate: dayjs(interview.proposed_date).format('YYYY년 MM월 DD일 (ddd)'),
        confirmLink,
        loginLink,
      });
      await emailService.sendEmail({
        to: [interviewer.email],
        subject: `[일정 확인 재요청] ${interview.main_notice} - ${interview.team_name}`,
        htmlBody: emailContent,
      });
      sentCount++;
    }
    res.json({
      success: true,
      data: { message: '재시도 처리되었습니다. 면접관에게 일정 확인 메일을 다시 발송했습니다.', status: 'PENDING', emailsSent: sentCount },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '재시도 처리 실패');
  }
});

// 관리자: 전원 응답 시 확정 대기로 전환 (PENDING/PARTIAL → PENDING_APPROVAL). 이미 전원 수락했는데 상태만 안 바뀐 경우 사용
interviewRouter.post('/:id/move-to-pending-approval', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    if (interview.status !== 'PENDING' && interview.status !== 'PARTIAL') {
      throw new AppError(400, '대기 중 또는 진행 중 상태인 면접만 확정 대기로 전환할 수 있습니다');
    }
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allResponded = mappings.length > 0 && mappings.every((m: any) => m.responded_at || m.accepted_at);
    if (!allResponded) {
      throw new AppError(400, '모든 면접관이 일정을 수락한 후에만 확정 대기로 전환할 수 있습니다');
    }
    const existingSchedule = await dataService.getConfirmedSchedule(interviewId);
    if (existingSchedule) {
      await dataService.updateInterviewStatus(interviewId, 'PENDING_APPROVAL');
      return res.json({
        success: true,
        data: { message: '확정 대기 상태로 전환되었습니다.', status: 'PENDING_APPROVAL' },
      });
    }
    const confirmedAt = new Date().toISOString();
    const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
    for (const ic of interviewCandidates) {
      await dataService.createConfirmedSchedule({
        interview_id: interviewId,
        candidate_id: ic.candidate_id,
        confirmed_date: interview.proposed_date || '',
        confirmed_start_time: ic.scheduled_start_time || interview.proposed_start_time || '',
        confirmed_end_time: ic.scheduled_end_time || interview.proposed_end_time || '',
        confirmed_at: confirmedAt,
      });
    }
    await dataService.updateInterviewStatus(interviewId, 'PENDING_APPROVAL');
    res.json({
      success: true,
      data: { message: '확정 대기 상태로 전환되었습니다. 아래에서 확정 승인을 진행해 주세요.', status: 'PENDING_APPROVAL' },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '확정 대기 전환 처리 실패');
  }
});

// 관리자 확정 승인: 확정 대기(PENDING_APPROVAL) → CONFIRMED, 확정 메일 발송
interviewRouter.post('/:id/approve-confirmation', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    if (interview.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, '확정 대기 상태인 면접만 승인할 수 있습니다');
    }
    const schedule = await dataService.getConfirmedSchedule(interviewId);
    if (!schedule) {
      throw new AppError(400, '확정 일정이 없습니다');
    }
    await dataService.updateInterviewStatus(interviewId, 'CONFIRMED');
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewerMap = new Map(allInterviewers.map((iv: any) => [iv.interviewer_id, iv]));
    const interviewerEmails = mappings
      .map((m: any) => interviewerMap.get(m.interviewer_id)?.email)
      .filter((e): e is string => !!e?.trim());
    let candidateEmails: string[] = [];
    try {
      const candidatesByInterview = await dataService.getCandidatesByInterview(interviewId);
      candidateEmails = candidatesByInterview.map((c: any) => c.email).filter((e): e is string => !!e?.trim());
    } catch (e) {
      logger.debug('Could not load candidate emails for confirmation:', e);
    }
    const allRecipients = [...new Set([...interviewerEmails, ...candidateEmails])];
    let candidateNames: string[] = [];
    try {
      const cs = await dataService.getCandidatesByInterview(interviewId);
      candidateNames = cs.map((c: any) => c.name || '').filter(Boolean);
    } catch (e) {
      logger.debug('Could not load candidate names for confirmation:', e);
    }
    if (allRecipients.length > 0) {
      try {
        await emailService.sendConfirmationEmail(
          allRecipients,
          interview.main_notice,
          interview.team_name,
          schedule.confirmed_date || '',
          schedule.confirmed_start_time || '',
          schedule.confirmed_end_time || '',
          candidateNames
        );
        logger.info(`[관리자 확정 승인] Confirmation email sent for interview ${interviewId}`);
      } catch (error: any) {
        logger.error('[관리자 확정 승인] Failed to send confirmation email:', { interviewId, error: error?.message });
      }
    }
    res.json({
      success: true,
      data: { message: '확정 승인되었습니다. 면접관·지원자에게 확정 메일을 발송했습니다.', status: 'CONFIRMED' },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '확정 승인 처리 실패');
  }
});

// 리마인더 수동 발송
interviewRouter.post('/:id/remind', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 면접관 매핑 조회
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));

    const config = await dataService.getConfig();
    const templateService = new EmailTemplateService({
      company_logo_url: config.company_logo_url,
      company_address: config.company_address,
      parking_info: config.parking_info,
      dress_code: config.dress_code || '비즈니스 캐주얼',
      email_greeting: config.email_greeting,
      email_company_name: config.email_company_name,
      email_department_name: config.email_department_name,
      email_contact_email: config.email_contact_email,
      email_footer_text: config.email_footer_text,
    });

    let sentCount = 0;
    const errors: string[] = [];

    // 미응답 면접관에게만 리마인더 발송
    for (const mapping of mappings) {
      if (mapping.responded_at) continue; // 이미 응답한 면접관은 제외

      const interviewer = interviewerMap.get(mapping.interviewer_id);
      if (!interviewer || !interviewer.email || !interviewer.is_active) {
        continue;
      }

      try {
        const token = generateJWT({
          email: interviewer.email,
          role: 'INTERVIEWER',
          interviewerId: interviewer.interviewer_id,
          interviewId,
        });

        const confirmPath = `/confirm/${token}`;
        const confirmLink = buildFrontendUrl(confirmPath);
        const loginLink = buildInterviewerLoginLink(confirmPath);

        const template = templateService.generateReminderEmail({
          interviewerName: interviewer.name,
          mainNotice: interview.main_notice,
          teamName: interview.team_name,
          confirmLink,
          loginLink,
          reminderCount: 1,
        });

        await emailService.sendEmail({
          to: [interviewer.email],
          subject: `[리마인더] 면접 일정 조율 - ${interview.main_notice}`,
          htmlBody: template,
        });

        // 리마인더 발송 기록 업데이트
        await dataService.updateReminderSent(interviewId, interviewer.interviewer_id);
        sentCount++;

        logger.info(`Reminder sent to ${interviewer.email} for interview ${interviewId}`);
      } catch (error: any) {
        logger.error(`Failed to send reminder to ${interviewer.email}:`, error);
        errors.push(`${interviewer.name} (${interviewer.email}): ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        sentCount,
        totalNonResponded: mappings.filter(m => !m.responded_at).length,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${sentCount}명의 면접관에게 리마인더가 발송되었습니다.`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error sending reminders:', error);
    throw new AppError(500, '리마인더 발송 실패');
  }
});

// 공통 시간대 분석 (면접관별 선택 데이터 교집합, Gemini 미사용)
interviewRouter.post('/:id/analyze', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    const timeSelections = await dataService.getTimeSelectionsByInterview(interviewId);
    if (timeSelections.length === 0) {
      throw new AppError(400, '분석할 시간 선택 데이터가 없습니다. 면접관들이 먼저 일정을 선택해야 합니다.');
    }

    const commonSlotsResult = await commonSlotService.findCommonSlots(interviewId);
    const commonSlots = commonSlotService.sortSlots(commonSlotsResult.commonSlots);

    logger.info(`Common slot analysis for interview ${interviewId}: ${commonSlots.length} slots`);

    res.json({
      success: true,
      data: {
        commonSlots,
        analyzedCount: new Set(timeSelections.map((s) => s.interviewer_id)).size,
        totalSelections: timeSelections.length,
      },
      message: commonSlots.length > 0 ? `${commonSlots.length}개의 공통 시간대를 찾았습니다.` : '공통 가능 시간대가 없습니다.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in common slot analysis:', error);
    throw new AppError(500, '공통 시간대 분석 실패');
  }
});

// 면접 생성 (N:N 구조)
interviewRouter.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const validated = await createInterviewSchema.parseAsync(req.body);
    const user = req.user!;
    const firstProposedSlot = validated.proposedSlots[0];

    // 설정 조회
    const config = await dataService.getConfig();
    const interviewDuration = parseInt(config.interview_duration_minutes || '30');
    const minNoticeHours = parseInt(config.min_notice_hours || '0'); // 기본값 0시간 (검증 비활성화)

    // 최소 사전 통보 시간 확인 (0시간이면 검증 비활성화)
    if (minNoticeHours > 0 && !checkMinNoticeHours(firstProposedSlot.date, firstProposedSlot.startTime, minNoticeHours)) {
      throw new AppError(400, `면접 일정은 최소 ${minNoticeHours}시간 전에 설정해야 합니다`);
    }

    // 면접 ID 생성
    const interviewId = `INT_${Date.now()}`;

    // 하위 호환용: 인터뷰 본 테이블에는 첫 번째 제안 슬롯 저장
    const proposedEndTime = firstProposedSlot.endTime;

    // 면접 기본 정보 저장
    await dataService.createInterview({
      interview_id: interviewId,
      main_notice: validated.mainNotice,
      team_name: validated.teamName,
      proposed_date: firstProposedSlot.date,
      proposed_start_time: firstProposedSlot.startTime,
      proposed_end_time: proposedEndTime,
      status: 'PENDING',
      created_by: user.email,
    });

    // 신규 제안 슬롯 저장
    await dataService.createProposedSlots(
      interviewId,
      validated.proposedSlots.map((slot) => ({
        slot_date: slot.date,
        start_time: slot.startTime,
        end_time: slot.endTime,
      }))
    );

    // 면접자별 시간 슬롯 계산 (id는 candidateId 생성 전 임시 인덱스용)
    const candidateSlots = calculateCandidateSlots(
      firstProposedSlot.startTime,
      validated.candidates.map((c, i) => ({ id: `_${i}`, name: c.name })),
      interviewDuration
    );

    // 모든 면접관 ID 수집 (중복 제거, 정규화, 방어적 처리)
    const allInterviewerIdsSet = new Set<string>();
    const interviewerIdCount = new Map<string, number>();
    const idNormalizationMap = new Map<string, string>();

    const rawIds = validated.candidates.flatMap(c => (c.interviewerIds || []));
    rawIds.forEach(originalId => {
      const normalizedId = String(originalId ?? '').trim();
      if (!normalizedId) return;
      if (originalId !== normalizedId) idNormalizationMap.set(String(originalId), normalizedId);
      allInterviewerIdsSet.add(normalizedId);
      interviewerIdCount.set(normalizedId, (interviewerIdCount.get(normalizedId) || 0) + 1);
    });
    const allInterviewerIds = Array.from(allInterviewerIdsSet);

    logger.info(`📋 [EMAIL] Request candidates: ${validated.candidates.length}, raw interviewer IDs: ${rawIds.length}, unique: ${allInterviewerIds.length} (${allInterviewerIds.join(', ')})`);
    
    // 정규화된 ID 로깅
    if (idNormalizationMap.size > 0) {
      logger.warn(`⚠️ [ID NORMALIZATION] Found ${idNormalizationMap.size} interviewer ID(s) with whitespace:`);
      idNormalizationMap.forEach((normalized, original) => {
        logger.warn(`   - "${original}" -> "${normalized}" (whitespace removed)`);
      });
    }
    
    // 면접관 ID 중복 및 등장 횟수 로깅
    logger.info(`📋 Interviewer ID collection:`);
    logger.info(`   - Total unique interviewer IDs: ${allInterviewerIds.length}`);
    interviewerIdCount.forEach((count, id) => {
      logger.info(`   - ID ${id}: appears ${count} time(s) in candidate assignments`);
    });

    // 면접자 처리
    const candidateSchedules: Array<{ candidateId: string; name: string; startTime: string; endTime: string }> = [];
    
    for (let i = 0; i < validated.candidates.length; i++) {
      const candidate = validated.candidates[i];
      const slot = candidateSlots[i];
      
      // 면접자 ID 생성 (동일 밀리초 중복 방지를 위해 랜덤 접미사 사용)
      const candidateId = `CAND_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`;
      
      // 면접자 정보 저장
      await dataService.createCandidate({
        candidate_id: candidateId,
        name: candidate.name,
        email: candidate.email || '',
        phone: candidate.phone || '',
        position_applied: candidate.positionApplied,
      });

      // 면접-면접자 매핑
      await dataService.createInterviewCandidate({
        interview_id: interviewId,
        candidate_id: candidateId,
        sequence: i + 1,
        scheduled_start_time: slot.startTime,
        scheduled_end_time: slot.endTime,
      });

      candidateSchedules.push({
        candidateId,
        name: candidate.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

      // 면접자별 담당 면접관 매핑 (N:N)
      for (let j = 0; j < candidate.interviewerIds.length; j++) {
        const originalInterviewerId = candidate.interviewerIds[j];
        // 면접관 ID 정규화 (공백 제거)
        const normalizedInterviewerId = originalInterviewerId.trim();
        const role = j === 0 ? 'PRIMARY' : 'SECONDARY';
        
        await dataService.createCandidateInterviewer({
          interview_id: interviewId,
          candidate_id: candidateId,
          interviewer_id: normalizedInterviewerId, // 정규화된 ID 사용
          role,
        });
      }
    }

    // 전체 면접관 매핑 (interview_interviewers)
    const interviewInterviewerMappings = Array.from(allInterviewerIds).map(interviewerId => ({
      interview_id: interviewId,
      interviewer_id: interviewerId,
    }));
    await dataService.createInterviewInterviewers(interviewInterviewerMappings);

    // 면접관 정보 조회 및 정규화된 Map 생성
    const allInterviewers = await dataService.getAllInterviewers();
    // 면접관 ID를 정규화하여 Map 생성 (공백 제거)
    const interviewerMap = new Map<string, typeof allInterviewers[0]>();
    const interviewerIdVariants = new Map<string, string[]>(); // 정규화된 ID -> 원본 ID 변형들
    
    allInterviewers.forEach(iv => {
      const rawId = iv.interviewer_id != null ? String(iv.interviewer_id) : '';
      const normalizedId = rawId.trim();
      const normalizedIdLower = normalizedId.toLowerCase();

      if (!interviewerMap.has(normalizedId)) {
        interviewerMap.set(normalizedId, iv);
        interviewerIdVariants.set(normalizedId, []);
      }
      if (normalizedIdLower !== normalizedId) {
        interviewerMap.set(normalizedIdLower, iv);
      }
      if (rawId !== normalizedId) {
        interviewerIdVariants.get(normalizedId)!.push(rawId);
      }
    });
    
    // 중복 ID 변형 확인
    if (interviewerIdVariants.size > 0) {
      logger.warn(`⚠️ [DUPLICATE ID VARIANTS] Found interviewer IDs with whitespace variations:`);
      interviewerIdVariants.forEach((variants, normalized) => {
        if (variants.length > 0) {
          logger.warn(`   - Normalized: "${normalized}" -> Variants: ${variants.map(v => `"${v}"`).join(', ')}`);
        }
      });
    }
    
    // 이메일 주소별 면접관 매핑 (중복 확인용)
    const emailToInterviewers = new Map<string, Array<{ id: string; name: string }>>();
    allInterviewers.forEach(iv => {
      if (iv.email) {
        const normalizedEmail = iv.email.trim().toLowerCase();
        if (!emailToInterviewers.has(normalizedEmail)) {
          emailToInterviewers.set(normalizedEmail, []);
        }
        emailToInterviewers.get(normalizedEmail)!.push({ id: iv.interviewer_id, name: iv.name });
      }
    });
    
    // 중복 이메일 주소 확인
    const duplicateEmails: Array<{ email: string; interviewers: Array<{ id: string; name: string }> }> = [];
    emailToInterviewers.forEach((interviewers, email) => {
      if (interviewers.length > 1) {
        duplicateEmails.push({ email, interviewers });
      }
    });
    
    if (duplicateEmails.length > 0) {
      logger.warn(`⚠️ [DUPLICATE EMAIL] Found ${duplicateEmails.length} email address(es) with multiple interviewer IDs:`);
      duplicateEmails.forEach(({ email, interviewers }) => {
        logger.warn(`   - Email: ${email} -> IDs: ${interviewers.map(iv => `${iv.id} (${iv.name})`).join(', ')}`);
      });
    }
    
    logger.info(`📋 Total interviewers in system: ${allInterviewers.length}`);
    logger.info(`📋 Selected interviewer IDs: ${allInterviewerIds.join(', ')}`);
    logger.info(`📋 Selected unique interviewer count: ${allInterviewerIds.length}`);
    
    // 선택된 면접관 ID가 모두 존재하는지 확인
    const missingIds = allInterviewerIds.filter(id => !interviewerMap.has(id));
    if (missingIds.length > 0) {
      logger.warn(`⚠️ Some interviewer IDs not found in system: ${missingIds.join(', ')}`);
    }
    
    // 각 면접관의 상태 확인 및 상세 로깅
    logger.info(`📋 Interviewer details for selected IDs:`);
    allInterviewerIds.forEach(id => {
      const iv = interviewerMap.get(id);
      if (iv) {
        const assignmentCount = interviewerIdCount.get(id) || 0;
        logger.info(`  - ID: ${id}, Name: ${iv.name}, Email: ${iv.email || 'MISSING'}, Active: ${iv.is_active}, Department: ${iv.department || 'N/A'}, Assigned to ${assignmentCount} candidate(s)`);
      } else {
        logger.warn(`  - ID: ${id} NOT FOUND in interviewer map`);
      }
    });

    // 메일 템플릿 서비스 초기화
    const templateService = new EmailTemplateService({
      company_logo_url: config.company_logo_url,
      company_address: config.company_address,
      parking_info: config.parking_info,
      dress_code: config.dress_code || '비즈니스 캐주얼',
      email_greeting: config.email_greeting,
      email_company_name: config.email_company_name,
      email_department_name: config.email_department_name,
      email_contact_email: config.email_contact_email,
      email_footer_text: config.email_footer_text,
    });

    // 면접관별로 이메일 발송 (담당 면접자 정보 포함)
    let emailsSent = 0;
    const emailResults: Array<{
      interviewerId: string;
      name?: string;
      email?: string;
      status: 'SENT' | 'FAILED' | 'SKIPPED_INACTIVE' | 'SKIPPED_NO_EMAIL' | 'SKIPPED_INVALID_EMAIL' | 'NOT_FOUND';
      reason?: string;
    }> = [];
    
    // 면접관별 처리 상태 추적 (선택한 면접관마다 1통씩 발송; 같은 이메일이어도 ID별로 각각 발송)
    const interviewerProcessingStatus = new Map<string, { processed: boolean; email: string; name: string }>();
    allInterviewerIds.forEach(id => {
      const iv = interviewerMap.get(id) ?? interviewerMap.get(id.trim()) ?? interviewerMap.get(String(id).toLowerCase());
      if (iv) {
        interviewerProcessingStatus.set(id, {
          processed: false,
          email: iv.email || '',
          name: iv.name,
        });
      }
    });

    logger.info(`📧 Starting email sending process for ${allInterviewerIds.length} unique interviewer(s)`);
    logger.info(`   - Interviewer IDs to process: ${allInterviewerIds.join(', ')}`);

    if (!emailService.isConfigured()) {
      logger.error('❌ SMTP not configured. Skipping all email sends. Set SMTP_USER and SMTP_PASSWORD in .env');
    }

    for (const interviewerId of allInterviewerIds) {
      const idTrimmed = String(interviewerId).trim();
      const idLower = idTrimmed.toLowerCase();
      let interviewer = interviewerMap.get(interviewerId) ?? interviewerMap.get(idTrimmed) ?? interviewerMap.get(idLower);
      if (!interviewer) {
        interviewer = allInterviewers.find(
          iv => String(iv.interviewer_id ?? '').trim().toLowerCase() === idLower
        ) ?? undefined;
      }
      if (!interviewer) {
        logger.warn(`⚠️ Interviewer not found: ${interviewerId}. Available: ${allInterviewers.map(iv => iv.interviewer_id).slice(0, 8).join(', ')}...`);
        emailResults.push({ interviewerId: String(interviewerId), status: 'NOT_FOUND', reason: 'Interviewer ID not found in system' });
        continue;
      }
      
      const status = interviewerProcessingStatus.get(interviewerId);
      if (status) {
        status.processed = true;
      }
      
      // 김희수, 정주연 면접관 특별 로깅
      if (interviewer.name?.includes('희수') || interviewer.email?.includes('kimhs')) {
        logger.info(`🔍 [김희수] ID: ${interviewer.interviewer_id}, Name: ${interviewer.name}, Email: ${interviewer.email}, Active: ${interviewer.is_active}`);
      }
      if (interviewer.name?.includes('주연') || interviewer.email?.includes('jyjeong')) {
        logger.info(`🔍 [정주연] ID: ${interviewer.interviewer_id}, Name: ${interviewer.name}, Email: ${interviewer.email}, Active: ${interviewer.is_active}`);
      }
      
      if (!interviewer.is_active) {
        logger.info(`⏭️ Skipping inactive interviewer: ${interviewer.name} (${interviewer.email})`);
        emailResults.push({
          interviewerId: String(interviewer.interviewer_id ?? interviewerId),
          name: interviewer.name,
          email: interviewer.email || '',
          status: 'SKIPPED_INACTIVE',
          reason: 'Interviewer is inactive',
        });
        continue;
      }
      
      if (!interviewer.email || !interviewer.email.trim()) {
        logger.error(`❌ Interviewer has no email: ${interviewer.name} (ID: ${interviewerId})`);
        emailResults.push({
          interviewerId: String(interviewer.interviewer_id ?? interviewerId),
          name: interviewer.name,
          email: interviewer.email || '',
          status: 'SKIPPED_NO_EMAIL',
          reason: 'Interviewer email is missing',
        });
        continue;
      }

      logger.info(`📧 Processing interviewer: ${interviewer.name} (${interviewer.email}, ID: ${interviewer.interviewer_id})`);

      try {
        // 이 면접관이 담당하는 면접자 찾기
        const assignedCandidates: Array<{ name: string; positionApplied: string; time: string }> = [];
        
        for (const candidateSchedule of candidateSchedules) {
          const candidateInterviewers = await dataService.getCandidateInterviewers(
            interviewId,
            candidateSchedule.candidateId
          );
          
          if (candidateInterviewers.some(ci => String(ci.interviewer_id ?? '').trim().toLowerCase() === idLower)) {
            const candidate = validated.candidates.find(c => c.name === candidateSchedule.name);
            assignedCandidates.push({
              name: candidateSchedule.name,
              positionApplied: candidate?.positionApplied || '',
              time: `${candidateSchedule.startTime} ~ ${candidateSchedule.endTime}`,
            });
          }
        }

        // JWT 토큰 생성
        const token = generateJWT({
          email: interviewer.email,
          role: 'INTERVIEWER',
          interviewerId: interviewer.interviewer_id,
          interviewId,
        });

        const confirmPath = `/confirm/${token}`;
        const confirmLink = buildFrontendUrl(confirmPath);
        const loginLink = buildInterviewerLoginLink(confirmPath);

        // 메일 템플릿 생성
        const emailContent = templateService.generateInterviewerInvitation({
          interviewerName: interviewer.name,
          mainNotice: validated.mainNotice,
          teamName: validated.teamName,
          candidates: assignedCandidates,
          proposedDate: validated.proposedSlots
            .map((slot) => `${dayjs(slot.date).format('YYYY년 MM월 DD일 (ddd)')} ${slot.startTime} ~ ${slot.endTime}`)
            .join('<br/>'),
          confirmLink,
          loginLink,
        });

        // 이메일 발송
        try {
          // 이메일 주소 정규화 및 검증
          const rawEmail = interviewer.email.trim();
          const emailToSend = rawEmail.toLowerCase();
          
          // 이메일 주소 유효성 검사
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailToSend)) {
            logger.error(`❌ Invalid email format for ${interviewer.name}: ${rawEmail}`);
            emailResults.push({
              interviewerId: String(interviewer.interviewer_id ?? interviewerId),
              name: interviewer.name,
              email: rawEmail,
              status: 'SKIPPED_INVALID_EMAIL',
              reason: 'Invalid email format',
            });
            continue;
          }
          
          logger.info(`📨 Attempting to send email to: ${emailToSend} (${interviewer.name}, ID: ${interviewer.interviewer_id}) for interview ${interviewId}`);
          logger.info(`   - Original email: "${rawEmail}"`);
          logger.info(`   - Normalized email: "${emailToSend}"`);
          logger.info(`   - Email length: ${emailToSend.length} characters`);
          logger.info(`   - Email domain: ${emailToSend.split('@')[1] || 'N/A'}`);
          logger.info(`   - Assigned candidates: ${assignedCandidates.length}명`);
          
          // 이메일 주소에 숨겨진 문자 확인
          const emailBytes = Buffer.from(emailToSend, 'utf8');
          logger.info(`   - Email bytes: ${Array.from(emailBytes).join(',')}`);
          
          // 개별 SMTP API 호출 시작 로깅
          logger.info(`🚀 [INDIVIDUAL SMTP CALL] Starting separate SMTP API call for ${interviewer.name} (${emailToSend})`);
          logger.info(`   - Call timestamp: ${new Date().toISOString()}`);
          logger.info(`   - This is call #${emailsSent + 1} of ${allInterviewerIds.length} total calls`);
          
          await emailService.sendEmail({
            to: [emailToSend],
            subject: `[면접 일정 조율] ${validated.mainNotice} - ${validated.teamName}`,
            htmlBody: emailContent,
          });
          
          // 개별 SMTP API 호출 완료 로깅
          logger.info(`✅ [INDIVIDUAL SMTP CALL COMPLETE] Finished SMTP API call for ${interviewer.name} (${emailToSend})`);
          logger.info(`   - Completion timestamp: ${new Date().toISOString()}`);
          
          emailsSent++;
          logger.info(`✅ Email sent successfully to ${interviewer.name} (${emailToSend}) - ${emailsSent}/${allInterviewerIds.length}`);
          emailResults.push({
            interviewerId: String(interviewer.interviewer_id ?? interviewerId),
            name: interviewer.name,
            email: emailToSend,
            status: 'SENT',
          });
        } catch (error: any) {
          logger.error(`❌ Failed to send email to ${interviewer.name} (${interviewer.email}):`, {
            interviewerId: interviewer.interviewer_id,
            interviewerName: interviewer.name,
            email: interviewer.email,
            normalizedEmail: interviewer.email.trim().toLowerCase(),
            errorMessage: error.message,
            errorCode: error.code,
            responseCode: error.responseCode,
            command: error.command,
            response: error.response,
            stack: error.stack,
          });
          emailResults.push({
            interviewerId: String(interviewer.interviewer_id ?? interviewerId),
            name: interviewer.name,
            email: interviewer.email?.trim().toLowerCase() || '',
            status: 'FAILED',
            reason: error?.message || 'Unknown error',
          });
          // 이메일 발송 실패해도 면접 생성은 계속 진행
        }
      } catch (error: any) {
        logger.error(`Error processing interviewer ${interviewerId}:`, error);
        emailResults.push({
          interviewerId: String(interviewer.interviewer_id ?? interviewerId),
          name: interviewer.name,
          email: interviewer.email || '',
          status: 'FAILED',
          reason: error?.message || 'Error processing interviewer',
        });
        // 개별 면접관 처리 실패해도 계속 진행
      }
    }

    // 최종 처리 상태 로깅
    logger.info(`📊 Final email sending summary:`);
    logger.info(`   - Total interviewer IDs: ${allInterviewerIds.length}`);
    logger.info(`   - Emails sent successfully: ${emailsSent}`);
    logger.info(`   - Skipped (inactive/no email/duplicate): ${allInterviewerIds.length - emailsSent}`);
    
    interviewerProcessingStatus.forEach((status, id) => {
      if (!status.processed) {
        logger.warn(`   - ID ${id} (${status.name}, ${status.email}): NOT PROCESSED - may have been skipped`);
      }
    });
    
    logger.info(`Interview created: ${interviewId}, Emails sent: ${emailsSent}/${allInterviewerIds.length}`);
    
    const allSent = emailsSent === allInterviewerIds.length;
    const noneSent = emailsSent === 0 && allInterviewerIds.length > 0;
    let message = allSent
      ? '면접이 생성되었고 모든 면접관에게 이메일이 발송되었습니다.'
      : `면접이 생성되었습니다. ${emailsSent}명의 면접관에게 이메일이 발송되었습니다. (총 ${allInterviewerIds.length}명 중)`;
    if (noneSent) {
      message += ' 메일이 발송되지 않았습니다. SMTP 설정(.env의 SMTP_USER, SMTP_PASSWORD)과 서버 로그를 확인하거나, POST /api/test-email로 테스트 메일을 보내 보세요.';
    }
    if (missingIds.length > 0) {
      message += ` 일부 면접관(ID: ${missingIds.join(', ')})이 면접관 목록에 없거나 이메일이 비어 있어 메일이 발송되지 않았습니다. 면접관 관리에서 해당 ID를 등록·수정해 주세요.`;
    }

    res.json({
      success: true,
      data: {
        interviewId,
        proposedEndTime,
        emailsSent,
        totalInterviewers: allInterviewerIds.length,
        missingInterviewerIds: missingIds,
        emailResults,
        candidateSchedules,
        candidates: candidateSchedules.map(schedule => ({
          candidateId: schedule.candidateId,
          name: schedule.name,
        })),
      },
      message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating interview:', error);
    throw new AppError(500, '면접 생성 실패');
  }
});

// 면접 일정 수정
interviewRouter.put('/:id/schedule', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    // 완료/취소된 면접은 변경 불가
    if (['COMPLETED', 'CANCELLED'].includes(interview.status)) {
      throw new AppError(400, '완료되거나 취소된 면접은 변경할 수 없습니다');
    }
    
    const updates: any = {};
    const oldInterview = { ...interview };
    
    // 변경 사항 수집
    if (req.body.interviewDate) updates.proposed_date = req.body.interviewDate;
    if (req.body.startTime) {
      updates.proposed_start_time = req.body.startTime;
      if (req.body.duration) {
        updates.proposed_end_time = calculateEndTime(req.body.startTime, req.body.duration);
      }
    }
    if (req.body.roomId) updates.room_id = req.body.roomId;
    
    // 면접관 변경
    if (req.body.interviewerIds && Array.isArray(req.body.interviewerIds)) {
      await dataService.updateInterviewInterviewers(interviewId, req.body.interviewerIds);
    }
    
    // 면접 정보 업데이트
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      // #8: 제안 일시 등 변경 시 기존 time_selections 삭제·responded_at 초기화, 미확정 상태면 PENDING으로
      const isScheduleChange = 'proposed_date' in updates || 'proposed_start_time' in updates || 'proposed_end_time' in updates;
      if (isScheduleChange && ['PENDING', 'PARTIAL', 'NO_COMMON', 'PENDING_APPROVAL'].includes(interview.status)) {
        await dataService.deleteTimeSelectionsByInterview(interviewId);
        await dataService.clearRespondedAtByInterview(interviewId);
        updates.status = 'PENDING';
      }
      await dataService.updateInterview(interviewId, updates);
      
      // 변경 이력 기록
      await dataService.createInterviewHistory({
        history_id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        interview_id: interviewId,
        change_type: 'schedule',
        old_value: JSON.stringify(oldInterview),
        new_value: JSON.stringify({ ...interview, ...updates }),
        changed_by: req.user?.email || 'system',
        changed_at: new Date().toISOString(),
        reason: req.body.reason,
      });
      
      // 변경 알림 발송
      const updatedInterview = await dataService.getInterviewById(interviewId);
      const mappings = await dataService.getInterviewInterviewers(interviewId);
      const allInterviewers = await dataService.getAllInterviewers();
      const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
      const interviewerEmails = mappings
        .map(m => interviewerMap.get(m.interviewer_id)?.email)
        .filter(Boolean) as string[];
      
      const candidates = await dataService.getCandidatesByInterview(interviewId);
      const candidateEmails = candidates.map(c => c.email).filter(Boolean) as string[];
      
      const allRecipients = [...interviewerEmails, ...candidateEmails];
      
      if (allRecipients.length > 0) {
        const changeSummary = [];
        if (updates.proposed_date && updates.proposed_date !== oldInterview.proposed_date) {
          changeSummary.push(`날짜: ${oldInterview.proposed_date} → ${updates.proposed_date}`);
        }
        if (updates.proposed_start_time && updates.proposed_start_time !== oldInterview.proposed_start_time) {
          changeSummary.push(`시간: ${oldInterview.proposed_start_time} → ${updates.proposed_start_time}`);
        }
        if (updates.room_id && updates.room_id !== oldInterview.room_id) {
          const oldRoom = updates.room_id ? await dataService.getRoomById(oldInterview.room_id || '') : null;
          const newRoom = await dataService.getRoomById(updates.room_id);
          changeSummary.push(`면접실: ${oldRoom?.room_name || '미지정'} → ${newRoom?.room_name || '미지정'}`);
        }
        
        const emailContent = `
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .changes { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>면접 일정 변경 안내</h2>
                </div>
                <div class="content">
                  <p>안녕하세요,</p>
                  <p><strong>${updatedInterview.main_notice} - ${updatedInterview.team_name}</strong> 면접 일정이 변경되었습니다.</p>
                  <div class="changes">
                    <h3>변경 사항:</h3>
                    <ul>
                      ${changeSummary.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                  </div>
                  <p><strong>새로운 일정:</strong></p>
                  <ul>
                    <li>날짜: ${updatedInterview.proposed_date}</li>
                    <li>시간: ${updatedInterview.proposed_start_time} ~ ${updatedInterview.proposed_end_time}</li>
                  </ul>
                  <p>변경된 일정에 참석 가능하신지 확인 부탁드립니다.</p>
                  <p>문의사항이 있으시면 인사팀으로 연락 주시기 바랍니다.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        try {
          await emailService.sendEmail({
            to: allRecipients,
            subject: `[면접 일정 변경] ${updatedInterview.main_notice} - ${updatedInterview.team_name}`,
            htmlBody: emailContent,
          });
        } catch (error) {
          logger.error('Failed to send schedule change notification:', error);
        }
      }
    }
    
    res.json({
      success: true,
      message: '면접 일정이 변경되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating interview schedule:', error);
    throw new AppError(500, '면접 일정 변경 실패');
  }
});

// 면접 취소
interviewRouter.post('/:id/cancel', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const { reason, notifyAll = true } = req.body;
    
    if (!reason) {
      throw new AppError(400, '취소 사유를 입력해주세요');
    }
    
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    if (interview.status === 'COMPLETED') {
      throw new AppError(400, '완료된 면접은 취소할 수 없습니다');
    }
    
    // 상태 변경
    await dataService.updateInterviewStatus(interviewId, 'CANCELLED');
    
    // 취소 정보 저장
    await dataService.updateInterview(interviewId, {
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: req.user?.email || 'system',
      updated_at: new Date().toISOString(),
    });
    
    // 취소 이력 기록
    await dataService.createInterviewHistory({
      history_id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interview_id: interviewId,
      change_type: 'status',
      old_value: JSON.stringify({ status: interview.status }),
      new_value: JSON.stringify({ status: 'CANCELLED' }),
      changed_by: req.user?.email || 'system',
      changed_at: new Date().toISOString(),
      reason,
    });
    
    // 취소 알림 발송
    if (notifyAll) {
      const mappings = await dataService.getInterviewInterviewers(interviewId);
      const allInterviewers = await dataService.getAllInterviewers();
      const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
      const interviewerEmails = mappings
        .map(m => interviewerMap.get(m.interviewer_id)?.email)
        .filter(Boolean) as string[];
      
      const candidates = await dataService.getCandidatesByInterview(interviewId);
      const candidateEmails = candidates.map(c => c.email).filter(Boolean) as string[];
      
      const allRecipients = [...interviewerEmails, ...candidateEmails];
      
      if (allRecipients.length > 0) {
        const emailContent = `
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>면접 취소 안내</h2>
                </div>
                <div class="content">
                  <p>안녕하세요,</p>
                  <p><strong>${interview.main_notice} - ${interview.team_name}</strong> 면접이 취소되었습니다.</p>
                  <p><strong>취소 사유:</strong> ${reason}</p>
                  <p>불편을 드려 죄송합니다. 문의사항이 있으시면 인사팀으로 연락 주시기 바랍니다.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        try {
          await emailService.sendEmail({
            to: allRecipients,
            subject: `[면접 취소] ${interview.main_notice} - ${interview.team_name}`,
            htmlBody: emailContent,
          });
        } catch (error) {
          logger.error('Failed to send cancellation notification:', error);
        }
      }
    }
    
    logger.info(`Interview ${interviewId} cancelled by ${req.user?.email}`);
    
    res.json({
      success: true,
      message: '면접이 취소되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error cancelling interview:', error);
    throw new AppError(500, '면접 취소 실패');
  }
});

// 면접 완료 처리
interviewRouter.post('/:id/complete', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const { completedAt, notes, actualDuration } = req.body;
    
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    if (!['IN_PROGRESS', 'SCHEDULED', 'CONFIRMED'].includes(interview.status)) {
      throw new AppError(400, '진행 중인 면접만 완료 처리할 수 있습니다');
    }
    
    // 상태 변경
    await dataService.updateInterviewStatus(interviewId, 'COMPLETED');
    
    // 완료 정보 저장
    await dataService.updateInterview(interviewId, {
      completed_at: completedAt || new Date().toISOString(),
      interview_notes: notes,
      actual_duration: actualDuration,
      updated_at: new Date().toISOString(),
    });
    
    // 완료 이력 기록
    await dataService.createInterviewHistory({
      history_id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interview_id: interviewId,
      change_type: 'status',
      old_value: JSON.stringify({ status: interview.status }),
      new_value: JSON.stringify({ status: 'COMPLETED' }),
      changed_by: req.user?.email || 'system',
      changed_at: new Date().toISOString(),
    });
    
    logger.info(`Interview ${interviewId} completed by ${req.user?.email}`);
    
    res.json({
      success: true,
      message: '면접이 완료 처리되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error completing interview:', error);
    throw new AppError(500, '면접 완료 처리 실패');
  }
});

// 노쇼 처리
interviewRouter.post('/:id/no-show', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const { noShowType, reason, interviewerId } = req.body;
    
    if (!noShowType || !['candidate', 'interviewer', 'both'].includes(noShowType)) {
      throw new AppError(400, '올바른 노쇼 유형을 선택해주세요');
    }
    
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    // 상태 변경
    await dataService.updateInterviewStatus(interviewId, 'NO_SHOW');
    
    // 노쇼 정보 저장
    await dataService.updateInterview(interviewId, {
      no_show_type: noShowType,
      no_show_reason: reason,
      no_show_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // 면접관 노쇼인 경우 해당 면접관만 기록
    if (noShowType === 'interviewer' && interviewerId) {
      // interview_interviewers 테이블에 노쇼 정보 추가 (필요시)
      // 현재는 interview 테이블에만 저장
    }
    
    // 노쇼 이력 기록
    await dataService.createInterviewHistory({
      history_id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interview_id: interviewId,
      change_type: 'status',
      old_value: JSON.stringify({ status: interview.status }),
      new_value: JSON.stringify({ status: 'NO_SHOW', noShowType, reason }),
      changed_by: req.user?.email || 'system',
      changed_at: new Date().toISOString(),
      reason,
    });
    
    logger.info(`Interview ${interviewId} marked as NO_SHOW (${noShowType}) by ${req.user?.email}`);
    
    res.json({
      success: true,
      message: '노쇼 처리되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error handling no-show:', error);
    throw new AppError(500, '노쇼 처리 실패');
  }
});

// 면접 이력 조회
interviewRouter.get('/:id/history', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const interview = await dataService.getInterviewById(interviewId);
    
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    const history = await dataService.getInterviewHistory(interviewId);
    
    res.json({
      success: true,
      data: {
        interviewId,
        history,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interview history:', error);
    throw new AppError(500, '면접 이력 조회 실패');
  }
});

// 면접 상태 변경
interviewRouter.put('/:id/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewId = req.params.id;
    const { status, reason } = req.body;
    
    if (!status) {
      throw new AppError(400, '상태를 입력해주세요');
    }
    
    const validStatuses = ['PENDING', 'PARTIAL', 'PENDING_APPROVAL', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'NO_COMMON'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, '올바른 상태를 입력해주세요');
    }
    
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    
    // 상태 전환 검증
    const allowedTransitions: Record<string, string[]> = {
      'PENDING': ['PARTIAL', 'PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED', 'NO_COMMON'],
      'PARTIAL': ['PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED', 'NO_COMMON'],
      'PENDING_APPROVAL': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['SCHEDULED', 'CANCELLED'],
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': [],
      'NO_SHOW': [],
      'NO_COMMON': ['CANCELLED'],
    };
    
    if (!allowedTransitions[interview.status]?.includes(status)) {
      throw new AppError(400, `상태 전환이 불가능합니다: ${interview.status} → ${status}`);
    }
    
    // 상태 변경
    await dataService.updateInterviewStatus(interviewId, status);
    
    // 상태별 후속 처리
    if (status === 'CANCELLED' && reason) {
      await dataService.updateInterview(interviewId, {
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: req.user?.email || 'system',
      });
    }
    
    // 이력 기록
    await dataService.createInterviewHistory({
      history_id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interview_id: interviewId,
      change_type: 'status',
      old_value: JSON.stringify({ status: interview.status }),
      new_value: JSON.stringify({ status }),
      changed_by: req.user?.email || 'system',
      changed_at: new Date().toISOString(),
      reason,
    });
    
    logger.info(`Interview ${interviewId} status changed: ${interview.status} → ${status} by ${req.user?.email}`);
    
    res.json({
      success: true,
      message: '면접 상태가 변경되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating interview status:', error);
    throw new AppError(500, '면접 상태 변경 실패');
  }
});
