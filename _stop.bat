@echo off
chcp 65001 >nul 2>&1
title 停止服务

:: 查找并终止占用 3000 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
:: 兜底：终止 bun/node 进程
taskkill /f /im bun.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo 服务已停止。
timeout /t 1 /nobreak >nul
