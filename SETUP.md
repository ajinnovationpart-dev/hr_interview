# 설치 및 설정 가이드

## 사전 요구사항

1. **Node.js 20.x 이상** 설치
2. **Google Cloud Console** 계정 및 프로젝트
3. **Azure AD** 앱 등록 (Microsoft OAuth)
4. **Google Sheets** 스프레드시트 생성

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: "interview-scheduling-system"
3. 프로젝트 ID 복사

### 1.2 Google Sheets API 활성화
1. "API 및 서비스" → "라이브러리"
2. "Google Sheets API" 검색
3. "사용 설정" 클릭

### 1.3 서비스 계정 생성
1. "API 및 서비스" → "사용자 인증 정보"
2. "+ 사용자 인증 정보 만들기" → "서비스 계정"
3. 서비스 계정 이름: "interview-system-service"
4. 역할: "편집자"
5. "키" 탭 → "키 추가" → "새 키 만들기" → "JSON"
6. JSON 파일 다운로드

### 1.4 Google Sheets 스프레드시트 생성
1. Google Drive에서 새 스프레드시트 생성
2. 이름: "AJ Networks 면접 자동화 시스템"
3. URL에서 `SPREADSHEET_ID` 복사 (예: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`)
4. 다음 시트들을 생성:
   - `interviews` (면접 정보)
   - `interviewers` (면접관 DB)
   - `interview_interviewers` (면접-면접관 매핑)
   - `time_selections` (일정 선택)
   - `confirmed_schedules` (확정 일정)

### 1.5 시트 헤더 설정

각 시트의 첫 번째 행에 다음 헤더를 추가하세요:

**interviews 시트:**
```
interview_id | main_notice | team_name | start_datetime | end_datetime | status | candidates | created_by | created_at | updated_at
```

**interviewers 시트:**
```
interviewer_id | name | email | department | position | phone | is_active | created_at
```

**interview_interviewers 시트:**
```
interview_id | interviewer_id | responded_at
```

**time_selections 시트:**
```
selection_id | interview_id | interviewer_id | slot_date | start_time | end_time | created_at
```

**confirmed_schedules 시트:**
```
interview_id | confirmed_date | confirmed_start_time | confirmed_end_time | confirmed_at
```

### 1.6 서비스 계정에 권한 부여
1. 스프레드시트 "공유" 클릭
2. JSON 키 파일의 `client_email` 값을 입력
3. 역할: "편집자"
4. "보내기"

## 2. Azure AD 앱 등록

### 2.1 앱 등록
1. [Azure Portal](https://portal.azure.com) 접속
2. "Azure Active Directory" → "앱 등록"
3. "새 등록"
4. 앱 이름: "Interview Scheduling System"
5. 리디렉션 URI: `http://localhost:3000/api/auth/callback` (개발) 또는 `https://your-domain.com/api/auth/callback` (프로덕션)
6. "등록"

### 2.2 API 권한 설정
1. "API 권한" → "권한 추가"
2. "Microsoft Graph" → "위임된 권한"
3. 다음 권한 추가:
   - `User.Read`
   - `Mail.Send`
4. "관리자 동의 부여" 클릭

### 2.3 클라이언트 암호 생성
1. "인증서 및 암호" → "새 클라이언트 암호"
2. 설명 입력 후 "추가"
3. **값을 복사** (한 번만 표시됨)

### 2.4 정보 복사
- **애플리케이션(클라이언트) ID**: `MICROSOFT_CLIENT_ID`
- **디렉터리(테넌트) ID**: `MICROSOFT_TENANT_ID`
- **클라이언트 암호 값**: `MICROSOFT_CLIENT_SECRET`

## 3. 프로젝트 설치

### 3.1 저장소 클론
```bash
git clone [repository-url]
cd interview-scheduling-system
```

### 3.2 의존성 설치
```bash
# 루트에서
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## 4. 환경 변수 설정

### 4.1 Backend 환경 변수
```bash
cd backend
cp .env.example .env
```

`.env` 파일을 편집:
```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

JWT_SECRET=your-super-secret-jwt-key-change-in-production

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-microsoft-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/callback
HR_EMAIL=hr@ajnetworks.co.kr

GOOGLE_SPREADSHEET_ID=your-google-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

LOG_LEVEL=info
```

**중요**: `GOOGLE_PRIVATE_KEY`는 JSON 키 파일의 `private_key` 값을 그대로 복사하되, `\n`을 실제 줄바꿈으로 변환하거나 `\\n`으로 이스케이프하세요.

### 4.2 Frontend 환경 변수
```bash
cd frontend
cp .env.example .env
```

`.env` 파일을 편집:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_FRONTEND_URL=http://localhost:5173
```

## 5. 개발 서버 실행

### 5.1 Backend 실행
```bash
cd backend
npm run dev
```

Backend는 `http://localhost:3000`에서 실행됩니다.

### 5.2 Frontend 실행
```bash
cd frontend
npm run dev
```

Frontend는 `http://localhost:5173`에서 실행됩니다.

### 5.3 동시 실행 (루트에서)
```bash
npm run dev
```

## 6. 프로덕션 빌드

### 6.1 Backend 빌드
```bash
cd backend
npm run build
npm start
```

### 6.2 Frontend 빌드
```bash
cd frontend
npm run build
```

빌드된 파일은 `frontend/dist` 디렉토리에 생성됩니다.

## 7. 트러블슈팅

### Google Sheets API 403 Forbidden
- 스프레드시트에 서비스 계정 이메일이 공유되어 있는지 확인
- 서비스 계정에 "편집자" 권한이 부여되어 있는지 확인

### Microsoft Graph API 메일 발송 실패
- Azure Portal에서 API 권한이 부여되었는지 확인
- 관리자 동의가 완료되었는지 확인
- 클라이언트 암호가 만료되지 않았는지 확인

### JWT 토큰 오류
- `JWT_SECRET` 환경 변수가 설정되어 있는지 확인
- 토큰이 만료되지 않았는지 확인

### 포트 충돌
- Backend: `PORT` 환경 변수로 포트 변경
- Frontend: `vite.config.ts`에서 포트 변경

## 8. 다음 단계

1. [배포 가이드](./DEPLOY.md) 참조하여 프로덕션 배포
2. [기술 명세서](./docs/SPECIFICATION.md) 참조하여 상세 기능 확인
3. 사용자 교육 및 테스트
