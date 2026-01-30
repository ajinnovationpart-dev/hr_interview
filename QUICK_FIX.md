# 빠른 문제 해결

## ERR_CONNECTION_REFUSED 오류

백엔드 서버가 실행되지 않아서 발생하는 오류입니다.

### 해결 방법

**새 터미널 창**을 열고 다음 명령어 실행:

```bash
cd backend
npm run dev
```

서버가 정상 실행되면 다음과 같은 메시지가 표시됩니다:
```
Server is running on port 3000
Scheduler service started
```

### 확인

브라우저에서 다음 URL로 테스트:
```
http://localhost:3000/health
```

정상 응답:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

## React 경고 해결

Form.List의 key prop 경고는 이미 수정했습니다. 브라우저를 새로고침하면 경고가 사라집니다.

## 체크리스트

- ✅ React 경고 수정 완료
- ⏳ 백엔드 서버 실행 필요
- ⏳ 프론트엔드와 백엔드 동시 실행 필요

## 동시 실행 방법

### 방법 1: 두 개의 터미널 사용

**터미널 1 (Backend):**
```bash
cd backend
npm run dev
```

**터미널 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### 방법 2: 루트에서 동시 실행

```bash
# 루트 디렉토리에서
npm run dev
```

이 명령어는 `package.json`의 `dev` 스크립트를 실행하여 백엔드와 프론트엔드를 동시에 실행합니다.
