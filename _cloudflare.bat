@echo off
chcp 65001 >nul 2>&1
title Deploy to Cloudflare

echo ============================================================
echo   Building and deploying to Cloudflare Pages...
echo ============================================================

set DEPLOY_TARGET=cloudflare
call bun run build
if not exist out (
    echo [FAIL] Build failed
    pause
    exit /b 1
)

where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing wrangler...
    call bun add -d wrangler
)

echo Deploying...
call npx wrangler pages deploy out --project-name=farm-cooling-calculator

if %errorlevel%==0 (
    echo.
    echo ============================================================
    echo   Deployment successful!
    echo   Visit: https://farm-cooling-calculator.pages.dev
    echo ============================================================
) else (
    echo Deployment failed
)
pause