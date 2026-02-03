/**
 * 면접 관련 타입 정의
 */

export type InterviewStatus = 
  | 'PENDING'      // 대기 (면접관 응답 대기)
  | 'PARTIAL'      // 부분 응답 (일부 면접관만 응답)
  | 'CONFIRMED'    // 확정 (일정 확정됨)
  | 'SCHEDULED'    // 예정 (확정 후 대기)
  | 'IN_PROGRESS'  // 진행중
  | 'COMPLETED'    // 완료
  | 'CANCELLED'    // 취소
  | 'NO_SHOW'      // 노쇼
  | 'NO_COMMON';   // 공통 일정 없음

export type InterviewerRole = 'PRIMARY' | 'SECONDARY' | 'OBSERVER';

export type CandidateStatus = 
  | 'applied'      // 지원
  | 'screening'    // 서류심사
  | 'interviewing' // 면접 진행중
  | 'offer'        // 제안
  | 'rejected'     // 불합격
  | 'withdrawn';   // 지원 취소

export type RoomStatus = 'available' | 'maintenance' | 'reserved';

export interface Room {
  room_id: string;
  room_name: string;
  location: string;
  capacity: number;
  facilities: string[];
  status: RoomStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewHistory {
  history_id: string;
  interview_id: string;
  change_type: 'status' | 'schedule' | 'interviewer' | 'room' | 'notes';
  old_value: string;  // JSON
  new_value: string;  // JSON
  changed_by: string;
  changed_at: string;
  reason?: string;
}

export interface ScheduleConflict {
  type: 'interviewer' | 'room' | 'candidate';
  resourceId: string;
  resourceName: string;
  conflictingInterviews: string[];
  message: string;
}
