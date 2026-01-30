# 이메일 발송 흐름 확인

## 현재 구현 방식

### 1. 면접 생성 시 이메일 발송 흐름

```typescript
// interview.routes.ts - 각 면접관마다 반복
for (const interviewerId of allInterviewerIds) {
  // ... 면접관 정보 조회 ...
  
  // 각 면접관마다 개별적으로 sendEmail() 호출
  await emailService.sendEmail({
    to: [emailToSend],  // 단일 수신자 배열
    subject: `[면접 일정 조율] ...`,
    htmlBody: emailContent,
  });
}
```

### 2. SMTP API 호출 흐름

```typescript
// email.service.ts - sendEmail() 메서드 내부
async sendEmail(options: EmailOptions): Promise<void> {
  // ... 이메일 준비 ...
  
  // 각 호출마다 개별적으로 SMTP API 호출
  const info = await this.transporter.sendMail(mailOptions);
  // mailOptions.to에는 단일 수신자만 포함됨
}
```

## 확인 사항

### ✅ 현재 구현이 올바른지 확인

1. **각 면접관마다 개별 호출**: ✅
   - `for` 루프에서 각 면접관마다 `await emailService.sendEmail()` 호출
   - 각 호출은 순차적으로 실행됨 (await 사용)

2. **SMTP API 개별 호출**: ✅
   - 각 `sendEmail()` 호출마다 `this.transporter.sendMail()` 실행
   - 각 호출은 독립적인 SMTP 트랜잭션

3. **수신자 배열**: ✅
   - `to: [emailToSend]` - 단일 수신자 배열
   - 각 호출마다 1명의 수신자만 포함

## 로깅 추가

각 SMTP API 호출을 명확하게 추적하기 위해 다음 로깅을 추가했습니다:

1. **면접관별 호출 시작**: `🚀 [INDIVIDUAL SMTP CALL]`
2. **SMTP API 호출 전**: `📤 [SMTP API CALL]`
3. **SMTP API 응답 후**: `📥 [SMTP API RESPONSE]`
4. **면접관별 호출 완료**: `✅ [INDIVIDUAL SMTP CALL COMPLETE]`

## 예상 로그 출력

```
🚀 [INDIVIDUAL SMTP CALL] Starting separate SMTP API call for 김희수 (kimhs@ajnet.co.kr)
   - Call timestamp: 2026-01-30T12:00:00.000Z
   - This is call #1 of 4 total calls
📤 [SMTP API CALL] Calling transporter.sendMail() at 2026-01-30T12:00:00.100Z
   - This is a SEPARATE SMTP API call for 1 recipient(s)
📥 [SMTP API RESPONSE] Received response at 2026-01-30T12:00:01.200Z
✅ [INDIVIDUAL SMTP CALL COMPLETE] Finished SMTP API call for 김희수 (kimhs@ajnet.co.kr)
```

## 문제 해결

만약 이메일이 전달되지 않는다면:

1. **로그 확인**: 각 면접관마다 개별 호출이 이루어지는지 확인
2. **SMTP 응답 확인**: `info.accepted`, `info.rejected` 확인
3. **수신자 메일 서버 정책**: SMTP 서버에서 수락했지만 수신자 메일 서버에서 차단할 수 있음
