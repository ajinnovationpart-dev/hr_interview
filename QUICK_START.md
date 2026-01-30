# 빠른 시작 가이드

## 5분 안에 시작하기

### 1단계: 환경 변수 파일 생성 (2분)

```bash
# Backend
cd backend
cp .env.example .env
# .env 파일을 열어서 필요한 값 입력 (아래 참조)

# Frontend  
cd ../frontend
cp .env.example .env
# .env 파일을 열어서 VITE_API_URL 확인
```

### 2단계: 최소 필수 값만 입력

`backend/.env` 파일에서 **최소한** 다음 값만 입력하면 테스트 가능:

```bash
# 필수 값 (나머지는 기본값 사용 가능)
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=임시-비밀번호-나중에-변경
```

### 3단계: 실행 (1분)

```bash
# 루트에서
npm install
npm run dev
```

### 4단계: 접속

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health (헬스체크)

## 다음 단계

1. Google Sheets 스프레드시트 생성 및 시트 설정
2. Microsoft Graph API 설정 (이메일 발송 기능 사용 시)
3. 실제 데이터로 테스트

자세한 내용은 [REQUIRED_INFO.md](./REQUIRED_INFO.md) 참조
