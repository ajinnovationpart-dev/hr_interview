# ngrok 여러 터널 실행 가이드

## ngrok은 여러 터널을 동시에 실행할 수 있습니다

각 터널은 **다른 포트**를 포워딩하고, **고유한 URL**을 받습니다.

## 예시

### 시나리오 1: Backend 서버만 터널링
```bash
# 터미널 1: Backend 서버 실행
cd backend
npm run dev
# → Server is running on port 3000

# 터미널 2: ngrok 터널 시작
ngrok http 3000
# → Forwarding: https://abc123.ngrok-free.dev -> http://localhost:3000
```

### 시나리오 2: 여러 서비스 동시 터널링
```bash
# 터미널 1: Backend 서버 (포트 3000)
cd backend
npm run dev

# 터미널 2: ngrok - Backend
ngrok http 3000
# → https://backend-abc.ngrok-free.dev

# 터미널 3: 다른 서비스 (포트 8080)
# 예: 다른 API 서버 실행
some-other-server --port 8080

# 터미널 4: ngrok - 다른 서비스
ngrok http 8080
# → https://other-xyz.ngrok-free.dev
```

## 중요한 규칙

### ✅ 가능한 것
- 여러 ngrok 터널을 **다른 포트**로 동시 실행
- 각 터널은 **고유한 URL**을 받음
- 각 터널은 **독립적으로** 작동

### ❌ 불가능한 것
- **같은 URL**을 두 번 사용 (오류 발생)
- **같은 포트**를 여러 터널에서 포워딩 (불필요함)

## 현재 상황

현재 오류는:
```
The endpoint 'https://uncognizant-restrainedly-leila.ngrok-free.dev' is already online
```

이것은:
- **같은 URL**을 재사용하려고 할 때 발생
- 다른 ngrok 프로세스가 이미 그 URL을 사용 중

## 해결 방법

### 옵션 1: 기존 ngrok 종료 후 재시작 (권장)
```powershell
# 기존 ngrok 종료
.\stop-ngrok.ps1

# 새로 시작 (같은 포트, 새 URL 할당)
ngrok http 3000
# → 새로운 URL이 할당됨 (예: https://new-url.ngrok-free.dev)
```

### 옵션 2: 다른 포트 사용
```bash
# Backend 서버 포트 변경
# backend/.env
PORT=3001

# Backend 재시작
cd backend
npm run dev

# ngrok도 새 포트로
ngrok http 3001
```

## ngrok URL 변경 시 주의사항

ngrok URL이 변경되면:

1. **GitHub Secrets 업데이트**:
   - Settings → Secrets and variables → Actions
   - `VITE_API_URL` 값을 새 ngrok URL로 업데이트

2. **GitHub Pages 재배포**:
   - 새 Secret으로 빌드가 다시 실행되어야 함
   - 또는 수동으로 워크플로우 재실행

## 확인 방법

### ngrok 웹 인터페이스
```
http://127.0.0.1:4040
```

여기서:
- 실행 중인 모든 터널 확인 가능
- 각 터널의 URL과 포트 확인 가능
- 터널 중지 가능
