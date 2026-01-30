# CORS 오류 해결 가이드

## 문제
```
Access to XMLHttpRequest at 'http://localhost:3000/api/auth/login' from origin 'http://192.10.10.76:5173' has been blocked by CORS policy
```

## 해결 방법

### 1. Backend CORS 설정 업데이트 ✅
Backend 서버가 네트워크 IP에서 오는 요청도 허용하도록 수정했습니다.

### 2. Frontend API URL 설정

#### 방법 1: 환경 변수 파일 생성 (권장)

`frontend/.env` 파일 생성:
```bash
VITE_API_URL=http://192.10.10.76:3000/api
VITE_FRONTEND_URL=http://192.10.10.76:5173
```

#### 방법 2: Vite Proxy 사용 (개발 환경)

`vite.config.ts`에서 proxy 설정이 이미 되어 있습니다.
하지만 네트워크 접속 시에는 환경 변수를 사용하는 것이 좋습니다.

### 3. Backend 환경 변수 업데이트

`backend/.env` 파일에 Frontend URL 추가:
```bash
FRONTEND_URL=http://192.10.10.76:5173
```

또는 여러 URL 허용:
```bash
FRONTEND_URL=http://localhost:5173,http://192.10.10.76:5173
```

### 4. 서버 재시작

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 확인

1. 브라우저에서 `http://192.10.10.76:5173` 접속
2. 로그인 시도
3. CORS 오류가 사라졌는지 확인

## 추가 참고

- 개발 환경에서는 CORS가 완화되어 있지만, 프로덕션에서는 특정 도메인만 허용하도록 설정하세요.
- 네트워크 접속 시 방화벽에서 포트 3000, 5173이 열려있는지 확인하세요.
