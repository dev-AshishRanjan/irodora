# Operations Runbook

| | |
|---|---|
| **Status** | Baseline · grows with each release |
| **Related** | [`slo.md`](slo.md) · [`incident-response.md`](incident-response.md) · [`deployment/`](deployment/) |

Day-to-day operations. Incident procedures are in
[`incident-response.md`](incident-response.md).

---

## Health

| Endpoint | Checks | Used by |
|---|---|---|
| `GET /healthz` | The process is up. **Nothing external.** | Orchestrator liveness |
| `GET /readyz` | Database and cache reachable; content version loaded | Orchestrator readiness, load balancer |

**`/healthz` deliberately checks nothing external.** A liveness probe that fails when the
database blips causes the platform to restart a perfectly healthy container, turning a
brief dependency hiccup into an outage. Under Coolify and Dokploy the restart happens
without much ceremony, so getting this distinction right matters more, not less.

---

## Routine

| Task | Cadence | Notes |
|---|---|---|
| Verify backup restore | Weekly | **Restore to a scratch database and query it.** A backup nobody has restored is a hope |
| Dependency audit | Weekly | Critical/High blocks the next release |
| Error-budget review | Weekly | Per [`slo.md`](slo.md) |
| Retention jobs healthy | Daily (alert) | A retention job that has not run is a compliance gap, not a nuisance |
| Certificate expiry | Automated + 30-day alert | |
| Corpus checksum verification | Every deploy, plus daily | Detects content tampering ([threat model §9](../architecture/security/threat-model.md)) |
| Log and trace sampling review | Monthly | Confirms redaction still holds |

---

## Common procedures

### Deploy

See [`release-process.md`](release-process.md). Short version: tag → images → staging →
automated verification → production. Every release is exercised on a real VPS through
Coolify or Dokploy first.

### Roll back

```bash
# VPS (Coolify / Dokploy): redeploy the previous image tag from the UI, or
docker compose -f infra/compose/docker-compose.prod.yml pull
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

**A rollback does not undo a database migration.** Expand/contract exists so the previous
version still runs against the new schema
([ADR-0013](../adr/0013-postgres-drizzle-single-system-of-record.md)). If a migration is
not backward-compatible, the release cannot be rolled back — which is why it must be
expand/contract in the first place.

### Publish a corpus version

```
content/ edited → validate → derive → checksum → publish → new immutable version
```

Clients pick it up on their next catalog request. **Nothing is invalidated** — a publish
mints a new version and old cache entries remain valid for anything pinned to them, which
is what makes a half-updated catalog impossible.

### Pin a content version

```bash
IRODORA_CONTENT_VERSION=2026.08.1
IRODORA_RULES_VERSION=2026.08.4
```

Used to freeze behaviour during an investigation, and the first containment step in a
content compromise.

### Rotate a secret

Two-key window, never a replace-in-place:

1. Add the new key alongside the old; both are accepted.
2. Deploy. Confirm the new key is in use.
3. Remove the old key. Deploy.

Replacing in place invalidates every live session at the moment of deploy.

### Scale

**VPS:** vertical first — this workload responds well to more CPU. The engine is CPU-bound
and the catalog is cache-served.

**Cloud:** ECS service autoscaling on CPU and request count. The worker scales on queue
depth, independently, because report generation is burst-shaped.

---

## Diagnosing a slow request

1. Find the trace by `X-Request-Id` — it is in the error response the user was given.
2. Read the span breakdown: engine time, database time, cache time, external time.
3. Engine time high → check candidate-set size. Recommendation cost scales with candidates,
   and an unbounded candidate set is the usual cause.
4. Database time high → check the query plan. RLS adds planning overhead; a missing index
   on a tenant-scoped query is the usual cause.
5. Cache time high or hit rate low → check whether the corpus version in the cache key
   changed unexpectedly. A cache key that varies per request caches nothing.

---

## Diagnosing a bad colour reading

**Without the image**, because we do not have it and do not want it
([ADR-0026](../adr/0026-privacy-on-device-by-default.md)). The measurement metadata answers
almost everything:

| Signal | Reads as |
|---|---|
| `confidence` low + `illumination: mixed` | Working as designed — the user is under two light sources |
| `variance` high | Textured or patterned fabric; precision mode with a larger region |
| `sampleCount` low | Region too small; the UI should have blocked this |
| `quality: poor` | Exposure or blur; the instruction shown to the user should have said so |
| Median and trimmed mean disagree | Strong texture — itself a diagnostic signal |
| Confidence high but the user disagrees | The interesting case. Escalate to the colour lab; it may be a device profile issue |

---

## Alerts

| Alert | Threshold | Severity |
|---|---|---|
| Availability below SLO | Error budget burn rate > 2× | SEV2 |
| p95 latency above budget | 5 min sustained | SEV3 |
| 5xx rate | > 1 % over 5 min | SEV2 |
| Corpus checksum mismatch | Any | **SEV1** |
| Retention job failed | Any | SEV3 |
| Backup failed | Any | SEV2 |
| Sync conflict rate | > 2× baseline | SEV3 |
| Certificate expiry | < 14 days | SEV3 |
| Disk (VPS) | > 85 % | SEV3 |

A corpus checksum mismatch is SEV1 with no threshold and no grace period. There is no
benign explanation for published, immutable content differing from its recorded checksum.
