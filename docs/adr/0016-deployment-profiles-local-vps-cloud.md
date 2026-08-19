# ADR-0016 — Three deployment profiles behind ports; the VPS profile is first-class

## Status

**Superseded by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** There is nothing to deploy. The
release path is EAS Build and the app stores.

## Date

2026-08-13

## Context

Most products pick a cloud, write against its SDKs, and discover a year later that
self-hosting, region residency or a cost change means a rewrite. The AWS SDK ends up
imported in a service class, `process.env.AWS_REGION` is read in three modules, and
"portable" becomes a slide rather than a property.

Three requirements pull against that default:

1. **Cost and control now.** A single VPS running Coolify or Dokploy is the right
   deployment for this product's first year. It costs a few euros a month and is
   operationally comprehensible by one person.
2. **Data residency later** (NFR-18, privacy design §8). EU/UK data may need to stay
   in-region, and enterprise customers may require self-hosting.
3. **Local development fidelity.** Development against a mocked cloud service produces
   bugs that only appear in production.

The constraint that makes this achievable rather than aspirational: nothing in the product
requires an exotic managed service. It is Postgres, a cache, a queue, object storage and
SMTP — all of which have excellent self-hostable implementations and S3-compatible or
protocol-compatible interfaces.

## Decision

**Three profiles, one image set, every infrastructure dependency behind a port. The VPS
profile is a supported target, not a degraded fallback.**

```
IRODORA_PROFILE = local | vps | cloud
```

| Port | `local` | `vps` | `cloud` |
|---|---|---|---|
| `BlobStore` | MinIO | MinIO / Garage / R2 | S3 |
| `Cache` · `Queue` | Valkey container | Valkey container | ElastiCache |
| `Database` | Postgres container | Postgres container or managed | Aurora Serverless v2 |
| `Mailer` | Mailpit | SMTP | SES |
| `Secrets` | `.env` | platform env | Secrets Manager |
| `KeyManagement` | local master key | local master key | KMS |
| Proxy / TLS | none | Traefik (Coolify/Dokploy) | CloudFront + WAF + ALB |

1. **One conformance suite per port**, which **every** adapter must pass. This is what
   makes the VPS profile first-class rather than best-effort: the same tests prove the same
   behaviour on MinIO and on S3.
2. **No cloud SDK outside an adapter.** Lint-enforced. Application code never imports
   `@aws-sdk/*`.
3. **S3-compatible is the blob interface**, so one adapter serves MinIO, Garage, R2, B2 and
   S3. `IRODORA_BLOB_FORCE_PATH_STYLE` covers the addressing difference.
4. **Containers meet the VPS platform contract**: non-root; `/healthz` (liveness, no
   dependency checks) and `/readyz` (readiness, dependencies checked); configured entirely
   by environment variables; restartable at any moment; declared volumes; migrations at
   boot under an advisory lock so simultaneous starts cannot race.
5. **`infra/compose/docker-compose.prod.yml` is the artefact Coolify and Dokploy consume
   directly** — not a translation of a Kubernetes manifest, not a simplified example. The
   real deployment file.
6. **Every release is exercised on a real VPS** before it ships (roadmap R0 exit).

**Why `/healthz` checks nothing external:** a liveness probe that fails when the database
blips causes the platform to restart a healthy container, turning a brief dependency hiccup
into an outage. Under Coolify and Dokploy the restart happens without much ceremony, so the
distinction matters more, not less.

## Consequences

**Good.** Genuine provider mobility — moving clouds is an adapter, not a rewrite.
Self-hosting and data residency are available without a special build. Local development
runs the same code paths as production. Hosting costs stay proportionate to actual scale.
The VPS profile is verified by the same conformance suite, so "works on the VPS" is a test
result rather than a hope.

**Bad.** The port/adapter layer is real code with real maintenance, and it forgoes some
managed-service ergonomics — we do not get to use an AWS-specific feature without writing a
fallback for the other profiles. Conformance suites must be kept honest; a suite that
cannot fail launders every adapter through it. Multiple profiles means a matrix to test.

**Neutral.** AWS is the first managed target, not the assumed one. Terraform describes the
cloud profile; the VPS profile needs no IaC at all, which is part of its appeal.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **AWS-native, no portability layer** | Less code, faster to build, better integration. Forfeits self-hosting, residency and provider mobility — and retrofitting portability after twenty features is a rewrite, which is the failure this decision exists to prevent |
| **Cloudflare-centric edge** | Excellent global latency and cost for a read-heavy catalog. Constrains the Node runtime, and the worker's long-running optimisation and image jobs do not fit the model |
| **Kubernetes everywhere** | One deployment model at every scale. Enormous operational overhead for three services, and it makes the single-VPS target far harder rather than easier |
| **PaaS only (Fly, Railway, Render)** | Simplest operations, no infrastructure to run. Vendor-shaped, generally more expensive at scale, and does not give customers a self-host option |

## Revisit when

- Managed-service scale genuinely exceeds what a VPS profile can serve, and the cloud
  profile becomes the primary deployment.
- A customer requires an orchestrator we do not support, at which point the containers
  already satisfy the contract and only the packaging changes.
