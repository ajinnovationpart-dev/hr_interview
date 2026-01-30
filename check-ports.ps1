# 포트 상태 확인 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "포트 설정 확인" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend 서버 포트 확인
Write-Host "[1] Backend 서버 포트 확인" -ForegroundColor Yellow
$backendPort = 3000
if ($env:PORT) {
    $backendPort = [int]$env:PORT
    Write-Host "   환경 변수 PORT: $backendPort" -ForegroundColor Gray
} else {
    Write-Host "   기본 포트: $backendPort (환경 변수 PORT가 설정되지 않음)" -ForegroundColor Gray
}

$backendProcess = netstat -ano | findstr ":$backendPort" | findstr "LISTENING"
if ($backendProcess) {
    Write-Host "   ✅ Backend 서버가 포트 $backendPort 에서 실행 중입니다" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend 서버가 포트 $backendPort 에서 실행되지 않습니다" -ForegroundColor Red
    Write-Host "      → cd backend && npm run dev 실행 필요" -ForegroundColor Gray
}
Write-Host ""

# 2. Frontend 서버 포트 확인
Write-Host "[2] Frontend 서버 포트 확인" -ForegroundColor Yellow
$frontendPort = 5173
$frontendProcess = netstat -ano | findstr ":$frontendPort" | findstr "LISTENING"
if ($frontendProcess) {
    Write-Host "   ✅ Frontend 서버가 포트 $frontendPort 에서 실행 중입니다" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend 서버가 포트 $frontendPort 에서 실행되지 않습니다" -ForegroundColor Red
    Write-Host "      → cd frontend && npm run dev 실행 필요" -ForegroundColor Gray
}
Write-Host ""

# 3. ngrok 터널 확인
Write-Host "[3] ngrok 터널 확인" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction Stop
    $tunnels = $response.Content | ConvertFrom-Json
    
    if ($tunnels.tunnels.Count -gt 0) {
        Write-Host "   ✅ ngrok 터널이 실행 중입니다 ($($tunnels.tunnels.Count)개)" -ForegroundColor Green
        Write-Host ""
        foreach ($tunnel in $tunnels.tunnels) {
            $publicUrl = $tunnel.public_url
            $localAddr = $tunnel.config.addr
            Write-Host "   Public URL:  $publicUrl" -ForegroundColor Cyan
            Write-Host "   Local Addr:  $localAddr" -ForegroundColor White
            
            # 포트 추출 및 확인
            if ($localAddr -match ':(\d+)$') {
                $ngrokPort = [int]$matches[1]
                if ($ngrokPort -eq $backendPort) {
                    Write-Host "   ✅ ngrok 포트($ngrokPort)와 Backend 포트($backendPort)가 일치합니다" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️  ngrok 포트($ngrokPort)와 Backend 포트($backendPort)가 일치하지 않습니다!" -ForegroundColor Red
                    Write-Host "      → ngrok을 포트 $backendPort 로 재시작하세요: ngrok http $backendPort" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ⚠️  ngrok 로컬 주소에서 포트를 추출할 수 없습니다" -ForegroundColor Yellow
            } else {
                Write-Host "   ⚠️  ngrok 로컬 주소에서 포트를 추출할 수 없습니다" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    } else {
        Write-Host "   ❌ ngrok 터널이 없습니다" -ForegroundColor Red
        Write-Host "      → ngrok http $backendPort 실행 필요" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ ngrok 웹 인터페이스에 접속할 수 없습니다" -ForegroundColor Red
    Write-Host "      → ngrok이 실행 중인지 확인하세요" -ForegroundColor Gray
    Write-Host "      → 웹 인터페이스: http://127.0.0.1:4040" -ForegroundColor Gray
}
Write-Host ""

# 4. 포트 충돌 확인
Write-Host "[4] 포트 충돌 확인" -ForegroundColor Yellow
$conflicts = @()

# Backend 포트 충돌
$backendConflicts = netstat -ano | findstr ":$backendPort" | findstr "LISTENING"
if ($backendConflicts -and ($backendConflicts.Count -gt 1)) {
    $conflicts += "포트 $backendPort 에 여러 프로세스가 실행 중입니다"
}

# Frontend 포트 충돌
$frontendConflicts = netstat -ano | findstr ":$frontendPort" | findstr "LISTENING"
if ($frontendConflicts -and ($frontendConflicts.Count -gt 1)) {
    $conflicts += "포트 $frontendPort 에 여러 프로세스가 실행 중입니다"
}

if ($conflicts.Count -eq 0) {
    Write-Host "   ✅ 포트 충돌이 없습니다" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  포트 충돌 발견:" -ForegroundColor Red
    foreach ($conflict in $conflicts) {
        Write-Host "      - $conflict" -ForegroundColor Yellow
    }
}
Write-Host ""

# 5. 요약
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "요약" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend 포트:  $backendPort" -ForegroundColor White
Write-Host "Frontend 포트: $frontendPort" -ForegroundColor White
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Yellow
if (-not $backendProcess) {
    Write-Host "  1. Backend 서버 시작: cd backend && npm run dev" -ForegroundColor White
}
if (-not $frontendProcess) {
    Write-Host "  2. Frontend 서버 시작: cd frontend && npm run dev" -ForegroundColor White
}
try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction Stop
    $tunnels = $response.Content | ConvertFrom-Json
    if ($tunnels.tunnels.Count -eq 0) {
        Write-Host "  3. ngrok 시작: ngrok http $backendPort" -ForegroundColor White
    }
} catch {
    Write-Host "  3. ngrok 시작: ngrok http $backendPort" -ForegroundColor White
}
Write-Host ""
