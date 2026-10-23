# YT Lite - Windows Installer Script
# Run once to register YT Lite in Windows Apps and create shortcuts

$ErrorActionPreference = "Stop"
$AppName = "YT Lite"
$ExeSrc  = Join-Path $PSScriptRoot "src-tauri\target\release\yt-lite.exe"
$InstDir = "$env:LOCALAPPDATA\Programs\YTLite"
$ExeDst  = "$InstDir\YT Lite.exe"

if (-not (Test-Path $ExeSrc)) {
    Write-Host "ERROR: Build the app first with: npm run build" -ForegroundColor Red
    exit 1
}

# Create install dir and copy exe
New-Item -ItemType Directory -Force $InstDir | Out-Null
Copy-Item $ExeSrc $ExeDst -Force
Write-Host "Installed to $ExeDst" -ForegroundColor Green

# Desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\YT Lite.lnk")
$Shortcut.TargetPath = $ExeDst
$Shortcut.Description = "Lightweight YouTube App"
$Shortcut.Save()

# Start Menu shortcut
$StartMenu = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$Shortcut2 = $WshShell.CreateShortcut("$StartMenu\YT Lite.lnk")
$Shortcut2.TargetPath = $ExeDst
$Shortcut2.Description = "Lightweight YouTube App"
$Shortcut2.Save()

# Register in Windows Apps (Add/Remove Programs)
$RegKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\YTLite"
New-Item -Path $RegKey -Force | Out-Null
Set-ItemProperty $RegKey "DisplayName"     "YT Lite"
Set-ItemProperty $RegKey "DisplayVersion"  "1.1.0"
Set-ItemProperty $RegKey "Publisher"       "shkshreyas"
Set-ItemProperty $RegKey "InstallLocation" $InstDir
Set-ItemProperty $RegKey "UninstallString" "powershell -Command `"Remove-Item -Recurse -Force '$InstDir'; Remove-Item -Force '$env:USERPROFILE\Desktop\YT Lite.lnk' -ErrorAction SilentlyContinue; Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\YTLite' -Name * -ErrorAction SilentlyContinue`""
Set-ItemProperty $RegKey "DisplayIcon"     $ExeDst
Set-ItemProperty $RegKey "NoModify"        1 -Type DWord
Set-ItemProperty $RegKey "NoRepair"        1 -Type DWord
Set-ItemProperty $RegKey "EstimatedSize"   4096 -Type DWord

Write-Host ""
Write-Host "YT Lite installed!" -ForegroundColor Cyan
Write-Host "  - Desktop shortcut created"
Write-Host "  - Start Menu shortcut created"
Write-Host "  - Appears in Windows Settings > Apps"
Write-Host ""
Write-Host "Launch now? (y/n)" -NoNewline
$r = Read-Host " "
if ($r -eq 'y') { Start-Process $ExeDst }
