# Deploying on Coolify

| | |
|---|---|
| **Profile** | `IRODORA_PROFILE=vps` |
| **Decision** | [ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md) |
| **Artefacts** | `infra/compose/docker-compose.prod.yml` · `infra/coolify/` — land with F-005 |

Coolify is a self-hosted PaaS: it manages Docker, Traefik, TLS and environment
configuration on your own server. It is the recommended target when you want one dashboard
across several servers or projects.

---

## What you need

- A VPS: **4 vCPU / 8 GB RAM / 80 GB SSD** is comfortable for the full stack.
  2 vCPU / 4 GB works if Postgres is managed elsewhere.
- A domain with DNS you control.
- Coolify installed on the server.

---

## Topology

```
                    Traefik  (managed by Coolify, TLS via Let's Encrypt)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   irodora-web    irodora-api   (irodora-worker, no ingress)
   :3001          :3000
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
     postgres        valkey         minio         (SMTP, external)
     volume          volume         volume
```

---

## Steps

### 1. Create the project and resource

Coolify → **New Project** → *Irodora* → **New Resource** → **Docker Compose**.

Point it at the repository and set the compose file to:

```
infra/compose/docker-compose.prod.yml
```

Coolify reads the compose file directly — services, volumes and healthchecks are used as
written. It is not a translation of something else; it is the deployment file.

### 2. Domains

| Service | Domain |
|---|---|
| `web` | `irodora.com` |
| `api` | `api.irodora.com` |

Coolify configures Traefik and issues certificates. `worker` gets no domain — it has no
ingress and must not be reachable.

### 3. Environment

Paste from [`.env.example`](../../../.env.example) into Coolify's environment editor and
set real values.

**Must change from the example:**

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

IRODORA_SESSION_SECRET=<32+ random bytes, base64>
IRODORA_KMS_LOCAL_MASTER_KEY=<32 random bytes, base64>
IRODORA_BLOB_ACCESS_KEY_ID=<generated>
IRODORA_BLOB_SECRET_ACCESS_KEY=<generated>

IRODORA_OTEL_ENABLED=1
```

Generate secrets:

```bash
openssl rand -base64 32
```

**Internal service names, not localhost.** Containers reach each other by compose service
name on the project network. `localhost` inside a container is that container.

### 4. Persistent volumes

Declared in the compose file; Coolify creates and preserves them across redeploys.

| Volume | Holds |
|---|---|
| `postgres-data` | The database |
| `valkey-data` | Cache and queue (AOF persistence) |
| `minio-data` | Wardrobe images and generated reports |

**Confirm these are attached before the first deploy.** A container recreated without its
volume starts with an empty database, and the failure looks like a fresh install rather
than data loss — which is worse, because it does not read as an error.

### 5. Health checks

The compose file declares them:

```yaml
healthcheck:
  test: ['CMD', 'node', '-e', "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Coolify waits for dependency health before starting dependent services, and routes traffic
only to healthy instances.

`/healthz` checks the process only. `/readyz` checks dependencies. That separation matters
here specifically: a liveness probe that fails when Postgres blips causes Coolify to restart
a healthy container, turning a brief hiccup into an outage.

### 6. Deploy

**Deploy**. Coolify pulls, builds, starts in dependency order and configures Traefik.

Migrations run at boot under a Postgres advisory lock
(`IRODORA_DATABASE_MIGRATE_ON_BOOT=1`), so simultaneous starts cannot race and there is no
separate migration step to orchestrate.

### 7. Verify

```bash
curl https://api.irodora.com/healthz     # {"status":"ok"}
curl https://api.irodora.com/readyz      # {"status":"ok","database":"ok","cache":"ok"}
curl -sI https://irodora.com | head -1   # HTTP/2 200
```

Then: sign in, run a Lens scan, open a colour detail page in both locales, and confirm the
corpus version in an API response header.

---

## Backups

Coolify can schedule Postgres backups to S3-compatible storage. Configure them, and then
do the part everyone skips:

> **Restore to a scratch database and query it, weekly.** A backup nobody has restored is a
> hope, not a backup.

MinIO data needs its own backup — `mc mirror` to an off-server bucket on a schedule.

---

## Updating

Push to `main`, or trigger a redeploy. Coolify rebuilds and restarts.

Roll back by redeploying the previous image tag. Note that a rollback does not undo a
migration — expand/contract exists so the previous version still runs against the new
schema ([`../release-process.md`](../release-process.md)).

---

## Notes

**Resources.** Set limits per service in the compose file. The API is CPU-bound under
recommendation load; the worker is memory-bound during image decoding. Without limits, an
image decode can starve the API on a small box.

**Object storage.** MinIO on the same server is simplest. For durability, point
`IRODORA_BLOB_*` at Cloudflare R2 or Backblaze B2 instead — both are S3-compatible, so it
is a configuration change with no code impact, which is the entire point of the port.

**Postgres.** Running it in a container is fine and is what most single-server deployments
do. A managed Postgres removes backup and upgrade responsibility; point
`IRODORA_DATABASE_URL` at it and drop the service.

**Observability.** Set `IRODORA_OTEL_ENABLED=1` and point
`IRODORA_OTEL_EXPORTER_OTLP_ENDPOINT` at a collector. Self-hosting SigNoz or an OTLP
collector on the same Coolify instance is a reasonable starting point.
