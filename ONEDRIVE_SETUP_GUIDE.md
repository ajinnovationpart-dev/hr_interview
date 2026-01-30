# OneDrive 동기화 설정 가이드

## 🎯 목표

SharePoint Excel 파일을 OneDrive로 동기화하여 로컬 파일로 접근하는 방식으로 토큰 문제를 해결합니다.

---

## 📋 설정 단계

### 1단계: SharePoint 파일을 OneDrive로 동기화

1. **SharePoint 사이트 접속**
   - SharePoint 사이트에서 Excel 파일이 있는 폴더로 이동

2. **"동기화" 클릭**
   - 폴더 또는 파일에서 "동기화" 버튼 클릭
   - OneDrive 클라이언트가 자동으로 실행됨

3. **로컬 경로 확인**
   - 일반적인 경로:
     ```
     C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx
     ```
   - 또는:
     ```
     C:\Users\[사용자명]\OneDrive\[사이트명]\면접.xlsx
     ```

4. **동기화 확인**
   - OneDrive 클라이언트에서 동기화 상태 확인
   - 파일이 로컬에 다운로드되었는지 확인

---

### 2단계: 환경 변수 설정

`backend/.env` 파일을 열고 다음을 추가/수정:

```bash
# OneDrive 활성화
ONEDRIVE_ENABLED=true

# OneDrive 로컬 파일 경로 (위에서 확인한 경로)
ONEDRIVE_EXCEL_PATH=C:\Users\[사용자명]\OneDrive - [회사명]\[사이트명]\면접.xlsx

# SharePoint 비활성화 (선택사항)
SHAREPOINT_ENABLED=false
```

**중요**: 
- 경로에 공백이 있으면 그대로 입력 (따옴표 불필요)
- 경로는 절대 경로로 입력
- 파일명까지 포함해야 함

---

### 3단계: 서버 재시작

```bash
cd backend
npm run dev
```

로그에서 다음을 확인:
```
OneDrive Local service initialized
Using OneDrive Local (synchronized Excel) as data storage
```

---

## ✅ 완료!

이제 토큰 문제 없이 SharePoint Excel을 사용할 수 있습니다!

---

## 🔄 작동 원리

1. **웹 사용자 액션** → 백엔드 API 호출
2. **백엔드 서버** → 로컬 OneDrive 파일 읽기/쓰기
3. **OneDrive 클라이언트** → 자동으로 SharePoint에 동기화
4. **다른 사용자** → SharePoint에서 실시간 확인 가능

---

## ⚠️ 주의사항

### 1. 파일 잠금
- 동시 접근 시 파일 잠금 메커니즘이 작동합니다
- 잠금 파일 (`.lock`)이 생성됩니다

### 2. 동기화 지연
- OneDrive 동기화는 몇 초~몇 분 지연될 수 있습니다
- 일반적으로 10-30초 내 동기화 완료

### 3. 서버 컴퓨터
- 백엔드 서버가 실행되는 컴퓨터에 OneDrive 클라이언트가 설치되어 있어야 합니다
- Windows에 기본 포함되어 있습니다

### 4. 파일 경로
- 파일 경로가 정확해야 합니다
- 파일이 존재하지 않으면 새로 생성됩니다

---

## 🧪 테스트

### 1. 파일 읽기 테스트
```bash
# API 호출
GET http://localhost:3000/api/interviews
```

### 2. 파일 쓰기 테스트
```bash
# API 호출
POST http://localhost:3000/api/interviews
```

### 3. SharePoint 확인
- SharePoint에서 Excel 파일을 열어서 변경사항 확인
- 동기화가 완료되면 변경사항이 표시됩니다

---

## 🔧 문제 해결

### 문제 1: 파일을 찾을 수 없음

**해결:**
- `ONEDRIVE_EXCEL_PATH` 경로 확인
- 파일이 실제로 존재하는지 확인
- 경로에 공백이 있으면 그대로 입력

### 문제 2: 파일 잠금 오류

**해결:**
- `.lock` 파일이 남아있으면 삭제
- 서버를 재시작

### 문제 3: 동기화가 안 됨

**해결:**
- OneDrive 클라이언트 상태 확인
- 인터넷 연결 확인
- SharePoint 권한 확인

---

## 📝 체크리스트

- [ ] SharePoint 파일을 OneDrive로 동기화
- [ ] 로컬 파일 경로 확인
- [ ] `backend/.env` 파일에 `ONEDRIVE_ENABLED=true` 추가
- [ ] `backend/.env` 파일에 `ONEDRIVE_EXCEL_PATH` 설정
- [ ] 서버 재시작
- [ ] 로그에서 "OneDrive Local service initialized" 확인
- [ ] API 테스트

준비되면 설정을 시작하세요!
