# Irodora - bootstrap and health check (Windows).
#
# Safe to run repeatedly. It checks what it can, starts the backing services, and
# tells you exactly what is missing - including the things that are legitimately
# absent because the feature that creates them has not been built yet.
#
# POSIX: use scripts/init.sh.

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$problems = 0
function Say  ($m) { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [warn] $m" -ForegroundColor Yellow }
function Bad  ($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red; $script:problems++ }

Write-Host ''
Write-Host 'Irodora - bootstrap' -ForegroundColor White
Write-Host ''

# ---- Node -------------------------------------------------------------------
$required = (Get-Content .nvmrc -Raw).Trim()
$requiredMajor = $required.Split('.')[0]

if (Get-Command node -ErrorAction SilentlyContinue) {
  $actual = (node --version).TrimStart('v')
  $actualMajor = $actual.Split('.')[0]
  if ($actualMajor -eq $requiredMajor) {
    Say "Node $actual (matches .nvmrc)"
  } else {
    Bad "Node $actual, but .nvmrc pins $required. Run: nvm install $required; nvm use $required"
  }
} else {
  Bad 'Node is not installed. Install the version in .nvmrc.'
}

# ---- pnpm -------------------------------------------------------------------
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  Say "pnpm $(pnpm --version)"
} else {
  Bad 'pnpm is not available. Run: corepack enable'
}

# ---- Docker -----------------------------------------------------------------
$dockerOk = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose version *> $null
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
}
if ($dockerOk) {
  Say 'Docker with Compose v2'
  if ($env:IRODORA_SKIP_SERVICES -ne '1') {
    Write-Host '  starting backing services...' -ForegroundColor DarkGray
    docker compose up -d *> $null
    if ($LASTEXITCODE -eq 0) { Say 'postgres, valkey, minio, mailpit up' }
    else { Bad 'docker compose up failed. Run it directly to see why.' }
  }
} else {
  Bad 'Docker with Compose v2 is required for local development.'
}

# ---- .env -------------------------------------------------------------------
if (Test-Path .env) {
  Say '.env present'
} else {
  Copy-Item .env.example .env
  Warn '.env created from .env.example - review it before use'
}

# ---- gate 0 -----------------------------------------------------------------
Write-Host ''
Write-Host 'Gate 0 - harness integrity' -ForegroundColor White
node scripts/verify-state.mjs
if ($LASTEXITCODE -ne 0) { $problems++ }

# ---- toolchain, once it exists ----------------------------------------------
Write-Host ''
Write-Host 'Toolchain' -ForegroundColor White
if (Test-Path pnpm-lock.yaml) {
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -eq 0) { Say 'dependencies installed' } else { Bad 'pnpm install failed.' }
} else {
  Warn 'No lockfile yet - the workspace is scaffolded by F-001. This is expected pre-code.'
}

# ---- what to do next --------------------------------------------------------
Write-Host ''
Write-Host 'Next' -ForegroundColor White
if ($problems -eq 0) {
  Write-Host '  Read AGENTS.md, then run /next-feature.'
  Write-Host ''
  exit 0
} else {
  Write-Host "  $problems problem(s) above." -ForegroundColor Red
  Write-Host '  Fix them before starting work - beginning from a broken state means you'
  Write-Host '  will not know later whether you caused something.'
  Write-Host ''
  exit 1
}
