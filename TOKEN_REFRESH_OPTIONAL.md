# 토큰 갱신 - 선택사항 안내

## 🔍 현재 상황

Refresh Token이 없어서 자동 갱신이 실패했습니다.

## ✅ 해결 방법

### 옵션 1: Refresh Token 설정 (자동 갱신) ⭐ 권장

**한 번만 설정하면 자동으로 갱신됩니다!**

1. **스크립트 실행**:
   ```powershell
   .\get-sharepoint-token.ps1
   ```

2. **브라우저에서 인증**:
   - 표시된 URL 접속
   - 코드 입력
   - 로그인

3. **환경 변수에 저장**:
   - 스크립트가 자동으로 클립보드에 복사
   - `backend/.env` 파일에 붙여넣기:
     ```bash
     SHAREPOINT_ACCESS_TOKEN=받은-access-token
     SHAREPOINT_REFRESH_TOKEN=받은-refresh-token
     ```

4. **서버 재시작**

**이제 토큰이 자동으로 갱신됩니다!** 🎉

---

### 옵션 2: 수동 갱신 (간단하지만 수동 작업 필요)

Refresh Token 없이 사용할 수 있지만, 토큰이 만료되면(1시간) 수동으로 갱신해야 합니다.

1. **Microsoft Graph Explorer 접속**:
   - https://developer.microsoft.com/graph/graph-explorer

2. **로그인 및 토큰 복사**:
   - "Sign in with Microsoft" 클릭
   - 로그인
   - 우측 상단 "Access token" 클릭 → 복사

3. **환경 변수 업데이트**:
   ```bash
   SHAREPOINT_ACCESS_TOKEN=새-토큰
   ```

4. **서버 재시작**

**단점**: 토큰이 만료되면(1시간) 다시 위 과정을 반복해야 합니다.

---

## 📊 비교

| 방법 | 초기 설정 | 갱신 방식 | 사용자 작업 |
|------|----------|----------|------------|
| **Refresh Token** | 한 번 | 자동 | 없음 |
| **수동 갱신** | 간단 | 수동 (1시간마다) | 매번 직접 발급 |

---

## 🎯 권장 방법

**Refresh Token 설정을 강력히 권장합니다!**

이유:
- ✅ 한 번만 설정하면 끝
- ✅ 자동 갱신으로 사용자 개입 불필요
- ✅ 서비스 중단 없음

---

## ⚠️ 현재 상태

코드가 수정되어 Refresh Token이 없어도 작동하지만:
- 토큰이 만료되면(1시간) 오류 발생
- 수동으로 새 토큰 발급 필요

**권장**: 지금 바로 Refresh Token을 설정하세요!

```powershell
.\get-sharepoint-token.ps1
```

준비되면 알려주세요!
