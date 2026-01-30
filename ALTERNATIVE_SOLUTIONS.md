# SharePoint 토큰 문제 대안 솔루션

## 🔴 현재 문제

- Conditional Access 정책으로 Device Code Flow 차단
- Graph Explorer는 Refresh Token 제공 안 함
- 1시간마다 수동 토큰 갱신 필요

---

## ✅ 대안 1: Google Sheets로 전환 (⭐ 가장 추천)

### 장점
- ✅ **이미 완전히 구현되어 있음**
- ✅ **토큰 만료 걱정 없음** (Google Apps Script API Key 사용)
- ✅ **추가 설정 불필요**
- ✅ **무료 사용 가능**
- ✅ **실시간 협업 가능**

### 전환 방법

1. **환경 변수 설정** (`backend/.env`):
   ```bash
   # SharePoint 비활성화
   SHAREPOINT_ENABLED=false
   
   # Google Sheets 활성화
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/...
   GOOGLE_APPS_SCRIPT_API_KEY=your-api-key
   ```

2. **Google Sheets 스프레드시트 준비**:
   - 9개 시트 생성 (interviews, candidates, ...)
   - Google Apps Script 배포 (이미 있으면 재사용)

3. **서버 재시작**:
   ```bash
   cd backend
   npm run dev
   ```

**완료!** 추가 작업 없이 바로 사용 가능합니다.

---

## ✅ 대안 2: 로컬 파일 시스템 (SQLite)

### 장점
- ✅ **토큰 문제 완전 해결**
- ✅ **설정 매우 간단**
- ✅ **추가 비용 없음**
- ✅ **빠른 성능**

### 단점
- ⚠️ 서버 재시작 시 데이터 유지 (파일 시스템)
- ⚠️ 동시 접근 시 파일 잠금 필요

### 구현 방법

1. **SQLite 설치**:
   ```bash
   npm install better-sqlite3
   ```

2. **데이터베이스 서비스 구현** (약 1-2일 작업)

3. **환경 변수 설정**:
   ```bash
   DATA_STORAGE=sqlite
   SQLITE_DB_PATH=./data/interviews.db
   ```

---

## ✅ 대안 3: OneDrive 동기화 + 로컬 파일

### 원리
- SharePoint 파일을 OneDrive로 동기화
- 로컬 파일을 읽기/쓰기
- OneDrive가 자동으로 SharePoint에 동기화

### 장점
- ✅ **SharePoint 데이터 유지**
- ✅ **토큰 문제 해결** (로컬 파일 접근)
- ✅ **자동 동기화**

### 단점
- ⚠️ 동기화 지연 가능 (몇 초~몇 분)
- ⚠️ OneDrive 클라이언트 설치 필요
- ⚠️ 동시 편집 시 충돌 가능

### 구현 방법

1. **OneDrive 클라이언트 설치** (Windows에 기본 포함)
2. **SharePoint 파일을 OneDrive로 동기화**
3. **로컬 파일 경로로 Excel 읽기/쓰기** (`xlsx` 라이브러리 사용)

---

## ✅ 대안 4: 백엔드 토큰 자동 갱신 엔드포인트

### 원리
- Graph Explorer 토큰을 주기적으로 갱신하는 엔드포인트
- Puppeteer/Playwright로 Graph Explorer 자동화
- 또는 사용자가 주기적으로 새 토큰 입력

### 장점
- ✅ **SharePoint 데이터 유지**
- ✅ **자동화 가능**

### 단점
- ⚠️ 구현 복잡 (Puppeteer 사용)
- ⚠️ 브라우저 자동화는 불안정할 수 있음
- ⚠️ MFA/보안 정책에 따라 실패 가능

---

## ✅ 대안 5: PostgreSQL/MySQL 데이터베이스

### 장점
- ✅ **토큰 문제 완전 해결**
- ✅ **안정적이고 확장 가능**
- ✅ **동시 접근 처리 우수**

### 단점
- ⚠️ 데이터베이스 서버 필요
- ⚠️ 추가 설정 필요
- ⚠️ SharePoint 데이터와 분리

### 구현 방법

1. **PostgreSQL/MySQL 설치**
2. **데이터베이스 스키마 생성**
3. **데이터베이스 서비스 구현** (약 2-3일 작업)

---

## 📊 비교표

| 방법 | 복잡도 | 구현 시간 | 토큰 문제 | 추천도 |
|------|--------|----------|----------|--------|
| **Google Sheets** | ⭐ 매우 간단 | 즉시 | ✅ 해결 | ⭐⭐⭐⭐⭐ |
| SQLite | ⭐⭐ 간단 | 1-2일 | ✅ 해결 | ⭐⭐⭐⭐ |
| OneDrive 동기화 | ⭐⭐⭐ 보통 | 2-3일 | ✅ 해결 | ⭐⭐⭐ |
| 토큰 자동 갱신 | ⭐⭐⭐⭐ 복잡 | 3-5일 | ⚠️ 부분 해결 | ⭐⭐ |
| PostgreSQL | ⭐⭐⭐ 보통 | 2-3일 | ✅ 해결 | ⭐⭐⭐ |

---

## 🎯 추천 순서

### 1순위: Google Sheets로 전환 ⭐⭐⭐⭐⭐
- **이유**: 이미 구현되어 있고, 즉시 사용 가능
- **작업 시간**: 5분 (환경 변수만 변경)

### 2순위: SQLite 사용 ⭐⭐⭐⭐
- **이유**: 간단하고 안정적
- **작업 시간**: 1-2일

### 3순위: OneDrive 동기화 ⭐⭐⭐
- **이유**: SharePoint 데이터 유지하면서 토큰 문제 해결
- **작업 시간**: 2-3일

---

## 💡 질문

어떤 방법을 선호하시나요?

1. **Google Sheets로 전환** (즉시 사용 가능, 가장 추천)
2. **SQLite 사용** (로컬 데이터베이스)
3. **OneDrive 동기화** (SharePoint 데이터 유지)
4. **다른 방법** (요구사항 알려주세요)

선택해주시면 그에 맞게 구현하겠습니다!
