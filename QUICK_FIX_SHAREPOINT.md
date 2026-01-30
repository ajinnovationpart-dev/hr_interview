# SharePoint 오류 빠른 해결

## 🔴 현재 문제

1. **Graph API를 사용 중** (REST API가 아님)
2. **토큰이 실제 토큰이 아님** (`your-access-token`)

## ✅ 해결 방법: REST API로 전환

### 1단계: 환경 변수 수정

`backend/.env` 파일을 열고 다음을 수정:

**기존 (Graph API용):**
```bash
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
SHAREPOINT_FILE_ID=your-file-id
SHAREPOINT_ACCESS_TOKEN=your-access-token
```

**변경 (REST API용):**
```bash
SHAREPOINT_ENABLED=true
SHAREPOINT_USE_REST_API=true
SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2
SHAREPOINT_FILE_PATH=/Shared Documents/면접.xlsx
SHAREPOINT_ACCESS_TOKEN=실제-토큰-여기에-입력
```

### 2단계: 토큰 발급

**방법 A: Microsoft Graph Explorer (간단)**

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 로그인
4. 우측 상단 "Access token" 클릭 → 복사
5. `.env` 파일의 `SHAREPOINT_ACCESS_TOKEN`에 붙여넣기

**방법 B: Device Code Flow (Refresh Token 포함, 자동 갱신)**

```powershell
.\get-sharepoint-token.ps1
```

스크립트가 자동으로 토큰을 클립보드에 복사합니다.

### 3단계: 서버 재시작

```bash
cd backend
npm run dev
```

로그에서 다음을 확인:
```
SharePoint REST API service initialized
Using SharePoint REST API as data storage
```

## 📋 완전한 .env 예시

```bash
# SharePoint 설정 (REST API)
SHAREPOINT_ENABLED=true
SHAREPOINT_USE_REST_API=true
SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2
SHAREPOINT_FILE_PATH=/Shared Documents/면접.xlsx
SHAREPOINT_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJub...
SHAREPOINT_REFRESH_TOKEN=0.ABC123...  # 선택사항, 자동 갱신용
```

## ⚠️ 주의사항

- Graph API용 환경 변수(`SHAREPOINT_SITE_ID` 등)는 제거하거나 주석 처리
- REST API 사용 시 `SHAREPOINT_USE_REST_API=true` 필수
- 토큰은 실제 토큰이어야 함 (플레이스홀더 아님)
