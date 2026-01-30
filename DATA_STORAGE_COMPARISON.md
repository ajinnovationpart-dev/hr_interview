# 데이터 저장소 비교: Google Sheets vs SharePoint Excel

## 현재 구현 상태

### ✅ 현재 구현: Google Sheets + Google Apps Script

**구현된 내용:**
- Google Sheets를 데이터베이스로 사용
- Google Apps Script를 API 레이어로 사용
- Google Cloud Console 불필요 (Apps Script만으로 동작)

**장점:**
- ✅ Google Cloud Console 설정 불필요
- ✅ 무료 사용 가능
- ✅ 실시간 협업 기능
- ✅ 자동 백업 및 버전 관리
- ✅ 이미 구현 완료

**단점:**
- ❌ SharePoint와의 통합 필요 시 추가 작업
- ❌ Microsoft 365 생태계와의 연동 제한

---

## 명세서 요구사항

### 📄 사용자 제공 명세서 (v3.0)
- **요구사항**: SharePoint Excel 사용
- **이유**: Microsoft 365 생태계 통합
- **데이터 위치**: SharePoint > Documents

### 📄 기존 명세서 (docs/SPECIFICATION.md)
- **요구사항**: Google Sheets 사용
- **이유**: DB 인프라 불필요, 비용 절감

---

## SharePoint Excel로 전환 시 필요한 작업

### 1. SharePoint REST API 연동
```typescript
// Microsoft Graph API 사용
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

// SharePoint 사이트 접근
// Excel 파일 읽기/쓰기
```

### 2. 인증 방식 변경
- **현재**: Google Apps Script API Key
- **변경**: Microsoft Azure AD 인증
  - Client ID
  - Client Secret
  - Tenant ID
  - SharePoint 사이트 URL

### 3. 데이터 구조 변경
- Google Sheets → SharePoint Excel 파일
- Apps Script → Microsoft Graph API
- 시트 구조는 동일 (9개 시트)

### 4. 코드 변경 범위
- `backend/src/services/googleSheets.service.ts` → `sharePointExcel.service.ts`
- Google Apps Script 코드 제거
- Microsoft Graph API 클라이언트 추가

---

## 추천 방안

### 옵션 1: Google Sheets 유지 (현재 구현) ⭐ 추천
**이유:**
- ✅ 이미 완전히 구현되어 있음
- ✅ Google Cloud Console 불필요
- ✅ 빠른 배포 가능
- ✅ 무료 사용 가능
- ✅ 실시간 협업 기능

**단점:**
- SharePoint와의 통합 필요 시 추가 작업

### 옵션 2: SharePoint Excel로 전환
**이유:**
- ✅ Microsoft 365 생태계 통합
- ✅ 회사 표준 도구 사용
- ✅ 권한 관리 용이

**단점:**
- ❌ Azure AD 설정 필요
- ❌ Microsoft Graph API 학습 필요
- ❌ 코드 대폭 수정 필요 (약 1-2주)
- ❌ 추가 비용 가능성

---

## 결정 가이드

### SharePoint Excel로 전환해야 하는 경우:
1. ✅ 회사 정책상 Microsoft 365만 사용 가능
2. ✅ SharePoint와의 통합이 필수
3. ✅ 기존 SharePoint 데이터와 연동 필요
4. ✅ Microsoft Teams와의 통합 필요

### Google Sheets를 유지해도 되는 경우:
1. ✅ 빠른 배포가 우선
2. ✅ 추가 비용 부담 없음
3. ✅ Google Workspace 사용 중
4. ✅ SharePoint 통합 불필요

---

## 다음 단계

### Google Sheets 유지 시:
- ✅ 현재 구현 그대로 사용
- ✅ 추가 작업 불필요

### SharePoint Excel로 전환 시:
1. Azure AD 앱 등록
2. SharePoint 사이트 생성 및 권한 설정
3. Excel 파일 템플릿 생성 (9개 시트)
4. Microsoft Graph API 연동 코드 작성
5. 기존 Google Sheets 서비스 교체
6. 테스트 및 배포

**예상 작업 시간**: 1-2주

---

## 질문

어떤 방식을 선호하시나요?

1. **Google Sheets 유지** (현재 구현, 즉시 사용 가능)
2. **SharePoint Excel로 전환** (추가 개발 필요)

선택해주시면 그에 맞게 진행하겠습니다!
