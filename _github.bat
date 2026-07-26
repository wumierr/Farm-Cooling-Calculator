@echo off
chcp 65001 >nul 2>&1
title Push to GitHub (Linux branch)

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

:: Stage all tracked+new files
git add -A

:: Check if there are staged changes
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo Nothing to commit.
    timeout /t 2 /nobreak >nul
    exit /b 0
)

echo Committing changes...
git commit -m "Update project"

if %errorlevel% neq 0 (
    echo Commit failed.
    pause
    exit /b 1
)

:: Pull latest, rebase local on top, conflict自动采用本地版本（增加 -X ours）
echo Syncing with remote...
git pull origin %BRANCH% --rebase --autostash -X ours

if %errorlevel% neq 0 (
    echo Pull failed — check for conflicts.
    pause
    exit /b 1
)

:: Push to the same branch
git push -u origin %BRANCH%

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   Push successful! (Branch: %BRANCH%)
    echo ============================================================
) else (
    echo Push failed. Check your network or GitHub credentials.
)
pause