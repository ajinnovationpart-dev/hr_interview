# Refresh Token 확인 및 설정 가이드

## 🔍 현재 상태 확인

### 1단계: `.env` 파일 확인

`backend/.env` 파일을 열고 다음이 있는지 확인:

```bash
SHAREPOINT_ACCESS_TOKEN=eyJ0eXAi...
SHAREPOINT_REFRESH_TOKEN=0.ABC123...
```

**중요**: `SHAREPOINT_REFRESH_TOKEN`이 **없거나 비어있으면** 자동 갱신이 작동하지 않습니다!

---

## ✅ Refresh Token이 있는 경우

서버를 재시작하면 자동 갱신이 활성화됩니다:

```bash
cd backend
npm run dev
```

---

## ❌ Refresh Token이 없는 경우

다음 단계로 Refresh Token을 발급받으세요:

### 1단계: 스크립트 실행

```powershell
cd e:\hr-sample
.\get-sharepoint-token.ps1
```

### 2단계: 브라우저에서 인증

1. 스크립트가 표시한 URL 접속
2. 코드 입력
3. 로그인

**스크립트가 자동으로 토큰을 발급합니다!**

### 3단계: 환경 변수 업데이트

스크립트가 클립보드에 복사한 내용을 `backend/.env`에 붙여넣기:

```bash
SHAREPOINT_ACCESS_TOKEN=...
SHAREPOINT_REFRESH_TOKEN=...
```

### 4단계: 서버 재시작

```bash
cd backend
npm run dev
```

---

## 🧪 자동 갱신 확인

서버가 시작되면 로그에서 다음을 확인:

```
info: SharePoint REST API service initialized
info: Using SharePoint REST API as data storage
```

**토큰이 만료되면 자동으로 갱신됩니다!**

---

## 📋 체크리스트

- [ ] `backend/.env` 파일에 `SHAREPOINT_REFRESH_TOKEN` 확인
- [ ] Refresh Token이 없으면 스크립트 실행
- [ ] 환경 변수 업데이트
- [ ] 서버 재시작

준비되면 서버를 시작하세요!
