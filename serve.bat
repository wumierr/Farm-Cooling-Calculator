@echo off
chcp 65001 >nul 2>&1
title 葡萄大棚降温剂计算器 — 本地服务管理

:: ============================================================
:: serve.bat — 启停本地开发服务器
:: 用法: serve.bat [start|stop|restart|status|open]
:: ============================================================

set PORT=3000
set PID_FILE=.server.pid
set LOG_FILE=dev.log

if "%1"=="" goto help
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
if "%1"=="open" goto open
goto help

:start
:: 检查是否已在运行
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [✗] 服务已在运行，端口 %PORT% 被占用
    exit /b 1
)

echo [ℹ] 正在启动开发服务器 (端口 %PORT%)...
start /b cmd /c "bun run dev > %LOG_FILE% 2>&1"

:: 等待服务就绪（最多 30 秒）
echo [ℹ] 等待服务就绪...
set /a count=0
:wait_loop
set /a count+=1
if %count% gtr 30 (
    echo [✗] 服务启动超时（30秒），请检查日志: %LOG_FILE%
    exit /b 1
)
timeout /t 1 /nobreak >nul
curl -s -o nul -w "%%{http_code}" "http://localhost:%PORT%/" 2>nul | findstr "200" >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 服务已启动
    echo.
    echo   网页地址: http://localhost:%PORT%
    echo   日志文件: %LOG_FILE%
    echo.
    echo   停止服务: serve.bat stop
    echo   查看状态: serve.bat status
    exit /b 0
)
goto wait_loop

:stop
echo [ℹ] 正在停止服务...
:: 查找占用端口的进程并终止
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [✓] 已终止进程 PID: %%a
)
:: 也尝试通过 bun/next 进程名终止
taskkill /f /im node.exe >nul 2>&1
echo [✓] 服务已停止
exit /b 0

:restart
call %0 stop
timeout /t 2 /nobreak >nul
call %0 start
exit /b 0

:status
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 服务运行中 (端口 %PORT%)
    curl -s -o nul -w "HTTP %%{http_code}\n" "http://localhost:%PORT%/" 2>nul
) else (
    echo [ℹ] 服务未在运行
)
exit /b 0

:open
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not %errorlevel%==0 (
    echo [✗] 服务未运行，请先启动: serve.bat start
    exit /b 1
)
echo [ℹ] 正在打开浏览器...
start http://localhost:%PORT%
exit /b 0

:help
echo 葡萄大棚降温剂计算器 — 本地服务管理
echo.
echo 用法: serve.bat ^<命令^>
echo.
echo 命令:
echo   start    启动开发服务器（自动等待就绪）
echo   stop     停止服务器
echo   restart  重启服务器
echo   status   查看运行状态
echo   open     在浏览器中打开页面
echo.
echo 示例:
echo   serve.bat start    # 启动服务并等待就绪
echo   serve.bat open     # 打开浏览器
echo   serve.bat stop     # 停止服务
exit /b 1
