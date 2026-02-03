# ngrok 터널 테스트 가이드

## 현재 상황

ngrok 웹 인터페이스에 "No requests to display yet" 메시지가 표시되는 것은 **정상**입니다. 이것은 ngrok 터널이 실행 중이지만 아직 요청이 들어오지 않았다는 의미입니다.

## 터널 테스트 방법

### 방법 1: 브라우저에서 직접 테스트

1. **Health Check 엔드포인트 테스트**:
   ```
   https://uncognizant-restrainedly-leila.ngrok-free.dev/health
   ```

2. **예상 응답**:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-01-30T..."
   }
   ```

### 방법 2: PowerShell로 테스트

```powershell
# Health Check 테스트
$response = Invoke-WebRequest -Uri "https://uncognizant-restrainedly-leila.ngrok-free.dev/health" -Headers @{"ngrok-skip-browser-warning"="true"} -UseBasicParsing
$response.Content
```

### 방법 3: curl로 테스트 (PowerShell)

```powershell
curl -H "ngrok-skip-browser-warning: true" https://uncognizant-restrainedly-leila.ngrok-free.dev/health
```

## 테스트 전 확인 사항

### 1. Backend 서버 실행 확인

```powershell
# 포트 3000에서 실행 중인지 확인
netstat -ano | findstr ":3000" | findstr "LISTENING"
```

**실행되지 않았다면**:
```powershell
cd backend
npm run dev
```

### 2. ngrok 터널 정보 확인

브라우저에서:
```
http://127.0.0.1:4040
```

또는 PowerShell:
```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels"
$tunnels = $response.Content | ConvertFrom-Json
$tunnels.tunnels | Format-Table public_url, config
```

**확인 사항**:
- `public_url`: `https://uncognizant-restrainedly-leila.ngrok-free.dev`
- `config.addr`: `http://localhost:3000` (Backend 포트와 일치해야 함)

### 3. 로컬 Backend 테스트

```powershell
# 로컬에서 먼저 테스트
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
```

**성공하면**: Backend 서버가 정상 작동 중
**실패하면**: Backend 서버 문제 해결 필요

## 문제 해결

### 문제 1: "502 Bad Gateway" 또는 "Connection Refused"

**원인**: Backend 서버가 실행되지 않았거나 ngrok이 잘못된 포트를 포워딩

**해결**:
1. Backend 서버 시작 확인
2. ngrok이 올바른 포트(3000)를 포워딩하는지 확인
3. ngrok 재시작: `ngrok http 3000`

### 문제 2: "ngrok-skip-browser-warning" 헤더 필요

ngrok 무료 버전은 브라우저 경고 페이지를 표시합니다. API 요청 시 헤더 추가:

```powershell
$headers = @{
    "ngrok-skip-browser-warning" = "true"
}
Invoke-WebRequest -Uri "https://uncognizant-restrainedly-leila.ngrok-free.dev/health" -Headers $headers
```

### 문제 3: CORS 오류

**원인**: Backend CORS 설정 문제

**확인**: `backend/src/server.ts`에서 ngrok 도메인 허용 확인:
```typescript
if (origin.includes('ngrok-free.dev') || origin.includes('ngrok.io')) {
  callback(null, true);
  return;
}
```

## 성공적인 테스트 후

테스트가 성공하면:

1. **ngrok 웹 인터페이스** (`http://127.0.0.1:4040`)에서 요청 로그 확인 가능
2. **GitHub Pages**에서 이 URL을 사용하여 API 호출 가능
3. **GitHub Secrets**에 `VITE_API_URL` 설정:
   ```
   https://uncognizant-restrainedly-leila.ngrok-free.dev/api
   ```

## 빠른 테스트 체크리스트

- [ ] Backend 서버 실행 중 (포트 3000)
- [ ] ngrok 터널 실행 중
- [ ] ngrok이 포트 3000을 포워딩
- [ ] 로컬 Backend 테스트 성공 (`http://localhost:3000/health`)
- [ ] ngrok 터널 테스트 성공 (`https://uncognizant-restrainedly-leila.ngrok-free.dev/health`)

## 다음 단계

터널 테스트가 성공하면:

1. **GitHub Secrets 업데이트**:
   - Repository → Settings → Secrets and variables → Actions
   - `VITE_API_URL` = `https://uncognizant-restrainedly-leila.ngrok-free.dev/api`

2. **GitHub Pages 재배포**:
   - 새 Secret으로 빌드가 자동 실행됨
   - 또는 수동으로 워크플로우 재실행
