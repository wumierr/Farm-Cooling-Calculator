@echo off
chcp 65001 >nul 2>&1
title 推送到 GitHub

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
git commit -m "更新项目" >nul 2>&1
git push -u origin main

if %errorlevel%==0 (
    echo 推送成功！
) else (
    echo 推送失败，请检查 Git 配置
)
pause
