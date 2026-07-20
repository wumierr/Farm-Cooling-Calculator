@echo off
chcp 65001 >nul 2>&1
title Stop Service

set killed=0

:: Find and terminate process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Stopping process on port 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
    if not errorlevel 1 set /a killed+=1
)

:: Additional kill for bun/node processes
taskkill /f /im bun.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

if %killed% gtr 0 (
    echo Service stopped successfully.
) else (
    echo No service was running on port 3000.
)
timeout /t 2 /nobreak >nul
