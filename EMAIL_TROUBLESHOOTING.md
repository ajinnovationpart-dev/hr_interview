# 메일 전송 문제 해결 가이드

## 문제 상황
- youngjoon.kim@ajnet.co.kr로 메일이 전달되지 않음
- 이전 테스트까지는 정상적으로 받았었음

## 확인 사항

### 1. SMTP 설정 확인
`backend/.env` 파일에서 다음 설정을 확인하세요:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### 2. 백엔드 서버 로그 확인
백엔드 서버를 실행할 때 다음 로그를 확인하세요:

**정상적인 경우:**
```
SMTP configuration - Host: smtp.gmail.com, Port: 587, Secure: false, User: ...
SMTP server connection verified
```

**문제가 있는 경우:**
```
❌ SMTP credentials not configured. Email service will not work.
SMTP_USER: NOT SET, SMTP_PASSWORD: NOT SET
```
또는
```
SMTP server connection failed: [에러 메시지]
```

### 3. 메일 발송 시도 시 로그 확인
메일 발송을 시도할 때 백엔드 로그에서 다음을 확인하세요:

**정상적인 경우:**
```
📨 Attempting to send email to: youngjoon.kim@ajnet.co.kr
🚀 [INDIVIDUAL SMTP CALL] Starting separate SMTP API call for ...
📤 [SMTP API CALL] Calling transporter.sendMail()
📥 [SMTP API RESPONSE] Received response
✅ Email sent successfully to ...
```

**문제가 있는 경우:**
```
❌ Failed to send email to ... (youngjoon.kim@ajnet.co.kr): [에러 메시지]
```

### 4. 가능한 원인

#### A. SMTP 인증 실패
- Gmail 앱 비밀번호가 만료되었거나 잘못됨
- 2단계 인증이 비활성화됨

#### B. Gmail 일일 발송 제한 초과
- Gmail 무료 계정: 하루 500통
- Gmail Workspace: 하루 2,000통

#### C. 수신자 이메일 주소 문제
- 이메일 주소가 스팸 필터에 의해 차단됨
- 회사 메일 서버에서 발신자를 차단함

#### D. 네트워크/방화벽 문제
- SMTP 포트(587)가 차단됨
- 회사 네트워크에서 외부 SMTP 서버 접근 불가

#### E. 발신자 도메인 불일치
- SMTP_USER와 SMTP_FROM의 도메인이 다름
- Gmail에서 "다른 주소로 보내기" 설정이 안 됨

## 해결 방법

### 1. 백엔드 로그 확인
백엔드 서버를 실행하고 메일 발송을 시도한 후 로그를 확인하세요.

### 2. 테스트 메일 발송
면접관 관리 페이지에서 youngjoon.kim@ajnet.co.kr로 테스트 메일을 발송해보세요.

### 3. SMTP 설정 재확인
- Gmail 앱 비밀번호가 올바른지 확인
- `.env` 파일의 SMTP 설정이 올바른지 확인

### 4. Gmail 발송 제한 확인
Gmail 계정에서 발송 제한에 도달했는지 확인하세요.

### 5. 수신자 이메일 확인
- youngjoon.kim@ajnet.co.kr 주소가 올바른지 확인
- 스팸 폴더 확인
- 회사 메일 서버 정책 확인

## 디버깅 명령어

### 백엔드 서버 재시작
```bash
cd backend
npm run dev
```

### SMTP 연결 테스트
백엔드 서버 시작 시 자동으로 SMTP 연결을 테스트합니다.
로그에서 "SMTP server connection verified" 메시지를 확인하세요.

### 메일 발송 테스트
1. 면접관 관리 페이지 접속
2. youngjoon.kim@ajnet.co.kr로 테스트 메일 발송
3. 백엔드 로그 확인
