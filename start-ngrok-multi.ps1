# 여러 포트를 동시에 포워딩하는 ngrok 시작 스크립트

param(
    [int]$Port1 = 3030,
    [int]$Port2 = 3000
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ngrok 다중 터널 시작" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Config 파일 경로
$configFile = "ngrok-config.yml"

# Config 파일 생성
Write-Host "[1] ngrok config 파일 생성" -ForegroundColor Yellow
$tunnel1Name = "tunnel-$Port1"
$tunnel2Name = "tunnel-$Port2"
$configContent = "version: `"2`"`n"
$configContent += "tunnels:`n"
$configContent += "  ${tunnel1Name}:`n"
$configContent += "    addr: $Port1`n"
$configContent += "    proto: http`n"
$configContent += "  ${tunnel2Name}:`n"
$configContent += "    addr: $Port2`n"
$configContent += "    proto: http`n"

$configContent | Out-File -FilePath $configFile -Encoding UTF8
Write-Host "   ✅ Config 파일 생성: $configFile" -ForegroundColor Green
Write-Host "      - 터널 1: 포트 $Port1" -ForegroundColor Gray
Write-Host "      - 터널 2: 포트 $Port2" -ForegroundColor Gray
Write-Host ""

# 기존 ngrok 프로세스 확인
Write-Host "[2] 기존 ngrok 프로세스 확인" -ForegroundColor Yellow
$existingNgrok = Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}
if ($existingNgrok) {
    Write-Host "   ⚠️  기존 ngrok 프로세스가 실행 중입니다:" -ForegroundColor Yellow
    $existingNgrok | ForEach-Object {
        Write-Host "      - PID: $($_.Id), Name: $($_.ProcessName)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "   선택 사항:" -ForegroundColor Yellow
    Write-Host "      1. 기존 ngrok 종료 후 config로 재시작 (권장)" -ForegroundColor White
    Write-Host "      2. 기존 ngrok은 그대로 두고 새 터미널에서 config 실행" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "기존 ngrok을 종료하고 재시작하시겠습니까? (Y/N)"
    if ($choice -eq "Y" -or $choice -eq "y") {
        Write-Host "   기존 ngrok 프로세스 종료 중..." -ForegroundColor Yellow
        $existingNgrok | Stop-Process -Force
        Write-Host "   ✅ 기존 ngrok 프로세스 종료 완료" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "   ℹ️  기존 ngrok은 그대로 두고, 새 터미널에서 다음 명령어를 실행하세요:" -ForegroundColor Cyan
        Write-Host "      ngrok start --config ngrok-config.yml --all" -ForegroundColor White
        Write-Host ""
        exit 0
    }
} else {
    Write-Host "   ✅ 기존 ngrok 프로세스 없음" -ForegroundColor Green
    Write-Host ""
}

# 포트 확인
Write-Host "[3] 포트 사용 확인" -ForegroundColor Yellow
$port1Running = netstat -ano | findstr ":$Port1" | findstr "LISTENING"
$port2Running = netstat -ano | findstr ":$Port2" | findstr "LISTENING"

if ($port1Running) {
    Write-Host "   ✅ 포트 $Port1 에서 서비스 실행 중" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  포트 $Port1 에서 서비스가 실행되지 않습니다" -ForegroundColor Yellow
}

if ($port2Running) {
    Write-Host "   ✅ 포트 $Port2 에서 서비스 실행 중" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  포트 $Port2 에서 서비스가 실행되지 않습니다" -ForegroundColor Yellow
    Write-Host "      → Backend 서버를 시작하세요: cd backend; npm run dev" -ForegroundColor Gray
}
Write-Host ""

# ngrok 시작
Write-Host "[4] ngrok 시작" -ForegroundColor Yellow
Write-Host "   명령어: ngrok start --config ngrok-config.yml --all" -ForegroundColor Gray
Write-Host ""
Write-Host "   다음 단계:" -ForegroundColor Cyan
Write-Host "      1. 위 명령어를 새 터미널에서 실행하세요" -ForegroundColor White
Write-Host "      2. 또는 이 스크립트가 자동으로 실행합니다..." -ForegroundColor White
Write-Host ""

$autoStart = Read-Host "지금 ngrok을 시작하시겠습니까? (Y/N)"
if ($autoStart -eq "Y" -or $autoStart -eq "y") {
    Write-Host "   ngrok 시작 중..." -ForegroundColor Yellow
    Write-Host ""
    Start-Process -FilePath "ngrok" -ArgumentList "start", "--config", $configFile, "--all" -NoNewWindow
    Write-Host "   ✅ ngrok 시작 완료" -ForegroundColor Green
    Write-Host ""
    Write-Host "   웹 인터페이스: http://127.0.0.1:4040" -ForegroundColor Cyan
    Write-Host "   터널 정보 확인: http://127.0.0.1:4040/api/tunnels" -ForegroundColor Cyan
} else {
    Write-Host "   수동으로 다음 명령어를 실행하세요:" -ForegroundColor Yellow
    Write-Host "      ngrok start --config ngrok-config.yml --all" -ForegroundColor White
}

Write-Host ""
