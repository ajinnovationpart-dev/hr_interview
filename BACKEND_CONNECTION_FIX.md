# 백엔드 연결 오류 해결

## 🔴 오류 메시지

```
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

## 🔍 문제 원인

백엔드 서버가 실행되지 않았습니다.

## ✅ 해결 방법

### 1단계: 백엔드 서버 시작

**새 터미널 창을 열고:**

```bash
cd e:\hr-sample\backend
npm run dev
```

**정상적으로 시작되면 다음 로그가 표시됩니다:**
```
SharePoint REST API service initialized
Using SharePoint REST API as data storage
Server is running on port 3000
Access from network: http://[YOUR_IP]:3000
```

### 2단계: 프론트엔드 API URL 확인

프론트엔드는 자동으로 현재 호스트의 3000 포트로 연결합니다:
- `192.10.10.76:5173`에서 접속하면 → `192.10.10.76:3000`으로 연결
- `localhost:5173`에서 접속하면 → `localhost:3000`으로 연결

### 3단계: 환경 변수 설정 (선택사항)

`frontend/.env` 파일에 명시적으로 설정할 수도 있습니다:

```bash
VITE_API_URL=http://192.10.10.76:3000/api
VITE_FRONTEND_URL=http://192.10.10.76:5173
```

**주의**: 환경 변수를 변경한 후 프론트엔드 서버를 재시작해야 합니다.

---

## 🧪 연결 확인

### 방법 1: 브라우저에서 직접 확인

```
http://localhost:3000/health
```

또는

```
http://192.10.10.76:3000/health
```

응답:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T15:10:00.000Z"
}
```

### 방법 2: PowerShell 스크립트

```powershell
.\check-sharepoint-data.ps1
```

---

## ⚠️ 주의사항

### 백엔드와 프론트엔드 모두 실행 필요

1. **백엔드 서버** (포트 3000)
   ```bash
   cd backend
   npm run dev
   ```

2. **프론트엔드 서버** (포트 5173)
   ```bash
   cd frontend
   npm run dev
   ```

### 포트 충돌

포트 3000이 이미 사용 중이면:
1. 기존 프로세스 종료
2. 또는 `.env` 파일에서 `PORT=3001`로 변경

---

## 📋 빠른 체크리스트

- [ ] 백엔드 서버 실행 중 (`npm run dev` in `backend`)
- [ ] 프론트엔드 서버 실행 중 (`npm run dev` in `frontend`)
- [ ] 백엔드 로그에 "Server is running on port 3000" 표시
- [ ] `http://localhost:3000/health` 접속 시 응답 확인

---

## 🚀 정상 작동 확인

1. 백엔드 서버 시작
2. 프론트엔드에서 `http://localhost:5173/login` 접속
3. 로그인
4. 대시보드에서 데이터 확인

준비되면 알려주세요!
