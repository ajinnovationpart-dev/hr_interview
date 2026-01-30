# SharePoint Excel 접근 방법 (앱 등록 없이)

## 🎯 목표
Azure AD 앱 등록 없이 SharePoint Excel 파일에 접근하는 방법

## 📋 가능한 방법들

### 방법 1: SharePoint REST API + 사용자 토큰 (권장) ⭐

**원리:**
- 사용자가 직접 Microsoft Graph API에서 토큰을 발급받아 제공
- 앱 등록 없이 사용자 권한으로 접근

**장점:**
- ✅ 앱 등록 불필요
- ✅ 사용자 권한으로 안전하게 접근
- ✅ 구현이 상대적으로 간단

**단점:**
- ⚠️ 사용자가 토큰을 직접 발급받아야 함
- ⚠️ 토큰 만료 시 재발급 필요 (보통 1시간)
- ⚠️ Refresh Token 관리 필요

**구현 방법:**
1. 사용자가 Microsoft Graph Explorer에서 토큰 발급
2. 또는 간단한 OAuth 2.0 플로우로 토큰 발급
3. 토큰을 환경 변수에 저장
4. Microsoft Graph API로 SharePoint 접근

---

### 방법 2: SharePoint Power Automate (Flow) 사용

**원리:**
- Power Automate에서 HTTP 트리거 생성
- SharePoint 작업을 Power Automate에서 처리
- 외부에서 Power Automate API 호출

**장점:**
- ✅ 앱 등록 불필요
- ✅ Power Automate가 인증 처리
- ✅ 비즈니스 로직을 Power Automate에서 관리 가능

**단점:**
- ⚠️ Power Automate 라이선스 필요
- ⚠️ Power Automate API 호출 제한
- ⚠️ 추가 비용 가능성

---

### 방법 3: SharePoint 웹훅 + Azure Function

**원리:**
- SharePoint에서 변경 시 웹훅 호출
- Azure Function에서 처리
- 하지만 이것도 인증 필요...

**단점:**
- ❌ 결국 인증 필요
- ❌ Azure Function 비용

---

### 방법 4: 사용자 자격 증명 직접 사용 (비권장)

**원리:**
- 사용자 ID/PW를 코드에 저장
- SharePoint REST API 직접 호출

**단점:**
- ❌ 보안상 매우 위험
- ❌ MFA 지원 어려움
- ❌ 권장하지 않음

---

## 🏆 추천 방법: 방법 1 (사용자 토큰)

### 구현 계획

#### 1단계: 토큰 발급 방법 제공

**옵션 A: Microsoft Graph Explorer 사용**
```
1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. "Access Token" 복사
4. 환경 변수에 저장
```

**옵션 B: 간단한 OAuth 2.0 플로우**
```
1. 사용자가 브라우저에서 인증
2. 토큰을 받아서 환경 변수에 저장
3. Refresh Token으로 자동 갱신
```

#### 2단계: Microsoft Graph API 클라이언트 구현

```typescript
// backend/src/services/sharePointExcel.service.ts
import { Client } from '@microsoft/microsoft-graph-client';

export class SharePointExcelService {
  private graphClient: Client;
  
  constructor() {
    const accessToken = process.env.SHAREPOINT_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('SHAREPOINT_ACCESS_TOKEN is required');
    }
    
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }
  
  // Excel 파일 읽기
  async readExcelFile(siteId: string, driveId: string, fileId: string) {
    // Microsoft Graph API로 Excel 파일 읽기
  }
  
  // Excel 파일 쓰기
  async writeExcelFile(...) {
    // Microsoft Graph API로 Excel 파일 쓰기
  }
}
```

#### 3단계: 토큰 갱신 메커니즘

```typescript
// Refresh Token으로 자동 갱신
async refreshToken() {
  const refreshToken = process.env.SHAREPOINT_REFRESH_TOKEN;
  // OAuth 2.0 토큰 갱신
}
```

---

## 📝 구현 단계

### Phase 1: 토큰 발급 도구 생성 (1일)
- 간단한 웹 페이지로 OAuth 2.0 플로우
- 토큰 발급 및 저장

### Phase 2: SharePoint Excel 서비스 구현 (3-4일)
- Microsoft Graph API 클라이언트
- Excel 파일 읽기/쓰기
- 9개 시트 구조 지원

### Phase 3: 기존 서비스 교체 (2-3일)
- Google Sheets 서비스 → SharePoint Excel 서비스
- API 인터페이스 유지

### Phase 4: 테스트 및 배포 (2-3일)

**총 예상 시간**: 1-2주

---

## 🔐 보안 고려사항

### 토큰 관리
- ✅ 환경 변수에 저장 (절대 코드에 하드코딩 금지)
- ✅ Refresh Token으로 자동 갱신
- ✅ 토큰 만료 시 알림

### 권한 관리
- ✅ 최소 권한 원칙
- ✅ 읽기/쓰기 권한만 부여
- ✅ SharePoint 사이트별 권한 관리

---

## 💡 대안: 하이브리드 접근

### Google Sheets 유지 + SharePoint 동기화

**원리:**
- Google Sheets를 주 데이터 저장소로 사용
- 주기적으로 SharePoint Excel로 동기화
- Power Automate 또는 스크립트로 자동화

**장점:**
- ✅ 현재 구현 유지
- ✅ SharePoint와의 통합
- ✅ 추가 개발 최소화

---

## ❓ 질문

어떤 방법을 선호하시나요?

1. **방법 1: 사용자 토큰 방식** (추천)
   - 앱 등록 불필요
   - 사용자가 토큰 발급
   - 구현 시간: 1-2주

2. **방법 2: Power Automate 사용**
   - Power Automate 라이선스 필요
   - 구현 시간: 1주

3. **하이브리드: Google Sheets + SharePoint 동기화**
   - 현재 구현 유지
   - 주기적 동기화
   - 구현 시간: 3-5일

선택해주시면 그에 맞게 구현하겠습니다!
