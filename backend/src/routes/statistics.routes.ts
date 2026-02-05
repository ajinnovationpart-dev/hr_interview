import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export const statisticsRouter = Router();

// 전체 통계 개요
statisticsRouter.get('/overview', adminAuth, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const department = req.query.department as string;
    
    const interviews = await dataService.getAllInterviews();
    const interviewers = await dataService.getAllInterviewers();
    const candidates = await dataService.getAllCandidates();
    const rooms = await dataService.getAllRooms();
    
    // 날짜 필터링
    let filteredInterviews = interviews;
    if (startDate || endDate) {
      filteredInterviews = interviews.filter(i => {
        const interviewDate = i.proposed_date || i.confirmed_date;
        if (!interviewDate) return false;
        if (startDate && interviewDate < startDate) return false;
        if (endDate && interviewDate > endDate) return false;
        return true;
      });
    }
    
    // 부서 필터링
    if (department) {
      const interviewerIds = interviewers
        .filter(iv => iv.department === department)
        .map(iv => iv.interviewer_id);
      
      const mappings = await Promise.all(
        filteredInterviews.map(async (i) => {
          const interviewMappings = await dataService.getInterviewInterviewers(i.interview_id);
          return interviewMappings.some(m => interviewerIds.includes(m.interviewer_id));
        })
      );
      
      filteredInterviews = filteredInterviews.filter((_, idx) => mappings[idx]);
    }
    
    // 상태별 통계
    const byStatus: Record<string, number> = {};
    filteredInterviews.forEach(i => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    });
    
    // 면접관별 통계
    const interviewerStats = new Map<string, { name: string; email: string; count: number }>();
    for (const interview of filteredInterviews) {
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      for (const mapping of mappings) {
        const interviewer = interviewers.find(iv => iv.interviewer_id === mapping.interviewer_id);
        if (interviewer) {
          const current = interviewerStats.get(interviewer.interviewer_id) || {
            name: interviewer.name,
            email: interviewer.email,
            count: 0,
          };
          current.count++;
          interviewerStats.set(interviewer.interviewer_id, current);
        }
      }
    }
    
    const topInterviewers = Array.from(interviewerStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 평가 통계 (해당 기간 면접에 대한 평가만)
    const allEvaluations: any[] = [];
    for (const i of filteredInterviews) {
      try {
        const evals = await dataService.getEvaluationsByInterview(i.interview_id);
        allEvaluations.push(...evals);
      } catch {
        // getEvaluationsByInterview 미구현 스토리지면 무시
      }
    }
    const evaluationStats = {
      total: allEvaluations.length,
      passCount: allEvaluations.filter(e => e.recommendation === 'PASS').length,
      failCount: allEvaluations.filter(e => e.recommendation === 'FAIL').length,
      considerCount: allEvaluations.filter(e => e.recommendation === 'CONSIDER').length,
      passRate: allEvaluations.length > 0
        ? Math.round((allEvaluations.filter(e => e.recommendation === 'PASS').length / allEvaluations.length) * 100)
        : 0,
      avgTechnical: allEvaluations.length > 0
        ? Math.round((allEvaluations.reduce((s, e) => s + (Number(e.technical_score) || 0), 0) / allEvaluations.length) * 10) / 10
        : 0,
      avgCommunication: allEvaluations.length > 0
        ? Math.round((allEvaluations.reduce((s, e) => s + (Number(e.communication_score) || 0), 0) / allEvaluations.length) * 10) / 10
        : 0,
      avgOverall: allEvaluations.length > 0
        ? Math.round((allEvaluations.reduce((s, e) => s + (Number(e.overall_score) || 0), 0) / allEvaluations.length) * 10) / 10
        : 0,
    };
    
    // 면접실 사용률
    const roomUtilization = await Promise.all(
      rooms.map(async (room) => {
        const roomInterviews = filteredInterviews.filter(i => i.room_id === room.room_id);
        const totalBookings = roomInterviews.length;
        
        // 근무시간 기준: 09:00-18:00 (8시간) * 근무일수
        const workDays = startDate && endDate 
          ? dayjs(endDate).diff(dayjs(startDate), 'day') + 1
          : 30; // 기본 30일
        const totalAvailableHours = 8 * workDays;
        
        // 실제 사용 시간 계산 (면접당 평균 1시간 가정)
        const usedHours = totalBookings;
        const utilizationRate = totalAvailableHours > 0 
          ? (usedHours / totalAvailableHours) * 100 
          : 0;
        
        return {
          roomId: room.room_id,
          roomName: room.room_name,
          utilizationRate: Math.round(utilizationRate * 10) / 10,
          totalBookings,
        };
      })
    );
    
    // 일일 면접 추이
    const dailyInterviews: Record<string, number> = {};
    filteredInterviews.forEach(i => {
      const date = i.proposed_date || i.confirmed_date;
      if (date) {
        dailyInterviews[date] = (dailyInterviews[date] || 0) + 1;
      }
    });
    
    const dailyTrend = Object.entries(dailyInterviews)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data: {
        period: {
          start: startDate || null,
          end: endDate || null,
        },
        interviews: {
          total: filteredInterviews.length,
          byStatus,
          averageDuration: 60, // 기본값 (실제로는 계산 필요)
        },
        interviewers: {
          total: interviewers.length,
          active: interviewers.filter(iv => iv.is_active).length,
          topPerformers: topInterviewers,
        },
        candidates: {
          total: candidates.length,
        },
        evaluations: evaluationStats,
        rooms: {
          total: rooms.length,
          utilization: roomUtilization,
        },
        trends: {
          dailyInterviews: dailyTrend,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting statistics overview:', error);
    throw new AppError(500, '통계 조회 실패');
  }
});

// 면접관별 통계
statisticsRouter.get('/interviewers/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.params.id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (!interviewer) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }
    
    const allInterviews = await dataService.getAllInterviews();
    const allMappings = await Promise.all(
      allInterviews.map(async (i) => ({
        interview: i,
        mappings: await dataService.getInterviewInterviewers(i.interview_id),
      }))
    );
    
    // 해당 면접관이 참여한 면접 필터링
    let interviewerInterviews = allMappings
      .filter(({ mappings }) => mappings.some(m => m.interviewer_id === interviewerId))
      .map(({ interview }) => interview);
    
    // 날짜 필터링
    if (startDate || endDate) {
      interviewerInterviews = interviewerInterviews.filter(i => {
        const interviewDate = i.proposed_date || i.confirmed_date;
        if (!interviewDate) return false;
        if (startDate && interviewDate < startDate) return false;
        if (endDate && interviewDate > endDate) return false;
        return true;
      });
    }
    
    // 역할별 통계
    const byRole = { primary: 0, secondary: 0, observer: 0 };
    for (const interview of interviewerInterviews) {
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      const mapping = mappings.find(m => m.interviewer_id === interviewerId);
      if (mapping) {
        const role = (mapping as any).role || 'SECONDARY';
        if (role === 'PRIMARY') byRole.primary++;
        else if (role === 'SECONDARY') byRole.secondary++;
        else if (role === 'OBSERVER') byRole.observer++;
      }
    }
    
    // 월별 추이
    const monthlyTrend: Record<string, number> = {};
    interviewerInterviews.forEach(i => {
      const date = i.proposed_date || i.confirmed_date;
      if (date) {
        const month = date.substring(0, 7); // YYYY-MM
        monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
      }
    });
    
    res.json({
      success: true,
      data: {
        interviewer,
        statistics: {
          totalInterviews: interviewerInterviews.length,
          completedInterviews: interviewerInterviews.filter(i => i.status === 'COMPLETED').length,
          cancelledInterviews: interviewerInterviews.filter(i => i.status === 'CANCELLED').length,
          noShowCount: interviewerInterviews.filter(i => i.status === 'NO_SHOW').length,
          averageDuration: 60,
          byRole,
          monthlyTrend: Object.entries(monthlyTrend).map(([month, count]) => ({ month, count })),
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer statistics:', error);
    throw new AppError(500, '면접관 통계 조회 실패');
  }
});

// 면접실 사용률 통계
statisticsRouter.get('/rooms', adminAuth, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!startDate || !endDate) {
      throw new AppError(400, '시작일과 종료일을 입력해주세요');
    }
    
    const rooms = await dataService.getAllRooms();
    const interviews = await dataService.getAllInterviews();
    
    const workDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    const totalAvailableHours = 8 * workDays; // 하루 8시간
    
    const roomStats = await Promise.all(
      rooms.map(async (room) => {
        const roomInterviews = interviews.filter(i => {
          if (i.room_id !== room.room_id) return false;
          const interviewDate = i.proposed_date || i.confirmed_date;
          if (!interviewDate) return false;
          return interviewDate >= startDate && interviewDate <= endDate;
        });
        
        const totalBookings = roomInterviews.length;
        const usedHours = totalBookings; // 면접당 1시간 가정
        const utilizationRate = totalAvailableHours > 0 
          ? (usedHours / totalAvailableHours) * 100 
          : 0;
        
        // 시간대별 예약 수 (간단한 버전)
        const peakHours: Record<string, number> = {};
        roomInterviews.forEach(i => {
          const time = i.proposed_start_time || i.confirmed_start_time;
          if (time) {
            const hour = time.substring(0, 2);
            peakHours[hour] = (peakHours[hour] || 0) + 1;
          }
        });
        
        return {
          roomId: room.room_id,
          roomName: room.room_name,
          location: room.location,
          totalBookings,
          totalHours: usedHours,
          utilizationRate: Math.round(utilizationRate * 10) / 10,
          peakHours: Object.entries(peakHours)
            .map(([hour, bookingCount]) => ({ hour: `${hour}:00`, bookingCount }))
            .sort((a, b) => b.bookingCount - a.bookingCount)
            .slice(0, 5),
          averageDuration: 60,
        };
      })
    );
    
    const overall = {
      totalRooms: rooms.length,
      averageUtilization: roomStats.length > 0
        ? roomStats.reduce((sum, r) => sum + r.utilizationRate, 0) / roomStats.length
        : 0,
      mostUsedRoom: roomStats.length > 0
        ? roomStats.sort((a, b) => b.totalBookings - a.totalBookings)[0].roomName
        : null,
      leastUsedRoom: roomStats.length > 0
        ? roomStats.sort((a, b) => a.totalBookings - b.totalBookings)[0].roomName
        : null,
    };
    
    res.json({
      success: true,
      data: {
        rooms: roomStats,
        overall,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting room statistics:', error);
    throw new AppError(500, '면접실 통계 조회 실패');
  }
});
