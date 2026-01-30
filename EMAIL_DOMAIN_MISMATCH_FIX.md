# 이메일 도메인 불일치 문제 해결

## 문제 상황

로그를 보면:
- **From Email**: `youngjoon.kim@ajnetworks.co.kr`
- **SMTP_USER**: `ajinnovationpart@gmail.com` (추정)

Gmail SMTP를 사용하면서 다른 도메인(`ajnetworks.co.kr`)으로 보내려고 하면:
1. **SPF 검증 실패**: Gmail 서버에서 보낸 메일이 `ajnetworks.co.kr`의 SPF 레코드와 일치하지 않음
2. **DKIM 검증 실패**: Gmail의 DKIM 서명이 `ajnetworks.co.kr` 도메인과 일치하지 않음
3. **수신자 메일 서버에서 거부**: SPF/DKIM 실패로 인해 스팸으로 분류되거나 거부됨

## 해결 방법

### 방법 1: SMTP_USER와 From Email을 동일하게 설정 (권장)

**Gmail 계정을 사용하는 경우:**
```env
SMTP_USER=ajinnovationpart@gmail.com
EMAIL_FROM=ajinnovationpart@gmail.com
EMAIL_FROM_NAME=AJ Networks 인사팀
```

또는 Excel 설정에서:
- `smtp_from_email`: `ajinnovationpart@gmail.com`

### 방법 2: Gmail "Send mail as" 기능 사용

Gmail에서 다른 주소로 보내기 설정:
1. Gmail 설정 → 계정 및 가져오기
2. "다른 주소로 메일 보내기" 추가
3. `youngjoon.kim@ajnetworks.co.kr` 추가 및 확인
4. SMTP 설정에서 이 주소 사용

### 방법 3: 회사 메일 서버 직접 사용 (가장 권장)

회사 메일 서버(`ajnetworks.co.kr`)의 SMTP를 직접 사용:
```env
SMTP_HOST=smtp.ajnetworks.co.kr  # 또는 실제 SMTP 서버 주소
SMTP_PORT=587
SMTP_USER=youngjoon.kim@ajnetworks.co.kr
SMTP_PASSWORD=실제_비밀번호
EMAIL_FROM=youngjoon.kim@ajnetworks.co.kr
```

## 현재 로그에서 확인할 수 있는 정보

서버를 재시작하고 새 면접을 생성하면 다음 로그가 표시됩니다:

```
⚠️ [DOMAIN MISMATCH] SMTP_USER domain (gmail.com) differs from From email domain (ajnetworks.co.kr)
   - SMTP_USER: ajinnovationpart@gmail.com
   - From Email: youngjoon.kim@ajnetworks.co.kr
   - This may cause SPF/DKIM validation failures and emails may be rejected by recipient servers
   - Solution: Use SMTP_USER domain for From email, or configure Gmail "Send mail as" feature
```

## 즉시 해결 방법

1. **Excel 설정에서 `smtp_from_email`을 Gmail 주소로 변경**:
   - `smtp_from_email`: `ajinnovationpart@gmail.com`

2. **또는 환경 변수 설정**:
   ```env
   EMAIL_FROM=ajinnovationpart@gmail.com
   ```

3. **서버 재시작 후 테스트**

## 장기 해결 방법

회사 메일 서버의 SMTP를 직접 사용하는 것이 가장 안정적입니다:
- SPF/DKIM 검증 통과
- 회사 도메인으로 일관된 발신
- 스팸 필터 통과율 향상
