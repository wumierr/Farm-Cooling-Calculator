@echo off
chcp 65001 >nul 2>&1
title Build APK

echo ============================================================
echo   Building APK... First run may download ~500MB, please wait
echo ============================================================

set CAPACITOR_BUILD=1
call bun run build
if not exist out (
    echo [FAIL] Build failed, out directory missing
    pause
    exit /b 1
)

cd apk-build
if not exist android (
    echo Initializing Android platform...
    call npx cap add android
)
call npx cap sync android
cd ..

echo Compiling APK...
call npx build-capacitor --platform android --config apk-build\capacitor.config.json

set APK=apk-build\android\app\build\outputs\apk\debug\app-debug.apk
if exist %APK% (
    echo.
    echo ============================================================
    echo   APK built successfully!
    echo   File location: %APK%
    echo ============================================================
    explorer /select,"%CD%\%APK%"
) else (
    echo [FAIL] APK not found
)
pause