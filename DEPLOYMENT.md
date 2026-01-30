# 배포 가이드

## 환경 변수 설정

### Frontend 환경 변수

프로덕션 환경에서 다음 환경 변수를 설정하세요:

```bash
VITE_API_URL=https://uncognizant-restrainedly-leila.ngrok-free.dev/
```

### 설정 방법

#### 1. 로컬 개발 환경

`frontend/.env` 파일을 생성하고 다음 내용을 추가:

```env
VITE_API_URL=https://uncognizant-restrainedly-leila.ngrok-free.dev/
```

#### 2. GitHub Actions / CI/CD

GitHub 저장소의 Settings → Secrets and variables → Actions에서 다음을 추가:

- Name: `VITE_API_URL`
- Value: `https://uncognizant-restrainedly-leila.ngrok-free.dev/`

#### 3. 배포 플랫폼 (Vercel, Netlify 등)

각 플랫폼의 환경 변수 설정에서:

- **Vercel**: Settings → Environment Variables
- **Netlify**: Site settings → Environment variables

다음 변수를 추가:
- Key: `VITE_API_URL`
- Value: `https://uncognizant-restrainedly-leila.ngrok-free.dev/`

## 배포 후 확인

배포 후 다음을 확인하세요:

1. Frontend가 정상적으로 로드되는지 확인
2. API 호출이 `VITE_API_URL`로 정상적으로 전송되는지 확인
3. 브라우저 콘솔에서 CORS 오류가 없는지 확인

## 문제 해결

### API 연결 실패

- `VITE_API_URL`이 올바르게 설정되었는지 확인
- ngrok URL이 활성화되어 있는지 확인
- Backend 서버가 실행 중인지 확인

### CORS 오류

Backend의 CORS 설정에서 Frontend URL을 허용 목록에 추가해야 합니다.
