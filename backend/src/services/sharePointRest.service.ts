import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';
import {
  InterviewRow, CandidateRow, InterviewCandidateRow, CandidateInterviewerRow,
  InterviewerRow, InterviewInterviewerRow, TimeSelectionRow, ConfirmedScheduleRow, ConfigRow
} from './dataService';

// 환경 변수 로드
dotenv.config();

/**
 * SharePoint REST API를 직접 사용하는 서비스
 * Microsoft Graph API보다 간단하고 직접적
 */
export class SharePointRestService {
  private axiosInstance: AxiosInstance;
  private siteUrl: string;
  private filePath: string;
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiresAt: number = 0;
  private workbook: XLSX.WorkBook | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.siteUrl = process.env.SHAREPOINT_SITE_URL || '';
    this.filePath = process.env.SHAREPOINT_FILE_PATH || '/Shared Documents/면접.xlsx';
    this.accessToken = process.env.SHAREPOINT_ACCESS_TOKEN || '';
    this.refreshToken = process.env.SHAREPOINT_REFRESH_TOKEN || '';

    if (!this.siteUrl) {
      throw new Error('SHAREPOINT_SITE_URL environment variable is required');
    }
    if (!this.accessToken) {
      throw new Error('SHAREPOINT_ACCESS_TOKEN environment variable is required');
    }

    // SharePoint 사이트 URL 정규화 (끝에 / 제거)
    this.siteUrl = this.siteUrl.replace(/\/$/, '');

    // 토큰 만료 시간 파싱 (JWT 토큰인 경우)
    this.parseTokenExpiry();

    // Axios 인스턴스 생성
    this.axiosInstance = axios.create({
      baseURL: this.siteUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
      },
    });

    // 인터셉터 추가: 토큰 만료 시 자동 갱신
    this.setupTokenRefreshInterceptor();
  }

  /**
   * JWT 토큰에서 만료 시간 파싱
   */
  private parseTokenExpiry(): void {
    try {
      const parts = this.accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.exp) {
          // 만료 시간을 밀리초로 변환 (5분 여유)
          this.tokenExpiresAt = payload.exp * 1000 - 5 * 60 * 1000;
        }
      }
    } catch (error) {
      logger.warn('Failed to parse token expiry, will refresh on 401 error');
      // 토큰 파싱 실패 시 만료 시간을 0으로 설정 (항상 갱신 시도)
      this.tokenExpiresAt = 0;
    }
  }

  /**
   * 토큰 갱신 인터셉터 설정
   */
  private setupTokenRefreshInterceptor(): void {
    // 요청 인터셉터: 토큰 만료 전에 자동 갱신
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // 토큰이 곧 만료되면 갱신
        if (this.needsRefresh()) {
          await this.refreshAccessToken();
        }
        // 최신 토큰으로 헤더 업데이트
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터: 401 오류 시 토큰 갱신 후 재시도
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 401 오류이고 아직 재시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Refresh Token이 없으면 재시도하지 않음
          if (!this.refreshToken) {
            logger.error('Access Token이 만료되었고 Refresh Token이 없어 자동 갱신할 수 없습니다.');
            return Promise.reject(
              new Error(
                'Access Token이 만료되었습니다. Refresh Token이 없어 자동 갱신할 수 없습니다. ' +
                'PowerShell에서 get-sharepoint-token.ps1로 SHAREPOINT_REFRESH_TOKEN을 발급받아 backend/.env에 설정한 뒤 서버를 재시작하세요.'
              )
            );
          }

          try {
            await this.refreshAccessToken();
            // 갱신된 토큰으로 재시도
            originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            logger.error('Failed to refresh token:', refreshError);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 토큰 갱신이 필요한지 확인
   */
  private needsRefresh(): boolean {
    // Refresh Token이 없으면 갱신 시도하지 않음
    if (!this.refreshToken) {
      return false;
    }
    // 만료 시간이 지났거나 5분 이내에 만료 예정
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Access Token 갱신
   */
  private async refreshAccessToken(): Promise<void> {
    // 이미 갱신 중이면 기다림
    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    if (!this.refreshToken) {
      // Refresh Token이 없으면 갱신하지 않고 현재 토큰 사용
      // 토큰이 만료되면 API 호출 시 401 오류가 발생할 것이고, 그때 사용자에게 알림
      logger.warn('Refresh Token이 없어 자동 갱신을 할 수 없습니다. 토큰이 만료되면 수동으로 갱신이 필요합니다.');
      return;
    }

    this.refreshPromise = this.doRefreshToken();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 실제 토큰 갱신 수행
   */
  private async doRefreshToken(): Promise<string> {
    try {
      // 테넌트 도메인 또는 ID 가져오기
      // 환경 변수에서 가져오거나, common 사용
      const tenantDomain = process.env.SHAREPOINT_TENANT_DOMAIN || 'common';
      
      // SharePoint 사이트 URL에서 테넌트 추출 (fallback)
      if (tenantDomain === 'common' || !process.env.SHAREPOINT_TENANT_DOMAIN) {
        // common 사용 (모든 Microsoft 계정 지원)
        logger.info('Using common endpoint for token refresh');
      } else {
        logger.info(`Using tenant domain: ${tenantDomain}`);
      }

      // OAuth 2.0 토큰 엔드포인트
      const tokenEndpoint = `https://login.microsoftonline.com/${tenantDomain}/oauth2/v2.0/token`;

      logger.info('Refreshing SharePoint access token...');

      const response = await axios.post(
        tokenEndpoint,
        new URLSearchParams({
          client_id: process.env.SHAREPOINT_CLIENT_ID || '00000003-0000-0000-c000-000000000000', // Microsoft Graph 클라이언트 ID
          scope: 'https://graph.microsoft.com/.default offline_access',
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
        }
        
        // 만료 시간 업데이트
        this.parseTokenExpiry();
        
        logger.info('SharePoint access token refreshed successfully');
        return this.accessToken;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error: any) {
      logger.error('Error refreshing token:', error);
      if (error.response) {
        throw new Error(`Token refresh failed: ${error.response.status} ${error.response.statusText}`);
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * (관리자용) 현재 토큰 상태 확인
   */
  public getTokenStatus(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    tokenExpiresAt: number;
    expiresInMs: number | null;
    needsRefresh: boolean;
    siteUrl: string;
    filePath: string;
    tenantDomain: string;
  } {
    const hasAccessToken = Boolean(this.accessToken);
    const hasRefreshToken = Boolean(this.refreshToken);
    const tokenExpiresAt = this.tokenExpiresAt || 0;
    const expiresInMs = tokenExpiresAt ? Math.max(0, tokenExpiresAt - Date.now()) : null;

    return {
      hasAccessToken,
      hasRefreshToken,
      tokenExpiresAt,
      expiresInMs,
      needsRefresh: hasRefreshToken ? this.needsRefresh() : false,
      siteUrl: this.siteUrl,
      filePath: this.filePath,
      tenantDomain: process.env.SHAREPOINT_TENANT_DOMAIN || 'common',
    };
  }

  /**
   * (관리자용) 강제로 토큰 갱신 시도
   */
  public async refreshNow(): Promise<{ ok: true; status: ReturnType<SharePointRestService['getTokenStatus']> }> {
    await this.refreshAccessToken();
    return { ok: true, status: this.getTokenStatus() };
  }

  /**
   * Excel 파일 다운로드 및 메모리에 로드
   */
  private async loadWorkbook(): Promise<XLSX.WorkBook> {
    if (this.workbook) {
      return this.workbook;
    }

    try {
      // SharePoint REST API로 파일 다운로드
      // 파일 경로를 ServerRelativeUrl 형식으로 변환
      const serverRelativeUrl = this.getServerRelativeUrl();
      
      const response = await this.axiosInstance.get(
        `/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`,
        {
          responseType: 'arraybuffer',
        }
      );

      // Excel 파일을 메모리에서 읽기
      this.workbook = XLSX.read(response.data, { type: 'buffer' });
      logger.info('Excel file loaded successfully');
      return this.workbook;
    } catch (error: any) {
      logger.error('Error loading Excel file:', error);
      if (error.response?.status === 401) {
        // 401 오류: 토큰 만료
        if (!this.refreshToken) {
          throw new Error('Access Token이 만료되었습니다. Microsoft Graph Explorer에서 새 토큰을 발급받아 SHAREPOINT_ACCESS_TOKEN을 업데이트하세요. 또는 Refresh Token을 설정하여 자동 갱신을 활성화하세요.');
        } else {
          throw new Error('Access Token이 만료되었고 자동 갱신에 실패했습니다. Refresh Token을 확인하세요.');
        }
      }
      if (error.response) {
        throw new Error(`Failed to load Excel file: ${error.response.status} ${error.response.statusText}`);
      }
      throw new Error(`Failed to load Excel file: ${error.message}`);
    }
  }

  /**
   * Excel 파일을 SharePoint에 업로드
   */
  private async saveWorkbook(): Promise<void> {
    if (!this.workbook) {
      throw new Error('No workbook to save');
    }

    try {
      // Excel 파일을 버퍼로 변환
      const buffer = XLSX.write(this.workbook, { type: 'buffer', bookType: 'xlsx' });
      const serverRelativeUrl = this.getServerRelativeUrl();

      // Request Digest 가져오기
      const requestDigest = await this.getRequestDigest();

      // PUT 방식으로 파일 업로드 (더 간단하고 안정적)
      await this.axiosInstance.put(
        `/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`,
        buffer,
        {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-RequestDigest': requestDigest,
            'IF-MATCH': '*', // 덮어쓰기 허용
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      logger.info('Excel file saved successfully');
      // 워크북 캐시 초기화 (다음 로드 시 최신 데이터 가져오기)
      this.workbook = null;
    } catch (error: any) {
      logger.error('Error saving Excel file:', error);
      if (error.response) {
        logger.error('Response data:', error.response.data);
        throw new Error(`Failed to save Excel file: ${error.response.status} ${error.response.statusText}`);
      }
      throw new Error(`Failed to save Excel file: ${error.message}`);
    }
  }

  /**
   * ServerRelativeUrl 생성
   * 예: /sites/portal2/Shared Documents/AJ_Networks_면접_자동화.xlsx
   */
  private getServerRelativeUrl(): string {
    const url = new URL(this.siteUrl);
    const pathMatch = url.pathname.match(/\/sites\/([^\/]+)/);
    if (!pathMatch) {
      throw new Error('Invalid SharePoint site URL format');
    }
    const sitePath = pathMatch[0]; // /sites/portal2
    return `${sitePath}${this.filePath}`;
  }

  /**
   * 폴더 경로 추출
   */
  private getFolderPath(): string {
    const serverRelativeUrl = this.getServerRelativeUrl();
    const lastSlash = serverRelativeUrl.lastIndexOf('/');
    return serverRelativeUrl.substring(0, lastSlash);
  }

  /**
   * 파일명 추출
   */
  private getFileName(): string {
    const lastSlash = this.filePath.lastIndexOf('/');
    return this.filePath.substring(lastSlash + 1);
  }

  /**
   * SharePoint Request Digest 가져오기 (파일 업로드에 필요)
   */
  private async getRequestDigest(): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/_api/contextinfo', {}, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
        },
      });
      
      // 응답 형식에 따라 파싱
      if (response.data.d && response.data.d.GetContextWebInformation) {
        return response.data.d.GetContextWebInformation.FormDigestValue;
      }
      if (response.data.FormDigestValue) {
        return response.data.FormDigestValue;
      }
      
      logger.warn('Request digest not found in response, trying without it');
      return '';
    } catch (error: any) {
      logger.warn('Failed to get request digest:', error.message);
      // Request Digest 없이도 시도 (일부 경우 작동할 수 있음)
      return '';
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

  async updateInterview(id: string, updates: Partial<InterviewRow>): Promise<void> {
    const rows = await this.readWorksheet('interviews');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === id);
    
    if (index === -1) {
      throw new Error(`Interview ${id} not found`);
    }

    const row = rows[index];
    if (updates.main_notice !== undefined) row[1] = updates.main_notice;
    if (updates.team_name !== undefined) row[2] = updates.team_name;
    if (updates.proposed_date !== undefined) row[3] = updates.proposed_date;
    if (updates.proposed_start_time !== undefined) row[4] = updates.proposed_start_time;
    if (updates.proposed_end_time !== undefined) row[5] = updates.proposed_end_time;
    if (updates.status !== undefined) row[6] = updates.status;
    if (updates.updated_at !== undefined) row[9] = updates.updated_at;

    const workbook = await this.loadWorkbook();
    workbook.Sheets['interviews'] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
  }

  async deleteInterview(interviewId: string): Promise<void> {
    const workbook = await this.loadWorkbook();
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

      await this.saveWorkbook();
      logger.info(`Interview ${interviewId} and all related data deleted`);
    } catch (error) {
      logger.error(`Error deleting interview ${interviewId}:`, error);
      throw error;
    }
  }

  async updateInterviewStatus(interviewId: string, status: string): Promise<void> {
    await this.updateInterview(interviewId, { 
      status: status as InterviewRow['status'],
      updated_at: new Date().toISOString()
    });
  }

  // 나머지 메서드들도 동일한 패턴으로 구현...
  // (간결성을 위해 주요 메서드만 보여줌, 나머지는 동일한 패턴)

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

    const workbook = await this.loadWorkbook();
    workbook.Sheets['interviewers'] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();

    return { created, updated };
  }

  // 나머지 메서드들은 기존 SharePointExcelService와 동일한 패턴으로 구현
  // 전체 구현은 파일 크기 때문에 생략하고, 주요 패턴만 보여줌
  
  // Placeholder 메서드들 (전체 구현 필요)
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

  async createInterviewCandidates(candidates: InterviewCandidateRow[]): Promise<void> {
    for (const candidate of candidates) {
      await this.appendRow('interview_candidates', [
        candidate.interview_id,
        candidate.candidate_id,
        candidate.sequence,
        candidate.scheduled_start_time,
        candidate.scheduled_end_time,
        candidate.created_at,
      ]);
    }
  }

  async createInterviewCandidate(mapping: Omit<InterviewCandidateRow, 'created_at'>): Promise<void> {
    await this.createInterviewCandidates([{
      ...mapping,
      created_at: new Date().toISOString(),
    }]);
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

  async createCandidateInterviewers(mappings: CandidateInterviewerRow[]): Promise<void> {
    for (const mapping of mappings) {
      await this.appendRow('candidate_interviewers', [
        mapping.interview_id,
        mapping.candidate_id,
        mapping.interviewer_id,
        mapping.role,
        mapping.created_at,
      ]);
    }
  }

  async createCandidateInterviewer(mapping: Omit<CandidateInterviewerRow, 'created_at'>): Promise<void> {
    await this.createCandidateInterviewers([{
      ...mapping,
      created_at: new Date().toISOString(),
    }]);
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

  async createInterviewInterviewers(mappings: InterviewInterviewerRow[]): Promise<void> {
    for (const mapping of mappings) {
      await this.appendRow('interview_interviewers', [
        mapping.interview_id,
        mapping.interviewer_id,
        mapping.responded_at || '',
        mapping.reminder_sent_count || 0,
        mapping.last_reminder_sent_at || '',
      ]);
    }
  }

  async createInterviewInterviewer(mapping: Omit<InterviewInterviewerRow, 'responded_at' | 'reminder_sent_count' | 'last_reminder_sent_at'>): Promise<void> {
    await this.createInterviewInterviewers([{
      ...mapping,
      responded_at: null,
      reminder_sent_count: 0,
      last_reminder_sent_at: null,
    }]);
  }

  async updateRespondedAt(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    
    if (index === -1) {
      throw new Error(`Mapping not found for interview ${interviewId} and interviewer ${interviewerId}`);
    }

    const now = new Date().toISOString();
    rows[index][2] = now; // responded_at

    const workbook = await this.loadWorkbook();
    workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
  }

  async updateReminderSent(interviewId: string, interviewerId: string): Promise<void> {
    const rows = await this.readWorksheet('interview_interviewers');
    const index = rows.findIndex((row, idx) => idx > 0 && row[0] === interviewId && row[1] === interviewerId);
    
    if (index === -1) {
      throw new Error(`Mapping not found for interview ${interviewId} and interviewer ${interviewerId}`);
    }

    const now = new Date().toISOString();
    rows[index][3] = (Number(rows[index][3]) || 0) + 1; // reminder_sent_count
    rows[index][4] = now; // last_reminder_sent_at

    const workbook = await this.loadWorkbook();
    workbook.Sheets['interview_interviewers'] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
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

  async getTimeSelections(interviewId: string, interviewerId?: string): Promise<TimeSelectionRow[]> {
    const rows = await this.readWorksheet('time_selections');
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => {
        if (row[1] !== interviewId) return false; // interview_id는 두 번째 컬럼
        if (interviewerId && row[2] !== interviewerId) return false; // interviewer_id는 세 번째 컬럼
        return true;
      })
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

  async getTimeSelectionsByInterview(interviewId: string): Promise<TimeSelectionRow[]> {
    return this.getTimeSelections(interviewId);
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

  async getConfirmedSchedules(interviewId: string): Promise<ConfirmedScheduleRow[]> {
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

  async getConfirmedSchedule(interviewId: string): Promise<ConfirmedScheduleRow | null> {
    const schedules = await this.getConfirmedSchedules(interviewId);
    return schedules.length > 0 ? schedules[0] : null;
  }

  async getConfirmedSchedulesByCandidate(interviewId: string, candidateId: string): Promise<ConfirmedScheduleRow | null> {
    const schedules = await this.getConfirmedSchedules(interviewId);
    return schedules.find(s => s.candidate_id === candidateId) || null;
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

    const workbook = await this.loadWorkbook();
    workbook.Sheets['config'] = XLSX.utils.aoa_to_sheet(rows);
    await this.saveWorkbook();
    
    return { updated, created };
  }
}
