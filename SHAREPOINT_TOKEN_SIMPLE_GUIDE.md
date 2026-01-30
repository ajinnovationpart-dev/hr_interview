# SharePoint 토큰 발급 - 가장 간단한 방법

## 🎯 목표

앱 등록 없이 SharePoint 토큰 발급하기

## ✅ 방법 1: Microsoft Graph Explorer 사용 (가장 간단) ⭐

### 장점
- ✅ 앱 등록 불필요
- ✅ 즉시 사용 가능
- ✅ 매우 간단

### 단점
- ⚠️ Refresh Token 제공 안 함
- ⚠️ 토큰 만료 시(1시간) 수동 갱신 필요

### 단계

1. **Microsoft Graph Explorer 접속**
   - https://developer.microsoft.com/graph/graph-explorer

2. **로그인**
   - "Sign in with Microsoft" 클릭
   - 회사 계정으로 로그인

3. **토큰 복사**
   - 우측 상단의 "Access token" 클릭
   - 토큰 복사 (긴 문자열)

4. **환경 변수에 저장**
   ```bash
   SHAREPOINT_ACCESS_TOKEN=복사한-토큰
   ```

5. **서버 재시작**
   ```bash
   cd backend
   npm run dev
   ```

### 토큰 갱신

토큰이 만료되면(1시간 후):
1. Graph Explorer에서 다시 로그인
2. 새 토큰 복사
3. `.env` 파일 업데이트
4. 서버 재시작

---

## ✅ 방법 2: Device Code Flow 사용 (Refresh Token 포함)

### 장점
- ✅ 앱 등록 불필요
- ✅ Refresh Token 제공
- ✅ 자동 갱신 가능

### 단점
- ⚠️ 초기 설정이 조금 복잡

### 단계

#### 1단계: Device Code 요청

PowerShell 실행:
```powershell
$body = @{
    client_id = "00000003-0000-0000-c000-000000000000"
    scope = "https://graph.microsoft.com/.default offline_access"
}

$response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode" -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "========================================="
Write-Host "Device Code: $($response.device_code)"
Write-Host "User Code: $($response.user_code)"
Write-Host "Verification URL: $($response.verification_url)"
Write-Host "========================================="
Write-Host ""
Write-Host "다음 단계:"
Write-Host "1. 브라우저에서 $($response.verification_url) 접속"
Write-Host "2. User Code 입력: $($response.user_code)"
Write-Host "3. 로그인"
Write-Host ""
Write-Host "로그인 완료 후 Enter 키를 누르세요..."
```

#### 2단계: 사용자 인증

1. 브라우저에서 `verification_url` 접속
2. `user_code` 입력
3. 로그인

#### 3단계: 토큰 폴링

사용자가 로그인한 후 PowerShell에서:
```powershell
$deviceCode = "1단계에서-받은-device-code"

# 사용자가 인증할 때까지 반복 (최대 15분)
$maxAttempts = 30
$interval = 30 # 초

for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds $interval
    
    $body = @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id = "00000003-0000-0000-c000-000000000000"
        device_code = $deviceCode
    }
    
    try {
        $response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/token" -Body $body -ContentType "application/x-www-form-urlencoded"
        
        Write-Host "========================================="
        Write-Host "✅ 토큰 발급 성공!"
        Write-Host "========================================="
        Write-Host ""
        Write-Host "Access Token:"
        Write-Host $response.access_token
        Write-Host ""
        Write-Host "Refresh Token:"
        Write-Host $response.refresh_token
        Write-Host ""
        Write-Host ".env 파일에 다음을 추가하세요:"
        Write-Host "SHAREPOINT_ACCESS_TOKEN=$($response.access_token)"
        Write-Host "SHAREPOINT_REFRESH_TOKEN=$($response.refresh_token)"
        Write-Host "========================================="
        
        break
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            $errorResponse = $_.Exception.Response | ConvertFrom-Json
            if ($errorResponse.error -eq "authorization_pending") {
                Write-Host "인증 대기 중... ($($i + 1)/$maxAttempts)"
                continue
            } else {
                Write-Host "오류: $($errorResponse.error_description)"
                break
            }
        } else {
            Write-Host "오류 발생: $_"
            break
        }
    }
}
```

#### 4단계: 환경 변수에 저장

```bash
SHAREPOINT_ACCESS_TOKEN=받은-access-token
SHAREPOINT_REFRESH_TOKEN=받은-refresh-token
```

---

## 🎯 권장 방법

### 개발/테스트 환경
- **Microsoft Graph Explorer 사용** (가장 간단)
- 토큰 만료 시 수동 갱신

### 프로덕션 환경
- **Device Code Flow 사용** (Refresh Token 포함)
- 자동 갱신 가능

---

## 📝 전체 스크립트 (Device Code Flow)

한 번에 실행할 수 있는 PowerShell 스크립트:

```powershell
# SharePoint 토큰 발급 스크립트

Write-Host "========================================="
Write-Host "SharePoint 토큰 발급 시작"
Write-Host "========================================="
Write-Host ""

# 1. Device Code 요청
Write-Host "[1/3] Device Code 요청 중..."
$body = @{
    client_id = "00000003-0000-0000-c000-000000000000"
    scope = "https://graph.microsoft.com/.default offline_access"
}

$deviceResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode" -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host ""
Write-Host "========================================="
Write-Host "인증 필요"
Write-Host "========================================="
Write-Host "1. 브라우저에서 다음 URL 접속:"
Write-Host "   $($deviceResponse.verification_uri)"
Write-Host ""
Write-Host "2. 다음 코드 입력:"
Write-Host "   $($deviceResponse.user_code)"
Write-Host ""
Write-Host "3. 로그인 완료 후 Enter 키를 누르세요..."
Write-Host "========================================="
Write-Host ""

Read-Host "로그인 완료 후 Enter"

# 2. 토큰 폴링
Write-Host ""
Write-Host "[2/3] 토큰 발급 대기 중..."
$maxAttempts = 30
$interval = 5

for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds $interval
    
    $tokenBody = @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id = "00000003-0000-0000-c000-000000000000"
        device_code = $deviceResponse.device_code
    }
    
    try {
        $tokenResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/token" -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
        
        Write-Host ""
        Write-Host "[3/3] ✅ 토큰 발급 성공!"
        Write-Host ""
        Write-Host "========================================="
        Write-Host "환경 변수 설정"
        Write-Host "========================================="
        Write-Host ""
        Write-Host "backend/.env 파일에 다음을 추가하세요:"
        Write-Host ""
        Write-Host "SHAREPOINT_ACCESS_TOKEN=$($tokenResponse.access_token)"
        Write-Host "SHAREPOINT_REFRESH_TOKEN=$($tokenResponse.refresh_token)"
        Write-Host ""
        Write-Host "========================================="
        
        # 클립보드에 복사
        $envText = "SHAREPOINT_ACCESS_TOKEN=$($tokenResponse.access_token)`nSHAREPOINT_REFRESH_TOKEN=$($tokenResponse.refresh_token)"
        $envText | Set-Clipboard
        Write-Host "✅ 환경 변수가 클립보드에 복사되었습니다!"
        Write-Host ""
        
        break
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            $errorResponse = $_.Exception.Response | ConvertFrom-Json
            if ($errorResponse.error -eq "authorization_pending") {
                Write-Host "." -NoNewline
                continue
            } else {
                Write-Host ""
                Write-Host "❌ 오류: $($errorResponse.error_description)"
                break
            }
        } else {
            Write-Host ""
            Write-Host "❌ 오류 발생: $_"
            break
        }
    }
}

if ($i -eq $maxAttempts) {
    Write-Host ""
    Write-Host "❌ 시간 초과: 15분 내에 로그인하지 않았습니다."
}
```

이 스크립트를 `get-sharepoint-token.ps1`로 저장하고 실행하세요!

---

## 🚀 빠른 시작

### 옵션 A: 자동 갱신 (권장) ⭐

**한 번만 설정하면 자동으로 갱신됩니다!**

1. PowerShell에서 스크립트 실행:
   ```powershell
   cd e:\hr-sample
   .\get-sharepoint-token.ps1
   ```

2. 브라우저에서 인증:
   - 표시된 URL 접속
   - 코드 입력
   - 로그인

3. 환경 변수 자동 복사:
   - 스크립트가 클립보드에 복사
   - `backend/.env` 파일에 붙여넣기

4. 서버 재시작:
   ```bash
   cd backend
   npm run dev
   ```

**이제 토큰이 자동으로 갱신됩니다!** 🎉

### 옵션 B: 수동 갱신 (간단하지만 수동 작업 필요)

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. "Access token" 클릭 → 복사
4. `.env` 파일에 저장
5. 서버 재시작

⚠️ **단점**: 토큰이 만료되면(1시간) 수동으로 다시 발급해야 합니다.
