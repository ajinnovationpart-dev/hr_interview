# Gmail SMTP 설정 가이드

Microsoft Graph API 대신 Gmail SMTP를 사용하여 이메일을 발송합니다.

## 설정 방법

### 1단계: Gmail 앱 비밀번호 생성

1. Google 계정 설정 페이지 접속: https://myaccount.google.com/
2. "보안" 탭 클릭
3. "2단계 인증" 활성화 (아직 안 했다면)
4. "앱 비밀번호" 클릭
5. "앱 선택" → "메일" 선택
6. "기기 선택" → "기타(맞춤 이름)" 선택 → "면접 시스템" 입력
7. "생성" 클릭
8. **16자리 앱 비밀번호 복사** (예: `abcd efgh ijkl mnop`)

### 2단계: 환경 변수 설정

`backend/.env` 파일에 다음 내용 추가/수정:

```bash
# SMTP 설정 (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ajinnovationpart@gmail.com
SMTP_PASSWORD=여기에-앱-비밀번호-16자리-입력
SMTP_FROM=ajinnovationpart@gmail.com
```

**중요**: 
- `SMTP_PASSWORD`에는 일반 Gmail 비밀번호가 아닌 **앱 비밀번호**를 입력하세요
- 앱 비밀번호는 공백 없이 입력 (예: `abcdefghijklmnop`)

### 3단계: Microsoft Graph API 설정 제거 (선택사항)

이제 Microsoft Graph API가 필요 없으므로 다음 환경 변수는 제거하거나 주석 처리할 수 있습니다:

```bash
# Microsoft Graph API (더 이상 필요 없음)
# MICROSOFT_CLIENT_ID=...
# MICROSOFT_CLIENT_SECRET=...
# MICROSOFT_TENANT_ID=...
# MICROSOFT_REDIRECT_URI=...
```

### 4단계: 테스트

서버를 실행하고 이메일 발송 기능을 테스트하세요.

## 보안 주의사항

- 앱 비밀번호는 안전하게 보관하세요
- `.env` 파일은 Git에 커밋하지 마세요
- 앱 비밀번호가 유출되면 즉시 재생성하세요

## 다른 SMTP 서버 사용하기

Gmail 외에 다른 SMTP 서버를 사용할 수도 있습니다:

```bash
# 예: 회사 메일 서버
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=hr@company.com
SMTP_PASSWORD=비밀번호
SMTP_FROM=hr@company.com
```

## Gmail 일일 발송 제한

- 일반 Gmail 계정: 하루 500통
- Google Workspace: 하루 2,000통

일반적인 사용에는 충분합니다.

## 문제 해결

### "Invalid login" 오류
- 앱 비밀번호를 사용하고 있는지 확인
- 일반 Gmail 비밀번호가 아닌 앱 비밀번호인지 확인

### "Connection timeout" 오류
- 방화벽에서 포트 587이 차단되지 않았는지 확인
- 회사 네트워크에서는 SMTP 포트가 차단될 수 있음

### 이메일이 스팸으로 분류됨
- SPF, DKIM 설정 확인
- 발신자 이메일 주소가 신뢰할 수 있는지 확인
