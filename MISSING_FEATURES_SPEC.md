# 누락된 기능 상세 명세서

## 1. 면접실 관리 기능

### 1.1 데이터 구조
```typescript
interface Room {
  room_id: string;          // PK
  room_name: string;        // 면접실 이름
  location: string;         // 위치 (예: "본관 3층")
  capacity: number;         // 수용 인원
  facilities: string[];     // 시설 (예: ["빔프로젝터", "화이트보드", "화상회의"])
  status: 'available' | 'maintenance' | 'reserved';  // 상태
  notes?: string;           // 비고
  created_at: string;
  updated_at: string;
}
```

### 1.2 API 명세

**GET /api/rooms**
```typescript
// 면접실 목록 조회
// Response
{
  success: boolean;
  data: Room[];
}
```

**POST /api/rooms**
```typescript
// 면접실 등록
// Request
{
  room_name: string;
  location: string;
  capacity: number;
  facilities?: string[];
  notes?: string;
}

// Response
{
  success: boolean;
  data: { room_id: string; message: string; }
}
```

**PUT /api/rooms/:id**
```typescript
// 면접실 정보 수정
```

**DELETE /api/rooms/:id**
```typescript
// 면접실 삭제 (사용 중인 면접이 있으면 삭제 불가)
```

**GET /api/rooms/:id/availability**
```typescript
// 특정 날짜의 면접실 가용성 조회
// Query: date=YYYY-MM-DD
// Response
{
  success: boolean;
  data: {
    room: Room;
    date: string;
    availableSlots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      bookedInterviewId?: string;
    }>;
  }
}
```

---

## 2. 면접 상태 관리 강화

### 2.1 면접 상태 확장
```typescript
type InterviewStatus = 
  | 'PENDING'      // 대기 (면접관 응답 대기)
  | 'PARTIAL'      // 부분 응답 (일부 면접관만 응답)
  | 'CONFIRMED'    // 확정 (일정 확정됨)
  | 'SCHEDULED'    // 예정 (확정 후 대기)
  | 'IN_PROGRESS'  // 진행중
  | 'COMPLETED'    // 완료
  | 'CANCELLED'    // 취소
  | 'NO_SHOW'      // 노쇼
  | 'NO_COMMON';   // 공통 일정 없음
```

### 2.2 상태 변경 API

**PUT /api/interviews/:id/status**
```typescript
// 면접 상태 변경
// Request
{
  status: InterviewStatus;
  reason?: string;  // 취소/노쇼 사유
}

// 구현 로직
async function updateInterviewStatus(interviewId: string, newStatus: InterviewStatus, reason?: string) {
  // 1. 현재 상태 확인
  const interview = await dataService.getInterviewById(interviewId);
  
  // 2. 상태 변경 가능 여부 검증
  validateStatusTransition(interview.status, newStatus);
  
  // 3. 상태 업데이트
  await dataService.updateInterviewStatus(interviewId, newStatus);
  
  // 4. 상태별 후속 처리
  switch (newStatus) {
    case 'CANCELLED':
      // 취소 알림 발송
      await sendCancellationNotifications(interviewId, reason);
      break;
    case 'IN_PROGRESS':
      // 면접 시작 처리
      await markInterviewStarted(interviewId);
      break;
    case 'COMPLETED':
      // 면접 완료 처리
      await markInterviewCompleted(interviewId);
      // 평가 요청 프로세스 시작 (선택적)
      break;
    case 'NO_SHOW':
      // 노쇼 처리
      await handleNoShow(interviewId, reason);
      break;
  }
  
  // 5. 상태 변경 이력 기록
  await logStatusChange(interviewId, interview.status, newStatus, reason);
}

// 상태 전환 검증
function validateStatusTransition(current: InterviewStatus, next: InterviewStatus): void {
  const allowedTransitions: Record<InterviewStatus, InterviewStatus[]> = {
    'PENDING': ['PARTIAL', 'CONFIRMED', 'CANCELLED', 'NO_COMMON'],
    'PARTIAL': ['CONFIRMED', 'CANCELLED', 'NO_COMMON'],
    'CONFIRMED': ['SCHEDULED', 'CANCELLED'],
    'SCHEDULED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],  // 최종 상태
    'CANCELLED': [],  // 최종 상태
    'NO_SHOW': [],    // 최종 상태
    'NO_COMMON': ['CANCELLED']
  };
  
  if (!allowedTransitions[current]?.includes(next)) {
    throw new Error(`상태 전환이 불가능합니다: ${current} → ${next}`);
  }
}
```

---

## 3. 면접 일정 수정/취소 기능

### 3.1 면접 일정 수정

**PUT /api/interviews/:id/schedule**
```typescript
// 면접 일정 변경
// Request
{
  interviewDate?: string;      // YYYY-MM-DD
  startTime?: string;          // HH:mm
  duration?: number;           // 분
  roomId?: string;
  interviewerIds?: string[];   // 면접관 변경
}

// 구현 로직
async function updateInterviewSchedule(interviewId: string, updates: ScheduleUpdate) {
  // 1. 현재 면접 정보 조회
  const interview = await dataService.getInterviewById(interviewId);
  
  // 2. 변경 가능 여부 확인 (완료/취소된 면접은 변경 불가)
  if (['COMPLETED', 'CANCELLED'].includes(interview.status)) {
    throw new Error('완료되거나 취소된 면접은 변경할 수 없습니다.');
  }
  
  // 3. 변경 사항 검증
  if (updates.interviewDate || updates.startTime) {
    // 새로운 일정의 충돌 확인
    const conflicts = await checkScheduleConflicts({
      interviewId,  // 자기 자신은 제외
      date: updates.interviewDate || interview.proposed_date,
      startTime: updates.startTime || interview.proposed_start_time,
      duration: updates.duration || calculateDuration(interview),
      interviewerIds: updates.interviewerIds || await getInterviewerIds(interviewId),
      roomId: updates.roomId || interview.room_id
    });
    
    if (conflicts.hasConflict) {
      throw new Error(`일정 충돌이 발생합니다: ${conflicts.message}`);
    }
  }
  
  // 4. 면접 정보 업데이트
  const updatedInterview = {
    ...interview,
    ...(updates.interviewDate && { proposed_date: updates.interviewDate }),
    ...(updates.startTime && { proposed_start_time: updates.startTime }),
    ...(updates.duration && { 
      proposed_end_time: calculateEndTime(updates.startTime || interview.proposed_start_time, updates.duration)
    }),
    ...(updates.roomId && { room_id: updates.roomId }),
    updated_at: new Date().toISOString()
  };
  
  await dataService.updateInterview(interviewId, updatedInterview);
  
  // 5. 면접관 변경 처리
  if (updates.interviewerIds) {
    await updateInterviewInterviewers(interviewId, updates.interviewerIds);
  }
  
  // 6. 변경 알림 발송
  await sendScheduleChangeNotifications(interviewId, {
    oldSchedule: interview,
    newSchedule: updatedInterview,
    changes: getChangeSummary(interview, updatedInterview)
  });
  
  // 7. 변경 이력 기록
  await logScheduleChange(interviewId, interview, updatedInterview);
}

// 변경 알림 발송
async function sendScheduleChangeNotifications(interviewId: string, changeInfo: any) {
  const interview = await getInterviewDetails(interviewId);
  const recipients = [
    ...interview.interviewers.map(i => i.email),
    interview.candidate_email
  ];
  
  for (const recipient of recipients) {
    await emailService.sendEmail({
      to: [recipient],
      subject: `[면접 일정 변경] ${interview.main_notice}`,
      htmlBody: generateScheduleChangeEmail(changeInfo)
    });
  }
}
```

### 3.2 면접 취소

**POST /api/interviews/:id/cancel**
```typescript
// 면접 취소
// Request
{
  reason: string;  // 취소 사유
  notifyAll?: boolean;  // 모든 관련자에게 알림 (기본: true)
}

// 구현 로직
async function cancelInterview(interviewId: string, reason: string, notifyAll: boolean = true) {
  // 1. 면접 정보 조회
  const interview = await dataService.getInterviewById(interviewId);
  
  // 2. 취소 가능 여부 확인
  if (interview.status === 'COMPLETED') {
    throw new Error('완료된 면접은 취소할 수 없습니다.');
  }
  
  // 3. 상태 변경
  await dataService.updateInterviewStatus(interviewId, 'CANCELLED');
  
  // 4. 취소 사유 저장
  await dataService.updateInterview(interviewId, {
    cancellation_reason: reason,
    cancelled_at: new Date().toISOString(),
    cancelled_by: getCurrentUserId()
  });
  
  // 5. 취소 알림 발송
  if (notifyAll) {
    await sendCancellationNotifications(interviewId, reason);
  }
  
  // 6. 관련 리소스 해제 (면접실 등)
  await releaseInterviewResources(interviewId);
}
```

---

## 4. 면접관 역할 관리

### 4.1 데이터 구조 확장

**Interview-Interviewer 매핑 확장**
```typescript
interface InterviewInterviewerMapping {
  interview_id: string;
  interviewer_id: string;
  role: 'PRIMARY' | 'SECONDARY' | 'OBSERVER';  // 주면접관, 보조면접관, 참관
  responded_at: string | null;
  reminder_sent_count: number;
  last_reminder_sent_at: string | null;
  created_at: string;
}
```

### 4.2 역할 기반 로직

```typescript
// 면접 생성 시 역할 자동 할당
async function assignInterviewerRoles(interviewId: string, interviewerIds: string[]) {
  const mappings = [];
  
  for (let i = 0; i < interviewerIds.length; i++) {
    const interviewer = await dataService.getInterviewerById(interviewerIds[i]);
    
    // 팀장급이면 주면접관, 아니면 보조면접관
    const role = interviewer.is_team_lead ? 'PRIMARY' : (i === 0 ? 'PRIMARY' : 'SECONDARY');
    
    mappings.push({
      interview_id: interviewId,
      interviewer_id: interviewerIds[i],
      role,
      responded_at: null,
      reminder_sent_count: 0,
      last_reminder_sent_at: null
    });
  }
  
  await dataService.createInterviewInterviewers(mappings);
}

// 주면접관 필수 확인
async function validatePrimaryInterviewer(interviewId: string): Promise<boolean> {
  const mappings = await dataService.getInterviewInterviewers(interviewId);
  return mappings.some(m => m.role === 'PRIMARY');
}
```

---

## 5. 면접 일정 조회 및 검색 강화

### 5.1 고급 필터링 API

**GET /api/interviews/search**
```typescript
// Query Parameters
{
  startDate?: string;        // YYYY-MM-DD
  endDate?: string;
  status?: string[];         // 여러 상태 필터
  interviewerId?: string;
  candidateId?: string;
  candidateName?: string;    // 지원자 이름 검색
  mainNotice?: string;       // 공고명 검색
  teamName?: string;         // 팀명 검색
  roomId?: string;
  hasCommonSlot?: boolean;   // 공통 일정 있는지
  sortBy?: 'date' | 'created' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Response
{
  success: boolean;
  data: {
    interviews: Interview[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    filters: {
      applied: Record<string, any>;
      available: {
        statuses: InterviewStatus[];
        interviewers: Interviewer[];
        rooms: Room[];
      };
    };
  };
}
```

### 5.2 면접관별 스케줄 조회

**GET /api/interviewers/:id/schedule**
```typescript
// 특정 면접관의 일정 조회
// Query Parameters
{
  startDate?: string;
  endDate?: string;
  view?: 'day' | 'week' | 'month';
}

// Response
{
  success: boolean;
  data: {
    interviewer: Interviewer;
    schedule: Array<{
      date: string;
      interviews: Array<{
        interviewId: string;
        candidateName: string;
        position: string;
        startTime: string;
        endTime: string;
        roomName: string;
        role: 'PRIMARY' | 'SECONDARY' | 'OBSERVER';
        status: InterviewStatus;
      }>;
      availableSlots: Array<{
        startTime: string;
        endTime: string;
        available: boolean;
      }>;
    }>;
    statistics: {
      totalInterviews: number;
      completedInterviews: number;
      upcomingInterviews: number;
      averageDuration: number;
    };
  };
}
```

### 5.3 캘린더 뷰 API

**GET /api/interviews/calendar**
```typescript
// 캘린더 형식으로 일정 조회
// Query Parameters
{
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  view: 'month' | 'week' | 'day';
  interviewerId?: string;
  roomId?: string;
}

// Response
{
  success: boolean;
  data: {
    events: Array<{
      id: string;
      title: string;
      start: string;  // ISO 8601
      end: string;
      allDay: boolean;
      resource: {
        interviewId: string;
        candidateName: string;
        interviewers: string[];
        roomName: string;
        status: InterviewStatus;
      };
      color?: string;  // 상태별 색상
    }>;
    conflicts: Array<{
      type: 'interviewer' | 'room' | 'candidate';
      resourceId: string;
      conflictingInterviews: string[];
    }>;
  };
}
```

---

## 6. 면접 완료 후 처리

### 6.1 면접 완료 처리

**POST /api/interviews/:id/complete**
```typescript
// 면접 완료 처리
// Request
{
  completedAt?: string;  // ISO 8601 (기본: 현재 시간)
  notes?: string;        // 면접 메모
  actualDuration?: number;  // 실제 소요 시간 (분)
}

// 구현 로직
async function completeInterview(interviewId: string, data: CompleteInterviewData) {
  // 1. 면접 정보 조회
  const interview = await dataService.getInterviewById(interviewId);
  
  // 2. 상태 확인
  if (interview.status !== 'IN_PROGRESS' && interview.status !== 'SCHEDULED') {
    throw new Error('진행 중인 면접만 완료 처리할 수 있습니다.');
  }
  
  // 3. 상태 변경
  await dataService.updateInterviewStatus(interviewId, 'COMPLETED');
  
  // 4. 완료 정보 저장
  await dataService.updateInterview(interviewId, {
    completed_at: data.completedAt || new Date().toISOString(),
    interview_notes: data.notes,
    actual_duration: data.actualDuration,
    updated_at: new Date().toISOString()
  });
  
  // 5. 면접관 참석 확인 업데이트
  await updateInterviewerAttendance(interviewId);
  
  // 6. 완료 알림 발송 (선택적)
  await sendCompletionNotifications(interviewId);
}
```

### 6.2 노쇼 처리

**POST /api/interviews/:id/no-show**
```typescript
// 노쇼 처리
// Request
{
  noShowType: 'candidate' | 'interviewer' | 'both';
  reason?: string;
  interviewerId?: string;  // 노쇼한 면접관 ID (noShowType이 'interviewer'일 때)
}

// 구현 로직
async function handleNoShow(interviewId: string, data: NoShowData) {
  const interview = await dataService.getInterviewById(interviewId);
  
  // 1. 노쇼 정보 저장
  await dataService.updateInterview(interviewId, {
    status: 'NO_SHOW',
    no_show_type: data.noShowType,
    no_show_reason: data.reason,
    no_show_at: new Date().toISOString()
  });
  
  // 2. 면접관 노쇼인 경우 해당 면접관만 기록
  if (data.noShowType === 'interviewer' && data.interviewerId) {
    await dataService.updateInterviewInterviewer(interviewId, data.interviewerId, {
      no_show: true,
      no_show_reason: data.reason
    });
  }
  
  // 3. 노쇼 알림 발송
  await sendNoShowNotifications(interviewId, data);
  
  // 4. 통계 업데이트
  await updateNoShowStatistics(interviewId, data);
}
```

---

## 7. 면접 이력 관리

### 7.1 변경 이력 테이블

**Interview History (Sheet: interview_history)**
```typescript
interface InterviewHistory {
  history_id: string;        // PK
  interview_id: string;     // FK
  change_type: 'status' | 'schedule' | 'interviewer' | 'room' | 'notes';
  old_value: string;        // JSON
  new_value: string;        // JSON
  changed_by: string;       // 사용자 ID
  changed_at: string;       // ISO 8601
  reason?: string;
}
```

### 7.2 이력 조회 API

**GET /api/interviews/:id/history**
```typescript
// 면접 변경 이력 조회
// Response
{
  success: boolean;
  data: {
    interviewId: string;
    history: Array<{
      changeType: string;
      oldValue: any;
      newValue: any;
      changedBy: string;
      changedAt: string;
      reason?: string;
    }>;
  };
}
```

---

## 8. 면접관 가용성 조회 API

**GET /api/interviewers/:id/availability**
```typescript
// 면접관 가용성 조회
// Query Parameters
{
  startDate: string;    // YYYY-MM-DD
  endDate: string;
  duration?: number;     // 분 (기본: 60)
}

// Response
{
  success: boolean;
  data: {
    interviewer: Interviewer;
    availability: Array<{
      date: string;
      availableSlots: Array<{
        startTime: string;
        endTime: string;
        available: boolean;
        reason?: string;  // 불가능한 경우 사유
      }>;
      existingInterviews: Array<{
        interviewId: string;
        candidateName: string;
        startTime: string;
        endTime: string;
      }>;
      dailyInterviewCount: number;
      maxDailyInterviews: number;
    }>;
  };
}
```

---

## 9. 일괄 작업 기능

### 9.1 일괄 면접 생성

**POST /api/interviews/batch**
```typescript
// 여러 면접을 한 번에 생성
// Request
{
  interviews: Array<{
    candidateId: string;
    interviewDate: string;
    startTime: string;
    duration: number;
    interviewerIds: string[];
    roomId?: string;
    interviewType: string;
    stage: string;
  }>;
  options: {
    skipConflicts?: boolean;  // 충돌 시 건너뛰기
    sendNotifications?: boolean;
  };
}

// Response
{
  success: boolean;
  data: {
    created: number;
    skipped: number;
    failed: number;
    results: Array<{
      index: number;
      success: boolean;
      interviewId?: string;
      error?: string;
    }>;
  };
}
```

### 9.2 일괄 상태 변경

**PUT /api/interviews/batch/status**
```typescript
// 여러 면접의 상태를 한 번에 변경
// Request
{
  interviewIds: string[];
  status: InterviewStatus;
  reason?: string;
}

// Response
{
  success: boolean;
  data: {
    updated: number;
    failed: number;
    results: Array<{
      interviewId: string;
      success: boolean;
      error?: string;
    }>;
  };
}
```

---

## 10. 통계 및 리포트 기능

### 10.1 기본 통계 API

**GET /api/statistics/overview**
```typescript
// 전체 통계 개요
// Query Parameters
{
  startDate?: string;
  endDate?: string;
  department?: string;
}

// Response
{
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
    };
    interviews: {
      total: number;
      byStatus: Record<InterviewStatus, number>;
      byStage: Record<string, number>;
      averageDuration: number;
    };
    interviewers: {
      total: number;
      active: number;
      topPerformers: Array<{
        interviewerId: string;
        name: string;
        interviewCount: number;
        averageRating?: number;
      }>;
    };
    candidates: {
      total: number;
      byStatus: Record<string, number>;
    };
    rooms: {
      total: number;
      utilization: Array<{
        roomId: string;
        roomName: string;
        utilizationRate: number;
        totalBookings: number;
      }>;
    };
    trends: {
      dailyInterviews: Array<{
        date: string;
        count: number;
      }>;
      weeklyInterviews: Array<{
        week: string;
        count: number;
      }>;
    };
  };
}
```

### 10.2 면접관별 통계

**GET /api/interviewers/:id/statistics**
```typescript
// 특정 면접관의 통계
// Query Parameters
{
  startDate?: string;
  endDate?: string;
}

// Response
{
  success: boolean;
  data: {
    interviewer: Interviewer;
    statistics: {
      totalInterviews: number;
      completedInterviews: number;
      cancelledInterviews: number;
      noShowCount: number;
      averageDuration: number;
      byRole: {
        primary: number;
        secondary: number;
        observer: number;
      };
      byStage: Record<string, number>;
      monthlyTrend: Array<{
        month: string;
        count: number;
      }>;
    };
  };
}
```

### 10.3 면접실 사용률 통계

**GET /api/rooms/statistics**
```typescript
// 면접실 사용률 통계
// Query Parameters
{
  startDate: string;
  endDate: string;
}

// Response
{
  success: boolean;
  data: {
    rooms: Array<{
      roomId: string;
      roomName: string;
      location: string;
      totalBookings: number;
      totalHours: number;
      utilizationRate: number;  // 백분율
      peakHours: Array<{
        hour: string;
        bookingCount: number;
      }>;
      averageDuration: number;
    }>;
    overall: {
      totalRooms: number;
      averageUtilization: number;
      mostUsedRoom: string;
      leastUsedRoom: string;
    };
  };
}
```

---

## 11. 지원자(면접자) 상세 관리

### 11.1 지원자 정보 확장

**Candidates 테이블 확장**
```typescript
interface Candidate {
  candidate_id: string;        // PK
  name: string;
  email: string;
  phone: string;
  position_applied: string;    // 지원 직무
  resume_url?: string;         // 이력서 파일 경로
  cover_letter_url?: string;   // 자기소개서 파일 경로
  application_date: string;    // 지원일
  source?: string;             // 지원 경로 (예: "채용사이트", "추천")
  status: 'applied' | 'screening' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';
  current_stage?: string;      // 현재 단계
  notes?: string;              // 메모
  created_at: string;
  updated_at: string;
}
```

### 11.2 지원자 관리 API

**GET /api/candidates**
```typescript
// 지원자 목록 조회
// Query Parameters
{
  status?: string;
  position?: string;
  search?: string;  // 이름/이메일 검색
  page?: number;
  limit?: number;
}

// Response
{
  success: boolean;
  data: {
    candidates: Candidate[];
    pagination: Pagination;
  };
}
```

**GET /api/candidates/:id**
```typescript
// 지원자 상세 정보
// Response
{
  success: boolean;
  data: {
    candidate: Candidate;
    interviews: Array<{
      interviewId: string;
      interviewDate: string;
      stage: string;
      status: InterviewStatus;
      interviewers: string[];
      result?: string;
    }>;
    timeline: Array<{
      date: string;
      event: string;
      description: string;
    }>;
  };
}
```

**PUT /api/candidates/:id/status**
```typescript
// 지원자 상태 변경
// Request
{
  status: CandidateStatus;
  notes?: string;
}
```

---

## 12. 알림 시스템 강화

### 12.1 알림 설정 관리

**GET /api/notifications/settings**
```typescript
// 알림 설정 조회
// Response
{
  success: boolean;
  data: {
    email: {
      interviewScheduled: boolean;
      interviewReminder: boolean;
      interviewCancelled: boolean;
      interviewChanged: boolean;
      reminderHours: number[];  // [24, 2] = 24시간 전, 2시간 전
    };
    sms?: {
      enabled: boolean;
      interviewReminder: boolean;
    };
  };
}
```

**PUT /api/notifications/settings**
```typescript
// 알림 설정 변경
```

### 12.2 알림 발송 이력

**GET /api/notifications/history**
```typescript
// 알림 발송 이력 조회
// Query Parameters
{
  interviewId?: string;
  recipient?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// Response
{
  success: boolean;
  data: {
    notifications: Array<{
      notificationId: string;
      interviewId: string;
      recipient: string;
      type: string;
      subject: string;
      status: 'sent' | 'failed' | 'pending';
      sentAt: string;
      error?: string;
    }>;
  };
}
```

---

## 13. 데이터 내보내기 기능

### 13.1 Excel 내보내기

**GET /api/interviews/export**
```typescript
// 면접 일정 Excel 내보내기
// Query Parameters
{
  startDate?: string;
  endDate?: string;
  format?: 'xlsx' | 'csv';
  includeDetails?: boolean;
}

// Response: Excel/CSV 파일 다운로드
```

### 13.2 리포트 생성

**POST /api/reports/generate**
```typescript
// 커스텀 리포트 생성
// Request
{
  reportType: 'monthly' | 'weekly' | 'custom';
  startDate: string;
  endDate: string;
  metrics: string[];
  groupBy?: string[];
  format: 'pdf' | 'excel';
}

// Response
{
  success: boolean;
  data: {
    reportId: string;
    downloadUrl: string;
    expiresAt: string;
  };
}
```

---

## 14. 구현 우선순위

### Phase 1: 필수 기능 (2주)
1. 면접실 관리 (CRUD)
2. 면접 상태 관리 강화
3. 면접 일정 수정/취소
4. 면접 완료/노쇼 처리
5. 면접 이력 관리

### Phase 2: 조회 및 검색 강화 (1주)
1. 고급 필터링 API
2. 면접관별 스케줄 조회
3. 캘린더 뷰 API
4. 면접관 가용성 조회

### Phase 3: 통계 및 리포트 (1주)
1. 기본 통계 API
2. 면접관별 통계
3. 면접실 사용률 통계
4. Excel 내보내기

### Phase 4: 고급 기능 (1주)
1. 일괄 작업 기능
2. 지원자 상세 관리
3. 알림 시스템 강화
4. 리포트 생성

---

이 명세서를 기반으로 구현을 시작하시겠습니까?
