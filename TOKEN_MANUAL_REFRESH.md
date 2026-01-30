# Access Token 수동 갱신 가이드

## 🔴 현재 상황

- Access Token이 만료되었습니다
- Refresh Token이 없어 자동 갱신 불가능
- Conditional Access 정책으로 Device Code Flow 차단

## ✅ 해결 방법: Graph Explorer에서 새 토큰 발급

### 1단계: Graph Explorer 접속

브라우저에서:
```
https://developer.microsoft.com/graph/graph-explorer
```

### 2단계: 로그인 (이미 로그인되어 있으면 생략)

1. "Sign in with Microsoft" 클릭
2. 회사 계정으로 로그인

### 3단계: 새 토큰 발급

1. 우측 상단 **"Access token"** 클릭
2. 토큰 복사 (긴 문자열, `eyJ0eXAi...`로 시작)

### 4단계: 환경 변수 업데이트

`backend/.env` 파일을 열고:

```bash
SHAREPOINT_ACCESS_TOKEN=여기에-새-토큰-붙여넣기
```

**기존 토큰을 완전히 교체**하세요.

### 5단계: 서버 재시작

터미널에서:
1. `Ctrl+C`로 서버 중지
2. `npm run dev`로 재시작

---

## ⚠️ 주의사항

### 토큰 만료 주기

- **Access Token**: 1시간 후 만료
- **만료되면 위 단계를 반복**해야 합니다

### 자동 갱신 불가능

Conditional Access 정책 때문에:
- Device Code Flow 차단 → Refresh Token 발급 불가
- Graph Explorer는 Refresh Token 제공 안 함
- **수동 갱신만 가능**

---

## 💡 향후 개선 방안

### 옵션 1: 정기 알림 설정

1시간마다 토큰 갱신 알림을 받도록 설정 (향후 구현 가능)

### 옵션 2: IT 관리자 협의

Conditional Access 정책 예외 요청:
- 특정 앱 등록
- Device Code Flow 허용
- Refresh Token 발급 가능

### 옵션 3: 백엔드 토큰 갱신 엔드포인트

Graph Explorer 토큰을 주기적으로 갱신하는 엔드포인트 추가 (향후 구현 가능)

---

## 🚀 빠른 실행

1. https://developer.microsoft.com/graph/graph-explorer 접속
2. "Access token" 클릭 → 복사
3. `backend/.env`의 `SHAREPOINT_ACCESS_TOKEN` 업데이트
4. 서버 재시작

**완료!**

---

## 📋 체크리스트

- [ ] Graph Explorer 접속
- [ ] "Access token" 클릭 → 복사
- [ ] `backend/.env` 업데이트
- [ ] 서버 재시작

준비되면 Graph Explorer에서 새 토큰을 발급받으세요!
