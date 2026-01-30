# 문제 해결 가이드

## 404 오류: `/api/auth/login`을 찾을 수 없음

### 원인
백엔드 서버가 실행되지 않았거나, 라우트가 제대로 등록되지 않았을 수 있습니다.

### 해결 방법

#### 1. 백엔드 서버 실행 확인

```bash
cd backend
npm install
npm run dev
```

서버가 정상적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
Server is running on port 3000
Scheduler service started
```

#### 2. 백엔드 서버 테스트

브라우저나 Postman에서 다음 URL로 테스트:
```
http://localhost:3000/health
```

정상 응답:
```json
{
  "status": "ok",
  "timestamp": "2025-01-29T..."
}
```

#### 3. Auth 라우트 테스트

```
http://localhost:3000/api/auth/test
```

정상 응답:
```json
{
  "success": true,
  "message": "Auth router is working"
}
```

#### 4. 로그인 API 테스트

Postman이나 curl로 테스트:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ajinnovationpart@gmail.com","password":"admin123"}'
```

### 일반적인 문제

#### 포트 충돌
다른 프로세스가 3000번 포트를 사용 중일 수 있습니다.

**해결:**
```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :3000

# 프로세스 종료 (PID는 위 명령어 결과에서 확인)
taskkill /PID [PID번호] /F
```

또는 `.env` 파일에서 포트 변경:
```bash
PORT=3001
```

#### 환경 변수 문제
`.env` 파일이 제대로 로드되지 않았을 수 있습니다.

**해결:**
1. `backend/.env` 파일이 존재하는지 확인
2. 서버 재시작
3. 환경 변수 값 확인

#### CORS 오류
프론트엔드와 백엔드의 포트가 다를 때 발생할 수 있습니다.

**해결:**
`backend/.env` 파일 확인:
```bash
FRONTEND_URL=http://localhost:5173
```

## React Router 경고

React Router v7 관련 경고는 기능에는 영향을 주지 않습니다. 이미 future flag를 추가하여 경고를 해결했습니다.

## 로그 확인

백엔드 서버 로그를 확인하여 정확한 오류를 파악하세요:

```bash
cd backend
npm run dev
```

오류 메시지를 확인하고 필요한 조치를 취하세요.
