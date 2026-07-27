@echo off
chcp 65001 >nul 2>&1
title Farm Cooling Calculator - Push to GitHub
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-github.ps1" %*
