# Local Development

| | |
|---|---|
| **Profile** | `IRODORA_PROFILE=local` |
| **Decision** | [ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md) |

Backing services run in Docker; the applications run on your machine, so you keep fast
reload and a real debugger.

---

## Prerequisites

| | Version | Check |
|---|---|---|
| Node | 24 LTS (see [`.nvmrc`](../../../.nvmrc)) | `node --version` |
| pnpm | 11+ via corepack | `pnpm --version` |
| Docker | with Compose v2 | `docker compose version` |

```bash
corepack enable
```

> **Note:** this workstation currently has Node 22.16.0. Gate 0
> (`node scripts/verify-state.mjs`) runs on it, but `pnpm install` will fail the engine
> check once F-001 lands. Upgrade to Node 24 before starting R0.

---

## Start

```bash
git clone <repo> && cd irodora
corepack enable
cp .env.example .env
docker compose up -d
node scripts/verify-state.mjs
```

`docker compose up -d` starts Postgres 17, Valkey, MinIO and Mailpit. Wait for health:

```bash
docker compose ps
```

Once the toolchain lands (F-001):

```bash
pnpm install
pnpm --filter @irodora/api db:migrate
pnpm dev
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:3001 |
| MinIO console | http://localhost:9001 — `irodora` / `irodora-local-dev` |
| Mailpit | http://localhost:8025 |
| Postgres | `postgres://irodora:irodora@localhost:5432/irodora` |

---

## Verify

```bash
node scripts/verify-state.mjs                    # gate 0 — always
pnpm typecheck && pnpm lint && pnpm test         # gates 1–4
pnpm build                                       # gate 6
```

Run them in order and stop at the first failure — the same discipline CI uses. There is no
value in knowing that gate 6 fails when gate 1 already did.

---

## Reset

```bash
docker compose down -v      # -v drops the volumes: all local data
docker compose up -d
pnpm --filter @irodora/api db:migrate
```

---

## Notes

**Deterministic collation.** Postgres is initialised with an explicit ICU locale. Text
ordering affects colour-name search results, and a locale difference between a workstation
and CI would make search assertions flaky for reasons nobody would guess from the failure
message.

**MinIO uses path-style addressing.** `IRODORA_BLOB_FORCE_PATH_STYLE=1` in `.env`. The same
S3 adapter serves MinIO here and S3 in the cloud profile
([ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md)), which is why the VPS
profile is verified by the same conformance suite rather than tested separately.

**Mail never leaves your machine.** Mailpit catches everything at http://localhost:8025.

**Camera in the browser needs a secure context.** `getUserMedia` requires HTTPS or
`localhost` — `localhost` is treated as secure, so the Lens works locally. Testing from
another device on your network needs a tunnel or a local certificate.

**Mobile needs a development build**, not Expo Go
([ADR-0019](../../adr/0019-mobile-expo-dev-client-new-architecture.md)):

```bash
pnpm --filter @irodora/mobile exec expo run:android    # or run:ios on macOS
```
