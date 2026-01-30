/**
 * 30분 단위 타임 슬롯 유틸리티
 */

export interface TimeSlot {
  time: string;      // "09:00"
  label: string;     // "오전 9:00"
  disabled: boolean; // 점심시간 등
}

export interface TimeSlotConfig {
  startTime?: string;
  endTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
  interval?: number;
}

/**
 * 30분 단위 타임 슬롯 생성
 */
export function generateTimeSlots(config?: TimeSlotConfig): TimeSlot[] {
  const {
    startTime = '09:00',
    endTime = '18:00',
    lunchStart = '12:00',
    lunchEnd = '13:00',
    interval = 30
  } = config || {};

  const slots: TimeSlot[] = [];
  
  // 시작 시간을 분 단위로 변환
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const [lunchStartHour, lunchStartMin] = lunchStart.split(':').map(Number);
  const [lunchEndHour, lunchEndMin] = lunchEnd.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const lunchStartMinutes = lunchStartHour * 60 + lunchStartMin;
  const lunchEndMinutes = lunchEndHour * 60 + lunchEndMin;

  // interval 분 단위로 슬롯 생성
  for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
    const hour = Math.floor(minutes / 60);
    const min = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    // 점심시간 체크
    const isLunchTime = minutes >= lunchStartMinutes && minutes < lunchEndMinutes;
    
    slots.push({
      time: timeString,
      label: formatTimeLabel(hour, min),
      disabled: isLunchTime
    });
  }

  return slots;
}

/**
 * 시간 라벨 포맷팅
 */
function formatTimeLabel(hour: number, min: number): string {
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  const displayMin = min === 0 ? '' : `:${min.toString().padStart(2, '0')}`;
  
  return `${period} ${displayHour}${displayMin}시`;
}

/**
 * 면접 종료 시간 자동 계산
 */
export function calculateEndTime(
  startTime: string,
  candidatesCount: number,
  interviewDuration: number = 30
): string {
  const [hour, min] = startTime.split(':').map(Number);
  const startMinutes = hour * 60 + min;
  const endMinutes = startMinutes + (candidatesCount * interviewDuration);
  
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
}

/**
 * 각 면접자별 시간 슬롯 계산
 */
export function calculateCandidateSlots(
  startTime: string,
  candidates: Array<{ id: string; name: string }>,
  interviewDuration: number = 30
): Array<{ candidateId: string; startTime: string; endTime: string }> {
  const [startHour, startMin] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMin;
  
  return candidates.map((candidate, index) => {
    const slotStartMinutes = currentMinutes + (index * interviewDuration);
    const slotEndMinutes = slotStartMinutes + interviewDuration;
    
    const startH = Math.floor(slotStartMinutes / 60);
    const startM = slotStartMinutes % 60;
    const endH = Math.floor(slotEndMinutes / 60);
    const endM = slotEndMinutes % 60;
    
    return {
      candidateId: candidate.id,
      startTime: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
      endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    };
  });
}

/**
 * 최소 사전 통보 시간 확인
 */
export function checkMinNoticeHours(
  proposedDate: string,
  proposedTime: string,
  minNoticeHours: number = 48
): boolean {
  const proposed = new Date(`${proposedDate}T${proposedTime}`);
  const now = new Date();
  const hoursDiff = (proposed.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff >= minNoticeHours;
}
