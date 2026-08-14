# Deploying on Dokploy

| | |
|---|---|
| **Profile** | `IRODORA_PROFILE=vps` |
| **Decision** | [ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md) |
| **Artefacts** | `infra/compose/docker-compose.prod.yml` · `infra/dokploy/` |

Dokploy is a self-hosted PaaS built around Docker and Traefik. It runs standard Compose
files with little or no modification, which makes it the fastest path from "I have a VPS"
to "the stack is running".

Coolify and Dokploy are both supported and both exercised. Rough rule: **Dokploy to get one
server running quickly; Coolify when you are managing several servers or projects from one
dashboard.**

> **Status as of F-005 (2026-08-14).** The artefacts below now exist and are verified
> locally: `infra/compose/docker-compose.prod.yml` boots all five services healthy, the
> images build and run as uid 1000, and `scripts/verify-compose-portability.mjs` checks the
> compose file against eleven things Dokploy rejects or silently reinterprets.
>
> **What has NOT happened is a deployment to a real VPS through Dokploy.** That needs a
> server and a git remote, and it is recorded as an attested obligation on F-005
> ([ADR-0038](../../adr/0038-every-acceptance-criterion-names-its-check.md)) — it blocks a
> release, not the feature. **Treat the steps below as unexercised** until someone runs them
> and records the result here.
>
> **The `web` service is absent** from the compose file: `apps/web` is a stub with no
> Next.js, so its image cannot be built until F-017.

---

## What you need

- A VPS: **4 vCPU / 8 GB RAM / 80 GB SSD** comfortable. 2 vCPU / 4 GB if Postgres is
  managed elsewhere.
- A domain with DNS you control.
- Dokploy installed:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

---

## Steps

### 1. Create the Compose application

Dokploy → **Create Project** → *Irodora* → **Compose**.

Connect the repository and set:

```
infra/compose/docker-compose.prod.yml
```

Dokploy handles networking, volumes and service definitions as written, and attaches
Traefik routing internally. The compose file needs no Dokploy-specific modification.

### 2. Domains

In the compose service settings:

| Service | Domain | Container port |
|---|---|---|
| `web` | `irodora.com` | 3001 |
| `api` | `api.irodora.com` | 3000 |

Enable HTTPS; Dokploy provisions certificates through Traefik.

`worker` gets no domain. It has no ingress and must not be reachable from outside.

### 3. Environment

Paste from [`.env.example`](../../../.env.example) into Dokploy's environment editor.

Same required changes as the Coolify guide — see
[`coolify.md` §3](coolify.md#3-environment) for the full list. The critical ones:

```
IRODORA_PROFILE=vps
NODE_ENV=production
IRODORA_PUBLIC_WEB_URL=https://irodora.com
IRODORA_PUBLIC_API_URL=https://api.irodora.com
IRODORA_SESSION_COOKIE_DOMAIN=irodora.com
IRODORA_WEBAUTHN_RP_ID=irodora.com
IRODORA_DATABASE_URL=postgres://irodora:<strong>@postgres:5432/irodora
IRODORA_REDIS_URL=redis://valkey:6379
IRODORA_BLOB_ENDPOINT=http://minio:9000
IRODORA_SESSION_SECRET=<openssl rand -base64 32>
IRODORA_KMS_LOCAL_MASTER_KEY=<openssl rand -base64 32>
```

Services address each other by compose service name on the project network.

### 4. Volumes

Declared in the compose file and preserved across deploys: `postgres-data`,
`valkey-data`, `minio-data`.

**Verify they are mounted before the first deploy.** A container recreated without its
volume starts with an empty database, and that failure reads as a fresh install rather than
as data loss — which makes it easy to miss until it is too late to notice quietly.

### 5. Deploy

**Deploy**. Dokploy pulls, builds, waits on healthchecks and configures routing.

Migrations run at boot under an advisory lock, so no separate step is needed.

### 6. Verify

```bash
curl https://api.irodora.com/healthz
curl https://api.irodora.com/readyz
curl -sI https://irodora.com | head -1
```

Then sign in, run a Lens scan, load a colour detail page in both locales, and confirm the
corpus version in a response header.

---

## Backups

Dokploy schedules database backups to S3-compatible destinations. Configure them, then:

> **Restore to a scratch database and query it, weekly.**

MinIO data needs separate backup — `mc mirror` to an off-server bucket on a schedule.

---

## Notes

**Compose compatibility.** Dokploy runs the compose file as written. If a change is ever
needed for Dokploy specifically, it belongs in `infra/dokploy/` as an override — never as a
divergence in the main file, because a divergence means the two platforms are no longer
running the same deployment.

**Traefik labels.** Dokploy generates them from its own configuration. Do not hand-write
Traefik labels in the compose file; they will conflict.

**Resource limits.** Set them per service. The worker's image decoding is memory-hungry and
bounded by `IRODORA_IMAGE_MAX_BYTES` and `IRODORA_IMAGE_MAX_PIXELS`; without container
limits, a decode can still starve the API on a small box.

**Zero-downtime.** Dokploy supports rolling updates with healthchecks. Migrations must be
expand/contract for this to be safe — the old and new versions run simultaneously during
the roll ([`../release-process.md`](../release-process.md)).

**Observability.** Set `IRODORA_OTEL_ENABLED=1` and point the OTLP endpoint at a collector.
