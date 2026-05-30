$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'set-android-dev-env.ps1')

node ./scripts/fix-android-locks.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& bun x expo run:android @args
exit $LASTEXITCODE
