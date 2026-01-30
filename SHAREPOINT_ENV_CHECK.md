# SharePoint 환경 변수 확인 및 수정

## 🔴 현재 문제

로그를 보면:
```
Using SharePoint Excel (Graph API) as data storage
```

**문제**: Graph API를 사용하고 있는데, REST API를 사용하려고 했습니다.

## ✅ 해결 방법

### 옵션 1: REST API 사용 (권장)

`backend/.env` 파일에 다음을 추가/수정:

```bash
# SharePoint 활성화
SHAREPOINT_ENABLED=true

# REST API 사용 (이게 핵심!)
SHAREPOINT_USE_REST_API=true

# SharePoint 사이트 URL
SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2

# Excel 파일 경로
SHAREPOINT_FILE_PATH=/Shared Documents/면접.xlsx

# Access Token (Microsoft Graph Explorer에서 받은 토큰)
SHAREPOINT_ACCESS_TOKEN=your-access-token-here

# Refresh Token (선택사항, 자동 갱신용)
SHAREPOINT_REFRESH_TOKEN=your-refresh-token-here
```

### 옵션 2: Graph API 사용 (현재 설정 유지)

Graph API를 사용하려면 다음이 필요합니다:

```bash
SHAREPOINT_ENABLED=true
# SHAREPOINT_USE_REST_API는 설정하지 않거나 false

# Graph API용 설정
SHAREPOINT_SITE_ID=site-id-here
SHAREPOINT_DRIVE_ID=drive-id-here
SHAREPOINT_FILE_ID=file-id-here
SHAREPOINT_ACCESS_TOKEN=valid-jwt-token-here
```

## 🔍 환경 변수 확인

현재 `.env` 파일을 확인하세요:

```powershell
# PowerShell에서
Get-Content backend\.env | Select-String "SHAREPOINT"
```

## 📝 빠른 수정

REST API를 사용하려면:

1. `backend/.env` 파일 열기
2. 다음 추가/수정:
   ```bash
   SHAREPOINT_USE_REST_API=true
   SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2
   SHAREPOINT_FILE_PATH=/Shared Documents/면접.xlsx
   ```
3. 서버 재시작

## ⚠️ 토큰 형식 오류

오류 메시지:
```
JWT is not well formed, there are no dots (.)
```

**원인**: 토큰이 JWT 형식이 아닙니다.

**해결**:
1. Microsoft Graph Explorer에서 새 토큰 발급
2. 또는 Device Code Flow로 토큰 발급 (Refresh Token 포함)
