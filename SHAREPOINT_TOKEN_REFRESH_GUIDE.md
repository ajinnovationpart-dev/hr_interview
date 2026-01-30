# SharePoint 토큰 자동 갱신 가이드

## 🎯 개요

SharePoint REST API 서비스는 이제 **자동으로 토큰을 갱신**합니다!

### 자동 갱신 기능
- ✅ 토큰 만료 5분 전에 자동 갱신
- ✅ 401 오류 발생 시 자동 갱신 후 재시도
- ✅ Refresh Token으로 새 Access Token 발급
- ✅ 사용자 개입 불필요

---

## 📋 설정 방법

### 1. 환경 변수 설정

`backend/.env` 파일에 다음을 추가:

```bash
# Access Token (필수)
SHAREPOINT_ACCESS_TOKEN=your-access-token

# Refresh Token (자동 갱신용, 권장)
SHAREPOINT_REFRESH_TOKEN=your-refresh-token

# Client ID (선택사항, 기본값 사용 가능)
SHAREPOINT_CLIENT_ID=00000003-0000-0000-c000-000000000000
```

### 2. Refresh Token 발급 방법

#### 방법 1: OAuth 2.0 플로우 (권장)

**1단계: 인증 URL 생성**

브라우저에서 다음 URL로 접속 (공백 없이):

**옵션 A: common 사용 (권장, 가장 간단)**
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=http://localhost&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

**옵션 B: 테넌트 도메인 사용**
```
https://login.microsoftonline.com/ajgroup365.onmicrosoft.com/oauth2/v2.0/authorize?client_id=00000003-0000-0000-c000-000000000000&response_type=code&redirect_uri=http://localhost&scope=https://graph.microsoft.com/.default offline_access&response_mode=query
```

⚠️ **주의**: URL에 공백(`%20`)이 포함되지 않도록 주의하세요!

**2단계: 로그인 및 코드 받기**

- 로그인 후 리디렉션 URL에서 `code` 파라미터 복사
- 예: `http://localhost?code=0.ABC123...`

**3단계: 토큰 교환**

PowerShell 사용:
```powershell
# common 사용 (권장)
$tenantDomain = "common"
# 또는 테넌트 도메인 사용
# $tenantDomain = "ajgroup365.onmicrosoft.com"

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

또는 curl:
```bash
curl -X POST "https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/token" \
  -d "client_id=00000003-0000-0000-c000-000000000000" \
  -d "code=[복사한-code]" \
  -d "redirect_uri=http://localhost" \
  -d "grant_type=authorization_code" \
  -d "scope=https://graph.microsoft.com/.default offline_access"
```

**4단계: 환경 변수에 저장**

응답에서 받은 토큰을 `.env` 파일에 저장:
```bash
SHAREPOINT_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJub...
SHAREPOINT_REFRESH_TOKEN=0.ABC123...
```

#### 방법 2: Microsoft Graph Explorer (Refresh Token 없음)

Microsoft Graph Explorer는 Refresh Token을 제공하지 않으므로, 자동 갱신이 불가능합니다. 수동으로 토큰을 갱신해야 합니다.

---

## 🔧 작동 원리

### 1. 토큰 만료 시간 파싱
- JWT 토큰에서 `exp` 클레임 추출
- 만료 시간을 밀리초로 변환
- 5분 여유를 두고 갱신 시점 계산

### 2. 자동 갱신 트리거
- **요청 전**: 토큰이 곧 만료되면 자동 갱신
- **401 오류**: 토큰 만료로 인한 오류 시 자동 갱신 후 재시도

### 3. 토큰 갱신 프로세스
```
1. Refresh Token으로 새 Access Token 요청
2. 새 Access Token 저장
3. 새 Refresh Token이 있으면 저장
4. 만료 시간 업데이트
5. 원래 요청 재시도
```

---

## 📊 토큰 갱신 로그

서버 로그에서 토큰 갱신 상태를 확인할 수 있습니다:

```
[INFO] Refreshing SharePoint access token...
[INFO] SharePoint access token refreshed successfully
```

오류 발생 시:
```
[ERROR] Error refreshing token: Token refresh failed: 400 Bad Request
```

---

## ⚠️ 주의사항

### 1. Refresh Token 만료
- Refresh Token도 만료될 수 있음 (보통 90일)
- 만료되면 새로 발급 필요

### 2. Refresh Token 보안
- Refresh Token은 매우 민감한 정보
- `.env` 파일에 저장하고 Git에 커밋하지 마세요
- 프로덕션에서는 환경 변수나 보안 저장소 사용

### 3. Client ID
- 기본값: `00000003-0000-0000-c000-000000000000` (Microsoft Graph)
- 대부분의 경우 기본값으로 충분
- 특별한 요구사항이 있으면 변경 가능

---

## 🧪 테스트

### 1. 토큰 만료 시뮬레이션

토큰을 의도적으로 만료된 토큰으로 설정:
```bash
SHAREPOINT_ACCESS_TOKEN=expired-token
SHAREPOINT_REFRESH_TOKEN=valid-refresh-token
```

서버 시작 후 API 호출 시 자동으로 갱신되어야 합니다.

### 2. 로그 확인

서버 로그에서 다음을 확인:
- 토큰 갱신 메시지
- 401 오류 후 자동 재시도
- 성공적인 요청

---

## 🔍 문제 해결

### 오류: "SHAREPOINT_REFRESH_TOKEN is required"
- Refresh Token이 환경 변수에 없음
- `.env` 파일에 `SHAREPOINT_REFRESH_TOKEN` 추가

### 오류: "Token refresh failed: 400 Bad Request"
- Refresh Token이 만료되었거나 잘못됨
- 새 Refresh Token 발급 필요

### 오류: "Token refresh failed: 401 Unauthorized"
- Client ID가 잘못되었거나 권한 없음
- `SHAREPOINT_CLIENT_ID` 확인

### 토큰이 자동 갱신되지 않음
- Refresh Token이 설정되어 있는지 확인
- 서버 로그에서 오류 메시지 확인
- 토큰 만료 시간이 올바르게 파싱되었는지 확인

---

## 📝 요약

1. ✅ **Refresh Token 설정**: `.env` 파일에 `SHAREPOINT_REFRESH_TOKEN` 추가
2. ✅ **자동 갱신**: 토큰 만료 전에 자동으로 갱신
3. ✅ **오류 처리**: 401 오류 시 자동 갱신 후 재시도
4. ✅ **로그 확인**: 서버 로그에서 갱신 상태 확인

이제 토큰 만료 걱정 없이 사용할 수 있습니다! 🎉
