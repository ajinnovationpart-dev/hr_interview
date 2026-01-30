# SharePoint OAuth 오류 해결 가이드

## 🔴 오류 메시지

```
AADSTS900023: Specified tenant identifier 'ajgroup365' is neither a valid DNS name, nor a valid external domain.
```

## 🔍 문제 원인

1. **테넌트 ID 형식 오류**: `ajgroup365`는 테넌트 도메인이지 테넌트 ID가 아닙니다
2. **URL 인코딩 문제**: URL에 공백(`%20`)이 잘못 포함되어 있습니다

## ✅ 해결 방법

### 🔴 문제: 리디렉션 URI 등록 필요

공개 클라이언트 ID를 사용할 때도 리디렉션 URI가 등록되어 있어야 합니다. 앱 등록 없이 사용하려면 다른 방법이 필요합니다.

### 방법 1: 네이티브 앱 리디렉션 URI 사용 (권장)

Microsoft Graph의 공개 클라이언트는 `urn:ietf:wg:oauth:2.0:oob` 또는 `https://login.microsoftonline.com/common/oauth2/nativeclient`를 지원합니다:

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

### 방법 2: Microsoft Graph Explorer 사용 (가장 간단) ⭐

앱 등록 없이 가장 간단한 방법:

1. **Microsoft Graph Explorer 접속**
   - https://developer.microsoft.com/graph/graph-explorer

2. **로그인**
   - "Sign in with Microsoft" 클릭
   - 회사 계정으로 로그인

3. **토큰 복사**
   - 우측 상단의 "Access token" 클릭
   - 토큰 복사

4. **환경 변수에 저장**
   ```bash
   SHAREPOINT_ACCESS_TOKEN=복사한-토큰
   ```

⚠️ **단점**: Refresh Token을 제공하지 않으므로, 토큰이 만료되면(1시간) 수동으로 새로 발급해야 합니다.

### 방법 3: Device Code Flow 사용 (앱 등록 불필요)

Device Code Flow는 리디렉션 URI가 필요 없습니다:

**1단계: Device Code 요청**
```powershell
$body = @{
    client_id = "00000003-0000-0000-c000-000000000000"
    scope = "https://graph.microsoft.com/.default offline_access"
}

$response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode" -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "Device Code: $($response.device_code)"
Write-Host "User Code: $($response.user_code)"
Write-Host "Verification URL: $($response.verification_url)"
```

**2단계: 사용자가 브라우저에서 인증**
- `verification_url`로 접속
- `user_code` 입력
- 로그인

**3단계: 토큰 폴링**
```powershell
$deviceCode = "받은-device-code"

$body = @{
    grant_type = "urn:ietf:params:oauth:grant-type:device_code"
    client_id = "00000003-0000-0000-c000-000000000000"
    device_code = $deviceCode
}

# 사용자가 인증할 때까지 반복
$response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/token" -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "Access Token: $($response.access_token)"
Write-Host "Refresh Token: $($response.refresh_token)"
```

### 방법 2: 실제 테넌트 ID 찾기

#### PowerShell로 테넌트 ID 찾기:

```powershell
# SharePoint Online Management Shell 필요
Connect-PnPOnline -Url "https://ajgroup365.sharepoint.com/sites/portal2" -Interactive
$context = Get-PnPContext
$tenantId = $context.Web.SiteCollectionAdmin.GroupId
Write-Host "Tenant ID: $tenantId"
```

또는 Azure Portal에서:
1. https://portal.azure.com 접속
2. Azure Active Directory → 개요
3. "테넌트 ID" 복사

### 방법 3: URL 인코딩 수정

올바른 URL 형식 (공백 없음):

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=http://localhost&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

## 📋 올바른 OAuth URL 생성

### 1. 브라우저에서 접속할 URL

**옵션 A: common 사용 (권장)**
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=http://localhost&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

**옵션 B: 테넌트 도메인 사용**
```
https://login.microsoftonline.com/ajgroup365.onmicrosoft.com/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=http://localhost&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

### 2. 로그인 후

1. 로그인 완료 후 리디렉션 URL에서 `code` 파라미터 복사
2. 예: `http://localhost?code=0.ABC123...`

### 3. 토큰 교환

PowerShell:
```powershell
$tenantDomain = "ajgroup365.onmicrosoft.com"  # 또는 실제 테넌트 ID
$code = "복사한-code"

$body = @{
    client_id = "00000003-0000-0000-c000-000000000000"
    code = $code
    redirect_uri = "http://localhost"
    grant_type = "authorization_code"
    scope = "https://graph.microsoft.com/.default offline_access"
}

$response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantDomain/oauth2/v2.0/token" -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "Access Token: $($response.access_token)"
Write-Host "Refresh Token: $($response.refresh_token)"
```

## 🔧 코드에서도 수정 필요

`sharePointRest.service.ts`의 토큰 갱신 부분도 수정해야 합니다:

```typescript
// SharePoint 사이트 URL에서 테넌트 추출
const url = new URL(this.siteUrl);
const tenant = url.hostname.split('.')[0]; // ajgroup365

// 이 부분을 수정:
// 방법 1: common 사용
const tokenEndpoint = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

// 방법 2: 테넌트 도메인 사용
const tenantDomain = process.env.SHAREPOINT_TENANT_DOMAIN || `${tenant}.onmicrosoft.com`;
const tokenEndpoint = `https://login.microsoftonline.com/${tenantDomain}/oauth2/v2.0/token`;
```

## 📝 환경 변수 추가

`.env` 파일에 테넌트 도메인 추가 (선택사항):

```bash
# 테넌트 도메인 (토큰 갱신용)
SHAREPOINT_TENANT_DOMAIN=ajgroup365.onmicrosoft.com

# 또는 common 사용 (기본값)
# SHAREPOINT_TENANT_DOMAIN=common
```

## 🎯 권장 방법

**가장 간단한 방법**: `common` 사용

1. OAuth URL에서 `common` 사용
2. 토큰 갱신도 `common` 사용
3. 모든 Microsoft 계정에서 작동

---

## 🧪 테스트

1. 올바른 URL로 접속
2. 로그인
3. `code` 받기
4. 토큰 교환
5. `.env` 파일에 저장

준비되면 알려주세요!
