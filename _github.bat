@echo off
chcp 65001 >nul 2>&1
title Push to GitHub (Linux branch - Force)

set REPO=https://github.com/wumierr/Farm-Cooling-Calculator.git
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

:: 添加所有变更
git add -A

:: 检查是否有变更
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

:: ========== 关键修改：不管有没有新提交，都执行推送 ==========
echo Syncing with remote...
git pull origin %BRANCH% --rebase --autostash -X ours

if %errorlevel% neq 0 (
    echo Pull failed, trying merge pull...
    git pull origin %BRANCH% --no-rebase -X ours
    if %errorlevel% neq 0 (
        echo Pull failed. You may need to force push.
        pause
        exit /b 1
    )
)

echo Pushing to remote branch %BRANCH%...
git push -u origin %BRANCH%

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   Push successful! (Branch: %BRANCH%)
    echo ============================================================
) else (
    echo Push failed. Check network or credentials.
)
pause