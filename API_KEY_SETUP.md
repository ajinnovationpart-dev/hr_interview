# API 키 설정 가이드

현재 "Invalid API key" 오류가 발생하고 있습니다. 다음 단계를 따라 수정하세요.

## 문제 해결 방법

### 방법 1: Google Apps Script의 API_KEY 확인 및 .env 업데이트 (권장)

1. Google Sheets 스프레드시트 열기
2. "확장 프로그램" → "Apps Script" 클릭
3. `Code.gs` 파일에서 7번째 줄의 `API_KEY` 값 확인:
   ```javascript
   const API_KEY = '실제-설정된-값';
   ```
4. `backend/.env` 파일의 `GOOGLE_APPS_SCRIPT_API_KEY`를 위 값과 동일하게 변경

### 방법 2: .env의 API_KEY를 Google Apps Script에 반영

1. `backend/.env` 파일에서 `GOOGLE_APPS_SCRIPT_API_KEY` 값을 확인
2. Google Apps Script의 `Code.gs` 파일 7번째 줄 수정:
   ```javascript
   const API_KEY = 'backend/.env에-설정한-값';
   ```
3. Apps Script에서 "저장" 클릭
4. "배포" → "배포 관리" → 최신 배포 옆의 "수정" 클릭 → "새 버전으로 배포"

## 현재 설정 확인

- **Google Apps Script URL**: https://script.google.com/macros/s/AKfycbyZOHLb9m4C9TsrVqJtmbtX61b4OjLxKBKdef-FJcq54YWkQL9G62mx5aljceCIvxX9/exec
- **스프레드시트 ID**: 1TP1K3x52chgtQvn5rTu4Gw2THATgd3dWWDro_7tegSs

## 보안 권장사항

API_KEY는 강력한 랜덤 문자열로 설정하세요:

```javascript
// 예시 (실제로는 더 복잡하게)
const API_KEY = 'aj-innovation-2025-secret-key-xyz123';
```

또는 온라인 랜덤 문자열 생성기 사용:
- https://www.random.org/strings/
- 길이: 32자 이상 권장

## 테스트

설정 후 다음 URL로 테스트:

```
https://script.google.com/macros/s/AKfycbyZOHLb9m4C9TsrVqJtmbtX61b4OjLxKBKdef-FJcq54YWkQL9G62mx5aljceCIvxX9/exec?apiKey=설정한-API-KEY&action=getInterviews
```

성공하면 JSON 응답이 반환됩니다.
