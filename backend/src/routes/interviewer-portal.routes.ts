/**
 * 면접관 전용 포털 API
 * 면접관은 자신의 일정과 평가만 조회/수정 가능
 */
import { Router, Request, Response } from 'express';
import { interviewerAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';

export const interviewerPortalRouter = Router();

// 면접관 정보 조회
interviewerPortalRouter.get('/me', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    const interviewer = await dataService.getInterviewerById(interviewerId);
    if (!interviewer) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }

    res.json({
      success: true,
      data: {
        interviewer,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer info:', error);
    throw new AppError(500, '면접관 정보 조회 실패');
  }
});

// 면접관의 면접 일정 목록 조회
interviewerPortalRouter.get('/interviews', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    // 모든 면접 조회
    const allInterviews = await dataService.getAllInterviews();
    
    // 면접관이 참여하는 면접만 필터링
    const interviewerInterviews = [];
    
    for (const interview of allInterviews) {
      // interview_interviewers 테이블에서 확인
      const interviewInterviewers = await dataService.getInterviewInterviewers(interview.interview_id);
      const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
      
      if (isParticipating) {
        // 면접자 정보 조회
        const interviewCandidates = await dataService.getInterviewCandidates(interview.interview_id);
        const candidates = [];
        
        for (const ic of interviewCandidates) {
          const candidate = await dataService.getCandidateById(ic.candidate_id);
          if (candidate) {
            // 면접관이 담당하는 면접자인지 확인
            const candidateInterviewers = await dataService.getCandidateInterviewers(
              interview.interview_id,
              ic.candidate_id
            );
            const isAssigned = candidateInterviewers.some(ci => ci.interviewer_id === interviewerId);
            
            if (isAssigned) {
              candidates.push({
                ...candidate,
                scheduled_start_time: ic.scheduled_start_time,
                scheduled_end_time: ic.scheduled_end_time,
                sequence: ic.sequence,
              });
            }
          }
        }

        let confirmedSchedule: { date: string; startTime: string; endTime: string } | null = null;
        let myAcceptedAt: string | null = null;
        if (interview.status === 'CONFIRMED') {
          const schedule = await dataService.getConfirmedSchedule(interview.interview_id);
          if (schedule) {
            confirmedSchedule = {
              date: schedule.confirmed_date || '',
              startTime: schedule.confirmed_start_time || '',
              endTime: schedule.confirmed_end_time || '',
            };
          }
          const myMapping = interviewInterviewers.find(ii => ii.interviewer_id === interviewerId);
          if (myMapping && (myMapping as any).accepted_at) {
            myAcceptedAt = (myMapping as any).accepted_at;
          }
        }
        
        interviewerInterviews.push({
          ...interview,
          candidates,
          confirmedSchedule,
          myAcceptedAt,
        });
      }
    }

    // 날짜순 정렬 (최신순)
    interviewerInterviews.sort((a, b) => {
      const dateA = new Date(a.proposed_date || a.created_at).getTime();
      const dateB = new Date(b.proposed_date || b.created_at).getTime();
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: {
        interviews: interviewerInterviews,
        count: interviewerInterviews.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer interviews:', error);
    throw new AppError(500, '면접 일정 조회 실패');
  }
});

// 면접관의 특정 면접 상세 조회
interviewerPortalRouter.get('/interviews/:interviewId', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    const { interviewId } = req.params;
    
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    // 면접 조회
    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }

    // 면접관이 참여하는 면접인지 확인
    const interviewInterviewers = await dataService.getInterviewInterviewers(interviewId);
    const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
    
    if (!isParticipating) {
      throw new AppError(403, '이 면접에 대한 접근 권한이 없습니다');
    }

    // 면접자 정보 조회 (면접관이 담당하는 면접자만)
    const interviewCandidates = await dataService.getInterviewCandidates(interviewId);
    const candidates = [];
    
    for (const ic of interviewCandidates) {
      const candidate = await dataService.getCandidateById(ic.candidate_id);
      if (candidate) {
        // 면접관이 담당하는 면접자인지 확인
        const candidateInterviewers = await dataService.getCandidateInterviewers(interviewId, ic.candidate_id);
        const isAssigned = candidateInterviewers.some(ci => ci.interviewer_id === interviewerId);
        
        if (isAssigned) {
          candidates.push({
            ...candidate,
            scheduled_start_time: ic.scheduled_start_time,
            scheduled_end_time: ic.scheduled_end_time,
            sequence: ic.sequence,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        interview: {
          ...interview,
          candidates,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer interview detail:', error);
    throw new AppError(500, '면접 상세 조회 실패');
  }
});

// 확정된 일정 수락 (면접관 포털에서 토큰 없이 호출)
interviewerPortalRouter.post('/interviews/:interviewId/accept-schedule', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    const { interviewId } = req.params;
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    const interview = await dataService.getInterviewById(interviewId);
    if (!interview) {
      throw new AppError(404, '면접을 찾을 수 없습니다');
    }
    if (interview.status !== 'CONFIRMED') {
      throw new AppError(400, '일정이 확정된 면접만 수락할 수 있습니다');
    }

    const interviewInterviewers = await dataService.getInterviewInterviewers(interviewId);
    const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
    if (!isParticipating) {
      throw new AppError(403, '이 면접에 대한 접근 권한이 없습니다');
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

// 면접관의 면접 일정 캘린더 조회 (월별)
interviewerPortalRouter.get('/calendar', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    const { year, month } = req.query;
    
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    // 모든 면접 조회
    const allInterviews = await dataService.getAllInterviews();
    
    // 면접관이 참여하는 면접만 필터링
    const interviewerInterviews = [];
    
    for (const interview of allInterviews) {
      const interviewInterviewers = await dataService.getInterviewInterviewers(interview.interview_id);
      const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
      
      if (isParticipating) {
        // 날짜 필터링 (year, month가 제공된 경우)
        if (year && month) {
          const interviewDate = new Date(interview.proposed_date || interview.created_at);
          if (interviewDate.getFullYear() === parseInt(year as string) &&
              interviewDate.getMonth() + 1 === parseInt(month as string)) {
            interviewerInterviews.push(interview);
          }
        } else {
          interviewerInterviews.push(interview);
        }
      }
    }

    res.json({
      success: true,
      data: {
        interviews: interviewerInterviews,
        count: interviewerInterviews.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting interviewer calendar:', error);
    throw new AppError(500, '캘린더 조회 실패');
  }
});

// 면접관: 특정 면접/면접자에 대한 내 평가 조회
interviewerPortalRouter.get('/interviews/:interviewId/candidates/:candidateId/evaluation', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    const { interviewId, candidateId } = req.params;
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    const interviewInterviewers = await dataService.getInterviewInterviewers(interviewId);
    const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
    if (!isParticipating) {
      throw new AppError(403, '이 면접에 대한 접근 권한이 없습니다');
    }
    const candidateInterviewers = await dataService.getCandidateInterviewers(interviewId, candidateId);
    const isAssigned = candidateInterviewers.some(ci => ci.interviewer_id === interviewerId);
    if (!isAssigned) {
      throw new AppError(403, '이 면접자에 대한 평가 권한이 없습니다');
    }

    const evaluation = await dataService.getEvaluationByInterviewer(interviewId, candidateId, interviewerId);
    res.json({
      success: true,
      data: { evaluation: evaluation || null },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error getting evaluation:', error);
    throw new AppError(500, '평가 조회 실패');
  }
});

// 면접관: 특정 면접/면접자에 대한 평가 제출 (생성 또는 수정)
interviewerPortalRouter.post('/interviews/:interviewId/candidates/:candidateId/evaluation', interviewerAuth, async (req: Request, res: Response) => {
  try {
    const interviewerId = req.user?.interviewerId;
    const { interviewId, candidateId } = req.params;
    const body = req.body;
    if (!interviewerId) {
      throw new AppError(401, '면접관 ID가 없습니다');
    }

    const interviewInterviewers = await dataService.getInterviewInterviewers(interviewId);
    const isParticipating = interviewInterviewers.some(ii => ii.interviewer_id === interviewerId);
    if (!isParticipating) {
      throw new AppError(403, '이 면접에 대한 접근 권한이 없습니다');
    }
    const candidateInterviewers = await dataService.getCandidateInterviewers(interviewId, candidateId);
    const isAssigned = candidateInterviewers.some(ci => ci.interviewer_id === interviewerId);
    if (!isAssigned) {
      throw new AppError(403, '이 면접자에 대한 평가 권한이 없습니다');
    }

    const validRecommendations = ['PASS', 'FAIL', 'CONSIDER'];
    const recommendation = (body.recommendation || '').toUpperCase();
    if (!validRecommendations.includes(recommendation)) {
      throw new AppError(400, 'recommendation은 PASS, FAIL, CONSIDER 중 하나여야 합니다');
    }

    const existing = await dataService.getEvaluationByInterviewer(interviewId, candidateId, interviewerId);
    const scoreFields = ['technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score'];
    const payload = {
      interview_id: interviewId,
      candidate_id: candidateId,
      interviewer_id: interviewerId,
      technical_score: body.technical_score != null ? Number(body.technical_score) : null,
      communication_score: body.communication_score != null ? Number(body.communication_score) : null,
      fit_score: body.fit_score != null ? Number(body.fit_score) : null,
      teamwork_score: body.teamwork_score != null ? Number(body.teamwork_score) : null,
      overall_score: body.overall_score != null ? Number(body.overall_score) : null,
      recommendation,
      comments: body.comments || '',
      strengths: Array.isArray(body.strengths) ? body.strengths : (body.strengths ? [body.strengths] : []),
      weaknesses: Array.isArray(body.weaknesses) ? body.weaknesses : (body.weaknesses ? [body.weaknesses] : []),
      created_at: existing?.created_at || new Date().toISOString(),
    };

    if (existing) {
      await dataService.updateEvaluation(existing.evaluation_id, payload);
      res.json({
        success: true,
        data: { evaluation: { ...existing, ...payload, evaluation_id: existing.evaluation_id } },
        message: '평가가 수정되었습니다',
      });
    } else {
      await dataService.createEvaluation(payload);
      const created = await dataService.getEvaluationByInterviewer(interviewId, candidateId, interviewerId);
      res.status(201).json({
        success: true,
        data: { evaluation: created },
        message: '평가가 저장되었습니다',
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error saving evaluation:', error);
    throw new AppError(500, '평가 저장 실패');
  }
});
