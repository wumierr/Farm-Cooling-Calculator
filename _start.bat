@echo off
chcp 65001 >nul 2>&1
title Start Service

:: === Environment checks ===
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] bun is not found. Please install Bun first.
    echo         https://bun.sh
    pause
    exit /b 1
)

if not exist node_modules (
    echo node_modules not found. Running bun install...
    echo This may take a few minutes on first run.
    call bun install
    if %errorlevel% neq 0 (
        echo [ERROR] bun install failed. Check your network connection.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
)

echo Starting service, please wait...

:: Launch dev server in a minimized window (separate window title for identification)
start "FarmCoolingDev" /min cmd /c "bun run dev > dev.log 2>&1"

:: Wait for HTTP 200 (up to 90 seconds for cold start)
echo Waiting for server to be ready (up to 90 seconds on first run)...
set /a count=0
:wait
set /a count+=1
if %count% gtr 45 goto fail
timeout /t 2 /nobreak >nul
curl -s -o nul --connect-timeout 2 --max-time 5 "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait

:: Success — open browser
start http://localhost:3000
echo Service started. Browser opened.
echo To stop the service, double-click "Stop Service.vbs"
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
echo Troubleshooting:
echo   1. Check the full dev.log in the project folder for errors
echo   2. Run "bun run dev" manually in a terminal to see live errors
echo   3. Ensure port 3000 is not already in use
echo   4. Try deleting the .next folder and restarting
echo.
pause
exit /b 1
