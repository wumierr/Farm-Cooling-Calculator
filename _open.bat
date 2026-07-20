@echo off
title Open Web Page
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto open_browser
:: Start server in a new cmd window (kept alive so no orphaned console)
start "Farm Cooling Server" bun run dev
:: Wait for server to be ready
echo Starting server, please wait...
set /a count=0
:wait_loop
set /a count+=1
if %count% gtr 30 goto fail
timeout /t 2 /nobreak >nul
curl -s -o nul --connect-timeout 2 --max-time 5 "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait_loop
:open_browser
start http://localhost:3000
echo Browser opened.
timeout /t 2 /nobreak >nul
exit /b 0
:fail
echo Server took too long to start. Try again.
pause
exit /b 1
