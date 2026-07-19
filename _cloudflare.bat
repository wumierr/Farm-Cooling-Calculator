@echo off
chcp 65001 >nul 2>&1
title 部署到 Cloudflare

echo ============================================================
echo   正在构建并部署到 Cloudflare Pages...
echo ============================================================

set DEPLOY_TARGET=cloudflare
call bun run build
if not exist out (
    echo [失败] 构建失败
    pause
    exit /b 1
)

where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo 安装 wrangler...
    call bun add -d wrangler
)

echo 部署中...
call npx wrangler pages deploy out --project-name=farm-cooling-calculator

if %errorlevel%==0 (
    echo.
    echo ============================================================
    echo   部署成功！
    echo   访问: https://farm-cooling-calculator.pages.dev
    echo ============================================================
) else (
    echo 部署失败
)
pause
