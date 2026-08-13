# Deploying on AWS

| | |
|---|---|
| **Profile** | `IRODORA_PROFILE=cloud` |
| **Decision** | [ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md) |
| **Artefacts** | `infra/terraform/` — skeleton with F-005, full resources when the cloud profile is first needed |

The managed target, for when scale or compliance justifies its cost and complexity. **The
VPS profile ([`coolify.md`](coolify.md), [`dokploy.md`](dokploy.md)) is the recommended
deployment until then** — it is a first-class target, not a stepping stone.

---

## Topology

```
                Route 53
                    │
              CloudFront  ─────  WAF
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
   S3 (static)        Application Load Balancer
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              ECS Fargate               ECS Fargate
              irodora-api               irodora-web
                    │
                    ├────────────────────────────────┐
                    ▼                                ▼
              ECS Fargate                    ┌───────────────┐
              irodora-worker  ◄──── SQS      │ Aurora Serverless v2
                    │                        │ PostgreSQL 17 │
                    ▼                        └───────────────┘
                   S3                                │
              (images, reports)              ElastiCache (Valkey)

  Secrets Manager · KMS · CloudWatch · OTel Collector
```

---

## Why these services

| Choice | Reason |
|---|---|
| **ECS Fargate**, not Lambda | The engine is CPU-bound and latency-budgeted (NFR-4). Cold starts are the wrong trade for a 200 ms p95 |
| **Aurora Serverless v2** | Scales to the workload; the catalog is read-dominated and cache-fronted, so sustained capacity is low |
| **ElastiCache (Valkey)** | Same protocol as the container in other profiles, so one adapter |
| **SQS** behind the `Queue` port | The worker is burst-shaped; queue depth is the natural scaling signal |
| **CloudFront + WAF** | The corpus is immutable per version, so catalog reads should barely reach the origin |
| **KMS** | Envelope encryption for wardrobe imagery (NFR-13) |

---

## Terraform layout

```
infra/terraform/
├── modules/
│   ├── network/          VPC, subnets, security groups
│   ├── data/             Aurora, ElastiCache, S3
│   ├── compute/          ECS cluster, services, task definitions
│   ├── edge/             CloudFront, WAF, ACM, Route 53
│   └── observability/    CloudWatch, OTel collector
└── environments/
    ├── staging/
    └── production/
```

Remote state in S3 with DynamoDB locking. **State is never committed** — see
[`.gitignore`](../../../.gitignore).

---

## Configuration differences from the VPS profile

Only the adapters change. Application code is identical.

| Setting | Value |
|---|---|
| `IRODORA_PROFILE` | `cloud` |
| `IRODORA_BLOB_ENDPOINT` | *(unset — the AWS SDK resolves it)* |
| `IRODORA_BLOB_FORCE_PATH_STYLE` | `0` — S3 uses virtual-hosted style |
| `IRODORA_KMS_PROVIDER` | `aws` |
| `IRODORA_KMS_KEY_ID` | The KMS key ARN |
| `IRODORA_DATABASE_MIGRATE_ON_BOOT` | `0` — migrations run as their own ECS task |
| `IRODORA_MAIL_TRANSPORT` | `ses` |

Secrets come from Secrets Manager, injected as task-definition secrets. **No secret is ever
a plaintext environment variable in a task definition**, where it would be visible to
anyone with `ecs:DescribeTaskDefinition`.

---

## Migrations

Unlike the VPS profile, migrations run as a **separate ECS task before the service
update**, not at boot:

```
terraform apply → run migration task → wait for success → update service
```

Boot-time migration is right for the VPS profile, where there is no orchestrator to
sequence a separate step and the advisory lock handles concurrent starts. With an
orchestrator available, a distinct step gives a clearer failure boundary — a failed
migration stops the deploy rather than producing a service that fails to start.

---

## Scaling

| Service | Signal | Range |
|---|---|---|
| `api` | CPU 60 %, ALB request count | 2 → 20 |
| `web` | CPU 60 % | 2 → 10 |
| `worker` | SQS queue depth | 0 → 10 |
| Aurora | ACU auto | 0.5 → 16 |

`worker` scales to zero. Reports and exports are burst-shaped, and paying for idle capacity
between them is unnecessary.

---

## Cost

Roughly, at low volume: Aurora Serverless v2 dominates, then Fargate, then CloudFront and
S3. Compare against a single VPS running the same stack — **the difference is large enough
that the cloud profile should be a deliberate decision driven by scale or a compliance
requirement, not a default.**

---

## Regions and residency

EU/UK data can be kept in-region by deploying a separate stack per region. Because every
infrastructure dependency sits behind a port, this is a Terraform workspace and a set of
DNS records — not an architectural change
([`../../compliance/data-governance.md`](../../compliance/data-governance.md) §7).

---

## Verify

```bash
curl https://api.irodora.com/healthz
curl https://api.irodora.com/readyz
aws ecs describe-services --cluster irodora --services api web worker
```

Then the same functional checks as any other profile: sign in, Lens scan, colour detail in
both locales, corpus version in the response header.
