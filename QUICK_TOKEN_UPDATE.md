# 토큰 업데이트 빠른 가이드

## 🔴 현재 문제

Access Token이 만료되었습니다.

## ✅ 해결 방법 (2분 소요)

### 방법 1: Microsoft Graph Explorer로 새 토큰 발급 (가장 빠름)

#### 1단계: Graph Explorer 접속
1. 브라우저에서 https://developer.microsoft.com/graph/graph-explorer 접속
2. "Sign in with Microsoft" 클릭
3. 회사 계정으로 로그인

#### 2단계: 토큰 복사
1. 로그인 후 우측 상단의 **"Access token"** 클릭
2. 토큰 복사 (긴 문자열, `eyJ0eXAi...`로 시작)

#### 3단계: 환경 변수 업데이트

`backend/.env` 파일을 열고:

```bash
SHAREPOINT_ACCESS_TOKEN=여기에-복사한-토큰-붙여넣기
```

**주의**: 
- 기존 토큰을 완전히 교체하세요
- 따옴표 없이 그대로 붙여넣으세요

#### 4단계: 서버 재시작

```bash
# 터미널에서 Ctrl+C로 서버 중지 후
npm run dev
```

**완료!** 이제 정상 작동합니다.

---

### 방법 2: Refresh Token 설정 (자동 갱신)

**한 번만 설정하면 자동으로 갱신됩니다!**

```powershell
.\get-sharepoint-token.ps1
```

스크립트가 자동으로 Access Token과 Refresh Token을 발급합니다.

---

## 📋 체크리스트

- [ ] Microsoft Graph Explorer 접속
- [ ] 로그인
- [ ] "Access token" 클릭 → 복사
- [ ] `backend/.env` 파일의 `SHAREPOINT_ACCESS_TOKEN` 업데이트
- [ ] 서버 재시작 (`npm run dev`)

---

## ⚠️ 주의사항

- 토큰은 **1시간 후 만료**됩니다
- Refresh Token을 설정하면 자동 갱신됩니다
- 토큰을 업데이트한 후 **반드시 서버를 재시작**해야 합니다

---

## 🚀 빠른 실행

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. "Access token" 클릭 → 복사
4. `.env` 파일 업데이트
5. 서버 재시작

**끝!**
