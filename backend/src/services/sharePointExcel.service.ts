import dotenv from 'dotenv';
import { Client } from '@microsoft/microsoft-graph-client';
import { logger } from '../utils/logger';

// 환경 변수 로드
dotenv.config();

// ========== Interfaces (Google Sheets와 동일한 인터페이스 유지) ==========

export interface InterviewRow {
  interview_id: string;
  main_notice: string;
  team_name: string;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  status: 'PENDING' | 'PARTIAL' | 'CONFIRMED' | 'NO_COMMON' | 'CANCELLED';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateRow {
  candidate_id: string;
  name: string;
  email: string;
  phone: string;
  position_applied: string;
  created_at: string;
}

export interface InterviewCandidateRow {
  interview_id: string;
  candidate_id: string;
  sequence: number;
  scheduled_start_time: string;
  scheduled_end_time: string;
  created_at: string;
}

export interface CandidateInterviewerRow {
  interview_id: string;
  candidate_id: string;
  interviewer_id: string;
  role: 'PRIMARY' | 'SECONDARY';
  created_at: string;
}

export interface InterviewerRow {
  interviewer_id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  is_team_lead: boolean;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface InterviewInterviewerRow {
  interview_id: string;
  interviewer_id: string;
  responded_at: string | null;
  reminder_sent_count: number;
  last_reminder_sent_at: string | null;
}

export interface TimeSelectionRow {
  selection_id: string;
  interview_id: string;
  interviewer_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface ConfirmedScheduleRow {
  interview_id: string;
  candidate_id: string;
  confirmed_date: string;
  confirmed_start_time: string;
  confirmed_end_time: string;
  confirmed_at: string;
}

// ========== Service ==========

export class SharePointExcelService {
  private graphClient: Client;
  private siteId: string;
  private driveId: string;
  private fileId: string;

  constructor() {
    const accessToken = process.env.SHAREPOINT_ACCESS_TOKEN;
    this.siteId = process.env.SHAREPOINT_SITE_ID || '';
    this.driveId = process.env.SHAREPOINT_DRIVE_ID || '';
    this.fileId = process.env.SHAREPOINT_FILE_ID || '';

    if (!accessToken) {
      throw new Error('SHAREPOINT_ACCESS_TOKEN environment variable is required');
    }
    if (!this.siteId || !this.driveId || !this.fileId) {
      throw new Error('SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID, SHAREPOINT_FILE_ID are required');
    }

    // Microsoft Graph API 클라이언트 초기화
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  /**
   * Excel 워크시트 읽기
   */
  private async readWorksheet(sheetName: string): Promise<any[][]> {
    try {
      // Microsoft Graph API로 Excel 워크시트 읽기
      const response = await this.graphClient
        .api(`/sites/${this.siteId}/drives/${this.driveId}/items/${this.fileId}/workbook/worksheets('${sheetName}')/usedRange`)
        .get();

      // Excel 데이터를 2D 배열로 변환
      const values = response.values || [];
      return values;
    } catch (error: any) {
      logger.error(`Error reading worksheet ${sheetName}:`, error);
      throw new Error(`Failed to read worksheet ${sheetName}: ${error.message}`);
    }
  }

  /**
   * Excel 워크시트에 행 추가
   */
  private async appendRow(sheetName: string, row: any[]): Promise<void> {
    try {
      // 현재 워크시트의 마지막 행 찾기
      const existingData = await this.readWorksheet(sheetName);
      const nextRow = existingData.length + 1;
      
      // Excel에 행 추가
      const colLetter = String.fromCharCode(65 + row.length - 1); // 마지막 컬럼
      await this.graphClient
        .api(`/sites/${this.siteId}/drives/${this.driveId}/items/${this.fileId}/workbook/worksheets('${sheetName}')/range(address='A${nextRow}:${colLetter}${nextRow}')`)
        .patch({
          values: [row]
        });
    } catch (error: any) {
      logger.error(`Error appending row to ${sheetName}:`, error);
      throw new Error(`Failed to append row: ${error.message}`);
    }
  }

  /**
   * Excel 워크시트 셀 업데이트
   */
  private async updateCell(sheetName: string, row: number, col: number, value: any): Promise<void> {
    try {
      const colLetter = String.fromCharCode(65 + col); // A, B, C...
      await this.graphClient
        .api(`/sites/${this.siteId}/drives/${this.driveId}/items/${this.fileId}/workbook/worksheets('${sheetName}')/range(address='${colLetter}${row}')`)
        .patch({
          values: [[value]]
        });
    } catch (error: any) {
      logger.error(`Error updating cell in ${sheetName}:`, error);
      throw new Error(`Failed to update cell: ${error.message}`);
    }
  }

  // ========== Interviews ==========

  async getAllInterviews(): Promise<InterviewRow[]> {
    const rows = await this.readWorksheet('interviews');
    if (rows.length <= 1) return [];
    
    return rows.slice(1).map(row => ({
      interview_id: row[0] || '',
      main_notice: row[1] || '',
      team_name: row[2] || '',
      proposed_date: row[3] || '',
      proposed_start_time: row[4] || '',
      proposed_end_time: row[5] || '',
      status: (row[6] || 'PENDING') as InterviewRow['status'],
      created_by: row[7] || '',
      created_at: row[8] || '',
      updated_at: row[9] || '',
    }));
  }

  async getInterviewById(interviewId: string): Promise<InterviewRow | null> {
    const interviews = await this.getAllInterviews();
    return interviews.find(i => i.interview_id === interviewId) || null;
  }

  async createInterview(interview: Omit<InterviewRow, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.appendRow('interviews', [
      interview.interview_id,
      interview.main_notice,
      interview.team_name,
      interview.proposed_date,
      interview.proposed_start_time,
      interview.proposed_end_time,
      interview.status,
      interview.created_by,
      now,
      now,
    ]);
  }

  async updateInterviewStatus(interviewId: string, status: InterviewRow['status']): Promise<void> {
    const rows = await this.readWorksheet('interviews');
    const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId);
    if (rowIndex === -1) throw new Error('Interview not found');
    
    await this.updateCell('interviews', rowIndex + 1, 6, status); // status column
    await this.updateCell('interviews', rowIndex + 1, 9, new Date().toISOString()); // updated_at
  }

  // ========== Candidates ==========

  async getAllCandidates(): Promise<CandidateRow[]> {
    const rows = await this.readWorksheet('candidates');
    if (rows.length <= 1) return [];
    
    return rows.slice(1).filter(row => row[0]).map(row => ({
      candidate_id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      phone: row[3] || '',
      position_applied: row[4] || '',
      created_at: row[5] || '',
    }));
  }

  async getCandidatesByInterview(interviewId: string): Promise<CandidateRow[]> {
    const mappingRows = await this.readWorksheet('interview_candidates');
    const candidateIds = mappingRows
      .filter((row, idx) => idx > 0 && row[0] === interviewId)
      .map(row => row[1]);
    
    const candidates = await this.getAllCandidates();
    return candidates.filter(c => candidateIds.includes(c.candidate_id));
  }

  async createCandidate(candidate: Omit<CandidateRow, 'created_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.appendRow('candidates', [
      candidate.candidate_id,
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.position_applied,
      now,
    ]);
  }

  // ========== Interview-Candidate Mapping ==========

  async createInterviewCandidate(mapping: Omit<InterviewCandidateRow, 'created_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.appendRow('interview_candidates', [
      mapping.interview_id,
      mapping.candidate_id,
      mapping.sequence,
      mapping.scheduled_start_time,
      mapping.scheduled_end_time,
      now,
    ]);
  }

  async getInterviewCandidates(interviewId: string): Promise<InterviewCandidateRow[]> {
    const rows = await this.readWorksheet('interview_candidates');
    return rows
      .filter((row, idx) => idx > 0 && row[0] === interviewId)
      .map(row => ({
        interview_id: row[0] || '',
        candidate_id: row[1] || '',
        sequence: parseInt(row[2] || '0'),
        scheduled_start_time: row[3] || '',
        scheduled_end_time: row[4] || '',
        created_at: row[5] || '',
      }));
  }

  // ========== Candidate-Interviewer Mapping (N:N) ==========

  async createCandidateInterviewer(mapping: Omit<CandidateInterviewerRow, 'created_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.appendRow('candidate_interviewers', [
      mapping.interview_id,
      mapping.candidate_id,
      mapping.interviewer_id,
      mapping.role,
      now,
    ]);
  }

  async getCandidateInterviewers(interviewId: string, candidateId: string): Promise<CandidateInterviewerRow[]> {
    const rows = await this.readWorksheet('candidate_interviewers');
    return rows
      .filter((row, idx) => idx > 0 && row[0] === interviewId && row[1] === candidateId)
      .map(row => ({
        interview_id: row[0] || '',
        candidate_id: row[1] || '',
        interviewer_id: row[2] || '',
        role: (row[3] || 'SECONDARY') as 'PRIMARY' | 'SECONDARY',
        created_at: row[4] || '',
      }));
  }

  // ========== Interviewers ==========

  async getAllInterviewers(): Promise<InterviewerRow[]> {
    const rows = await this.readWorksheet('interviewers');
    if (rows.length <= 1) return [];
    
    return rows.slice(1).filter(row => row[0]).map(row => ({
      interviewer_id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      department: row[3] || '',
      position: row[4] || '',
      is_team_lead: row[5] === 'TRUE' || row[5] === true,
      phone: row[6] || '',
      is_active: row[7] === 'TRUE' || row[7] === true,
      created_at: row[8] || '',
    }));
  }

  async getInterviewerById(interviewerId: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    return interviewers.find(iv => iv.interviewer_id === interviewerId) || null;
  }

  async getInterviewerByEmail(email: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    return interviewers.find(iv => iv.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createOrUpdateInterviewers(interviewers: Omit<InterviewerRow, 'created_at'>[]): Promise<{ created: number; updated: number }> {
    const existingRows = await this.readWorksheet('interviewers');
    const existingEmails = new Set(existingRows.slice(1).map(row => (row[2] || '').toLowerCase()).filter(Boolean));
    
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();
    
    for (const interviewer of interviewers) {
      const emailLower = (interviewer.email || '').toLowerCase();
      if (existingEmails.has(emailLower)) {
        // Update (구현 필요)
        updated++;
      } else {
        // Create
        await this.appendRow('interviewers', [
          interviewer.interviewer_id,
          interviewer.name,
          interviewer.email,
          interviewer.department,
          interviewer.position,
          interviewer.is_team_lead ? 'TRUE' : 'FALSE',
          interviewer.phone,
          interviewer.is_active !== false ? 'TRUE' : 'FALSE',
          now,
        ]);
        created++;
      }
    }
    
    return { created, updated };
  }

  // ========== Interview-Interviewer Mapping ==========

  async getInterviewInterviewers(interviewId: string): Promise<InterviewInterviewerRow[]> {
    const rows = await this.readWorksheet('interview_interviewers');
    return rows
      .filter((row, idx) => idx > 0 && row[0] === interviewId)
      .map(row => ({
        interview_id: row[0] || '',
        interviewer_id: row[1] || '',
        responded_at: row[2] || null,
        reminder_sent_count: parseInt(row[3] || '0'),
        last_reminder_sent_at: row[4] || null,
      }));
  }

  async createInterviewInterviewers(mappings: Omit<InterviewInterviewerRow, 'responded_at' | 'reminder_sent_count' | 'last_reminder_sent_at'>[]): Promise<void> {
    for (const mapping of mappings) {
      await this.appendRow('interview_interviewers', [
        mapping.interview_id,
        mapping.interviewer_id,
        '', // responded_at
        0,  // reminder_sent_count
        '', // last_reminder_sent_at
      ]);
    }
  }

  async updateRespondedAt(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    if (rowIndex === -1) throw new Error('Mapping not found');
    
    await this.updateCell('interview_interviewers', rowIndex + 1, 2, new Date().toISOString());
  }

  async updateReminderSent(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    if (rowIndex === -1) throw new Error('Mapping not found');
    
    const currentCount = parseInt(rows[rowIndex][3] || '0');
    await this.updateCell('interview_interviewers', rowIndex + 1, 3, currentCount + 1); // reminder_sent_count++
    await this.updateCell('interview_interviewers', rowIndex + 1, 4, new Date().toISOString()); // last_reminder_sent_at
  }

  // ========== Time Selections ==========

  async getTimeSelectionsByInterview(interviewId: string): Promise<TimeSelectionRow[]> {
    const rows = await this.readWorksheet('time_selections');
    return rows
      .filter((row, idx) => idx > 0 && row[1] === interviewId)
      .map(row => ({
        selection_id: row[0] || '',
        interview_id: row[1] || '',
        interviewer_id: row[2] || '',
        slot_date: row[3] || '',
        start_time: row[4] || '',
        end_time: row[5] || '',
        created_at: row[6] || '',
      }));
  }

  async createTimeSelections(selections: Omit<TimeSelectionRow, 'created_at'>[]): Promise<void> {
    const now = new Date().toISOString();
    for (const selection of selections) {
      await this.appendRow('time_selections', [
        selection.selection_id,
        selection.interview_id,
        selection.interviewer_id,
        selection.slot_date,
        selection.start_time,
        selection.end_time,
        now,
      ]);
    }
  }

  // ========== Confirmed Schedules ==========

  async getConfirmedSchedule(interviewId: string): Promise<ConfirmedScheduleRow | null> {
    const rows = await this.readWorksheet('confirmed_schedules');
    const schedule = rows.find((row, idx) => idx > 0 && row[0] === interviewId);
    if (!schedule) return null;
    
    return {
      interview_id: schedule[0] || '',
      candidate_id: schedule[1] || '',
      confirmed_date: schedule[2] || '',
      confirmed_start_time: schedule[3] || '',
      confirmed_end_time: schedule[4] || '',
      confirmed_at: schedule[5] || '',
    };
  }

  async getConfirmedSchedulesByCandidate(interviewId: string, candidateId: string): Promise<ConfirmedScheduleRow | null> {
    const rows = await this.readWorksheet('confirmed_schedules');
    const schedule = rows.find((row, idx) => idx > 0 && row[0] === interviewId && row[1] === candidateId);
    if (!schedule) return null;
    
    return {
      interview_id: schedule[0] || '',
      candidate_id: schedule[1] || '',
      confirmed_date: schedule[2] || '',
      confirmed_start_time: schedule[3] || '',
      confirmed_end_time: schedule[4] || '',
      confirmed_at: schedule[5] || '',
    };
  }

  async createConfirmedSchedule(schedule: Omit<ConfirmedScheduleRow, 'confirmed_at'>): Promise<void> {
    await this.appendRow('confirmed_schedules', [
      schedule.interview_id,
      schedule.candidate_id,
      schedule.confirmed_date,
      schedule.confirmed_start_time,
      schedule.confirmed_end_time,
      new Date().toISOString(),
    ]);
  }

  // ========== Config ==========

  async getConfig(): Promise<Record<string, string>> {
    const rows = await this.readWorksheet('config');
    const config: Record<string, string> = {};
    
    rows.slice(1).forEach(row => {
      if (row[0]) {
        config[row[0]] = row[1] || '';
      }
    });
    
    return config;
  }

  async updateConfig(config: Record<string, string>): Promise<{ updated: number; created: number }> {
    const rows = await this.readWorksheet('config');
    let updated = 0;
    let created = 0;
    const now = new Date().toISOString();
    
    for (const [key, value] of Object.entries(config)) {
      const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === key);
      
      if (rowIndex !== -1) {
        await this.updateCell('config', rowIndex + 1, 1, value);
        await this.updateCell('config', rowIndex + 1, 3, now);
        updated++;
      } else {
        await this.appendRow('config', [key, value, '', now]);
        created++;
      }
    }
    
    return { updated, created };
  }
}

// 환경 변수로 서비스 인스턴스 생성 (에러는 나중에 처리)
let sharePointExcelServiceInstance: SharePointExcelService | null = null;

try {
  // REST API를 사용하지 않을 때만 Graph API 서비스 초기화
  if (process.env.SHAREPOINT_ENABLED === 'true' && process.env.SHAREPOINT_USE_REST_API !== 'true') {
    sharePointExcelServiceInstance = new SharePointExcelService();
  }
} catch (error) {
  logger.warn('SharePoint Excel service not initialized:', error);
}

export const sharePointExcelService = sharePointExcelServiceInstance;
