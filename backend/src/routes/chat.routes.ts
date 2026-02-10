/**
 * 챗봇 API - 관리자/면접관 자연어 질문에 대한 답변
 */
import { Router, Request, Response } from 'express';
import { adminOrInterviewerAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { getChatReply } from '../services/chatLLM.service';
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
      let interviewList = '=== 면접관 목록 === (로드 실패)';
      let roomList = '=== 회의실 목록 === (로드 실패)';
      let candidateSummary = '=== 지원자 현황 === (로드 실패)';
      let interviewSection = '=== 등록된 면접 목록 === (로드 실패)';

      try {
        const interviewers = await dataService.getAllInterviewers();
        interviewList = [
          '=== 면접관 목록 ===',
          ...(interviewers || []).map(
            (iv: any) =>
              `- 이름: ${iv.name || '-'}, 이메일: ${iv.email || '-'}, 부서: ${iv.department || '-'}, 직책: ${iv.position || '-'}, 연락처: ${iv.phone || '-'}${iv.is_team_lead ? ', 팀장' : ''}`
          ),
        ].join('\n');
      } catch (e) {
        logger.warn('Chat context: getAllInterviewers failed', e);
      }

      try {
        const rooms = await dataService.getAllRooms();
        roomList = [
          '=== 회의실 목록 ===',
          ...(rooms || []).map((r: any) => `- ${r.room_name || r.name || r.room_id || '-'} (ID: ${r.room_id})`),
        ].join('\n');
      } catch (e) {
        logger.warn('Chat context: getAllRooms failed', e);
      }

      try {
        const candidates = await dataService.getAllCandidates();
        const pos = (c: any) => c.position_applied || c.positionApplied || '-';
        candidateSummary =
          candidates?.length > 0
            ? `=== 지원자 현황 === 총 ${candidates.length}명. (일부: ${(candidates as any[]).slice(0, 20).map((c: any) => `${c.name}(${pos(c)})`).join(', ')}${candidates.length > 20 ? ' ...' : ''})`
            : '=== 지원자 현황 === 없음';
      } catch (e) {
        logger.warn('Chat context: getAllCandidates failed', e);
      }

      try {
        const interviews = await dataService.getAllInterviews();
        const recent = (interviews || [])
          .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 50);
        interviewSection = [
          '=== 등록된 면접 목록 (최근 50건) ===',
          ...recent.map((i: any) => {
            const date = i.proposed_date || i.confirmed_date || i.start_datetime || i.created_at;
            const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '-';
            return `- ID: ${i.interview_id}, 공고명: ${i.main_notice || '-'}, 팀: ${i.team_name || '-'}, 상태: ${i.status || '-'}, (제안/확정)일: ${dateStr}`;
          }),
        ].join('\n');
      } catch (e) {
        logger.warn('Chat context: getAllInterviews failed', e);
      }

      contextText = [interviewList, roomList, candidateSummary, interviewSection].join('\n\n');
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
                `    - ${c.name} (${c.position_applied || c.positionApplied || '-'}) 일정: ${c.scheduled_start || '-'}~${c.scheduled_end || '-'} | 메모: ${c.notes || '-'} | 이력서: ${c.resume_url ? '있음' : '없음'}`
            ),
          ];
          return lines.join('\n');
        }),
      ].join('\n\n');
    }

    const reply = await getChatReply(contextText, message);
    res.json({ success: true, data: { reply } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Chat error:', error);
    throw new AppError(500, '챗봇 응답 생성에 실패했습니다.');
  }
});
