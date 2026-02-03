# ngrok 무료 플랜 제한 안내

## 문제 상황

두 개의 터널을 동시에 실행하려고 했지만, 같은 Public URL을 사용하거나 제대로 작동하지 않습니다.

## 원인

**ngrok 무료 플랜은 동시에 하나의 터널만 지원합니다.**

- ✅ 하나의 터널: 가능
- ❌ 여러 터널 동시 실행: 불가능 (유료 플랜 필요)

## 해결 방법

### 방법 1: Backend 서버만 터널링 (권장)

가장 중요한 것은 Backend 서버(포트 3000)이므로 이것만 터널링합니다:

```bash
# 기존 ngrok 종료
.\stop-ngrok.ps1

# Backend 서버만 터널링
ngrok http 3000
```

### 방법 2: 필요시 포트 전환

3030 포트가 필요할 때만 전환:

```bash
# 3030 포트로 전환
ngrok http 3030

# 다시 3000 포트로 전환
ngrok http 3000
```

### 방법 3: 유료 플랜 사용

여러 터널을 동시에 사용하려면 ngrok 유료 플랜이 필요합니다:
- https://ngrok.com/pricing

## 현재 설정 권장사항

**Backend 서버(포트 3000)만 터널링하는 것을 권장합니다:**

1. GitHub Pages에서 Backend API에 접근해야 함
2. 3030 포트는 다른 용도로 사용 중일 수 있음
3. 하나의 터널로 충분함

## 빠른 시작

```bash
# 1. 기존 ngrok 종료
.\stop-ngrok.ps1

# 2. Backend 서버만 터널링
ngrok http 3000

# 3. 터널 URL 확인
# http://127.0.0.1:4040
```

## 터널 URL 확인

ngrok이 시작되면 터미널에 다음과 같이 표시됩니다:

```
Forwarding: https://xxxxx.ngrok-free.dev -> http://localhost:3000
```

이 URL을 GitHub Secrets의 `VITE_API_URL`에 설정하세요:
```
https://xxxxx.ngrok-free.dev/api
```

## 참고

- ngrok 무료 플랜: 1개 터널 동시 실행
- ngrok 유료 플랜: 여러 터널 동시 실행 가능
- 현재는 Backend 서버만 터널링하면 충분합니다
