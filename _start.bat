@echo off
chcp 65001 >nul 2>&1
title 启动服务

:: 启动开发服务器并等待就绪
echo 正在启动服务，请稍候...

:: 后台启动 dev server
start /b cmd /c "bun run dev > dev.log 2>&1"

:: 等待 HTTP 200
set /a count=0
:wait
set /a count+=1
if %count% gtr 40 goto fail
timeout /t 1 /nobreak >nul
curl -s -o nul "http://localhost:3000/" >nul 2>&1
if %errorlevel% neq 0 goto wait

:: 成功 — 打开浏览器并关闭窗口
start http://localhost:3000
echo 服务已启动，浏览器已打开。
echo 如需关闭服务，双击"停止服务.vbs"
timeout /t 2 /nobreak >nul
exit /b 0

:fail
echo 启动超时，请检查 dev.log
pause
exit /b 1
