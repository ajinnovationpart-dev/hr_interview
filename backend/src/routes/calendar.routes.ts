import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export const calendarRouter = Router();

// 캘린더 뷰 API
calendarRouter.get('/interviews', adminAuth, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const view = (req.query.view as string) || 'month';
    const interviewerId = req.query.interviewerId as string;
    const roomId = req.query.roomId as string;
    
    if (!startDate || !endDate) {
      throw new AppError(400, '시작일과 종료일을 입력해주세요');
    }
    
    let interviews = await dataService.getAllInterviews();
    
    // 날짜 필터링
    interviews = interviews.filter(i => {
      const interviewDate = i.proposed_date || i.confirmed_date;
      return interviewDate && interviewDate >= startDate && interviewDate <= endDate;
    });
    
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
    
    // 면접실 필터
    if (roomId) {
      interviews = interviews.filter(i => i.room_id === roomId);
    }
    
    // 이벤트 형식으로 변환
    const events = [];
    const conflicts: any[] = [];
    
    for (const interview of interviews) {
      const interviewDate = interview.proposed_date || interview.confirmed_date;
      const startTime = interview.proposed_start_time || interview.confirmed_start_time;
      const endTime = interview.proposed_end_time || interview.confirmed_end_time;
      
      if (!interviewDate || !startTime || !endTime) continue;
      
      const startDateTime = dayjs(`${interviewDate}T${startTime}`).toISOString();
      const endDateTime = dayjs(`${interviewDate}T${endTime}`).toISOString();
      
      const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      const allInterviewers = await dataService.getAllInterviewers();
      const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
      const interviewerNames = mappings
        .map(m => interviewerMap.get(m.interviewer_id)?.name)
        .filter(Boolean);
      
      const room = interview.room_id ? await dataService.getRoomById(interview.room_id) : null;
      
      // 상태별 색상
      const statusColors: Record<string, string> = {
        'PENDING': '#ff9800',
        'PARTIAL': '#2196f3',
        'CONFIRMED': '#4caf50',
        'SCHEDULED': '#4caf50',
        'IN_PROGRESS': '#9c27b0',
        'COMPLETED': '#607d8b',
        'CANCELLED': '#f44336',
        'NO_SHOW': '#795548',
        'NO_COMMON': '#ff5722',
      };
      
      events.push({
        id: interview.interview_id,
        title: `${interview.main_notice} - ${candidates.map(c => c.name).join(', ')}`,
        start: startDateTime,
        end: endDateTime,
        allDay: false,
        resource: {
          interviewId: interview.interview_id,
          candidateName: candidates.map(c => c.name).join(', '),
          interviewers: interviewerNames,
          roomName: room?.room_name || null,
          status: interview.status,
        },
        color: statusColors[interview.status] || '#757575',
      });
    }
    
    // 충돌 감지
    const conflictMap = new Map<string, Set<string>>();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];
        
        // 시간 겹침 확인
        if (e1.start < e2.end && e1.end > e2.start) {
          // 면접관 충돌 확인
          const interview1 = interviews.find(inv => inv.interview_id === e1.id);
          const interview2 = interviews.find(inv => inv.interview_id === e2.id);
          
          if (interview1 && interview2) {
            const mappings1 = await dataService.getInterviewInterviewers(interview1.interview_id);
            const mappings2 = await dataService.getInterviewInterviewers(interview2.interview_id);
            
            const interviewerIds1 = new Set(mappings1.map(m => m.interviewer_id));
            const interviewerIds2 = new Set(mappings2.map(m => m.interviewer_id));
            
            // 공통 면접관 찾기
            const commonInterviewers = [...interviewerIds1].filter(id => interviewerIds2.has(id));
            
            if (commonInterviewers.length > 0) {
              for (const interviewerId of commonInterviewers) {
                if (!conflictMap.has(interviewerId)) {
                  conflictMap.set(interviewerId, new Set());
                }
                conflictMap.get(interviewerId)!.add(e1.id);
                conflictMap.get(interviewerId)!.add(e2.id);
              }
            }
            
            // 면접실 충돌 확인
            if (interview1.room_id && interview1.room_id === interview2.room_id) {
              if (!conflictMap.has(`room_${interview1.room_id}`)) {
                conflictMap.set(`room_${interview1.room_id}`, new Set());
              }
              conflictMap.get(`room_${interview1.room_id}`)!.add(e1.id);
              conflictMap.get(`room_${interview1.room_id}`)!.add(e2.id);
            }
          }
        }
      }
    }
    
    // 충돌 정보 생성
    for (const [resourceId, interviewIds] of conflictMap.entries()) {
      if (resourceId.startsWith('room_')) {
        const room = await dataService.getRoomById(resourceId.replace('room_', ''));
        conflicts.push({
          type: 'room',
          resourceId: resourceId.replace('room_', ''),
          resourceName: room?.room_name || resourceId,
          conflictingInterviews: Array.from(interviewIds),
        });
      } else {
        const interviewer = await dataService.getInterviewerById(resourceId);
        conflicts.push({
          type: 'interviewer',
          resourceId,
          resourceName: interviewer?.name || resourceId,
          conflictingInterviews: Array.from(interviewIds),
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        events,
        conflicts,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting calendar view:', error);
    throw new AppError(500, '캘린더 조회 실패');
  }
});
