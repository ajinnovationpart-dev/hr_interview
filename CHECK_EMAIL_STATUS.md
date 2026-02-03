# 메일 전송 상태 확인 가이드

## youngjoon.kim@ajnet.co.kr 메일 전송 문제

### 즉시 확인 사항

1. **백엔드 서버 실행 상태**
   - 백엔드 서버가 포트 3000에서 실행 중인지 확인
   - PowerShell에서 `netstat -ano | findstr ":3000"` 실행

2. **백엔드 로그 확인**
   백엔드 서버를 실행할 때 다음 로그를 확인하세요:
   
   **서버 시작 시:**
   ```
   SMTP configuration - Host: smtp.gmail.com, Port: 587, Secure: false, User: ...
   SMTP server connection verified
   ```
   
   **메일 발송 시도 시:**
   ```
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

3. **테스트 메일 발송**
   - 면접관 관리 페이지 접속
   - youngjoon.kim@ajnet.co.kr로 테스트 메일 발송
   - 백엔드 로그에서 에러 확인

### 가능한 원인 및 해결 방법

#### 1. SMTP 인증 실패
**증상:**
- 백엔드 로그에 "Gmail 인증 실패" 또는 "EAUTH" 에러
- 응답 코드 535

**해결:**
- Gmail 앱 비밀번호 재생성
- `backend/.env` 파일의 `SMTP_PASSWORD` 업데이트
- 백엔드 서버 재시작

#### 2. Gmail 일일 발송 제한 초과
**증상:**
- 메일 발송 시도 시 제한 초과 에러
- 이전에는 정상 작동했지만 갑자기 안 됨

**해결:**
- Gmail 계정에서 발송 제한 확인
- 다음 날까지 대기 또는 Gmail Workspace 업그레이드

#### 3. 수신자 이메일 주소 문제
**증상:**
- 메일이 발송되었다고 표시되지만 수신하지 못함
- 스팸 폴더에도 없음

**해결:**
- 이메일 주소가 올바른지 확인 (youngjoon.kim@ajnet.co.kr)
- 회사 메일 서버 정책 확인
- 스팸 필터 설정 확인

#### 4. 네트워크/방화벽 문제
**증상:**
- "SMTP 서버 연결 실패" 또는 "ECONNECTION" 에러
- 응답 코드 없음

**해결:**
- 방화벽에서 SMTP 포트(587) 허용 확인
- 회사 네트워크에서 외부 SMTP 서버 접근 가능한지 확인

#### 5. 발신자 도메인 불일치
**증상:**
- "발신자 주소가 거부되었습니다" 에러
- 응답 코드 550 또는 553

**해결:**
- `SMTP_USER`와 `SMTP_FROM`의 도메인이 동일한지 확인
- Gmail에서 "다른 주소로 보내기" 기능 설정

### 디버깅 단계

1. **백엔드 서버 재시작**
   ```bash
   cd backend
   npm run dev
   ```

2. **SMTP 연결 확인**
   서버 시작 시 "SMTP server connection verified" 메시지 확인

3. **테스트 메일 발송**
   - 면접관 관리 페이지에서 youngjoon.kim@ajnet.co.kr로 테스트 메일 발송
   - 백엔드 로그에서 상세 에러 확인

4. **에러 메시지 분석**
   - 백엔드 로그의 "Error sending email - Full details" 확인
   - 에러 코드 및 메시지 확인

### 로그 확인 명령어

백엔드 서버를 실행한 PowerShell 창에서 다음을 확인하세요:
- 서버 시작 시 SMTP 설정 로그
- 메일 발송 시도 시 상세 로그
- 에러 발생 시 에러 메시지

### 추가 확인 사항

1. **이전에 정상 작동했다면:**
   - SMTP 설정이 변경되었는지 확인
   - Gmail 앱 비밀번호가 만료되었는지 확인
   - Gmail 발송 제한에 도달했는지 확인

2. **특정 이메일 주소만 안 되는 경우:**
   - 해당 이메일 주소의 스팸 필터 확인
   - 회사 메일 서버 정책 확인
   - 이메일 주소 형식 확인
