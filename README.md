# 면접 일정 자동화 시스템 v2.0

Google Sheets 기반 면접 일정 자동화 시스템입니다.

**✅ Google Cloud Console 불필요!** Google Apps Script만으로 동작합니다.

## 프로젝트 구조

```
interview-scheduling-system/
├── backend/          # Node.js + Express + TypeScript
├── frontend/         # React + TypeScript + Vite
├── google-apps-script/  # Google Apps Script 코드
├── package.json      # 루트 패키지 설정
└── README.md         # 프로젝트 문서
```

## 기술 스택

### Backend
- Node.js 20.x LTS
- Express.js 4.x
- TypeScript 5.x
- Google Apps Script (Google Sheets 접근)
- Microsoft Graph API
- JWT 인증
- node-cron (스케줄러)

### Frontend
- React 18.3
- TypeScript 5.3
- Ant Design 5.x
- React Query 5.x
- Zustand 4.x
- Vite 5.x

## 빠른 시작

### 1. Google Apps Script 설정 (5분)

1. Google Sheets 스프레드시트 열기
2. "확장 프로그램" → "Apps Script"
3. `google-apps-script/Code.gs` 내용 붙여넣기
4. API_KEY 변경
5. "배포" → "웹 앱으로 배포" → URL 복사

**자세한 가이드**: [NO_GOOGLE_CLOUD_SETUP.md](./NO_GOOGLE_CLOUD_SETUP.md)

### 2. 환경 변수 설정

`backend/.env`:
```bash
GOOGLE_SPREADSHEET_ID=1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs
GOOGLE_APPS_SCRIPT_URL=여기에-웹앱-URL
GOOGLE_APPS_SCRIPT_API_KEY=여기에-API-KEY
```

### 3. 실행

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
npm run dev
```

## 주요 기능

### 인사팀 포털
- 면접 정보 등록 및 관리
- 면접관 DB 관리 (Excel 업로드)
- 면접 진행 현황 대시보드
- 면접 상세 조회 및 수정

### 면접관 포털
- 이메일 링크를 통한 간편 접속
- 가능 일정 선택 (복수 선택)
- 실시간 응답 현황 확인

### 자동화 기능
- 면접관에게 자동 이메일 발송 (Microsoft Teams)
- 공통 일정 자동 추출 및 확정
- 미응답자 자동 리마인더 (48시간)
- 확정 알림 자동 발송

## 문서

- [NO_GOOGLE_CLOUD_SETUP.md](./NO_GOOGLE_CLOUD_SETUP.md) - Google Cloud Console 없이 설정하기
- [REQUIRED_INFO.md](./REQUIRED_INFO.md) - 필요한 정보 정리
- [SETUP.md](./SETUP.md) - 상세 설치 가이드
- [DEPLOY.md](./DEPLOY.md) - 배포 가이드
- [기술 명세서](./docs/SPECIFICATION.md) - 전체 시스템 설계 문서

## 장점

- ✅ Google Cloud Console 불필요
- ✅ 무료 (Google 계정만 있으면 사용 가능)
- ✅ 설정 간단 (5분)
- ✅ Google Sheets를 직접 확인 가능

## 라이선스

프로젝트 내부 사용 전용
