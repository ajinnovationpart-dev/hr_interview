import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';

export const candidatesRouter = Router();

// 지원자 생성 스키마
const createCandidateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  position_applied: z.string().min(1, '지원 직무를 입력해주세요'),
  resume_url: z.string().optional(),
  status: z.enum(['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn']).optional(),
  notes: z.string().optional(),
});

// 지원자 수정 스키마
const updateCandidateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position_applied: z.string().min(1).optional(),
  resume_url: z.string().optional(),
  status: z.enum(['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn']).optional(),
  notes: z.string().optional(),
});

// 지원자 목록 조회
candidatesRouter.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const position = req.query.position as string;
    const search = req.query.search as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    
    let candidates = await dataService.getAllCandidates();
    
    // 필터링
    if (status) {
      candidates = candidates.filter(c => c.status === status);
    }
    if (position) {
      candidates = candidates.filter(c => c.position_applied?.includes(position));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      candidates = candidates.filter(c => 
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // 페이징
    const total = candidates.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = candidates.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      data: {
        candidates: paginatedCandidates,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting candidates:', error);
    throw new AppError(500, '지원자 목록 조회 실패');
  }
});

// 지원자 상세 조회
candidatesRouter.get('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const candidateId = req.params.id;
    const candidate = await dataService.getCandidateById(candidateId);
    
    if (!candidate) {
      throw new AppError(404, '지원자를 찾을 수 없습니다');
    }
    
    // 면접 이력 조회
    const allInterviews = await dataService.getAllInterviews();
    const candidateInterviews = [];
    
    for (const interview of allInterviews) {
      const interviewCandidates = await dataService.getInterviewCandidates(interview.interview_id);
      if (interviewCandidates.some(ic => ic.candidate_id === candidateId)) {
        const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
        const interviewerNames = mappings
          .map(m => interviewerMap.get(m.interviewer_id)?.name)
          .filter(Boolean);
        
        candidateInterviews.push({
          interviewId: interview.interview_id,
          interviewDate: interview.proposed_date || interview.confirmed_date,
          stage: '면접', // 기본값
          status: interview.status,
          interviewers: interviewerNames,
          result: interview.status === 'COMPLETED' ? '완료' : null,
        });
      }
    }
    
    // 타임라인 생성
    const timeline = [];
    if (candidate.created_at) {
      timeline.push({
        date: candidate.created_at,
        event: '지원',
        description: `${candidate.position_applied} 지원`,
      });
    }
    
    candidateInterviews.forEach(interview => {
      timeline.push({
        date: interview.interviewDate || interview.interviewId,
        event: '면접',
        description: `${interview.stage} 면접 - ${interview.status}`,
      });
    });
    
    timeline.sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data: {
        candidate,
        interviews: candidateInterviews,
        timeline,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting candidate:', error);
    throw new AppError(500, '지원자 조회 실패');
  }
});

// 지원자 등록
candidatesRouter.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const validated = createCandidateSchema.parse(req.body);
    const candidateId = `CAND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await dataService.createCandidate({
      candidate_id: candidateId,
      name: validated.name,
      email: validated.email || '',
      phone: validated.phone || '',
      position_applied: validated.position_applied,
      resume_url: validated.resume_url || '',
      status: validated.status || 'applied',
      notes: validated.notes || '',
      created_at: new Date().toISOString(),
    });
    
    logger.info(`Candidate created: ${candidateId}`);
    
    res.json({
      success: true,
      data: { candidate_id: candidateId },
      message: '지원자가 등록되었습니다',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating candidate:', error);
    throw new AppError(500, '지원자 등록 실패');
  }
});

// 지원자 수정
candidatesRouter.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const candidateId = req.params.id;
    const validated = updateCandidateSchema.parse(req.body);
    
    const candidate = await dataService.getCandidateById(candidateId);
    if (!candidate) {
      throw new AppError(404, '지원자를 찾을 수 없습니다');
    }
    
    await dataService.updateCandidate(candidateId, validated);
    
    logger.info(`Candidate updated: ${candidateId}`);
    
    res.json({
      success: true,
      message: '지원자 정보가 수정되었습니다',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating candidate:', error);
    throw new AppError(500, '지원자 수정 실패');
  }
});

// 지원자 상태 변경
candidatesRouter.put('/:id/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const candidateId = req.params.id;
    const { status, notes } = req.body;
    
    if (!status) {
      throw new AppError(400, '상태를 입력해주세요');
    }
    
    const validStatuses = ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, '올바른 상태를 입력해주세요');
    }
    
    const candidate = await dataService.getCandidateById(candidateId);
    if (!candidate) {
      throw new AppError(404, '지원자를 찾을 수 없습니다');
    }
    
    await dataService.updateCandidateStatus(candidateId, status);
    
    if (notes) {
      await dataService.updateCandidate(candidateId, { notes });
    }
    
    logger.info(`Candidate ${candidateId} status changed to ${status}`);
    
    res.json({
      success: true,
      message: '지원자 상태가 변경되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating candidate status:', error);
    throw new AppError(500, '지원자 상태 변경 실패');
  }
});
