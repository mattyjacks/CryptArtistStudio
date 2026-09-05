@echo off
setlocal
echo Uninstalling vibeoVideo from Shotcut...
set "DEST=%LOCALAPPDATA%\Meltytech\Shotcut\extensions\filters\vibeo_video"
if exist "%DEST%" (
    rmdir /S /Q "%DEST%"
    echo Successfully removed vibeoVideo.
) else (
    echo vibeoVideo was not found at %DEST%.
)
echo.
pause
