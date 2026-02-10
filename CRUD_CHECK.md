# 전체 메뉴 CRUD 점검 결과

## 점검 일자
2025-02-09

## 1. 수정 완료 사항

### 1.1 면접 상세보기 데이터 미노출
- **원인**: 백엔드 `GET /interviews/:id`가 DB(Excel) 행만 반환해, 프론트가 기대하는 `candidates`, `start_datetime`, `end_datetime` 필드가 없었음.
- **조치**:
  - 백엔드에서 상세 응답 시 `getInterviewCandidates` + `getCandidateById`로 지원자 이름 목록을 구해 `interview.candidates`(문자열)로 포함.
  - 확정 일정/제안 일정으로 `start_datetime`, `end_datetime` ISO 문자열 생성 후 포함.
  - 시간 값 한 자리(`9:00` 등)도 안전히 처리하도록 `padTime` 적용.
- **프론트**: `candidates`/`start_datetime`/`end_datetime` 없을 때 `-` 또는 제안 일시로 대체 표시.

### 1.2 대시보드 vs 면접 일정 목록 노출 불일치
- **원인**: 대시보드가 "최근 면접"을 **10건**만 사용, 면접 목록은 검색으로 **100건**까지 조회.
- **조치**: 대시보드 최근 면접을 **50건**으로 확대 (`interview.routes.ts`).

---

## 2. 메뉴별 CRUD 현황

| 메뉴 | 목록(Read) | 상세(Read) | 생성(Create) | 수정(Update) | 삭제(Delete) | 비고 |
|------|------------|------------|--------------|--------------|---------------|-----|
| **대시보드** | ✅ GET /interviews/dashboard | - | - | - | - | 통계+최근 50건 |
| **면접 목록** | ✅ GET /interviews/search | ✅ GET /interviews/:id | - | - | - | 상세보기 이동 |
| **면접 등록** | - | - | ✅ POST /interviews | - | - | |
| **면접 상세** | - | ✅ GET /interviews/:id | - | ✅ 상태/일정 수정 등 | ✅ DELETE /interviews/:id | 보강 반영 |
| **면접관 관리** | ✅ GET /interviewers | - | ✅ POST /interviewers | ✅ PUT /interviewers/:id | ✅ DELETE (비활성화) | |
| **면접실 관리** | ✅ GET /rooms | - | ✅ POST /rooms | ✅ PUT /rooms/:id | ✅ DELETE /rooms/:id | OneDrive 기준 |
| **지원자 관리** | ✅ GET /candidates | ✅ GET /candidates/:id | ✅ POST /candidates | ✅ PUT /candidates/:id | - | 삭제 API 없음(정책) |
| **통계/리포트** | ✅ GET /statistics/*, GET /export/* | - | - | - | - | |
| **면접관 스케줄** | ✅ GET /interviewers (일정) | - | - | ✅ 시간 선택 등 | - | |
| **캘린더** | ✅ GET /calendar/interviews | - | - | - | - | |
| **설정** | ✅ GET /config | - | - | ✅ PUT /config | - | |

---

## 3. API·응답 형식 요약

- **면접 상세**  
  `GET /interviews/:id` → `data: { interview, responseStatus, timeSelections, commonSlots, confirmedSchedule }`  
  `interview`에 `candidates`, `start_datetime`, `end_datetime` 보강됨.

- **대시보드**  
  `GET /interviews/dashboard` → `data: { stats, recentInterviews }`  
  `recentInterviews` 최대 50건(최신순).

- **면접 검색**  
  `GET /interviews/search` → `data: { interviews, pagination, filters }`.

- **지원자**  
  목록: `GET /candidates` → `data: { candidates, pagination }`  
  상세: `GET /candidates/:id` → `data: { candidate, interviews, timeline }`.

- **설정**  
  `GET /config` → `data: <키-값 객체>`  
  `PUT /config` → body에 설정 키/값.

---

## 4. 저장소(OneDrive) 기준

- 현재 CRUD 점검은 **OneDrive Local** 사용을 전제로 함.
- 면접실(Room) 삭제·전체 CRUD는 OneDrive/SharePoint에서 지원; Google Sheets 사용 시 면접실은 스텁(미지원) 처리됨.
