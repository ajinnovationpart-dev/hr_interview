# ngrok 여러 포트 동시 실행 - 빠른 시작

## 문제 상황
- 기존 ngrok이 **3030 포트**를 포워딩 중
- Backend 서버는 **3000 포트**에서 실행
- 기존 터널을 끊지 않고 **3000 포트 터널 추가** 필요

## 해결 방법 (3단계)

### 1단계: ngrok config 파일 생성

프로젝트 루트에 `ngrok-config.yml` 파일이 이미 있습니다. 내용 확인:

```yaml
version: "2"
tunnels:
  tunnel-3030:
    addr: 3030
    proto: http
  tunnel-3000:
    addr: 3000
    proto: http
```

### 2단계: 기존 ngrok 종료 (선택사항)

기존 ngrok을 종료하고 config로 재시작하는 것이 가장 깔끔합니다:

```powershell
# 기존 ngrok 종료
.\stop-ngrok.ps1

# 또는 수동으로
Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"} | Stop-Process -Force
```

### 3단계: Config로 모든 터널 시작

```bash
ngrok start --config ngrok-config.yml --all
```

## 결과 확인

### 웹 인터페이스에서 확인
```
http://127.0.0.1:4040
```

### API로 확인
```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels"
$tunnels = $response.Content | ConvertFrom-Json
$tunnels.tunnels | ForEach-Object {
    Write-Host "$($_.public_url) -> $($_.config.addr)"
}
```

## 예상 결과

두 개의 터널이 동시에 실행됩니다:
- 터널 1: `https://xxxxx-1.ngrok-free.dev` → `http://localhost:3030`
- 터널 2: `https://xxxxx-2.ngrok-free.dev` → `http://localhost:3000`

## 주의사항

1. **Backend 서버가 실행 중이어야 함**
   - 포트 3000에서 Backend 서버 실행 확인
   - `cd backend; npm run dev`

2. **포트 3030 서비스도 실행 중이어야 함**
   - 기존 3030 포트 서비스가 실행 중인지 확인

3. **ngrok 무료 플랜 제한**
   - 여러 터널 동시 실행 가능
   - 각 터널은 고유한 URL을 받음

## 문제 해결

### "address already in use" 오류
- 기존 ngrok 프로세스를 종료하고 config로 재시작

### 터널이 하나만 보임
- `--all` 옵션을 사용했는지 확인
- config 파일의 터널 정의 확인

### Backend 연결 실패
- Backend 서버가 포트 3000에서 실행 중인지 확인
- `netstat -ano | findstr ":3000" | findstr "LISTENING"`
