# 환경 변수 업데이트 가이드

Google Apps Script의 API_KEY를 변경하셨으니, `backend/.env` 파일도 동일하게 업데이트해야 합니다.

## 업데이트할 내용

`backend/.env` 파일을 열어서 다음 줄을 찾으세요:

```bash
GOOGLE_APPS_SCRIPT_API_KEY=your-secret-api-key-change-this
```

다음과 같이 변경하세요:

```bash
GOOGLE_APPS_SCRIPT_API_KEY=aj-innovation-2025-secret-key-xyz123
```

## 전체 .env 파일 내용

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# JWT Secret (강력한 랜덤 문자열로 변경하세요)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Microsoft Graph API (OAuth & Email)
# 이메일 발송 기능을 사용하려면 설정 필요
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-microsoft-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/callback
HR_EMAIL=hr@ajnetworks.co.kr

# Google Sheets API (Google Apps Script 방식)
GOOGLE_SPREADSHEET_ID=1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyZOHLb9m4C9TsrVqJtmbtX61b4OjLxKBKdef-FJcq54YWkQL9G62mx5aljceCIvxX9/exec
GOOGLE_APPS_SCRIPT_API_KEY=aj-innovation-2025-secret-key-xyz123

# Logging
LOG_LEVEL=info
```

## 중요: Apps Script 재배포 필요

API_KEY를 변경한 후에는 **반드시 Apps Script를 재배포**해야 합니다:

1. Google Apps Script 편집기에서 "저장" 클릭
2. "배포" → "배포 관리" 클릭
3. 최신 배포 옆의 "수정" (연필 아이콘) 클릭
4. "새 버전으로 배포" 클릭
5. "배포" 클릭

## 테스트

변경 후 다음 URL로 테스트하세요:

```
https://script.google.com/macros/s/AKfycbyZOHLb9m4C9TsrVqJtmbtX61b4OjLxKBKdef-FJcq54YWkQL9G62mx5aljceCIvxX9/exec?apiKey=aj-innovation-2025-secret-key-xyz123&action=getInterviews
```

성공하면 다음과 같은 JSON 응답이 반환됩니다:
```json
{
  "success": true,
  "data": [...]
}
```

## 다음 단계

1. ✅ Google Apps Script API_KEY 변경 완료
2. ⏳ `backend/.env` 파일의 `GOOGLE_APPS_SCRIPT_API_KEY` 업데이트
3. ⏳ Apps Script 재배포
4. ⏳ 테스트

모든 단계를 완료하면 시스템이 정상 작동합니다!
