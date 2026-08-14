# Plan: F-005 — Deployment profiles: local, VPS, cloud

| | |
|---|---|
| **Feature** | F-005 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-18 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `infra/` · `packages/config` · `apps/api` · `apps/worker` · `apps/web` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-08-14 |

---

## Intent

The same artefact runs on a workstation, on a VPS under Coolify or Dokploy, and in a cloud
account — differing by configuration, not by code. The feature note is the argument: *"the
deployment story is R0, not R4. Retrofitted after twenty features it becomes a rewrite."*

Done, to an operator: `docker compose -f infra/compose/docker-compose.prod.yml up` boots the
stack, containers run as non-root off pinned digests, `/healthz` and `/readyz` answer the
questions an orchestrator actually asks, and two containers starting at the same instant do
not both try to migrate.

## What is reachable here, and what is not

Checked before planning rather than discovered at the end.

| # | Criterion | Reachable |
|---|---|---|
| 1 | Multi-stage Dockerfiles, non-root, pinned digests | **Yes** — Docker 29.6.1 is available, so images build and digests resolve |
| 2 | `docker-compose.prod.yml` boots, consumed unmodified by Coolify and Dokploy | **Boots: yes.** "Consumed unmodified" is verified by construction (no platform-specific keys) plus the runbooks, not by running the platforms |
| 3 | `/healthz` process only; `/readyz` database and cache | **Partly** — needs an HTTP server. `apps/api` is a stub with no Fastify; F-015 owns the API. See below |
| 4 | Migrations at boot under an advisory lock; no race | **Yes** — testable by starting containers simultaneously |
| 5 | Every infrastructure dependency behind a port with a conformance suite | **Yes** |
| 6 | Deployed and verified on a real VPS through Coolify AND Dokploy | **No** — there is no VPS, and no remote repository for either platform to pull from |
| 7 | Terraform skeleton with remote state configured | **Skeleton yes; "configured" no** — a real backend needs a cloud account and a state bucket |

**Criteria 6 and 7 are environment-blocked, not design-blocked.** They are delivered as
applicable configuration with their verification recorded as outstanding, the same way
branch protection was in F-004 — and reported as not met rather than folded into a green
summary.

### The health-endpoint question

`/healthz` and `/readyz` appear in **both** F-005 and F-015's acceptance. F-015 is blocked by
F-005, so the endpoints cannot wait for it.

The split that avoids building the API twice: **F-005 owns the deployment contract and the
smallest server that satisfies it** — liveness, readiness, and the readiness checks wired to
the ports below. F-015 mounts the real API around that, and its own criterion becomes
conformance to a contract that already exists rather than a fresh invention.

This is deliberately the minimum. No routing, no Zod type provider, no OpenAPI — those are
F-015's, and building them here would be scope creep dressed as momentum.

## Approach

**Reused:** `@irodora/contracts` for nothing yet (health responses are not a versioned wire
contract until F-015 declares them) · the existing `docker-compose.yml` for local backing
services, which stays as-is — the new file is the *full-stack* one · `.env.example`'s 46
documented variables and the gate that checks them · `docs/operations/deployment/*.md`,
which already describe the three profiles and must now match reality.

**New:**

```
packages/config/src/            env schema (Zod), profile resolution, typed access
packages/ports/                 the port interfaces + the conformance suites
infra/docker/Dockerfile.api     multi-stage, non-root, pinned digest
infra/docker/Dockerfile.worker
infra/docker/Dockerfile.web
infra/compose/docker-compose.prod.yml
infra/terraform/                cloud skeleton
apps/api/src/                   minimal Fastify: /healthz, /readyz
```

### Increments

Each leaves the build green and is committed on its own.

| # | Step | Verified by |
|---|---|---|
| 1 | `@irodora/config` — Zod env schema, profile resolution, fail-fast on a missing variable | test; the env gate in gate 0 |
| 2 | Ports + conformance suites (database, cache, blob) with a deliberately broken adapter proving a case fails | test |
| 3 | Minimal API: `/healthz` (process only), `/readyz` (db + cache via the ports) | test |
| 4 | Migration runner under a Postgres advisory lock | test, and two simultaneous starts |
| 5 | Dockerfiles — multi-stage, non-root, pinned digests | `docker build`, and `docker run` as a non-root uid |
| 6 | `docker-compose.prod.yml` — boots the full stack locally | `docker compose up` observed healthy |
| 7 | Terraform skeleton | `terraform validate` if available; otherwise recorded as not run |
| 8 | Runbooks reconciled; record; effects | gate 0 |

## Files to touch

```
packages/config/**                    NEW  env schema and profiles
packages/ports/**                     NEW  port interfaces + conformance suites
apps/api/src/**                       minimal server, health endpoints
infra/docker/Dockerfile.{api,worker,web}   NEW
infra/compose/docker-compose.prod.yml NEW
infra/terraform/**                    NEW
infra/coolify/**, infra/dokploy/**    platform notes, no platform-specific compose
docs/operations/deployment/*.md       reconcile with what now exists
.env.example                          any new IRODORA_* variable — gate 0 enforces this
.harness/state/*                      progress, feature list
```

## Anticipated effects

| Effect | Dependents | Guard |
|---|---|---|
| **The env contract grows.** Every `IRODORA_*` read by `packages/config` must appear in `.env.example`. | every deployment, all three profiles | Gate 0's `env` check — already active, and this is the first feature that gives it something real to check |
| **The port interfaces are a contract.** Each gets a conformance suite every adapter must pass. | F-041 (offline storage), F-042 (blob), F-044 (sync) | The conformance suites, each containing at least one case verified to fail against a deliberately broken adapter |
| **`/healthz` and `/readyz` semantics.** A liveness probe that checks the database turns a dependency blip into an orchestrator restart loop. | Coolify, Dokploy, the cloud profile, F-015 | Tests asserting `/healthz` stays 200 while the database is down, and `/readyz` does not |
| **Dockerfile base digests** pin reproducibility. | every image build | Pinned by digest, not tag. A digest change is a visible diff |

No existing `E-###` has `infra/` or `packages/config` as its `from`. If the port interfaces
turn out to warrant one — they reach three later features — that is a new effect link inside
this feature, not a note for later.

## Test plan

- **Conformance, per port:** one suite, run against every adapter. Each suite contains at
  least one case **verified to fail** against a deliberately broken adapter — a conformance
  case that cannot fail launders every adapter through it.
- **Health semantics, negative:** with the database stopped, `/healthz` must still return
  200 and `/readyz` must not. Asserted with the dependency actually down, not mocked — a
  mocked outage tests the mock.
- **Migration race, with a real decoy:** start two migrator processes simultaneously against
  one database and assert exactly one performs the migration and both exit 0. A single-process
  test passes whether or not the lock works.
- **Non-root, asserted in the image:** `docker run --rm <image> id -u` must not be 0. A
  `USER` line in a Dockerfile is a claim; the running uid is the fact.
- **Env fail-fast:** a missing required variable must abort at boot with a message naming it,
  not fail later at first use.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security:secrets && pnpm audit --audit-level high
docker build / docker compose up      # observed, and recorded
```

Gates named by the feature: `state`, `build`, `security`.

## Risks and open questions

1. **No VPS, no remote repository.** Criterion 6 cannot be met here. Coolify and Dokploy both
   deploy from a git remote, and there is none. Delivered as runbooks plus a compose file
   built to be consumed unmodified; the deployment itself is recorded as outstanding.
2. **Terraform remote state needs a real backend.** A skeleton with a commented backend block
   is honest; a backend block pointing at a bucket nobody created is a file that looks
   configured and fails on first `terraform init`.
3. **Pinned digests go stale.** A pinned base is reproducible and, by the same property, does
   not receive security updates. The mitigation is a scheduled bump, which is a work item —
   noted here so it is not discovered as a surprise.
4. **This is the largest R0 feature.** Seven criteria across infrastructure, config, ports and
   an HTTP server. Increments are committed individually so an interrupted session leaves
   working state rather than a half-applied stack.

## Revisions

### 2026-08-14 — criteria 6 and 7 reclassified ([ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md))

The plan originally recorded criteria 6 and 7 as "environment-blocked" and left them as prose
in a table. They are now **attested** in `feature_list.json`, which makes them structural:
gate 0 lists them on every run, and their wording is held verbatim against the acceptance
entry so neither can be softened later.

**The substantive change is what replaces them.** Docker simulating production is right for
everything about *behaviour* — the stack boots, healthchecks go green in order, migrations do
not race, images run non-root. It is **not** a substitute for *"consumed unmodified by both
Coolify and Dokploy"*, which is a compatibility claim about two platforms, not a liveness
claim. Swapping one for the other and calling the criterion met would downgrade the claim
while keeping its wording — the ADR-0031 failure applied to our own process.

So the compatibility claim is split rather than substituted:

| Part | How |
|---|---|
| the compose file uses nothing the platforms reject | **gated** — `scripts/verify-compose-portability.mjs`, increment 6 |
| the stack actually boots and behaves | **gated** — `docker compose up`, increments 5–6 |
| TLS, ingress, the platforms' own env injection | **attested** — a real deployment, blocking the release |

Most of the residual risk turns out to be a *static* property of the file, and therefore
lintable: no host bind mounts, no `container_name`, no `network_mode: host`, no published
ports on services behind Traefik, a healthcheck on every service another `depends_on`s, no
`env_file` outside the repository. That check must be proven to fail on a real violation,
like every other guard here.

**Increment 6 grows** to include that script. Increment 7's Terraform skeleton is gated by
`terraform validate`; only "remote state configured" is attested.

## Out of scope

- The real API surface — routes, Zod type provider, OpenAPI, auth: **F-015**.
- Database schema and tenancy: **F-034**. The migration runner lands here with zero
  migrations to run, which is the correct order — the lock is infrastructure, the schema is not.
- Object storage adapters beyond the port and an in-memory conformance target: **F-042**.
- CI publishing images. **F-004** deliberately configured no publish automation.
