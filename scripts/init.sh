#!/usr/bin/env bash
#
# Irodora — bootstrap and health check (POSIX).
#
# Safe to run repeatedly. It checks what it can, starts the backing services, and
# tells you exactly what is missing — including the things that are legitimately
# absent because the feature that creates them has not been built yet.
#
# Windows: use scripts/init.ps1.

set -euo pipefail

cd "$(dirname "$0")/.."

BOLD=$'\e[1m'; GREEN=$'\e[32m'; RED=$'\e[31m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; OFF=$'\e[0m'
problems=0

say()  { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$RED" "$OFF" "$1"; problems=$((problems + 1)); }

printf '\n%sIrodora — bootstrap%s\n\n' "$BOLD" "$OFF"

# ---- Node -----------------------------------------------------------------
required="$(tr -d ' \n\r' < .nvmrc)"
required_major="${required%%.*}"

if command -v node >/dev/null 2>&1; then
  actual="$(node --version | sed 's/^v//')"
  actual_major="${actual%%.*}"
  if [ "$actual_major" -eq "$required_major" ]; then
    say "Node $actual (matches .nvmrc)"
  else
    bad "Node $actual, but .nvmrc pins $required. Run: nvm install $required && nvm use"
  fi
else
  bad 'Node is not installed. Install the version in .nvmrc.'
fi

# ---- pnpm -----------------------------------------------------------------
if command -v pnpm >/dev/null 2>&1; then
  say "pnpm $(pnpm --version)"
else
  bad 'pnpm is not available. Run: corepack enable'
fi

# ---- Docker ---------------------------------------------------------------
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  say 'Docker with Compose v2'
  if [ "${IRODORA_SKIP_SERVICES:-0}" != "1" ]; then
    printf '  %sstarting backing services…%s\n' "$DIM" "$OFF"
    docker compose up -d >/dev/null 2>&1 && say 'postgres · valkey · minio · mailpit up' \
      || bad 'docker compose up failed. Run it directly to see why.'
  fi
else
  bad 'Docker with Compose v2 is required for local development.'
fi

# ---- .env -----------------------------------------------------------------
if [ -f .env ]; then
  say '.env present'
else
  cp .env.example .env && warn '.env created from .env.example — review it before use'
fi

# ---- gate 0 ---------------------------------------------------------------
printf '\n%sGate 0 — harness integrity%s\n' "$BOLD" "$OFF"
if node scripts/verify-state.mjs; then
  :
else
  problems=$((problems + 1))
fi

# ---- toolchain, once it exists --------------------------------------------
printf '\n%sToolchain%s\n' "$BOLD" "$OFF"
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile && say 'dependencies installed'
else
  warn 'No lockfile yet — the workspace is scaffolded by F-001. This is expected pre-code.'
fi

# ---- what to do next ------------------------------------------------------
printf '\n%sNext%s\n' "$BOLD" "$OFF"
if [ "$problems" -eq 0 ]; then
  printf '  Read %sAGENTS.md%s, then run %s/next-feature%s.\n\n' "$BOLD" "$OFF" "$BOLD" "$OFF"
  exit 0
else
  printf '  %s%d problem(s) above.%s Fix them before starting work — beginning from a\n' "$RED" "$problems" "$OFF"
  printf '  broken state means you will not know later whether you caused something.\n\n'
  exit 1
fi
