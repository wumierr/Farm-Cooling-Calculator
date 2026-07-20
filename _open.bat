@echo off
chcp 65001 >nul 2>&1
title 打开网页

:: 检查服务是否在运行
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo 服务未运行，正在启动...
    start /b cmd /c "bun run dev > dev.log 2>&1"
    set /a count=0
    :wait
    set /a count+=1
    if %count% gtr 40 exit /b 1
    timeout /t 1 /nobreak >nul
    curl -s -o nul "http://localhost:3000/" >nul 2>&1
    if %errorlevel% neq 0 goto wait
)
start http://localhost:3000
