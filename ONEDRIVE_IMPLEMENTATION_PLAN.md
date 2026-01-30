# OneDrive 동기화 구현 계획

## 🎯 목표

- ✅ M365 엑셀 파일을 DB처럼 사용
- ✅ 공유 가능 (SharePoint에서 공유)
- ✅ 기준정보 및 데이터 CRUD
- ✅ 토큰 문제 해결

## 📋 구현 단계

### 1단계: OneDrive 동기화 설정 (5분)

1. SharePoint 사이트 접속
2. "동기화" 버튼 클릭
3. OneDrive 클라이언트에서 동기화 확인
4. 로컬 파일 경로 확인

### 2단계: 코드 수정 (2-3시간)

#### 변경 사항:
- `SharePointRestService` → `OneDriveLocalService`로 변경
- REST API 호출 제거 → 로컬 파일 읽기/쓰기
- `xlsx` 라이브러리 사용 (이미 설치됨)
- 파일 잠금 메커니즘 추가

#### 파일 구조:
```
backend/src/services/
  ├── oneDriveLocal.service.ts (신규)
  ├── sharePointRest.service.ts (기존, 유지)
  └── dataService.ts (수정: OneDrive 서비스 추가)
```

### 3단계: 환경 변수 설정

`backend/.env`:
```bash
# SharePoint 비활성화
SHAREPOINT_ENABLED=false

# OneDrive 로컬 파일 경로
ONEDRIVE_EXCEL_PATH=C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx
```

### 4단계: 테스트 (1시간)

- CRUD 동작 확인
- 동기화 확인
- 파일 잠금 테스트

**총 예상 시간**: 반나절 (4-5시간)

---

## 💡 장점

1. **SharePoint Excel 유지** - 공유 기능 완벽
2. **토큰 문제 해결** - 로컬 파일 접근
3. **기존 코드 재사용** - `xlsx` 라이브러리
4. **안정적** - 파일 시스템 직접 접근

---

## ⚠️ 주의사항

1. **동기화 지연**: 몇 초~몇 분 지연 가능
2. **파일 잠금**: 동시 접근 시 파일 잠금 필요
3. **OneDrive 클라이언트**: Windows에 기본 포함

---

## 🚀 시작하시겠어요?

준비되면 바로 구현하겠습니다!
