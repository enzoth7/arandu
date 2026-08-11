$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$n8nCommand = Join-Path $env:APPDATA 'npm\n8n.cmd'

if (-not (Test-Path -LiteralPath $n8nCommand)) {
  throw "No se encontró n8n en $n8nCommand"
}

$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false'
$env:ARANDU_BASE_URL = 'http://localhost:3000'
$env:CHATWOOT_BASE_URL = 'http://localhost:3201'

$localEnvPath = Join-Path $workspaceRoot '.env'
if (Test-Path -LiteralPath $localEnvPath) {
  $allowedKeys = @(
    'N8N_INTAKE_HMAC_SECRET',
    'CHATWOOT_API_ACCESS_TOKEN'
  )

  foreach ($line in Get-Content -LiteralPath $localEnvPath) {
    if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { continue }
    $key = $Matches[1]
    if ($key -notin $allowedKeys) { continue }
    [Environment]::SetEnvironmentVariable($key, $Matches[2], 'Process')
  }
}

Write-Host 'n8n iniciando en http://localhost:5678'
& $n8nCommand start
