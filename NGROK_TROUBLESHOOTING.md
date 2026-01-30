# ngrok 문제 해결 가이드

## 오류: "The endpoint is already online"

이 오류는 같은 ngrok URL이 이미 다른 프로세스에서 사용 중일 때 발생합니다.

## 해결 방법

### 방법 1: 기존 ngrok 프로세스 종료

1. **PowerShell 스크립트 사용**:
```powershell
.\stop-ngrok.ps1
```

2. **수동으로 종료**:
```powershell
# ngrok 프로세스 찾기
Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}

# 프로세스 종료 (PID 확인 후)
Stop-Process -Id [PID번호] -Force
```

### 방법 2: ngrok 웹 인터페이스 확인

ngrok은 기본적으로 `http://127.0.0.1:4040`에서 웹 인터페이스를 제공합니다.

1. 브라우저에서 `http://127.0.0.1:4040` 접속
2. 실행 중인 터널 확인
3. 필요시 터널 중지

### 방법 3: 다른 포트로 ngrok 시작

**주의**: 이 방법은 Backend 서버 포트도 함께 변경해야 합니다.

```bash
# Backend 서버 포트 변경 (backend/.env)
PORT=3001

# Backend 서버 재시작 필요
cd backend
npm run dev

# ngrok도 새 포트로 시작 (새 터미널)
ngrok http 3001
```

이렇게 하면 **새로운 ngrok URL**이 할당됩니다.

### 방법 4: 여러 ngrok 터널 동시 실행

ngrok은 **여러 터널을 동시에 실행**할 수 있습니다. 각각 다른 포트를 포워딩하면 됩니다:

```bash
# 터미널 1: Backend 서버 (포트 3000)
ngrok http 3000
# → https://xxxxx-1.ngrok-free.dev

# 터미널 2: 다른 서비스 (포트 3001)
ngrok http 3001
# → https://xxxxx-2.ngrok-free.dev
```

**중요**: 
- 같은 URL을 재사용하려고 하면 오류 발생
- 각 터널은 **고유한 URL**을 받음
- Backend 서버 포트와 ngrok 포트가 **일치**해야 함

### 방법 4: ngrok 계정에서 터널 확인

ngrok 계정에 로그인하여:
1. https://dashboard.ngrok.com 접속
2. 실행 중인 터널 확인
3. 필요시 터널 중지

## 빠른 해결

가장 간단한 방법:

```powershell
# 모든 ngrok 프로세스 종료
Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"} | Stop-Process -Force

# 그 후 ngrok 재시작
ngrok http 3000
```

## 확인 사항

ngrok을 재시작하기 전에:
1. ✅ Backend 서버가 실행 중인지 확인 (포트 3000)
2. ✅ 기존 ngrok 프로세스가 종료되었는지 확인
3. ✅ 포트 4040이 사용 가능한지 확인
