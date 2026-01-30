# ngrok 여러 포트 동시 포워딩 가이드

## 문제 상황

- 기존 ngrok이 **3030 포트**를 포워딩 중
- Backend 서버는 **3000 포트**에서 실행
- 기존 터널을 끊지 않고 **3000 포트 터널 추가** 필요

## 해결 방법

ngrok은 **여러 터널을 동시에 실행**할 수 있습니다. 두 가지 방법이 있습니다:

### 방법 1: ngrok Config 파일 사용 (권장)

#### 1단계: ngrok config 파일 생성

프로젝트 루트에 `ngrok-config.yml` 파일 생성:

```yaml
version: "2"
tunnels:
  # 기존 3030 포트 터널
  tunnel-3030:
    addr: 3030
    proto: http
    
  # 새로운 3000 포트 터널
  tunnel-3000:
    addr: 3000
    proto: http
```

#### 2단계: ngrok을 config 파일로 시작

```bash
ngrok start --config ngrok-config.yml --all
```

또는 특정 터널만 시작:

```bash
# 3000 포트만 추가
ngrok start --config ngrok-config.yml tunnel-3000

# 또는 두 터널 모두 시작
ngrok start --config ngrok-config.yml tunnel-3030 tunnel-3000
```

#### 3단계: 터널 URL 확인

ngrok 웹 인터페이스에서 확인:
```
http://127.0.0.1:4040
```

또는 API로 확인:
```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels"
$tunnels = $response.Content | ConvertFrom-Json
$tunnels.tunnels | ForEach-Object {
    Write-Host "Public: $($_.public_url) -> Local: $($_.config.addr)"
}
```

### 방법 2: 별도 ngrok 프로세스 실행 (간단)

#### 1단계: 기존 ngrok은 그대로 두기

기존 ngrok 프로세스는 **종료하지 않습니다**.

#### 2단계: 새 터미널에서 다른 포트로 ngrok 시작

**새 PowerShell 터미널**을 열고:

```bash
# 다른 포트(예: 4041)로 ngrok 웹 인터페이스 실행
ngrok http 3000 --web-addr=127.0.0.1:4041
```

또는 기본 포트(4040)를 사용하려면:

```bash
# 기존 ngrok과 충돌하지 않도록 다른 경로에서 실행
ngrok http 3000
```

**주의**: 두 ngrok이 같은 웹 인터페이스 포트(4040)를 사용하려고 하면 충돌합니다.

#### 3단계: 터널 URL 확인

각 ngrok의 웹 인터페이스에서 확인:
- 기존 터널: `http://127.0.0.1:4040`
- 새 터널: `http://127.0.0.1:4041` (또는 다른 포트)

## 추천 방법: Config 파일 사용

### 장점
- ✅ 하나의 ngrok 프로세스로 관리
- ✅ 하나의 웹 인터페이스에서 모든 터널 확인
- ✅ 설정 파일로 관리 가능
- ✅ 재시작 시 자동으로 모든 터널 시작

### 단점
- ⚠️ 기존 ngrok 프로세스를 재시작해야 함 (하지만 config로 모든 터널을 다시 시작)

## 실제 사용 예시

### 시나리오: 기존 3030 포트 터널 유지 + 3000 포트 터널 추가

#### 1. ngrok config 파일 생성

`ngrok-config.yml`:
```yaml
version: "2"
tunnels:
  existing-3030:
    addr: 3030
    proto: http
    
  backend-3000:
    addr: 3000
    proto: http
```

#### 2. 기존 ngrok 종료 (선택사항)

기존 ngrok을 종료하고 config로 재시작:

```powershell
# 기존 ngrok 종료
.\stop-ngrok.ps1

# config로 모든 터널 시작
ngrok start --config ngrok-config.yml --all
```

#### 3. 터널 확인

```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels"
$tunnels = $response.Content | ConvertFrom-Json
$tunnels.tunnels | Format-Table public_url, @{Name='local';Expression={$_.config.addr}}
```

출력 예시:
```
public_url                                          local
----------                                          -----
https://xxxxx-1.ngrok-free.dev                     http://localhost:3030
https://xxxxx-2.ngrok-free.dev                     http://localhost:3000
```

## 문제 해결

### 문제: "address already in use" (포트 4040)

**원인**: 두 ngrok이 같은 웹 인터페이스 포트를 사용

**해결**: Config 파일 방법 사용 (하나의 ngrok 프로세스)

### 문제: 기존 터널이 끊김

**원인**: ngrok을 재시작하면 기존 터널이 종료됨

**해결**: Config 파일로 모든 터널을 한 번에 시작

## 빠른 시작

1. **ngrok config 파일 생성**:
   ```yaml
   version: "2"
   tunnels:
     tunnel-3030:
       addr: 3030
       proto: http
     tunnel-3000:
       addr: 3000
       proto: http
   ```

2. **기존 ngrok 종료** (선택사항):
   ```powershell
   .\stop-ngrok.ps1
   ```

3. **Config로 모든 터널 시작**:
   ```bash
   ngrok start --config ngrok-config.yml --all
   ```

4. **터널 URL 확인**:
   ```
   http://127.0.0.1:4040
   ```

## 참고

- ngrok 무료 플랜: 여러 터널 동시 실행 가능
- 각 터널은 고유한 URL을 받음
- Config 파일 방법이 가장 깔끔하고 관리하기 쉬움
