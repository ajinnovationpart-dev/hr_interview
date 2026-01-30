# SharePoint 정보 자동 추출 가이드

## 🎯 제공된 URL
```
https://ajgroup365.sharepoint.com/:x:/s/portal2/IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60?e=CC8C51
```

## 📋 방법 1: API를 통한 자동 추출 (권장)

### 1단계: Access Token 발급
1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. "Access token" 복사

### 2단계: API 호출

**Postman 또는 curl 사용:**

```bash
POST http://localhost:3000/api/sharepoint/extract-info
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "url": "https://ajgroup365.sharepoint.com/:x:/s/portal2/IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60?e=CC8C51",
  "accessToken": "your-graph-api-access-token",
  "fileName": "AJ_Networks_면접_자동화.xlsx"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "siteId": "ajgroup365.sharepoint.com,abc123...",
    "driveId": "b!abc123...",
    "fileId": "01ABC...",
    "envFormat": {
      "SHAREPOINT_SITE_ID": "...",
      "SHAREPOINT_DRIVE_ID": "...",
      "SHAREPOINT_FILE_ID": "..."
    }
  }
}
```

### 3단계: 환경 변수 설정

응답의 `envFormat` 값을 `backend/.env`에 복사:

```bash
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=응답의-siteId
SHAREPOINT_DRIVE_ID=응답의-driveId
SHAREPOINT_FILE_ID=응답의-fileId
SHAREPOINT_ACCESS_TOKEN=your-access-token
```

---

## 📋 방법 2: Graph Explorer에서 수동 확인

### Step 1: Site ID 확인

Graph Explorer에서 실행:
```
GET https://graph.microsoft.com/v1.0/sites/ajgroup365.sharepoint.com:/sites/portal2
```

응답:
```json
{
  "id": "ajgroup365.sharepoint.com,abc123-def456-ghi789,...",
  "name": "portal2",
  ...
}
```

**Site ID**: `ajgroup365.sharepoint.com,abc123-def456-ghi789,...`

### Step 2: Drive ID 확인

```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

응답:
```json
{
  "value": [
    {
      "id": "b!abc123...",
      "name": "Documents",
      ...
    }
  ]
}
```

**Drive ID**: `b!abc123...` (보통 첫 번째 드라이브)

### Step 3: File ID 확인

```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

응답에서 Excel 파일 찾기:
```json
{
  "value": [
    {
      "id": "01ABC...",
      "name": "AJ_Networks_면접_자동화.xlsx",
      ...
    }
  ]
}
```

**File ID**: `01ABC...`

---

## 🔧 환경 변수 설정

`backend/.env` 파일에 추가:

```bash
# SharePoint 설정
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=ajgroup365.sharepoint.com,abc123-def456-...
SHAREPOINT_DRIVE_ID=b!abc123...
SHAREPOINT_FILE_ID=01ABC...
SHAREPOINT_ACCESS_TOKEN=your-access-token-from-graph-explorer
```

---

## ✅ 확인

서버 재시작 후 로그 확인:
```
Using SharePoint Excel as data storage
Server is running on port 3000
```

테스트:
```
GET http://localhost:3000/api/config
Authorization: Bearer [admin-token]
```

---

## 💡 팁

### 파일 이름이 다른 경우
API 호출 시 `fileName` 파라미터를 변경:
```json
{
  "url": "...",
  "accessToken": "...",
  "fileName": "실제-파일명.xlsx"
}
```

### 여러 파일이 있는 경우
API가 자동으로 "면접" 또는 "interview"가 포함된 파일을 찾습니다.
