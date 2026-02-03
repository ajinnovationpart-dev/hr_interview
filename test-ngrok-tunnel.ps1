# ngrok 터널 테스트 스크립트

param(
    [string]$NgrokUrl = "https://uncognizant-restrainedly-leila.ngrok-free.dev"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ngrok 터널 테스트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. ngrok 터널 정보 확인
Write-Host "[1] ngrok 터널 정보 확인" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
    $tunnels = $response.Content | ConvertFrom-Json
    
    if ($tunnels.tunnels.Count -gt 0) {
        Write-Host "   ✅ ngrok 터널이 실행 중입니다 ($($tunnels.tunnels.Count)개)" -ForegroundColor Green
        Write-Host ""
        foreach ($tunnel in $tunnels.tunnels) {
            Write-Host "   Public URL:  $($tunnel.public_url)" -ForegroundColor Cyan
            Write-Host "   Local Addr:  $($tunnel.config.addr)" -ForegroundColor White
            Write-Host "   Protocol:    $($tunnel.proto)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "   ❌ ngrok 터널이 없습니다" -ForegroundColor Red
        Write-Host "      → ngrok http 3000 실행 필요" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ ngrok 웹 인터페이스에 접속할 수 없습니다" -ForegroundColor Red
    Write-Host "      → ngrok이 실행 중인지 확인하세요" -ForegroundColor Yellow
    exit 1
}

# 2. Backend 서버 확인
Write-Host "[2] Backend 서버 확인" -ForegroundColor Yellow
$backendPort = 3000
$backendRunning = netstat -ano | findstr ":$backendPort" | findstr "LISTENING"
if ($backendRunning) {
    Write-Host "   ✅ Backend 서버가 포트 $backendPort 에서 실행 중입니다" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend 서버가 실행되지 않았습니다" -ForegroundColor Red
    Write-Host "      → cd backend; npm run dev 실행 필요" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 3. 로컬 Backend 테스트
Write-Host "[3] 로컬 Backend 서버 테스트" -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ 로컬 Backend 서버가 정상 작동합니다" -ForegroundColor Green
    Write-Host "      Status: $($localResponse.StatusCode)" -ForegroundColor Gray
    Write-Host "      Response: $($localResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 로컬 Backend 서버에 접속할 수 없습니다" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 4. ngrok 터널 테스트
Write-Host "[4] ngrok 터널 테스트" -ForegroundColor Yellow
Write-Host "   테스트 URL: $NgrokUrl/health" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "ngrok-skip-browser-warning" = "true"
    }
    $tunnelResponse = Invoke-WebRequest -Uri "$NgrokUrl/health" -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ ngrok 터널이 정상 작동합니다!" -ForegroundColor Green
    Write-Host "      Status: $($tunnelResponse.StatusCode)" -ForegroundColor White
    Write-Host "      Response: $($tunnelResponse.Content)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   ✅ 모든 테스트 통과!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ngrok 터널 테스트 실패" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   문제 해결 방법:" -ForegroundColor Yellow
    Write-Host "      1. Backend 서버가 실행 중인지 확인" -ForegroundColor White
    Write-Host "      2. ngrok이 올바른 포트(3000)를 포워딩하는지 확인" -ForegroundColor White
    Write-Host "      3. ngrok 웹 인터페이스 확인: http://127.0.0.1:4040" -ForegroundColor White
    Write-Host "      4. 방화벽 설정 확인" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "테스트 완료" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "이제 ngrok 웹 인터페이스에서 요청 로그를 확인할 수 있습니다:" -ForegroundColor Yellow
Write-Host "   http://127.0.0.1:4040" -ForegroundColor Cyan
Write-Host ""
