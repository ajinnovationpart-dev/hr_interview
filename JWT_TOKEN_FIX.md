# JWT 토큰 오류 해결 가이드

## 🔴 오류
```
{
    "success": false,
    "message": "유효하지 않은 토큰입니다"
}
```

## 🔍 원인 분석

### 가능한 원인들:
1. **JWT_SECRET이 환경 변수에 없음**
2. **토큰이 만료됨** (기본 7일)
3. **토큰 서명이 맞지 않음** (JWT_SECRET 불일치)
4. **토큰 형식이 잘못됨**

## ✅ 해결 방법

### 1. JWT_SECRET 확인

`backend/.env` 파일에서 확인:
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**문제가 있으면:**
- JWT_SECRET이 없거나 기본값인 경우 → 강력한 랜덤 문자열로 변경
- JWT_SECRET이 변경된 경우 → 기존 토큰은 무효화됨

### 2. 토큰 만료 확인

JWT 토큰 만료 시간:
- **면접관 토큰**: 기본 **90일** (면접 확정까지 시간이 걸릴 수 있음)
- **관리자 토큰**: 기본 **7일** (보안상 짧게 유지)

**해결:**
- 새 토큰 발급 필요
- 면접 생성 시 새 링크 생성
- 환경 변수로 만료 시간 변경 가능 (자세한 내용은 `TOKEN_EXPIRATION_GUIDE.md` 참조)

### 3. 더 자세한 오류 메시지 확인

이제 더 자세한 오류 메시지가 표시됩니다:
- `토큰 검증 실패: [상세 메시지]`
- `토큰이 만료되었습니다`
- `서버 설정 오류: JWT_SECRET이 설정되지 않았습니다`

### 4. 로그 확인

Backend 서버 로그에서 확인:
```bash
cd backend
npm run dev
```

로그에서 다음을 확인:
- `JWT_SECRET is not set` → 환경 변수 문제
- `JWT verification error` → 토큰 검증 실패
- `JWT token expired` → 토큰 만료

## 🔧 환경 변수 확인

### JWT_SECRET 생성

강력한 랜덤 문자열 생성:
```bash
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

또는 온라인 도구 사용:
- https://randomkeygen.com/

### .env 파일 업데이트

```bash
JWT_SECRET=생성한-강력한-랜덤-문자열-64자-이상
```

## 🧪 테스트

### 1. 로그인 테스트
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "ajinnovationpart@gmail.com",
  "password": "admin123"
}
```

응답에서 `accessToken` 확인

### 2. 토큰 검증 테스트
```
GET http://localhost:3000/api/auth/me
Authorization: Bearer [accessToken]
```

### 3. 면접관 링크 테스트
면접 생성 후 받은 링크로 접속:
```
GET http://localhost:5173/confirm/[token]
```

## ⚠️ 주의사항

### 토큰 만료
- 면접관 링크는 **7일 후 만료**
- 만료된 링크는 새로 발급 필요

### JWT_SECRET 변경
- JWT_SECRET을 변경하면 **모든 기존 토큰이 무효화**됨
- 프로덕션에서는 변경 시 주의

### 환경 변수 로드
- 서버 재시작 시 환경 변수 다시 로드
- `.env` 파일 변경 후 서버 재시작 필요

## 📝 다음 단계

1. ✅ JWT_SECRET 확인 및 설정
2. ✅ 서버 재시작
3. ✅ 새 토큰 발급 (로그인 또는 면접 생성)
4. ✅ 테스트

문제가 계속되면 Backend 로그를 확인하세요!
