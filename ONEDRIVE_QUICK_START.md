# OneDrive 설정 빠른 시작

## ⚠️ 현재 상태

로그를 보면 아직 SharePoint REST API를 사용하고 있습니다:
```
info: SharePoint REST API service initialized
info: Using SharePoint REST API as data storage
```

OneDrive를 사용하려면 환경 변수를 설정해야 합니다.

---

## ✅ 빠른 설정 (3단계)

### 1단계: SharePoint 파일 동기화

1. SharePoint 사이트 접속
2. "동기화" 버튼 클릭
3. 로컬 경로 확인:
   ```
   C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx
   ```

### 2단계: 환경 변수 설정

`backend/.env` 파일을 열고:

```bash
# OneDrive 활성화
ONEDRIVE_ENABLED=true

# OneDrive 로컬 파일 경로 (위에서 확인한 경로)
ONEDRIVE_EXCEL_PATH=C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx

# SharePoint 비활성화 (선택사항)
SHAREPOINT_ENABLED=false
```

### 3단계: 서버 재시작

```bash
cd backend
npm run dev
```

**로그에서 확인:**
```
OneDrive Local service initialized
Using OneDrive Local (synchronized Excel) as data storage
```

---

## ✅ 완료!

이제 토큰 문제 없이 작동합니다!
