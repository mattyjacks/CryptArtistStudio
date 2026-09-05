@echo off
setlocal
echo ====================================================
echo        vibeoVideo - 1-Click Installer
echo ====================================================
echo.
set "DEST=%LOCALAPPDATA%\Meltytech\Shotcut\extensions\filters\vibeo_video"
echo Installing vibeoVideo to:
echo %DEST%
echo.

if not exist "%DEST%" mkdir "%DEST%"

xcopy /E /Y /I "%~dp0filters\vibeo_video" "%DEST%"
if exist "%~dp0vibeo_command_center.exe" (
    copy /Y "%~dp0vibeo_command_center.exe" "%DEST%\" >nul
)

echo.
echo ====================================================
echo ✨ vibeoVideo installed successfully!
echo ====================================================
echo.
echo 1. Launch vibeo_command_center.exe to start the AI Command Center and Top-of-Screen Dock.
echo 2. Open Shotcut: You will see [✨ Open vibeoVideo] right next to 'Help'!
echo.
pause
