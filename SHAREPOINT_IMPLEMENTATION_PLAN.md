# SharePoint Excel 전환 구현 계획 (앱 등록 없이)

## 🎯 목표
Azure AD 앱 등록 없이 SharePoint Excel 파일에 접근

## 📋 선택한 방법: 사용자 토큰 방식

### 원리
- 사용자가 직접 Microsoft Graph API 토큰 발급
- 토큰을 환경 변수에 저장
- Microsoft Graph API로 SharePoint Excel 접근

---

## 🔧 구현 단계

### Phase 1: 토큰 발급 도구 (1일)

#### 1.1 간단한 토큰 발급 웹 페이지 생성
```typescript
// frontend/src/pages/admin/SharePointTokenPage.tsx
// 사용자가 브라우저에서 Microsoft 로그인
// 토큰 발급 및 표시
```

#### 1.2 토큰 저장 API
```typescript
// backend/src/routes/sharepoint.routes.ts
// POST /api/sharepoint/token
// 토큰을 환경 변수에 저장 (또는 DB)
```

### Phase 2: Microsoft Graph API 클라이언트 (3-4일)

#### 2.1 패키지 설치
```bash
npm install @microsoft/microsoft-graph-client
npm install @azure/msal-node  # 토큰 갱신용
```

#### 2.2 SharePoint Excel 서비스 구현
```typescript
// backend/src/services/sharePointExcel.service.ts
// - Excel 파일 읽기
// - Excel 파일 쓰기
// - 9개 시트 구조 지원
// - N:N 매핑 지원
```

### Phase 3: 기존 서비스 교체 (2-3일)

#### 3.1 인터페이스 통일
```typescript
// 동일한 인터페이스 유지
// Google Sheets Service → SharePoint Excel Service
```

#### 3.2 라우트 업데이트
```typescript
// 환경 변수로 서비스 선택
// SHAREPOINT_ENABLED=true/false
```

### Phase 4: 테스트 및 배포 (2-3일)

---

## 📦 필요한 패키지

```json
{
  "@microsoft/microsoft-graph-client": "^3.0.0",
  "@azure/msal-node": "^2.0.0"
}
```

---

## 🔐 환경 변수

```bash
# SharePoint 설정
SHAREPOINT_ENABLED=true
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
SHAREPOINT_FILE_ID=your-file-id
SHAREPOINT_ACCESS_TOKEN=user-access-token
SHAREPOINT_REFRESH_TOKEN=user-refresh-token
SHAREPOINT_CLIENT_ID=public-client-id  # 앱 등록 없이도 가능
SHAREPOINT_TENANT_ID=your-tenant-id
```

---

## 🚀 시작하시겠습니까?

다음 명령으로 시작할 수 있습니다:

1. **토큰 발급 도구부터 구현**
2. **Microsoft Graph API 클라이언트 구현**
3. **기존 서비스 교체**

어떤 순서로 진행할까요?
