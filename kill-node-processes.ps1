# Node.js 프로세스 종료 스크립트
Write-Host "Node.js 프로세스를 찾는 중..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "발견된 Node.js 프로세스: $($nodeProcesses.Count)개" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  - PID: $($_.Id), 시작 시간: $($_.StartTime)" -ForegroundColor Gray
    }
    
    Write-Host "`n모든 Node.js 프로세스를 종료하시겠습니까? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        $nodeProcesses | Stop-Process -Force
        Write-Host "모든 Node.js 프로세스가 종료되었습니다." -ForegroundColor Green
    } else {
        Write-Host "취소되었습니다." -ForegroundColor Red
    }
} else {
    Write-Host "실행 중인 Node.js 프로세스가 없습니다." -ForegroundColor Green
}

# 포트 3000 상태 확인
Write-Host "`n포트 3000 상태 확인 중..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "포트 3000을 사용하는 연결이 있습니다:" -ForegroundColor Yellow
    $port3000 | ForEach-Object {
        Write-Host "  - 상태: $($_.State), PID: $($_.OwningProcess)" -ForegroundColor Gray
    }
} else {
    Write-Host "포트 3000은 사용 가능합니다." -ForegroundColor Green
}
