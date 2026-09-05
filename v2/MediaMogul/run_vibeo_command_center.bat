@echo off
title vibeoVideo - Agentic AI Command Center
where pythonw >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%~dp0companion\vibeo_agent_center.py" (
        start "" pythonw "%~dp0companion\vibeo_agent_center.py" %*
        exit
    )
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%~dp0companion\vibeo_agent_center.py" (
        start "" python "%~dp0companion\vibeo_agent_center.py" %*
        exit
    )
)
if exist "%~dp0vibeo_command_center.exe" (
    start "" "%~dp0vibeo_command_center.exe" %*
    exit
)
if exist "%~dp0dist\vibeo_command_center.exe" (
    start "" "%~dp0dist\vibeo_command_center.exe" %*
    exit
)
echo vibeoVideo could not be launched. Python or vibeo_command_center.exe is required.
pause
exit
