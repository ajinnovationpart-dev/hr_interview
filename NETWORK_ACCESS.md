# 네트워크 접속 설정 가이드

다른 기기에서 접속하려면 다음 설정이 필요합니다.

## 변경 사항

1. **Backend 서버**: `0.0.0.0`으로 바인딩하여 모든 네트워크 인터페이스에서 접속 가능
2. **Frontend 서버**: `0.0.0.0`으로 바인딩하여 모든 네트워크 인터페이스에서 접속 가능

## 접속 방법

### 1. 본인 IP 주소 확인

Windows:
```bash
ipconfig
```

IPv4 주소를 확인하세요 (예: `192.168.0.100`)

### 2. 서버 재시작

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 3. 다른 기기에서 접속

같은 네트워크(Wi-Fi)에 연결된 다른 기기에서:

```
http://[본인IP주소]:5173
```

예: `http://192.168.0.100:5173`

## 방화벽 설정

Windows 방화벽에서 포트를 허용해야 할 수 있습니다.

### Windows 방화벽 포트 열기

1. Windows 설정 → 보안 → Windows Defender 방화벽
2. "고급 설정" 클릭
3. "인바운드 규칙" → "새 규칙"
4. "포트" 선택
5. TCP, 특정 로컬 포트: `3000, 5173`
6. "연결 허용" 선택
7. 모든 프로필 선택
8. 이름: "Interview System"

또는 PowerShell로:
```powershell
New-NetFirewallRule -DisplayName "Interview System" -Direction Inbound -LocalPort 3000,5173 -Protocol TCP -Action Allow
```

## 문제 해결

### 접속이 안 될 때

1. **같은 네트워크인지 확인**
   - 같은 Wi-Fi에 연결되어 있는지 확인
   - 유선/무선 혼용 시 네트워크가 다를 수 있음

2. **방화벽 확인**
   - Windows 방화벽에서 포트가 열려있는지 확인
   - 바이러스 백신 소프트웨어의 방화벽도 확인

3. **IP 주소 확인**
   ```bash
   ipconfig
   ```
   - IPv4 주소가 올바른지 확인

4. **서버 로그 확인**
   - 서버가 `0.0.0.0`에서 리스닝하고 있는지 확인
   - 에러 메시지 확인

### 프록시 설정

Frontend의 Vite 프록시는 localhost로만 설정되어 있습니다. 다른 기기에서 접속할 때는 API URL을 직접 지정해야 할 수 있습니다.

**해결 방법:**

`frontend/.env` 파일에 본인 IP 주소 추가:
```bash
VITE_API_URL=http://[본인IP주소]:3000/api
```

예: `VITE_API_URL=http://192.168.0.100:3000/api`

그리고 Frontend를 재시작하세요.

## 보안 주의사항

⚠️ **개발 환경에서만 사용하세요!**

- 프로덕션에서는 반드시 HTTPS 사용
- 인증 및 보안 설정 강화
- 방화벽 규칙을 최소한으로 설정
