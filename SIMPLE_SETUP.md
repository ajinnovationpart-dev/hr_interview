# 간단 설정 가이드 (OAuth 2.0 방식)

## ✅ 이미 가지고 있는 정보

- 스프레드시트 ID: `1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs`
- Gmail 계정: `ajinnovationpart@gmail.com`

## 📝 해야 할 일 (3단계)

### 1단계: Google Cloud Console에서 OAuth 클라이언트 ID 생성 (5분)

1. https://console.cloud.google.com 접속
2. 프로젝트 선택 (없으면 새로 생성)
3. "API 및 서비스" → "사용자 인증 정보"
4. "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
5. 애플리케이션 유형: "웹 애플리케이션"
6. 이름: "Interview System"
7. 승인된 리디렉션 URI: `http://localhost:3000/api/auth/google/callback`
8. 만들기 클릭
9. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

### 2단계: Google Sheets API 활성화 (1분)

1. "API 및 서비스" → "라이브러리"
2. "Google Sheets API" 검색
3. "사용 설정" 클릭

### 3단계: 환경 변수 설정 및 Refresh Token 생성 (5분)

#### 3-1. 환경 변수 파일 생성

`backend/.env` 파일 생성:

```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

JWT_SECRET=임시-비밀번호-나중에-변경

# Google Sheets API (OAuth 2.0)
GOOGLE_SPREADSHEET_ID=1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs
GOOGLE_CLIENT_ID=여기에-1단계에서-복사한-클라이언트-ID-붙여넣기
GOOGLE_CLIENT_SECRET=여기에-1단계에서-복사한-클라이언트-시크릿-붙여넣기
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=아직-없음
```

#### 3-2. Refresh Token 생성

1. 서버 실행:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. 브라우저에서 접속:
   ```
   http://localhost:3000/api/auth/google/auth-url
   ```

3. 응답에서 `authUrl` 복사

4. 브라우저에서 `authUrl` 접속

5. `ajinnovationpart@gmail.com`으로 로그인

6. 권한 승인

7. 리디렉션된 페이지에서 **Refresh Token** 복사

8. `backend/.env` 파일의 `GOOGLE_REFRESH_TOKEN`에 붙여넣기

9. 서버 재시작

## ✅ 완료!

이제 시스템을 사용할 수 있습니다!

```bash
# 루트에서 실행
npm run dev
```

## 📚 추가 정보

- 자세한 가이드: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- 전체 설정 가이드: [REQUIRED_INFO.md](./REQUIRED_INFO.md)
