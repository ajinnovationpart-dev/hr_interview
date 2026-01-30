# Google Sheets 기반 면접 일정 자동화 시스템 상세 기술 명세서

**문서 버전**: 2.0  
**작성일**: 2025-01-29  
**작성자**: QA Innovation Team  
**프로젝트**: 면접 일정 자동화 시스템 (Interview Scheduling Automation System)

---

## 목차
1. [시스템 개요](#1-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [Google Sheets 데이터 구조](#3-google-sheets-데이터-구조)
4. [시스템 아키텍처](#4-시스템-아키텍처)
5. [페이지별 기능 및 데이터 플로우](#5-페이지별-기능-및-데이터-플로우)
6. [API 설계](#6-api-설계)
7. [Google Sheets API 연동](#7-google-sheets-api-연동)
8. [인증 및 보안](#8-인증-및-보안)
9. [배포 전략](#9-배포-전략)
10. [개발 일정](#10-개발-일정)
11. [부록](#11-부록)

---

## 1. 시스템 개요

### 1.1 프로젝트 정보
- **프로젝트명**: 면접 일정 자동화 시스템 v2.0 (Google Sheets Edition)
- **개발 팀**: QA Innovation Team
- **주요 개발자**: 정주연 대리
- **프로젝트 매니저**: 김영준 Manager
- **데이터 저장소**: Google Sheets (DB 대체)
- **배포 환경**: AWS EC2 + React + Node.js

### 1.2 개발 배경
- **기존 시스템**: Python/Streamlit 기반 프로토타입
- **문제점**: 
  - 안정성 이슈 (Streamlit 배포 환경)
  - 보안 취약점
  - 확장성 제한
  - DB 인프라 구축 부담

### 1.3 Google Sheets 선택 이유
```
✅ 인사팀이 직접 데이터 확인 가능 (엑셀 인터페이스)
✅ 별도 DB 인프라 불필요 (비용 절감)
✅ 실시간 협업 및 공유 기능
✅ 자동 백업 및 버전 관리
✅ Google API 무료 사용
✅ 빠른 개발 및 유지보수
✅ 익숙한 UI (인사팀 교육 불필요)
```

### 1.4 주요 기능
1. **인사팀 포털**
   - 면접 정보 등록 및 관리
   - 면접관 DB 관리 (Excel 업로드)
   - 면접 진행 현황 대시보드
   - 면접 상세 조회 및 수정

2. **면접관 포털**
   - 이메일 링크를 통한 간편 접속
   - 가능 일정 선택 (복수 선택)
   - 실시간 응답 현황 확인

3. **자동화 기능**
   - 면접관에게 자동 이메일 발송 (Microsoft Teams)
   - 공통 일정 자동 추출 및 확정
   - 미응답자 자동 리마인더 (48시간)
   - 확정 알림 자동 발송

---

## 2. 기술 스택

### 2.1 Frontend
```typescript
Framework: React 18.3 + TypeScript 5.3
UI Library: Ant Design 5.x
State Management: 
  - React Query 5.x (서버 상태)
  - Zustand 4.x (클라이언트 상태)
Calendar: react-big-calendar 1.x
Form: React Hook Form 7.x + Zod 3.x
HTTP Client: Axios 1.x
Date: Day.js 1.x
Build: Vite 5.x
Routing: React Router 6.x
```

### 2.2 Backend
```typescript
Runtime: Node.js 20.x LTS
Framework: Express.js 4.x + TypeScript 5.x
Google Sheets: googleapis 130.x
Email: @microsoft/microsoft-graph-client 3.x
Authentication: jsonwebtoken 9.x
Validation: Zod 3.x
Scheduler: node-cron 3.x
Environment: dotenv 16.x
Logging: winston 3.x
```

### 2.3 Infrastructure
```yaml
서버: AWS EC2 t3.small (2vCPU, 2GB RAM)
OS: Ubuntu 22.04 LTS
Reverse Proxy: Nginx 1.24
Process Manager: PM2 5.x
SSL: Let's Encrypt (Certbot)
모니터링: PM2 + CloudWatch Logs
도메인: [회사 도메인 할당 필요]
```

---

## 3. Google Sheets 데이터 구조

### 3.1 스프레드시트 생성
```
스프레드시트 이름: AJ Networks 면접 자동화 시스템
URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}

구성:
├── Sheet 1: interviews (면접 정보)
├── Sheet 2: interviewers (면접관 DB)
├── Sheet 3: interview_interviewers (면접-면접관 매핑)
├── Sheet 4: time_selections (일정 선택)
└── Sheet 5: confirmed_schedules (확정 일정)
```

### 3.2 Sheet 1: interviews

**열 구조 (A~J)**
| 열 | 필드명 | 데이터 타입 | 설명 |
|---|--------|------------|------|
| A | interview_id | TEXT | 면접 고유 ID (예: INT_1738051200000) |
| B | main_notice | TEXT | 공고명 (예: 2025년 2월 수시 채용) |
| C | team_name | TEXT | 팀명 (예: 정보전략팀) |
| D | start_datetime | DATETIME | 시작 일시 (예: 2025-01-28 11:00:00) |
| E | end_datetime | DATETIME | 종료 일시 (예: 2025-01-28 12:00:00) |
| F | status | TEXT | 상태 (PENDING/PARTIAL/CONFIRMED/NO_COMMON) |
| G | candidates | TEXT | 면접자 이름 (쉼표 구분) |
| H | created_by | TEXT | 작성자 이메일 |
| I | created_at | DATETIME | 생성 일시 |
| J | updated_at | DATETIME | 수정 일시 |

**상태 값 정의**
```typescript
enum InterviewStatus {
  PENDING = 'PENDING',      // 면접관 응답 대기 중
  PARTIAL = 'PARTIAL',      // 일부 면접관 응답 완료
  CONFIRMED = 'CONFIRMED',  // 일정 확정 완료
  NO_COMMON = 'NO_COMMON',  // 공통 일정 없음
  CANCELLED = 'CANCELLED'   // 취소됨
}
```

### 3.3 Sheet 2: interviewers

**열 구조 (A~H)**
| 열 | 필드명 | 데이터 타입 | 설명 |
|---|--------|------------|------|
| A | interviewer_id | TEXT | 면접관 고유 ID |
| B | name | TEXT | 이름 |
| C | email | TEXT | 이메일 (고유값) |
| D | department | TEXT | 부서 |
| E | position | TEXT | 직책 |
| F | phone | TEXT | 연락처 |
| G | is_active | BOOLEAN | 활성 여부 (TRUE/FALSE) |
| H | created_at | DATETIME | 생성 일시 |

### 3.4 Sheet 3: interview_interviewers

**열 구조 (A~C)**
| 열 | 필드명 | 데이터 타입 | 설명 |
|---|--------|------------|------|
| A | interview_id | TEXT | 면접 ID |
| B | interviewer_id | TEXT | 면접관 ID |
| C | responded_at | DATETIME | 응답 완료 시간 (NULL이면 미응답) |

### 3.5 Sheet 4: time_selections

**열 구조 (A~G)**
| 열 | 필드명 | 데이터 타입 | 설명 |
|---|--------|------------|------|
| A | selection_id | TEXT | 선택 고유 ID |
| B | interview_id | TEXT | 면접 ID |
| C | interviewer_id | TEXT | 면접관 ID |
| D | slot_date | DATE | 날짜 |
| E | start_time | TIME | 시작 시간 |
| F | end_time | TIME | 종료 시간 |
| G | created_at | DATETIME | 생성 일시 |

### 3.6 Sheet 5: confirmed_schedules

**열 구조 (A~E)**
| 열 | 필드명 | 데이터 타입 | 설명 |
|---|--------|------------|------|
| A | interview_id | TEXT | 면접 ID (고유값) |
| B | confirmed_date | DATE | 확정 날짜 |
| C | confirmed_start_time | TIME | 확정 시작 시간 |
| D | confirmed_end_time | TIME | 확정 종료 시간 |
| E | confirmed_at | DATETIME | 확정 일시 |

---

## 4. 시스템 아키텍처

### 4.1 전체 구성도

```
┌─────────────────────────────────────────────────────┐
│                    사용자 계층                        │
├─────────────────────────────────────────────────────┤
│  인사팀 (Admin)    면접관 (Interviewer)              │
│       ↓                    ↓                         │
└─────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)           │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Admin Portal │  │Interviewer    │                │
│  │              │  │Portal         │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                          │
                          ↓ HTTPS (REST API)
┌─────────────────────────────────────────────────────┐
│           Backend (Node.js + Express)                │
│  ┌─────────────────────────────────────────┐        │
│  │  API Routes                             │        │
│  │  ├─ /api/interviews                     │        │
│  │  ├─ /api/interviewers                   │        │
│  │  ├─ /api/confirm/:token                 │        │
│  │  └─ /api/auth                           │        │
│  └─────────────────────────────────────────┘        │
│                                                      │
│  ┌─────────────────────────────────────────┐        │
│  │  Services                               │        │
│  │  ├─ GoogleSheetsService                 │        │
│  │  ├─ EmailService (Microsoft Graph)      │        │
│  │  ├─ SchedulerService (node-cron)        │        │
│  │  └─ CommonSlotService                   │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
             │                       │
             ↓                       ↓
┌──────────────────────┐  ┌──────────────────────┐
│  Google Sheets API   │  │ Microsoft Graph API  │
│  (Data Storage)      │  │ (Email Sending)      │
└──────────────────────┘  └──────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────┐
│           Google Sheets (Database)               │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐ │
│  │ interviews │ │interviewers│ │time_selections││
│  └────────────┘ └────────────┘ └─────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 5. 페이지별 기능 및 데이터 플로우

### 5.1 인사팀: 대시보드

#### 화면 구성
- 통계 카드 (대기 중 / 진행 중 / 완료)
- 최근 면접 일정 테이블
- 새 면접 등록 버튼

#### 데이터 플로우
```
1. Frontend → GET /api/interviews?summary=true
2. Backend → GoogleSheetsService.getAllInterviews()
3. Google Sheets → interviews 시트 전체 조회
4. Backend → 상태별 통계 계산
5. Backend → 각 면접의 응답률 계산
6. Backend → 최근 10개 + 통계 반환
7. Frontend → 대시보드 렌더링
```

### 5.2 인사팀: 면접 등록

#### 화면 구성
- 공고 정보 입력 (공고명, 팀명)
- 면접관 선택 (복수 선택, 검색)
- 면접자 정보 (이름, 이메일 - 동적 추가)
- 면접 시작 일시 (날짜, 시간 선택)
- 종료 시간 자동 계산

#### 데이터 플로우
```
1. Frontend → 유효성 검사 (Zod)
2. Frontend → POST /api/interviews
3. Backend → 입력 검증
4. Backend → 면접 ID 생성
5. Google Sheets → interviews 시트에 추가
6. Google Sheets → interview_interviewers 매핑 추가
7. Backend → 각 면접관별 JWT 토큰 생성
8. MS Graph API → 면접관에게 메일 발송 (Loop)
9. Backend → 성공 응답
10. Frontend → 대시보드로 이동
```

### 5.3 면접관: 일정 선택

#### 화면 구성
- 면접 정보 표시
- 현재 응답 현황 (누가 응답했는지)
- 달력 (날짜 선택)
- 시간대 체크박스 (복수 선택)
- 제안 시간 하이라이트

#### 데이터 플로우
```
1. 면접관 → 이메일 링크 클릭
2. Frontend → GET /api/confirm/:token
3. Backend → JWT 검증
4. Google Sheets → 면접 정보 조회
5. Google Sheets → 응답 현황 조회
6. Backend → 데이터 통합 반환
7. Frontend → 선택 화면 렌더링

[일정 선택 후]
8. Frontend → POST /api/confirm/:token
9. Google Sheets → time_selections에 저장
10. Google Sheets → responded_at 업데이트
11. Backend → 모든 면접관 응답 확인
12. [모두 응답] → 공통 일정 추출
13. [공통 존재] → confirmed_schedules 저장
14. [공통 존재] → 상태 CONFIRMED 업데이트
15. MS Graph API → 확정 메일 발송
16. Backend → 성공 응답
17. Frontend → 완료 메시지
```

---

## 6. API 설계

### 6.1 기본 정보
```
Base URL: https://[도메인]/api
Content-Type: application/json
Authentication: 
  - 인사팀: JWT Bearer Token
  - 면접관: JWT in URL parameter
```

### 6.2 인증 API

#### POST /api/auth/login
Microsoft OAuth 로그인

**Response**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "user": {
      "email": "hr@ajnetworks.co.kr",
      "name": "인사팀",
      "role": "ADMIN"
    }
  }
}
```

### 6.3 면접 API

#### GET /api/interviews/dashboard
```json
{
  "success": true,
  "data": {
    "stats": {
      "pending": 5,
      "partial": 3,
      "confirmed": 12
    },
    "recentInterviews": [...]
  }
}
```

#### POST /api/interviews
```json
// Request
{
  "mainNotice": "2025년 2월 수시 채용",
  "teamName": "정보전략팀",
  "interviewerIds": ["IV_001", "IV_002"],
  "candidates": [
    { "name": "홍길동", "email": "hong@example.com" }
  ],
  "startDateTime": "2025-01-28T11:00:00Z",
  "endDateTime": "2025-01-28T12:00:00Z"
}

// Response
{
  "success": true,
  "data": {
    "interviewId": "INT_1738051200000",
    "emailsSent": 2
  }
}
```

#### GET /api/interviews/:id
상세 조회

### 6.4 면접관 API

#### GET /api/interviewers
목록 조회

#### POST /api/interviewers/upload
Excel 업로드

### 6.5 일정 확인 API

#### GET /api/confirm/:token
```json
{
  "success": true,
  "data": {
    "interviewId": "INT_1738051200000",
    "mainNotice": "2025년 2월 수시 채용",
    "proposedSlot": {
      "date": "2025-01-28",
      "startTime": "11:00",
      "endTime": "12:00"
    },
    "responseStatus": {
      "total": 3,
      "responded": 1
    }
  }
}
```

#### POST /api/confirm/:token
```json
// Request
{
  "selectedSlots": [
    {
      "date": "2025-01-28",
      "startTime": "11:00",
      "endTime": "12:00"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "status": "CONFIRMED",
    "message": "일정이 확정되었습니다"
  }
}
```

---

## 7. Google Sheets API 연동

### 7.1 Google Cloud Console 설정

#### 1단계: 프로젝트 생성
```
1. https://console.cloud.google.com 접속
2. 프로젝트 생성: "interview-scheduling-system"
3. 프로젝트 ID 복사
```

#### 2단계: Google Sheets API 활성화
```
1. "API 및 서비스" → "라이브러리"
2. "Google Sheets API" 검색
3. "사용 설정" 클릭
```

#### 3단계: 서비스 계정 생성
```
1. "API 및 서비스" → "사용자 인증 정보"
2. "+ 사용자 인증 정보 만들기" → "서비스 계정"
3. 서비스 계정 이름: "interview-system-service"
4. 역할: "편집자"
5. "키" 탭 → "키 추가" → "새 키 만들기" → "JSON"
6. JSON 파일 다운로드
```

### 7.2 Google Sheet 설정

#### 스프레드시트 생성
```
1. Google Drive에서 새 스프레드시트 생성
2. 이름: "AJ Networks 면접 자동화 시스템"
3. URL에서 SPREADSHEET_ID 복사
4. 5개 시트 생성 (interviews, interviewers, 등)
```

#### 서비스 계정에 권한 부여
```
1. 스프레드시트 "공유" 클릭
2. JSON 키의 "client_email" 입력
3. 역할: "편집자"
4. "보내기"
```

### 7.3 환경 변수 설정

```bash
# .env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 8. 인증 및 보안

### 8.1 Microsoft OAuth 2.0 (인사팀)

#### Azure AD 앱 등록
```
1. https://portal.azure.com
2. "Azure Active Directory" → "앱 등록"
3. 앱 이름: "Interview Scheduling System"
4. 리디렉션 URI: https://[도메인]/auth/callback
5. API 권한: User.Read, Mail.Send
```

### 8.2 JWT 토큰 (면접관)

면접관은 JWT 토큰을 URL 파라미터로 받아 인증합니다.

---

## 9. 배포 전략

### 9.1 AWS EC2 배포

#### 인스턴스 생성
```
- AMI: Ubuntu 22.04 LTS
- 타입: t3.small (2vCPU, 2GB RAM)
- 보안 그룹: SSH(22), HTTP(80), HTTPS(443)
- 스토리지: 20GB gp3
```

#### 서버 설정
```bash
# SSH 접속
ssh -i "key.pem" ubuntu@ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install -y nginx
```

---

## 10. 개발 일정

### 10.1 Phase 1: 환경 설정 (1주)
- [x] 프로젝트 초기화
- [ ] Google Sheets API 연동
- [ ] Microsoft Graph API 연동
- [ ] 개발 환경 구축

### 10.2 Phase 2: 핵심 기능 (2주)
- [ ] 인사팀 포털 개발
- [ ] 면접관 포털 개발
- [ ] 자동화 로직 구현
- [ ] API 개발

### 10.3 Phase 3: 테스트 및 개선 (1주)
- [ ] 통합 테스트
- [ ] UI/UX 개선
- [ ] 성능 최적화
- [ ] 문서화

### 10.4 Phase 4: 배포 (1주)
- [ ] AWS 인프라 구축
- [ ] CI/CD 파이프라인
- [ ] 프로덕션 배포
- [ ] 사용자 교육

**총 소요 기간: 5주 (약 1.25개월)**

---

## 11. 부록

### 11.1 환경 변수

```bash
# .env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

JWT_SECRET=your-secret-key

MICROSOFT_CLIENT_ID=xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx
MICROSOFT_TENANT_ID=xxxxx
MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/callback
HR_EMAIL=hr@ajnetworks.co.kr

GOOGLE_SPREADSHEET_ID=xxxxx
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 11.2 트러블슈팅

#### Google Sheets API 403 Forbidden
**해결**: 스프레드시트에 서비스 계정 이메일 공유 (편집자 권한)

#### Microsoft Graph API 메일 발송 실패
**해결**: Azure Portal에서 API 권한 확인 및 관리자 동의

#### PM2 프로세스 재시작 반복
**확인**: `pm2 logs interview-api --err`
**해결**: 에러 로그 확인 후 코드 수정 또는 메모리 증설

#### Nginx 502 Bad Gateway
**확인**: `pm2 status` (Backend 실행 확인)
**해결**: Backend 재시작 또는 포트 확인

---

**문서 종료**
