# 데이터 플로우 및 기능 점검 결과

## 1. 데이터 플로우 전체 흐름

### 1.1 면접 생성 플로우
```
1. 프론트엔드: 면접 생성 페이지에서 정보 입력
   - 공고명, 팀명
   - 면접 일시 (날짜, 시작 시간)
   - 면접자 정보 (이름, 이메일, 전화번호, 지원 직무)
   - 담당 면접관 선택 (셀렉트박스, 복수 선택)

2. 프론트엔드 → POST /api/interviews
   - 입력 데이터 검증 (Zod 스키마)
   - 팀장급 필수 체크

3. 백엔드 처리:
   a. 면접 ID 생성 (INT_${timestamp})
   b. 종료 시간 자동 계산 (면접자 수 × 면접 시간)
   c. 면접자별 시간 슬롯 계산
   d. 데이터 저장:
      - interviews 테이블: 면접 기본 정보
      - candidates 테이블: 면접자 정보
      - interview_candidates 테이블: 면접-면접자 매핑
      - candidate_interviewers 테이블: 면접자-면접관 매핑 (N:N)
      - interview_interviewers 테이블: 면접-면접관 매핑
   e. 각 면접관별 JWT 토큰 생성
   f. 각 면접관별 이메일 발송 (순차 처리)
   g. 응답 반환

4. 프론트엔드: 성공 메시지 표시 및 대시보드로 이동
```

### 1.2 면접관 응답 플로우
```
1. 면접관: 이메일 링크 클릭
   - 링크: /confirm/{token}
   - JWT 토큰 포함

2. 프론트엔드 → GET /api/confirm/:token
   - JWT 토큰 검증
   - 면접 정보 조회
   - 응답 현황 조회
   - 데이터 반환

3. 프론트엔드: 일정 선택 화면 표시
   - 면접 정보
   - 현재 응답 현황
   - 날짜/시간 선택 UI

4. 면접관: 일정 선택 후 제출

5. 프론트엔드 → POST /api/confirm/:token
   - 선택한 시간대 배열 전송

6. 백엔드 처리:
   a. JWT 토큰 검증
   b. time_selections 테이블에 저장
   c. interview_interviewers 테이블의 responded_at 업데이트
   d. 모든 면접관 응답 확인
   e. 모두 응답 시:
      - 공통 시간대 찾기 (CommonSlotService)
      - 공통 시간대가 있으면:
        * confirmed_schedules 테이블에 저장
        * interview 상태를 CONFIRMED로 업데이트
        * 확정 메일 발송
      - 공통 시간대가 없으면:
        * 상태를 PARTIAL 또는 NO_COMMON으로 유지
   f. 응답 반환

7. 프론트엔드: 성공 메시지 표시
```

### 1.3 자동 리마인더 플로우
```
1. 스케줄러: 매시간 실행 (cron: '0 * * * *')

2. 백엔드 처리:
   a. 모든 면접 조회 (PENDING, PARTIAL 상태만)
   b. 각 면접의 미응답 면접관 확인
   c. 리마인더 발송 조건 확인:
      - 1차: 생성 후 48시간 경과
      - 2차: 생성 후 72시간 경과
      - 최대 발송 횟수 확인
   d. 조건 충족 시 리마인더 메일 발송
   e. interview_interviewers 테이블의 reminder_sent_count 업데이트

3. D-1 리마인더: 매일 오후 5시 실행
   - 면접 전날 면접관에게 리마인더 발송
```

### 1.4 자동 확정 플로우
```
1. 스케줄러: 매일 오전 9시 실행 (cron: '0 9 * * *')

2. 백엔드 처리:
   a. 모든 면접 조회 (PARTIAL 상태만)
   b. 각 면접의 모든 면접관 응답 확인
   c. 공통 시간대 찾기
   d. 공통 시간대가 있으면:
      * 첫 번째 공통 시간대로 확정
      * confirmed_schedules 테이블에 저장
      * interview 상태를 CONFIRMED로 업데이트
      * 확정 메일 발송
   e. 공통 시간대가 없으면:
      * 상태를 NO_COMMON으로 업데이트
```

## 2. 데이터 저장소 구조

### 2.1 지원하는 저장소
- **OneDrive Local** (우선순위 1)
  - 환경 변수: `ONEDRIVE_ENABLED=true`
  - 로컬 Excel 파일 동기화
- **SharePoint REST API** (우선순위 2)
  - 환경 변수: `SHAREPOINT_ENABLED=true`, `SHAREPOINT_USE_REST_API=true`
- **SharePoint Graph API** (우선순위 3)
  - 환경 변수: `SHAREPOINT_ENABLED=true`
- **Google Sheets** (기본값)
  - 위의 옵션이 없을 때 사용

### 2.2 데이터 테이블 구조
```
interviews: 면접 기본 정보
candidates: 면접자 정보
interview_candidates: 면접-면접자 매핑
candidate_interviewers: 면접자-면접관 매핑 (N:N)
interviewers: 면접관 정보
interview_interviewers: 면접-면접관 매핑
time_selections: 면접관이 선택한 시간대
confirmed_schedules: 확정된 일정
config: 시스템 설정
```

## 3. 주요 기능 점검

### 3.1 면접 관리 기능
- ✅ 면접 생성 (N:N 구조)
- ✅ 면접 목록 조회 (대시보드, 전체 목록)
- ✅ 면접 상세 조회
- ✅ 면접 삭제
- ✅ AI 분석 (공통 시간대 찾기)
- ✅ 리마인더 수동 발송
- ✅ 포털 링크 생성

### 3.2 면접관 관리 기능
- ✅ 면접관 목록 조회
- ✅ 면접관 등록/수정/삭제
- ✅ Excel 업로드
- ✅ 테스트 메일 발송

### 3.3 면접관 응답 기능
- ✅ JWT 토큰 기반 인증
- ✅ 면접 정보 조회
- ✅ 일정 선택 제출
- ✅ 응답 현황 표시

### 3.4 메일 발송 기능
- ✅ 면접 생성 시 초대 메일 발송
- ✅ 리마인더 메일 발송 (자동/수동)
- ✅ D-1 리마인더 메일 발송
- ✅ 확정 메일 발송
- ✅ 테스트 메일 발송
- ✅ PC/모바일 호환 버튼

### 3.5 스케줄러 기능
- ✅ 자동 리마인더 (매시간)
- ✅ D-1 리마인더 (매일 오후 5시)
- ✅ 자동 확정 (매일 오전 9시)

### 3.6 AI 분석 기능
- ✅ Gemini AI를 통한 공통 시간대 분석
- ✅ 면접관 선택 시간대 분석

### 3.7 설정 관리 기능
- ✅ 시스템 설정 조회/수정
- ✅ 면접 시간 설정
- ✅ 리마인더 설정
- ✅ 이메일 템플릿 설정

## 4. API 엔드포인트 목록

### 인증
- `POST /api/auth/login` - 로그인

### 면접 관리
- `GET /api/interviews/dashboard` - 대시보드 통계
- `GET /api/interviews` - 면접 목록
- `GET /api/interviews/:id` - 면접 상세
- `POST /api/interviews` - 면접 생성
- `POST /api/interviews/:id/analyze` - AI 분석
- `POST /api/interviews/:id/remind` - 리마인더 발송
- `GET /api/interviews/:id/portal-token/:interviewerId` - 포털 링크 생성
- `DELETE /api/interviews/:id` - 면접 삭제

### 면접관 관리
- `GET /api/interviewers` - 면접관 목록
- `POST /api/interviewers` - 면접관 등록
- `PUT /api/interviewers/:id` - 면접관 수정
- `DELETE /api/interviewers/:id` - 면접관 삭제
- `POST /api/interviewers/upload` - Excel 업로드
- `POST /api/interviewers/:id/test-email` - 테스트 메일 발송

### 일정 확인
- `GET /api/confirm/:token` - 면접 정보 조회
- `POST /api/confirm/:token` - 일정 선택 제출

### 설정
- `GET /api/config` - 설정 조회
- `PUT /api/config` - 설정 업데이트

### 테스트
- `POST /api/test-email` - 테스트 메일 발송

## 5. 프론트엔드-백엔드 연동 확인

### 5.1 페이지별 API 호출
- ✅ DashboardPage: `/api/interviews/dashboard`
- ✅ InterviewListPage: `/api/interviews`
- ✅ InterviewCreatePage: `/api/interviews` (POST)
- ✅ InterviewDetailPage: `/api/interviews/:id`, `/api/interviews/:id/analyze`, `/api/interviews/:id/remind`, `/api/interviews/:id` (DELETE)
- ✅ InterviewerManagePage: `/api/interviewers` (GET, POST, PUT, DELETE), `/api/interviewers/upload`, `/api/interviewers/:id/test-email`
- ✅ SettingsPage: `/api/config` (GET, PUT)
- ✅ ConfirmPage: `/api/confirm/:token` (GET, POST)

### 5.2 에러 처리
- ✅ API 에러 시 메시지 표시
- ✅ 네트워크 에러 처리
- ✅ 인증 에러 처리 (401 시 로그인 페이지로 리다이렉트)

## 6. 확인 필요 사항

### 6.1 데이터 저장소
- [ ] 현재 사용 중인 저장소 확인 (OneDrive Local / SharePoint / Google Sheets)
- [ ] 저장소 연결 상태 확인
- [ ] 데이터 읽기/쓰기 권한 확인

### 6.2 스케줄러
- [ ] 스케줄러가 정상적으로 시작되었는지 확인
- [ ] 리마인더 발송 시간 확인
- [ ] 자동 확정 시간 확인

### 6.3 메일 발송
- [ ] SMTP 설정 확인
- [ ] 메일 발송 로그 확인
- [ ] 에러 메시지 확인

### 6.4 AI 분석
- [ ] GEMINI_API_KEY 설정 확인
- [ ] AI 분석 결과 확인

## 7. 문제 해결 체크리스트

### 데이터 저장소 문제
- [ ] 환경 변수 확인 (ONEDRIVE_ENABLED, SHAREPOINT_ENABLED)
- [ ] 저장소 연결 확인
- [ ] 데이터 읽기/쓰기 권한 확인

### 메일 발송 문제
- [ ] SMTP 설정 확인
- [ ] 백엔드 로그 확인
- [ ] 에러 메시지 확인

### 스케줄러 문제
- [ ] 스케줄러 시작 확인
- [ ] cron 작업 실행 확인
- [ ] 로그 확인

## 8. 다음 단계

1. 백엔드 서버 실행 및 로그 확인
2. 각 기능 테스트
3. 데이터 저장소 연결 확인
4. 스케줄러 동작 확인
5. 메일 발송 테스트
