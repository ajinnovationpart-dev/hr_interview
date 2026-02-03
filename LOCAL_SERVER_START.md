# 로컬 서버 시작 가이드

## 현재 문제
- 백엔드 서버가 포트 3000에서 실행되지 않음
- `ERR_CONNECTION_REFUSED` 오류 발생

## 해결 방법

### 1. 백엔드 서버 시작

**새 PowerShell 창을 열고** 다음 명령어를 실행하세요:

```bash
cd E:\hr-sample\backend
npm run dev
```

서버가 정상적으로 시작되면 다음과 같은 메시지가 표시됩니다:
```
Server is running on port 3000
Access from network: http://[YOUR_IP]:3000
Scheduler service started
```

### 2. 서버 상태 확인

다른 터미널에서 다음 명령어로 확인:
```bash
netstat -ano | findstr ":3000" | findstr "LISTENING"
```

포트 3000에서 LISTENING 상태가 보이면 서버가 실행 중입니다.

### 3. Health Check 테스트

브라우저에서 다음 URL을 열어보세요:
```
http://localhost:3000/health
```

응답:
```json
{"status":"ok","timestamp":"2026-01-30T..."}
```

### 4. 프론트엔드 확인

프론트엔드 서버가 실행 중인지 확인:
```bash
netstat -ano | findstr ":5173" | findstr "LISTENING"
```

## 문제 해결

### 백엔드 서버가 시작되지 않는 경우

1. **의존성 설치 확인:**
   ```bash
   cd backend
   npm install
   ```

2. **환경 변수 확인:**
   - `backend/.env` 파일이 존재하는지 확인
   - 필요한 환경 변수가 설정되어 있는지 확인

3. **포트 충돌 확인:**
   ```bash
   netstat -ano | findstr ":3000"
   ```
   다른 프로세스가 포트 3000을 사용 중이면 종료하세요.

4. **에러 로그 확인:**
   백엔드 서버를 시작할 때 표시되는 에러 메시지를 확인하세요.

## 빠른 시작 스크립트

두 개의 터미널 창을 열고:

**터미널 1 (백엔드):**
```bash
cd E:\hr-sample\backend
npm run dev
```

**터미널 2 (프론트엔드):**
```bash
cd E:\hr-sample\frontend
npm run dev
```

## 확인 사항

- [ ] 백엔드 서버가 포트 3000에서 실행 중인가?
- [ ] 프론트엔드 서버가 포트 5173에서 실행 중인가?
- [ ] `http://localhost:3000/health`가 응답하는가?
- [ ] 브라우저 콘솔에서 `ERR_CONNECTION_REFUSED` 오류가 사라졌는가?
