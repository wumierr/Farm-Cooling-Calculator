@echo off
title Open Web Page
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto open_browser
echo Service is not running. Starting now...
start /b bun run dev > dev.log 2>&1
echo Waiting for server to start (up to 90 seconds on first run)...
set /a count=0
:wait_loop
set /a count+=1
if %count% gtr 45 goto fail
timeout /t 2 /nobreak >nul
curl -s -o nul --connect-timeout 2 --max-time 5 "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait_loop
:open_browser
start http://localhost:3000
echo Browser opened.
timeout /t 2 /nobreak >nul
exit /b 0
:fail
echo ============================================================
echo   STARTUP FAILED - Server did not respond after 90 seconds
echo ============================================================
if exist dev.log type dev.log
echo.
echo Try running bun run dev manually in a terminal.
pause
exit /b 1