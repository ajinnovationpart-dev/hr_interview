import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyToken } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { emailService } from '../services/email.service';
import { commonSlotService } from '../services/commonSlot.service';
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

// 면접 정보 조회 (면접관용)
confirmRouter.get('/:token', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const interviewId = user.interviewId!;

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

    // 제안 일시 파싱
    const proposedDate = dayjs(interview.start_datetime).format('YYYY-MM-DD');
    const proposedStartTime = dayjs(interview.start_datetime).format('HH:mm');
    const proposedEndTime = dayjs(interview.end_datetime).format('HH:mm');

    res.json({
      success: true,
      data: {
        interviewId: interview.interview_id,
        mainNotice: interview.main_notice,
        teamName: interview.team_name,
        candidates: interview.candidates ? interview.candidates.split(',').map(c => c.trim()) : [],
        proposedSlot: {
          date: proposedDate,
          startTime: proposedStartTime,
          endTime: proposedEndTime,
        },
        responseStatus,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, '면접 정보 조회 실패');
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

        await dataService.createConfirmedSchedule({
          interview_id: interviewId,
          confirmed_date: firstSlot.date,
          confirmed_start_time: firstSlot.startTime,
          confirmed_end_time: firstSlot.endTime,
        });

        await dataService.updateInterviewStatus(interviewId, 'CONFIRMED');
        status = 'CONFIRMED';
        message = '모든 면접관이 응답하여 일정이 확정되었습니다';

        // 확정 메일 발송
        const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
        const interviewerEmails = mappings
          .map(m => interviewerMap.get(m.interviewer_id)?.email)
          .filter(Boolean) as string[];

        const candidates = interview.candidates.split(',').map(c => c.trim());

        try {
          await emailService.sendConfirmationEmail(
            interviewerEmails,
            interview.main_notice,
            interview.team_name,
            firstSlot.date,
            firstSlot.startTime,
            firstSlot.endTime,
            candidates
          );
        } catch (error) {
          console.error('Failed to send confirmation email:', error);
          // 이메일 발송 실패해도 일정 확정은 완료
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
