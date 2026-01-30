# SharePoint Excel 전환 완료

## ✅ 완료된 작업

### 1. SharePoint Excel 서비스 구현
- ✅ Microsoft Graph API 클라이언트 통합
- ✅ 사용자 토큰 방식 인증 (앱 등록 불필요)
- ✅ 9개 시트 구조 지원
- ✅ N:N 매핑 구조 지원
- ✅ 모든 CRUD 작업 구현

### 2. 통합 데이터 서비스
- ✅ `dataService.ts` 생성
- ✅ 환경 변수로 Google Sheets / SharePoint Excel 선택
- ✅ 동일한 인터페이스로 통일

### 3. 모든 라우트 업데이트
- ✅ `interview.routes.ts` - 면접 관련
- ✅ `config.routes.ts` - 설정 관리
- ✅ `interviewer.routes.ts` - 면접관 관리
- ✅ `confirm.routes.ts` - 일정 확인
- ✅ `scheduler.service.ts` - 스케줄러
- ✅ `commonSlot.service.ts` - 공통 일정 찾기

---

## 🔧 사용 방법

### 1. SharePoint Excel 파일 준비

SharePoint 사이트에서 Excel 파일 생성:
- 파일명: `AJ_Networks_면접_자동화.xlsx`
- 위치: SharePoint > Documents
- 9개 시트 생성 (Google Apps Script와 동일한 구조)

### 2. 토큰 발급

**Microsoft Graph Explorer 사용:**
1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 회사 계정으로 로그인
4. 우측 상단 "Access token" 클릭
5. 토큰 복사

### 3. SharePoint 정보 확인

Graph Explorer에서 실행:

**Site ID:**
```
GET https://graph.microsoft.com/v1.0/sites?search=[사이트이름]
```

**Drive ID:**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

**File ID:**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

### 4. 환경 변수 설정

`backend/.env` 파일에 추가:

```bash
# SharePoint 설정
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
SHAREPOINT_FILE_ID=your-file-id
SHAREPOINT_ACCESS_TOKEN=your-access-token

# Google Sheets 비활성화 (선택사항)
# GOOGLE_SPREADSHEET_ID=...
# GOOGLE_APPS_SCRIPT_URL=...
# GOOGLE_APPS_SCRIPT_API_KEY=...
```

### 5. 서버 재시작

```bash
cd backend
npm run dev
```

로그 확인:
```
Using SharePoint Excel as data storage
Server is running on port 3000
```

---

## ⚠️ 주의사항

### 토큰 만료
- Access Token은 **1시간 후 만료**됩니다
- 만료 시 Graph Explorer에서 새 토큰 발급 필요
- 향후 Refresh Token 자동 갱신 기능 추가 예정

### 권한
- SharePoint 사이트에 대한 **읽기/쓰기 권한** 필요
- Excel 파일에 대한 **편집 권한** 필요

### Excel 파일 구조
- Google Sheets와 **동일한 구조** 사용
- 9개 시트, 동일한 컬럼 구조
- 헤더는 첫 번째 행에 있어야 함

---

## 🔄 Google Sheets로 되돌리기

환경 변수만 변경하면 됩니다:

```bash
SHAREPOINT_ENABLED=false
# 또는 주석 처리
# SHAREPOINT_ENABLED=true
```

서버 재시작하면 Google Sheets로 전환됩니다.

---

## 📝 다음 단계

1. ✅ SharePoint Excel 파일 생성
2. ✅ 토큰 발급
3. ✅ 환경 변수 설정
4. ✅ 서버 재시작
5. ✅ 테스트

자세한 가이드는 [SHAREPOINT_SETUP_GUIDE.md](./SHAREPOINT_SETUP_GUIDE.md)를 참조하세요.
