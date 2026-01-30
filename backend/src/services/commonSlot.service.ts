import dayjs from 'dayjs';
import { dataService } from './dataService';
import { logger } from '../utils/logger';

// TimeSelectionRow는 공통 인터페이스에서 가져오거나 별도 정의
export interface TimeSelectionRow {
  selection_id: string;
  interview_id: string;
  interviewer_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CommonSlotResult {
  hasCommon: boolean;
  commonSlots: TimeSlot[];
}

export class CommonSlotService {
  /**
   * 면접의 모든 면접관이 선택한 시간대 중 공통 시간대를 추출합니다.
   * 30분 단위로 처리합니다.
   */
  async findCommonSlots(interviewId: string): Promise<CommonSlotResult> {
    const selections = await dataService.getTimeSelectionsByInterview(interviewId);
    const mappings = await dataService.getInterviewInterviewers(interviewId);

    // 모든 면접관이 응답했는지 확인
    const totalInterviewers = mappings.length;
    const respondedCount = mappings.filter(m => m.responded_at).length;

    if (respondedCount < totalInterviewers) {
      return { hasCommon: false, commonSlots: [] };
    }

    // 면접관별로 선택한 시간대 그룹화
    const selectionsByInterviewer = new Map<string, TimeSlot[]>();
    
    for (const selection of selections) {
      if (!selectionsByInterviewer.has(selection.interviewer_id)) {
        selectionsByInterviewer.set(selection.interviewer_id, []);
      }
      selectionsByInterviewer.get(selection.interviewer_id)!.push({
        date: selection.slot_date,
        startTime: selection.start_time,
        endTime: selection.end_time,
      });
    }

    // 모든 면접관이 선택한 시간대 찾기
    const commonSlots = this.findIntersection(Array.from(selectionsByInterviewer.values()));

    logger.info(`Found ${commonSlots.length} common slots for interview ${interviewId}`);

    return {
      hasCommon: commonSlots.length > 0,
      commonSlots,
    };
  }

  /**
   * 여러 면접관의 시간대 목록에서 교집합을 찾습니다.
   */
  private findIntersection(slotGroups: TimeSlot[][]): TimeSlot[] {
    if (slotGroups.length === 0) return [];
    if (slotGroups.length === 1) return slotGroups[0];

    // 첫 번째 그룹을 기준으로 시작
    let common = slotGroups[0];

    // 나머지 그룹들과 교집합 계산
    for (let i = 1; i < slotGroups.length; i++) {
      common = this.intersectTwoGroups(common, slotGroups[i]);
      if (common.length === 0) break; // 공통 시간대가 없으면 조기 종료
    }

    return common;
  }

  /**
   * 두 시간대 그룹의 교집합을 찾습니다.
   * 날짜, 시작 시간, 종료 시간이 모두 일치해야 공통 시간대로 인정합니다.
   */
  private intersectTwoGroups(group1: TimeSlot[], group2: TimeSlot[]): TimeSlot[] {
    const common: TimeSlot[] = [];

    for (const slot1 of group1) {
      for (const slot2 of group2) {
        if (
          slot1.date === slot2.date &&
          slot1.startTime === slot2.startTime &&
          slot1.endTime === slot2.endTime
        ) {
          common.push(slot1);
          break; // 중복 방지
        }
      }
    }

    return common;
  }

  /**
   * 시간대를 날짜와 시간 순으로 정렬합니다.
   */
  sortSlots(slots: TimeSlot[]): TimeSlot[] {
    return [...slots].sort((a, b) => {
      const dateCompare = dayjs(a.date).diff(dayjs(b.date));
      if (dateCompare !== 0) return dateCompare;
      
      const timeCompare = a.startTime.localeCompare(b.startTime);
      return timeCompare;
    });
  }
}

export const commonSlotService = new CommonSlotService();
