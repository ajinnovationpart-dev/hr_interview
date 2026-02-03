# 메일 발송 테스트 가이드

## 문제 상황
- 메일 발송이 안되고 있음
- youngjoon.kim@ajnet.co.kr로 메일이 전달되지 않음

## 즉시 확인 사항

### 1. 백엔드 서버 실행 확인
```bash
# PowerShell에서 실행
netstat -ano | findstr ":3000" | findstr "LISTENING"
```
포트 3000에서 LISTENING 상태가 보이면 서버가 실행 중입니다.

### 2. 백엔드 서버 시작
백엔드 서버가 실행되지 않았다면:
```bash
cd backend
npm run dev
```

### 3. SMTP 설정 확인
백엔드 서버 시작 시 다음 로그를 확인하세요:

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

### 4. 테스트 메일 발송 방법

#### 방법 1: 면접관 관리 페이지에서 테스트
1. 프론트엔드 접속
2. 면접관 관리 페이지로 이동
3. youngjoon.kim@ajnet.co.kr로 테스트 메일 발송
4. 백엔드 로그 확인

#### 방법 2: API 직접 호출 (Postman 또는 curl)
```bash
# PowerShell에서 실행
curl -X POST http://localhost:3000/api/test-email `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"youngjoon.kim@ajnet.co.kr\",\"subject\":\"테스트 메일\"}'
```

또는 브라우저에서:
```
http://localhost:3000/api/test-email
```
(POST 요청 필요)

### 5. 백엔드 로그 확인
메일 발송 시도 시 백엔드 로그에서 다음을 확인하세요:

**정상적인 경우:**
```
🧪 [TEST EMAIL] Starting test email to: youngjoon.kim@ajnet.co.kr
📨 Attempting to send email to: youngjoon.kim@ajnet.co.kr
🚀 [INDIVIDUAL SMTP CALL] Starting separate SMTP API call for ...
📤 [SMTP API CALL] Calling transporter.sendMail()
📥 [SMTP API RESPONSE] Received response
✅ Email sent successfully to ...
```

**에러 발생 시:**
```
❌ Failed to send email to ... (youngjoon.kim@ajnet.co.kr): [에러 메시지]
Error sending email - Full details: {...}
```

## 일반적인 에러 및 해결 방법

### 1. "SMTP credentials not configured"
**원인:** `.env` 파일에 SMTP 설정이 없음
**해결:**
- `backend/.env` 파일 확인
- SMTP_USER, SMTP_PASSWORD 설정 확인

### 2. "Gmail 인증 실패" (응답 코드 535)
**원인:** Gmail 앱 비밀번호가 잘못되었거나 만료됨
**해결:**
- Gmail 앱 비밀번호 재생성
- `.env` 파일의 SMTP_PASSWORD 업데이트
- 백엔드 서버 재시작

### 3. "SMTP 서버 연결 실패" (ECONNECTION)
**원인:** 네트워크 또는 방화벽 문제
**해결:**
- 방화벽에서 SMTP 포트(587) 허용 확인
- 회사 네트워크에서 외부 SMTP 서버 접근 가능한지 확인

### 4. "발신자 주소가 거부되었습니다" (응답 코드 550/553)
**원인:** SMTP_USER와 SMTP_FROM의 도메인이 다름
**해결:**
- `.env` 파일에서 SMTP_USER와 SMTP_FROM 확인
- Gmail에서 "다른 주소로 보내기" 기능 설정

### 5. 메일이 발송되었다고 표시되지만 수신하지 못함
**원인:**
- 스팸 폴더로 이동
- 회사 메일 서버에서 발신자 차단
- 이메일 주소 오타

**해결:**
- 스팸 폴더 확인
- 이메일 주소 확인 (youngjoon.kim@ajnet.co.kr)
- 회사 메일 서버 정책 확인

## 디버깅 체크리스트

- [ ] 백엔드 서버가 포트 3000에서 실행 중인가?
- [ ] 서버 시작 시 "SMTP server connection verified" 메시지가 보이는가?
- [ ] `.env` 파일에 SMTP 설정이 올바른가?
- [ ] 메일 발송 시도 시 백엔드 로그에 에러가 있는가?
- [ ] 에러 메시지가 무엇인가?
- [ ] Gmail 앱 비밀번호가 올바른가?
- [ ] Gmail 일일 발송 제한에 도달했는가?

## 다음 단계

1. 백엔드 서버를 실행하고 로그 확인
2. 테스트 메일 발송 시도
3. 백엔드 로그에서 에러 메시지 확인
4. 에러 메시지를 바탕으로 위의 해결 방법 참고

백엔드 로그의 에러 메시지를 알려주시면 더 정확한 진단이 가능합니다.
