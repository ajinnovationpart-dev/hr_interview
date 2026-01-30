# 필요한 정보 및 설정 가이드

이 문서는 시스템을 실행하기 위해 **반드시 필요한 정보**만 정리했습니다.

## ✅ 완료된 작업

- ✅ 전체 프로젝트 구조 생성
- ✅ Backend 코드 작성 (Express + TypeScript)
- ✅ Frontend 코드 작성 (React + TypeScript)
- ✅ Google Sheets API 연동 코드
- ✅ Microsoft Graph API 연동 코드
- ✅ 인증 시스템 구현
- ✅ 스케줄러 구현
- ✅ 모든 페이지 구현

## 📋 필요한 정보 (사용자가 직접 설정)

다음 정보들을 수집하여 환경 변수에 입력해야 합니다:

### 1. Google Sheets API 설정 (Google Apps Script 방식 - Google Cloud Console 불필요!)

#### 필요한 정보:
1. **GOOGLE_SPREADSHEET_ID** ✅ (이미 있음)
   - 값: `1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs`

2. **GOOGLE_APPS_SCRIPT_URL**
   - Google Apps Script 웹 앱 배포 후 받은 URL

3. **GOOGLE_APPS_SCRIPT_API_KEY**
   - Apps Script 코드에서 설정한 API 키

#### 설정 방법:
**자세한 가이드는 [NO_GOOGLE_CLOUD_SETUP.md](./NO_GOOGLE_CLOUD_SETUP.md) 참조**

간단 요약:
1. Google Sheets 스프레드시트 열기
2. "확장 프로그램" → "Apps Script" 클릭
3. `google-apps-script/Code.gs` 파일 내용 붙여넣기
4. API_KEY 변경
5. "배포" → "웹 앱으로 배포" → URL 복사
6. 환경 변수에 URL과 API_KEY 입력

### 2. Microsoft Graph API 설정

#### 필요한 정보:
1. **MICROSOFT_CLIENT_ID**
   - Azure Portal → 앱 등록 → "애플리케이션(클라이언트) ID"

2. **MICROSOFT_CLIENT_SECRET**
   - Azure Portal → 앱 등록 → "인증서 및 암호" → 새 클라이언트 암호 생성
   - ⚠️ 한 번만 표시되므로 즉시 복사

3. **MICROSOFT_TENANT_ID**
   - Azure Portal → Azure Active Directory → "디렉터리(테넌트) ID"

#### 설정 방법:
1. [Azure Portal](https://portal.azure.com) 접속
2. "Azure Active Directory" → "앱 등록" → "새 등록"
3. 리디렉션 URI 추가: `http://localhost:3000/api/auth/callback` (개발) 또는 `https://your-domain.com/api/auth/callback` (프로덕션)
4. "API 권한" → `User.Read`, `Mail.Send` 추가 → 관리자 동의 부여
5. "인증서 및 암호" → 새 클라이언트 암호 생성

### 3. 기타 설정

#### JWT_SECRET
- 강력한 랜덤 문자열 생성 (최소 32자)
- 예: `openssl rand -base64 32` 명령어로 생성

#### 토큰 만료 시간 설정 (선택사항)
- **INTERVIEWER_TOKEN_EXPIRES**: 면접관 토큰 만료 시간 (기본값: `90d`)
  - 예: `90d` (90일), `180d` (180일), `365d` (1년)
  - 면접 확정까지 시간이 걸릴 수 있으므로 충분히 길게 설정 권장
- **ADMIN_TOKEN_EXPIRES**: 관리자 토큰 만료 시간 (기본값: `7d`)
  - 예: `7d` (7일), `30d` (30일)
  - 보안상 짧게 유지하는 것을 권장

#### HR_EMAIL
- 인사팀 이메일 주소
- 예: `hr@ajnetworks.co.kr`

## 🔧 환경 변수 설정

### Backend (`backend/.env`)

```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

JWT_SECRET=여기에-강력한-랜덤-문자열-입력

# 토큰 만료 시간 설정 (선택사항, 기본값 사용 시 생략 가능)
INTERVIEWER_TOKEN_EXPIRES=90d  # 면접관 토큰 만료 시간 (기본값: 90일)
ADMIN_TOKEN_EXPIRES=7d         # 관리자 토큰 만료 시간 (기본값: 7일)

MICROSOFT_CLIENT_ID=여기에-클라이언트-ID-입력
MICROSOFT_CLIENT_SECRET=여기에-클라이언트-시크릿-입력
MICROSOFT_TENANT_ID=여기에-테넌트-ID-입력
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/callback
HR_EMAIL=hr@ajnetworks.co.kr

GOOGLE_SPREADSHEET_ID=1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/여기에-웹앱-URL/exec
GOOGLE_APPS_SCRIPT_API_KEY=여기에-Apps-Script에서-설정한-API-KEY

LOG_LEVEL=info
```

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_FRONTEND_URL=http://localhost:5173
```

## 📊 Google Sheets 초기 설정

스프레드시트에 다음 시트들을 생성하고 첫 번째 행에 헤더를 추가하세요:

### 1. interviews 시트
```
interview_id | main_notice | team_name | start_datetime | end_datetime | status | candidates | created_by | created_at | updated_at
```

### 2. interviewers 시트
```
interviewer_id | name | email | department | position | phone | is_active | created_at
```

### 3. interview_interviewers 시트
```
interview_id | interviewer_id | responded_at
```

### 4. time_selections 시트
```
selection_id | interview_id | interviewer_id | slot_date | start_time | end_time | created_at
```

### 5. confirmed_schedules 시트
```
interview_id | confirmed_date | confirmed_start_time | confirmed_end_time | confirmed_at
```

## 🚀 실행 방법

### 1. 의존성 설치
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. 환경 변수 설정
- `backend/.env.example`을 참고하여 `backend/.env` 생성 및 값 입력
- `frontend/.env.example`을 참고하여 `frontend/.env` 생성 및 값 입력

### 3. 개발 서버 실행
```bash
# 루트에서 실행 (Backend + Frontend 동시 실행)
npm run dev

# 또는 개별 실행
npm run dev:backend   # Backend만 실행 (포트 3000)
npm run dev:frontend  # Frontend만 실행 (포트 5173)
```

### 4. 접속
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## ⚠️ 주의사항

1. **환경 변수 파일(`.env`)은 절대 Git에 커밋하지 마세요**
2. **Google 서비스 계정 키는 안전하게 보관하세요**
3. **프로덕션 배포 전 JWT_SECRET을 강력한 값으로 변경하세요**
4. **Microsoft Graph API의 클라이언트 암호는 만료되면 재생성해야 합니다**

## 📚 추가 문서

- [상세 설치 가이드](./SETUP.md) - 단계별 상세 가이드
- [배포 가이드](./DEPLOY.md) - 프로덕션 배포 방법
- [기술 명세서](./docs/SPECIFICATION.md) - 전체 시스템 설계 문서

## 🆘 문제 해결

### Google Sheets API 403 오류
- 스프레드시트에 서비스 계정 이메일이 공유되어 있는지 확인
- 서비스 계정에 "편집자" 권한이 부여되었는지 확인

### Microsoft Graph API 오류
- Azure Portal에서 API 권한이 부여되었는지 확인
- 관리자 동의가 완료되었는지 확인
- 클라이언트 암호가 만료되지 않았는지 확인

### 포트 충돌
- Backend: `PORT` 환경 변수로 포트 변경
- Frontend: `vite.config.ts`에서 포트 변경
