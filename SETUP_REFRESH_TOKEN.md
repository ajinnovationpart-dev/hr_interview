# Refresh Token 설정 가이드 (자동 갱신)

## 🎯 목표

Refresh Token을 설정하여 Access Token이 자동으로 갱신되도록 합니다.

## ✅ 설정 방법

### 1단계: PowerShell 스크립트 실행

터미널에서 다음 명령어 실행:

```powershell
cd e:\hr-sample
.\get-sharepoint-token.ps1
```

### 2단계: 브라우저에서 인증

스크립트가 다음을 표시합니다:

```
=========================================
인증 필요
=========================================
1. 브라우저에서 다음 URL 접속:
   https://login.microsoftonline.com/common/oauth2/v2.0/devicecode
   
2. 다음 코드 입력:
   [코드 표시]
   
3. 로그인 완료 후 Enter 키를 누르세요...
=========================================
```

**다음 단계:**

1. 브라우저에서 표시된 URL 접속
2. 표시된 코드 입력
3. 로그인
4. PowerShell 창에서 Enter 키 누르기

### 3단계: 토큰 받기

스크립트가 자동으로:
- Access Token 발급
- Refresh Token 발급
- 클립보드에 복사

### 4단계: 환경 변수에 저장

스크립트가 자동으로 클립보드에 복사한 내용을 `backend/.env` 파일에 붙여넣기:

```bash
SHAREPOINT_ACCESS_TOKEN=eyJ0eXAi...
SHAREPOINT_REFRESH_TOKEN=0.ABC123...
```

### 5단계: 서버 재시작

```bash
cd backend
npm run dev
```

## ✅ 완료!

이제 토큰이 자동으로 갱신됩니다!

서버 로그에서 다음을 확인할 수 있습니다:
```
[INFO] Refreshing SharePoint access token...
[INFO] SharePoint access token refreshed successfully
```

---

## 🧪 테스트

토큰이 자동으로 갱신되는지 확인:

1. 서버 로그 확인
2. 1시간 후에도 정상 작동하는지 확인
3. 로그에 "Refreshing SharePoint access token" 메시지 확인

---

## 📝 주의사항

- Refresh Token도 만료될 수 있습니다 (보통 90일)
- 만료되면 다시 스크립트를 실행하여 새로 발급받으세요
- Refresh Token은 매우 민감한 정보이므로 안전하게 보관하세요

준비되면 스크립트를 실행하세요!
