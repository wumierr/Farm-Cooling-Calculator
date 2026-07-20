@echo off
title Farm Cooling Server
echo Server running on http://localhost:3000
echo Close this window or press Ctrl+C to stop.
echo.
cd /d "%~dp0"
"D:\nodejs\bun" run dev
