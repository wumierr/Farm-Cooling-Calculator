@echo off
title Start Service
echo Starting service, please wait...
start /b bun run dev > dev.log 2>&1
echo Waiting for server to be ready (up to 90 seconds on first run)...
set /a count=0
:wait
set /a count+=1
if %count% gtr 45 goto fail
timeout /t 2 /nobreak >nul
curl -s -o nul --connect-timeout 2 --max-time 5 "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait
start http://localhost:3000
echo Service started, browser opened.
timeout /t 2 /nobreak >nul
exit /b 0
:fail
echo ============================================================
echo   STARTUP FAILED - Server did not respond after 90 seconds
echo ============================================================
if exist dev.log type dev.log
echo.
echo Troubleshooting:
echo   1. Check dev.log for errors
echo   2. Run bun run dev manually in a terminal
echo   3. Ensure port 3000 is not already in use
pause
exit /b 1
