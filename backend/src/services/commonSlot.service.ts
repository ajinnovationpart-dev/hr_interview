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

  /** 30분 단위(interval) 분 */
  private static readonly SLOT_INTERVAL_MINUTES = 30;

  /**
   * 하나의 시간대를 30분 단위 서브 슬롯으로 분해합니다.
   * 예: 09:00~12:00 → [09:00~09:30, 09:30~10:00, ..., 11:30~12:00]
   */
  private expandTo30MinSlots(slot: TimeSlot): TimeSlot[] {
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const result: TimeSlot[] = [];
    while (startMinutes + this.SLOT_INTERVAL_MINUTES <= endMinutes) {
      const endSlotMinutes = startMinutes + this.SLOT_INTERVAL_MINUTES;
      const h = Math.floor(startMinutes / 60);
      const m = startMinutes % 60;
      const eh = Math.floor(endSlotMinutes / 60);
      const em = endSlotMinutes % 60;
      result.push({
        date: slot.date,
        startTime: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        endTime: `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`,
      });
      startMinutes = endSlotMinutes;
    }
    return result;
  }

  /**
   * 면접관별 슬롯 목록을 각각 30분 단위로 분해한 뒤, 모든 면접관에게 공통인 30분 슬롯의 교집합을 구합니다.
   * (완전 일치만 인정하던 기존 방식에서, 시간 범위 overlap 방식으로 변경)
   */
  private findIntersection(slotGroups: TimeSlot[][]): TimeSlot[] {
    if (slotGroups.length === 0) return [];
    if (slotGroups.length === 1) {
      const expanded = new Map<string, TimeSlot>();
      for (const s of slotGroups[0]) {
        for (const sub of this.expandTo30MinSlots(s)) {
          const key = `${sub.date}|${sub.startTime}|${sub.endTime}`;
          if (!expanded.has(key)) expanded.set(key, sub);
        }
      }
      return this.sortSlots(Array.from(expanded.values()));
    }

    // 각 그룹을 30분 단위로 분해한 집합으로 변환
    const sets = slotGroups.map(group => {
      const set = new Map<string, TimeSlot>();
      for (const s of group) {
        for (const sub of this.expandTo30MinSlots(s)) {
          const key = `${sub.date}|${sub.startTime}|${sub.endTime}`;
          if (!set.has(key)) set.set(key, sub);
        }
      }
      return set;
    });

    // 첫 번째 집합의 키 중 모든 집합에 있는 키만 공통
    const first = sets[0];
    const common: TimeSlot[] = [];
    for (const key of first.keys()) {
      if (sets.every(set => set.has(key))) {
        common.push(first.get(key)!);
      }
    }
    return this.sortSlots(common);
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
