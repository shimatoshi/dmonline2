@echo off
title DM Online Backend Server (Auto-Restart)
cd /d %~dp0

:loop
cls
echo ==========================================
echo   Starting Backend Server...
echo   Time: %time%
echo ==========================================

:: Start Python Server
python server.py

echo.
echo [WARNING] Server stopped or crashed!
echo [RESTART] Restarting in 3 seconds...
timeout /t 3 >nul
goto loop