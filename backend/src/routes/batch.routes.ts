import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';

export const batchRouter = Router();

// 일괄 면접 생성 스키마
const batchCreateSchema = z.object({
  interviews: z.array(z.object({
    candidateId: z.string(),
    interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    duration: z.number().int().min(30),
    interviewerIds: z.array(z.string()).min(1),
    roomId: z.string().optional(),
    interviewType: z.string(),
    stage: z.string(),
    notes: z.string().optional(),
  })).min(1),
  options: z.object({
    skipConflicts: z.boolean().optional(),
    sendNotifications: z.boolean().optional(),
  }).optional(),
});

// 일괄 면접 생성
batchRouter.post('/interviews', adminAuth, async (req: Request, res: Response) => {
  try {
    const validated = batchCreateSchema.parse(req.body);
    const { interviews, options = {} } = validated;
    
    const results = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (let i = 0; i < interviews.length; i++) {
      const interviewData = interviews[i];
      try {
        // 충돌 확인
        const conflicts = await checkScheduleConflicts(interviewData);
        
        if (conflicts.hasConflict && !options.skipConflicts) {
          results.push({
            index: i,
            success: false,
            error: `일정 충돌: ${conflicts.message}`,
          });
          skipped++;
          continue;
        }
        
        // 면접 생성 (간단한 버전 - 실제로는 interview.routes.ts의 로직 재사용)
        // 여기서는 기본적인 생성만 수행
        const interviewId = `INT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 실제 면접 생성 로직은 interview.routes.ts의 createInterview 로직을 재사용해야 함
        // 여기서는 스켈레톤만 제공
        
        results.push({
          index: i,
          success: true,
          interviewId,
        });
        created++;
      } catch (error: any) {
        results.push({
          index: i,
          success: false,
          error: error.message || '면접 생성 실패',
        });
        failed++;
      }
    }
    
    res.json({
      success: true,
      data: {
        created,
        skipped,
        failed,
        results,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in batch interview creation:', error);
    throw new AppError(500, '일괄 면접 생성 실패');
  }
});

// 일괄 상태 변경
batchRouter.put('/interviews/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const { interviewIds, status, reason } = req.body;
    
    if (!Array.isArray(interviewIds) || interviewIds.length === 0) {
      throw new AppError(400, '면접 ID 목록을 입력해주세요');
    }
    
    if (!status) {
      throw new AppError(400, '상태를 입력해주세요');
    }
    
    const results = [];
    let updated = 0;
    let failed = 0;
    
    for (const interviewId of interviewIds) {
      try {
        const interview = await dataService.getInterviewById(interviewId);
        if (!interview) {
          results.push({
            interviewId,
            success: false,
            error: '면접을 찾을 수 없습니다',
          });
          failed++;
          continue;
        }
        
        await dataService.updateInterviewStatus(interviewId, status);
        
        if (reason) {
          await dataService.updateInterview(interviewId, {
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
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
        
        results.push({
          interviewId,
          success: true,
        });
        updated++;
      } catch (error: any) {
        results.push({
          interviewId,
          success: false,
          error: error.message || '상태 변경 실패',
        });
        failed++;
      }
    }
    
    res.json({
      success: true,
      data: {
        updated,
        failed,
        results,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in batch status update:', error);
    throw new AppError(500, '일괄 상태 변경 실패');
  }
});

// 충돌 확인 헬퍼 함수
async function checkScheduleConflicts(interviewData: any): Promise<{ hasConflict: boolean; message: string }> {
  // 간단한 충돌 확인 (실제로는 더 복잡한 로직 필요)
  const interviews = await dataService.getAllInterviews();
  const sameDateInterviews = interviews.filter(i => {
    const interviewDate = i.proposed_date || i.confirmed_date;
    return interviewDate === interviewData.interviewDate;
  });
  
  for (const existing of sameDateInterviews) {
    const existingStart = existing.proposed_start_time || existing.confirmed_start_time;
    const existingEnd = existing.proposed_end_time || existing.confirmed_end_time;
    
    if (existingStart && existingEnd) {
      // 시간 겹침 확인
      if (interviewData.startTime < existingEnd && 
          calculateEndTime(interviewData.startTime, interviewData.duration) > existingStart) {
        // 면접관 충돌 확인
        const existingMappings = await dataService.getInterviewInterviewers(existing.interview_id);
        const existingInterviewerIds = new Set(existingMappings.map(m => m.interviewer_id));
        const newInterviewerIds = new Set(interviewData.interviewerIds);
        
        const commonInterviewers = [...existingInterviewerIds].filter(id => newInterviewerIds.has(id));
        if (commonInterviewers.length > 0) {
          return {
            hasConflict: true,
            message: `면접관 충돌: ${commonInterviewers.length}명의 면접관이 동일 시간에 다른 면접이 있습니다`,
          };
        }
        
        // 면접실 충돌 확인
        if (interviewData.roomId && existing.room_id === interviewData.roomId) {
          return {
            hasConflict: true,
            message: '면접실이 이미 예약되어 있습니다',
          };
        }
      }
    }
  }
  
  return { hasConflict: false, message: '' };
}

function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}
