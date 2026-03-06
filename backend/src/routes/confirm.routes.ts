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
  selectedSlotIds: z.array(z.string().min(1)).min(1, '최소 1개의 제안 일정을 선택해주세요').optional(),
  selectedSlots: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1, '최소 1개의 일정을 선택해주세요').optional(),
}).refine((data) => {
  return (Array.isArray(data.selectedSlotIds) && data.selectedSlotIds.length > 0) ||
    (Array.isArray(data.selectedSlots) && data.selectedSlots.length > 0);
}, {
  message: 'selectedSlotIds 또는 selectedSlots 중 하나는 필수입니다',
});

// getInterviewById는 start_datetime/end_datetime/candidates를 반환하지 않음 → 제안일시·후보명 보강
async function getProposedSlotsAndCandidates(
  interviewId: string,
  interview: { proposed_date?: string; proposed_start_time?: string; proposed_end_time?: string }
) {
  const legacyWrappedSlot = {
    slotId: 'LEGACY_SLOT_1',
    date: dayjs(interview.proposed_date || dayjs().format('YYYY-MM-DD')).format('YYYY-MM-DD'),
    startTime: (interview.proposed_start_time || '09:00').slice(0, 5),
    endTime: (interview.proposed_end_time || '18:00').slice(0, 5),
  };

  let proposedSlots: Array<{ slotId: string; date: string; startTime: string; endTime: string }> = [];
  const hasMethod = typeof (dataService as any).getInterviewProposedSlots === 'function';
  if (hasMethod) {
    try {
      const rawSlots = await (dataService as any).getInterviewProposedSlots(interviewId);
      if (Array.isArray(rawSlots) && rawSlots.length > 0) {
        proposedSlots = rawSlots
          .slice()
          .sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((slot: { slot_id: string; slot_date: string; start_time: string; end_time: string }) => ({
            slotId: slot.slot_id,
            date: slot.slot_date,
            startTime: slot.start_time,
            endTime: slot.end_time,
          }));
      }
    } catch {
      // 메서드 실패 시 하위호환 fallback 사용
    }
  }
  if (proposedSlots.length === 0) {
    proposedSlots = [legacyWrappedSlot];
  }

  let candidateNames: string[] = [];
  try {
    const candidates = await dataService.getCandidatesByInterview(interviewId);
    candidateNames = candidates.map((c: { name?: string }) => c.name || '').filter(Boolean);
  } catch {
    // 무시
  }
  return { proposedSlots, candidateNames };
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

    // 제안 일정·후보명 보강
    const { proposedSlots, candidateNames } = await getProposedSlotsAndCandidates(interviewId, interview);

    // 확정된 일정 (CONFIRMED 또는 확정 대기 PENDING_APPROVAL일 때 표시). 일정 수락 여부는 CONFIRMED일 때만
    let confirmedSchedule: { date: string; startTime: string; endTime: string } | null = null;
    let myAcceptedAt: string | null = null;
    if (interview.status === 'CONFIRMED' || interview.status === 'PENDING_APPROVAL') {
      const schedule = await dataService.getConfirmedSchedule(interviewId);
      if (schedule) {
        confirmedSchedule = {
          date: schedule.confirmed_date || '',
          startTime: schedule.confirmed_start_time || '',
          endTime: schedule.confirmed_end_time || '',
        };
      }
      if (interview.status === 'CONFIRMED') {
        const myMapping = mappings.find(m => m.interviewer_id === interviewerId);
        if (myMapping && (myMapping as any).accepted_at) {
          myAcceptedAt = (myMapping as any).accepted_at;
        }
      }
    }

    // 면접관 일정 조회 API: 해당 기간에 일정 있으면 일정 선택 불가
    let externalScheduleExists = false;
    if (interviewerId) {
      const interviewer = await dataService.getInterviewerById(interviewerId);
      const email = interviewer?.email;
      if (email) {
        try {
          for (const slot of proposedSlots) {
            const conflict = await checkInterviewerHasSchedule(slot.date, slot.date, email);
            if (conflict) {
              externalScheduleExists = true;
              break;
            }
          }
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
        proposedSlots,
        proposedSlot: {
          date: proposedSlots[0]?.date || '',
          startTime: proposedSlots[0]?.startTime || '',
          endTime: proposedSlots[0]?.endTime || '',
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

    // 이미 확정된 면접 또는 확정 대기인지 확인
    if (interview.status === 'CONFIRMED') {
      throw new AppError(400, '이미 확정된 면접입니다');
    }
    if (interview.status === 'PENDING_APPROVAL') {
      throw new AppError(400, '일정이 확정 대기 상태입니다. 관리자 승인 후 확정됩니다.');
    }

    const proposedSlots = await dataService.getInterviewProposedSlots(interviewId);
    const proposedSlotsWithFallback = proposedSlots.length > 0
      ? proposedSlots
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((slot) => ({
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

    let selectedSlots: Array<{ date: string; startTime: string; endTime: string }> = [];
    if (validated.selectedSlotIds && validated.selectedSlotIds.length > 0) {
      const slotMap = new Map(proposedSlotsWithFallback.map((slot) => [slot.slotId, slot]));
      selectedSlots = validated.selectedSlotIds.map((slotId) => slotMap.get(slotId)).filter(Boolean) as Array<{
        date: string;
        startTime: string;
        endTime: string;
      }>;
      if (selectedSlots.length !== validated.selectedSlotIds.length) {
        throw new AppError(400, '선택한 일정 중 유효하지 않은 슬롯이 포함되어 있습니다');
      }
    } else if (validated.selectedSlots && validated.selectedSlots.length > 0) {
      const allowedKeys = new Set(
        proposedSlotsWithFallback.map((slot) => `${slot.date}|${slot.startTime}|${slot.endTime}`)
      );
      const requested = validated.selectedSlots.map((slot) => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      const allValid = requested.every((slot) => allowedKeys.has(`${slot.date}|${slot.startTime}|${slot.endTime}`));
      if (!allValid) {
        throw new AppError(400, '선택한 일정 중 유효하지 않은 슬롯이 포함되어 있습니다');
      }
      selectedSlots = requested;
    }

    // 선택한 각 슬롯(날짜)에 대해 외부 일정 충돌 검사
    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (interviewer?.email) {
      for (const slot of selectedSlots) {
        const conflict = await checkInterviewerHasSchedule(slot.date, slot.date, interviewer.email);
        if (conflict) {
          throw new AppError(400, `선택한 일정 중 ${slot.date}에 이미 일정이 있어 일정 선택을 할 수 없습니다`);
        }
      }
    }

    // 시간 선택 저장
    const now = Date.now();
    const selections = selectedSlots.map((slot, index) => ({
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
        // 공통 일정이 있으면 첫 번째 30분 블록 날짜 기준, 면접자별 scheduled 시간으로 확정 (#4)
        const firstSlot = commonSlotService.sortSlots(commonSlotsResult.commonSlots)[0];
        const confirmedAt = new Date().toISOString();
        const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
        for (const ic of interviewCandidates) {
          await dataService.createConfirmedSchedule({
            interview_id: interviewId,
            candidate_id: ic.candidate_id,
            confirmed_date: firstSlot.date,
            confirmed_start_time: ic.scheduled_start_time || firstSlot.startTime,
            confirmed_end_time: ic.scheduled_end_time || firstSlot.endTime,
            confirmed_at: confirmedAt,
          });
        }

        // 확정 대기: 관리자 승인 후 CONFIRMED로 전환되며, 그때 확정 메일 발송
        await dataService.updateInterviewStatus(interviewId, 'PENDING_APPROVAL');
        status = 'PENDING_APPROVAL';
        message = '모든 면접관이 응답하여 확정 대기 상태입니다. 관리자 승인 후 확정됩니다.';
      } else {
        // 공통 일정이 없으면 즉시 NO_COMMON 전이 (#3)
        await dataService.updateInterviewStatus(interviewId, 'NO_COMMON');
        status = 'NO_COMMON';
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
