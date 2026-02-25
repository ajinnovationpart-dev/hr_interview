# 면접 일정 자동화 시스템 — 기능명세서

## 1. 시스템 개요

- **목적**: 면접 일정 조율·면접관 응답 수집·확정 일정 안내·지원자/면접관 관리·평가 및 통계를 한 곳에서 처리하는 웹 시스템.
- **사용자**: 관리자(인사/채용), 면접관.
- **저장소**: 환경 변수에 따라 OneDrive(Excel 동기화), Google Sheets, SharePoint 중 선택.

---

## 2. 권한 및 역할

| 역할 | 로그인 경로 | 접근 범위 |
|------|-------------|-----------|
| **관리자** | `/auth/login` (허용된 이메일) | 관리자 메뉴 전부: 대시보드, 면접·면접관·면접실·지원자·통계·캘린더·설정 |
| **면접관** | `/interviewer/login` (이메일+비밀번호) | 면접관 포털: 내 면접 목록, 담당 지원자, 이력서 보기, 평가, 일정 수락 |

---

## 3. 관리자 메뉴별 기능명세

### 3.1 대시보드 (`/admin/dashboard`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 면접 현황 요약 | 상태별 면접 건수 표시 | 대기 중(PENDING), 진행 중(PARTIAL), 완료(CONFIRMED), 공통 없음(NO_COMMON) |
| 최근 면접 목록 | 최근 등록 면접 목록 테이블 | 공고명, 팀명, 상태, 생성일, 상세 이동 버튼 |
| 검색 | 공고명/팀명 텍스트 검색 | 클라이언트 필터 |
| 상태 필터 | 전체/대기 중/진행 중/완료/공통 없음 | 드롭다운 |
| 상세 이동 | 행 클릭 시 해당 면접 상세 페이지로 이동 | |
| 면접 등록 버튼 | `/admin/interviews/new`로 이동 | |
| 공통 없음 안내 | NO_COMMON 상태 설명 툴팁/문구 | "면접관이 모두 응답했으나 겹치는 시간대가 없어 확정되지 않은 상태" |

**API**: `GET /interviews/dashboard`

---

### 3.2 면접 목록 (`/admin/interviews`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 목록 조회 | 면접 목록 테이블 (페이징) | 공고명, 팀명, 상태, 제안 일시, 면접자 수, 면접관 수, 면접실, 상세 버튼 |
| 고급 검색 | 공고명, 팀명, 기간(startDate~endDate), 상태, 면접관, 면접실, 지원자 등 조건 | `GET /interviews/search` 쿼리 파라미터 |
| 정렬 | 생성일/날짜 기준 정렬 | sortBy, sortOrder |
| 상태 표시 | PENDING(대기 중), PARTIAL(진행 중), CONFIRMED(완료), CANCELLED(취소), NO_SHOW(노쇼), NO_COMMON(공통 없음) 등 태그 | |
| 상세 보기 | 행 또는 "상세보기" 클릭 시 `/admin/interviews/:id` 이동 | |

**API**: `GET /interviews/search`, `GET /interviewers`, `GET /rooms`

---

### 3.3 면접 등록 (`/admin/interviews/new`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 공고명 | 필수 입력 | |
| 팀명 | 필수 입력 | |
| 제안 일시 | 날짜 + 시작 시/분 (종료 시간은 면접자 수×30분 자동 계산) | 업무 시간/점심 시간 설정 반영 가능 |
| 면접자 목록 | 1명 이상, 각 면접자: 이름, 이메일, 전화, 지원 직무, 담당 면접관(1~5명, 팀장급 1명 필수) | Form.List로 동적 추가/삭제 |
| 면접관 선택 | 부서별 그룹, 팀장 표시, 비활성/이메일 없는 면접관 선택 불가 | |
| 이력서 첨부 | 면접자별 선택( PDF, DOC, HWP, TXT 등) | 저장 후 자동 업로드(POST /resumes/upload), OneDrive 사용 시 동기화 폴더에 저장 |
| 유효성 검사 | 팀장급 1명 이상 포함, 담당 면접관 1~5명 | |
| 저장 | 면접·면접자·면접-면접자·면접관-면접자 매핑 생성 후, 선택 면접관에게 "일정 확인 요청" 메일 발송 | 응답에 candidates[].candidateId 포함 → 이력서 업로드에 사용 |
| 메일 발송 결과 | 발송 성공/실패/스킵 건수 및 미발송 사유 토스트 표시 | |

**API**: `POST /interviews`, `GET /interviewers`, `GET /config`, `POST /resumes/upload`

---

### 3.4 면접 상세 (`/admin/interviews/:id`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 기본 정보 표시 | 공고명, 팀명, 면접자명, 제안/확정 일시, 상태 | |
| 면접관 응답 현황 | 면접관별 응답 완료/미응답, 응답 시각 | 미등록 면접관 안내 툴팁 |
| 리마인더 발송 | 미응답 면접관에게 일정 확인 리마인더 메일 발송 | `POST /interviews/:id/remind` |
| 포털 링크 복사 | 면접관별 면접관 포털 링크 복사 | `GET /interviews/:id/portal-link/:interviewerId` |
| 선택된 시간대 | 면접관이 제출한 가능 시간대 테이블 | |
| AI 분석 | 제출된 시간대 기반 공통 시간대 자동 계산 | `POST /interviews/:id/analyze`, CONFIRMED 전만 가능 |
| 공통 시간대 표시 | AI 분석 결과로 나온 공통 슬롯 목록 | |
| 일정 수정 | 확정 전에 제안 일시/시간 수정 | Modal + PUT /interviews/:id/schedule |
| 면접 취소 | 사유 입력 후 취소 처리, 이력 생성 | `POST /interviews/:id/cancel` |
| 면접 완료 | 완료 처리, 이력 생성 | `POST /interviews/:id/complete` |
| 노쇼 처리 | 지원자 노쇼/면접관 노쇼 선택, 사유 입력 | `POST /interviews/:id/no-show` |
| 평가 탭 | 해당 면접의 면접관별 평가 목록(점수, 합격여부, 코멘트 등) | `GET /interviews/:id/evaluations` |
| 이력 탭 | 면접 상태 변경 이력 | `GET /interviews/:id/history` |
| 삭제 | 면접 삭제(확인 후) | `DELETE /interviews/:id` |

**API**: `GET /interviews/:id`, `GET /interviews/:id/evaluations`, `GET /config`, `POST /interviews/:id/analyze`, `POST /interviews/:id/remind`, `DELETE /interviews/:id`, `PUT /interviews/:id/schedule`, `POST /interviews/:id/cancel`, `POST /interviews/:id/complete`, `POST /interviews/:id/no-show`, `GET /interviews/:id/history`, `GET /interviews/:id/portal-link/:interviewerId`

---

### 3.5 면접관 관리 (`/admin/interviewers`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 목록 조회 | 면접관 테이블(이름, 이메일, 부서, 직책, 팀장 여부, 활성 여부, 연락처) | |
| 검색 | 이름/이메일/부서 등 텍스트 검색 | |
| 엑셀 업로드 | 면접관 일괄 등록/수정 (엑셀 파일) | `POST /interviewers/upload` |
| 추가 | 단건 등록(이름, 이메일, 부서, 직책, 팀장, 활성, 연락처), 임시 비밀번호 자동 생성 및 표시 | `POST /interviewers` (generatePassword: true) |
| 수정 | 기존 면접관 정보 수정 | `PUT /interviewers/:id` |
| 삭제 | 면접관 삭제(확인) | `DELETE /interviewers/:id` |
| 테스트 메일 | 해당 면접관 이메일로 테스트 메일 발송 | `POST /interviewers/:id/test-email` |
| 비밀번호 재설정 | 임시 비밀번호 재발급, 모달에 표시 | `PUT /interviewers/:id/password` (generatePassword: true) |
| 로그인 주소 안내 | 면접관 로그인 URL: `/interviewer/login` | |

**API**: `GET /interviewers`, `POST /interviewers`, `PUT /interviewers/:id`, `DELETE /interviewers/:id`, `POST /interviewers/upload`, `POST /interviewers/:id/test-email`, `PUT /interviewers/:id/password`

---

### 3.6 면접실 관리 (`/admin/rooms`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 목록 조회 | 면접실 테이블(이름, 위치, 수용 인원, 시설, 상태, 비고) | |
| 추가 | 면접실 등록 | `POST /rooms` |
| 수정 | 면접실 정보 수정 | `PUT /rooms/:id` |
| 삭제 | 면접실 삭제(확인) | `DELETE /rooms/:id` |
| 가용 일정 조회 | 특정 면접실의 특정 날짜 가용 슬롯(선택) | `GET /rooms/:id/availability?date=YYYY-MM-DD` |

**API**: `GET /rooms`, `POST /rooms`, `PUT /rooms/:id`, `DELETE /rooms/:id`, `GET /rooms/:id/availability`  
**참고**: Google Sheets 저장소 사용 시 면접실 기능 미지원(OneDrive/SharePoint 필요).

---

### 3.7 지원자 관리 (`/admin/candidates`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 목록 조회 | 지원자 테이블, 페이징 | 이름, 이메일, 지원 직무, 상태, 비고 등 |
| 검색/필터 | 텍스트 검색, 상태 필터 | |
| 상세 보기 | `/admin/candidates/:id` — 지원자 상세 및 관련 면접 이력 | |
| 추가 | 단건 지원자 등록(이름, 이메일, 전화, 지원 직무, 이력서 URL, 상태, 비고, 포트폴리오 URL) | `POST /candidates` |
| 수정 | 지원자 정보/상태 수정 | `PUT /candidates/:id` |
| 상태 변경 | 지원/서류심사/면접 진행중/제안/불합격/지원 취소 | `PUT /candidates/:id/status` |

**API**: `GET /candidates`, `GET /candidates/:id`, `POST /candidates`, `PUT /candidates/:id`, `PUT /candidates/:id/status`

---

### 3.8 지원자 상세 (`/admin/candidates/:id`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 기본 정보 | 이름, 이메일, 전화, 지원 직무, 상태, 이력서 URL, 비고, 포트폴리오 | |
| 면접 이력 | 해당 지원자가 참여한 면접 목록 | |
| 이력서 보기 | resume_url 링크로 다운로드/새 탭 | |

**API**: `GET /candidates/:id`

---

### 3.9 통계 및 리포트 (`/admin/statistics`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 기간/부서 필터 | 조회 기간(startDate~endDate), 부서 선택 | |
| 통계 개요 | 상태별 면접 건수, 면접관별 참여 건수, 평가 통계(합격률, 평균 점수 등) | `GET /statistics/overview` |
| 면접실별 통계 | 면접실별 예약/사용 건수 | `GET /statistics/rooms` |
| 면접관별 상세 | 특정 면접관 선택 시 해당 면접관 참여 면접·평가 요약 | `GET /statistics/interviewers/:id` |
| 엑셀 내보내기 | 기간 내 면접 목록 엑셀 다운로드(상세 포함 옵션) | `GET /export/interviews` (blob) |

**API**: `GET /statistics/overview`, `GET /statistics/rooms`, `GET /statistics/interviewers/:id`, `GET /export/interviews`

---

### 3.10 면접관 스케줄 (`/admin/interviewer-schedule`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 면접관 선택 | 드롭다운으로 면접관 선택 | |
| 기간/뷰 | 일/주/월 뷰, 기간 선택 | |
| 스케줄 표시 | 해당 면접관의 해당 기간 내 면접 일정 테이블(날짜, 면접명, 지원자, 역할, 시간, 면접실, 상태) | `GET /interviewers/:id/schedule` |
| 가용 슬롯 | 30분 단위 가용 시간대 표시(선택) | |

**API**: `GET /interviewers`, `GET /interviewers/:id/schedule`

---

### 3.11 캘린더 뷰 (`/admin/calendar`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 캘린더 표시 | 월/주/일 뷰, 기간 선택 | |
| 면접 이벤트 | 면접 일정을 캘린더 셀에 배지/리스트로 표시 | 상태별 색상 |
| 필터 | 면접관, 면접실 필터 | |
| 이벤트 클릭 | 해당 면접 상세 정보 모달(공고명, 팀, 일시, 면접자, 면접관, 면접실, 충돌 경고 등) | |
| 충돌 표시 | 면접관/면접실 충돌 시 경고 표시 | |

**API**: `GET /calendar/interviews`, `GET /rooms`, `GET /interviewers`

---

### 3.12 설정 (`/admin/settings`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 면접 운영 | 면접 소요 시간(분), 업무 시작/종료, 점심 시간, 타임슬롯 간격, 최소/최대 면접관 수, 팀장 필수, 최소 사전 통보 시간 등 | |
| 리마인더 | 1차/2차 리마인더 시간, 최대 리마인더 횟수, D-1 리마인더 시간 | |
| 이메일 | SMTP 발신 이메일/이름/Reply-To, 재시도 횟수, 회사 로고/주소/주차/복장 안내, 인사말/팀명/연락처 등 | |
| 테스트 메일 | 설정된 SMTP로 테스트 메일 발송 | `GET /test-email/status`, 테스트 발송 API 연동 |
| 저장 | 설정 일괄 저장 | `PUT /config` |

**API**: `GET /config`, `PUT /config`, `GET /test-email/status`

---

## 4. 면접관 전용 기능

### 4.1 면접관 로그인 (`/interviewer/login`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 이메일/비밀번호 | 이메일, 비밀번호 입력 후 로그인 | `POST /auth/interviewer/login` |
| 리다이렉트 | 로그인 성공 시 `redirect` 쿼리 있으면 해당 경로(예: `/confirm/:token`)로 이동, 없으면 `/interviewer` | 오픈 리다이렉트 방지(경로가 `/`로 시작하는 경우만) |
| 비활성 계정 | 비활성 면접관 로그인 시 "비활성화된 계정입니다" 등 차단 | |
| 비밀번호 미설정 | 비밀번호가 없는 계정 로그인 시 안내 메시지 | |

**API**: `POST /auth/interviewer/login`

---

### 4.2 일정 확인 — 가능 일정 선택 (`/confirm/:token`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 토큰 검증 | 메일 링크의 토큰으로 면접·면접관 식별 | GET/POST 시 토큰 검증 |
| 면접 정보 표시 | 공고명, 팀명, 면접자, 제안 일시, 응답 현황(예: 2/3명 응답 완료) | |
| 가능 일정 선택 | 날짜+시작/종료 시간 여러 개 입력 후 "일정 제출" | 최소 1개, 업무 시간/점심 제한 적용(설정 기반) |
| 일정 제출 | 선택한 슬롯 저장, 해당 면접관 responded_at 갱신 | `POST /confirm/:token` (selectedSlots) |
| 외부 일정 충돌 | 해당 기간에 이미 일정이 있으면 제출 불가 안내(설정 시) | |
| 이미 확정된 경우 | 면접 상태가 CONFIRMED이면 "가능 일정 선택" 대신 "확정된 일정" 표시 | |
| 확정 일정 수락 | 확정된 면접일 때 "일정 수락하기" 버튼 → 수락 처리 후 "수락 완료" 표시 | `POST /confirm/:token/accept` |

**API**: `GET /confirm/:token`, `POST /confirm/:token`, `POST /confirm/:token/accept`, `GET /config`

---

### 4.3 면접관 포털 (`/interviewer`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 내 면접 목록 | 로그인한 면접관이 참여하는 면접만 테이블로 표시 | 공고명, 팀명, 면접 일시(확정 시 확정 일시), 면접자 수, 상태, 상세보기 |
| 상세 모달 | 면접 상세 정보: 공고명, 팀명, 면접 일시(확정 시 확정 일시), 상태, 일정 수락 여부 | |
| 일정 수락 | 상태가 확정(CONFIRMED)인 면접에서 "일정 수락하기" 버튼 → 수락 후 "수락 완료" 표시 | `POST /interviewer-portal/interviews/:id/accept-schedule` |
| 면접자별 카드 | 담당 면접자만 표시: 이름, 직무, 일정, 이메일, 전화 | |
| 이력서 | 면접자별 "이력서" 버튼 → 다운로드/새 탭 | resume_url 기반 URL 생성 |
| 평가하기 | 면접자별 "평가하기" → 평가 Drawer 오픈, 점수·합격여부·코멘트 등 입력 후 저장 | `GET/POST /interviewer-portal/interviews/:id/candidates/:candidateId/evaluation` |

**API**: `GET /interviewer-portal/interviews`, `GET /interviewer-portal/interviews/:id`, `POST /interviewer-portal/interviews/:id/accept-schedule`, `GET/POST /interviewer-portal/interviews/:id/candidates/:candidateId/evaluation`

---

## 5. 공통·기타

### 5.1 관리자 로그인 (`/auth/login`)

| 기능 | 설명 | 비고 |
|------|------|------|
| 소셜/이메일 로그인 | 설정에 따른 로그인 방식(예: Google OAuth, 이메일 링크 등) | 허용된 이메일(ALLOWED_ADMIN_EMAILS)만 관리자 접근 |
| 콜백 | OAuth 콜백 처리 | `/auth/callback` |

**API**: `POST /auth/login`, `GET /auth/me`

---

### 5.2 챗봇 (관리자/면접관 화면 공통)

| 기능 | 설명 | 비고 |
|------|------|------|
| 표시 조건 | 관리자 또는 면접관으로 로그인한 경우에만 우측 하단 버튼으로 표시 | |
| 질문 입력 | 자연어로 면접/일정 관련 질문 | 예: "신규 등록된 면접이 어떤게 있어?", "내가 들어가야 되는 면접 일정은?" |
| 답변 | 백엔드 AI(LLM) 기반 답변 표시 | `POST /chat` (message) |
| 대화 이력 | 세션 내 사용자/봇 메시지 목록 표시 | |

**API**: `POST /chat`

---

## 6. 메일 발송 요약

| 발송 시점 | 수신자 | 내용 |
|-----------|--------|------|
| 면접 등록 시 | 선택된 면접관 | 일정 확인 요청(제안 일시, 일정 선택 링크 — 로그인 페이지 또는 토큰 링크) |
| 리마인더 | 미응답 면접관 | 일정 확인 리마인더(동일하게 일정 선택 링크) |
| 일정 확정 시 | 해당 면접관 + 지원자(이메일 있으면) | 확정 일정 안내(날짜, 시간) |
| D-1 등 | 설정에 따른 리마인더 | 내일 면접 안내 등(스케줄러 연동) |

**메일 링크**: 면접관 로그인 페이지(`/interviewer/login`)로 이동, 쿼리 `redirect=/confirm/:token` 사용 시 로그인 후 해당 Confirm 페이지로 이동.

---

## 7. 데이터 저장소별 지원 여부 요약

| 기능 | OneDrive(Excel) | Google Sheets | SharePoint |
|------|-----------------|---------------|------------|
| 면접·면접자·면접관·매핑·일정 선택·확정 일정 | ✅ | ✅ | ✅ |
| 이력서 URL 저장(getCandidateById/updateCandidate) | ✅ | ✅ | 스텁 가능 |
| 면접실 CRUD | ✅ | ❌(스텁) | ✅ |
| 면접 이력·평가 | ✅ | ❌(스텁) | ✅ |
| 면접관 비밀번호(로그인) | ✅ | ⚠(구현 확인) | ✅ |
| 면접관 일정 수락(accepted_at) | ✅ | no-op | no-op |

---

## 8. 로직 상세

아래는 기능별 **비즈니스 규칙·데이터 흐름·계산 방식·예외 처리** 등 구현 로직을 정리한 내용이다.

### 8.1 면접 등록 로직

- **ID 생성**
  - 면접 ID: `INT_${Date.now()}`
  - 면접자 ID: `CAND_${Date.now()}_${index}` (등록 폼 순서와 동일한 인덱스 사용)
- **검증 규칙**
  - **스키마**: 공고명·팀명 필수, 제안일 `YYYY-MM-DD`, 제안 시작시간 `HH:mm`, 면접자 1명 이상, 면접자당 담당 면접관 1~5명.
  - **팀장 필수**: `.refine()`으로 전체 선택 면접관 중 `is_team_lead === true`인 사람이 최소 1명 있어야 함. 없으면 "팀장급 이상 1명은 필수로 포함해야 합니다" 에러.
  - **최소 사전 통보 시간**: 설정의 `min_notice_hours`가 0보다 크면, 제안일시가 현재 시각으로부터 해당 시간 이상 이후여야 함. `checkMinNoticeHours(proposedDate, proposedStartTime, minNoticeHours)`로 검사.
- **종료 시간 계산**
  - `proposedEndTime = calculateEndTime(proposedStartTime, 면접자 수, interviewDuration)`  
  - `시작분 + (면접자 수 × 면접 소요 시간(분))`으로 종료 시각 계산(설정의 `interview_duration_minutes`, 기본 30분).
- **면접자별 시간 슬롯**
  - `calculateCandidateSlots(proposedStartTime, candidates, interviewDuration)`: 1번째 면접자 = 제안 시작시간, 2번째 = +30분, … 순서대로 배정. 각 슬롯은 `scheduled_start_time` / `scheduled_end_time`으로 `interview_candidates`에 저장.
- **면접관 ID 정규화**
  - 모든 담당 면접관 ID에 대해 `String(id).trim()` 적용, 빈 문자열 제거, `Set`으로 중복 제거 후 `interview_interviewers`에 매핑.
  - 면접자별 `candidate_interviewers` 저장 시에도 동일하게 trim 적용. 첫 번째 담당 = `PRIMARY`, 나머지 = `SECONDARY`.
- **면접관 존재/활성/이메일**
  - 선택된 ID가 마스터에 없으면 경고 로그만 남기고 저장은 진행(미등록 ID 허용). 이메일 발송 시 해당 ID는 NOT_FOUND로 스킵.
  - **이메일 발송 스킵 조건**: 비활성(`!is_active`) → SKIPPED_INACTIVE, 이메일 없음 → SKIPPED_NO_EMAIL, 이메일 형식 정규식 실패 → SKIPPED_INVALID_EMAIL. 각각 결과 배열에 기록 후 토스트 등으로 노출.
- **저장 순서**
  1. `createInterview` (기본 정보, status = PENDING)
  2. 면접자 루프: `createCandidate` → `createInterviewCandidate`(sequence, scheduled_start_time/end_time) → `createCandidateInterviewer`(면접자별 담당, role PRIMARY/SECONDARY)
  3. `createInterviewInterviewers`(전체 면접관 목록)
  4. 면접관별로 JWT 생성 → Confirm 링크/로그인 링크 생성 → 이메일 발송(담당 면접자 정보 포함)
- **응답**
  - 생성된 `candidates[].candidateId`를 그대로 반환. 프론트는 이 순서대로 이력서 업로드 시 `candidateId`를 붙여 `POST /resumes/upload` 호출.

### 8.2 Confirm(일정 확인) 로직

- **토큰 검증**
  - 경로 파라미터 `:token` 또는 쿼리 `token`을 사용. `verifyToken` 미들웨어에서 `jwt.verify(token, JWT_SECRET)`로 디코딩. 페이로드에 `email`, `role`, `interviewerId`, `interviewId` 포함. 만료 시 401 "토큰이 만료되었습니다. 새 링크를 요청해주세요".
- **GET /confirm/:token**
  - `interviewId`, `interviewerId`로 면접·매핑 조회. `getProposedSlotAndCandidates(interviewId, interview)`로 제안일·후보명 보강(DB에 start_datetime 등이 없을 수 있으므로 `proposed_date`/`confirmed_date` 등으로 보정).
  - 응답 현황: `getInterviewInterviewers`로 `responded_at` 있는 수 → `responseStatus.total`, `responseStatus.responded`, `responseStatus.respondedList`.
  - 상태가 CONFIRMED이면 `getConfirmedSchedule(interviewId)`로 확정 일정 반환, 해당 면접관의 `accepted_at` 있으면 `myAcceptedAt` 반환.
  - 해당 면접관 이메일로 `checkInterviewerHasSchedule(proposedDate, proposedDate, email)` 호출 시 외부 일정 있으면 `externalScheduleExists: true` → 프론트에서 일정 제출 시 제한 가능(제출 시 백엔드에서도 400 처리).
- **가능 일정 선택 UI**: 프론트는 `GET /config`로 업무 시작/종료 시간, 점심 시간, 타임슬롯 간격 등을 받아 30분 단위 슬롯을 생성하고, 점심 시간 구간은 비활성화(선택 불가) 처리. 제출 시 위 스키마로 서버에 전달.
- **POST /confirm/:token (일정 제출)**
  - Body: `selectSlotsSchema` — `selectedSlots[]` 최소 1개, 각각 `date`(YYYY-MM-DD), `startTime`, `endTime`(HH:mm).
  - 이미 CONFIRMED면 400 "이미 확정된 면접입니다".
  - 제안일 기준 외부 일정 있으면 400 "해당 기간에 이미 일정이 있어 일정 선택을 할 수 없습니다".
  - `createTimeSelections(selections)`로 time_selections 저장, `updateRespondedAt(interviewId, interviewerId)` 호출.
  - **상태 전이**:
    - `respondedCount < totalInterviewers` → `updateInterviewStatus(interviewId, 'PARTIAL')`, 메시지 "일정 선택이 완료되었습니다".
    - 전원 응답 + 공통 일정 있음 → 공통 슬롯 계산(아래 8.3) → 첫 번째 슬롯으로 `createConfirmedSchedule`(해당 면접 한 건, candidate_id는 빈 문자열 가능) → `updateInterviewStatus(interviewId, 'CONFIRMED')` → 확정 메일 발송(면접관 + 지원자 이메일 수집).
    - 전원 응답 + 공통 일정 없음 → `updateInterviewStatus(interviewId, 'PARTIAL')`, 메시지 "모든 면접관이 응답했지만 공통 일정이 없습니다".
- **POST /confirm/:token/accept (확정 일정 수락)**
  - 면접 상태가 CONFIRMED일 때만 허용. `updateScheduleAcceptedAt(interviewId, interviewerId)`로 해당 면접관의 일정 수락 시각 저장. 응답에 `acceptedAt` 포함.

### 8.3 공통 시간대(Common Slot) 계산 로직

- **조건**: 해당 면접의 `interview_interviewers` 매핑 기준 **전원** `responded_at`이 있어야 공통 슬롯 계산 수행. 1명이라도 미응답이면 `hasCommon: false`, `commonSlots: []` 반환.
- **집계**: `getTimeSelectionsByInterview(interviewId)`로 각 면접관별 선택 슬롯을 그룹화. 슬롯 단위는 (date, startTime, endTime).
- **교집합**: 날짜·시작시간·종료시간이 **완전 일치**하는 슬롯만 공통으로 인정. `findIntersection`: 첫 번째 면접관 그룹을 기준으로, 나머지 그룹과 `intersectTwoGroups`로 2개씩 교집합을 구해 나감. 한 번이라도 공집합이면 결과 [].
- **정렬**: `sortSlots(slots)` — 날짜 오름차순, 같은 날이면 startTime 오름차순.
- **확정 시**: 공통 슬롯이 있으면 **정렬 후 첫 번째 슬롯**을 확정 일정으로 사용. Confirm 제출 시점에는 `createConfirmedSchedule`에 `candidate_id: ''`로 한 건만 저장하는 구현 가능; 스케줄러 자동 확정(8.5)에서는 면접자별로 `candidate_id`를 넣어 여러 행 저장할 수 있음.

### 8.4 이력서 업로드 로직

- **호출**: 관리자만 `POST /resumes/upload`, `multipart/form-data`: `resume`(파일), `candidateId`(면접 등록 응답의 `candidates[i].candidateId`).
- **매칭**: 프론트는 면접 등록 응답의 `candidates` 배열 **순서**와 업로드할 파일 순서를 일치시켜, 각 파일에 해당하는 `candidateId`를 body에 넣어야 함. 백엔드는 `candidateId`만 보고 `updateCandidate(candidateId, { resume_url })` 호출.
- **저장 경로**: OneDrive 사용 시 `ONEDRIVE_EXCEL_PATH`의 디렉터리 기준 `resumes` 하위; 미사용 시 `RESUME_UPLOAD_DIR` 또는 `uploads/resumes`. 파일명: `{candidateId}_{timestamp}_{원본파일명_정규화}.{ext}`.
- **허용 확장자**: `.pdf`, `.doc`, `.docx`, `.hwp`, `.txt`. 크기 제한 10MB. 실패 시 업로드된 파일 삭제 후 400/500 반환.
- **URL**: 저장 후 `resume_url`에 `/api/resumes/{filename}` 형태로 저장. 다운로드는 `GET /api/resumes/:filename`로 파일 시스템에서 전송.

### 8.5 스케줄러(배치) 로직

- **리마인더 (매시 정각)**
  - 대상: `status === 'PENDING'` 또는 `status === 'PARTIAL'`인 면접만.
  - 각 면접의 `interview_interviewers` 중 `responded_at`이 없고 `reminder_sent_count < maxCount`(설정의 reminder_max_count, 기본 2)인 면접관에게만 발송.
  - 1차: 면접 생성 후 경과 시간 ≥ `reminder_first_hours`(기본 48시간)이고 아직 리마인더 0회일 때.
  - 2차: 1차 발송 후 `last_reminder_sent_at` 기준으로 `reminder_second_hours - reminder_first_hours` 이상 경과했을 때. 발송 후 `updateReminderSent(interviewId, interviewerId)`로 카운트 및 시각 갱신.
  - 비활성 면접관은 스킵. JWT·Confirm 링크·로그인 링크 생성 방식은 면접 등록 시와 동일.
- **D-1 리마인더 (매일 17:00)**
  - 대상: `status === 'CONFIRMED'`이고, `getConfirmedSchedule`의 날짜가 **내일**(dayjs().add(1,'day').format('YYYY-MM-DD'))인 면접만.
  - 해당 면접의 모든 면접관(매핑 기준)에게 D-1 안내 메일 발송(면접일·시간·면접자명).
- **자동 확정 (매일 09:00)**
  - 대상: `status === 'PARTIAL'`만. 전원 응답 여부 확인 후 `commonSlotService.findCommonSlots(interviewId)` 호출.
  - 공통 슬롯 있음: 정렬 후 첫 슬롯 날짜로, 면접자별 `scheduled_start_time`/`scheduled_end_time`을 유지해 `createConfirmedSchedule`를 면접자별로 호출(candidate_id 포함) → `updateInterviewStatus(interviewId, 'CONFIRMED')` → 면접관 이메일로 확정 메일 일괄 발송.
  - 공통 슬롯 없음: `updateInterviewStatus(interviewId, 'NO_COMMON')`.

### 8.6 면접 상태 전이

- **정의**: PENDING(대기) → PARTIAL(일부 응답) → CONFIRMED(확정) / NO_COMMON(공통 없음) / CANCELLED(취소) / 기타(COMPLETED, NO_SHOW 등).
- **전이 조건**
  - PENDING → PARTIAL: 면접관 1명이라도 일정 제출(POST /confirm/:token) 완료 시.
  - PARTIAL → CONFIRMED: 전원 응답 + 공통 슬롯 1개 이상일 때(Confirm 제출 시점 또는 스케줄러 자동 확정).
  - PARTIAL → NO_COMMON: 전원 응답 + 공통 슬롯 0개(스케줄러에서만; Confirm 제출 시점에서는 PARTIAL 유지).
  - 관리자 액션: 취소 → CANCELLED, 완료 → COMPLETED, 노쇼 → NO_SHOW. 상태 변경 API는 허용 전이 맵(`PENDING`→`PARTIAL`/`CONFIRMED`/`CANCELLED`/`NO_COMMON` 등)으로 검증 후 `updateInterviewStatus` 호출.

### 8.7 메일·링크 로직

- **Base URL**: `FRONTEND_URL` 환경 변수(쉼표 구분 시 첫 번째), 없으면 development면 `http://localhost:5173`, 아니면 프로덕션 기본 URL. 끝 슬래시 제거.
- **Confirm 직접 링크**: `buildFrontendUrl(\`/confirm/${token}\`)` — 토큰이 쿼리/경로에 포함된 URL.
- **로그인 후 Confirm 이동**: `buildInterviewerLoginLink(confirmPath)` → `buildFrontendUrl(\`/interviewer/login?redirect=${encodeURIComponent('/confirm/' + token)}\`)`. 면접관 로그인 시 `redirect`가 `/`로 시작하면 해당 경로로만 리다이렉트(오픈 리다이렉트 방지).
- 메일 본문의 CTA 버튼/링크는 위 두 종류를 템플릿에 넣어 발송.

### 8.8 면접관 필터링(선택 가능 목록)

- **선택 불가**: 비활성(`is_active === false`), 이메일 없음(`!email || !email.trim()`). 관리자 화면에서 "선택 가능한 면접관" 목록은 이 조건으로 필터링해 노출.
- **ID 정규화**: 저장·이메일 수신자 결정 시 `trim()` 적용, 중복 제거된 ID 집합으로 매핑 생성.

### 8.9 예외·에러 처리 요약

- **저장소별**: Google Sheets 사용 시 면접실 CRUD는 스텁(미지원). 면접관 일정 수락(accepted_at)은 OneDrive만 반영하고 Google/SharePoint는 no-op일 수 있음.
- **인증**: Bearer 토큰 없음/만료/역할 불일치 시 401/403. Confirm 경로는 `params.token`으로 JWT 검증.
- **검증**: Zod 스키마 실패 시 400 + 메시지. 팀장 필수/최소 사전 통보 시간 등은 위 8.1 규칙대로 처리.

※ 위 로직 중 알려진 버그·엣지케이스·개선 과제는 **§9 알려진 이슈 및 개선 과제**를 참고한다.

---

## 9. 알려진 이슈 및 개선 과제

아래는 명세·구현 검토 과정에서 식별된 **버그·로직 오류·누락 기능·엣지케이스·UX 이슈**이다. 우선순위에 따라 수정·보완을 권장한다.

### 9.1 🔴 주요 버그/로직 오류

| # | 구분 | 내용 | 권장 해결 |
|---|------|------|-----------|
| **1** | 면접/면접자 ID 충돌 (8.1) | `INT_${Date.now()}` / `CAND_${Date.now()}_${index}` 사용 시, 면접과 면접자를 동시에 루프로 생성하면 같은 밀리초로 ID 중복 가능. | `CAND_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}` 또는 UUID 사용. |
| **2** | 공통 슬롯 완전 일치만 인정 (8.3) | 날짜·시작·종료가 **완전 일치**하는 슬롯만 공통으로 인정. 예: A 09:00~12:00, B 09:00~10:00 → 겹치는 09:00~10:00이 있음에도 공통 없음(NO_COMMON) 처리. | 타임슬롯을 30분 단위로 분해해 교집합 계산하거나, 시간 범위 overlap 방식으로 변경. |
| **3** | PARTIAL → NO_COMMON 전이 불일치 (8.2 vs 8.6) | Confirm 제출 시 전원 응답 + 공통 없음 → **PARTIAL 유지**, 메시지만 표시. NO_COMMON 전이는 스케줄러(09:00)에서만 발생. 관리자는 수 시간 후에야 NO_COMMON 반영. | Confirm 시점에도 NO_COMMON 즉시 전이하거나, 관리자 실시간 알림 추가. |
| **4** | createConfirmedSchedule의 candidate_id 빈값 (8.2, 8.3) | Confirm 제출 시점: `candidate_id: ''`로 한 건만 저장. 스케줄러는 면접자별 `candidate_id`로 여러 행 저장. 면접자별 30분 간격(scheduled_start/end_time)이 Confirm 즉시 확정 시 반영되지 않으며, 다수 면접자일 때 어떤 면접자 일정인지 특정 불가. | Confirm 즉시 확정 시에도 면접자별로 `createConfirmedSchedule` 호출(candidate_id·scheduled 시간 반영). |
| **5** | 이력서 업로드 순서 의존성 (8.4) | 프론트가 `candidates` 배열 **순서**와 업로드 파일 순서를 맞춰야 함. 순서 불일치 시 이력서가 잘못된 지원자에게 매핑되는 치명적 오류 가능. | 업로드 API에서 `candidateId + file`을 쌍으로 묶어 처리(파일별 candidateId 명시) 방식으로 변경 권장. |
| **6** | 리마인더 2차 발송 조건 불명확 (8.5) | 2차: `last_reminder_sent_at` 기준 `reminder_second_hours - reminder_first_hours` 이상 경과. `reminder_second_hours` < `reminder_first_hours`이면 음수 → 즉시 재발송. 조건·max_count 검사 순서가 구현마다 달라질 수 있음. | 2차 리마인더를 "1차 발송 후 N시간 경과" 등 절대적 표현으로 명세화. |

### 9.2 🟡 누락된 기능/엣지케이스

| # | 구분 | 내용 | 권장 해결 |
|---|------|------|-----------|
| **7** | 일정 수락 API 이원화 (4.3) | 면접관 포털 `POST /interviewer-portal/interviews/:id/accept-schedule` vs Confirm `POST /confirm/:token/accept`. 두 API가 별도 존재하며, accepted_at 저장 로직 동일 여부·중복 수락 처리 명세 없음. | 명세에 두 API의 동작 동등성·idempotency 정리. |
| **8** | 일정 수정 후 time_selections 처리 (3.4) | `PUT /interviews/:id/schedule`로 제안 일시 변경 시, 기존 time_selections 삭제/초기화·responded_at 초기화 여부 미정의. 구버전 슬롯으로 공통 계산될 수 있음. | 일정 수정 시 해당 면접의 time_selections 삭제 및 responded_at 초기화 여부 명시·구현. |
| **9** | 취소/완료 후 리마인더 (8.5) | 스케줄러는 PENDING/PARTIAL만 대상. 취소(CANCELLED) 직전 이미 리마인더 큐에 들어간 경우 처리 명세 없음. | 취소/완료 시점에 리마인더 제외 로직 또는 큐 제거 정책 명시. |
| **10** | Confirm 토큰 만료 후 재발급 (8.2) | 만료 시 "새 링크를 요청해주세요"만 안내. 관리자가 특정 면접관에게 **새 링크 재발송**하는 API/UI 명세 없음. 리마인더에 새 토큰 포함 여부도 불명확. | 면접 상세에서 "일정 확인 링크 재발송" API/UI 추가 및, 리마인더가 새 JWT 포함하는지 명세 보완. |
| **11** | 면접관 삭제 시 연관 데이터 (3.5) | `DELETE /interviewers/:id` 후 해당 면접관이 매핑된 면접의 상태·전원 응답 계산 처리 미정의. PENDING/PARTIAL 면접에서 삭제 시 응답 수 계산 오류 가능. | 삭제 시 매핑 제거·상태 재계산 또는 삭제 제한(참여 중인 면접 있으면 경고/차단) 정책 명시. |
| **12** | 외부 일정 충돌 단방향/단일일 (8.2) | GET에서 `proposedDate~proposedDate`로 제안일 하루만 체크. 면접관이 여러 **날짜** 슬롯을 선택할 때 각 선택 날짜별 외부 일정 체크가 아닐 수 있음. | 제출 시 선택한 각 (date, start, end)에 대해 외부 일정 체크 적용 여부 명세·구현. |
| **13** | 통계·삭제된 면접관 (3.9) | `GET /statistics/interviewers/:id` — 삭제된 면접관 ID 조회 시 처리 없음. 엑셀 내보내기에서 삭제된 면접관 이름 표시 여부 미정의. | 삭제된 면접관 조회 시 404 또는 "삭제됨" 표시 등 정책 명시. |

### 9.3 🟠 UX/프로세스 문제

| # | 구분 | 내용 | 권장 해결 |
|---|------|------|-----------|
| **14** | NO_COMMON 후속 액션 (3.1, 8.6) | 대시보드에 NO_COMMON 안내만 있고, 제안 일시 수정 후 재시도·면접관 재요청 플로우 없음. NO_COMMON → PENDING 재전이 방법 미명세. | 제안 일시 수정 + 슬롯/응답 초기화 후 재요청 플로우 또는 "다시 일정 요청" 액션 명세. |
| **15** | 캘린더/통계 표시 기준 (3.11) | 면접자 3명이면 09:00, 09:30, 10:00 슬롯으로 나뉨. 캘린더 이벤트를 **면접 단위**로 할지 **면접자 슬롯 단위**로 할지, 충돌 감지 기준 미정의. | 면접 단위 vs 슬롯 단위 표시·충돌 기준 명세화. |

### 9.4 📋 우선순위 정리

| 우선순위 | 항목 | 위험도 |
|----------|------|--------|
| **P0 즉시 수정** | 공통 슬롯 완전일치(#2), 이력서 순서 의존성(#5), candidate_id 빈값(#4) | 데이터 오염·핵심 플로우 오동작 |
| **P1 기능 완성** | 일정 수정 후 슬롯 초기화(#8), 토큰 재발급 방법(#10), NO_COMMON 재시도 플로우(#14) | 프로세스 막힘 |
| **P2 안정화** | ID 충돌(#1), PARTIAL→NO_COMMON 즉시 전이(#3), 리마인더 조건(#6) | 간헐적 오류 |
| **P3 보완** | 면접관 삭제 연관처리(#11), 외부 일정 다중 날짜(#12), 캘린더 표시 기준(#15) | 엣지케이스 |

**참고**: #2(공통 슬롯 완전일치)와 #8(일정 수정 후 슬롯 초기화)은 시스템 핵심 플로우에 직접 영향을 주므로 우선 확인·수정을 권장한다.

---

## 10. 문서 이력

- 최초 작성: 메뉴별·기능별 기능명세 정리.
- 로직 상세: 면접 등록·Confirm·공통 슬롯·이력서·스케줄러·상태 전이·메일 링크·면접관 필터·예외 처리 추가.
- 알려진 이슈 및 개선 과제: 검토 결과 반영(버그/로직 오류, 누락 기능, UX 이슈, 우선순위 표).
