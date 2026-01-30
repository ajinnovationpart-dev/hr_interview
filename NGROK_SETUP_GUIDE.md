# ngrok 설정 가이드

## 포트 설정이 중요한 이유

ngrok은 **로컬 포트를 인터넷에 노출**하는 터널링 서비스입니다. 따라서 Backend 서버가 실행 중인 포트와 ngrok이 포워딩하는 포트가 **정확히 일치**해야 합니다.

## 현재 설정

### Backend 서버 포트
- 기본 포트: **3000**
- 환경 변수: `PORT=3000` (또는 `backend/.env`에서 설정)

### ngrok 명령어

Backend 서버가 **3000번 포트**에서 실행 중이면:

```bash
ngrok http 3000
```

## 올바른 설정 순서

### 1. Backend 서버 시작
```bash
cd backend
npm run dev
```

서버가 정상적으로 시작되면:
```
Server is running on port 3000
```

### 2. ngrok 터널 시작
**새 터미널 창**에서:
```bash
ngrok http 3000
```

### 3. ngrok URL 확인
ngrok이 제공하는 URL을 확인:
```
Forwarding: https://xxxxx.ngrok-free.dev -> http://localhost:3000
```

이 URL을 `VITE_API_URL`에 설정하세요.

## 포트가 다를 경우

### Backend 서버 포트 변경
`backend/.env` 파일에서:
```env
PORT=3001
```

그러면 ngrok도 동일한 포트를 사용해야 합니다:
```bash
ngrok http 3001
```

## 확인 방법

### 1. Backend 서버 포트 확인
서버 시작 시 로그에서 확인:
```
Server is running on port 3000
```

### 2. ngrok 포트 확인
ngrok 웹 인터페이스에서 확인:
```
http://127.0.0.1:4040
```

또는 ngrok 콘솔에서:
```
Forwarding: https://xxxxx.ngrok-free.dev -> http://localhost:3000
```

### 3. 연결 테스트
```bash
curl https://your-ngrok-url.ngrok-free.dev/health
```

정상 응답:
```json
{"status":"ok","timestamp":"..."}
```

## 문제 해결

### 포트 불일치
- **증상**: API 요청이 실패하거나 연결되지 않음
- **원인**: ngrok이 다른 포트를 포워딩하고 있음
- **해결**: ngrok을 올바른 포트로 재시작

### 포트 충돌
- **증상**: "address already in use" 오류
- **원인**: 다른 프로세스가 포트를 사용 중
- **해결**: 
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID [PID번호] /F
  ```

## 현재 설정 확인

1. **Backend 서버 포트**: `backend/.env`의 `PORT` 또는 기본값 `3000`
2. **ngrok 포트**: ngrok 명령어에서 확인 (`ngrok http [포트]`)
3. **일치 여부**: 두 포트가 동일해야 함

## 예시

### 올바른 설정
```bash
# Backend 서버 (포트 3000)
cd backend
npm run dev
# → Server is running on port 3000

# ngrok (포트 3000)
ngrok http 3000
# → Forwarding: https://xxxxx.ngrok-free.dev -> http://localhost:3000
```

### 잘못된 설정
```bash
# Backend 서버 (포트 3000)
cd backend
npm run dev
# → Server is running on port 3000

# ngrok (포트 8080) ❌ 잘못됨!
ngrok http 8080
# → Backend 서버와 포트가 다름!
```
