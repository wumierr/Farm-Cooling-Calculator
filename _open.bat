@echo off
title Open Web Page
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto open_browser
echo Starting server...
cd /d "%~dp0"
start "Farm Cooling Server" "D:\nodejs\bun" run dev
echo Waiting for server...
set /a n=0
:wait
set /a n+=1
if %n% gtr 30 goto fail
timeout /t 2 /nobreak >nul
curl -s -o nul --connect-timeout 2 --max-time 5 "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait
:open_browser
start http://localhost:3000
timeout /t 1 /nobreak >nul
exit /b 0
:fail
echo Server did not start in time.
pause
exit /b 1
