import dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';
import {
  InterviewRow, CandidateRow, InterviewCandidateRow, CandidateInterviewerRow,
  InterviewerRow, InterviewInterviewerRow, TimeSelectionRow, ConfirmedScheduleRow, ConfigRow
} from './dataService';

// 환경 변수 로드
dotenv.config();

/**
 * OneDrive 동기화된 로컬 Excel 파일을 사용하는 서비스
 * SharePoint REST API 대신 로컬 파일 시스템 사용
 * OneDrive가 자동으로 SharePoint에 동기화
 */
export class OneDriveLocalService {
  private filePath: string;
  private workbook: XLSX.WorkBook | null = null;
  private lockFilePath: string;

  constructor() {
    this.filePath = process.env.ONEDRIVE_EXCEL_PATH || '';
    
    if (!this.filePath) {
      throw new Error('ONEDRIVE_EXCEL_PATH environment variable is required');
    }

    // 파일 경로 정규화
    this.filePath = path.resolve(this.filePath);
    
    // 잠금 파일 경로 (같은 디렉토리에 .lock 파일)
    this.lockFilePath = this.filePath + '.lock';

    logger.info(`OneDrive Local Service initialized with path: ${this.filePath}`);
  }

  /**
   * 파일 잠금 획득 (간단한 파일 기반 잠금)
   */
  private async acquireLock(): Promise<void> {
    const maxRetries = 30; // 재시도 횟수 증가 (10 -> 30)
    const retryDelay = 200; // 대기 시간 증가 (100ms -> 200ms)

    for (let i = 0; i < maxRetries; i++) {
      try {
        // 잠금 파일 생성 시도
        await fs.writeFile(this.lockFilePath, process.pid.toString(), { flag: 'wx' });
        logger.debug('File lock acquired');
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // 잠금 파일이 이미 존재하면 잠시 대기 후 재시도
          if (i < maxRetries - 1) {
            logger.debug(`File lock busy, retrying... (${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        throw error;
      }
    }

    // 마지막 시도에서도 실패하면 잠금 파일이 오래된 것인지 확인
    try {
      const lockContent = await fs.readFile(this.lockFilePath, 'utf-8');
      const lockPid = parseInt(lockContent.trim());
      
      // 프로세스가 살아있는지 확인 (Windows)
      try {
        // Windows에서 프로세스 확인은 복잡하므로, 일단 잠금 파일을 삭제하고 재시도
        logger.warn(`Removing stale lock file (PID: ${lockPid})`);
        await fs.unlink(this.lockFilePath);
        
        // 한 번 더 시도
        await fs.writeFile(this.lockFilePath, process.pid.toString(), { flag: 'wx' });
        logger.debug('File lock acquired after removing stale lock');
        return;
      } catch {
        // 프로세스가 살아있을 수 있으므로 에러 발생
      }
    } catch {
      // 잠금 파일 읽기 실패
    }

    throw new Error('Failed to acquire file lock after maximum retries. The file may be locked by Excel or OneDrive sync.');
  }

  /**
   * 파일 잠금 해제
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFilePath);
      logger.debug('File lock released');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to release file lock:', error);
      }
    }
  }

  /**
   * Excel 파일 로드 (로컬 파일 시스템에서)
   */
  private async loadWorkbook(): Promise<XLSX.WorkBook> {
    if (this.workbook) {
      return this.workbook;
    }

    try {
      await this.acquireLock();
      
      try {
        // 파일이 존재하는지 확인
        await fs.access(this.filePath);
        
        // Excel 파일 읽기
        const fileBuffer = await fs.readFile(this.filePath);
        this.workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        logger.info('Excel file loaded successfully from local path');
      } finally {
        await this.releaseLock();
      }

      return this.workbook;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 파일이 없으면 새 워크북 생성
        logger.warn('Excel file not found, creating new workbook');
        this.workbook = XLSX.utils.book_new();
        return this.workbook;
      }
      logger.error('Error loading Excel file:', error);
      throw new Error(`Failed to load Excel file: ${error.message}`);
    }
  }

  /**
   * Excel 파일 저장 (로컬 파일 시스템에)
   * @param skipLock 이미 잠금을 획득한 경우 true
   */
  private async saveWorkbook(skipLock: boolean = false): Promise<void> {
    if (!this.workbook) {
      throw new Error('No workbook to save');
    }

    let lockAcquired = false;

    if (!skipLock) {
      // 잠금 획득 (기존 잠금 파일이 있으면 제거 후 재시도)
      let retries = 0;
      const maxRetries = 5;

      while (!lockAcquired && retries < maxRetries) {
        try {
          await this.acquireLock();
          lockAcquired = true;
        } catch (error: any) {
          if (error.message.includes('Failed to acquire file lock') || error.code === 'EEXIST') {
            // 잠금 파일이 오래된 경우 제거 시도
            try {
              logger.warn(`Lock file exists, attempting to remove stale lock... (retry ${retries + 1}/${maxRetries})`);
              await fs.unlink(this.lockFilePath);
              retries++;
              await new Promise(resolve => setTimeout(resolve, 300)); // 300ms 대기
              continue;
            } catch (unlinkError: any) {
              if (unlinkError.code === 'ENOENT') {
                // 잠금 파일이 이미 없음, 다시 시도
                retries++;
                await new Promise(resolve => setTimeout(resolve, 300));
                continue;
              }
              throw new Error(`Failed to acquire file lock: ${error.message}`);
            }
          } else {
            throw error;
          }
        }
      }

      if (!lockAcquired) {
        throw new Error('Failed to acquire file lock after multiple attempts. Please close Excel if it is open.');
      }
    }

    try {
      // Excel 파일을 버퍼로 변환
      const buffer = XLSX.write(this.workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // 디렉토리가 없으면 생성
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 파일 저장
      await fs.writeFile(this.filePath, buffer);
      logger.info('Excel file saved successfully to local path');
      
      // 워크북 캐시 초기화 (다음 로드 시 최신 데이터 가져오기)
      this.workbook = null;
    } catch (error: any) {
      logger.error('Error saving Excel file:', error);
      throw new Error(`Failed to save Excel file: ${error.message}`);
    } finally {
      if (lockAcquired) {
        await this.releaseLock();
      }
    }
  }

  /**
   * 워크시트 읽기
   */
  private async readWorksheet(sheetName: string): Promise<any[][]> {
    const workbook = await this.loadWorkbook();
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      logger.warn(`Worksheet ${sheetName} not found, returning empty array`);
      return [];
    }

    // Excel 데이터를 2D 배열로 변환
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    return rows;
  }

  /**
   * 워크시트에 행 추가
   */
  private async appendRow(sheetName: string, row: any[]): Promise<void> {
    const workbook = await this.loadWorkbook();
    
    // 워크시트가 없으면 생성
    if (!workbook.Sheets[sheetName]) {
      workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([]);
      if (!workbook.SheetNames.includes(sheetName)) {
        workbook.SheetNames.push(sheetName);
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    rows.push(row);
    
    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
  }

  /**
   * 워크시트의 특정 셀 업데이트
   */
  private async updateCell(sheetName: string, row: number, col: number, value: any): Promise<void> {
    const workbook = await this.loadWorkbook();
    
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Worksheet ${sheetName} not found`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    // 행이 없으면 추가
    while (rows.length <= row - 1) {
      rows.push([]);
    }
    
    // 열이 없으면 추가
    while (rows[row - 1].length <= col - 1) {
      rows[row - 1].push('');
    }
    
    rows[row - 1][col - 1] = value;
    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
  }

  // ========== Public Methods (dataService 인터페이스 구현) ==========

  async getAllInterviews(): Promise<InterviewRow[]> {
    const rows = await this.readWorksheet('interviews');
    if (rows.length < 2) return [];
    
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

  async getInterviewById(id: string): Promise<InterviewRow | null> {
    const interviews = await this.getAllInterviews();
    return interviews.find(i => i.interview_id === id) || null;
  }

  async createInterview(interview: InterviewRow): Promise<void> {
    await this.appendRow('interviews', [
      interview.interview_id,
      interview.main_notice,
      interview.team_name,
      interview.proposed_date,
      interview.proposed_start_time,
      interview.proposed_end_time,
      interview.status,
      interview.created_by,
      interview.created_at,
      interview.updated_at,
    ]);
  }

  async updateInterviewStatus(interviewId: string, status: string): Promise<void> {
    const rows = await this.readWorksheet('interviews');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId);
    
    if (index === -1) {
      throw new Error(`Interview ${interviewId} not found`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      rows[index][6] = status; // status
      rows[index][9] = new Date().toISOString(); // updated_at
      workbook.Sheets['interviews'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
    } finally {
      await this.releaseLock();
    }
  }

  async getAllCandidates(): Promise<CandidateRow[]> {
    const rows = await this.readWorksheet('candidates');
    if (rows.length < 2) return [];
    
    return rows.slice(1).map(row => ({
      candidate_id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      phone: row[3] || '',
      position_applied: row[4] || '',
      created_at: row[5] || '',
    }));
  }

  async getCandidatesByInterview(interviewId: string): Promise<CandidateRow[]> {
    const interviewCandidates = await this.getInterviewCandidates(interviewId);
    const allCandidates = await this.getAllCandidates();
    const candidateIds = new Set(interviewCandidates.map(ic => ic.candidate_id));
    return allCandidates.filter(c => candidateIds.has(c.candidate_id));
  }

  async createCandidate(candidate: CandidateRow): Promise<void> {
    await this.appendRow('candidates', [
      candidate.candidate_id,
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.position_applied,
      candidate.created_at,
    ]);
  }

  async getInterviewCandidates(interviewId: string): Promise<InterviewCandidateRow[]> {
    const rows = await this.readWorksheet('interview_candidates');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row[0] === interviewId)
      .map(row => ({
        interview_id: row[0] || '',
        candidate_id: row[1] || '',
        sequence: Number(row[2]) || 0,
        scheduled_start_time: row[3] || '',
        scheduled_end_time: row[4] || '',
        created_at: row[5] || '',
      }));
  }

  async createInterviewCandidate(mapping: Omit<InterviewCandidateRow, 'created_at'>): Promise<void> {
    await this.appendRow('interview_candidates', [
      mapping.interview_id,
      mapping.candidate_id,
      mapping.sequence,
      mapping.scheduled_start_time,
      mapping.scheduled_end_time,
      new Date().toISOString(),
    ]);
  }

  async getCandidateInterviewers(interviewId: string, candidateId: string): Promise<CandidateInterviewerRow[]> {
    const rows = await this.readWorksheet('candidate_interviewers');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row[0] === interviewId && row[1] === candidateId)
      .map(row => ({
        interview_id: row[0] || '',
        candidate_id: row[1] || '',
        interviewer_id: row[2] || '',
        role: (row[3] || 'SECONDARY') as 'PRIMARY' | 'SECONDARY',
        created_at: row[4] || '',
      }));
  }

  async createCandidateInterviewer(mapping: Omit<CandidateInterviewerRow, 'created_at'>): Promise<void> {
    await this.appendRow('candidate_interviewers', [
      mapping.interview_id,
      mapping.candidate_id,
      mapping.interviewer_id,
      mapping.role,
      new Date().toISOString(),
    ]);
  }

  async getAllInterviewers(): Promise<InterviewerRow[]> {
    const rows = await this.readWorksheet('interviewers');
    if (rows.length < 2) return [];
    
    return rows.slice(1).map(row => ({
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
    return interviewers.find(i => i.interviewer_id === interviewerId) || null;
  }

  async getInterviewerByEmail(email: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    return interviewers.find(i => i.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createOrUpdateInterviewers(interviewers: Omit<InterviewerRow, 'created_at'>[]): Promise<{ created: number; updated: number }> {
    const rows = await this.readWorksheet('interviewers');
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      for (const interviewer of interviewers) {
        const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewer.interviewer_id);
        
        if (index !== -1) {
          // 업데이트
          rows[index][1] = interviewer.name;
          rows[index][2] = interviewer.email;
          rows[index][3] = interviewer.department;
          rows[index][4] = interviewer.position;
          rows[index][5] = interviewer.is_team_lead ? 'TRUE' : 'FALSE';
          rows[index][6] = interviewer.phone;
          rows[index][7] = interviewer.is_active ? 'TRUE' : 'FALSE';
          updated++;
        } else {
          // 생성
          rows.push([
            interviewer.interviewer_id,
            interviewer.name,
            interviewer.email,
            interviewer.department,
            interviewer.position,
            interviewer.is_team_lead ? 'TRUE' : 'FALSE',
            interviewer.phone,
            interviewer.is_active ? 'TRUE' : 'FALSE',
            now,
          ]);
          created++;
        }
      }

      workbook.Sheets['interviewers'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
    } finally {
      await this.releaseLock();
    }

    return { created, updated };
  }

  async getInterviewInterviewers(interviewId: string): Promise<InterviewInterviewerRow[]> {
    const rows = await this.readWorksheet('interview_interviewers');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row[0] === interviewId)
      .map(row => ({
        interview_id: row[0] || '',
        interviewer_id: row[1] || '',
        responded_at: row[2] || null,
        reminder_sent_count: Number(row[3]) || 0,
        last_reminder_sent_at: row[4] || null,
      }));
  }

  async createInterviewInterviewers(mappings: Omit<InterviewInterviewerRow, 'responded_at' | 'reminder_sent_count' | 'last_reminder_sent_at'>[]): Promise<void> {
    for (const mapping of mappings) {
      await this.appendRow('interview_interviewers', [
        mapping.interview_id,
        mapping.interviewer_id,
        '',
        0,
        '',
      ]);
    }
  }

  async updateRespondedAt(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    
    if (index === -1) {
      throw new Error(`Mapping not found for interview ${interviewId} and interviewer ${interviewerId}`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      const now = new Date().toISOString();
      rows[index][2] = now; // responded_at
      workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
    } finally {
      await this.releaseLock();
    }
  }

  async updateReminderSent(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    
    if (index === -1) {
      throw new Error(`Mapping not found for interview ${interviewId} and interviewer ${interviewerId}`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      const now = new Date().toISOString();
      rows[index][3] = (Number(rows[index][3]) || 0) + 1; // reminder_sent_count
      rows[index][4] = now; // last_reminder_sent_at
      workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
    } finally {
      await this.releaseLock();
    }
  }

  async getTimeSelectionsByInterview(interviewId: string): Promise<TimeSelectionRow[]> {
    const rows = await this.readWorksheet('time_selections');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row[1] === interviewId)
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

  async createTimeSelections(selections: TimeSelectionRow[]): Promise<void> {
    for (const selection of selections) {
      await this.appendRow('time_selections', [
        selection.selection_id,
        selection.interview_id,
        selection.interviewer_id,
        selection.slot_date,
        selection.start_time,
        selection.end_time,
        selection.created_at,
      ]);
    }
  }

  async getConfirmedSchedule(interviewId: string): Promise<ConfirmedScheduleRow | null> {
    const schedules = await this.getConfirmedSchedules(interviewId);
    return schedules.length > 0 ? schedules[0] : null;
  }

  async getConfirmedSchedulesByCandidate(interviewId: string, candidateId: string): Promise<ConfirmedScheduleRow | null> {
    const schedules = await this.getConfirmedSchedules(interviewId);
    return schedules.find(s => s.candidate_id === candidateId) || null;
  }

  async createConfirmedSchedule(schedule: ConfirmedScheduleRow): Promise<void> {
    await this.appendRow('confirmed_schedules', [
      schedule.interview_id,
      schedule.candidate_id,
      schedule.confirmed_date,
      schedule.confirmed_start_time,
      schedule.confirmed_end_time,
      schedule.confirmed_at,
    ]);
  }

  private async getConfirmedSchedules(interviewId: string): Promise<ConfirmedScheduleRow[]> {
    const rows = await this.readWorksheet('confirmed_schedules');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row[0] === interviewId)
      .map(row => ({
        interview_id: row[0] || '',
        candidate_id: row[1] || '',
        confirmed_date: row[2] || '',
        confirmed_start_time: row[3] || '',
        confirmed_end_time: row[4] || '',
        confirmed_at: row[5] || '',
      }));
  }

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
    
    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      for (const [key, value] of Object.entries(config)) {
        const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === key);
        
        if (rowIndex !== -1) {
          rows[rowIndex][1] = value;
          rows[rowIndex][3] = now;
          updated++;
        } else {
          rows.push([key, value, '', now]);
          created++;
        }
      }

      workbook.Sheets['config'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
    } finally {
      await this.releaseLock();
    }
    
    return { updated, created };
  }
}
