# API 엔드포인트 점검 결과

## 현재 상황
- ✅ API URL이 `http://localhost:3000/api`로 올바르게 설정됨
- ❌ 백엔드 서버가 포트 3000에서 실행되지 않음
- ❌ `ERR_CONNECTION_REFUSED` 오류 발생

## 등록된 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인

### 면접 관리
- `GET /api/interviews/dashboard` - 대시보드 통계
- `GET /api/interviews` - 면접 목록
- `GET /api/interviews/:id` - 면접 상세
- `POST /api/interviews` - 면접 생성
- `POST /api/interviews/:id/analyze` - AI 분석 (신규)
- `POST /api/interviews/:id/remind` - 리마인더 발송 (신규)
- `GET /api/interviews/:id/portal-link/:interviewerId` - 포털 링크 생성 (신규)
- `DELETE /api/interviews/:id` - 면접 삭제 (신규)

### 면접관 관리
- `GET /api/interviewers` - 면접관 목록 (인증 필요)
- `POST /api/interviewers` - 면접관 등록
- `PUT /api/interviewers/:id` - 면접관 수정
- `DELETE /api/interviewers/:id` - 면접관 삭제
- `POST /api/interviewers/upload` - Excel 업로드

### 일정 확인
- `GET /api/confirm/:token` - 면접 정보 조회 (면접관용)
- `POST /api/confirm/:token` - 일정 선택 제출

### 설정
- `GET /api/config` - 설정 조회
- `PUT /api/config` - 설정 업데이트

### SharePoint
- `GET /api/sharepoint/*` - SharePoint 관련

## 문제점

### 1. 백엔드 서버 미실행
**증상:** `ERR_CONNECTION_REFUSED`
**원인:** 백엔드 서버가 포트 3000에서 실행되지 않음
**해결:** 백엔드 서버를 시작해야 함

### 2. 인증 필요
**증상:** `/api/interviewers` 엔드포인트는 `adminAuth` 미들웨어 사용
**원인:** JWT 토큰이 필요함
**해결:** 로그인 후 토큰을 받아야 함

## 해결 방법

### 1. 백엔드 서버 시작
```bash
cd backend
npm run dev
```

서버가 정상적으로 시작되면:
```
Server is running on port 3000
```

### 2. 서버 상태 확인
```bash
netstat -ano | findstr ":3000" | findstr "LISTENING"
```

포트 3000에서 LISTENING 상태여야 합니다.

### 3. Health Check 테스트
```bash
curl http://localhost:3000/health
```

응답:
```json
{"status":"ok","timestamp":"2026-01-30T..."}
```

### 4. API 엔드포인트 테스트
로그인 후:
```bash
# 면접관 목록 조회 (인증 필요)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/interviewers
```

## 체크리스트

- [ ] 백엔드 서버가 포트 3000에서 실행 중인가?
- [ ] `/health` 엔드포인트가 응답하는가?
- [ ] 로그인이 정상 작동하는가?
- [ ] JWT 토큰이 정상적으로 발급되는가?
- [ ] `/api/interviewers` 엔드포인트가 정상 작동하는가?
- [ ] `/api/config` 엔드포인트가 정상 작동하는가?
- [ ] `/api/interviews/dashboard` 엔드포인트가 정상 작동하는가?

## 다음 단계

1. 백엔드 서버를 확실하게 시작
2. 브라우저에서 로그인
3. 각 API 엔드포인트 테스트
4. 문제가 있는 엔드포인트 수정
