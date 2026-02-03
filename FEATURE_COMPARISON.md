# 기능 비교 분석: aj-networks-interview-automation vs hr-sample

## 📋 개요

`aj-networks-interview-automation` 프로젝트와 현재 `hr-sample` 프로젝트를 비교하여 누락된 기능을 점검합니다.

---

## ✅ 현재 hr-sample에 구현된 기능

### 1. 기본 기능
- ✅ 면접 생성 및 관리
- ✅ 면접관 DB 관리 (Excel 업로드)
- ✅ 면접 상세 조회
- ✅ 면접관 포털 (일정 선택)
- ✅ 자동 이메일 발송
- ✅ 스케줄러 (리마인더, D-1 알림)
- ✅ Config API (백엔드)

### 2. 데이터 구조
- ✅ N:N 매핑 구조 (면접자-면접관)
- ✅ 30분 단위 타임 슬롯
- ✅ OneDrive/Excel 기반 데이터 저장

---

## ❌ 누락된 기능 (aj-networks-interview-automation 기준)

### 1. **AI 분석 기능 (Gemini) - 중요도: 높음**

**aj-networks-interview-automation 기능:**
- Google Gemini API를 사용한 공통 시간대 자동 분석
- 면접관들의 응답을 AI가 분석하여 최적의 슬롯 추천
- `findCommonSlots()` 함수로 복잡한 시간대 교집합 계산

**현재 hr-sample 상태:**
- ❌ AI 분석 기능 없음
- ❌ 공통 시간대 자동 추천 없음
- 수동으로 공통 시간대를 찾아야 함

**구현 필요:**
```typescript
// services/gemini.ts (참고)
- Google Gemini API 통합
- 공통 시간대 분석 로직
- InterviewDetailPage에 AI 분석 버튼 추가
```

---

### 2. **Settings 페이지 (프론트엔드) - 중요도: 중간**

**aj-networks-interview-automation 기능:**
- `/settings` 경로의 Settings 페이지
- 면접 운영 설정 (기본 소요 시간, 운영 시간, 주말 허용)
- AI 모델 선택 (Gemini Flash vs Pro)
- 이메일 리마인더 자동 발송 설정
- API 상태 확인

**현재 hr-sample 상태:**
- ✅ Config API는 있음 (백엔드)
- ❌ Settings 페이지 없음 (프론트엔드)
- 설정 변경이 어려움

**구현 필요:**
```typescript
// pages/admin/SettingsPage.tsx (신규)
- Config API 연동
- 설정 UI 구성
- App.tsx에 라우트 추가
```

---

### 3. **Dashboard 개선 - 중요도: 중간**

**aj-networks-interview-automation 기능:**
- 상세한 통계 카드 (전체, 진행 중, 확정 완료)
- 상태별 필터링 (ALL, PENDING, PARTIAL, ANALYZED, CONFIRMED)
- 검색 기능 (공고명/팀명 검색)
- 응답률 프로그레스 바
- 보고서 다운로드 버튼

**현재 hr-sample 상태:**
- ✅ 기본 통계는 있음
- ❌ 필터링 기능 없음
- ❌ 검색 기능 없음
- ❌ 보고서 다운로드 없음

**구현 필요:**
```typescript
// pages/admin/DashboardPage.tsx (개선)
- 상태별 필터 추가
- 검색 기능 추가
- 보고서 다운로드 기능
```

---

### 4. **InterviewDetail 개선 - 중요도: 중간**

**aj-networks-interview-automation 기능:**
- AI 분석 섹션 (공통 시간대 추천)
- 면접관별 포털 링크 복사 기능
- 면접 삭제 기능
- 리마인더 수동 발송 버튼
- 공유하기 기능
- 구글 캘린더 등록 버튼 (확정 시)

**현재 hr-sample 상태:**
- ✅ 기본 정보 표시는 있음
- ❌ AI 분석 기능 없음
- ❌ 포털 링크 복사 없음
- ❌ 삭제 기능 없음
- ❌ 리마인더 수동 발송 없음

**구현 필요:**
```typescript
// pages/admin/InterviewDetailPage.tsx (개선)
- AI 분석 버튼 및 결과 표시
- 포털 링크 복사 기능
- 삭제 기능 추가
- 리마인더 수동 발송 API 연동
```

---

### 5. **보고서 다운로드 - 중요도: 낮음**

**aj-networks-interview-automation 기능:**
- Dashboard에 "보고서" 다운로드 버튼
- 면접 조율 현황을 Excel/PDF로 내보내기

**현재 hr-sample 상태:**
- ❌ 보고서 다운로드 기능 없음

**구현 필요:**
```typescript
// utils/reportGenerator.ts (신규)
- Excel/PDF 생성 기능
- Dashboard에 다운로드 버튼 추가
```

---

### 6. **UI/UX 개선 - 중요도: 낮음**

**aj-networks-interview-automation 특징:**
- 모던한 UI (Tailwind CSS, 다크 테마 요소)
- 애니메이션 효과
- 반응형 디자인
- 직관적인 아이콘 사용

**현재 hr-sample 상태:**
- ✅ Ant Design 사용 (기능적)
- ⚠️ UI 개선 여지 있음

---

## 🎯 우선순위별 구현 계획

### Phase 1: 핵심 기능 (높은 우선순위)
1. **AI 분석 기능 (Gemini)**
   - Google Gemini API 통합
   - 공통 시간대 분석 로직
   - InterviewDetailPage에 AI 분석 섹션 추가

### Phase 2: 사용성 개선 (중간 우선순위)
2. **Settings 페이지**
   - 프론트엔드 Settings 페이지 구현
   - Config API 연동
   - 라우트 추가

3. **Dashboard 개선**
   - 필터링 기능
   - 검색 기능
   - 응답률 시각화 개선

4. **InterviewDetail 개선**
   - 포털 링크 복사
   - 삭제 기능
   - 리마인더 수동 발송

### Phase 3: 추가 기능 (낮은 우선순위)
5. **보고서 다운로드**
   - Excel/PDF 생성
   - 다운로드 기능

6. **UI/UX 개선**
   - 모던한 디자인 적용
   - 애니메이션 효과

---

## 📝 구현 체크리스트

### AI 분석 기능
- [ ] Google Gemini API 키 설정
- [ ] `services/gemini.ts` 생성
- [ ] `findCommonSlots()` 함수 구현
- [ ] InterviewDetailPage에 AI 분석 버튼 추가
- [ ] 공통 시간대 추천 결과 표시
- [ ] 에러 처리

### Settings 페이지
- [ ] `pages/admin/SettingsPage.tsx` 생성
- [ ] Config API 연동
- [ ] 설정 UI 구성
- [ ] App.tsx에 라우트 추가 (`/admin/settings`)
- [ ] 사이드바에 Settings 메뉴 추가

### Dashboard 개선
- [ ] 상태별 필터 추가
- [ ] 검색 기능 추가
- [ ] 응답률 프로그레스 바 개선
- [ ] 보고서 다운로드 버튼 (선택)

### InterviewDetail 개선
- [ ] 포털 링크 복사 기능
- [ ] 삭제 기능 (API 연동)
- [ ] 리마인더 수동 발송 버튼
- [ ] AI 분석 섹션 (Phase 1과 연계)

---

## 🔗 참고 파일

### aj-networks-interview-automation
- `services/gemini.ts` - AI 분석 로직
- `pages/Settings.tsx` - Settings 페이지
- `pages/Dashboard.tsx` - Dashboard 구현
- `pages/InterviewDetail.tsx` - InterviewDetail 구현

### hr-sample
- `backend/src/routes/config.routes.ts` - Config API
- `frontend/src/pages/admin/DashboardPage.tsx` - 현재 Dashboard
- `frontend/src/pages/admin/InterviewDetailPage.tsx` - 현재 InterviewDetail

---

## 💡 추가 고려사항

1. **Gemini API 비용**: 무료 할당량 확인 필요
2. **보안**: Settings 페이지는 Admin 권한 필요
3. **성능**: AI 분석은 비동기 처리 필요
4. **에러 처리**: API 실패 시 사용자 친화적 메시지

---

## 📅 예상 작업 시간

- Phase 1 (AI 분석): 4-6시간
- Phase 2 (Settings + Dashboard + InterviewDetail): 6-8시간
- Phase 3 (보고서 + UI): 4-6시간

**총 예상 시간: 14-20시간**
