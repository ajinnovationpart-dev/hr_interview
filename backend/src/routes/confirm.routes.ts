import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyToken } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { emailService } from '../services/email.service';
import { commonSlotService } from '../services/commonSlot.service';
import { checkInterviewerHasSchedule } from '../services/interviewerScheduleCheck.service';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export const confirmRouter = Router();

// 일정 선택 스키마
const selectSlotsSchema = z.object({
  selectedSlots: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1, '최소 1개의 시간대를 선택해주세요'),
});

// getInterviewById는 start_datetime/end_datetime/candidates를 반환하지 않음 → 제안일시·후보명 보강
async function getProposedSlotAndCandidates(interviewId: string, interview: { proposed_date?: string; proposed_start_time?: string; proposed_end_time?: string; confirmed_date?: string; confirmed_start_time?: string; confirmed_end_time?: string }) {
  const date = interview.confirmed_date || interview.proposed_date || dayjs().format('YYYY-MM-DD');
  const startTime = interview.confirmed_start_time || interview.proposed_start_time || '09:00';
  const endTime = interview.confirmed_end_time || interview.proposed_end_time || '18:00';
  const proposedDate = dayjs(date).format('YYYY-MM-DD');
  const proposedStartTime = startTime.slice(0, 5);
  const proposedEndTime = endTime.slice(0, 5);
  let candidateNames: string[] = [];
  try {
    const candidates = await dataService.getCandidatesByInterview(interviewId);
    candidateNames = candidates.map((c: { name?: string }) => c.name || '').filter(Boolean);
  } catch {
    // 무시
  }
  return { proposedDate, proposedStartTime, proposedEndTime, candidateNames };
}

// 면접 정보 조회 (면접관용)
confirmRouter.get('/:token', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const interviewId = user.interviewId!;
    const interviewerId = user.interviewerId;

    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 응답 현황 조회
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const allInterviewers = await dataService.getAllInterviewers();
    const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));

    const responseStatus = {
      total: mappings.length,
      responded: mappings.filter(m => m.responded_at).length,
      respondedList: mappings
        .filter(m => m.responded_at)
        .map(m => {
          const interviewer = interviewerMap.get(m.interviewer_id);
          return interviewer?.name || 'Unknown';
        }),
    };

    // 제안 일시·후보명 보강 (dataService는 proposed_* / confirmed_* 만 반환)
    const { proposedDate, proposedStartTime, proposedEndTime, candidateNames } = await getProposedSlotAndCandidates(interviewId, interview);

    // 확정된 일정·일정 수락 여부 (면접이 CONFIRMED일 때)
    let confirmedSchedule: { date: string; startTime: string; endTime: string } | null = null;
    let myAcceptedAt: string | null = null;
    if (interview.status === 'CONFIRMED') {
      const schedule = await dataService.getConfirmedSchedule(interviewId);
      if (schedule) {
        confirmedSchedule = {
          date: schedule.confirmed_date || '',
          startTime: schedule.confirmed_start_time || '',
          endTime: schedule.confirmed_end_time || '',
        };
      }
      const myMapping = mappings.find(m => m.interviewer_id === interviewerId);
      if (myMapping && (myMapping as any).accepted_at) {
        myAcceptedAt = (myMapping as any).accepted_at;
      }
    }

    // 면접관 일정 조회 API: 해당 기간에 일정 있으면 일정 선택 불가
    let externalScheduleExists = false;
    if (interviewerId) {
      const interviewer = await dataService.getInterviewerById(interviewerId);
      const email = interviewer?.email;
      if (email) {
        try {
          externalScheduleExists = await checkInterviewerHasSchedule(
            proposedDate,
            proposedDate,
            email
          );
        } catch (e) {
          logger.warn('Interviewer schedule check failed', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

    res.json({
      success: true,
      data: {
        interviewId: interview.interview_id,
        mainNotice: interview.main_notice,
        teamName: interview.team_name,
        status: interview.status,
        candidates: candidateNames,
        proposedSlot: {
          date: proposedDate,
          startTime: proposedStartTime,
          endTime: proposedEndTime,
        },
        responseStatus,
        externalScheduleExists,
        confirmedSchedule,
        myAcceptedAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, '면접 정보 조회 실패');
  }
});

// 확정된 일정 수락 (면접관이 확정 일정에 참석 수락)
confirmRouter.post('/:token/accept', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const interviewId = user.interviewId!;
    const interviewerId = user.interviewerId!;

    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    if (interview.status !== 'CONFIRMED') {
      throw new AppError(400, '일정이 확정된 면접만 수락할 수 있습니다');
    }

    await dataService.updateScheduleAcceptedAt(interviewId, interviewerId);

    res.json({
      success: true,
      data: {
        message: '일정 수락이 완료되었습니다',
        acceptedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, '일정 수락 처리 실패');
  }
});

// 일정 선택 제출
confirmRouter.post('/:token', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const interviewId = user.interviewId!;
    const interviewerId = user.interviewerId!;

    const validated = selectSlotsSchema.parse(req.body);

    // 면접 존재 확인
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 이미 확정된 면접인지 확인
    if (interview.status === 'CONFIRMED') {
      throw new AppError(400, '이미 확정된 면접입니다');
    }

    // 제안일 보강 (getInterviewById는 start_datetime 미반환)
    const { proposedDate } = await getProposedSlotAndCandidates(interviewId, interview);
    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (interviewer?.email) {
      const externalScheduleExists = await checkInterviewerHasSchedule(proposedDate, proposedDate, interviewer.email);
      if (externalScheduleExists) {
        throw new AppError(400, '해당 기간에 이미 일정이 있어 일정 선택을 할 수 없습니다');
      }
    }

    // 시간 선택 저장
    const now = Date.now();
    const selections = validated.selectedSlots.map((slot, index) => ({
      selection_id: `SEL_${now}_${index}`,
      interview_id: interviewId,
      interviewer_id: interviewerId,
      slot_date: slot.date,
      start_time: slot.startTime,
      end_time: slot.endTime,
    }));

    await dataService.createTimeSelections(selections);

    // 응답 완료 시간 업데이트
    await dataService.updateRespondedAt(interviewId, interviewerId);

    // 모든 면접관이 응답했는지 확인
    const mappings = await dataService.getInterviewInterviewers(interviewId);
    const totalInterviewers = mappings.length;
    const respondedCount = mappings.filter(m => m.responded_at).length;

    let status = interview.status;
    let message = '일정 선택이 완료되었습니다';

    if (respondedCount === totalInterviewers) {
      // 모든 면접관이 응답 완료
      const commonSlotsResult = await commonSlotService.findCommonSlots(interviewId);

      if (commonSlotsResult.hasCommon && commonSlotsResult.commonSlots.length > 0) {
        // 공통 일정이 있으면 첫 번째로 확정
        const firstSlot = commonSlotService.sortSlots(commonSlotsResult.commonSlots)[0];

        const confirmedAt = new Date().toISOString();
        await dataService.createConfirmedSchedule({
          interview_id: interviewId,
          candidate_id: '',
          confirmed_date: firstSlot.date,
          confirmed_start_time: firstSlot.startTime,
          confirmed_end_time: firstSlot.endTime,
          confirmed_at: confirmedAt,
        });

        await dataService.updateInterviewStatus(interviewId, 'CONFIRMED');
        status = 'CONFIRMED';
        message = '모든 면접관이 응답하여 일정이 확정되었습니다';

        // 확정 메일 발송 (면접관 + 지원자 이메일 있으면 포함)
        const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
        const interviewerEmails = mappings
          .map(m => interviewerMap.get(m.interviewer_id)?.email)
          .filter((e): e is string => !!e?.trim());

        let candidateEmails: string[] = [];
        try {
          const candidatesByInterview = await dataService.getCandidatesByInterview(interviewId);
          candidateEmails = candidatesByInterview.map((c: { email?: string }) => c.email).filter((e): e is string => !!e?.trim());
        } catch (e) {
          logger.debug('Could not load candidate emails for confirmation:', e);
        }
        const allRecipients = [...new Set([...interviewerEmails, ...candidateEmails])];
        const { candidateNames: candidates } = await getProposedSlotAndCandidates(interviewId, interview);

        if (allRecipients.length > 0) {
          try {
            logger.info(`[일정 확정] Sending confirmation email to ${allRecipients.length} recipient(s) (interviewers: ${interviewerEmails.length}, candidates: ${candidateEmails.length}) for interview ${interviewId}`);
            await emailService.sendConfirmationEmail(
              allRecipients,
              interview.main_notice,
              interview.team_name,
              firstSlot.date,
              firstSlot.startTime,
              firstSlot.endTime,
              candidates
            );
            logger.info(`[일정 확정] Confirmation email sent successfully for ${interviewId}`);
          } catch (error: any) {
            logger.error('[일정 확정] Failed to send confirmation email:', { interviewId, error: error?.message || error, stack: error?.stack });
            // 이메일 발송 실패해도 일정 확정은 완료
          }
        } else {
          logger.warn(`[일정 확정] No recipient emails (interviewers/candidates) to send confirmation for interview ${interviewId}`);
        }
      } else {
        // 공통 일정이 없으면 PARTIAL 상태 유지 (나중에 NO_COMMON으로 변경 가능)
        await dataService.updateInterviewStatus(interviewId, 'PARTIAL');
        status = 'PARTIAL';
        message = '모든 면접관이 응답했지만 공통 일정이 없습니다';
      }
    } else {
      // 일부만 응답 완료
      await dataService.updateInterviewStatus(interviewId, 'PARTIAL');
      status = 'PARTIAL';
    }

    res.json({
      success: true,
      data: {
        status,
        message,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, '일정 선택 실패');
  }
});
