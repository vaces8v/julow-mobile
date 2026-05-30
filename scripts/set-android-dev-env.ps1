$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Set-UserEnvIfChanged {
  param([string]$Name, [string]$Value)
  if (-not $Value) { return }
  $current = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($current -ne $Value) {
    [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
    Write-Host "[env] Set user $Name=$Value"
  }
  Set-Item -Path "Env:$Name" -Value $Value
}

function Add-UserPathEntries {
  param([string[]]$Entries)
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not $userPath) { $userPath = '' }
  $parts = [System.Collections.Generic.List[string]]::new()
  foreach ($p in ($userPath -split ';')) {
    if ($p -and $p.Trim() -ne '') { $parts.Add($p.TrimEnd('\')) }
  }
  $added = @()
  foreach ($entry in $Entries) {
    if (-not $entry) { continue }
    $normalized = $entry.TrimEnd('\')
    if (-not $parts.Contains($normalized)) {
      $parts.Add($normalized)
      $added += $normalized
    }
    if ($env:Path -notlike "*$normalized*") {
      $env:Path = "$normalized;$env:Path"
    }
  }
  if ($added.Count -gt 0) {
    [Environment]::SetEnvironmentVariable('Path', ($parts -join ';'), 'User')
    foreach ($a in $added) { Write-Host "[env] Added to user Path: $a" }
  }
}

$jdk = 'C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot'
if (-not (Test-Path $jdk)) {
  $found = Get-ChildItem 'C:\Program Files\Microsoft' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^jdk-17' } |
    Select-Object -First 1
  if ($found) {
    $jdk = $found.FullName
  } else {
    Write-Host 'JDK 17 not found. Install Microsoft Build of OpenJDK 17 or set JAVA_HOME.'
    exit 1
  }
}

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

Set-UserEnvIfChanged -Name 'JAVA_HOME' -Value $jdk
Set-UserEnvIfChanged -Name 'ANDROID_HOME' -Value $sdk

$pathEntries = @(
  "$jdk\bin"
  "$env:USERPROFILE\.bun\bin"
  "$sdk\platform-tools"
  "$sdk\emulator"
)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $pathEntries += (Split-Path $nodeCmd.Source -Parent)
}
Add-UserPathEntries -Entries $pathEntries

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

$env:ANDROID_SERIAL = 'emulator-5554'
$env:EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1'