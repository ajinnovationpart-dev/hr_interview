# A Backend 통합 설정 가이드

## 📋 개요

A Backend를 B Backend의 ngrok URL을 통해 통합하는 방법입니다.

**권장 구조**:
- 프론트엔드: `${VITE_API_URL}/auth/login` → 실제 요청: `https://xxx.ngrok-free.dev/api/a/auth/login`
- B Backend: `/api/a/*` → A Backend `http://localhost:3000/api/*`로 프록시

---

## 🔧 설정 방법

### 1. B Backend 설정

#### 1.1 패키지 설치

```bash
cd backend
npm install http-proxy-middleware
npm install --save-dev @types/http-proxy-middleware
```

#### 1.2 환경 변수 설정

`.env` 파일에 추가:

```env
# A Backend 통합 설정
A_BACKEND_ENABLED=true
A_BACKEND_URL=http://localhost:3000
```

#### 1.3 서버 재시작

```bash
npm run dev
```

서버 로그에서 다음 메시지 확인:
```
✅ A Backend proxy enabled: /api/a → http://localhost:3000/api
```

---

### 2. 프론트엔드 설정

#### 2.1 A Backend 전용 API 인스턴스 생성 (권장)

`frontend/src/utils/apiA.ts` 파일 생성:

```typescript
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// A Backend API URL 구성
const getABackendApiUrl = () => {
  // 프로덕션 환경에서 환경 변수 사용
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    let apiUrl = import.meta.env.VITE_API_URL
    // URL이 /로 끝나면 제거
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
    // /api/a 추가
    return `${apiUrl}/api/a`
  }
  
  // 개발 환경: localhost가 아니면 같은 IP의 3000 포트 사용
  const hostname = window.location.hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3000/api/a`
  }
  
  // localhost인 경우
  return 'http://localhost:3000/api/a'
}

const API_A_URL = getABackendApiUrl()

// 디버깅: API URL 로그 출력
if (import.meta.env.DEV) {
  console.log('🔧 A Backend API URL:', API_A_URL)
}

export const apiA = axios.create({
  baseURL: API_A_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

// Request interceptor: Add auth token
apiA.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle errors
apiA.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      const basename = import.meta.env.DEV ? '/' : (import.meta.env.BASE_URL || '/')
      window.location.href = `${basename}auth/login`
    }
    if (!error.response && error.message === 'Network Error') {
      console.error('❌ Network Error: A Backend 서버에 연결할 수 없습니다.')
    }
    return Promise.reject(error)
  }
)
```

#### 2.2 사용 예시

```typescript
import { apiA } from '../../utils/apiA'

// 권장 방식: /api 없이 경로 사용
const response = await apiA.get('/auth/login')
// → 실제 요청: https://xxx.ngrok-free.dev/api/a/auth/login
// → B Backend 프록시: http://localhost:3000/api/auth/login

// 현재도 동작: /api 포함 경로 사용
const response2 = await apiA.get('/api/auth/login')
// → 실제 요청: https://xxx.ngrok-free.dev/api/a/api/auth/login
// → B Backend pathRewrite: /api/a/api/auth/login → /api/auth/login
// → A Backend: http://localhost:3000/api/auth/login
```

---

## 📊 요청 흐름

### 권장 방식

```
프론트엔드: apiA.get('/auth/login')
    ↓
실제 요청: https://xxx.ngrok-free.dev/api/a/auth/login
    ↓
B Backend 프록시: /api/a/auth/login
    ↓
pathRewrite: /api/a → /api
    ↓
A Backend: http://localhost:3000/api/auth/login
```

### 현재도 동작하는 방식

```
프론트엔드: apiA.get('/api/auth/login')
    ↓
실제 요청: https://xxx.ngrok-free.dev/api/a/api/auth/login
    ↓
B Backend 프록시: /api/a/api/auth/login
    ↓
pathRewrite: /api/a → /api
    ↓
A Backend: http://localhost:3000/api/api/auth/login
    ↓
(만약 A Backend가 /api/api/auth/login을 처리하지 않으면 404)
```

---

## ✅ 체크리스트

### B Backend 설정 확인

- [ ] `http-proxy-middleware` 패키지 설치 완료
- [ ] `.env`에 `A_BACKEND_ENABLED=true` 설정
- [ ] `.env`에 `A_BACKEND_URL=http://localhost:3000` 설정
- [ ] B Backend 서버 재시작
- [ ] 서버 로그에서 "A Backend proxy enabled" 메시지 확인

### A Backend 확인

- [ ] A Backend가 포트 3000에서 실행 중
- [ ] A Backend의 CORS 설정에 B Backend 주소 포함

### 프론트엔드 확인

- [ ] `apiA.ts` 파일 생성 완료
- [ ] A Backend 호출 시 `apiA` 인스턴스 사용
- [ ] 경로는 `/api` 없이 사용 (권장)

---

## 🔍 문제 해결

### CORS 오류

**증상**: `CORS policy: No 'Access-Control-Allow-Origin'`

**해결**:
1. A Backend의 CORS 설정 확인
2. B Backend 주소(`http://localhost:3030`)를 허용 목록에 추가

### 404 오류

**증상**: `404 Not Found`

**해결**:
1. A Backend의 라우트 경로 확인
2. 프론트엔드에서 사용하는 경로 확인
3. 권장 방식 사용: `/api` 없이 경로 사용

### 502 Bad Gateway

**증상**: `502 Bad Gateway` 또는 `ECONNREFUSED`

**해결**:
1. A Backend가 실행 중인지 확인: `netstat -ano | findstr ":3000"`
2. A Backend URL 확인: `.env`의 `A_BACKEND_URL` 값 확인
3. 방화벽 확인: 포트 3000이 차단되지 않았는지 확인

---

## 📝 환경 변수 요약

### B Backend `.env`

```env
# 기존 설정
PORT=3030
FRONTEND_URL=https://ajinnovationpart-dev.github.io

# A Backend 통합 설정
A_BACKEND_ENABLED=true
A_BACKEND_URL=http://localhost:3000
```

### 프론트엔드 `.env` (GitHub Secrets)

```env
# 기존 설정
VITE_API_URL=https://xxx.ngrok-free.dev

# A Backend는 별도 설정 불필요
# apiA.ts에서 자동으로 /api/a 추가
```

---

## 🎯 결론

**권장 방식**:
- 프론트엔드: `/api` 없이 경로 사용 (`/auth/login`)
- B Backend: `/api/a/*` → A Backend `/api/*`로 프록시
- A Backend: 기존 경로 그대로 사용 (`/api/auth/login`)

이렇게 하면 경로가 깔끔하고 관리하기 쉽습니다.
