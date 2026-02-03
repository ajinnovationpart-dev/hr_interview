/**
 * 통합 데이터 서비스
 * 환경 변수에 따라 Google Sheets 또는 SharePoint Excel 사용
 */

import { googleSheetsService } from './googleSheets.service';
import { sharePointExcelService } from './sharePointExcel.service';
import { SharePointRestService } from './sharePointRest.service';
import { OneDriveLocalService } from './oneDriveLocal.service';
import { logger } from '../utils/logger';

// Google Sheets와 SharePoint Excel의 공통 인터페이스
export interface IDataService {
  // Interviews
  getAllInterviews(): Promise<any[]>;
  getInterviewById(interviewId: string): Promise<any | null>;
  createInterview(interview: any): Promise<void>;
  updateInterview(interviewId: string, updates: any): Promise<void>;
  updateInterviewStatus(interviewId: string, status: string): Promise<void>;
  deleteInterview(interviewId: string): Promise<void>;

  // Candidates
  getAllCandidates(): Promise<any[]>;
  getCandidateById(candidateId: string): Promise<any | null>;
  getCandidatesByInterview(interviewId: string): Promise<any[]>;
  createCandidate(candidate: any): Promise<void>;
  updateCandidate(candidateId: string, updates: any): Promise<void>;
  updateCandidateStatus(candidateId: string, status: string): Promise<void>;

  // Interview-Candidate Mapping
  createInterviewCandidate(mapping: any): Promise<void>;
  getInterviewCandidates(interviewId: string): Promise<any[]>;

  // Candidate-Interviewer Mapping
  createCandidateInterviewer(mapping: any): Promise<void>;
  getCandidateInterviewers(interviewId: string, candidateId: string): Promise<any[]>;

  // Interviewers
  getAllInterviewers(): Promise<any[]>;
  getInterviewerById(interviewerId: string): Promise<any | null>;
  getInterviewerByEmail(email: string): Promise<any | null>;
  createOrUpdateInterviewers(interviewers: any[]): Promise<{ created: number; updated: number }>;

  // Interview-Interviewer Mapping
  getInterviewInterviewers(interviewId: string): Promise<any[]>;
  createInterviewInterviewers(mappings: any[]): Promise<void>;
  updateInterviewInterviewers(interviewId: string, interviewerIds: string[]): Promise<void>;
  updateRespondedAt(interviewId: string, interviewerId: string): Promise<void>;
  updateReminderSent(interviewId: string, interviewerId: string): Promise<void>;

  // Time Selections
  getTimeSelectionsByInterview(interviewId: string): Promise<any[]>;
  createTimeSelections(selections: any[]): Promise<void>;

  // Confirmed Schedules
  getConfirmedSchedule(interviewId: string): Promise<any | null>;
  getConfirmedSchedulesByCandidate(interviewId: string, candidateId: string): Promise<any | null>;
  createConfirmedSchedule(schedule: any): Promise<void>;

  // Rooms
  getAllRooms(): Promise<any[]>;
  getRoomById(roomId: string): Promise<any | null>;
  createRoom(room: any): Promise<void>;
  updateRoom(roomId: string, updates: any): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  getRoomAvailability(roomId: string, date: string): Promise<any[]>;

  // Interview History
  createInterviewHistory(history: any): Promise<void>;
  getInterviewHistory(interviewId: string): Promise<any[]>;

  // Config
  getConfig(): Promise<Record<string, string>>;
  updateConfig(config: Record<string, string>): Promise<{ updated: number; created: number }>;
}

// SharePoint REST API 서비스 인스턴스 (환경 변수로 선택)
let sharePointRestServiceInstance: SharePointRestService | null = null;

try {
  if (process.env.SHAREPOINT_ENABLED === 'true' && process.env.SHAREPOINT_USE_REST_API === 'true') {
    sharePointRestServiceInstance = new SharePointRestService();
    logger.info('SharePoint REST API service initialized');
  }
} catch (error) {
  logger.warn('SharePoint REST API service not initialized:', error);
}

// OneDrive Local 서비스 인스턴스 (환경 변수로 선택)
let oneDriveLocalServiceInstance: OneDriveLocalService | null = null;

try {
  if (process.env.ONEDRIVE_ENABLED === 'true') {
    oneDriveLocalServiceInstance = new OneDriveLocalService();
    logger.info('OneDrive Local service initialized');
  }
} catch (error) {
  logger.warn('OneDrive Local service not initialized:', error);
}

// 환경 변수에 따라 서비스 선택
function getDataService(): IDataService {
  const useOneDrive = process.env.ONEDRIVE_ENABLED === 'true';
  const useSharePoint = process.env.SHAREPOINT_ENABLED === 'true';
  const useRestApi = process.env.SHAREPOINT_USE_REST_API === 'true';

  // OneDrive Local 우선 사용
  if (useOneDrive && oneDriveLocalServiceInstance) {
    logger.info('Using OneDrive Local (synchronized Excel) as data storage');
    return oneDriveLocalServiceInstance;
  }

  if (useSharePoint) {
    // REST API 우선 사용
    if (useRestApi && sharePointRestServiceInstance) {
      logger.info('Using SharePoint REST API as data storage');
      return sharePointRestServiceInstance;
    }
    
    // Graph API 사용
    if (sharePointExcelService) {
      logger.info('Using SharePoint Excel (Graph API) as data storage');
      return sharePointExcelService;
    }
    
    throw new Error('SharePoint service is not configured. Check SHAREPOINT_ACCESS_TOKEN and related environment variables.');
  } else {
    logger.info('Using Google Sheets as data storage');
    return googleSheetsService;
  }
}

export const dataService = getDataService();
