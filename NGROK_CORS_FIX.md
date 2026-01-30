# ngrok CORS 문제 해결 가이드

## 문제
ngrok을 통한 API 요청 시 CORS preflight 요청이 실패합니다.

## 해결 방법

### 1. ngrok 헤더 추가
ngrok은 기본적으로 브라우저 경고 페이지를 표시합니다. 이를 건너뛰기 위해 헤더를 추가해야 합니다.

**Frontend에서 API 요청 시:**
```typescript
headers: {
  'ngrok-skip-browser-warning': 'true'
}
```

### 2. Backend CORS 설정 확인
Backend 서버의 CORS 설정에서 다음을 확인:
- GitHub Pages origin 허용: `https://ajinnovationpart-dev.github.io`
- ngrok 도메인 허용: `*.ngrok-free.dev`, `*.ngrok.io`
- OPTIONS 메서드 허용

### 3. ngrok 설정 (선택사항)
ngrok 실행 시 헤더를 추가할 수 있습니다:
```bash
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning: true"
```

## 현재 상태
- ✅ API URL 자동 `/api` 추가 구현됨
- ✅ ngrok CORS 허용 구현됨
- ⚠️ Backend 서버 재시작 필요
- ⚠️ GitHub Pages 재배포 필요 (코드 변경 반영)
