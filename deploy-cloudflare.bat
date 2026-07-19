@echo off
chcp 65001 >nul 2>&1
title 部署到 Cloudflare Pages

:: ============================================================
:: deploy-cloudflare.bat — 一键部署到 Cloudflare Pages
:: 用法: deploy-cloudflare.bat
:: ============================================================

echo ============================================================
echo   Cloudflare Pages 部署
echo ============================================================

:: Step 1: 静态构建
echo.
echo [Step 1/3] 静态构建（Cloudflare 模式）...
set DEPLOY_TARGET=cloudflare
call bun run build
if not exist out (
    echo [✗] 构建失败：out\ 目录不存在
    pause
    exit /b 1
)
echo [✓] 静态构建完成

:: Step 2: 检查 wrangler
echo.
echo [Step 2/3] 检查 wrangler...
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo [ℹ] 安装 wrangler...
    call bun add -d wrangler
)

:: Step 3: 部署
echo.
echo [Step 3/3] 部署到 Cloudflare Pages...
echo [ℹ] 首次使用会提示登录 Cloudflare 账号
call npx wrangler pages deploy out --project-name=farm-cooling-calculator

if %errorlevel%==0 (
    echo.
    echo [✓] 部署完成！
    echo.
    echo   Cloudflare 会在几分钟内分配域名，如：
    echo   https://farm-cooling-calculator.pages.dev
    echo.
    echo   后续更新只需重新执行：deploy-cloudflare.bat
) else (
    echo [✗] 部署失败，请检查 wrangler 登录状态
)
pause
