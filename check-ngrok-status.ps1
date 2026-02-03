# ngrok 상태 확인 스크립트

Write-Host "🔍 Checking ngrok status..." -ForegroundColor Yellow
Write-Host ""

# ngrok 프로세스 확인
$ngrokProcesses = Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}

if ($ngrokProcesses) {
    Write-Host "✅ ngrok processes running:" -ForegroundColor Green
    $ngrokProcesses | Format-Table Id, ProcessName, Path -AutoSize
    Write-Host ""
} else {
    Write-Host "❌ No ngrok processes found" -ForegroundColor Red
    Write-Host ""
}

# 포트 4040 확인 (ngrok 웹 인터페이스)
Write-Host "🌐 ngrok Web Interface:" -ForegroundColor Cyan
Write-Host "   URL: http://127.0.0.1:4040" -ForegroundColor White
Write-Host "   또는: http://localhost:4040" -ForegroundColor White
Write-Host ""

$port4040 = netstat -ano | findstr ":4040"
if ($port4040) {
    Write-Host "✅ ngrok web interface is running" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 다음 단계:" -ForegroundColor Yellow
    Write-Host "   1. 브라우저에서 http://127.0.0.1:4040 접속" -ForegroundColor White
    Write-Host "   2. 실행 중인 터널 목록 확인" -ForegroundColor White
    Write-Host "   3. 각 터널의 URL과 포트 확인" -ForegroundColor White
    Write-Host "   4. 필요시 터널 중지 가능" -ForegroundColor White
} else {
    Write-Host "⚠️  ngrok web interface is not running" -ForegroundColor Yellow
    Write-Host "   ngrok을 시작하면 자동으로 웹 인터페이스가 실행됩니다." -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 API로 확인하는 방법:" -ForegroundColor Cyan
Write-Host "   Invoke-WebRequest -Uri http://127.0.0.1:4040/api/tunnels | Select-Object -ExpandProperty Content" -ForegroundColor White
