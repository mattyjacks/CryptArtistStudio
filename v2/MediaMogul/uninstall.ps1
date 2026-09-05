<#
.SYNOPSIS
    Uninstalls the vibeoVideo AI Plugin from Shotcut.
#>

param (
    [switch]$SystemWide
)

$ErrorActionPreference = "Stop"

Write-Host "Uninstalling vibeoVideo from Shotcut..." -ForegroundColor Yellow

if ($SystemWide) {
    $targetDir = "C:\Program Files\Shotcut\share\shotcut\qml\filters\vibeo_video"
} else {
    $targetDir = Join-Path $env:LOCALAPPDATA "Meltytech\Shotcut\extensions\filters\vibeo_video"
}

if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
    Write-Host "Successfully removed $targetDir" -ForegroundColor Green
} else {
    Write-Host "vibeoVideo was not found at $targetDir" -ForegroundColor DarkGray
}

Write-Host "Uninstallation complete. Restart Shotcut to apply changes." -ForegroundColor Cyan
