# 포트 설정 완전 가이드

## 📋 시스템 포트 구조

이 시스템은 다음 포트들을 사용합니다:

| 서비스 | 포트 | 설정 위치 | 설명 |
|--------|------|-----------|------|
| **Backend 서버** | **3000** (기본) | `backend/.env` 또는 환경변수 | API 서버 |
| **Frontend 개발 서버** | **5173** (고정) | `frontend/vite.config.ts` | React 개발 서버 |
| **ngrok 웹 인터페이스** | **4040** (자동) | ngrok 자동 할당 | 터널 관리 UI |
| **ngrok 터널** | **Backend 포트와 동일** | ngrok 명령어 | 인터넷 노출 |

### ⚠️ 중요 규칙

1. **Backend 포트 = ngrok 포트** (반드시 일치해야 함)
   - Backend: 3000 → ngrok: `ngrok http 3000`
   - Backend: 3001 → ngrok: `ngrok http 3001`

2. **포트 변경 시 모든 관련 설정 업데이트 필요**
   - Backend 포트 변경 → `.env` 파일 수정
   - Frontend 포트 변경 → `vite.config.ts` 수정
   - ngrok 포트 변경 → ngrok 명령어 변경

## 🔧 포트 설정 방법

### 1. Backend 서버 포트 설정

#### 방법 A: 환경 변수 파일 (권장)
`backend/.env` 파일 생성/수정:
```env
PORT=3000
```

#### 방법 B: 시스템 환경 변수
PowerShell:
```powershell
$env:PORT=3000
```

#### 방법 C: 코드에서 확인
`backend/src/server.ts`:
```typescript
const PORT = process.env.PORT || 3000;
```
→ 환경 변수가 없으면 기본값 3000 사용

### 2. Frontend 개발 서버 포트 설정

`frontend/vite.config.ts`:
```typescript
server: {
  host: '0.0.0.0',
  port: 5173,  // 이 값 변경
}
```

**주의**: Frontend 포트는 개발 시에만 사용되며, GitHub Pages 배포 시에는 사용되지 않습니다.

### 3. ngrok 포트 설정

ngrok은 **Backend 서버 포트와 정확히 일치**해야 합니다.

```bash
# Backend가 3000번 포트에서 실행 중이면
ngrok http 3000

# Backend가 3001번 포트에서 실행 중이면
ngrok http 3001
```

## ✅ 포트 설정 확인 체크리스트

### 1단계: Backend 서버 포트 확인

Backend 서버 시작 시 로그 확인:
```
Server is running on port 3000
```

또는 PowerShell로 확인:
```powershell
# 포트 3000 사용 중인 프로세스 확인
netstat -ano | findstr ":3000"
```

### 2단계: Frontend 서버 포트 확인

Frontend 서버 시작 시 로그 확인:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
➜  Network: http://192.10.10.76:5173/
```

### 3단계: ngrok 포트 확인

#### 방법 A: ngrok 웹 인터페이스
브라우저에서:
```
http://127.0.0.1:4040
```

#### 방법 B: ngrok 터미널 출력
```
Forwarding: https://xxxxx.ngrok-free.dev -> http://localhost:3000
```
→ `localhost:3000` 부분이 Backend 포트와 일치해야 함

#### 방법 C: API로 확인
```powershell
$response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels'
$tunnels = $response.Content | ConvertFrom-Json
$tunnels.tunnels | ForEach-Object {
    Write-Host "Public: $($_.public_url)"
    Write-Host "Local: $($_.config.addr)"
}
```

## 🔄 포트 변경 시나리오

### 시나리오 1: Backend 포트를 3001로 변경

1. **Backend 설정 변경**
   ```env
   # backend/.env
   PORT=3001
   ```

2. **Backend 서버 재시작**
   ```bash
   cd backend
   npm run dev
   ```
   → `Server is running on port 3001` 확인

3. **ngrok 재시작**
   ```bash
   # 기존 ngrok 종료
   .\stop-ngrok.ps1
   
   # 새 포트로 시작
   ngrok http 3001
   ```

4. **Frontend API URL 업데이트** (필요시)
   ```env
   # frontend/.env
   VITE_API_URL=http://localhost:3001/api
   ```
   → Frontend 서버 재시작 필요

### 시나리오 2: Frontend 포트를 8080으로 변경

1. **Frontend 설정 변경**
   ```typescript
   // frontend/vite.config.ts
   server: {
     port: 8080,
   }
   ```

2. **Frontend 서버 재시작**
   ```bash
   cd frontend
   npm run dev
   ```
   → `Local: http://localhost:8080/` 확인

**주의**: Frontend 포트 변경은 Backend나 ngrok에 영향을 주지 않습니다.

## 🚨 포트 충돌 해결

### 오류: "address already in use"

포트가 이미 사용 중일 때 발생합니다.

#### 해결 방법 1: 사용 중인 프로세스 확인 및 종료

```powershell
# 포트 3000 사용 중인 프로세스 찾기
netstat -ano | findstr ":3000"

# PID 확인 후 종료
Stop-Process -Id [PID번호] -Force
```

#### 해결 방법 2: 다른 포트 사용

```env
# backend/.env
PORT=3001
```

그리고 ngrok도 함께 변경:
```bash
ngrok http 3001
```

## 📝 표준 포트 설정 (권장)

### 개발 환경 (로컬)

```env
# backend/.env
PORT=3000
```

```typescript
// frontend/vite.config.ts
server: {
  port: 5173,
}
```

```bash
# ngrok
ngrok http 3000
```

### 프로덕션 환경 (GitHub Pages)

- Frontend: GitHub Pages 호스팅 (포트 없음)
- Backend: ngrok 터널 (포트 3000)
- API URL: ngrok URL 사용

```env
# GitHub Secrets
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev/api
```

## 🔍 포트 상태 확인 스크립트

프로젝트 루트에 `check-ports.ps1` 실행:

```powershell
.\check-ports.ps1
```

이 스크립트는:
- ✅ Backend 서버 포트 확인
- ✅ Frontend 서버 포트 확인
- ✅ ngrok 터널 포트 확인
- ✅ 포트 충돌 확인

## ⚠️ 주의사항

1. **Backend와 ngrok 포트는 반드시 일치해야 함**
   - Backend: 3000 → ngrok: `http 3000`
   - Backend: 3001 → ngrok: `http 3001`

2. **포트 변경 후 서버 재시작 필수**
   - Backend 포트 변경 → Backend 재시작
   - Frontend 포트 변경 → Frontend 재시작
   - ngrok 포트 변경 → ngrok 재시작

3. **환경 변수 우선순위**
   - 시스템 환경 변수 > `.env` 파일 > 코드 기본값

4. **GitHub Pages 배포 시**
   - Frontend 포트는 사용되지 않음
   - `VITE_API_URL`만 중요함
