@echo off
chcp 65001 >nul 2>&1
title 打包 APK

echo ============================================================
echo   APK 打包中... 首次需下载约500MB环境，请耐心等待
echo ============================================================

set CAPACITOR_BUILD=1
call bun run build
if not exist out (
    echo [失败] 构建失败，out 目录不存在
    pause
    exit /b 1
)

cd apk-build
if not exist android (
    echo 初始化 Android 平台...
    call npx cap add android
)
call npx cap sync android
cd ..

echo 编译 APK...
call npx build-capacitor --platform android --config apk-build\capacitor.config.json

set APK=apk-build\android\app\build\outputs\apk\debug\app-debug.apk
if exist %APK% (
    echo.
    echo ============================================================
    echo   APK 打包成功！
    echo   文件位置: %APK%
    echo ============================================================
    :: 打开 APK 所在文件夹
    explorer /select,"%CD%\%APK%"
) else (
    echo [失败] APK 未找到
)
pause
