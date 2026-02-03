import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export const interviewerScheduleRouter = Router();

// 면접관별 스케줄 조회
interviewerScheduleRouter.get('/:id/schedule', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.params.id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const view = (req.query.view as string) || 'week';
    
    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (!interviewer) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }
    
    // 날짜 범위 계산
    let dateRange: { start: string; end: string };
    if (startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    } else if (view === 'day') {
      const today = dayjs().format('YYYY-MM-DD');
      dateRange = { start: today, end: today };
    } else if (view === 'week') {
      const start = dayjs().startOf('week').format('YYYY-MM-DD');
      const end = dayjs().endOf('week').format('YYYY-MM-DD');
      dateRange = { start, end };
    } else {
      const start = dayjs().startOf('month').format('YYYY-MM-DD');
      const end = dayjs().endOf('month').format('YYYY-MM-DD');
      dateRange = { start, end };
    }
    
    // 모든 면접 조회
    const allInterviews = await dataService.getAllInterviews();
    
    // 해당 면접관이 참여한 면접 필터링
    const interviewerInterviews = [];
    for (const interview of allInterviews) {
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      if (mappings.some(m => m.interviewer_id === interviewerId)) {
        const interviewDate = interview.proposed_date || interview.confirmed_date;
        if (interviewDate && interviewDate >= dateRange.start && interviewDate <= dateRange.end) {
          const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
          const mapping = mappings.find(m => m.interviewer_id === interviewerId);
          const role = (mapping as any)?.role || 'SECONDARY';
          
          interviewerInterviews.push({
            interviewId: interview.interview_id,
            candidateName: candidates.map(c => c.name).join(', '),
            position: candidates[0]?.position_applied || '',
            startTime: interview.proposed_start_time || interview.confirmed_start_time,
            endTime: interview.proposed_end_time || interview.confirmed_end_time,
            roomName: interview.room_id ? (await dataService.getRoomById(interview.room_id))?.room_name : null,
            role,
            status: interview.status,
            date: interviewDate,
          });
        }
      }
    }
    
    // 날짜별로 그룹화
    const scheduleByDate: Record<string, any[]> = {};
    interviewerInterviews.forEach(interview => {
      if (!scheduleByDate[interview.date]) {
        scheduleByDate[interview.date] = [];
      }
      scheduleByDate[interview.date].push(interview);
    });
    
    // 날짜별 스케줄 생성
    const schedule = [];
    let currentDate = dayjs(dateRange.start);
    const endDateObj = dayjs(dateRange.end);
    
    while (currentDate.isBefore(endDateObj) || currentDate.isSame(endDateObj)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const interviews = scheduleByDate[dateStr] || [];
      
      // 가용 시간 슬롯 생성 (09:00-18:00, 30분 단위)
      const availableSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const endTime = minute === 30 
            ? `${String(hour + 1).padStart(2, '0')}:00`
            : `${String(hour).padStart(2, '0')}:30`;
          
          // 점심시간 제외
          if (startTime >= '12:00' && startTime < '13:00') continue;
          
          // 해당 시간에 면접이 있는지 확인
          const hasInterview = interviews.some(i => {
            const iStart = i.startTime;
            const iEnd = i.endTime;
            return startTime < iEnd && endTime > iStart;
          });
          
          availableSlots.push({
            startTime,
            endTime,
            available: !hasInterview,
          });
        }
      }
      
      schedule.push({
        date: dateStr,
        interviews: interviews.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        availableSlots: availableSlots.filter(s => s.available),
      });
      
      currentDate = currentDate.add(1, 'day');
    }
    
    // 통계 계산
    const statistics = {
      totalInterviews: interviewerInterviews.length,
      completedInterviews: interviewerInterviews.filter(i => i.status === 'COMPLETED').length,
      upcomingInterviews: interviewerInterviews.filter(i => 
        ['SCHEDULED', 'CONFIRMED'].includes(i.status)
      ).length,
      averageDuration: 60, // 기본값
    };
    
    res.json({
      success: true,
      data: {
        interviewer,
        weekSchedule: schedule,
        statistics,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer schedule:', error);
    throw new AppError(500, '면접관 스케줄 조회 실패');
  }
});

// 면접관 가용성 조회
interviewerScheduleRouter.get('/:id/availability', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.params.id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const duration = Number(req.query.duration) || 60;
    
    if (!startDate || !endDate) {
      throw new AppError(400, '시작일과 종료일을 입력해주세요');
    }
    
    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (!interviewer) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }
    
    // 모든 면접 조회
    const allInterviews = await dataService.getAllInterviews();
    
    // 해당 면접관이 참여한 면접 필터링
    const interviewerInterviews = [];
    for (const interview of allInterviews) {
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      if (mappings.some(m => m.interviewer_id === interviewerId)) {
        const interviewDate = interview.proposed_date || interview.confirmed_date;
        if (interviewDate && interviewDate >= startDate && interviewDate <= endDate) {
          interviewerInterviews.push({
            interviewId: interview.interview_id,
            candidateName: (await dataService.getCandidatesByInterview(interview.interview_id))[0]?.name || '',
            startTime: interview.proposed_start_time || interview.confirmed_start_time,
            endTime: interview.proposed_end_time || interview.confirmed_end_time,
            date: interviewDate,
          });
        }
      }
    }
    
    // 날짜별 가용성 계산
    const availability = [];
    let currentDate = dayjs(startDate);
    const endDateObj = dayjs(endDate);
    
    while (currentDate.isBefore(endDateObj) || currentDate.isSame(endDateObj)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayInterviews = interviewerInterviews.filter(i => i.date === dateStr);
      
      // 30분 단위 슬롯 생성
      const availableSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const endTimeMinutes = minute + duration;
          const endHour = hour + Math.floor(endTimeMinutes / 60);
          const endMinute = endTimeMinutes % 60;
          const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          // 점심시간 제외
          if (startTime >= '12:00' && startTime < '13:00') continue;
          if (endTime > '13:00' && startTime < '13:00') continue;
          
          // 해당 시간에 면접이 있는지 확인
          const hasConflict = dayInterviews.some(i => {
            const iStart = i.startTime;
            const iEnd = i.endTime;
            return startTime < iEnd && endTime > iStart;
          });
          
          availableSlots.push({
            startTime,
            endTime,
            available: !hasConflict,
            reason: hasConflict ? '기존 면접과 충돌' : undefined,
          });
        }
      }
      
      availability.push({
        date: dateStr,
        availableSlots: availableSlots.filter(s => s.available),
        existingInterviews: dayInterviews,
        dailyInterviewCount: dayInterviews.length,
        maxDailyInterviews: 5, // 기본값 (실제로는 면접관 정보에서 가져와야 함)
      });
      
      currentDate = currentDate.add(1, 'day');
    }
    
    res.json({
      success: true,
      data: {
        interviewer,
        availability,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer availability:', error);
    throw new AppError(500, '면접관 가용성 조회 실패');
  }
});
