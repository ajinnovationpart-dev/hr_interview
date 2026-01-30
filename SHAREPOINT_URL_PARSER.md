# SharePoint URL에서 정보 추출하기

## 📋 제공된 URL
```
https://ajgroup365.sharepoint.com/:x:/s/portal2/IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60?e=CC8C51
```

## 🔍 URL 분석

### URL 구조
```
https://[tenant].sharepoint.com/:x:/s/[site-name]/[file-id]?e=[encryption]
```

### 추출된 정보
- **Tenant**: `ajgroup365`
- **Site Name**: `portal2`
- **File ID (부분)**: `IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60`

## 📝 Microsoft Graph API로 정보 확인

### 1단계: Site ID 확인

Graph Explorer에서 실행:
```
GET https://graph.microsoft.com/v1.0/sites/ajgroup365.sharepoint.com:/sites/portal2
```

또는 검색:
```
GET https://graph.microsoft.com/v1.0/sites?search=portal2
```

응답에서 `id` 필드 복사:
```json
{
  "id": "ajgroup365.sharepoint.com,abc123-def456-ghi789,..."
}
```

### 2단계: Drive ID 확인

Site ID를 얻은 후:
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

응답에서 Excel 파일이 있는 드라이브의 `id` 복사:
```json
{
  "value": [
    {
      "id": "b!abc123...",
      "name": "Documents"
    }
  ]
}
```

### 3단계: File ID 확인

Drive ID를 얻은 후:
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

또는 파일 이름으로 검색:
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/search(q='AJ_Networks_면접_자동화')
```

응답에서 Excel 파일의 `id` 복사:
```json
{
  "value": [
    {
      "id": "01ABC...",
      "name": "AJ_Networks_면접_자동화.xlsx"
    }
  ]
}
```

---

## 🚀 자동화 스크립트

아래 스크립트를 사용하여 자동으로 정보를 추출할 수 있습니다:

### PowerShell 스크립트

```powershell
# SharePoint URL에서 정보 추출
$sharePointUrl = "https://ajgroup365.sharepoint.com/:x:/s/portal2/IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60?e=CC8C51"

# URL 파싱
if ($sharePointUrl -match "https://([^/]+)\.sharepoint\.com/:x:/s/([^/]+)/([^?]+)") {
    $tenant = $matches[1]
    $siteName = $matches[2]
    $fileIdPartial = $matches[3]
    
    Write-Host "Tenant: $tenant"
    Write-Host "Site Name: $siteName"
    Write-Host "File ID (Partial): $fileIdPartial"
    
    # Graph API 호출 (토큰 필요)
    $accessToken = "YOUR_ACCESS_TOKEN"
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    # Site ID 조회
    $siteUrl = "https://graph.microsoft.com/v1.0/sites/$tenant.sharepoint.com:/sites/$siteName"
    $siteResponse = Invoke-RestMethod -Uri $siteUrl -Headers $headers -Method Get
    $siteId = $siteResponse.id
    Write-Host "Site ID: $siteId"
    
    # Drive ID 조회
    $drivesUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/drives"
    $drivesResponse = Invoke-RestMethod -Uri $drivesUrl -Headers $headers -Method Get
    $driveId = $drivesResponse.value[0].id
    Write-Host "Drive ID: $driveId"
    
    # File ID 조회
    $filesUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/drives/$driveId/root/children"
    $filesResponse = Invoke-RestMethod -Uri $filesUrl -Headers $headers -Method Get
    $file = $filesResponse.value | Where-Object { $_.name -like "*면접*" -or $_.name -like "*interview*" }
    if ($file) {
        Write-Host "File ID: $($file.id)"
        Write-Host "File Name: $($file.name)"
    }
}
```

---

## 📋 수동 확인 방법

### 방법 1: Graph Explorer 사용 (권장)

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. 다음 순서로 실행:

**Step 1: Site ID**
```
GET https://graph.microsoft.com/v1.0/sites/ajgroup365.sharepoint.com:/sites/portal2
```
→ `id` 필드 복사

**Step 2: Drive ID**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```
→ `id` 필드 복사 (보통 첫 번째 드라이브)

**Step 3: File ID**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```
→ Excel 파일의 `id` 필드 복사

### 방법 2: 브라우저에서 직접 확인

1. SharePoint 사이트에서 Excel 파일 열기
2. 브라우저 개발자 도구 (F12)
3. Network 탭에서 Microsoft Graph API 호출 확인
4. 응답에서 ID 추출

---

## 🔧 환경 변수 설정

정보를 얻은 후 `backend/.env`에 설정:

```bash
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=ajgroup365.sharepoint.com,abc123-def456-...
SHAREPOINT_DRIVE_ID=b!abc123...
SHAREPOINT_FILE_ID=01ABC...
SHAREPOINT_ACCESS_TOKEN=your-access-token
```

---

## 💡 빠른 확인 방법

Graph Explorer에서 한 번에 확인:

```
GET https://graph.microsoft.com/v1.0/sites/ajgroup365.sharepoint.com:/sites/portal2/drives/root/children
```

이렇게 하면 Site ID와 Drive ID를 자동으로 사용하고, 파일 목록을 바로 확인할 수 있습니다.
