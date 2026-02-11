# youngjoon.kim@ajnet.co.kr 등 회사 메일(ajnet.co.kr) 미수신 시

## 1. 먼저 확인할 것

| 확인 항목 | 방법 |
|-----------|------|
| **스팸/정크함** | youngjoon.kim@ajnet.co.kr 메일함에서 **스팸·정크·차단메일** 폴더 확인 |
| **발송 여부** | Gmail SMTP 사용 시: 발송한 **Gmail 계정의 보낸메일함**에 해당 메일이 있는지 확인 |
| **수신 주소** | 시스템에 등록된 면접관 이메일이 `youngjoon.kim@ajnet.co.kr` 로 **정확한지** 확인 (오타, 공백 없음) |

---

## 2. Gmail로 보낼 때 자주 걸리는 이유 (회사 메일로 갈 때)

- **발신자(From)를 회사 도메인(@ajnet.co.kr)으로 설정한 경우**  
  Gmail SMTP는 실제로는 Gmail 서버에서 보냅니다.  
  수신 측(ajnet.co.kr 메일 서버)은 “ajnet.co.kr에서 왔다”고 되어 있으면 SPF/DKIM 검사에서 **Gmail 서버를 허용하지 않아** 거부하거나 스팸 처리하는 경우가 많습니다.

**권장:**

- **From(발신 이메일)** 을 **Gmail 주소와 동일**하게 두세요.  
  - `.env`: `EMAIL_FROM` 을 비우거나 `SMTP_USER` 와 같은 Gmail 주소로 설정.  
  - 관리자 **설정** 화면의 “발신 이메일”도 Gmail 주소와 동일하게.
- 그러면 “Gmail에서 보낸 메일”로 인식되어, 회사 메일 서버가 받아주는 경우가 많습니다.

**회사 주소(@ajnet.co.kr)로 보내고 싶다면:**

- Gmail 웹: [설정 → 계정 → “다른 주소로 메일 보내기”]에서  
  `@ajnet.co.kr` 주소를 추가하고 **인증**한 뒤, 그 주소를 From으로 사용해야 합니다.

---

## 3. 회사 메일 서버 정책

- **외부 발신(특히 Gmail) 차단**  
  일부 회사는 Gmail 등 외부 SMTP를 차단하거나 스팸으로만 넣습니다.
- **대응:**  
  - 회사 **메일/IT 관리자**에게 문의:  
    “Gmail(또는 사용 중인 SMTP)에서 보낸 메일이 youngjoon.kim@ajnet.co.kr 로 거부·스팸 처리되는지” 로그 확인 요청.  
  - 가능하면 **회사 SMTP(ajnet.co.kr 전용 발송 서버)** 사용을 요청하는 것이 가장 확실합니다.

---

## 4. 회사 SMTP(ajnet.co.kr) 사용 시

- 회사에서 **SMTP 호스트/포트/계정**을 제공하면, 그걸 쓰는 것이 회사 메일 수신에 가장 유리합니다.
- `.env` 예시 (회사 SMTP라고 가정):

```env
SMTP_HOST=mail.ajnet.co.kr
SMTP_PORT=587
SMTP_USER=발송용계정@ajnet.co.kr
SMTP_PASSWORD=비밀번호
EMAIL_FROM=발송용계정@ajnet.co.kr
EMAIL_FROM_NAME=AJ Networks 인사팀
```

- 실제 호스트/포트/보안 설정은 **메일 관리자**에게 확인하세요.

---

## 5. 백엔드 로그로 확인

- 메일 발송 시 백엔드 로그에 다음이 찍힙니다.  
  - `To: youngjoon.kim@ajnet.co.kr`  
  - `📤 [SMTP API CALL]`  
  - `✅ Email accepted by SMTP server (250 OK)`  
- **250 OK** 가 나오면 “발송 요청은 성공”입니다.  
  그 이후 **수신 측(ajnet.co.kr 서버)** 에서 거부/스팸 처리하면 받는 쪽 메일함에는 안 들어갑니다.
- **Rejected** 가 나오면 수신 주소/도메인 정책으로 거부된 것이므로, 주소와 회사 정책을 확인해야 합니다.

---

## 요약

- **youngjoon.kim@ajnet.co.kr** 로 안 온다면:  
  1) 스팸/정크 확인,  
  2) **From을 Gmail과 동일**하게 맞추기,  
  3) 회사 메일 관리자에게 “Gmail(또는 사용 SMTP) 발신 허용/스팸 여부” 문의,  
  4) 가능하면 **회사 SMTP** 사용.
