@echo off
chcp 65001 >nul 2>&1
title 推送到 GitHub

:: ============================================================
:: git-push.bat — 一键推送到 GitHub
:: 用法: git-push.bat "提交说明"
:: ============================================================

set REPO_URL=https://github.com/wumierr/Farm-Cooling-Calculator.git
set COMMIT_MSG=%1
if "%COMMIT_MSG%"=="" set COMMIT_MSG=更新项目

:: 检查 git 是否初始化
if not exist .git (
    echo [ℹ] 初始化 Git 仓库...
    git init
    git branch -M main
)

:: 检查 remote
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [ℹ] 添加远程仓库...
    git remote add origin %REPO_URL%
) else (
    git remote set-url origin %REPO_URL%
)

echo [ℹ] 添加文件...
git add -A

echo [ℹ] 提交: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 echo [ℹ] 无变更需要提交

echo [ℹ] 推送到 GitHub...
git push -u origin main

if %errorlevel%==0 (
    echo [✓] 推送完成！
    echo.
    echo   仓库地址: https://github.com/wumierr/Farm-Cooling-Calculator
) else (
    echo [✗] 推送失败，请检查 Git 配置或网络
)
pause
