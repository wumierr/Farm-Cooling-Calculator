@echo off
chcp 65001 >nul 2>&1
title Deploy to Cloudflare

echo ============================================================
echo   Building and deploying to Cloudflare Pages...
echo ============================================================

:: Build with Cloudflare static export config
set DEPLOY_TARGET=cloudflare
call bun run build

if not exist out (
    echo [FAIL] Build failed — no "out" directory.
    pause
    exit /b 1
)

:: Install wrangler if not present
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing wrangler...
    call npm install -g wrangler
)

echo Deploying to Cloudflare Pages...
call npx wrangler pages deploy out --project-name=farm-cooling-calculator --branch=main

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   Deployment successful!
    echo ============================================================
) else (
    echo Deployment failed.
)
pause
