# Google Cloud Console 없이 설정하기

Google Cloud Console을 사용하지 않고 **Google Apps Script**만으로 Google Sheets에 접근합니다.

## ✅ 필요한 것

1. Google 계정 (이미 있음: `ajinnovationpart@gmail.com`)
2. Google Sheets 스프레드시트 (이미 있음: ID `1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs`)
3. Google Apps Script (무료, Google 계정만 있으면 사용 가능)

## 📝 설정 방법 (5분)

### 1단계: Google Apps Script 코드 추가

1. Google Sheets 스프레드시트 열기
2. "확장 프로그램" → "Apps Script" 클릭
3. `google-apps-script/Code.gs` 파일의 내용을 모두 복사
4. Apps Script 편집기에 붙여넣기
5. **중요**: 3번째 줄의 `API_KEY`를 강력한 랜덤 문자열로 변경:
   ```javascript
   const API_KEY = 'your-secret-api-key-change-this';
   ```
   예: `const API_KEY = 'my-secret-key-12345';`
6. "저장" 클릭 (Ctrl+S 또는 Cmd+S)

### 2단계: 웹 앱으로 배포

1. Apps Script 편집기에서 "배포" → "새 배포" 클릭
2. "유형 선택" 옆의 톱니바퀴 아이콘 클릭 → "웹 앱" 선택
3. 설정:
   - 설명: "Interview Scheduling API"
   - 다음 사용자로 실행: "나"
   - 액세스 권한: "모든 사용자" (또는 "나")
4. "배포" 클릭
5. **웹 앱 URL 복사** (예: `https://script.google.com/macros/s/.../exec`)
6. "권한 확인" 클릭 → Google 계정 선택 → "고급" → "안전하지 않은 페이지로 이동" → "허용"

### 3단계: 환경 변수 설정

`backend/.env` 파일에 추가:

```bash
# Google Apps Script (Google Cloud Console 불필요!)
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/여기에-복사한-URL/exec
GOOGLE_APPS_SCRIPT_API_KEY=여기에-1단계에서-설정한-API-KEY-입력
```

### 4단계: 완료!

이제 Google Cloud Console 없이도 Google Sheets를 사용할 수 있습니다!

## 🔒 보안

- API_KEY는 강력한 랜덤 문자열로 설정하세요
- 웹 앱 URL과 API_KEY를 안전하게 보관하세요
- `.env` 파일은 Git에 커밋하지 마세요

## ✅ 장점

- ✅ Google Cloud Console 불필요
- ✅ 무료
- ✅ 설정 간단 (5분)
- ✅ Google 계정만 있으면 사용 가능

## 📚 참고

- Google Apps Script는 Google 계정만 있으면 무료로 사용 가능합니다
- 일일 실행 시간 제한이 있지만 일반적인 사용에는 충분합니다
- 필요시 Apps Script 코드를 수정하여 기능 추가 가능
