@echo off
chcp 65001 >nul
title Music Streaming App

echo ============================================
echo   Music Streaming App 실행기
echo ============================================
echo.

:: 백엔드 실행 (새 창)
echo [1/2] 백엔드 서버 시작 중... (포트 5001)
start "Backend Server" cmd /k "cd /d %~dp0backend && dotnet run --urls=http://localhost:5001"

:: 프론트엔드 실행 (새 창)
echo [2/2] 프론트엔드 서버 시작 중... (포트 3000)
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   서버가 시작됩니다!
echo   - 백엔드:    http://localhost:5001
echo   - 프론트엔드: http://localhost:3000
echo ============================================
echo.
echo 브라우저에서 http://localhost:3000 을 열어주세요.
echo 이 창은 닫아도 됩니다.
pause
