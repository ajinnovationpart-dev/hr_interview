@echo off
echo Starting Interview Scheduling Backend Server...
echo.

cd /d %~dp0

REM 서버가 이미 실행 중인지 확인
netstat -ano | findstr ":3000" >nul
if %errorlevel% == 0 (
    echo Port 3000 is already in use. Please stop the existing server first.
    pause
    exit /b 1
)

REM 개발 모드로 서버 시작
echo Starting server in development mode...
npm run dev

pause
