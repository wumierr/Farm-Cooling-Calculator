@echo off
chcp 65001 >nul 2>&1
title Push to GitHub (Linux branch - SSH)

set REPO=git@github.com:wumierr/Farm-Cooling-Calculator.git
set BRANCH=Linux

if not exist .git (
    git init
    git branch -M %BRANCH%
)
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    git remote add origin %REPO%
) else (
    git remote set-url origin %REPO%
)

:: 检查 SSH 连接是否可用（可选）
echo Testing SSH connection to GitHub...
ssh -T git@github.com -o ConnectTimeout=5 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: SSH connection to GitHub seems slow or blocked.
    echo Will attempt anyway...
)

:: 添加所有变更
git add -A

git diff --cached --quiet
if %errorlevel% equ 0 (
    echo No local changes to commit.
) else (
    echo Committing changes...
    git commit -m "Update project"
    if %errorlevel% neq 0 (
        echo Commit failed.
        pause
        exit /b 1
    )
)

:: 检查远程分支是否存在
echo Checking remote branch '%BRANCH%'...
git ls-remote --heads origin %BRANCH% >nul 2>&1
if %errorlevel% neq 0 (
    echo Remote branch does not exist or network error.
    echo Will attempt to create it by push.
    goto :push
)

:: 拉取远程（本地优先）
echo Pulling latest changes (local wins conflicts)...
git pull origin %BRANCH% --rebase --autostash -X ours
if %errorlevel% neq 0 (
    echo ERROR: Pull failed.
    echo Try pushing with force if you are sure: git push -f origin %BRANCH%
    pause
    exit /b 1
)

:push
echo Pushing to remote branch %BRANCH%...
git push -u origin %BRANCH%

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   Push successful! (Branch: %BRANCH%)
    echo ============================================================
) else (
    echo Push failed. Check SSH key or network.
    pause
)
pause