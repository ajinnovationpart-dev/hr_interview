# GitHub Pages 배포 설정 가이드

## 1. GitHub Secrets 설정

GitHub 저장소에서 환경 변수를 설정해야 합니다:

1. 저장소 페이지로 이동: https://github.com/ajinnovationpart-dev/hr_interview
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 클릭
4. 다음 Secret 추가:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://uncognizant-restrainedly-leila.ngrok-free.dev/`

## 2. GitHub Pages 설정

1. 저장소 페이지에서 **Settings** → **Pages** 클릭
2. **Source**에서 **GitHub Actions** 선택 (이미 선택되어 있을 수 있음)
3. 저장

## 3. 워크플로우 실행 확인

1. **Actions** 탭으로 이동
2. `Deploy to GitHub Pages` 워크플로우가 실행되는지 확인
3. 워크플로우가 완료되면 (약 2-3분 소요) 배포 완료

## 4. 접속 URL

배포가 완료되면 다음 URL로 접속할 수 있습니다:

**https://ajinnovationpart-dev.github.io/hr_interview/**

## 5. 문제 해결

### 워크플로우가 실행되지 않는 경우
- `main` 브랜치에 푸시했는지 확인
- **Actions** 탭에서 워크플로우가 활성화되어 있는지 확인

### 배포는 되었지만 페이지가 보이지 않는 경우
- 브라우저 캐시 삭제 후 재시도
- GitHub Pages 설정에서 **Source**가 **GitHub Actions**로 설정되어 있는지 확인

### API 연결 오류
- `VITE_API_URL` Secret이 올바르게 설정되었는지 확인
- ngrok URL이 활성화되어 있는지 확인

## 6. 자동 배포

이제 `main` 브랜치에 푸시할 때마다 자동으로 GitHub Pages에 배포됩니다.
