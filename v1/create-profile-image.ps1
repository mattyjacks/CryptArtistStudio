Add-Type -AssemblyName System.Drawing

# Load the original image
$imagePath = "c:\GitHub5\CryptArtistStudio\v1\src\assets\valley net v23.2 jpg mattyjacks 2023-2026 blonde lady girl red eyes ai generated edited.jpg"
$originalImage = [System.Drawing.Image]::FromFile($imagePath)

$width = $originalImage.Width
$height = $originalImage.Height
Write-Host "Original image size: ${width}x${height}"

# Crop to focus on face in top-center third
# Face is roughly in the center horizontally and top third vertically
$cropSize = [Math]::Min($width, $height) / 1.5
$left = ($width - $cropSize) / 2
$top = $height / 6
$cropRect = [System.Drawing.Rectangle]::new([int]$left, [int]$top, [int]$cropSize, [int]$cropSize)

# Crop the image
$croppedBitmap = New-Object System.Drawing.Bitmap([int]$cropSize, [int]$cropSize)
$graphics = [System.Drawing.Graphics]::FromImage($croppedBitmap)
$graphics.DrawImage($originalImage, 0, 0, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose()

Write-Host "Cropped size: $($croppedBitmap.Width)x$($croppedBitmap.Height)"

# Resize to 512x512
$resizedBitmap = New-Object System.Drawing.Bitmap(512, 512)
$graphics = [System.Drawing.Graphics]::FromImage($resizedBitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($croppedBitmap, 0, 0, 512, 512)
$graphics.Dispose()

# Create circular mask
$circleBitmap = New-Object System.Drawing.Bitmap(512, 512)
$graphics = [System.Drawing.Graphics]::FromImage($circleBitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)

# Draw circle
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($brush, 0, 0, 512, 512)
$graphics.Dispose()

# Apply circular mask to resized image
$finalBitmap = New-Object System.Drawing.Bitmap(512, 512)
for ($y = 0; $y -lt 512; $y++) {
    for ($x = 0; $x -lt 512; $x++) {
        $dx = $x - 256
        $dy = $y - 256
        $distance = [Math]::Sqrt($dx * $dx + $dy * $dy)
        
        if ($distance -le 256) {
            $finalBitmap.SetPixel($x, $y, $resizedBitmap.GetPixel($x, $y))
        }
    }
}

# Save the profile image
$outputPath = "c:\GitHub5\CryptArtistStudio\v1\src\assets\valley-net-profile.png"
$finalBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Profile image saved to: $outputPath"

# Cleanup
$originalImage.Dispose()
$croppedBitmap.Dispose()
$resizedBitmap.Dispose()
$circleBitmap.Dispose()
$finalBitmap.Dispose()
