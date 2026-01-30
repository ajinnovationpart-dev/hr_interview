# SharePoint Excel 시트별 컬럼 구조

## 📋 개요

SharePoint Excel 파일 (`면접.xlsx`)은 총 **9개 시트**로 구성됩니다.

각 시트의 첫 번째 행은 **헤더**이며, 아래 컬럼 구조를 정확히 따라야 합니다.

---

## 📊 시트 1: interviews (면접 기본 정보)

**시트명**: `interviews`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interview_id | TEXT | 면접 고유 ID | INT_1738051200000 |
| B | main_notice | TEXT | 공고명 | 2025년 2월 수시 채용 |
| C | team_name | TEXT | 팀명 | 정보전략팀 |
| D | proposed_date | DATE | 제안 날짜 | 2025-01-28 |
| E | proposed_start_time | TIME | 제안 시작 시간 | 11:00 |
| F | proposed_end_time | TIME | 제안 종료 시간 | 14:00 |
| G | status | TEXT | 상태 | PENDING, PARTIAL, CONFIRMED, NO_COMMON, CANCELLED |
| H | created_by | TEXT | 작성자 이메일 | hr@ajnetworks.co.kr |
| I | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |
| J | updated_at | DATETIME | 수정 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
interview_id | main_notice | team_name | proposed_date | proposed_start_time | proposed_end_time | status | created_by | created_at | updated_at
```

---

## 📊 시트 2: candidates (면접자 정보)

**시트명**: `candidates`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | candidate_id | TEXT | 면접자 고유 ID | CAND_001 |
| B | name | TEXT | 이름 | 홍길동 |
| C | email | TEXT | 이메일 (선택) | hong@example.com |
| D | phone | TEXT | 전화번호 (선택) | 010-1234-5678 |
| E | position_applied | TEXT | 지원 직무 | 선임 개발자 |
| F | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
candidate_id | name | email | phone | position_applied | created_at
```

---

## 📊 시트 3: interview_candidates (면접-면접자 매핑)

**시트명**: `interview_candidates`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interview_id | TEXT | 면접 ID | INT_1738051200000 |
| B | candidate_id | TEXT | 면접자 ID | CAND_001 |
| C | sequence | NUMBER | 면접 순서 | 1, 2, 3... |
| D | scheduled_start_time | TIME | 예정 시작 시간 | 11:00 |
| E | scheduled_end_time | TIME | 예정 종료 시간 | 11:30 |
| F | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
interview_id | candidate_id | sequence | scheduled_start_time | scheduled_end_time | created_at
```

---

## 📊 시트 4: candidate_interviewers (면접자별 담당 면접관)

**시트명**: `candidate_interviewers`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interview_id | TEXT | 면접 ID | INT_1738051200000 |
| B | candidate_id | TEXT | 면접자 ID | CAND_001 |
| C | interviewer_id | TEXT | 면접관 ID | IV_001 |
| D | role | TEXT | 역할 | PRIMARY, SECONDARY |
| E | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
interview_id | candidate_id | interviewer_id | role | created_at
```

**role 값**:
- `PRIMARY`: 주면접관
- `SECONDARY`: 보조면접관

---

## 📊 시트 5: interviewers (면접관 DB)

**시트명**: `interviewers`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interviewer_id | TEXT | 면접관 고유 ID | IV_001 |
| B | name | TEXT | 이름 | 김영준 |
| C | email | TEXT | 이메일 | yjkim@ajnetworks.co.kr |
| D | department | TEXT | 부서 | QA Innovation Team |
| E | position | TEXT | 직책 | Manager |
| F | is_team_lead | BOOLEAN | 팀장급 여부 | TRUE, FALSE |
| G | phone | TEXT | 연락처 | 010-1234-5678 |
| H | is_active | BOOLEAN | 활성 여부 | TRUE, FALSE |
| I | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
interviewer_id | name | email | department | position | is_team_lead | phone | is_active | created_at
```

**주의사항**:
- `is_team_lead`: `TRUE` 또는 `FALSE` (대문자)
- `is_active`: `TRUE` 또는 `FALSE` (대문자)

---

## 📊 시트 6: interview_interviewers (면접-면접관 매핑)

**시트명**: `interview_interviewers`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interview_id | TEXT | 면접 ID | INT_1738051200000 |
| B | interviewer_id | TEXT | 면접관 ID | IV_001 |
| C | responded_at | DATETIME | 응답 완료 시간 | 2025-01-27 15:30:00 |
| D | reminder_sent_count | NUMBER | 리마인더 발송 횟수 | 0, 1, 2 |
| E | last_reminder_sent_at | DATETIME | 마지막 리마인더 발송 시간 | 2025-01-27 16:00:00 |

**헤더 행 (1행)**:
```
interview_id | interviewer_id | responded_at | reminder_sent_count | last_reminder_sent_at
```

**주의사항**:
- `responded_at`: 미응답이면 빈 셀 또는 NULL
- `reminder_sent_count`: 숫자 (0부터 시작)
- `last_reminder_sent_at`: 리마인더를 보낸 적이 없으면 빈 셀

---

## 📊 시트 7: time_selections (일정 선택)

**시트명**: `time_selections`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | selection_id | TEXT | 선택 고유 ID | SEL_001 |
| B | interview_id | TEXT | 면접 ID | INT_1738051200000 |
| C | interviewer_id | TEXT | 면접관 ID | IV_001 |
| D | slot_date | DATE | 날짜 | 2025-01-28 |
| E | start_time | TIME | 시작 시간 | 11:00 |
| F | end_time | TIME | 종료 시간 | 11:30 |
| G | created_at | DATETIME | 생성 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
selection_id | interview_id | interviewer_id | slot_date | start_time | end_time | created_at
```

**주의사항**:
- `end_time`은 `start_time + 30분` (30분 단위 고정)
- 한 면접관이 여러 시간대를 선택할 수 있음

---

## 📊 시트 8: confirmed_schedules (확정 일정)

**시트명**: `confirmed_schedules`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | interview_id | TEXT | 면접 ID | INT_1738051200000 |
| B | candidate_id | TEXT | 면접자 ID | CAND_001 |
| C | confirmed_date | DATE | 확정 날짜 | 2025-02-03 |
| D | confirmed_start_time | TIME | 확정 시작 시간 | 12:00 |
| E | confirmed_end_time | TIME | 확정 종료 시간 | 12:30 |
| F | confirmed_at | DATETIME | 확정 일시 | 2025-01-27 15:00:00 |

**헤더 행 (1행)**:
```
interview_id | candidate_id | confirmed_date | confirmed_start_time | confirmed_end_time | confirmed_at
```

**주의사항**:
- 면접자별로 확정 일정이 저장됨
- 한 면접에 여러 면접자가 있으면 각각 별도 행으로 저장

---

## 📊 시트 9: config (시스템 설정)

**시트명**: `config`

| 열 | 컬럼명 | 데이터 타입 | 설명 | 예시 |
|---|--------|------------|------|------|
| A | config_key | TEXT | 설정 키 | interview_duration_minutes |
| B | config_value | TEXT | 설정 값 | 30 |
| C | description | TEXT | 설명 | 면접 1인당 소요 시간 (분) |
| D | updated_at | DATETIME | 수정 일시 | 2025-01-27 10:00:00 |

**헤더 행 (1행)**:
```
config_key | config_value | description | updated_at
```

**기본 설정 데이터** (2행부터):

| config_key | config_value | description |
|------------|--------------|-------------|
| interview_duration_minutes | 30 | 면접 1인당 소요 시간 (분) |
| work_start_time | 09:00 | 업무 시작 시간 |
| work_end_time | 18:00 | 업무 종료 시간 |
| lunch_start_time | 12:00 | 점심 시작 시간 |
| lunch_end_time | 13:00 | 점심 종료 시간 |
| time_slot_interval | 30 | 타임슬롯 간격 (분) |
| reminder_first_hours | 48 | 1차 리마인더 (시간) |
| reminder_second_hours | 72 | 2차 리마인더 (시간) |
| reminder_max_count | 2 | 최대 리마인더 횟수 |
| d_minus_1_reminder_time | 17:00 | D-1 리마인더 발송 시간 |
| min_interviewers | 2 | 최소 면접관 수 |
| max_interviewers | 5 | 최대 면접관 수 |
| require_team_lead | TRUE | 팀장급 필수 여부 |
| min_notice_hours | 48 | 최소 사전 통보 시간 |
| data_retention_years | 1 | 데이터 보관 연한 |
| email_retry_count | 3 | 메일 재시도 횟수 |
| company_logo_url | https://... | 회사 로고 URL |
| company_address | 서울시... | 회사 주소 |
| parking_info | 지하 1층... | 주차 안내 |
| dress_code | 비즈니스 캐주얼 | 복장 안내 |

---

## 📝 Excel 파일 생성 가이드

### 1. 시트 생성 순서

1. `interviews`
2. `candidates`
3. `interview_candidates`
4. `candidate_interviewers`
5. `interviewers`
6. `interview_interviewers`
7. `time_selections`
8. `confirmed_schedules`
9. `config`

### 2. 헤더 설정

각 시트의 **1행**에 위의 헤더를 정확히 입력하세요.

**중요**: 
- 컬럼명은 정확히 일치해야 합니다 (대소문자 구분)
- 순서도 정확히 따라야 합니다

### 3. 데이터 타입

- **TEXT**: 문자열
- **DATE**: 날짜 (YYYY-MM-DD 형식 권장)
- **TIME**: 시간 (HH:mm 형식)
- **DATETIME**: 날짜+시간 (YYYY-MM-DD HH:mm:ss 형식 권장)
- **NUMBER**: 숫자
- **BOOLEAN**: TRUE 또는 FALSE (대문자)

### 4. 필수 vs 선택

- **필수 컬럼**: 빈 값이면 안 되는 컬럼
- **선택 컬럼**: 빈 값 허용 (예: email, phone)

---

## ✅ 검증 체크리스트

Excel 파일을 생성한 후 확인:

- [ ] 9개 시트가 모두 있는가?
- [ ] 각 시트의 1행에 헤더가 정확히 입력되어 있는가?
- [ ] 컬럼 순서가 정확한가?
- [ ] `config` 시트에 기본 설정 데이터가 있는가?
- [ ] `interviewers` 시트에 테스트 면접관 데이터가 있는가?

---

## 🧪 테스트 데이터 예시

### interviews 시트 (2행)
```
INT_1738051200000 | 2025년 2월 수시 채용 | 정보전략팀 | 2025-01-28 | 11:00 | 14:00 | PENDING | hr@ajnetworks.co.kr | 2025-01-27 10:00:00 | 2025-01-27 10:00:00
```

### interviewers 시트 (2행)
```
IV_001 | 김영준 | yjkim@ajnetworks.co.kr | QA Innovation Team | Manager | TRUE | 010-1234-5678 | TRUE | 2025-01-27 10:00:00
```

### config 시트 (2행부터)
```
interview_duration_minutes | 30 | 면접 1인당 소요 시간 (분) | 2025-01-27 10:00:00
work_start_time | 09:00 | 업무 시작 시간 | 2025-01-27 10:00:00
...
```

---

## 📚 참고

- 컬럼명은 코드에서 사용하는 필드명과 정확히 일치해야 합니다
- 대소문자를 구분하므로 정확히 입력하세요
- 헤더 행은 반드시 1행에 있어야 합니다

준비되면 알려주세요!
