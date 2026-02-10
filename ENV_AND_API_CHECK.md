# 환경 변수 및 API 호출 점검

## 1. 필수 환경 변수 (백엔드)

| 변수 | 용도 | 없을 때 |
|------|------|---------|
| `JWT_SECRET` | 관리자/면접관 JWT 서명 | 500 에러, 로그인 불가 |
| `ALLOWED_ADMIN_EMAILS` | 관리자 로그인 허용 이메일 (쉼표 구분) | 빈 값이면 모든 이메일 허용 가능 (구현에 따름) |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 | 기본값 admin123 사용 |

### 데이터 저장소 (하나만 사용)

- **OneDrive Local (Excel 파일)**  
  - `ONEDRIVE_ENABLED=true`  
  - `ONEDRIVE_EXCEL_PATH` = Excel 파일 절대 경로  
  - 이력서 파일: `RESUME_UPLOAD_DIR` (선택, 기본: `uploads/resumes`)  
  - **평가·포트폴리오**는 OneDrive Local 사용 시에만 저장됨.

- **Google Sheets**  
  - `ONEDRIVE_ENABLED` ≠ true, `SHAREPOINT_ENABLED` ≠ true  
  - 평가 API는 호출 가능하나 저장되지 않음(스텁). 이력서는 별도 스토리지 필요.

- **SharePoint**  
  - `SHAREPOINT_ENABLED=true` 등 SharePoint 관련 변수 설정  
  - 평가/이력서 등 추가 기능은 스토리지별 구현 여부 확인 필요.

### 챗봇 LLM (Groq만 사용, 무료)

- **`GROQ_API_KEY`**  
  - [Groq Console](https://console.groq.com)에서 발급. **무료 티어**, 신용카드 불필요.
- **`GROQ_CHAT_MODEL`** (선택)  
  - 기본값: `llama-3.1-8b-instant`. 429 시 2초 후 동일 모델로 1회 재시도. [지원 모델](https://console.groq.com/docs/models)
- 요청 큐(초당 약 1회) + 컨텍스트 길이 제한으로 429 완화.

### 면접관 일정 조회 (Power Automate, 선택)

- **`INTERVIEWER_SCHEDULE_CHECK_URL`**  
  - 면접관 일정 조회 API URL (Power Automate HTTP 트리거 등).  
  - 설정 시: 면접 일정 확인 페이지에서 해당 기간에 일정이 있으면 일정 선택 불가.  
  - 미설정 시: 일정 조회 없이 항상 선택 가능.

## 2. 프론트엔드 API URL

- **개발 (VITE_API_URL 미설정)**  
  - `api`, `apiA` 모두 `http://localhost:3000/api` (단일 백엔드).  
  - 백엔드는 **3000 포트**에서 실행해야 함.

- **프로덕션**  
  - `VITE_API_URL`에 백엔드 API 베이스 URL 설정 (예: `https://your-api.com/api`).  
  - apiA는 위 URL을 정규화한 뒤 `/api/a`를 붙일 수 있음.  
  - 백엔드는 `/api`와 `/api/a` 동일 라우트를 모두 제공하므로 두 방식 모두 호출 가능.

## 3. API 호출 일관성

- **관리자·면접관 포털**: `apiA` 사용 (인증 토큰 자동 첨부).  
- **이력서 업로드**: `apiA.post('/resumes/upload', formData)` 사용 (동일 백엔드).  
- **이력서 다운로드 링크**: `apiA.defaults.baseURL` 기준으로 생성.

## 4. 데이터/기능별 참고

| 기능 | OneDrive Local | Google Sheets | 비고 |
|------|----------------|---------------|------|
| 면접/면접관/지원자 CRUD | ✅ | ✅ | 공통 |
| 이력서 업로드·다운로드 | ✅ | - | 로컬 파일 또는 별도 스토리지 |
| 면접 평가 저장·조회 | ✅ | 스텁(빈 배열) | 통계 합산은 OneDrive 시에만 의미 있음 |
| 지원자 포트폴리오 URL | ✅ (컬럼 추가) | - | OneDrive 시트에만 저장 |

## 5. 점검 체크리스트

- [ ] 백엔드 `.env`에 `JWT_SECRET` 설정  
- [ ] 관리자 이메일/비밀번호(`ALLOWED_ADMIN_EMAILS`, `ADMIN_PASSWORD`) 설정  
- [ ] 사용할 저장소(OneDrive/Google/SharePoint)에 맞게 해당 env 설정  
- [ ] OneDrive 사용 시 `ONEDRIVE_EXCEL_PATH`, 필요 시 `RESUME_UPLOAD_DIR` 설정  
- [ ] 프론트 개발 시 백엔드가 3000 포트에서 실행 중인지 확인  
- [ ] 프로덕션 배포 시 `VITE_API_URL` 설정 후 빌드  
