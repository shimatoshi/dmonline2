@echo off
title DM Online 2 Loophole Tunnel
cd /d %~dp0

:loop
cls
echo Starting Loophole for Port 8002...
C:\Users\Administrator\Desktop\loophole\loophole.exe http 8002 --hostname dmonline2
if %errorlevel% neq 0 (
    echo Loophole crashed or hostname taken. Retrying without hostname...
    C:\Users\Administrator\Desktop\loophole\loophole.exe http 8002
)
echo.
echo Loophole closed. Restarting in 5 seconds...
timeout /t 5
goto loop