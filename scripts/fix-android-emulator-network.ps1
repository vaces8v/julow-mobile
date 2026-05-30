$ErrorActionPreference = 'Stop'

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  Write-Host 'adb not found. Install Android SDK platform-tools.'
  exit 1
}

$emulator = (& $adb devices | Select-String 'emulator-\d+\s+device' | Select-Object -First 1)
if (-not $emulator) {
  Write-Host 'No running Android emulator detected.'
  exit 0
}

$serial = ($emulator -split '\s+')[0]
Write-Host "Fixing network settings on $serial ..."

& $adb -s $serial shell settings put global captive_portal_mode 0 | Out-Null
& $adb -s $serial shell settings put global http_proxy :0 | Out-Null

$qemu = Get-Process -Name 'qemu-system-x86_64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($qemu) {
  $qemuPath = (Get-CimInstance Win32_Process -Filter "ProcessId=$($qemu.Id)").ExecutablePath
  if ($qemuPath) {
    netsh advfirewall firewall add rule name="Julow Android Emulator" dir=out action=allow program="$qemuPath" enable=yes 2>$null | Out-Null
    Write-Host 'Added/updated Windows Firewall rule for Android Emulator.'
  }
}

Write-Host 'Done. Start the dev proxy: bun run emulator:proxy'
