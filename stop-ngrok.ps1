# ngrok 프로세스 종료 스크립트

Write-Host "🔍 Searching for ngrok processes..." -ForegroundColor Yellow

# ngrok 프로세스 찾기
$ngrokProcesses = Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}

if ($ngrokProcesses) {
    Write-Host "Found ngrok processes:" -ForegroundColor Green
    $ngrokProcesses | Format-Table Id, ProcessName, Path -AutoSize
    
    Write-Host "`n🛑 Stopping ngrok processes..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force
    Write-Host "✅ ngrok processes stopped" -ForegroundColor Green
} else {
    Write-Host "No ngrok processes found" -ForegroundColor Gray
}

# 포트 4040 사용 확인 (ngrok 웹 인터페이스)
Write-Host "`n🔍 Checking port 4040 (ngrok web interface)..." -ForegroundColor Yellow
$port4040 = netstat -ano | findstr ":4040"
if ($port4040) {
    Write-Host "Port 4040 is in use:" -ForegroundColor Yellow
    Write-Host $port4040
    Write-Host "`n⚠️  You may need to close the ngrok web interface or restart your computer" -ForegroundColor Red
} else {
    Write-Host "Port 4040 is free" -ForegroundColor Green
}

Write-Host "`n✅ Done. You can now start ngrok again with: ngrok http 3000" -ForegroundColor Green
