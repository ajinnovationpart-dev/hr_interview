# Refresh Token 발급 팁

## ⚠️ Device Code 만료 문제

Device Code는 **15분 동안만 유효**합니다. 브라우저에서 로그인을 완료하지 않으면 만료됩니다.

## ✅ 해결 방법

### 방법 1: 빠르게 로그인 (권장)

1. **스크립트 실행**:
   ```powershell
   .\get-sharepoint-token.ps1
   ```

2. **스크립트가 코드를 표시하면 즉시**:
   - 브라우저를 열고 `https://microsoft.com/devicelogin` 접속
   - 코드 입력
   - **빠르게 로그인 완료** (5분 이내 권장)

3. **스크립트가 자동으로 토큰 발급** (폴링 중)

### 방법 2: Microsoft Graph Explorer 사용 (수동, 더 간단)

Device Code Flow가 계속 실패하면, **Microsoft Graph Explorer**를 사용하세요:

1. **브라우저에서 접속**:
   ```
   https://developer.microsoft.com/graph/graph-explorer
   ```

2. **로그인**:
   - "Sign in with Microsoft" 클릭
   - 회사 계정으로 로그인

3. **토큰 복사**:
   - 우측 상단 "Access token" 클릭
   - 토큰 복사

4. **환경 변수 설정**:
   - `backend/.env` 파일에 추가:
   ```bash
   SHAREPOINT_ACCESS_TOKEN=복사한-토큰
   ```

**주의**: 이 방법은 **Refresh Token이 없어서** 1시간마다 수동 갱신이 필요합니다.

---

## 🎯 권장 순서

1. **먼저 Device Code Flow 시도** (자동 갱신 가능)
   - 스크립트 실행
   - **빠르게** 브라우저에서 로그인
   - 토큰 발급 대기

2. **계속 실패하면 Graph Explorer 사용** (수동 갱신)
   - 1시간마다 새 토큰 발급 필요
   - 하지만 더 간단하고 안정적

---

## 💡 팁

- **Device Code Flow**: 자동 갱신 가능 (Refresh Token 포함)
- **Graph Explorer**: 수동 갱신 필요 (Access Token만)

어떤 방법을 사용하시겠어요?
