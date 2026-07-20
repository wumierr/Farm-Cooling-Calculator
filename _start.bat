@echo off
title Start Service
echo Starting dev server...
echo.
echo When done, close this window or press Ctrl+C to stop.
echo.
:: Keep BAT alive — this prevents orphaned console windows from bun
:: The dev server runs as child of this cmd process
bun run dev 2>&1
