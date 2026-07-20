@echo off
chcp 65001 >nul 2>&1
title Open Web Page

:: Check if service is already running
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto open_browser

:: === Service not running — start it ===
echo Service is not running. Starting now...
echo.

:: Environment checks
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] bun is not found. Please install Bun first.
    echo         https://bun.sh
    pause
    exit /b 1
)

if not exist node_modules (
    echo node_modules not found. Running bun install...
    call bun install
    if %errorlevel% neq 0 (
        echo [ERROR] bun install failed. Check your network connection.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
)

:: Launch dev server in a minimized window
start "FarmCoolingDev" /min cmd /c "bun run dev > dev.log 2>&1"

:: Wait for server to be ready (up to 90 seconds)
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
echo Browser opened. To stop the service, use "Stop Service.vbs"
timeout /t 2 /nobreak >nul
exit /b 0

:fail
echo.
echo ============================================================
echo   STARTUP FAILED — Server did not respond after 90 seconds
echo ============================================================
echo.
echo Last lines of dev.log:
echo ----------------------------------------
if exist dev.log type dev.log
echo ----------------------------------------
echo.
echo Try running "bun run dev" manually in a terminal to diagnose.
echo.
pause
exit /b 1
