# SharePoint Excel 설정 가이드 (앱 등록 없이)

## 🎯 목표
Azure AD 앱 등록 없이 SharePoint Excel 파일에 접근

## 📋 1단계: SharePoint Excel 파일 준비

### 1.1 Excel 파일 생성
1. SharePoint 사이트에서 Excel 파일 생성
2. 파일명: `AJ_Networks_면접_자동화.xlsx`
3. 위치: SharePoint > Documents

### 1.2 시트 생성 (9개)
다음 시트들을 생성하세요:
1. `interviews` - 면접 기본 정보
2. `candidates` - 면접자 정보
3. `interview_candidates` - 면접-면접자 매핑
4. `candidate_interviewers` - 면접자별 담당 면접관
5. `interviewers` - 면접관 DB
6. `interview_interviewers` - 면접-면접관 매핑
7. `time_selections` - 일정 선택
8. `confirmed_schedules` - 확정 일정
9. `config` - 시스템 설정

### 1.3 헤더 설정
각 시트의 첫 번째 행에 헤더를 추가하세요. (Google Apps Script와 동일한 구조)

---

## 📋 2단계: 토큰 발급 (Microsoft Graph Explorer)

### 2.1 Graph Explorer 접속
1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 회사 계정으로 로그인

### 2.2 토큰 복사
1. 로그인 후 우측 상단의 "Access token" 클릭
2. 토큰 복사 (긴 문자열)
3. ⚠️ 토큰은 1시간 후 만료됩니다

### 2.3 SharePoint 정보 확인

#### Site ID 확인
Graph Explorer에서 실행:
```
GET https://graph.microsoft.com/v1.0/sites?search=[사이트이름]
```

응답에서 `id` 필드 복사 (예: `contoso.sharepoint.com,abc123...`)

#### Drive ID 확인
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

응답에서 Excel 파일이 있는 드라이브의 `id` 복사

#### File ID 확인
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

응답에서 Excel 파일의 `id` 복사

---

## 📋 3단계: 환경 변수 설정

`backend/.env` 파일에 추가:

```bash
# SharePoint 설정
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
SHAREPOINT_FILE_ID=your-file-id
SHAREPOINT_ACCESS_TOKEN=your-access-token
```

### Google Sheets 비활성화
```bash
# Google Sheets 관련 환경 변수는 주석 처리하거나 제거
# GOOGLE_SPREADSHEET_ID=...
# GOOGLE_APPS_SCRIPT_URL=...
# GOOGLE_APPS_SCRIPT_API_KEY=...
```

---

## 📋 4단계: 서버 재시작

```bash
cd backend
npm run dev
```

로그에 다음이 표시되어야 합니다:
```
Using SharePoint Excel as data storage
Server is running on port 3000
```

---

## ⚠️ 토큰 갱신

### 문제
Access Token은 1시간 후 만료됩니다.

### 해결 방법

#### 방법 1: 수동 갱신 (간단)
1. Graph Explorer에서 새 토큰 발급
2. `.env` 파일 업데이트
3. 서버 재시작

#### 방법 2: Refresh Token 사용 (자동화)
- 향후 구현 예정
- Refresh Token으로 자동 갱신

---

## 🔍 테스트

### 1. 헬스체크
```
GET http://localhost:3000/health
```

### 2. Config 조회
```
GET http://localhost:3000/api/config
Authorization: Bearer [admin-token]
```

### 3. 면접 목록 조회
```
GET http://localhost:3000/api/interviews
Authorization: Bearer [admin-token]
```

---

## 📝 다음 단계

1. ✅ SharePoint Excel 파일 생성
2. ✅ 토큰 발급
3. ✅ 환경 변수 설정
4. ✅ 서버 재시작
5. ✅ 테스트

준비되면 알려주세요!
