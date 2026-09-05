$ErrorActionPreference = "Stop"

$baseDir = "c:\GitHub5\Antigravity\shotcut-vibeovideo"
$releaseDir = Join-Path $baseDir "release\vibeoVideo-v1.0.0-windows-x64"

if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item (Join-Path $baseDir "vibeo_command_center.exe") $releaseDir -Force
Copy-Item (Join-Path $baseDir "install.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "uninstall.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "run_vibeo_command_center.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "README.txt") $releaseDir -Force

$filterDest = Join-Path $releaseDir "filters\vibeo_video"
New-Item -ItemType Directory -Path $filterDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "filters\vibeo_video\*") $filterDest -Recurse -Force

$zipPath = Join-Path $baseDir "release\vibeoVideo-v1.0.0-windows-x64.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Release ZIP created successfully: $zipPath"
Get-Item $zipPath | Select-Object Name, Length, LastWriteTime
