@echo off
echo Starting Interview Scheduling Frontend Server...
echo.

cd /d %~dp0\frontend

REM 포트 5173이 이미 사용 중인지 확인
netstat -ano | findstr ":5173" >nul
if %errorlevel% == 0 (
    echo Port 5173 is already in use. Please stop the existing server first.
    pause
    exit /b 1
)

REM 프론트엔드 서버 시작
echo Starting frontend server on port 5173...
npm run dev

pause
