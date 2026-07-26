@echo off
chcp 65001 >nul 2>&1
title Push to GitHub (Linux branch - SSH Force)

:: 检查是否有 URL 重写规则
echo Checking for Git URL rewriting rules...
git config --global --get-regexp url > "%TEMP%\git_url_rules.txt"
findstr /i "insteadof" "%TEMP%\git_url_rules.txt" >nul
if %errorlevel% equ 0 (
    echo WARNING: Global Git URL rewriting rules detected!
    echo These rules may force HTTPS even if remote is set to SSH.
    echo Consider removing them with:
    echo   git config --global --unset url.https://github.com/.insteadof
    echo.
)
del "%TEMP%\git_url_rules.txt" >nul 2>&1

set REPO=git@github.com:wumierr/Farm-Cooling-Calculator.git
set BRANCH=Linux

echo ============================================================
echo   Current directory: %cd%
echo ============================================================

:: -------------------- 1. 强制设置远程为 SSH --------------------
echo Force setting remote origin to SSH...
git remote rm origin >nul 2>&1
git remote add origin %REPO%
echo Current remote URL:
git remote -v

:: -------------------- 2. 初始化/创建分支 --------------------
if not exist .git (
    git init
)
:: 确保在 Linux 分支
git checkout %BRANCH% >nul 2>&1
if %errorlevel% neq 0 (
    echo Branch '%BRANCH%' does not exist, creating it...
    git checkout -b %BRANCH%
)

:: -------------------- 3. 检查是否有提交 --------------------
git rev-parse --verify HEAD >nul 2>&1
if %errorlevel% neq 0 (
    echo No commits yet, creating initial commit...
    git add -A
    git commit -m "Initial commit"
)

:: -------------------- 4. 暂存并提交变更 --------------------
git add -A
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo No new changes to commit.
) else (
    echo Committing changes...
    git commit -m "Update project"
)

:: -------------------- 5. 检测远程分支是否存在 --------------------
echo Checking remote branch '%BRANCH%'...
git ls-remote --heads origin %BRANCH% >nul 2>&1
if %errorlevel% neq 0 (
    echo Remote branch does not exist. Will create it via push.
    goto :push
)

:: -------------------- 6. 拉取远程（本地优先） --------------------
echo Pulling latest (local wins conflicts)...
git pull origin %BRANCH% --rebase --autostash -X ours
if %errorlevel% neq 0 (
    echo Pull failed. Trying merge pull...
    git pull origin %BRANCH% --no-rebase -X ours
    if %errorlevel% neq 0 (
        echo Pull failed. You may force push.
        pause
        exit /b 1
    )
)

:push
:: -------------------- 7. 推送 --------------------
echo Pushing to remote branch '%BRANCH%'...
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