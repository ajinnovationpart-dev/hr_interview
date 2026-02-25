# 면접 상태값 점검 요약

## 1. 지금까지 수정한 내용 (요약)

### 플로우 변경
- **이전**: 면접관 전원 응답 + 공통 일정 → 바로 `CONFIRMED` + 확정 메일 발송  
- **현재**: 면접관 전원 응답 + 공통 일정 → `PENDING_APPROVAL`(확정 대기) → **관리자 확정 승인** 시에만 `CONFIRMED` + 확정 메일 발송  

### 백엔드
- `InterviewStatus`에 `PENDING_APPROVAL` 추가
- Confirm/스케줄러: 공통 슬롯 시 `CONFIRMED` 대신 `PENDING_APPROVAL`로 설정, 확정 메일은 관리자 승인 시에만 발송
- `POST /interviews/:id/approve-confirmation` (관리자만) → `PENDING_APPROVAL` → `CONFIRMED` + 메일 발송
- 대시보드 stats에 `pendingApproval` 추가, 상태 전이에 `PENDING_APPROVAL` 반영

### 프론트
- 대시보드: 확정 대기 카드·상태 필터
- 면접 상세: 확정 승인 버튼, 확정 예정 일정 안내
- 면접 목록·면접관 포털: `PENDING_APPROVAL` → "확정 대기" 표시, 일정 수락 컬럼에 "관리자 승인 대기" 문구
- **면접관 포털 테이블**: Ant Design `render(value, record, index)`에 맞게 `record`를 두 번째 인자로 사용하도록 수정 (상태/일정 수락이 row 기준으로 올바르게 표시되도록)

---

## 2. 기존 리스트 데이터 – 상태값이 어떻게 있어야 하는지

| 상태 (DB 값)        | UI 라벨   | 의미 |
|---------------------|-----------|------|
| `PENDING`            | 대기 중   | 면접 등록 직후, 면접관 응답 대기 |
| `PARTIAL`            | 진행 중   | 일부 면접관만 응답함 |
| `PENDING_APPROVAL`   | 확정 대기 | 전원 응답 + 공통 일정 있음, 관리자 승인 대기 |
| `CONFIRMED`          | 확정      | 관리자 확정 승인 완료, 확정 메일 발송됨 |
| `NO_COMMON`          | 공통 없음 | 전원 응답했으나 겹치는 일정 없음 |
| `CANCELLED`          | 취소      | 면접 취소 |
| `SCHEDULED`          | 예정      | 확정 후 일정 대기 |
| `IN_PROGRESS`        | 진행중    | 면접 진행 중 |
| `COMPLETED`          | 완료      | 면접 종료 |
| `NO_SHOW`            | 노쇼      | 노쇼 처리 |

**정상 전이 예시**
- `PENDING` → (일부 응답) → `PARTIAL`
- `PARTIAL` → (전원 응답 + 공통 슬롯) → `PENDING_APPROVAL`
- `PENDING_APPROVAL` → (관리자 확정 승인) → `CONFIRMED`
- `PARTIAL` → (전원 응답 + 공통 없음) → `NO_COMMON`

화면에 “대기 중”만 보인다면 해당 면접의 DB 상태가 `PENDING`(또는 `PARTIAL`)인 것이고, 아직 `PENDING_APPROVAL`로 바뀌지 않은 상태입니다.  
“확정 대기”는 **전원 응답 + 공통 일정 산출**이 된 뒤에만 나타납니다.

---

## 3. 면접 등록 시 상태값 생성 여부 (확인 결과)

- **등록 시 설정되는 상태**: `PENDING` (고정)
- **위치**: `backend/src/routes/interview.routes.ts`  
  - 면접 생성 시 `dataService.createInterview({ ..., status: 'PENDING', ... })` 호출 (약 857행)
- **저장소**: `dataService`가 사용하는 백엔드 저장소(Google Sheets / SharePoint 등)에 `status: 'PENDING'` 그대로 전달됨
- **타입**: `interview.types.ts`의 `InterviewStatus`, Google Sheets `InterviewRow.status` 등에 `PENDING`·`PENDING_APPROVAL` 포함되어 있어 정상 반영됨

**결론**: 지금 면접 등록 시 상태값은 **항상 `PENDING`(대기 중)으로 정상 생성**됩니다.  
리스트/상세에 “대기 중”으로 보이는 것은 등록 직후이거나 아직 확정 대기 단계로 넘어가지 않은 정상 동작입니다.
