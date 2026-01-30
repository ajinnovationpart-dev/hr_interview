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
import dayjs from 'dayjs';

export const interviewRouter = Router();

// 면접 생성 스키마 (N:N 구조)
const createInterviewSchema = z.object({
  mainNotice: z.string().min(1, '공고명을 입력해주세요'),
  teamName: z.string().min(1, '팀명을 입력해주세요'),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),
  proposedStartTime: z.string().regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다 (HH:mm)'),
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

// 대시보드 통계 조회
interviewRouter.get('/dashboard', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviews = await dataService.getAllInterviews();

    const stats = {
      pending: interviews.filter(i => i.status === 'PENDING').length,
      partial: interviews.filter(i => i.status === 'PARTIAL').length,
      confirmed: interviews.filter(i => i.status === 'CONFIRMED').length,
      noCommon: interviews.filter(i => i.status === 'NO_COMMON').length,
    };

    // 최근 면접 10개 (최신순)
    const recentInterviews = interviews
      .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))
      .slice(0, 10)
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
      return {
        interviewerId: mapping.interviewer_id,
        name: interviewer?.name || 'Unknown',
        email: interviewer?.email || '',
        responded: !!mapping.responded_at,
        respondedAt: mapping.responded_at,
      };
    });

    // 시간 선택 조회
    const timeSelections = await dataService.getTimeSelectionsByInterview(interviewId);
    const timeSelectionsWithNames = timeSelections.map(selection => {
      const interviewer = interviewerMap.get(selection.interviewer_id);
      return {
        ...selection,
        interviewerName: interviewer?.name || 'Unknown',
      };
    });

    // 공통 일정 계산
    const commonSlotsResult = await commonSlotService.findCommonSlots(interviewId);

    // 확정 일정 조회
    const confirmedSchedule = await dataService.getConfirmedSchedule(interviewId);

    res.json({
      success: true,
      data: {
        interview,
        responseStatus,
        timeSelections: timeSelectionsWithNames,
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

// 면접 생성 (N:N 구조)
interviewRouter.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const validated = await createInterviewSchema.parseAsync(req.body);
    const user = req.user!;

    // 설정 조회
    const config = await dataService.getConfig();
    const interviewDuration = parseInt(config.interview_duration_minutes || '30');
    const minNoticeHours = parseInt(config.min_notice_hours || '0'); // 기본값 0시간 (검증 비활성화)

    // 최소 사전 통보 시간 확인 (0시간이면 검증 비활성화)
    if (minNoticeHours > 0 && !checkMinNoticeHours(validated.proposedDate, validated.proposedStartTime, minNoticeHours)) {
      throw new AppError(400, `면접 일정은 최소 ${minNoticeHours}시간 전에 설정해야 합니다`);
    }

    // 면접 ID 생성
    const interviewId = `INT_${Date.now()}`;

    // 종료 시간 자동 계산
    const proposedEndTime = calculateEndTime(
      validated.proposedStartTime,
      validated.candidates.length,
      interviewDuration
    );

    // 면접 기본 정보 저장
    await dataService.createInterview({
      interview_id: interviewId,
      main_notice: validated.mainNotice,
      team_name: validated.teamName,
      proposed_date: validated.proposedDate,
      proposed_start_time: validated.proposedStartTime,
      proposed_end_time: proposedEndTime,
      status: 'PENDING',
      created_by: user.email,
    });

    // 면접자별 시간 슬롯 계산
    const candidateSlots = calculateCandidateSlots(
      validated.proposedStartTime,
      validated.candidates.map((c, i) => ({ id: `CAND_${i}`, name: c.name })),
      interviewDuration
    );

    // 모든 면접관 ID 수집 (중복 제거 및 정규화)
    const allInterviewerIdsSet = new Set<string>();
    const interviewerIdCount = new Map<string, number>(); // 각 면접관 ID가 몇 번 등장하는지 카운트
    const idNormalizationMap = new Map<string, string>(); // 원본 ID -> 정규화된 ID 매핑
    
    validated.candidates.forEach(c => {
      c.interviewerIds.forEach(originalId => {
        // 면접관 ID 정규화 (공백 제거)
        const normalizedId = originalId.trim();
        
        // 정규화 매핑 저장
        if (originalId !== normalizedId) {
          idNormalizationMap.set(originalId, normalizedId);
        }
        
        // 정규화된 ID로 중복 제거 및 카운트
        allInterviewerIdsSet.add(normalizedId);
        interviewerIdCount.set(normalizedId, (interviewerIdCount.get(normalizedId) || 0) + 1);
      });
    });
    const allInterviewerIds = Array.from(allInterviewerIdsSet);
    
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
      
      // 면접자 ID 생성
      const candidateId = `CAND_${Date.now()}_${i}`;
      
      // 면접자 정보 저장
      await dataService.createCandidate({
        candidate_id: candidateId,
        name: candidate.name,
        email: candidate.email || '',
        phone: candidate.phone || '',
        position_applied: candidate.position_applied,
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
      const normalizedId = iv.interviewer_id.trim();
      
      // 정규화된 ID를 키로 사용
      if (!interviewerMap.has(normalizedId)) {
        interviewerMap.set(normalizedId, iv);
        interviewerIdVariants.set(normalizedId, []);
      }
      
      // 원본 ID와 정규화된 ID가 다르면 변형 목록에 추가
      if (iv.interviewer_id !== normalizedId) {
        interviewerIdVariants.get(normalizedId)!.push(iv.interviewer_id);
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // 이미 처리한 이메일 주소 추적 (중복 발송 방지)
    const processedEmails = new Set<string>();
    
    // 면접관별 처리 상태 추적
    const interviewerProcessingStatus = new Map<string, { processed: boolean; email: string; name: string }>();
    allInterviewerIds.forEach(id => {
      const iv = interviewerMap.get(id);
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

    for (const interviewerId of allInterviewerIds) {
      const interviewer = interviewerMap.get(interviewerId);
      
      // 면접관 정보 확인 및 로깅
      if (!interviewer) {
        logger.warn(`⚠️ Interviewer not found in map: ${interviewerId}. Available IDs: ${Array.from(interviewerMap.keys()).slice(0, 5).join(', ')}...`);
        continue;
      }
      
      // 이메일 주소 정규화
      const normalizedEmail = interviewer.email?.trim().toLowerCase() || '';
      
      // 중복 이메일 주소 확인
      if (normalizedEmail && processedEmails.has(normalizedEmail)) {
        logger.warn(`⚠️ [DUPLICATE EMAIL SKIP] Email ${normalizedEmail} (${interviewer.name}, ID: ${interviewerId}) already processed. Skipping to prevent duplicate email.`);
        logger.warn(`   - This interviewer ID may be a duplicate or share the same email with another interviewer`);
        const status = interviewerProcessingStatus.get(interviewerId);
        if (status) {
          status.processed = true;
        }
        continue;
      }
      
      if (normalizedEmail) {
        processedEmails.add(normalizedEmail);
      }
      
      // 처리 상태 업데이트
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
        continue;
      }
      
      if (!interviewer.email || !interviewer.email.trim()) {
        logger.error(`❌ Interviewer has no email: ${interviewer.name} (ID: ${interviewerId})`);
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
          
          if (candidateInterviewers.some(ci => ci.interviewer_id === interviewerId)) {
            const candidate = validated.candidates.find(c => c.name === candidateSchedule.name);
            assignedCandidates.push({
              name: candidateSchedule.name,
              positionApplied: candidate?.position_applied || '',
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

        const confirmLink = `${frontendUrl}/confirm/${token}`;

        // 메일 템플릿 생성
        const emailContent = templateService.generateInterviewerInvitation({
          interviewerName: interviewer.name,
          mainNotice: validated.mainNotice,
          teamName: validated.teamName,
          candidates: assignedCandidates,
          proposedDate: dayjs(validated.proposedDate).format('YYYY년 MM월 DD일 (ddd)'),
          confirmLink,
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
          // 이메일 발송 실패해도 면접 생성은 계속 진행
        }
      } catch (error: any) {
        logger.error(`Error processing interviewer ${interviewerId}:`, error);
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
    
    res.json({
      success: true,
      data: {
        interviewId,
        proposedEndTime,
        emailsSent,
        totalInterviewers: allInterviewerIds.length,
        candidateSchedules,
      },
      message: emailsSent === allInterviewerIds.length 
        ? '면접이 생성되었고 모든 면접관에게 이메일이 발송되었습니다.'
        : `면접이 생성되었습니다. ${emailsSent}명의 면접관에게 이메일이 발송되었습니다. (총 ${allInterviewerIds.length}명 중)`,
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
