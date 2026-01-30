# CORS 오류 빠른 해결 가이드

## 문제
Frontend가 `http://192.10.10.76:5173`에서 실행 중인데, API 호출이 `http://localhost:3000`으로 가서 CORS 오류 발생

## 해결 방법

### ✅ 1. Frontend `.env` 파일 생성 (완료)

`frontend/.env` 파일이 생성되었습니다:
```bash
VITE_API_URL=http://192.10.10.76:3000/api
VITE_FRONTEND_URL=http://192.10.10.76:5173
```

### ✅ 2. API URL 자동 감지 로직 추가 (완료)

`frontend/src/utils/api.ts`에 자동 IP 감지 로직을 추가했습니다.
- 네트워크 IP에서 접속 시 자동으로 같은 IP의 3000 포트 사용
- 환경 변수가 있으면 우선 사용

### ✅ 3. Backend CORS 설정 강화 (완료)

개발 환경에서는 모든 origin 허용하도록 수정했습니다.

## 다음 단계

### 1. Frontend 서버 재시작

**중요**: Vite는 환경 변수 변경 시 서버를 재시작해야 합니다!

```bash
cd frontend
# Ctrl+C로 서버 중지 후
npm run dev
```

### 2. Backend 서버 확인

Backend가 `0.0.0.0:3000`에서 실행 중인지 확인:

```bash
cd backend
npm run dev
```

로그에 다음이 표시되어야 합니다:
```
Server is running on port 3000
Access from network: http://[YOUR_IP]:3000
```

### 3. 브라우저 캐시 삭제

브라우저에서:
- `Ctrl + Shift + R` (강력 새로고침)
- 또는 개발자 도구 열고 "Disable cache" 체크

### 4. 테스트

1. `http://192.10.10.76:5173` 접속
2. 로그인 시도
3. CORS 오류가 사라졌는지 확인

## 문제가 계속되면

### 방법 1: 환경 변수 확인

브라우저 콘솔에서 확인:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

`http://192.10.10.76:3000/api`가 출력되어야 합니다.

### 방법 2: 네트워크 탭 확인

브라우저 개발자 도구 → Network 탭:
- 요청 URL이 `http://192.10.10.76:3000/api/auth/login`인지 확인
- `localhost:3000`이면 환경 변수가 로드되지 않은 것

### 방법 3: 수동으로 API URL 설정

`frontend/src/utils/api.ts`를 직접 수정:
```typescript
const API_URL = 'http://192.10.10.76:3000/api'
```

## 확인 체크리스트

- [ ] Frontend `.env` 파일 생성됨
- [ ] Frontend 서버 재시작함
- [ ] Backend 서버 실행 중 (`0.0.0.0:3000`)
- [ ] 브라우저 캐시 삭제함
- [ ] 로그인 시도해봄
