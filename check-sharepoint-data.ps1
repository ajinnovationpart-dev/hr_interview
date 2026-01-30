# SharePoint 데이터 확인 스크립트

# 1. 로그인
$loginBody = @{
    email = "ajinnovationpart@gmail.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SharePoint 데이터 확인" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "로그인 중..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    Write-Host "✅ 로그인 성공!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ 로그인 실패: $_" -ForegroundColor Red
    Write-Host "백엔드 서버가 실행 중인지 확인하세요: npm run dev (backend 폴더에서)" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# 2. 헬스체크
Write-Host "헬스체크..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/health"
    Write-Host "✅ 서버 상태: $($health.status)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ 헬스체크 실패: $_" -ForegroundColor Red
    Write-Host ""
}

# 3. 설정 조회
Write-Host "설정 조회 중..." -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/config" -Headers $headers
    Write-Host "✅ 설정 조회 성공!" -ForegroundColor Green
    Write-Host "설정 항목 수: $($config.data.Count)" -ForegroundColor Cyan
    if ($config.data.Count -gt 0) {
        $config.data | Format-Table -AutoSize
    } else {
        Write-Host "⚠️ 설정 데이터가 없습니다 (Excel 파일의 config 시트 확인 필요)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 설정 조회 실패: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "응답: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# 4. 면접 목록 조회
Write-Host "면접 목록 조회 중..." -ForegroundColor Yellow
try {
    $interviews = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/interviews" -Headers $headers
    Write-Host "✅ 면접 목록 조회 성공!" -ForegroundColor Green
    Write-Host "면접 수: $($interviews.data.Count)" -ForegroundColor Cyan
    if ($interviews.data.Count -gt 0) {
        $interviews.data | Select-Object interview_id, main_notice, team_name, status | Format-Table -AutoSize
    } else {
        Write-Host "⚠️ 면접 데이터가 없습니다 (Excel 파일의 interviews 시트 확인 필요)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 면접 목록 조회 실패: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "응답: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# 5. 면접관 목록 조회
Write-Host "면접관 목록 조회 중..." -ForegroundColor Yellow
try {
    $interviewers = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/interviewers" -Headers $headers
    Write-Host "✅ 면접관 목록 조회 성공!" -ForegroundColor Green
    Write-Host "면접관 수: $($interviewers.data.Count)" -ForegroundColor Cyan
    if ($interviewers.data.Count -gt 0) {
        $interviewers.data | Select-Object interviewer_id, name, email, department, is_active | Format-Table -AutoSize
    } else {
        Write-Host "⚠️ 면접관 데이터가 없습니다 (Excel 파일의 interviewers 시트 확인 필요)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 면접관 목록 조회 실패: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "응답: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "데이터 확인 완료!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
