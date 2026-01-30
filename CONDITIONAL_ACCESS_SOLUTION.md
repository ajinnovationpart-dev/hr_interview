# Conditional Access 정책 차단 해결 방법

## 🔴 문제

**AADSTS53003**: 회사의 Conditional Access 정책이 Device Code Flow를 차단하고 있습니다.

이것은 회사 보안 정책으로 인해 발생하는 문제입니다.

---

## ✅ 해결 방법: Microsoft Graph Explorer 사용

Device Code Flow가 차단되므로, **Microsoft Graph Explorer**를 사용하세요.

### 1단계: Graph Explorer 접속

브라우저에서:
```
https://developer.microsoft.com/graph/graph-explorer
```

### 2단계: 로그인

1. "Sign in with Microsoft" 클릭
2. 회사 계정으로 로그인
3. 로그인 완료

### 3단계: 토큰 복사

1. 우측 상단 **"Access token"** 클릭
2. 토큰 복사 (긴 문자열)

### 4단계: 환경 변수 설정

`backend/.env` 파일에 추가:

```bash
SHAREPOINT_ACCESS_TOKEN=복사한-토큰
```

### 5단계: 서버 재시작

```bash
cd backend
npm run dev
```

---

## ⚠️ 주의사항

### Graph Explorer의 한계

- **Refresh Token이 제공되지 않음**
- **Access Token은 1시간 후 만료**
- **만료되면 수동으로 새 토큰 발급 필요**

### 자동 갱신 대안

1. **정기적으로 새 토큰 발급** (1시간마다)
2. **백엔드에 토큰 갱신 엔드포인트 추가** (향후 구현 가능)
3. **IT 관리자에게 CA 정책 예외 요청** (비현실적)

---

## 💡 권장 사항

### 단기 해결책

**Microsoft Graph Explorer 사용**:
- 간단하고 빠름
- CA 정책 우회 가능
- 1시간마다 수동 갱신 필요

### 장기 해결책

1. **IT 관리자와 협의**: Device Code Flow 허용 요청
2. **서비스 계정 사용**: CA 정책 예외 가능한 계정 사용
3. **백엔드 토큰 갱신 엔드포인트**: Graph Explorer 토큰을 주기적으로 갱신

---

## 🚀 빠른 시작

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. 로그인
3. "Access token" 클릭 → 복사
4. `backend/.env`에 `SHAREPOINT_ACCESS_TOKEN=...` 추가
5. 서버 재시작

**완료!**

---

## 📋 체크리스트

- [ ] Graph Explorer 접속
- [ ] 로그인 완료
- [ ] Access token 복사
- [ ] `backend/.env` 업데이트
- [ ] 서버 재시작

준비되면 Graph Explorer에서 토큰을 발급받으세요!
