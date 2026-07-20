@echo off
chcp 65001 >nul 2>&1
title Push to GitHub

set REPO=https://github.com/wumierr/Farm-Cooling-Calculator.git

if not exist .git (
    git init
    git branch -M main
)
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    git remote add origin %REPO%
) else (
    git remote set-url origin %REPO%
)

git add -A
git commit -m "Update project" >nul 2>&1

:: Try to pull remote changes (allow unrelated histories, auto-stash)
echo Pulling latest changes from remote...
git pull origin main --allow-unrelated-histories --rebase --autostash >nul 2>&1

if %errorlevel% neq 0 (
    echo Pull failed, force pushing local changes to remote...
    git push -f -u origin main
) else (
    git push -u origin main
)

if %errorlevel%==0 (
    echo Push successful!
) else (
    echo Push failed, please check Git configuration
)
pause