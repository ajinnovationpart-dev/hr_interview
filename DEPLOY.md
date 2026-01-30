# 배포 가이드

## AWS EC2 배포

### 1. EC2 인스턴스 생성

1. AWS 콘솔 → EC2 → 인스턴스 시작
2. AMI: Ubuntu 22.04 LTS
3. 인스턴스 유형: t3.small (2vCPU, 2GB RAM)
4. 스토리지: 20GB gp3
5. 보안 그룹 설정:
   - SSH (22): 내 IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
6. 키 페어 생성 및 다운로드

### 2. 서버 초기 설정

```bash
# SSH 접속
ssh -i "key.pem" ubuntu@ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install -y nginx

# Git 설치
sudo apt install -y git
```

### 3. 애플리케이션 배포

```bash
# 디렉토리 생성
sudo mkdir -p /var/www/interview-scheduling
sudo chown ubuntu:ubuntu /var/www/interview-scheduling
cd /var/www/interview-scheduling

# Git 클론 또는 파일 업로드
git clone [repository-url] .

# Backend 설정
cd backend
npm install --production
npm run build

# 환경 변수 설정
nano .env
# .env 파일 내용 입력

# Frontend 빌드
cd ../frontend
npm install
npm run build
```

### 4. PM2로 Backend 실행

```bash
cd /var/www/interview-scheduling/backend
pm2 start dist/server.js --name interview-api
pm2 save
pm2 startup
# 출력된 명령어 실행
```

### 5. Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/interview-scheduling
```

다음 내용 입력:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/interview-scheduling/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

활성화:
```bash
sudo ln -s /etc/nginx/sites-available/interview-scheduling /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL 인증서 설정

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

### 7. 환경 변수 업데이트

프로덕션 환경에 맞게 `.env` 파일 업데이트:
- `FRONTEND_URL`: `https://your-domain.com`
- `MICROSOFT_REDIRECT_URI`: `https://your-domain.com/api/auth/callback`
- `NODE_ENV`: `production`

### 8. 모니터링

```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs interview-api

# 모니터링
pm2 monit

# 재시작
pm2 restart interview-api
```

## CI/CD 설정 (GitHub Actions)

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/interview-scheduling
            git pull
            cd backend && npm ci && npm run build
            cd ../frontend && npm ci && npm run build
            pm2 restart interview-api
```

GitHub Secrets 설정:
- `EC2_HOST`: EC2 인스턴스 IP 또는 도메인
- `EC2_SSH_KEY`: SSH 개인 키

## 백업 전략

### Google Sheets 백업
- Google Drive 자동 백업 활용
- 주기적으로 스프레드시트 다운로드

### 애플리케이션 백업
```bash
# 로그 백업
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# 환경 변수 백업 (보안 주의)
cp backend/.env backend/.env.backup
```

## 성능 최적화

### PM2 클러스터 모드
```bash
pm2 start dist/server.js -i max --name interview-api
```

### Nginx 캐싱
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 보안 체크리스트

- [ ] 환경 변수에 실제 값 설정
- [ ] JWT_SECRET 강력한 값으로 변경
- [ ] HTTPS 설정 완료
- [ ] 방화벽 규칙 확인
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링 설정
