@echo off
title Serveo Auto-Connector (dmonline2)
cd /d %~dp0

:loop
cls
echo [Status] Connecting to Serveo...
echo [Time] %time%

:: Connect to Serveo (No taskkill to avoid killing other tunnels)
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R dmbackend:80:127.0.0.1:8002 serveo.net

echo.
echo [Warning] Connection lost or Port Conflict!
echo [Retry] Reconnecting in 10 seconds...
timeout /t 10 >nul
goto loop