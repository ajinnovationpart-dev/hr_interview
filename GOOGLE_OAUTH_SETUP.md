# Google OAuth 2.0 설정 가이드 (서비스 계정 없이 사용)

일반 Gmail 계정(`ajinnovationpart@gmail.com`)을 사용하는 경우, OAuth 2.0 클라이언트 ID 방식으로 설정합니다.

## 📋 필요한 정보

이미 가지고 있는 정보:
- ✅ 스프레드시트 ID: `1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs`
- ✅ Gmail 계정: `ajinnovationpart@gmail.com`

추가로 필요한 정보:
- Google OAuth 2.0 클라이언트 ID
- Google OAuth 2.0 클라이언트 Secret
- Refresh Token (한 번만 인증하면 자동 생성)

## 🔧 설정 방법

### 1단계: Google Cloud Console에서 OAuth 클라이언트 ID 생성

**참고**: Google Cloud Console은 무료이며, OAuth 클라이언트 ID 생성도 무료입니다.

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. "API 및 서비스" → "사용자 인증 정보" 클릭
4. "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" 선택
5. 애플리케이션 유형: "웹 애플리케이션"
6. 이름: "Interview Scheduling System"
7. 승인된 리디렉션 URI 추가:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
8. "만들기" 클릭
9. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (한 번만 표시됨)

### 2단계: Google Sheets API 활성화

1. "API 및 서비스" → "라이브러리" 클릭
2. "Google Sheets API" 검색
3. "사용 설정" 클릭

### 3단계: 스프레드시트 공유 설정

1. Google Sheets에서 스프레드시트 열기
2. "공유" 버튼 클릭
3. `ajinnovationpart@gmail.com`이 편집자 권한을 가지고 있는지 확인
4. (필요시) 다른 사용자에게도 공유 가능

### 4단계: 환경 변수 설정

`backend/.env` 파일에 다음 값 추가:

```bash
GOOGLE_SPREADSHEET_ID=1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs
GOOGLE_CLIENT_ID=여기에-클라이언트-ID-입력
GOOGLE_CLIENT_SECRET=여기에-클라이언트-시크릿-입력
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=아직-없음-아래-단계에서-생성
```

### 5단계: Refresh Token 생성 (한 번만 실행)

1. Backend 서버 실행:
   ```bash
   cd backend
   npm run dev
   ```

2. 브라우저에서 다음 URL 접속:
   ```
   http://localhost:3000/api/auth/google/auth-url
   ```

3. 응답에서 `authUrl` 복사

4. 브라우저에서 `authUrl` 접속

5. Google 계정으로 로그인 (`ajinnovationpart@gmail.com`)

6. 권한 승인

7. 리디렉션된 페이지에서 **Refresh Token** 복사

8. `backend/.env` 파일의 `GOOGLE_REFRESH_TOKEN`에 붙여넣기

9. 서버 재시작

### 6단계: 테스트

서버가 정상적으로 실행되면 Google Sheets에 접근할 수 있습니다.

## ✅ 완료!

이제 서비스 계정 없이도 Google Sheets API를 사용할 수 있습니다.

## 🔄 Refresh Token 만료 시

Refresh Token이 만료되면 5단계를 다시 실행하여 새로 발급받으세요.

## 📝 참고사항

- OAuth 클라이언트 ID 생성은 무료입니다
- Refresh Token은 한 번만 생성하면 계속 사용 가능합니다
- Google Cloud Console의 무료 할당량 내에서 사용 가능합니다
- 프로덕션 배포 시 리디렉션 URI를 실제 도메인으로 변경하세요
