import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { TimeSlot } from './commonSlot.service';

export interface SelectionData {
  interviewerId: string;
  interviewerName?: string;
  availableSlots: TimeSlot[];
}

export interface GeminiAnalysisResult {
  success: boolean;
  commonSlots: TimeSlot[];
  error?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.isAvailable = true;
        logger.info('✅ Gemini AI service initialized');
      } catch (error) {
        logger.error('❌ Failed to initialize Gemini AI:', error);
        this.isAvailable = false;
      }
    } else {
      logger.warn('⚠️ GEMINI_API_KEY not found in environment variables');
      this.isAvailable = false;
    }
  }

  /**
   * Gemini AI를 사용하여 공통 시간대를 분석합니다.
   * 여러 면접관의 가용 시간 중 모든 면접관이 가능한 시간대를 찾습니다.
   */
  async findCommonSlots(selections: SelectionData[]): Promise<GeminiAnalysisResult> {
    if (!this.isAvailable || !this.genAI) {
      return {
        success: false,
        commonSlots: [],
        error: 'Gemini AI is not available. Please set GEMINI_API_KEY in environment variables.',
      };
    }

    if (selections.length === 0) {
      return {
        success: false,
        commonSlots: [],
        error: 'No selections provided',
      };
    }

    try {
      // 분석 데이터 준비
      const analysisData = selections.map(s => ({
        interviewerId: s.interviewerId,
        interviewerName: s.interviewerName || s.interviewerId,
        availableSlots: s.availableSlots,
      }));

      const prompt = `
You are an expert recruitment coordinator for AJ Networks.
Analyze the available time slots provided by multiple interviewers and find ALL common time slots where EVERY single interviewer is available.

Data:
${JSON.stringify(analysisData, null, 2)}

Rules:
1. Find time slots where ALL interviewers are available (intersection of all schedules)
2. If there are overlapping time ranges (e.g., Interviewer A is free 10:00-12:00, Interviewer B is free 11:00-13:00), the common slot is the intersection (11:00-12:00)
3. Group results by date
4. Return only valid JSON array of TimeSlot objects with format: { date: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm" }
5. Sort results by date (earliest first), then by startTime
6. If no common slots exist, return an empty array

Output format (JSON array):
[
  { "date": "2025-02-01", "startTime": "10:00", "endTime": "11:00" },
  { "date": "2025-02-01", "startTime": "14:00", "endTime": "15:00" }
]
`;

      const model = this.genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-pro' 
      });

      logger.info(`🤖 Starting Gemini AI analysis for ${selections.length} interviewers`);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSON 파싱 시도
      let parsedSlots: TimeSlot[] = [];
      
      try {
        // JSON 코드 블록 제거 (```json ... ```)
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
        const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        parsedSlots = JSON.parse(jsonText.trim());
      } catch (parseError) {
        logger.error('Failed to parse Gemini response as JSON:', text);
        // 텍스트에서 직접 추출 시도
        const dateTimeMatches = text.matchAll(/(\d{4}-\d{2}-\d{2}).*?(\d{2}:\d{2}).*?(\d{2}:\d{2})/g);
        for (const match of dateTimeMatches) {
          parsedSlots.push({
            date: match[1],
            startTime: match[2],
            endTime: match[3],
          });
        }
      }

      // 유효성 검증
      const validSlots = parsedSlots.filter(slot => 
        slot.date && 
        slot.startTime && 
        slot.endTime &&
        /^\d{4}-\d{2}-\d{2}$/.test(slot.date) &&
        /^\d{2}:\d{2}$/.test(slot.startTime) &&
        /^\d{2}:\d{2}$/.test(slot.endTime)
      );

      // 중복 제거 및 정렬
      const uniqueSlots = Array.from(
        new Map(validSlots.map(s => [`${s.date}-${s.startTime}-${s.endTime}`, s])).values()
      );

      uniqueSlots.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      logger.info(`✅ Gemini AI found ${uniqueSlots.length} common slots`);

      return {
        success: true,
        commonSlots: uniqueSlots,
      };
    } catch (error: any) {
      logger.error('❌ Gemini AI analysis error:', error);
      return {
        success: false,
        commonSlots: [],
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Gemini AI 사용 가능 여부 확인
   */
  isGeminiAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * 자연어 질문에 대한 답변 생성 (챗봇)
   * @param systemContext 역할별로 준비된 데이터 요약(면접 목록, 내 일정 등)
   * @param userMessage 사용자 질문
   */
  async chat(systemContext: string, userMessage: string): Promise<string> {
    if (!this.isAvailable || !this.genAI) {
      return 'AI 서비스가 설정되지 않았습니다. GEMINI_API_KEY를 확인해 주세요.';
    }

    try {
      const prompt = `당신은 AJ Networks 면접/채용 시스템의 도우미 챗봇입니다.
아래 [참고 데이터]만 사용해서 질문에 친절하고 간결하게 답변하세요. 데이터에 없는 내용은 "해당 정보가 없습니다" 등으로 답하고 추측하지 마세요.

[참고 데이터]
${systemContext}

[사용자 질문]
${userMessage}

[답변] (한국어, 요점 정리, 불릿 가능):`;

      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-pro',
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text()?.trim() || '답변을 생성하지 못했습니다.';
    } catch (error: any) {
      logger.error('Gemini chat error:', error);
      const msg = error?.message || '';
      if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota') || msg.includes('Quota exceeded')) {
        return '요청 한도를 초과했습니다. 무료 한도는 모델별·일별 제한이 있습니다.\n\n• 잠시 후(약 1분) 다시 시도해 보세요.\n• .env에서 GEMINI_MODEL을 지우거나 gemini-pro 로 두고 사용해 보세요. (gemini-2.0-flash 는 무료 한도가 없을 수 있음)\n• 한도 확인: https://ai.google.dev/gemini-api/docs/rate-limits';
      }
      return `일시적인 오류가 발생했습니다. (${msg || 'Unknown error'})`;
    }
  }
}

export const geminiService = new GeminiService();
