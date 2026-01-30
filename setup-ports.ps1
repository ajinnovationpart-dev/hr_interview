# 포트 설정 초기화 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "포트 설정 초기화" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 표준 포트 설정
$BACKEND_PORT = 3000
$FRONTEND_PORT = 5173

Write-Host "표준 포트 설정:" -ForegroundColor Yellow
Write-Host "  Backend:  $BACKEND_PORT" -ForegroundColor White
Write-Host "  Frontend: $FRONTEND_PORT" -ForegroundColor White
Write-Host ""

# 1. Backend .env 파일 확인/생성
Write-Host "[1] Backend 환경 변수 설정 확인" -ForegroundColor Yellow
$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    Write-Host "   ✅ backend\.env 파일이 존재합니다" -ForegroundColor Green
    
    # PORT 설정 확인
    $envContent = Get-Content $backendEnvPath -Raw
    if ($envContent -match "PORT\s*=") {
        Write-Host "   ✅ PORT 설정이 있습니다" -ForegroundColor Green
        if ($envContent -match "PORT\s*=\s*(\d+)") {
            $currentPort = $matches[1]
            Write-Host "      현재 PORT: $currentPort" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  PORT 설정이 없습니다. 추가합니다..." -ForegroundColor Yellow
        Add-Content -Path $backendEnvPath -Value "`nPORT=$BACKEND_PORT"
        Write-Host "   ✅ PORT=$BACKEND_PORT 추가 완료" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ backend\.env 파일이 없습니다. 생성합니다..." -ForegroundColor Yellow
    $content = "PORT=$BACKEND_PORT`n"
    $content | Out-File -FilePath $backendEnvPath -Encoding UTF8
    Write-Host "   ✅ backend\.env 파일 생성 완료 (PORT=$BACKEND_PORT)" -ForegroundColor Green
}
Write-Host ""

# 2. Frontend .env 파일 확인/생성
Write-Host "[2] Frontend 환경 변수 설정 확인" -ForegroundColor Yellow
$frontendEnvPath = "frontend\.env"
if (Test-Path $frontendEnvPath) {
    Write-Host "   ✅ frontend\.env 파일이 존재합니다" -ForegroundColor Green
    
    # VITE_API_URL 설정 확인
    $envContent = Get-Content $frontendEnvPath -Raw
    if ($envContent -match "VITE_API_URL") {
        Write-Host "   ✅ VITE_API_URL 설정이 있습니다" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  VITE_API_URL 설정이 없습니다" -ForegroundColor Yellow
        Write-Host "      → 개발 환경에서는 자동으로 localhost:3000으로 연결됩니다" -ForegroundColor Gray
    }
} else {
    Write-Host "   ℹ️  frontend\.env 파일이 없습니다 (선택사항)" -ForegroundColor Gray
    Write-Host "      → 개발 환경에서는 자동으로 localhost:3000으로 연결됩니다" -ForegroundColor Gray
}
Write-Host ""

# 3. vite.config.ts 확인
Write-Host "[3] Frontend Vite 설정 확인" -ForegroundColor Yellow
$viteConfigPath = "frontend\vite.config.ts"
if (Test-Path $viteConfigPath) {
    $viteConfig = Get-Content $viteConfigPath -Raw
    if ($viteConfig -match "port:\s*(\d+)") {
        $currentPort = $matches[1]
        Write-Host "   ✅ Vite 포트 설정: $currentPort" -ForegroundColor Green
        if ($currentPort -ne $FRONTEND_PORT) {
            Write-Host "   ⚠️  표준 포트($FRONTEND_PORT)와 다릅니다" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  포트 설정을 찾을 수 없습니다 (기본값 5173 사용)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ vite.config.ts 파일을 찾을 수 없습니다" -ForegroundColor Red
}
Write-Host ""

# 4. server.ts 확인
Write-Host "[4] Backend 서버 설정 확인" -ForegroundColor Yellow
$serverPath = "backend\src\server.ts"
if (Test-Path $serverPath) {
    $serverCode = Get-Content $serverPath -Raw
    if ($serverCode -match "PORT\s*=\s*process\.env\.PORT\s*\|\|\s*(\d+)") {
        $defaultPort = $matches[1]
        Write-Host "   ✅ 기본 포트: $defaultPort" -ForegroundColor Green
        if ($defaultPort -ne $BACKEND_PORT) {
            Write-Host "   ⚠️  표준 포트($BACKEND_PORT)와 다릅니다" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  PORT 설정을 찾을 수 없습니다" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ server.ts 파일을 찾을 수 없습니다" -ForegroundColor Red
}
Write-Host ""

# 5. 현재 실행 중인 프로세스 확인
Write-Host "[5] 현재 실행 중인 서비스 확인" -ForegroundColor Yellow

# Backend 확인
$backendRunning = netstat -ano | findstr ":$BACKEND_PORT" | findstr "LISTENING"
if ($backendRunning) {
    Write-Host "   ✅ Backend 서버가 포트 $BACKEND_PORT 에서 실행 중입니다" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend 서버가 실행되지 않았습니다" -ForegroundColor Red
    Write-Host "      → 시작: cd backend; npm run dev" -ForegroundColor Gray
}

# Frontend 확인
$frontendRunning = netstat -ano | findstr ":$FRONTEND_PORT" | findstr "LISTENING"
if ($frontendRunning) {
    Write-Host "   ✅ Frontend 서버가 포트 $FRONTEND_PORT 에서 실행 중입니다" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend 서버가 실행되지 않았습니다" -ForegroundColor Red
    Write-Host "      → 시작: cd frontend; npm run dev" -ForegroundColor Gray
}

# ngrok 확인
try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction SilentlyContinue
    if ($response) {
        $tunnels = $response.Content | ConvertFrom-Json
        if ($tunnels.tunnels.Count -gt 0) {
            Write-Host "   ✅ ngrok 터널이 실행 중입니다" -ForegroundColor Green
            foreach ($tunnel in $tunnels.tunnels) {
                Write-Host "      URL: $($tunnel.public_url)" -ForegroundColor Cyan
                Write-Host "      → $($tunnel.config.addr)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  ngrok이 실행 중이지만 터널이 없습니다" -ForegroundColor Yellow
            Write-Host "      → ngrok http $BACKEND_PORT 실행 필요" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ ngrok이 실행되지 않았습니다" -ForegroundColor Red
    Write-Host "      → ngrok http $BACKEND_PORT 실행 필요" -ForegroundColor Gray
}
Write-Host ""

# 요약
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "설정 완료" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "표준 포트 설정:" -ForegroundColor Yellow
Write-Host "  Backend:  $BACKEND_PORT" -ForegroundColor White
Write-Host "  Frontend: $FRONTEND_PORT" -ForegroundColor White
Write-Host ""
Write-Host "서버 시작 명령어:" -ForegroundColor Yellow
Write-Host "  Backend:  cd backend; npm run dev" -ForegroundColor White
Write-Host "  Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "  ngrok:    ngrok http $BACKEND_PORT" -ForegroundColor White
Write-Host ""
