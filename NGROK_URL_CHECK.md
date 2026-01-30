# ngrok URL 확인 방법

## 방법 1: ngrok 웹 인터페이스 (가장 쉬움)

### 접속
브라우저에서 다음 URL로 접속:
```
http://127.0.0.1:4040
```
또는
```
http://localhost:4040
```

### 확인 가능한 정보
- ✅ 실행 중인 모든 터널 목록
- ✅ 각 터널의 공개 URL (Public URL)
- ✅ 각 터널이 포워딩하는 로컬 주소 (Forwarding)
- ✅ 요청/응답 로그 (Request/Response)
- ✅ 터널 중지 기능

### 예시 화면
```
Tunnels:
┌─────────────────────────────────────────────────────────────┐
│ Forwarding: https://xxxxx.ngrok-free.dev                   │
│            -> http://localhost:3000                        │
└─────────────────────────────────────────────────────────────┘
```

## 방법 2: ngrok API 사용

### PowerShell에서 확인
```powershell
# JSON 형식으로 터널 정보 가져오기
$response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels'
$tunnels = $response.Content | ConvertFrom-Json

# 터널 정보 출력
$tunnels.tunnels | ForEach-Object {
    Write-Host "Public URL: $($_.public_url)"
    Write-Host "Local URL: $($_.config.addr)"
    Write-Host ""
}
```

### 간단한 확인
```powershell
# 터널 목록만 확인
Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' | 
    Select-Object -ExpandProperty Content | 
    ConvertFrom-Json | 
    Select-Object -ExpandProperty tunnels | 
    Format-Table public_url, config
```

## 방법 3: ngrok 터미널 출력 확인

ngrok을 시작하면 터미널에 다음과 같이 표시됩니다:

```
ngrok                                                                              
                                                                                   
Session Status                online                                               
Account                       your-email@example.com (Plan: Free)                 
Version                       3.x.x                                                
Region                        United States (us)                                   
Latency                       45ms                                                 
Web Interface                 http://127.0.0.1:4040                                
Forwarding                    https://xxxxx.ngrok-free.dev -> http://localhost:3000
                                                                                   
Connections                   ttl     opn     rt1     rt5     p50     p90         
                              0       0       0.00    0.00    0.00    0.00        
```

여기서 `Forwarding` 줄이 실제 URL입니다.

## 방법 4: 스크립트 사용

프로젝트 루트에 있는 스크립트 실행:
```powershell
.\check-ngrok-status.ps1
```

## 현재 실행 중인 터널 확인

### 빠른 확인
```powershell
# ngrok API로 즉시 확인
$tunnels = (Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels').Content | ConvertFrom-Json
$tunnels.tunnels | Select-Object public_url, @{Name='local';Expression={$_.config.addr}}
```

### 상세 정보
```powershell
# 모든 터널 정보 출력
$response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels'
$json = $response.Content | ConvertFrom-Json

Write-Host "실행 중인 터널: $($json.tunnels.Count)개" -ForegroundColor Green
Write-Host ""

foreach ($tunnel in $json.tunnels) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Public URL:  $($tunnel.public_url)" -ForegroundColor Yellow
    Write-Host "Local URL:   $($tunnel.config.addr)" -ForegroundColor White
    Write-Host "Protocol:    $($tunnel.proto)" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}
```

## 문제 해결

### 웹 인터페이스에 접속이 안 될 때
1. ngrok이 실행 중인지 확인
2. 포트 4040이 사용 중인지 확인:
   ```powershell
   netstat -ano | findstr ":4040"
   ```
3. ngrok을 재시작

### API 요청이 실패할 때
- ngrok이 실행 중이어야 함
- 웹 인터페이스가 활성화되어 있어야 함 (기본적으로 자동 활성화)

## 빠른 참조

| 방법 | 명령어/URL | 용도 |
|------|-----------|------|
| 웹 인터페이스 | `http://127.0.0.1:4040` | 시각적 확인, 로그 보기 |
| API | `http://127.0.0.1:4040/api/tunnels` | 프로그래밍 방식 확인 |
| 터미널 | ngrok 시작 시 출력 | 빠른 확인 |
| 스크립트 | `.\check-ngrok-status.ps1` | 자동화된 확인 |
