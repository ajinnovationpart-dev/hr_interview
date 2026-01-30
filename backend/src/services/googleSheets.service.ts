import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from '../utils/logger';

// 환경 변수 로드
dotenv.config();

// ========== Interfaces ==========

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

export class GoogleSheetsService {
  private appsScriptUrl: string;
  private apiKey: string;

  constructor() {
    this.appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL!;
    this.apiKey = process.env.GOOGLE_APPS_SCRIPT_API_KEY!;

    if (!this.appsScriptUrl) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL environment variable is required');
    }
    if (!this.apiKey) {
      throw new Error('GOOGLE_APPS_SCRIPT_API_KEY environment variable is required');
    }
  }

  // Helper: Call Google Apps Script API
  private async callAPI(action: string, params: any = {}, method: 'GET' | 'POST' = 'GET') {
    try {
      const url = new URL(this.appsScriptUrl);
      url.searchParams.set('apiKey', this.apiKey);
      url.searchParams.set('action', action);
      
      if (method === 'GET') {
        Object.keys(params).forEach(key => {
          url.searchParams.set(key, params[key]);
        });
        const response = await axios.get(url.toString());
        return response.data;
      } else {
        const response = await axios.post(url.toString(), {
          apiKey: this.apiKey,
          action,
          ...params
        });
        return response.data;
      }
    } catch (error: any) {
      logger.error(`Error calling Google Apps Script API (${action}):`, error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'API 호출 실패');
      }
      throw error;
    }
  }

  // ========== Interviews ==========

  async getAllInterviews(): Promise<InterviewRow[]> {
    const result = await this.callAPI('getInterviews');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async getInterviewById(interviewId: string): Promise<InterviewRow | null> {
    const result = await this.callAPI('getInterview', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async createInterview(interview: Omit<InterviewRow, 'created_at' | 'updated_at'>): Promise<void> {
    const result = await this.callAPI('createInterview', { data: interview }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  async updateInterviewStatus(interviewId: string, status: InterviewRow['status']): Promise<void> {
    const result = await this.callAPI('updateInterviewStatus', { interviewId, status }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  // ========== Candidates ==========

  async getAllCandidates(): Promise<CandidateRow[]> {
    const result = await this.callAPI('getCandidates');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async getCandidatesByInterview(interviewId: string): Promise<CandidateRow[]> {
    const result = await this.callAPI('getCandidatesByInterview', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async createCandidate(candidate: Omit<CandidateRow, 'created_at'>): Promise<void> {
    const result = await this.callAPI('createCandidate', { data: candidate }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  // ========== Interview-Candidate Mapping ==========

  async createInterviewCandidate(mapping: Omit<InterviewCandidateRow, 'created_at'>): Promise<void> {
    const result = await this.callAPI('createInterviewCandidate', { data: mapping }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  async getInterviewCandidates(interviewId: string): Promise<InterviewCandidateRow[]> {
    const result = await this.callAPI('getInterviewCandidates', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  // ========== Candidate-Interviewer Mapping (N:N) ==========

  async createCandidateInterviewer(mapping: Omit<CandidateInterviewerRow, 'created_at'>): Promise<void> {
    const result = await this.callAPI('createCandidateInterviewer', { data: mapping }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  async getCandidateInterviewers(interviewId: string, candidateId: string): Promise<CandidateInterviewerRow[]> {
    const result = await this.callAPI('getCandidateInterviewers', { interviewId, candidateId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  // ========== Interviewers ==========

  async getAllInterviewers(): Promise<InterviewerRow[]> {
    const result = await this.callAPI('getInterviewers');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async getInterviewerById(interviewerId: string): Promise<InterviewerRow | null> {
    const result = await this.callAPI('getInterviewer', { interviewerId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async getInterviewerByEmail(email: string): Promise<InterviewerRow | null> {
    const interviewers = await this.getAllInterviewers();
    return interviewers.find(iv => iv.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createOrUpdateInterviewers(interviewers: Omit<InterviewerRow, 'created_at'>[]): Promise<{ created: number; updated: number }> {
    const result = await this.callAPI('createOrUpdateInterviewers', { data: interviewers }, 'POST');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  // ========== Interview-Interviewer Mapping ==========

  async getInterviewInterviewers(interviewId: string): Promise<InterviewInterviewerRow[]> {
    const result = await this.callAPI('getInterviewInterviewers', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async createInterviewInterviewers(mappings: Omit<InterviewInterviewerRow, 'responded_at' | 'reminder_sent_count' | 'last_reminder_sent_at'>[]): Promise<void> {
    const result = await this.callAPI('createInterviewInterviewers', { data: mappings }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  async updateRespondedAt(interviewId: string, interviewerId: string): Promise<void> {
    const result = await this.callAPI('updateRespondedAt', { interviewId, interviewerId }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  async updateReminderSent(interviewId: string, interviewerId: string): Promise<void> {
    const result = await this.callAPI('updateReminderSent', { interviewId, interviewerId }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  // ========== Time Selections ==========

  async getTimeSelectionsByInterview(interviewId: string): Promise<TimeSelectionRow[]> {
    const result = await this.callAPI('getTimeSelections', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async createTimeSelections(selections: Omit<TimeSelectionRow, 'created_at'>[]): Promise<void> {
    const result = await this.callAPI('createTimeSelections', { data: selections }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  // ========== Confirmed Schedules ==========

  async getConfirmedSchedule(interviewId: string): Promise<ConfirmedScheduleRow | null> {
    const result = await this.callAPI('getConfirmedSchedule', { interviewId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async getConfirmedSchedulesByCandidate(interviewId: string, candidateId: string): Promise<ConfirmedScheduleRow | null> {
    const result = await this.callAPI('getConfirmedSchedulesByCandidate', { interviewId, candidateId });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async createConfirmedSchedule(schedule: Omit<ConfirmedScheduleRow, 'confirmed_at'>): Promise<void> {
    const result = await this.callAPI('createConfirmedSchedule', { data: schedule }, 'POST');
    if (!result.success) throw new Error(result.message);
  }

  // ========== Config ==========

  async getConfig(): Promise<Record<string, string>> {
    const result = await this.callAPI('getConfig');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  async updateConfig(config: Record<string, string>): Promise<{ updated: number; created: number }> {
    const result = await this.callAPI('updateConfig', { data: config }, 'POST');
    if (!result.success) throw new Error(result.message);
    return result.data;
  }
}

export const googleSheetsService = new GoogleSheetsService();
