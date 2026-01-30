# 현재 구현 상태 및 데이터 저장소 정보

## 📊 현재 구현 상태

### 데이터 저장소: **Google Sheets** ✅

**구현 완료:**
- ✅ Google Sheets를 데이터베이스로 사용
- ✅ Google Apps Script를 API 레이어로 사용
- ✅ 9개 시트 구조 (interviews, candidates, interview_candidates, candidate_interviewers, interviewers, interview_interviewers, time_selections, confirmed_schedules, config)
- ✅ N:N 매핑 구조 지원
- ✅ 30분 단위 타임 슬롯
- ✅ 메일 템플릿 서비스
- ✅ 자동 스케줄러

**사용 기술:**
- Google Sheets API (Apps Script 방식)
- Google Apps Script 웹 앱 배포
- API Key 기반 인증

---

## 📄 명세서 정보

### 원본 명세서 (docs/SPECIFICATION.md)
- **데이터 저장소**: Google Sheets ✅
- **버전**: 2.0
- **작성일**: 2025-01-29

### 사용자 제공 명세서 (v3.0)
- **데이터 저장소**: SharePoint Excel
- **버전**: 3.0 (Complete Edition)
- **작성일**: 2025-01-29

**차이점:**
- 명세서 v3.0은 SharePoint Excel을 요구하지만
- 실제 구현은 Google Sheets로 완료됨

---

## 🔄 SharePoint Excel로 전환 가능 여부

### 가능합니다! 하지만 다음 작업이 필요합니다:

1. **Azure AD 앱 등록** (약 1시간)
2. **SharePoint 사이트 생성** (약 30분)
3. **Excel 파일 템플릿 생성** (약 1시간)
4. **Microsoft Graph API 연동** (약 3-5일)
5. **기존 코드 교체** (약 2-3일)
6. **테스트 및 배포** (약 2-3일)

**총 예상 시간**: 1-2주

---

## 💡 추천 사항

### 현재 상황:
- ✅ Google Sheets로 완전히 구현 완료
- ✅ Google Cloud Console 불필요
- ✅ 즉시 사용 가능

### SharePoint Excel 전환 시:
- ⏳ 추가 개발 시간 필요 (1-2주)
- ⏳ Azure AD 설정 필요
- ⏳ Microsoft Graph API 학습 필요

### 권장 사항:
**Google Sheets를 유지하는 것을 추천합니다.**

**이유:**
1. 이미 완전히 구현되어 있음
2. Google Cloud Console 설정 불필요
3. 무료 사용 가능
4. 실시간 협업 기능
5. 빠른 배포 가능

**단, 다음 경우에는 SharePoint Excel로 전환을 고려하세요:**
- 회사 정책상 Microsoft 365만 사용 가능
- SharePoint와의 통합이 필수
- 기존 SharePoint 데이터와 연동 필요

---

## 📝 다음 단계

### Google Sheets 유지 시:
- ✅ 현재 구현 그대로 사용
- ✅ 추가 작업 불필요
- ✅ 즉시 배포 가능

### SharePoint Excel로 전환 시:
1. Azure AD 앱 등록
2. SharePoint 사이트 및 Excel 파일 생성
3. Microsoft Graph API 연동 코드 작성
4. 기존 Google Sheets 서비스 교체
5. 테스트 및 배포

**어떤 방식을 선호하시는지 알려주세요!**
