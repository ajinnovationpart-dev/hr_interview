# 전체 기능 점검 가이드

면접 시스템의 메일 발송, API, 데이터 저장소, 환경 변수를 한 번에 점검할 때 참고하세요.

---

## 1. 메일 발송 (가장 자주 문제되는 부분)

### 1.1 필수 환경 변수

| 변수 | 설명 | 없을 때 |
|------|------|---------|
| `SMTP_USER` | SMTP 로그인 이메일 (예: Gmail 주소) | **메일 발송 불가** (transporter 미초기화) |
| `SMTP_PASSWORD` 또는 `SMTP_PASS` | SMTP 비밀번호 (Gmail은 **앱 비밀번호** 사용) | **메일 발송 불가** |

Gmail 사용 시:
- 2단계 인증 켜기 → 앱 비밀번호 생성 후 `SMTP_PASSWORD`에 입력
- `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` (기본값)

### 1.2 선택 환경 변수

| 변수 | 설명 |
|------|------|
| `SMTP_HOST` | 기본값 `smtp.gmail.com` |
| `SMTP_PORT` | 기본값 `587` |
| `EMAIL_FROM` / `SMTP_FROM` | 발신 주소 (없으면 SMTP_USER 사용) |
| `EMAIL_FROM_NAME` / `SMTP_FROM_NAME` | 발신자 이름 |
| `FRONTEND_URL` | 확인 링크용 (예: `http://localhost:5173`) |

### 1.3 설정(Config) 시트에서 지정 가능한 값

관리자 설정 화면 또는 데이터 저장소의 `config` 시트에서 설정 가능:
- `smtp_from_email`, `smtp_from_name`, `smtp_reply_to`
- `email_greeting`, `email_company_name`, `email_department_name`, `email_contact_email`, `email_footer_text`

### 1.4 메일 발송 여부 확인

**백엔드 서버 로그**
- 시작 시 `SMTP credentials not configured` → .env에 SMTP_USER, SMTP_PASSWORD 설정 필요
- `SMTP server connection verified` → 연결 성공
- `SMTP server connection failed` → 호스트/포트/방화벽/앱 비밀번호 확인

**API로 확인**
- `GET /api/test-email/status` (또는 `GET /api/a/test-email/status`)
  - `emailConfigured: true` → SMTP 설정됨
  - `emailConfigured: false` → .env에 SMTP_USER, SMTP_PASSWORD 설정 필요

**테스트 메일 발송**
- `POST /api/test-email` (또는 `POST /api/a/test-email`)
- Body: `{ "to": "받을이메일@example.com", "subject": "(선택)" }`
- 성공 시 해당 주소로 테스트 메일 수신

### 1.5 면접 생성 시 메일이 0명 발송될 때

- 응답 메시지에 “SMTP 설정(.env의 SMTP_USER, SMTP_PASSWORD)과 서버 로그를 확인하거나, POST /api/test-email로 테스트 메일을 보내 보세요.” 안내가 포함됨.
- 백엔드 로그에서 `Failed to send email to ...` 로그로 수신자별 실패 원인 확인.
- 면접관 이메일이 비어 있거나, 비활성(is_active=false)이면 해당 면접관에는 발송하지 않음.

---

## 2. 환경 변수 전체 요약

### 2.1 필수 (공통)

| 변수 | 용도 |
|------|------|
| `JWT_SECRET` | JWT 서명 (관리자/면접관) |
| `ALLOWED_ADMIN_EMAILS` | 관리자 로그인 허용 이메일 (쉼표 구분) |
| `ADMIN_PASSWORD` | 관리자 비밀번호 (기본값: admin123) |

### 2.2 메일 (위 1장 참고)

- `SMTP_USER`, `SMTP_PASSWORD`(또는 `SMTP_PASS`) 필수.

### 2.3 데이터 저장소 (하나만 사용)

**OneDrive Local (Excel)**
- `ONEDRIVE_ENABLED=true`
- `ONEDRIVE_EXCEL_PATH` = Excel 파일 절대 경로
- `RESUME_UPLOAD_DIR` (선택, 기본: `uploads/resumes`)

**Google Sheets**
- `ONEDRIVE_ENABLED` ≠ true, `SHAREPOINT_ENABLED` ≠ true

**SharePoint**
- `SHAREPOINT_ENABLED=true` 및 SharePoint 관련 변수

### 2.4 프론트/배포

- `FRONTEND_URL` – 확인 링크/리다이렉트용
- `VITE_API_URL` – 프로덕션 빌드 시 백엔드 API URL
- `PORT` – 백엔드 포트 (기본 3000)

---

## 3. API·라우트 요약

- **인증**: `/api/auth`, `/api/a/auth`
- **면접**: `/api/interviews`, `/api/a/interviews` (생성 시 메일 자동 발송)
- **설정**: `/api/config`, `/api/a/config`
- **이력서**: `/api/resumes`, `/api/a/resumes` (업로드/다운로드)
- **메일 점검**: `GET /api/test-email/status`, `POST /api/test-email` (동일하게 `/api/a/` 경로 지원)

프론트는 `apiA` 기준으로 호출하므로 baseURL이 `/api` 또는 `/api/a`일 수 있음. 백엔드는 두 경로 모두 동일 라우트 제공.

---

## 4. 데이터 저장소별 기능

| 기능 | OneDrive Local | Google Sheets | 비고 |
|------|----------------|---------------|------|
| 면접/면접관/지원자 CRUD | ✅ | ✅ | 공통 |
| 설정(config) | ✅ config 시트 | ✅ | 메일 발송 시 config 참조 |
| 이력서 업로드·다운로드 | ✅ | - | 로컬 또는 별도 스토리지 |
| 면접 평가 저장·조회 | ✅ | 스텁(빈 배열) | OneDrive에서만 통계 의미 |
| 리마인더/자동 확정 스케줄러 | ✅ (메일 설정 시) | ✅ | SMTP 필수 |

---

## 5. 점검 체크리스트

- [ ] `.env`에 `SMTP_USER`, `SMTP_PASSWORD`(또는 `SMTP_PASS`) 설정
- [ ] `GET /api/test-email/status` → `emailConfigured: true` 확인
- [ ] `POST /api/test-email` 로 테스트 메일 발송 성공 확인
- [ ] `JWT_SECRET`, `ALLOWED_ADMIN_EMAILS`, `ADMIN_PASSWORD` 설정
- [ ] 사용할 저장소(OneDrive/Google/SharePoint)에 맞는 env 설정
- [ ] OneDrive 사용 시 `ONEDRIVE_EXCEL_PATH`, 필요 시 `RESUME_UPLOAD_DIR` 설정
- [ ] config 시트(또는 관리자 설정)에 메일 관련 값 필요 시 설정
- [ ] 면접관에 이메일 주소가 있고 활성 상태인지 확인

---

## 6. 빠른 진단 순서

1. 백엔드 로그에서 `SMTP credentials not configured` 여부 확인 → 있으면 .env SMTP 설정.
2. `GET /api/test-email/status` 호출 → `emailConfigured: false`면 동일하게 .env 점검.
3. `POST /api/test-email` 로 본인 메일로 테스트 → 실패 시 호스트/포트/앱 비밀번호/방화벽 점검.
4. 면접 생성 후 “0명에게 메일 발송”이면 위 1~3과 면접관 이메일/활성 여부 확인.

이 문서는 `ENV_AND_API_CHECK.md`와 함께 사용하면 됩니다.
