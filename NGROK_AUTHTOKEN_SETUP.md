# ngrok Authtoken 설정 가이드

## 오류 메시지

```
ERROR: authentication failed: Usage of ngrok requires a verified account and authtoken.
ERROR: ERR_NGROK_4018
```

이 오류는 ngrok authtoken이 설정되지 않았을 때 발생합니다.

## 해결 방법

### 1단계: ngrok 계정 생성 (이미 있으면 건너뛰기)

1. https://dashboard.ngrok.com/signup 접속
2. 이메일로 계정 생성
3. 이메일 인증 완료

### 2단계: Authtoken 확인

1. https://dashboard.ngrok.com/get-started/your-authtoken 접속
2. 로그인 후 Authtoken 복사
   - 예: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz_5AbC6DeF7GhI8JkL9MnO0PqR`

### 3단계: Authtoken 설정

#### 방법 1: 명령어로 설정 (권장)

```bash
ngrok config add-authtoken 38x4u9tBCiNkPolSf5HRaW6WoAG_2FL234EbsisVzKyiTKsW6
```

예시:
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz_5AbC6DeF7GhI8JkL9MnO0PqR
```

#### 방법 2: Config 파일에 직접 추가

ngrok config 파일 위치 확인:
- Windows: `%USERPROFILE%\.ngrok2\ngrok.yml` 또는 `%APPDATA%\ngrok\ngrok.yml`
- 또는 프로젝트의 `ngrok-config.yml`에 추가

`ngrok-config.yml` 파일 수정:
```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  tunnel-3030:
    addr: 3030
    proto: http
  tunnel-3000:
    addr: 3000
    proto: http
```

### 4단계: 설정 확인

```bash
ngrok config check
```

또는 간단한 터널로 테스트:
```bash
ngrok http 3000
```

## 프로젝트 Config 파일에 Authtoken 추가

프로젝트의 `ngrok-config.yml` 파일을 수정:

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE  # 여기에 authtoken 추가
tunnels:
  tunnel-3030:
    addr: 3030
    proto: http
  tunnel-3000:
    addr: 3000
    proto: http
```

그 후:
```bash
ngrok start --config ngrok-config.yml --all
```

## 주의사항

1. **Authtoken은 비밀로 유지**
   - Git에 커밋하지 않도록 주의
   - `.gitignore`에 추가 권장

2. **Authtoken은 계정별로 고유**
   - 다른 사람의 authtoken을 사용할 수 없음
   - 각자 자신의 authtoken을 설정해야 함

3. **Authtoken은 한 번만 설정**
   - 설정 후 재시작할 필요 없음
   - 계정당 하나의 authtoken 사용

## 빠른 설정

1. https://dashboard.ngrok.com/get-started/your-authtoken 에서 authtoken 복사
2. 다음 명령어 실행:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
3. 설정 확인:
   ```bash
   ngrok config check
   ```
4. 터널 시작:
   ```bash
   ngrok start --config ngrok-config.yml --all
   ```

## 문제 해결

### "authtoken is invalid"
- authtoken을 다시 복사했는지 확인
- 공백이나 특수 문자가 포함되지 않았는지 확인

### "authtoken not found"
- `ngrok config add-authtoken` 명령어로 설정했는지 확인
- Config 파일의 경로가 올바른지 확인

### Config 파일에서 authtoken이 작동하지 않음
- 전역 설정 사용: `ngrok config add-authtoken YOUR_TOKEN`
- 또는 config 파일의 경로 확인
