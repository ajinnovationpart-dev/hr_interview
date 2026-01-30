# SharePoint 토큰 발급 가이드 (앱 등록 없이)

## 🎯 목표
Azure AD 앱 등록 없이 SharePoint Excel에 접근하기 위한 토큰 발급

## 📋 방법 1: Microsoft Graph Explorer 사용 (가장 간단)

### 1단계: Graph Explorer 접속
1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 회사 계정으로 로그인

### 2단계: 토큰 복사
1. 로그인 후 우측 상단의 "Access token" 클릭
2. 토큰 복사
3. `backend/.env` 파일에 추가:
   ```bash
   SHAREPOINT_ACCESS_TOKEN=복사한-토큰
   ```

### 3단계: SharePoint 정보 확인
1. SharePoint 사이트 URL에서 정보 추출:
   ```
   https://[tenant].sharepoint.com/sites/[site-name]
   ```
2. 또는 Microsoft Graph API로 확인:
   ```
   GET https://graph.microsoft.com/v1.0/sites?search=[site-name]
   ```

### 4단계: 환경 변수 설정
```bash
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=site-id-here
SHAREPOINT_DRIVE_ID=drive-id-here
SHAREPOINT_FILE_ID=file-id-here
SHAREPOINT_ACCESS_TOKEN=access-token-here
```

---

## 📋 방법 2: 간단한 OAuth 2.0 플로우 (자동화)

### 구현 예정
- 사용자가 브라우저에서 한 번 로그인
- 토큰 자동 발급 및 저장
- Refresh Token으로 자동 갱신

---

## ⚠️ 주의사항

### 토큰 만료
- Access Token은 보통 1시간 후 만료
- Refresh Token으로 자동 갱신 필요
- 또는 주기적으로 Graph Explorer에서 새 토큰 발급

### 권한
- SharePoint 사이트에 대한 읽기/쓰기 권한 필요
- Excel 파일에 대한 편집 권한 필요

---

## 🔍 SharePoint 정보 확인 방법

### Site ID 확인
```bash
# Graph Explorer에서 실행
GET https://graph.microsoft.com/v1.0/sites?search=[site-name]
```

### Drive ID 확인
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

### File ID 확인
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

---

## 📝 다음 단계

1. **토큰 발급** (위 방법 1 사용)
2. **SharePoint 정보 확인**
3. **환경 변수 설정**
4. **서버 재시작**

준비되면 알려주세요!
