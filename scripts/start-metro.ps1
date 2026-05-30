$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'set-android-dev-env.ps1')

$port = 8081
$connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
  $procId = $conn.OwningProcess
  if ($procId -and $procId -ne 0) {
    Write-Host "Stopping process on port ${port} (PID $procId)..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

$env:EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1'
# Reduces file handle pressure on Windows without disabling Metro watch (unlike CI=1).
$env:METRO_MAX_WORKERS = '2'

& bun x expo start --dev-client --port $port @args
exit $LASTEXITCODE