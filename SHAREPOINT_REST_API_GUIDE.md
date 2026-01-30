# SharePoint REST API 사용 가이드

## 🎯 개요

Microsoft Graph API 대신 **SharePoint REST API를 직접 사용**하는 방법입니다.

### 장점
- ✅ Graph API보다 간단함
- ✅ Site ID, Drive ID, File ID 불필요
- ✅ SharePoint 사이트 URL과 파일 경로만 필요
- ✅ Excel 파일을 직접 다운로드/업로드

### 단점
- ⚠️ 여전히 인증 필요 (하지만 더 간단)
- ⚠️ Excel 파일을 메모리에서 처리 (대용량 파일 시 주의)

---

## 📋 설정 방법

### 1. 환경 변수 설정

`backend/.env` 파일에 다음을 추가:

```bash
# SharePoint 활성화
SHAREPOINT_ENABLED=true

# REST API 사용 (Graph API 대신)
SHAREPOINT_USE_REST_API=true

# SharePoint 사이트 URL (필수)
SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2

# Excel 파일 경로 (기본값: /Shared Documents/면접.xlsx)
SHAREPOINT_FILE_PATH=/Shared Documents/면접.xlsx

# Access Token (필수)
SHAREPOINT_ACCESS_TOKEN=your-access-token

# Refresh Token (자동 갱신용, 선택사항이지만 권장)
SHAREPOINT_REFRESH_TOKEN=your-refresh-token

# Client ID (토큰 갱신용, 선택사항 - Microsoft Graph 기본값 사용)
SHAREPOINT_CLIENT_ID=00000003-0000-0000-c000-000000000000

# 테넌트 도메인 (토큰 갱신용, 선택사항 - 기본값: common)
# 예: ajgroup365.onmicrosoft.com 또는 실제 테넌트 ID
# common을 사용하면 모든 Microsoft 계정에서 작동
SHAREPOINT_TENANT_DOMAIN=common
```

### 2. SharePoint 사이트 URL 형식

```
https://[tenant].sharepoint.com/sites/[site-name]
```

예:
```
https://ajgroup365.sharepoint.com/sites/portal2
```

### 3. 파일 경로 형식

SharePoint의 파일 경로는 다음과 같습니다:

```
/Shared Documents/파일명.xlsx
```

또는:

```
/sites/[site-name]/Shared Documents/파일명.xlsx
```

**주의**: 파일 경로는 `/Shared Documents/`로 시작해야 합니다.

---

## 🔐 토큰 발급

### 방법 1: Microsoft Graph Explorer 사용

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 회사 계정으로 로그인
4. 우측 상단의 "Access token" 클릭
5. 토큰 복사
6. `SHAREPOINT_ACCESS_TOKEN`에 저장

### 방법 2: OAuth 2.0 플로우로 Refresh Token 포함 발급

Refresh Token을 얻으려면 OAuth 2.0 인증 플로우를 사용해야 합니다.

#### 간단한 방법: 브라우저에서 토큰 발급

1. 다음 URL로 접속 (브라우저에서):
```
https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/authorize?
  client_id=00000003-0000-0000-c000-000000000000
  &response_type=code
  &redirect_uri=http://localhost
  &scope=https://graph.microsoft.com/.default offline_access
  &response_mode=query
```

2. 로그인 후 리디렉션 URL에서 `code` 파라미터 복사
3. 다음 명령으로 토큰 교환:
```bash
curl -X POST https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/token \
  -d "client_id=00000003-0000-0000-c000-000000000000" \
  -d "code=[복사한-code]" \
  -d "redirect_uri=http://localhost" \
  -d "grant_type=authorization_code" \
  -d "scope=https://graph.microsoft.com/.default offline_access"
```

4. 응답에서 `access_token`과 `refresh_token` 복사

#### 더 간단한 방법: Microsoft Graph Explorer 사용

Microsoft Graph Explorer는 Refresh Token을 제공하지 않으므로, 자동 갱신을 위해서는 OAuth 2.0 플로우를 사용해야 합니다.

---

## 📊 Excel 파일 구조

Excel 파일은 다음 9개 시트를 포함해야 합니다:

1. `interviews` - 면접 기본 정보
2. `candidates` - 면접자 정보
3. `interview_candidates` - 면접-면접자 매핑
4. `candidate_interviewers` - 면접자별 담당 면접관
5. `interviewers` - 면접관 DB
6. `interview_interviewers` - 면접-면접관 매핑
7. `time_selections` - 일정 선택
8. `confirmed_schedules` - 확정 일정
9. `config` - 시스템 설정

각 시트의 첫 번째 행은 헤더입니다.

---

## 🔧 작동 원리

### 1. Excel 파일 다운로드
```
GET /_api/web/GetFileByServerRelativeUrl('/sites/portal2/Shared Documents/file.xlsx')/$value
```

### 2. Excel 파일 읽기
- `xlsx` 라이브러리로 Excel 파일을 메모리에서 읽기
- 워크시트별로 데이터 처리

### 3. Excel 파일 수정
- 메모리에서 Excel 파일 수정
- 워크시트 추가/수정/삭제

### 4. Excel 파일 업로드
```
POST /_api/web/GetFolderByServerRelativeUrl('/sites/portal2/Shared Documents')/Files/add(url='file.xlsx', overwrite=true)
```

또는:

```
PUT /_api/web/GetFileByServerRelativeUrl('/sites/portal2/Shared Documents/file.xlsx')/$value
```

---

## ⚠️ 주의사항

### 1. 토큰 만료 및 자동 갱신
- Access Token은 보통 **1시간 후 만료**
- **Refresh Token을 설정하면 자동으로 갱신됩니다!**
- Refresh Token이 없으면 수동으로 새 토큰 발급 필요
- 토큰이 만료되기 5분 전에 자동으로 갱신 시도
- 401 오류 발생 시 자동으로 토큰 갱신 후 재시도

### 2. 파일 크기
- Excel 파일이 너무 크면 메모리 사용량 증가
- 권장: 10MB 이하

### 3. 동시 편집
- 여러 사용자가 동시에 편집하면 충돌 가능
- 마지막 저장이 우선

### 4. 권한
- SharePoint 사이트에 대한 **읽기/쓰기 권한** 필요
- Excel 파일에 대한 **편집 권한** 필요

---

## 🧪 테스트

### 1. 서버 시작
```bash
cd backend
npm run dev
```

로그에 다음이 표시되어야 합니다:
```
SharePoint REST API service initialized
Using SharePoint REST API as data storage
Server is running on port 3000
```

### 2. 헬스체크
```bash
GET http://localhost:3000/health
```

### 3. Config 조회
```bash
GET http://localhost:3000/api/config
Authorization: Bearer [admin-token]
```

### 4. 면접 목록 조회
```bash
GET http://localhost:3000/api/interviews
Authorization: Bearer [admin-token]
```

---

## 🔄 Graph API와 비교

| 항목 | Graph API | REST API |
|------|-----------|----------|
| **설정 복잡도** | ⭐⭐⭐⭐ 복잡 | ⭐⭐ 간단 |
| **필요 정보** | Site ID, Drive ID, File ID | 사이트 URL, 파일 경로 |
| **토큰 발급** | 복잡 | 간단 |
| **파일 처리** | Graph API 엔드포인트 | 직접 다운로드/업로드 |
| **성능** | 빠름 | 보통 |
| **유연성** | 제한적 | 높음 |

---

## 📝 환경 변수 요약

```bash
# 필수
SHAREPOINT_ENABLED=true
SHAREPOINT_USE_REST_API=true
SHAREPOINT_SITE_URL=https://ajgroup365.sharepoint.com/sites/portal2
SHAREPOINT_ACCESS_TOKEN=your-access-token

# 선택 (기본값 사용 가능)
SHAREPOINT_FILE_PATH=/Shared Documents/AJ_Networks_면접_자동화.xlsx
```

---

## 🆘 문제 해결

### 오류: "Failed to load Excel file: 401"
- 토큰이 만료되었거나 잘못됨
- 새 토큰 발급 필요

### 오류: "Failed to load Excel file: 404"
- 파일 경로가 잘못됨
- `SHAREPOINT_FILE_PATH` 확인

### 오류: "Invalid SharePoint site URL format"
- 사이트 URL 형식 확인
- `https://[tenant].sharepoint.com/sites/[site-name]` 형식이어야 함

### 오류: "Worksheet not found"
- Excel 파일에 해당 시트가 없음
- 시트 이름 확인 (대소문자 구분)

---

## 📚 참고 자료

- [SharePoint REST API 문서](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [xlsx 라이브러리 문서](https://sheetjs.com/)

---

준비되면 알려주세요!
