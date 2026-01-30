# M365 Excel 공유 DB 솔루션

## 🎯 요구사항

- ✅ M365 엑셀 파일을 DB처럼 사용
- ✅ 공유 가능 (여러 사용자가 동시 접근)
- ✅ 기준정보 및 데이터 CRUD
- ✅ SharePoint Excel 사용 필수

## 🔴 현재 문제

- Conditional Access 정책으로 Device Code Flow 차단
- Graph Explorer는 Refresh Token 제공 안 함
- 1시간마다 수동 토큰 갱신 필요

---

## ✅ 해결 방안

### 방안 1: OneDrive 동기화 + 로컬 파일 접근 (⭐ 가장 추천)

#### 원리
1. SharePoint Excel 파일을 OneDrive로 동기화
2. 로컬 파일 경로로 Excel 읽기/쓰기 (`xlsx` 라이브러리)
3. OneDrive가 자동으로 SharePoint에 동기화
4. 여러 사용자가 SharePoint에서 실시간으로 확인 가능

#### 장점
- ✅ **SharePoint Excel 유지** (공유 가능)
- ✅ **토큰 문제 완전 해결** (로컬 파일 접근)
- ✅ **실시간 동기화** (OneDrive 자동 동기화)
- ✅ **기존 코드 재사용** (`xlsx` 라이브러리)
- ✅ **공유 기능 유지** (SharePoint에서 공유)

#### 단점
- ⚠️ 동기화 지연 가능 (몇 초~몇 분)
- ⚠️ OneDrive 클라이언트 설치 필요 (Windows 기본 포함)
- ⚠️ 동시 편집 시 충돌 가능 (파일 잠금 필요)

#### 구현 방법

1. **OneDrive 클라이언트 확인**:
   - Windows에 기본 포함되어 있음
   - SharePoint 사이트를 OneDrive로 동기화

2. **SharePoint 파일 동기화**:
   - SharePoint 사이트에서 "동기화" 클릭
   - 로컬 경로: `C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx`

3. **코드 수정**:
   - SharePoint REST API 대신 로컬 파일 경로 사용
   - `xlsx` 라이브러리로 직접 읽기/쓰기

4. **파일 잠금 처리**:
   - 동시 접근 시 파일 잠금 메커니즘 추가

---

### 방안 2: SharePoint REST API + 자동 토큰 갱신 스케줄러

#### 원리
1. Graph Explorer에서 토큰 발급 (수동 1회)
2. 백엔드에 토큰 갱신 엔드포인트 추가
3. 주기적으로 새 토큰 발급 요청 (1시간마다)
4. 사용자가 주기적으로 Graph Explorer에서 새 토큰 입력

#### 장점
- ✅ **SharePoint Excel 직접 접근**
- ✅ **공유 기능 완벽 유지**
- ✅ **실시간 동기화**

#### 단점
- ⚠️ 주기적 수동 개입 필요 (1시간마다)
- ⚠️ 자동화 어려움 (Conditional Access 정책)

---

### 방안 3: SharePoint REST API + Puppeteer 자동화

#### 원리
1. Puppeteer로 Graph Explorer 자동 로그인
2. 토큰 자동 추출
3. 주기적으로 토큰 갱신 (1시간마다)

#### 장점
- ✅ **완전 자동화 가능**

#### 단점
- ⚠️ 구현 복잡 (Puppeteer 사용)
- ⚠️ MFA/보안 정책에 따라 실패 가능
- ⚠️ 불안정할 수 있음

---

## 🏆 추천: OneDrive 동기화 방식

### 이유
1. **SharePoint Excel 유지** - 공유 기능 완벽
2. **토큰 문제 해결** - 로컬 파일 접근
3. **구현 간단** - 기존 `xlsx` 라이브러리 재사용
4. **안정적** - 파일 시스템 직접 접근

### 구현 계획

1. **OneDrive 동기화 설정** (5분)
   - SharePoint 사이트에서 "동기화" 클릭
   - 로컬 경로 확인

2. **코드 수정** (2-3시간)
   - SharePoint REST API → 로컬 파일 경로
   - `xlsx` 라이브러리로 읽기/쓰기
   - 파일 잠금 메커니즘 추가

3. **테스트** (1시간)
   - CRUD 동작 확인
   - 동기화 확인

**총 예상 시간**: 반나절 (4-5시간)

---

## 📋 구현 단계

### 1단계: OneDrive 동기화 설정

1. SharePoint 사이트 접속
2. "동기화" 버튼 클릭
3. OneDrive 클라이언트에서 동기화 확인
4. 로컬 파일 경로 확인:
   ```
   C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx
   ```

### 2단계: 환경 변수 설정

`backend/.env`:
```bash
# SharePoint 비활성화
SHAREPOINT_ENABLED=false

# OneDrive 로컬 파일 경로
ONEDRIVE_EXCEL_PATH=C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx
```

### 3단계: 코드 수정

- `SharePointRestService` → `OneDriveLocalService`로 변경
- REST API 호출 → 로컬 파일 읽기/쓰기
- `xlsx` 라이브러리 사용 (이미 설치됨)

### 4단계: 파일 잠금 처리

- 동시 접근 시 파일 잠금 메커니즘 추가
- `fs-extra` 라이브러리 사용

---

## 💡 질문

이 방법으로 진행하시겠어요?

1. **OneDrive 동기화 방식** (추천, 반나절 작업)
2. **SharePoint REST API + 수동 토큰 갱신** (현재 방식 유지)
3. **다른 방법** (요구사항 알려주세요)

선택해주시면 바로 구현하겠습니다!
