# 백엔드 서버 시작 가이드

## 문제
- `localhost:3000/health` 접속 시 `ERR_CONNECTION_REFUSED` 오류
- 백엔드 서버가 포트 3000에서 실행되지 않음

## 해결 방법

### 1. 새 PowerShell 창 열기
Windows에서 새 PowerShell 창을 엽니다.

### 2. 백엔드 폴더로 이동
```bash
cd E:\hr-sample\backend
```

### 3. 백엔드 서버 시작
```bash
npm run dev
```

### 4. 서버 시작 확인
서버가 정상적으로 시작되면 다음과 같은 메시지가 표시됩니다:
```
Server is running on port 3000
Access from network: http://[YOUR_IP]:3000
Scheduler service started
```

### 5. Health Check 테스트
브라우저에서 다음 URL을 열어보세요:
```
http://localhost:3000/health
```

정상 응답:
```json
{"status":"ok","timestamp":"2026-01-30T..."}
```

## 문제 해결

### 서버가 시작되지 않는 경우

1. **의존성 설치:**
   ```bash
   cd E:\hr-sample\backend
   npm install
   ```

2. **환경 변수 확인:**
   - `backend/.env` 파일이 존재하는지 확인
   - 필수 환경 변수가 설정되어 있는지 확인

3. **포트 충돌:**
   ```bash
   netstat -ano | findstr ":3000"
   ```
   다른 프로세스가 포트 3000을 사용 중이면 종료:
   ```bash
   taskkill /PID [프로세스ID] /F
   ```

4. **에러 메시지 확인:**
   백엔드 서버를 시작할 때 표시되는 에러 메시지를 확인하세요.

## 빠른 시작

**PowerShell 창 1 (백엔드):**
```bash
cd E:\hr-sample\backend
npm run dev
```

**PowerShell 창 2 (프론트엔드 - 선택사항):**
```bash
cd E:\hr-sample\frontend
npm run dev
```

## 확인 사항

- [ ] 백엔드 서버가 포트 3000에서 실행 중인가?
- [ ] `http://localhost:3000/health`가 정상 응답하는가?
- [ ] 브라우저 콘솔에서 `ERR_CONNECTION_REFUSED` 오류가 사라졌는가?
