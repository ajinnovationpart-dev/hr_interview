# 토큰 자동 갱신 설명

## ❓ 질문: 직접 갱신해야 하나요?

**답변: 아니요! 한 번만 설정하면 자동으로 갱신됩니다.**

---

## 🔄 자동 갱신 작동 방식

### 1. 초기 설정 (한 번만)

Device Code Flow로 **Access Token**과 **Refresh Token**을 모두 받습니다:

```bash
SHAREPOINT_ACCESS_TOKEN=access-token-here
SHAREPOINT_REFRESH_TOKEN=refresh-token-here  # 이게 핵심!
```

### 2. 자동 갱신 프로세스

서버가 자동으로 처리합니다:

1. **토큰 만료 시간 감지**
   - JWT 토큰에서 만료 시간 파싱
   - 만료 5분 전에 자동 갱신 시작

2. **자동 갱신**
   - Refresh Token으로 새 Access Token 요청
   - 새 토큰으로 자동 교체
   - 사용자 개입 불필요

3. **오류 처리**
   - 401 오류 발생 시 자동 갱신 후 재시도
   - 사용자는 아무것도 할 필요 없음

---

## 📊 비교

| 방법 | 초기 설정 | 갱신 방식 | 사용자 작업 |
|------|----------|----------|------------|
| **Graph Explorer** | 간단 | 수동 (1시간마다) | 매번 직접 발급 |
| **Device Code Flow** | 한 번 | 자동 | 없음 |

---

## 🎯 권장 방법

### 자동 갱신 설정 (권장)

1. **스크립트 실행**:
   ```powershell
   .\get-sharepoint-token.ps1
   ```

2. **인증** (브라우저에서):
   - URL 접속
   - 코드 입력
   - 로그인

3. **환경 변수 저장**:
   - 스크립트가 자동으로 클립보드에 복사
   - `backend/.env` 파일에 붙여넣기

4. **완료!**
   - 이제 토큰이 자동으로 갱신됩니다
   - 사용자는 아무것도 할 필요 없습니다

---

## 🔍 자동 갱신 확인

서버 로그에서 확인할 수 있습니다:

```
[INFO] Refreshing SharePoint access token...
[INFO] SharePoint access token refreshed successfully
```

이 메시지가 보이면 자동 갱신이 작동하고 있는 것입니다!

---

## ⚠️ 주의사항

### Refresh Token도 만료될 수 있음

- Refresh Token은 보통 **90일** 후 만료
- 만료되면 다시 Device Code Flow로 새로 발급 필요
- 하지만 90일마다 한 번만 설정하면 됩니다

### 토큰 보안

- Refresh Token은 매우 민감한 정보
- `.env` 파일을 Git에 커밋하지 마세요
- 프로덕션에서는 환경 변수나 보안 저장소 사용

---

## 📝 요약

**질문**: 직접 갱신해야 하나요?

**답변**: 
- ❌ **아니요!** Refresh Token을 설정하면 자동으로 갱신됩니다
- ✅ **한 번만 설정**: Device Code Flow로 Access Token + Refresh Token 발급
- ✅ **자동 갱신**: 서버가 만료 전에 자동으로 갱신
- ✅ **사용자 작업 없음**: 설정 후에는 아무것도 할 필요 없습니다

**예외**: Refresh Token이 만료되면(90일) 다시 한 번만 설정하면 됩니다.

---

## 🚀 지금 바로 시작

```powershell
# 1. 스크립트 실행
.\get-sharepoint-token.ps1

# 2. 브라우저에서 인증

# 3. 환경 변수 붙여넣기 (자동 복사됨)

# 4. 서버 재시작
cd backend
npm run dev
```

**끝! 이제 자동으로 갱신됩니다.** 🎉
