# 기능/메뉴별 점검 요약 (OneDrive 저장소 기준)

## 이미 수정한 항목
- **이력서 저장**: 이력서 파일을 OneDrive 동기화 폴더(Excel과 같은 폴더의 `resumes` 하위)에 저장하도록 `resume.routes.ts` 수정 완료.
- **이력서 URL 저장**: OneDrive Local 서비스에는 `updateCandidate(resume_url)` 이 원래 구현되어 있음. (Google Sheets용으로는 별도 구현 완료.)
- **일정 확인(Confirm) 버그**: `getInterviewById`는 `start_datetime`/`end_datetime`/`candidates`를 반환하지 않는데 Confirm 라우트에서 사용하고 있어, 제안 일시·후보명이 비어 있거나 오류가 났음. `confirm.routes.ts`에 `getProposedSlotAndCandidates()` 보강 함수를 추가해 `proposed_date`/`proposed_start_time`/`proposed_end_time`과 `getCandidatesByInterview`로 제안 일시·후보명을 채우도록 수정 완료.

---

## OneDrive Local 서비스 구현 여부 (백엔드)

| 기능 영역 | 메서드 | OneDrive 구현 | 비고 |
|-----------|--------|----------------|------|
| 면접 | getAllInterviews, getInterviewById, createInterview, updateInterview, updateInterviewStatus, deleteInterview | ✅ | |
| 후보자 | getAllCandidates, getCandidateById, getCandidatesByInterview, createCandidate, updateCandidate, updateCandidateStatus | ✅ | |
| 면접-후보 매핑 | createInterviewCandidate, getInterviewCandidates | ✅ | |
| 후보-면접관 매핑 | createCandidateInterviewer, getCandidateInterviewers | ✅ | |
| 면접관 | getAllInterviewers, getInterviewerById, getInterviewerByEmail, getInterviewerByEmailWithPassword, updateInterviewerPassword, createOrUpdateInterviewers | ✅ | |
| 면접-면접관 매핑 | getInterviewInterviewers, createInterviewInterviewers, updateInterviewInterviewers, updateRespondedAt, updateReminderSent | ✅ | |
| 일정 선택 | getTimeSelectionsByInterview, createTimeSelections | ✅ | |
| 확정 일정 | getConfirmedSchedule, getConfirmedSchedulesByCandidate, createConfirmedSchedule | ✅ | |
| 설정 | getConfig, updateConfig | ✅ | |
| 면접실 | getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, getRoomAvailability | ✅ | |
| 면접 이력 | createInterviewHistory, getInterviewHistory | ✅ | |
| 평가 | createEvaluation, updateEvaluation, getEvaluationsByInterview, getEvaluationsByCandidate, getEvaluationByInterviewer | ✅ | |

→ **OneDrive 사용 시 위 API는 모두 구현되어 있음.**

---

## 메뉴별 연동·동작 점검

| 메뉴 | 백엔드 라우트 | 데이터 연동 | 비고 |
|------|----------------|-------------|------|
| 대시보드 | GET /interviews/dashboard | dataService (면접/통계) | ✅ |
| 면접 목록 | GET /interviews/search | getAllInterviews, getInterviewInterviewers, getCandidatesByInterview, getConfirmedSchedule, getInterviewers, getAllRooms | ✅ |
| 면접 등록 | POST /interviews | createInterview, createCandidate, createInterviewCandidate, createCandidateInterviewer, createInterviewInterviewers, 이메일 발송 | ✅ 응답에 `candidates[].candidateId` 포함 → 이력서 업로드 가능 |
| 면접 상세 | GET/PUT/DELETE /interviews/:id, 리마인더/취소/완료/노쇼/평가 | getInterviewById, updateInterview, updateInterviewInterviewers, createInterviewHistory, getEvaluationsByInterview 등 | ✅ |
| 면접관 관리 | GET/POST/PUT/DELETE /interviewers, 업로드, 테스트 메일, 비밀번호 | createOrUpdateInterviewers, getInterviewerByEmail, updateInterviewerPassword 등 | ✅ |
| 면접실 관리 | GET/POST/PUT/DELETE /rooms | getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom | ✅ |
| 지원자 관리 | GET/POST/PUT /candidates, 상세 | getAllCandidates, getCandidateById, updateCandidate, updateCandidateStatus | ✅ |
| 통계/리포트 | GET /statistics/*, GET /export/interviews | getAllInterviews, getInterviewInterviewers, getEvaluationsByInterview, getAllRooms 등 | ✅ |
| 면접관 스케줄 | GET /interviewers/:id/schedule | getInterviewerById, getAllInterviews, getInterviewInterviewers, getCandidatesByInterview, getRoomById | ✅ |
| 캘린더 뷰 | GET /calendar/interviews | getAllInterviews, getInterviewInterviewers, getCandidatesByInterview, getRoomById, getAllInterviewers | ✅ |
| 설정 | GET/PUT /config, 테스트 메일 | getConfig, updateConfig | ✅ |
| 면접관 로그인 | POST /auth/interviewer/login | getInterviewerByEmailWithPassword | ✅ |
| 일정 확인(Confirm) | GET/POST /confirm/:token | getInterviewById, getInterviewInterviewers, createTimeSelections, updateRespondedAt, createConfirmedSchedule, updateInterviewStatus | ✅ |
| 면접관 포털 | GET /interviewer-portal/interviews, 평가/이력서 | getInterviewerById, 후보/이력서/평가 API | ✅ 이력서 다운로드 URL 구성 로직 있음 |
| 이력서 | POST /resumes/upload, GET /resumes/:filename, DELETE /resumes/:candidateId | updateCandidate(resume_url), getCandidateById, 로컬 또는 OneDrive `resumes` 폴더 | ✅ OneDrive 사용 시 동기화 폴더에 저장 |
| 챗봇 | POST /chat | getInterviewers, getAllRooms, getAllCandidates, getAllInterviews, getCandidateById, getCandidateInterviewers | ✅ |

---

## 확인된 사항 (추가 수정 불필요)

1. **면접 생성 응답**: `candidates: [{ candidateId, name }, ...]` 로 내려와 프론트에서 `interviewData.candidates?.[index]?.candidateId` 로 이력서 업로드 가능.
2. **면접관 포털 이력서 다운로드**: `resume_url` 이 `/api/resumes/파일명` 형태로 저장되며, 프론트에서 `baseURL` 제거 후 `base + resume_url` 로 열어서 동작.
3. **OneDrive 사용 시**: `ONEDRIVE_ENABLED=true`, `ONEDRIVE_EXCEL_PATH` 설정 시 이력서는 Excel과 같은 OneDrive 폴더의 `resumes` 하위에 저장됨.

---

## 수동 테스트 체크리스트 (메뉴별 시나리오)

아래 순서대로 브라우저에서 직접 확인하면 됩니다. `npm run dev` 로 백엔드+프론트 기동 후 진행하세요.

### 1. 관리자 로그인
- [ ] `/auth/login` 접속 → 허용된 관리자 이메일로 로그인
- [ ] 로그인 성공 시 `/admin/dashboard` 로 이동하는지

### 2. 대시보드
- [ ] 대시보드에 면접 현황·상태별 건수·최근 면접 목록이 표시되는지

### 3. 면접 목록
- [ ] 면접 목록 조회·검색(기간/상태/공고명 등) 동작
- [ ] 행 클릭 시 면접 상세로 이동

### 4. 면접 등록 → 이력서
- [ ] 면접 등록: 공고명·팀·면접자(1명 이상)·담당 면접관(팀장급 1명 포함) 입력 후 저장
- [ ] 저장 성공 시 "면접이 등록되었습니다" 및 메일 발송 안내
- [ ] 각 면접자에 이력서(PDF/한글 등) 첨부 후 저장 시 이력서 업로드 성공(에러 없음)
- [ ] OneDrive 사용 시 Excel 파일과 같은 폴더의 `resumes` 하위에 파일이 생성되는지(동기화 폴더 확인)

### 5. 면접 상세
- [ ] 면접 상세 진입 시 기본 정보·면접자명·면접관 응답 현황·선택된 시간대 표시
- [ ] 리마인더 발송·AI 분석(공통 시간대)·일정 수정·취소/완료/노쇼 버튼 동작
- [ ] 평가 탭에서 평가 목록 표시(평가가 있는 경우)

### 6. 면접실 관리
- [ ] 면접실 목록 조회
- [ ] 면접실 추가·수정·삭제 동작
- [ ] 면접 목록/캘린더에서 면접실이 표시되는지

### 7. 지원자 관리
- [ ] 지원자 목록 조회·검색·페이징
- [ ] 지원자 상세 진입·수정·상태 변경
- [ ] 이력서 링크가 있는 지원자에서 이력서 다운로드(상세 또는 목록에서 링크 여부 확인)

### 8. 통계 및 리포트
- [ ] 통계 개요: 기간/부서 필터, 상태별 건수·면접관별 통계·평가 통계
- [ ] 엑셀 내보내기: 기간 선택 후 다운로드, 상세 포함 옵션

### 9. 면접관 스케줄
- [ ] 면접관 선택·기간(일/주/월) 선택 시 해당 면접관의 면접 일정이 표시되는지

### 10. 캘린더 뷰
- [ ] 캘린더에 면접 일정이 표시되는지
- [ ] 면접관/면접실 필터 동작

### 11. 설정
- [ ] 설정 조회·수정(면접 소요 시간·리마인더·이메일 등)
- [ ] 테스트 메일 발송(선택)

### 12. 면접관 로그인
- [ ] `/interviewer/login` 접속 → 면접관 이메일·비밀번호 로그인
- [ ] 비활성 면접관은 "비활성화된 계정입니다" 등으로 차단되는지
- [ ] 로그인 성공 시 `/interviewer`(포털) 이동

### 13. 일정 확인(Confirm)
- [ ] 면접 등록 시 발송된 메일의 "일정 선택" 링크 클릭(또는 `/confirm/:token` 직접 접속)
- [ ] 제안 일시·면접자명이 표시되고, 시간대 선택 후 제출 가능한지
- [ ] 모든 면접관 응답 시 일정 확정·확정 메일 발송 여부

### 14. 면접관 포털
- [ ] 로그인 후 내 면접 목록·면접별 담당 지원자 목록 표시
- [ ] 지원자별 "이력서 보기" 클릭 시 다운로드 또는 새 탭에서 열리는지
- [ ] 평가 작성·저장

### 15. 챗봇
- [ ] 관리자/면접관 로그인 후 챗봇에서 질문 시 응답이 오는지

---

## 권장 추가 확인 (요약)

1. **면접 등록 → 이력서 업로드**: 등록 직후 각 면접자 이력서 업로드 → 면접관 포털에서 이력서 보기·다운로드.
2. **면접실 관리**: OneDrive 사용 시 면접실 CRUD 및 캘린더/면접 목록에서 room 표시.
3. **면접관 로그인**: 비활성 면접관 로그인 차단, 비밀번호 재설정 후 로그인.
4. **일정 확인(Confirm)**: 토큰 링크로 접속 → 제안 일시·후보명 표시 → 슬롯 선택 → 확정 시 상태/이메일 반영.
5. **통계/엑셀 내보내기**: 기간 필터, 엑셀 다운로드 정상 여부.

---

## Google Sheets 저장소 사용 시 참고

- Google Sheets 서비스에는 `getCandidateById`, `updateCandidate`, `updateCandidateStatus` 를 추가해 두었고, Apps Script(Code.gs)에 `getCandidateById`, `updateCandidate` 및 후보 시트에 status/resume_url/notes 컬럼 반영해 두었음.
- Google Sheets 사용 시 **면접실·면접 이력·평가** 는 스텁(미구현)이며, **면접관 로그인**용 `getInterviewerByEmailWithPassword`, **면접관 변경**용 `updateInterviewInterviewers` 는 Google Sheets 서비스에 없을 수 있음. OneDrive 사용 시에는 위 표대로 모두 구현됨.
