# 메뉴·기능별 CRUD 및 메일 발송 점검

## 점검 방식
- **메뉴 1개당** 해당 페이지 → 사용 API → 백엔드 라우트를 **1:1로 추적**하여 CRUD·기타 기능이 정상인지 확인.
- ✅: 프론트 호출·백엔드 라우트·응답 구조 일치.  
- ⚠️: 의도적 미구현 또는 제한(정책).  
- ❌: 결함 또는 불일치.

---

## 1. 대시보드 (`/admin/dashboard`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 목록(통계+최근 면접) | `GET /interviews/dashboard` | `GET /interviews/dashboard` | ✅ |

- **페이지**: `DashboardPage.tsx`  
- **응답**: `data: { stats, recentInterviews }` (최근 50건).  
- CRUD는 없고 **Read 전용**.

---

## 2. 면접 목록 (`/admin/interviews`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 목록(검색·필터) | `GET /interviews/search?page=1&limit=100&...` | `GET /interviews/search` | ✅ |
| 상세 이동 | `navigate(/admin/interviews/:id)` | - | ✅ (라우팅만) |

- **페이지**: `InterviewListPage.tsx`  
- **응답**: `data: { interviews, pagination, filters }`.  
- 상세/생성/수정/삭제는 다른 페이지에서 처리.

---

## 3. 면접 등록 (`/admin/interviews/new`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 면접관 목록(드롭다운) | `GET /interviewers` | `GET /interviewers` | ✅ |
| 설정(소요시간 등) | `GET /config` | `GET /config` | ✅ |
| 면접 생성 | `POST /interviews` | `POST /interviews` | ✅ |
| 이력서 업로드(선택) | `POST /resumes/upload` | `POST /resumes/upload` | ✅ |
| **메일 발송** | 생성 요청 시 백엔드에서 자동 발송 | `emailService.sendEmail` (면접관별 초대 메일) | ✅ (설정 시) |

- **페이지**: `InterviewCreatePage.tsx`  
- 생성 성공 시 `missingInterviewerIds` 있으면 경고 토스트 표시.

---

## 4. 면접 상세 (`/admin/interviews/:id`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 상세 조회 | `GET /interviews/:id` | `GET /interviews/:id` | ✅ |
| 평가 목록 | `GET /interviews/:id/evaluations` | `GET /interviews/:id/evaluations` | ✅ |
| 설정(일부) | `GET /config` | `GET /config` | ✅ |
| AI 분석 | `POST /interviews/:id/analyze` | `POST /interviews/:id/analyze` | ✅ |
| 리마인더 발송 | `POST /interviews/:id/remind` | `POST /interviews/:id/remind` | ✅ (메일 발송) |
| 삭제 | `DELETE /interviews/:id` | `DELETE /interviews/:id` | ✅ |
| 포털 링크 복사 | `GET /interviews/:id/portal-link/:interviewerId` | `GET /interviews/:id/portal-link/:interviewerId` | ✅ |
| 일정 수정 | `PUT /interviews/:id/schedule` | `PUT /interviews/:id/schedule` | ✅ |
| 취소 | `POST /interviews/:id/cancel` | `POST /interviews/:id/cancel` | ✅ (메일 발송) |
| 완료 | `POST /interviews/:id/complete` | `POST /interviews/:id/complete` | ✅ |
| 노쇼 | `POST /interviews/:id/no-show` | `POST /interviews/:id/no-show` | ✅ |
| 이력(선택) | - | `GET /interviews/:id/history` | ✅ (백엔드만) |

- **페이지**: `InterviewDetailPage.tsx`  
- **메일**: 리마인더·취소 시 백엔드에서 `emailService.sendEmail` 호출.

---

## 5. 면접관 관리 (`/admin/interviewers`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 목록 | `GET /interviewers` | `GET /interviewers` | ✅ |
| 생성 | `POST /interviewers` | `POST /interviewers` | ✅ |
| 수정 | `PUT /interviewers/:id` | `PUT /interviewers/:id` | ✅ |
| 삭제(비활성화) | `DELETE /interviewers/:id` | `DELETE /interviewers/:id` | ✅ |
| 테스트 메일 | `POST /interviewers/:id/test-email` | `POST /interviewers/:id/test-email` | ✅ (메일 발송) |
| 비밀번호 설정 | `PUT /interviewers/:id/password` | `PUT /interviewers/:id/password` | ✅ |
| 엑셀 업로드 | `POST /interviewers/upload` | `POST /interviewers/upload` | ✅ |

- **페이지**: `InterviewerManagePage.tsx`  
- **응답**: 목록은 `data: interviewers` (배열).  
- 삭제는 물리 삭제가 아니라 **비활성화(is_active: false)**.

---

## 6. 면접실 관리 (`/admin/rooms`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 목록 | `GET /rooms` | `GET /rooms` | ✅ |
| 생성 | `POST /rooms` | `POST /rooms` | ✅ |
| 수정 | `PUT /rooms/:id` | `PUT /rooms/:id` | ✅ |
| 삭제 | `DELETE /rooms/:id` | `DELETE /rooms/:id` | ✅ |

- **페이지**: `RoomManagePage.tsx`  
- **응답**: 목록 `data: rooms` (배열).  
- ⚠️ **OneDrive/SharePoint** 사용 시에만 정상. Google Sheets 사용 시 Room CRUD는 스텁(에러 또는 빈 목록).

---

## 7. 지원자 관리 (`/admin/candidates`, `/admin/candidates/:id`, `.../edit`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 목록 | `GET /candidates?search=&status=&...` | `GET /candidates` | ✅ |
| 상세 | `GET /candidates/:id` | `GET /candidates/:id` | ✅ |
| 생성 | `POST /candidates` | `POST /candidates` | ✅ |
| 수정 | `PUT /candidates/:id` | `PUT /candidates/:id` | ✅ |
| 삭제 | - | - | ⚠️ **의도적 미구현** (백엔드·프론트 모두 삭제 API/버튼 없음) |

- **페이지**: `CandidateManagePage.tsx`, `CandidateDetailPage.tsx`  
- **응답**: 목록 `data: { candidates, pagination }`, 상세 `data: { candidate, interviews, timeline }`.

---

## 8. 통계 및 리포트 (`/admin/statistics`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 개요 통계 | `GET /statistics/overview?...)` | `GET /statistics/overview` | ✅ |
| 회의실 통계 | `GET /statistics/rooms?...)` | `GET /statistics/rooms` | ✅ |
| 엑셀 내보내기 | `GET /export/interviews?...)` (blob) | `GET /export/interviews` | ✅ |

- **페이지**: `StatisticsPage.tsx`  
- **Read 전용** (CRUD 없음).

---

## 9. 면접관 스케줄 (`/admin/interviewer-schedule`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 면접관 목록 | `GET /interviewers` | `GET /interviewers` | ✅ |
| 면접관별 일정 조회 | `GET /interviewers/:id/schedule?view=&startDate=&endDate=` | `GET /interviewers/:id/schedule` | ✅ |
| 가용 시간(일정 충돌 등) | 동일 응답 내 `availability` 등 | `GET /interviewers/:id/availability` (별도) | ✅ (필요 시) |

- **페이지**: `InterviewerSchedulePage.tsx`  
- **Read 전용**. “가능 일정 등록”은 **면접관이 확인 페이지(/confirm/:token)에서 제출**하며, 상세의 일정 수정 등은 면접 상세에서 처리.

---

## 10. 캘린더 뷰 (`/admin/calendar`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 회의실/면접관 목록 | `GET /rooms`, `GET /interviewers` | 동일 | ✅ |
| 일정 목록 | `GET /calendar/interviews?...)` | `GET /calendar/interviews` | ✅ |

- **페이지**: `CalendarPage.tsx`  
- **Read 전용**.

---

## 11. 설정 (`/admin/settings`)

| 기능 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 설정 조회 | `GET /config` | `GET /config` | ✅ |
| 설정 저장 | `PUT /config` | `PUT /config` | ✅ |
| 메일 설정 상태 | `GET /test-email/status` | `GET /test-email/status` (또는 `/api/a` 하위) | ✅ |
| 테스트 메일 발송 | (설정 페이지에서 사용 시) | `POST /test-email` | ✅ |

- **페이지**: `SettingsPage.tsx`  
- **Read + Update** (삭제 없음).

---

## 12. 메일 발송 요약

| 발송 시점 | 백엔드 위치 | 비고 |
|-----------|-------------|------|
| 면접 등록 시 | `interview.routes.ts` POST `/interviews` 내 `emailService.sendEmail` | 면접관별 초대 메일 (일정 선택 링크) |
| 리마인더 | `interview.routes.ts` POST `/interviews/:id/remind` | 미응답 면접관 대상 |
| 면접 취소 시 | `interview.routes.ts` POST `/interviews/:id/cancel` | 취소 안내 메일 |
| 면접관 테스트 메일 | `interviewer.routes.ts` POST `/interviewers/:id/test-email` | 해당 면접관 주소로 테스트 발송 |
| 테스트 메일(설정) | `test-email.routes.ts` POST `/test-email` | SMTP 점검용 |
| 확인 제출 시(일정 선택) | `confirm.routes.ts` POST `/:token` | 공통 일정 확정 후 참여자에게 안내 메일 |

- 발송 실패 시: 백엔드에서 로그·에러 메시지 반환.  
- 수신 미도달 시: `EMAIL_DELIVERY_GUIDE.md` 참고 (발신자=Gmail 일치, 스팸/수신 서버 정책 등).

---

## 13. 기타 API (메뉴와 직접 연결)

| 용도 | 프론트 | 백엔드 | 상태 |
|------|--------|--------|------|
| 이력서 업로드 | `POST /resumes/upload` (면접 등록·지원자) | `POST /resumes/upload` | ✅ |
| 이력서 삭제 | (미호출) | `DELETE /resumes/:candidateId` (adminAuth) | ✅ 백엔드 구현됨, 프론트에서 필요 시 연동 가능 |
| 챗봇 | `POST /chat` | `POST /chat` | ✅ |

---

## 14. 점검 결과 요약

- **CRUD가 전부 구현된 메뉴**: 면접(목록/상세/등록/수정·상태/삭제), 면접관, 면접실, 설정(조회·수정).
- **의도적으로 삭제 없는 메뉴**: 지원자(정책상 삭제 API 없음).
- **Read 전용 메뉴**: 대시보드, 면접 목록(목록만), 통계, 면접관 스케줄, 캘린더.
- **메일 발송**: 면접 등록·리마인더·취소·테스트 메일·확인 제출 후 안내까지 백엔드에서 호출 확인됨.  
- **저장소**: OneDrive 사용 시 위 CRUD·메일 모두 동작. Google Sheets 사용 시 면접실은 스텁으로 제한.

이 문서는 메뉴 1개당 **페이지 → API → 백엔드**를 1:1로 추적한 결과이며, 위 상태가 유지되는 한 CRUD와 메일 발송은 설계대로 동작하는 구조입니다.
