# GitHub Pages CORS 설정 가이드

## 문제
GitHub Pages에서 배포된 사이트가 ngrok 백엔드 API에 요청할 때 CORS 오류가 발생합니다.

## 해결 방법

### 1. Backend 서버 재시작
Backend 서버를 재시작하여 새로운 CORS 설정을 적용하세요.

```bash
cd backend
npm run dev
```

### 2. 환경 변수 설정 (선택사항)
`backend/.env` 파일에 다음을 추가할 수 있습니다:

```env
FRONTEND_URL=https://ajinnovationpart-dev.github.io,http://localhost:5173
```

### 3. 확인 사항
- Backend 서버가 실행 중인지 확인
- ngrok 터널이 활성화되어 있는지 확인
- GitHub Pages 사이트에서 다시 시도

## 자동 허용된 Origin
다음 origin은 자동으로 허용됩니다:
- `http://localhost:5173` (로컬 개발)
- `http://192.10.10.76:5173` (네트워크 접속)
- `https://ajinnovationpart-dev.github.io` (GitHub Pages)

## 추가 Origin 허용
`FRONTEND_URL` 환경 변수에 콤마로 구분하여 추가할 수 있습니다:
```env
FRONTEND_URL=https://example.com,https://another-domain.com
```
