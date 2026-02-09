/**
 * 챗봇 API - 관리자/면접관 자연어 질문에 대한 답변
 */
import { Router, Request, Response } from 'express';
import { adminOrInterviewerAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/gemini.service';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export const chatRouter = Router();

chatRouter.post('/', adminOrInterviewerAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body as { message?: string };
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      throw new AppError(400, '질문을 입력해 주세요.');
    }

    let contextText = '';

    if (user.role === 'ADMIN') {
      const interviews = await dataService.getAllInterviews();
      const recent = interviews
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 30);
      contextText = [
        '=== 등록된 면접 목록 (최근 30건) ===',
        ...recent.map((i) => {
          const date = i.proposed_date || i.confirmed_date || i.start_datetime || i.created_at;
          const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '-';
          return `- ID: ${i.interview_id}, 공고명: ${i.main_notice || '-'}, 팀: ${i.team_name || '-'}, 상태: ${i.status || '-'}, (제안/확정)일: ${dateStr}`;
        }),
      ].join('\n');
    } else {
      const interviewerId = user.interviewerId!;
      const allInterviews = await dataService.getAllInterviews();
      const myInterviews: any[] = [];

      for (const interview of allInterviews) {
        const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        if (!mappings.some((m) => m.interviewer_id === interviewerId)) continue;

        const candidates = await dataService.getInterviewCandidates(interview.interview_id);
        const candidateDetails: any[] = [];

        for (const ic of candidates) {
          const candidate = await dataService.getCandidateById(ic.candidate_id);
          if (!candidate) continue;
          const assignees = await dataService.getCandidateInterviewers(interview.interview_id, ic.candidate_id);
          if (!assignees.some((a) => a.interviewer_id === interviewerId)) continue;
          candidateDetails.push({
            name: candidate.name,
            position_applied: candidate.position_applied,
            notes: candidate.notes || '',
            resume_url: candidate.resume_url || '',
            scheduled_start: ic.scheduled_start_time,
            scheduled_end: ic.scheduled_end_time,
          });
        }

        myInterviews.push({
          interview_id: interview.interview_id,
          main_notice: interview.main_notice,
          team_name: interview.team_name,
          status: interview.status,
          proposed_date: interview.proposed_date,
          confirmed_date: interview.confirmed_date,
          start_datetime: interview.start_datetime,
          end_datetime: interview.end_datetime,
          candidates: candidateDetails,
        });
      }

      contextText = [
        '=== 내가 참여하는 면접 목록 및 일정 ===',
        ...myInterviews.map((i) => {
          const lines = [
            `[면접] ${i.main_notice || '-'} (팀: ${i.team_name || '-'}, 상태: ${i.status})`,
            `  일시: ${i.proposed_date || i.confirmed_date || '-'} ${i.start_datetime || ''} ~ ${i.end_datetime || ''}`,
            '  담당 지원자:',
            ...i.candidates.map(
              (c: any) =>
                `    - ${c.name} (${c.position_applied}) 일정: ${c.scheduled_start || '-'}~${c.scheduled_end || '-'} | 메모: ${c.notes || '-'} | 이력서: ${c.resume_url ? '있음' : '없음'}`
            ),
          ];
          return lines.join('\n');
        }),
      ].join('\n\n');
    }

    const reply = await geminiService.chat(contextText, message);
    res.json({ success: true, data: { reply } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Chat error:', error);
    throw new AppError(500, '챗봇 응답 생성에 실패했습니다.');
  }
});
