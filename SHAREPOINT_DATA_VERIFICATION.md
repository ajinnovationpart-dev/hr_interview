# SharePoint 데이터 확인 방법

## 🎯 연결 확인

서버 로그에서 다음을 확인하세요:
```
SharePoint REST API service initialized
Using SharePoint REST API as data storage
Server is running on port 3000
```

## 📋 데이터 확인 방법

### 방법 1: API 엔드포인트로 확인 (권장)

#### 1. 헬스체크
```bash
GET http://localhost:3000/health
```

응답:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T15:10:00.000Z"
}
```

#### 2. 설정 조회 (가장 간단)

**먼저 관리자로 로그인하여 토큰 받기:**
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "ajinnovationpart@gmail.com",
  "password": "admin123"
}
```

응답에서 `accessToken` 복사

**설정 조회:**
```bash
GET http://localhost:3000/api/config
Authorization: Bearer [accessToken]
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "interview_duration_minutes": "30",
    "work_start_time": "09:00",
    "work_end_time": "18:00",
    ...
  }
}
```

#### 3. 면접 목록 조회
```bash
GET http://localhost:3000/api/interviews
Authorization: Bearer [accessToken]
```

응답 예시:
```json
{
  "success": true,
  "data": [
    {
      "interview_id": "INT_1738051200000",
      "main_notice": "2025년 2월 수시 채용",
      "team_name": "정보전략팀",
      "status": "PENDING",
      ...
    }
  ]
}
```

#### 4. 면접 상세 조회
```bash
GET http://localhost:3000/api/interviews/[interview-id]
Authorization: Bearer [accessToken]
```

#### 5. 면접관 목록 조회
```bash
GET http://localhost:3000/api/interviewers
Authorization: Bearer [accessToken]
```

---

### 방법 2: 브라우저에서 확인

#### Postman 또는 브라우저 확장 프로그램 사용

1. **Postman 설치** (선택사항)
   - https://www.postman.com/downloads/

2. **또는 브라우저 확장 프로그램**
   - REST Client (VS Code 확장)
   - 또는 브라우저 개발자 도구 사용

#### 간단한 테스트 (브라우저)

1. **로그인**:
   ```
   http://localhost:5173/login
   ```
   - 이메일: `ajinnovationpart@gmail.com`
   - 비밀번호: `admin123`

2. **대시보드에서 확인**:
   ```
   http://localhost:5173/admin/dashboard
   ```
   - 면접 목록이 표시되어야 합니다

---

### 방법 3: PowerShell로 확인

```powershell
# 1. 로그인하여 토큰 받기
$loginBody = @{
    email = "ajinnovationpart@gmail.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.accessToken

Write-Host "Access Token: $token"
Write-Host ""

# 2. 설정 조회
$headers = @{
    "Authorization" = "Bearer $token"
}

$configResponse = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/config" -Headers $headers
Write-Host "설정:"
$configResponse.data | ConvertTo-Json

Write-Host ""

# 3. 면접 목록 조회
$interviewsResponse = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/interviews" -Headers $headers
Write-Host "면접 목록:"
$interviewsResponse.data | ConvertTo-Json

Write-Host ""

# 4. 면접관 목록 조회
$interviewersResponse = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/interviewers" -Headers $headers
Write-Host "면접관 목록:"
$interviewersResponse.data | ConvertTo-Json
```

---

### 방법 4: curl로 확인

```bash
# 1. 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ajinnovationpart@gmail.com","password":"admin123"}'

# 응답에서 accessToken 복사

# 2. 설정 조회
curl -X GET http://localhost:3000/api/config \
  -H "Authorization: Bearer [accessToken]"

# 3. 면접 목록 조회
curl -X GET http://localhost:3000/api/interviews \
  -H "Authorization: Bearer [accessToken]"

# 4. 면접관 목록 조회
curl -X GET http://localhost:3000/api/interviewers \
  -H "Authorization: Bearer [accessToken]"
```

---

## 🔍 데이터 확인 체크리스트

### ✅ 기본 확인

- [ ] 헬스체크 성공 (`/health`)
- [ ] 로그인 성공 (`/api/auth/login`)
- [ ] 설정 조회 성공 (`/api/config`)
- [ ] 면접 목록 조회 성공 (`/api/interviews`)

### ✅ 데이터 확인

- [ ] Excel 파일의 `config` 시트 데이터가 표시되는가?
- [ ] Excel 파일의 `interviews` 시트 데이터가 표시되는가?
- [ ] Excel 파일의 `interviewers` 시트 데이터가 표시되는가?

---

## ⚠️ 오류 발생 시

### 오류: "401 Unauthorized"
- 토큰이 만료되었거나 잘못됨
- 다시 로그인하여 새 토큰 받기

### 오류: "Failed to load Excel file"
- SharePoint 토큰이 만료되었거나 잘못됨
- Microsoft Graph Explorer에서 새 토큰 발급
- `.env` 파일의 `SHAREPOINT_ACCESS_TOKEN` 업데이트

### 오류: "Worksheet not found"
- Excel 파일에 해당 시트가 없음
- Excel 파일에 다음 시트가 있는지 확인:
  - `config`
  - `interviews`
  - `candidates`
  - `interview_candidates`
  - `candidate_interviewers`
  - `interviewers`
  - `interview_interviewers`
  - `time_selections`
  - `confirmed_schedules`

---

## 📊 Excel 파일 구조 확인

SharePoint에서 Excel 파일을 열어 다음을 확인하세요:

1. **시트 존재 확인**
   - 9개 시트가 모두 있는지 확인
   - 시트 이름이 정확한지 확인 (대소문자 구분)

2. **헤더 확인**
   - 각 시트의 첫 번째 행에 헤더가 있는지 확인

3. **데이터 확인**
   - `config` 시트에 기본 설정이 있는지 확인
   - `interviews` 시트에 테스트 데이터가 있는지 확인

---

## 🧪 빠른 테스트

가장 간단한 방법:

1. **브라우저에서 접속**:
   ```
   http://localhost:5173/login
   ```

2. **로그인**:
   - 이메일: `ajinnovationpart@gmail.com`
   - 비밀번호: `admin123`

3. **대시보드 확인**:
   - 면접 목록이 표시되면 성공!

---

## 📝 다음 단계

데이터가 정상적으로 조회되면:

1. ✅ 면접 생성 테스트
2. ✅ 면접관 일정 선택 테스트
3. ✅ 공통 일정 확정 테스트
4. ✅ 이메일 발송 테스트

준비되면 알려주세요!
