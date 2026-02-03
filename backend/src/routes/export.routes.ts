import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

export const exportRouter = Router();

// 면접 일정 Excel 내보내기
exportRouter.get('/interviews', adminAuth, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = (req.query.format as string) || 'xlsx';
    const includeDetails = req.query.includeDetails === 'true';
    
    let interviews = await dataService.getAllInterviews();
    
    // 날짜 필터링
    if (startDate || endDate) {
      interviews = interviews.filter(i => {
        const interviewDate = i.proposed_date || i.confirmed_date;
        if (!interviewDate) return false;
        if (startDate && interviewDate < startDate) return false;
        if (endDate && interviewDate > endDate) return false;
        return true;
      });
    }
    
    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 면접 목록 시트
    const interviewData = [];
    interviewData.push([
      '면접 ID',
      '공고명',
      '팀명',
      '날짜',
      '시작 시간',
      '종료 시간',
      '상태',
      '면접자',
      '면접관',
      '면접실',
      '생성일',
    ]);
    
    for (const interview of interviews) {
      const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
      const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
      const allInterviewers = await dataService.getAllInterviewers();
      const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
      const interviewerNames = mappings
        .map(m => interviewerMap.get(m.interviewer_id)?.name)
        .filter(Boolean)
        .join(', ');
      
      const room = interview.room_id ? await dataService.getRoomById(interview.room_id) : null;
      
      interviewData.push([
        interview.interview_id,
        interview.main_notice,
        interview.team_name,
        interview.proposed_date || interview.confirmed_date,
        interview.proposed_start_time || interview.confirmed_start_time,
        interview.proposed_end_time || interview.confirmed_end_time,
        interview.status,
        candidates.map(c => c.name).join(', '),
        interviewerNames,
        room?.room_name || '',
        interview.created_at,
      ]);
    }
    
    const interviewSheet = XLSX.utils.aoa_to_sheet(interviewData);
    XLSX.utils.book_append_sheet(workbook, interviewSheet, '면접 목록');
    
    // 상세 정보 포함 시
    if (includeDetails) {
      // 면접관별 상세 시트
      const interviewerData = [];
      interviewerData.push([
        '면접 ID',
        '면접관 ID',
        '면접관 이름',
        '이메일',
        '부서',
        '역할',
        '응답 여부',
        '응답 시간',
      ]);
      
      for (const interview of interviews) {
        const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
        
        for (const mapping of mappings) {
          const interviewer = interviewerMap.get(mapping.interviewer_id);
          if (interviewer) {
            interviewerData.push([
              interview.interview_id,
              interviewer.interviewer_id,
              interviewer.name,
              interviewer.email,
              interviewer.department,
              (mapping as any).role || 'SECONDARY',
              mapping.responded_at ? '응답' : '미응답',
              mapping.responded_at || '',
            ]);
          }
        }
      }
      
      const interviewerSheet = XLSX.utils.aoa_to_sheet(interviewerData);
      XLSX.utils.book_append_sheet(workbook, interviewerSheet, '면접관별 상세');
    }
    
    // 파일 생성
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: format === 'csv' ? 'csv' : 'xlsx' });
    const filename = `면접일정_${startDate || '전체'}_${endDate || ''}_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error exporting interviews:', error);
    throw new AppError(500, 'Excel 내보내기 실패');
  }
});
