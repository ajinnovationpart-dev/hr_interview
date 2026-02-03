# API URL 문제 해결

## 문제
- API URL이 `http://192.10.10.76:3000/api`로 설정되어 연결 실패
- 백엔드 서버가 실행되지 않음

## 해결 완료

### 1. 코드 수정
`frontend/src/utils/api.ts` 파일을 수정하여:
- **개발 환경에서는 환경 변수를 무시하고 항상 `http://localhost:3000/api` 사용**
- 프로덕션 환경에서만 환경 변수 사용

### 2. 백엔드 서버 시작
백엔드 서버를 포트 3000에서 시작했습니다.

## 다음 단계 (필수!)

### 프론트엔드 서버 재시작
프론트엔드 서버를 **반드시 재시작**해야 변경사항이 적용됩니다:

1. 프론트엔드 서버 중지 (Ctrl+C)
2. 다시 시작:
   ```bash
   cd frontend
   npm run dev
   ```

3. 브라우저 새로고침 (F5 또는 Ctrl+R)

4. 콘솔에서 확인:
   - `🔧 API URL: http://localhost:3000/api` 메시지 확인
   - `ERR_CONNECTION_REFUSED` 오류가 사라졌는지 확인

## 확인 사항

### 백엔드 서버 상태
```bash
netstat -ano | findstr ":3000" | findstr "LISTENING"
```
포트 3000에서 LISTENING 상태여야 합니다.

### 프론트엔드 서버 상태
```bash
netstat -ano | findstr ":5173" | findstr "LISTENING"
```
포트 5173에서 LISTENING 상태여야 합니다.

## 문제가 계속되면

1. **백엔드 서버 수동 시작:**
   ```bash
   cd backend
   npm run dev
   ```

2. **프론트엔드 서버 수동 시작:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **브라우저 캐시 삭제:**
   - Ctrl+Shift+Delete
   - 또는 시크릿 모드에서 테스트

4. **개발자 도구 확인:**
   - F12 → Console 탭
   - `🔧 API URL:` 메시지 확인
   - `http://localhost:3000/api`로 표시되어야 함
