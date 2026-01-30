# CORS 문제 해결 가이드

## 현재 상태
✅ API URL이 올바르게 설정됨: `https://uncognizant-restrainedly-leila.ngrok-free.dev/api/auth/login`

## CORS 오류 해결 방법

### 1. Backend 서버 재시작 (필수)
CORS 설정 변경사항이 적용되려면 Backend 서버를 재시작해야 합니다.

```bash
cd backend
npm run dev
```

### 2. CORS 설정 확인
Backend 서버의 `server.ts`에서 다음을 확인:
- ✅ GitHub Pages origin 허용: `https://ajinnovationpart-dev.github.io`
- ✅ ngrok 도메인 자동 허용: `*.ngrok-free.dev`, `*.ngrok.io`
- ✅ OPTIONS 메서드 허용
- ✅ `ngrok-skip-browser-warning` 헤더 허용

### 3. Backend 서버 로그 확인
Backend 서버 콘솔에서 다음을 확인:
- CORS 관련 경고 메시지가 있는지
- 요청이 실제로 도달하는지

### 4. ngrok 상태 확인
- ngrok 터널이 활성화되어 있는지 확인
- ngrok URL이 변경되지 않았는지 확인

## 예상 동작
Backend 서버 재시작 후:
- ✅ Preflight 요청 (OPTIONS) 성공
- ✅ 실제 요청 (POST) 성공
- ✅ 로그인 정상 작동

## 추가 디버깅
브라우저 Network 탭에서:
1. OPTIONS 요청 확인
2. Response Headers에 `Access-Control-Allow-Origin` 확인
3. Status Code가 200 또는 204인지 확인
