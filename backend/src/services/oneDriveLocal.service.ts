import dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
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
    
    // 초기화 시 필요한 시트 생성 (비동기로 실행, 에러는 로그만 남기고 계속 진행)
    this.initializeSheets().catch(error => {
      logger.error('Error initializing sheets:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // 시트 초기화 실패해도 서비스는 계속 사용 가능 (시트는 필요할 때 생성됨)
      logger.warn('Continuing without sheet initialization. Sheets will be created on first use.');
    });
  }

  /**
   * 파일 잠금 획득 (간단한 파일 기반 잠금)
   */
  private async acquireLock(): Promise<void> {
    const maxRetries = 30; // 재시도 횟수 증가 (10 -> 30)
    const retryDelay = 200; // 대기 시간 증가 (100ms -> 200ms)

    // 먼저 잠금 파일이 존재하는지 확인하고, 오래된 잠금 파일이면 삭제
    try {
      const lockExists = await fs.access(this.lockFilePath).then(() => true).catch(() => false);
      if (lockExists) {
        try {
          const lockContent = await fs.readFile(this.lockFilePath, 'utf-8');
          const lockPid = parseInt(lockContent.trim());
          
          // PID가 유효한지 확인 (0이면 시스템 프로세스이므로 건너뛰기)
          if (lockPid > 0) {
            // Windows에서 프로세스가 살아있는지 확인
            try {
              // 프로세스가 존재하는지 확인 (간단한 방법)
              process.kill(lockPid, 0); // 시그널 0은 프로세스 존재 여부만 확인
              // 프로세스가 살아있으면 잠시 대기
              logger.debug(`Lock file exists, process ${lockPid} is running, waiting...`);
            } catch {
              // 프로세스가 없으면 오래된 잠금 파일로 간주하고 삭제
              logger.warn(`Removing stale lock file (PID: ${lockPid} - process not found)`);
              await fs.unlink(this.lockFilePath);
            }
          } else {
            // PID가 0이거나 유효하지 않으면 삭제
            logger.warn(`Removing invalid lock file (PID: ${lockPid})`);
            await fs.unlink(this.lockFilePath);
          }
        } catch (err: any) {
          // 잠금 파일 읽기 실패 시 삭제 시도
          if (err.code === 'ENOENT') {
            // 파일이 이미 없음
          } else {
            logger.warn(`Error reading lock file, removing it: ${err.message}`);
            try {
              await fs.unlink(this.lockFilePath);
            } catch {
              // 삭제 실패는 무시
            }
          }
        }
      }
    } catch {
      // 접근 확인 실패는 무시 (파일이 없을 수 있음)
    }

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

    // 마지막 시도에서도 실패하면 잠금 파일을 강제로 삭제하고 재시도
    try {
      logger.warn('Removing lock file after maximum retries');
      await fs.unlink(this.lockFilePath);
      // 한 번 더 시도
      await fs.writeFile(this.lockFilePath, process.pid.toString(), { flag: 'wx' });
      logger.debug('File lock acquired after removing lock file');
      return;
    } catch {
      // 최종 실패
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
   * 잠금을 보유한 상태에서만 호출. 파일에서 워크북을 읽어 this.workbook에 설정.
   * 파일이 없으면 빈 워크북 생성 (시트 생성은 호출자가 처리).
   */
  private async readWorkbookUnderLock(): Promise<void> {
    try {
      await fs.access(this.filePath);
      const fileBuffer = await fs.readFile(this.filePath);
      this.workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      logger.debug('Excel file loaded under lock');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.workbook = XLSX.utils.book_new();
        logger.warn(`Excel file not found at ${this.filePath}, using new workbook`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 잠금을 건 상태에서 파일만 읽어 워크북 생성 (호출 전에 acquireLock 필요)
   */
  private async loadWorkbookHoldingLock(): Promise<XLSX.WorkBook> {
    try {
      await fs.access(this.filePath);
    } catch (e: any) {
      if (e?.code === 'ENOENT') {
        this.workbook = XLSX.utils.book_new();
        return this.workbook;
      }
      throw e;
    }
    const fileBuffer = await fs.readFile(this.filePath);
    this.workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    return this.workbook!;
  }

  /** 워크북에서 시트 이름 찾기 (대소문자 무시) */
  private getSheetNameIgnoreCase(workbook: XLSX.WorkBook, want: string): string | null {
    const wantLower = want.toLowerCase();
    const found = Object.keys(workbook.Sheets).find((k) => k.toLowerCase() === wantLower);
    return found ?? null;
  }

  /**
   * Excel 파일 로드 (로컬 파일 시스템에서)
   * 매 요청마다 파일에서 다시 읽어, Excel에서 삭제/수정한 내용이 목록에 바로 반영되도록 함.
   */
  private async loadWorkbook(): Promise<XLSX.WorkBook> {
    try {
      await this.acquireLock();

      try {
        // 파일이 존재하는지 확인
        await fs.access(this.filePath);

        // Excel 파일 읽기 (캐시 사용 안 함 - Excel 수정/삭제가 즉시 반영되도록)
        const fileBuffer = await fs.readFile(this.filePath);
        this.workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        logger.debug('Excel file loaded from local path');
      } finally {
        await this.releaseLock();
      }

      return this.workbook;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 파일이 없으면 새 워크북 생성
        logger.warn(`Excel file not found at ${this.filePath}, creating new workbook`);
        this.workbook = XLSX.utils.book_new();
        // 필요한 시트 초기화 (비동기로 실행, 에러는 로그만 남기고 계속 진행)
        this.initializeSheets().catch(err => {
          logger.warn('Error initializing sheets during load:', {
            message: err instanceof Error ? err.message : String(err),
          });
        });
        return this.workbook;
      }
      logger.error('Error loading Excel file:', {
        message: error.message,
        code: error.code,
        path: this.filePath,
        stack: error.stack,
      });
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
   * 필요한 시트가 없으면 생성
   */
  private async ensureSheet(sheetName: string, headers: string[]): Promise<void> {
    try {
      const workbook = await this.loadWorkbook();
      
      if (!workbook.Sheets[sheetName]) {
        logger.info(`Creating missing sheet: ${sheetName}`);
        const headerRow = [headers];
        workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(headerRow);
        if (!workbook.SheetNames.includes(sheetName)) {
          workbook.SheetNames.push(sheetName);
        }
        await this.saveWorkbook(true);
        logger.info(`✅ Sheet '${sheetName}' created successfully`);
      } else {
        // 시트는 있지만 헤더가 없는 경우 확인
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        if (rows.length === 0 || (rows.length === 1 && JSON.stringify(rows[0]) !== JSON.stringify(headers))) {
          // 헤더가 없거나 다른 헤더인 경우 업데이트
          logger.info(`Updating headers for sheet: ${sheetName}`);
          const headerRow = [headers];
          workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(headerRow);
          await this.saveWorkbook(true);
          logger.info(`✅ Sheet '${sheetName}' headers updated successfully`);
        }
      }
    } catch (error: any) {
      logger.error(`Error ensuring sheet '${sheetName}':`, {
        message: error.message,
        code: error.code,
      });
      // 시트 생성 실패해도 에러를 던져서 상위에서 처리하도록 함
      throw error;
    }
  }

  /**
   * 모든 필요한 시트 초기화
   */
  private async initializeSheets(): Promise<void> {
    const requiredSheets = [
      {
        name: 'interviews',
        headers: ['interview_id', 'main_notice', 'team_name', 'proposed_date', 'proposed_start_time', 'proposed_end_time', 'status', 'created_by', 'created_at', 'updated_at', 'room_id', 'cancellation_reason', 'completed_at', 'interview_notes', 'no_show_type', 'no_show_reason']
      },
      {
        name: 'candidates',
        headers: ['candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at', 'status', 'resume_url', 'notes']
      },
      {
        name: 'interview_candidates',
        headers: ['interview_id', 'candidate_id', 'sequence', 'scheduled_start_time', 'scheduled_end_time', 'created_at']
      },
      {
        name: 'candidate_interviewers',
        headers: ['interview_id', 'candidate_id', 'interviewer_id', 'role', 'created_at']
      },
      {
        name: 'interviewers',
        headers: ['interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'created_at']
      },
      {
        name: 'interview_interviewers',
        headers: ['interview_id', 'interviewer_id', 'responded_at', 'reminder_sent_count', 'last_reminder_sent_at']
      },
      {
        name: 'time_selections',
        headers: ['selection_id', 'interview_id', 'interviewer_id', 'slot_date', 'start_time', 'end_time', 'created_at']
      },
      {
        name: 'confirmed_schedules',
        headers: ['interview_id', 'candidate_id', 'confirmed_date', 'confirmed_start_time', 'confirmed_end_time', 'confirmed_at']
      },
      {
        name: 'config',
        headers: ['config_key', 'config_value', 'description', 'updated_at']
      },
      {
        name: 'rooms',
        headers: ['room_id', 'room_name', 'location', 'capacity', 'facilities', 'status', 'notes', 'created_at', 'updated_at']
      },
      {
        name: 'interview_history',
        headers: ['history_id', 'interview_id', 'change_type', 'old_value', 'new_value', 'changed_by', 'changed_at', 'reason']
      },
      {
        name: 'evaluations',
        headers: ['evaluation_id', 'interview_id', 'candidate_id', 'interviewer_id', 'technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score', 'recommendation', 'comments', 'strengths', 'weaknesses', 'created_at']
      },
    ];

    logger.info(`Initializing ${requiredSheets.length} required sheets...`);
    let successCount = 0;
    let failCount = 0;

    for (const sheet of requiredSheets) {
      try {
        await this.ensureSheet(sheet.name, sheet.headers);
        successCount++;
      } catch (error: any) {
        failCount++;
        logger.error(`Failed to initialize sheet '${sheet.name}':`, {
          message: error.message,
          code: error.code,
        });
        // 하나의 시트 실패해도 다른 시트는 계속 생성 시도
      }
    }

    logger.info(`Sheet initialization complete: ${successCount} succeeded, ${failCount} failed`);
    if (failCount > 0) {
      logger.warn(`Some sheets failed to initialize. They will be created on first use.`);
    }
  }

  /**
   * 워크시트 읽기
   */
  private async readWorksheet(sheetName: string): Promise<any[][]> {
    try {
      const workbook = await this.loadWorkbook();
      const sheetKey = this.getSheetNameIgnoreCase(workbook, sheetName) ?? sheetName;
      const worksheet = workbook.Sheets[sheetKey];
      
      if (!worksheet) {
        logger.warn(`Worksheet ${sheetName} not found, creating it...`);
        // 시트가 없으면 생성 시도
        const sheetConfigs: Record<string, string[]> = {
          'interviews': ['interview_id', 'main_notice', 'team_name', 'proposed_date', 'proposed_start_time', 'proposed_end_time', 'status', 'created_by', 'created_at', 'updated_at', 'room_id', 'cancellation_reason', 'completed_at', 'interview_notes', 'no_show_type', 'no_show_reason'],
          'candidates': ['candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at', 'status', 'resume_url', 'notes'],
          'interview_candidates': ['interview_id', 'candidate_id', 'sequence', 'scheduled_start_time', 'scheduled_end_time', 'created_at'],
          'candidate_interviewers': ['interview_id', 'candidate_id', 'interviewer_id', 'role', 'created_at'],
          'interviewers': ['interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'password_hash', 'created_at'],
          'interview_interviewers': ['interview_id', 'interviewer_id', 'responded_at', 'reminder_sent_count', 'last_reminder_sent_at'],
          'time_selections': ['selection_id', 'interview_id', 'interviewer_id', 'slot_date', 'start_time', 'end_time', 'created_at'],
          'confirmed_schedules': ['interview_id', 'candidate_id', 'confirmed_date', 'confirmed_start_time', 'confirmed_end_time', 'confirmed_at'],
          'config': ['config_key', 'config_value', 'description', 'updated_at'],
          'rooms': ['room_id', 'room_name', 'location', 'capacity', 'facilities', 'status', 'notes', 'created_at', 'updated_at'],
          'interview_history': ['history_id', 'interview_id', 'change_type', 'old_value', 'new_value', 'changed_by', 'changed_at', 'reason'],
          'evaluations': ['evaluation_id', 'interview_id', 'candidate_id', 'interviewer_id', 'technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score', 'recommendation', 'comments', 'strengths', 'weaknesses', 'created_at'],
        };
        
        if (sheetConfigs[sheetName]) {
          await this.ensureSheet(sheetName, sheetConfigs[sheetName]);
          // 다시 읽기
          const reloadedWorkbook = await this.loadWorkbook();
          const newWorksheet = reloadedWorkbook.Sheets[sheetName];
          if (newWorksheet) {
            const rows = XLSX.utils.sheet_to_json(newWorksheet, { header: 1, defval: '' }) as any[][];
            logger.info(`✅ Successfully created and read sheet: ${sheetName}, rows: ${rows.length}`);
            return rows;
          }
        }
        logger.warn(`Sheet ${sheetName} could not be created, returning empty array`);
        return [];
      }

      // Excel 데이터를 2D 배열로 변환
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      logger.debug(`Read sheet ${sheetName}: ${rows.length} rows`);
      return rows;
    } catch (error: any) {
      logger.error(`Error reading worksheet ${sheetName}:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      // 에러가 발생해도 빈 배열 반환 (시스템이 계속 작동하도록)
      return [];
    }
  }

  /**
   * 워크시트에 행 추가 (락을 걸어 동시 요청 시 기존 데이터가 덮어쓰이지 않도록 함)
   */
  private async appendRow(sheetName: string, row: any[]): Promise<void> {
    await this.acquireLock();
    try {
      await this.readWorkbookUnderLock();
      const workbook = this.workbook!;

      // 워크시트가 없으면 헤더 포함해서 생성
      if (!workbook.Sheets[sheetName]) {
        const sheetConfigs: Record<string, string[]> = {
          'interviews': ['interview_id', 'main_notice', 'team_name', 'proposed_date', 'proposed_start_time', 'proposed_end_time', 'status', 'created_by', 'created_at', 'updated_at', 'room_id', 'cancellation_reason', 'completed_at', 'interview_notes', 'no_show_type', 'no_show_reason'],
          'candidates': ['candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at', 'status', 'resume_url', 'notes'],
          'interview_candidates': ['interview_id', 'candidate_id', 'sequence', 'scheduled_start_time', 'scheduled_end_time', 'created_at'],
          'candidate_interviewers': ['interview_id', 'candidate_id', 'interviewer_id', 'role', 'created_at'],
          'interviewers': ['interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'password_hash', 'created_at'],
          'interview_interviewers': ['interview_id', 'interviewer_id', 'responded_at', 'reminder_sent_count', 'last_reminder_sent_at'],
          'time_selections': ['selection_id', 'interview_id', 'interviewer_id', 'slot_date', 'start_time', 'end_time', 'created_at'],
          'confirmed_schedules': ['interview_id', 'candidate_id', 'confirmed_date', 'confirmed_start_time', 'confirmed_end_time', 'confirmed_at'],
          'config': ['config_key', 'config_value', 'description', 'updated_at'],
          'rooms': ['room_id', 'room_name', 'location', 'capacity', 'facilities', 'status', 'notes', 'created_at', 'updated_at'],
          'interview_history': ['history_id', 'interview_id', 'change_type', 'old_value', 'new_value', 'changed_by', 'changed_at', 'reason'],
          'evaluations': ['evaluation_id', 'interview_id', 'candidate_id', 'interviewer_id', 'technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score', 'recommendation', 'comments', 'strengths', 'weaknesses', 'created_at'],
        };
        const headers = sheetConfigs[sheetName] || [];
        const headerRow = headers.length > 0 ? [headers] : [];
        workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(headerRow);
        if (!workbook.SheetNames.includes(sheetName)) {
          workbook.SheetNames.push(sheetName);
        }
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (rows.length === 1 && rows[0].every((cell: any) => !cell || cell === '')) {
        const sheetConfigs: Record<string, string[]> = {
          'interviews': ['interview_id', 'main_notice', 'team_name', 'proposed_date', 'proposed_start_time', 'proposed_end_time', 'status', 'created_by', 'created_at', 'updated_at', 'room_id', 'cancellation_reason', 'completed_at', 'interview_notes', 'no_show_type', 'no_show_reason'],
          'candidates': ['candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at', 'status', 'resume_url', 'notes'],
          'interview_candidates': ['interview_id', 'candidate_id', 'sequence', 'scheduled_start_time', 'scheduled_end_time', 'created_at'],
          'candidate_interviewers': ['interview_id', 'candidate_id', 'interviewer_id', 'role', 'created_at'],
          'interviewers': ['interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'password_hash', 'created_at'],
          'interview_interviewers': ['interview_id', 'interviewer_id', 'responded_at', 'reminder_sent_count', 'last_reminder_sent_at'],
          'time_selections': ['selection_id', 'interview_id', 'interviewer_id', 'slot_date', 'start_time', 'end_time', 'created_at'],
          'confirmed_schedules': ['interview_id', 'candidate_id', 'confirmed_date', 'confirmed_start_time', 'confirmed_end_time', 'confirmed_at'],
          'config': ['config_key', 'config_value', 'description', 'updated_at'],
          'rooms': ['room_id', 'room_name', 'location', 'capacity', 'facilities', 'status', 'notes', 'created_at', 'updated_at'],
          'interview_history': ['history_id', 'interview_id', 'change_type', 'old_value', 'new_value', 'changed_by', 'changed_at', 'reason'],
          'evaluations': ['evaluation_id', 'interview_id', 'candidate_id', 'interviewer_id', 'technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score', 'recommendation', 'comments', 'strengths', 'weaknesses', 'created_at'],
        };
        const headers = sheetConfigs[sheetName] || [];
        if (headers.length > 0) rows[0] = headers;
      }

      rows.push(row);
      workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
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
    try {
      // 시트가 없으면 먼저 생성
      try {
        await this.ensureSheet('interviews', [
          'interview_id', 'main_notice', 'team_name', 'proposed_date', 'proposed_start_time', 
          'proposed_end_time', 'status', 'created_by', 'created_at', 'updated_at', 'room_id', 
          'cancellation_reason', 'completed_at', 'interview_notes', 'no_show_type', 'no_show_reason'
        ]);
      } catch (err) {
        logger.warn('Error ensuring interviews sheet:', err);
      }
      
      const rows = await this.readWorksheet('interviews');
      if (rows.length < 2) {
        logger.info('No interview data found (only headers or empty sheet)');
        return [];
      }
      
      const interviews = rows.slice(1).map((row, index) => {
        try {
          return {
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
            room_id: row[10] || '',
            cancellation_reason: row[11] || '',
            completed_at: row[12] || '',
            interview_notes: row[13] || '',
            no_show_type: row[14] || '',
            no_show_reason: row[15] || '',
          };
        } catch (err) {
          logger.warn(`Error parsing interview row ${index + 2}:`, err);
          return null;
        }
      }).filter((item): item is InterviewRow => item !== null);
      
      logger.info(`Successfully loaded ${interviews.length} interviews from Excel`);
      return interviews;
    } catch (error: any) {
      logger.error('Error in getAllInterviews:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      // 에러가 발생해도 빈 배열 반환
      return [];
    }
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

  async updateInterview(interviewId: string, updates: any): Promise<void> {
    const rows = await this.readWorksheet('interviews');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId);
    
    if (index === -1) {
      throw new Error(`Interview ${interviewId} not found`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      const row = rows[index];
      if (updates.main_notice !== undefined) row[1] = updates.main_notice;
      if (updates.team_name !== undefined) row[2] = updates.team_name;
      if (updates.proposed_date !== undefined) row[3] = updates.proposed_date;
      if (updates.proposed_start_time !== undefined) row[4] = updates.proposed_start_time;
      if (updates.proposed_end_time !== undefined) row[5] = updates.proposed_end_time;
      if (updates.status !== undefined) row[6] = updates.status;
      if (updates.room_id !== undefined) row[10] = updates.room_id; // room_id 추가
      if (updates.cancellation_reason !== undefined) row[11] = updates.cancellation_reason;
      if (updates.completed_at !== undefined) row[12] = updates.completed_at;
      if (updates.interview_notes !== undefined) row[13] = updates.interview_notes;
      if (updates.no_show_type !== undefined) row[14] = updates.no_show_type;
      if (updates.no_show_reason !== undefined) row[15] = updates.no_show_reason;
      row[9] = new Date().toISOString(); // updated_at
      workbook.Sheets['interviews'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
  }

  async updateInterviewStatus(interviewId: string, status: string): Promise<void> {
    await this.updateInterview(interviewId, { status });
  }

  async deleteInterview(interviewId: string): Promise<void> {
    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      // interviews 시트에서 삭제
      const interviewRows = await this.readWorksheet('interviews');
      const filteredInterviewRows = interviewRows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
      workbook.Sheets['interviews'] = XLSX.utils.aoa_to_sheet(filteredInterviewRows);

      // interview_candidates 시트에서 삭제
      const interviewCandidateRows = await this.readWorksheet('interview_candidates');
      const filteredInterviewCandidateRows = interviewCandidateRows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
      workbook.Sheets['interview_candidates'] = XLSX.utils.aoa_to_sheet(filteredInterviewCandidateRows);

      // candidate_interviewers 시트에서 삭제
      const candidateInterviewerRows = await this.readWorksheet('candidate_interviewers');
      const filteredCandidateInterviewerRows = candidateInterviewerRows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
      workbook.Sheets['candidate_interviewers'] = XLSX.utils.aoa_to_sheet(filteredCandidateInterviewerRows);

      // interview_interviewers 시트에서 삭제
      const interviewInterviewerRows = await this.readWorksheet('interview_interviewers');
      const filteredInterviewInterviewerRows = interviewInterviewerRows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
      workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(filteredInterviewInterviewerRows);

      // time_selections 시트에서 삭제
      const timeSelectionRows = await this.readWorksheet('time_selections');
      const filteredTimeSelectionRows = timeSelectionRows.filter((row, idx) => idx === 0 || row[1] !== interviewId);
      workbook.Sheets['time_selections'] = XLSX.utils.aoa_to_sheet(filteredTimeSelectionRows);

      // confirmed_schedules 시트에서 삭제
      const confirmedScheduleRows = await this.readWorksheet('confirmed_schedules');
      const filteredConfirmedScheduleRows = confirmedScheduleRows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
      workbook.Sheets['confirmed_schedules'] = XLSX.utils.aoa_to_sheet(filteredConfirmedScheduleRows);

      await this.saveWorkbook(true); // 이미 잠금을 획득했으므로 skipLock=true
      logger.info(`Interview ${interviewId} and all related data deleted`);
    } finally {
      await this.releaseLock();
    }
  }

  async getAllCandidates(): Promise<CandidateRow[]> {
    // 시트가 없으면 먼저 생성
    await this.ensureSheet('candidates', [
      'candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at', 'status', 'resume_url', 'notes'
    ]).catch(err => {
      logger.warn('Error ensuring candidates sheet:', err);
    });
    const rows = await this.readWorksheet('candidates');
    if (rows.length < 2) return [];
    
    return rows.slice(1).map(row => ({
      candidate_id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      phone: row[3] || '',
      position_applied: row[4] || '',
      created_at: row[5] || '',
      status: row[6] || '',
      resume_url: row[7] || '',
      notes: row[8] || '',
      portfolio_url: row[9] || '',
    }));
  }

  async getCandidateById(candidateId: string): Promise<CandidateRow | null> {
    const candidates = await this.getAllCandidates();
    return candidates.find(c => c.candidate_id === candidateId) || null;
  }

  async getCandidatesByInterview(interviewId: string): Promise<CandidateRow[]> {
    const interviewCandidates = await this.getInterviewCandidates(interviewId);
    const allCandidates = await this.getAllCandidates();
    const candidateIds = new Set(interviewCandidates.map(ic => ic.candidate_id));
    return allCandidates.filter(c => candidateIds.has(c.candidate_id));
  }

  async updateCandidate(candidateId: string, updates: any): Promise<void> {
    const rows = await this.readWorksheet('candidates');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === candidateId);
    
    if (index === -1) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      const row = rows[index];
      if (updates.name !== undefined) row[1] = updates.name;
      if (updates.email !== undefined) row[2] = updates.email;
      if (updates.phone !== undefined) row[3] = updates.phone;
      if (updates.position_applied !== undefined) row[4] = updates.position_applied;
      if (updates.status !== undefined) row[6] = updates.status;
      if (updates.resume_url !== undefined) row[7] = updates.resume_url;
      if (updates.notes !== undefined) row[8] = updates.notes;
      if (updates.portfolio_url !== undefined) row[9] = updates.portfolio_url;
      workbook.Sheets['candidates'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
  }

  async updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    await this.updateCandidate(candidateId, { status });
  }

  async createCandidate(candidate: CandidateRow): Promise<void> {
    await this.appendRow('candidates', [
      candidate.candidate_id,
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.position_applied,
      candidate.created_at,
      candidate.status || '',
      candidate.resume_url || '',
      candidate.notes || '',
      (candidate as any).portfolio_url || '',
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
    // 시트가 없으면 먼저 생성
    try {
      await this.ensureSheet('interviewers', [
        'interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'password_hash', 'created_at'
      ]);
    } catch (err) {
      logger.warn('Error ensuring interviewers sheet:', err);
    }
    const rows = await this.readWorksheet('interviewers');
    if (rows.length < 2) return [];
    
    return rows.slice(1).map(row => ({
      interviewer_id: String(row[0] ?? '').trim(),
      name: row[1] || '',
      email: row[2] || '',
      department: row[3] || '',
      position: row[4] || '',
      is_team_lead: row[5] === 'TRUE' || row[5] === true,
      phone: row[6] || '',
      is_active: row[7] === 'TRUE' || row[7] === true,
      password_hash: row[8] || '', // 비밀번호 해시 (읽기 전용, 반환 시 제외)
      created_at: row[9] || '',
    }));
  }

  async getInterviewerById(interviewerId: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    const idStr = String(interviewerId ?? '').trim();
    const interviewer = interviewers.find(i => String(i.interviewer_id ?? '').trim() === idStr) || null;
    // password_hash는 반환하지 않음 (보안)
    if (interviewer) {
      delete (interviewer as any).password_hash;
    }
    return interviewer;
  }

  async getInterviewerByEmail(email: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    const interviewer = interviewers.find(i => i.email.toLowerCase() === email.toLowerCase()) || null;
    // password_hash는 반환하지 않음 (보안)
    if (interviewer) {
      delete (interviewer as any).password_hash;
    }
    return interviewer;
  }

  // 비밀번호 해시 포함하여 조회 (인증용)
  async getInterviewerByEmailWithPassword(email: string): Promise<(InterviewerRow & { password_hash?: string }) | null> {
    const rows = await this.readWorksheet('interviewers');
    if (rows.length < 2) return null;
    
    const row = rows.slice(1).find(row => (row[2] || '').toLowerCase() === email.toLowerCase());
    if (!row) return null;
    
    return {
      interviewer_id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      department: row[3] || '',
      position: row[4] || '',
      is_team_lead: row[5] === 'TRUE' || row[5] === true,
      phone: row[6] || '',
      is_active: row[7] === 'TRUE' || row[7] === true,
      password_hash: row[8] || '',
      created_at: row[9] || '',
    };
  }

  // 면접관 비밀번호 업데이트
  async updateInterviewerPassword(interviewerId: string, passwordHash: string): Promise<void> {
    const rows = await this.readWorksheet('interviewers');
    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    
    try {
      const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewerId);
      if (index === -1) {
        throw new Error(`면접관을 찾을 수 없습니다: ${interviewerId}`);
      }
      
      rows[index][8] = passwordHash; // password_hash 필드 업데이트
      workbook.Sheets['interviewers'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
  }

  async createOrUpdateInterviewers(interviewers: Omit<InterviewerRow, 'created_at'>[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    const normalizeId = (v: unknown) => String(v ?? '').trim().toLowerCase();
    const normalizeEmail = (v: unknown) => String(v ?? '').trim().toLowerCase();

    await this.acquireLock();
    try {
      const workbook = await this.loadWorkbookHoldingLock();
      const sheetKey = this.getSheetNameIgnoreCase(workbook, 'interviewers') ?? 'interviewers';
      let sheet = workbook.Sheets[sheetKey];
      let rows: any[][];
      if (!sheet) {
        const headers = ['interviewer_id', 'name', 'email', 'department', 'position', 'is_team_lead', 'phone', 'is_active', 'password_hash', 'created_at'];
        workbook.Sheets['interviewers'] = XLSX.utils.aoa_to_sheet([headers]);
        sheet = workbook.Sheets['interviewers'];
        rows = [headers];
      } else {
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      }

      for (const interviewer of interviewers) {
        const idStr = normalizeId(interviewer.interviewer_id);
        const emailStr = normalizeEmail(interviewer.email);
        let index = rows.findIndex((row, idx) => idx > 0 && normalizeId(row[0]) === idStr);
        if (index === -1 && emailStr) {
          index = rows.findIndex((row, idx) => idx > 0 && normalizeEmail(row[2]) === emailStr);
          if (index !== -1) {
            logger.info(`Interviewer matched by email (id not found): email=${emailStr}, rowIndex=${index}`);
          }
        }

        if (index !== -1) {
          rows[index][0] = interviewer.interviewer_id;
          rows[index][1] = interviewer.name;
          rows[index][2] = interviewer.email;
          rows[index][3] = interviewer.department;
          rows[index][4] = interviewer.position;
          rows[index][5] = interviewer.is_team_lead ? 'TRUE' : 'FALSE';
          rows[index][6] = interviewer.phone;
          rows[index][7] = interviewer.is_active ? 'TRUE' : 'FALSE';
          if ((interviewer as any).password_hash) {
            rows[index][8] = (interviewer as any).password_hash;
          }
          updated++;
          logger.info(`Interviewer row updated: id=${idStr}, index=${index}`);
        } else {
          rows.push([
            interviewer.interviewer_id,
            interviewer.name,
            interviewer.email,
            interviewer.department,
            interviewer.position,
            interviewer.is_team_lead ? 'TRUE' : 'FALSE',
            interviewer.phone,
            interviewer.is_active ? 'TRUE' : 'FALSE',
            (interviewer as any).password_hash || '',
            now,
          ]);
          created++;
        }
      }

      workbook.Sheets[sheetKey] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
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

  async updateInterviewInterviewers(interviewId: string, interviewerIds: string[]): Promise<void> {
    // 기존 매핑 삭제
    const rows = await this.readWorksheet('interview_interviewers');
    const filteredRows = rows.filter((row, idx) => idx === 0 || row[0] !== interviewId);
    
    // 새 매핑 추가
    const now = new Date().toISOString();
    for (const interviewerId of interviewerIds) {
      filteredRows.push([
        interviewId,
        interviewerId,
        '', // responded_at
        0,  // reminder_sent_count
        ''  // last_reminder_sent_at
      ]);
    }
    
    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(filteredRows);
      await this.saveWorkbook(true);
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

  // ========== Rooms ==========

  async getAllRooms(): Promise<any[]> {
    // 시트가 없으면 먼저 생성
    try {
      await this.ensureSheet('rooms', [
        'room_id', 'room_name', 'location', 'capacity', 'facilities', 'status', 'notes', 'created_at', 'updated_at'
      ]);
    } catch (err) {
      logger.warn('Error ensuring rooms sheet:', err);
    }
    const rows = await this.readWorksheet('rooms');
    if (rows.length < 2) return [];
    
    return rows.slice(1).map(row => ({
      room_id: row[0] || '',
      room_name: row[1] || '',
      location: row[2] || '',
      capacity: Number(row[3]) || 0,
      facilities: row[4] ? (typeof row[4] === 'string' ? row[4].split(',').map(f => f.trim()) : []) : [],
      status: (row[5] || 'available') as 'available' | 'maintenance' | 'reserved',
      notes: row[6] || '',
      created_at: row[7] || '',
      updated_at: row[8] || '',
    }));
  }

  async getRoomById(roomId: string): Promise<any | null> {
    const rooms = await this.getAllRooms();
    return rooms.find(r => r.room_id === roomId) || null;
  }

  async createRoom(room: any): Promise<void> {
    const now = new Date().toISOString();
    await this.appendRow('rooms', [
      room.room_id,
      room.room_name,
      room.location,
      room.capacity,
      Array.isArray(room.facilities) ? room.facilities.join(',') : '',
      room.status || 'available',
      room.notes || '',
      now,
      now,
    ]);
  }

  async updateRoom(roomId: string, updates: any): Promise<void> {
    const rows = await this.readWorksheet('rooms');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === roomId);
    
    if (index === -1) {
      throw new Error(`Room ${roomId} not found`);
    }

    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      const row = rows[index];
      if (updates.room_name !== undefined) row[1] = updates.room_name;
      if (updates.location !== undefined) row[2] = updates.location;
      if (updates.capacity !== undefined) row[3] = updates.capacity;
      if (updates.facilities !== undefined) row[4] = Array.isArray(updates.facilities) ? updates.facilities.join(',') : updates.facilities;
      if (updates.status !== undefined) row[5] = updates.status;
      if (updates.notes !== undefined) row[6] = updates.notes;
      row[8] = new Date().toISOString(); // updated_at
      workbook.Sheets['rooms'] = XLSX.utils.aoa_to_sheet(rows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    // 사용 중인 면접이 있는지 확인
    const interviews = await this.getAllInterviews();
    const inUse = interviews.some(i => i.room_id === roomId && !['COMPLETED', 'CANCELLED'].includes(i.status));
    
    if (inUse) {
      throw new Error('사용 중인 면접실은 삭제할 수 없습니다.');
    }

    const rows = await this.readWorksheet('rooms');
    const filteredRows = rows.filter((row, idx) => idx === 0 || row[0] !== roomId);
    
    const workbook = await this.loadWorkbook();
    await this.acquireLock();
    try {
      workbook.Sheets['rooms'] = XLSX.utils.aoa_to_sheet(filteredRows);
      await this.saveWorkbook(true);
    } finally {
      await this.releaseLock();
    }
  }

  async getRoomAvailability(roomId: string, date: string): Promise<any[]> {
    // 해당 날짜의 면접 일정 조회
    const interviews = await this.getAllInterviews();
    const confirmedSchedules = await this.getConfirmedSchedules(''); // 모든 확정 일정
    
    const dayInterviews = interviews.filter(i => {
      if (i.proposed_date === date && i.room_id === roomId) return true;
      const schedule = confirmedSchedules.find(s => s.interview_id === i.interview_id && s.confirmed_date === date);
      return schedule && i.room_id === roomId;
    });

    // 30분 단위 슬롯 생성 (09:00-18:00)
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endTime = minute === 30 
          ? `${String(hour + 1).padStart(2, '0')}:00`
          : `${String(hour).padStart(2, '0')}:30`;
        
        // 점심시간 제외
        if (startTime >= '12:00' && startTime < '13:00') continue;
        
        // 충돌 확인
        const hasConflict = dayInterviews.some(i => {
          const iStart = i.proposed_start_time || i.confirmed_start_time;
          const iEnd = i.proposed_end_time || i.confirmed_end_time;
          return (startTime < iEnd && endTime > iStart);
        });
        
        slots.push({
          startTime,
          endTime,
          available: !hasConflict,
          bookedInterviewId: hasConflict ? dayInterviews.find(i => {
            const iStart = i.proposed_start_time || i.confirmed_start_time;
            const iEnd = i.proposed_end_time || i.confirmed_end_time;
            return (startTime < iEnd && endTime > iStart);
          })?.interview_id : undefined
        });
      }
    }
    
    return slots;
  }

  // ========== Interview History ==========

  async createInterviewHistory(history: any): Promise<void> {
    await this.appendRow('interview_history', [
      history.history_id,
      history.interview_id,
      history.change_type,
      history.old_value,
      history.new_value,
      history.changed_by,
      history.changed_at,
      history.reason || '',
    ]);
  }

  async getInterviewHistory(interviewId: string): Promise<any[]> {
    const rows = await this.readWorksheet('interview_history');
    if (rows.length < 2) return [];

    return rows.slice(1)
      .filter(row => row[1] === interviewId)
      .map(row => ({
        history_id: row[0] || '',
        interview_id: row[1] || '',
        change_type: row[2] || '',
        old_value: row[3] ? JSON.parse(row[3]) : null,
        new_value: row[4] ? JSON.parse(row[4]) : null,
        changed_by: row[5] || '',
        changed_at: row[6] || '',
        reason: row[7] || '',
      }))
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }

  // ========== Interview Evaluations ==========

  private mapEvaluationRow(row: any[]): any {
    const strengths = row[11];
    const weaknesses = row[12];
    return {
      evaluation_id: row[0] || '',
      interview_id: row[1] || '',
      candidate_id: row[2] || '',
      interviewer_id: row[3] || '',
      technical_score: row[4] !== undefined && row[4] !== '' ? Number(row[4]) : null,
      communication_score: row[5] !== undefined && row[5] !== '' ? Number(row[5]) : null,
      fit_score: row[6] !== undefined && row[6] !== '' ? Number(row[6]) : null,
      teamwork_score: row[7] !== undefined && row[7] !== '' ? Number(row[7]) : null,
      overall_score: row[8] !== undefined && row[8] !== '' ? Number(row[8]) : null,
      recommendation: row[9] || '',
      comments: row[10] || '',
      strengths: strengths ? (typeof strengths === 'string' ? (strengths.includes('[') ? JSON.parse(strengths) : strengths.split(',').map((s: string) => s.trim()).filter(Boolean)) : strengths) : [],
      weaknesses: weaknesses ? (typeof weaknesses === 'string' ? (weaknesses.includes('[') ? JSON.parse(weaknesses) : weaknesses.split(',').map((s: string) => s.trim()).filter(Boolean)) : weaknesses) : [],
      created_at: row[13] || '',
    };
  }

  async createEvaluation(evaluation: any): Promise<void> {
    const id = evaluation.evaluation_id || randomUUID();
    const strengths = Array.isArray(evaluation.strengths) ? JSON.stringify(evaluation.strengths) : (evaluation.strengths || '');
    const weaknesses = Array.isArray(evaluation.weaknesses) ? JSON.stringify(evaluation.weaknesses) : (evaluation.weaknesses || '');
    await this.ensureSheet('evaluations', [
      'evaluation_id', 'interview_id', 'candidate_id', 'interviewer_id', 'technical_score', 'communication_score', 'fit_score', 'teamwork_score', 'overall_score', 'recommendation', 'comments', 'strengths', 'weaknesses', 'created_at'
    ]);
    await this.appendRow('evaluations', [
      id,
      evaluation.interview_id,
      evaluation.candidate_id,
      evaluation.interviewer_id,
      evaluation.technical_score ?? '',
      evaluation.communication_score ?? '',
      evaluation.fit_score ?? '',
      evaluation.teamwork_score ?? '',
      evaluation.overall_score ?? '',
      evaluation.recommendation || '',
      evaluation.comments || '',
      strengths,
      weaknesses,
      evaluation.created_at || new Date().toISOString(),
    ]);
  }

  async updateEvaluation(evaluationId: string, updates: any): Promise<void> {
    const rows = await this.readWorksheet('evaluations');
    if (rows.length < 2) return;
    const dataRows = rows.slice(1);
    const colIndex: Record<string, number> = {
      technical_score: 4, communication_score: 5, fit_score: 6, teamwork_score: 7, overall_score: 8,
      recommendation: 9, comments: 10, strengths: 11, weaknesses: 12,
    };
    const idx = dataRows.findIndex((r: any[]) => (r[0] || '') === evaluationId);
    if (idx === -1) return;
    const rowIndex = idx + 2;
    for (const [key, col] of Object.entries(colIndex)) {
      const val = (updates as any)[key];
      if (val !== undefined) {
        const cellVal = (key === 'strengths' || key === 'weaknesses') && Array.isArray(val) ? JSON.stringify(val) : val;
        await this.updateCell('evaluations', rowIndex, col + 1, cellVal);
      }
    }
  }

  async getEvaluationsByInterview(interviewId: string): Promise<any[]> {
    const rows = await this.readWorksheet('evaluations');
    if (rows.length < 2) return [];
    return rows.slice(1)
      .filter((row: any[]) => (row[1] || '') === interviewId)
      .map((row: any[]) => this.mapEvaluationRow(row));
  }

  async getEvaluationsByCandidate(candidateId: string): Promise<any[]> {
    const rows = await this.readWorksheet('evaluations');
    if (rows.length < 2) return [];
    return rows.slice(1)
      .filter((row: any[]) => (row[2] || '') === candidateId)
      .map((row: any[]) => this.mapEvaluationRow(row));
  }

  async getEvaluationByInterviewer(interviewId: string, candidateId: string, interviewerId: string): Promise<any | null> {
    const rows = await this.readWorksheet('evaluations');
    if (rows.length < 2) return null;
    const row = rows.slice(1).find(
      (r: any[]) => (r[1] || '') === interviewId && (r[2] || '') === candidateId && (r[3] || '') === interviewerId
    );
    return row ? this.mapEvaluationRow(row) : null;
  }
}
