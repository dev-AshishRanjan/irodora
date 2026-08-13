# Irodora — Architecture

| | |
|---|---|
| **Status** | Baseline for R0 |
| **Version** | 1.0 · 2026-08-13 |
| **Implements** | [`../PRD.md`](../PRD.md) |
| **Decisions** | [`../adr/`](../adr/) |

---

## 1. The shaping constraint

One constraint drives nearly every decision below:

> **The colour engine must produce byte-identical results on every surface, offline,
> forever.**

A trouser recommendation computed in the browser, in the mobile app, in the API and in a
background worker must be the same recommendation. If they can diverge, the product's
central claim — that its answers are reproducible and explainable — is false.

That single requirement (NFR-3) is why the engine is one TypeScript implementation in a
monorepo rather than a service; why it is dependency-free and platform-free; why it is
validated against golden datasets rather than snapshots of itself; and why the version
tuple travels with every result.

---

## 2. System context

```
                         ┌──────────────────────────────────┐
                         │            Visitors               │
                         │  no account · offline capable     │
                         └────────────────┬─────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌───────▼────────┐              ┌─────────▼─────────┐            ┌──────────▼────────┐
│   apps/web     │              │   apps/mobile     │            │  API consumers    │
│   Next.js 16   │              │  Expo · RN 0.86   │            │  Studio · partners│
└───────┬────────┘              └─────────┬─────────┘            └──────────┬────────┘
        │                                 │                                 │
        │   ┌─────────────────────────────┴─────────────────────────────┐   │
        │   │        @irodora/color-* — THE ENGINE, RUNNING LOCALLY      │   │
        │   │  spaces · difference · cvd · harmony · naming · core       │   │
        │   │  Identical code. No network. No platform APIs.             │   │
        │   └───────────────────────────────────────────────────────────┘   │
        │                                 │                                 │
        └─────────────────────────────────┼─────────────────────────────────┘
                                          │  HTTPS · OpenAPI · versioned
                              ┌───────────▼────────────┐
                              │      apps/api          │
                              │  Fastify · modular     │
                              │  monolith              │
                              │                        │
                              │  auth · tenancy        │
                              │  catalog · corpus      │
                              │  profile · wardrobe    │
                              │  recommendation        │
                              │  content · billing     │
                              └───┬────────┬───────┬───┘
                                  │        │       │
              ┌───────────────────┘        │       └──────────────┐
    ┌─────────▼─────────┐        ┌─────────▼────────┐   ┌─────────▼────────┐
    │   PostgreSQL 17   │        │  Valkey / Redis  │   │  S3-compatible   │
    │  system of record │        │  cache · queue   │   │  blob storage    │
    └───────────────────┘        └─────────┬────────┘   └──────────────────┘
                                           │
                                 ┌─────────▼─────────┐
                                 │   apps/worker     │
                                 │ image · reports   │
                                 │ corpus builds     │
                                 │ optimisation jobs │
                                 └───────────────────┘
```

**What the API is *not* for.** Colour identification, harmony, CVD simulation, naming and
personal compatibility never require a round trip. The API serves the catalog, persists
your data, and does the work that genuinely needs a server. This is why the product works
in airplane mode and why our hosting bill does not scale with scans.

---

## 3. Repository and deployment topology

Repository layout and deployment topology are **separate decisions**
([ADR-0001](../adr/0001-monorepo-modular-monolith-with-extraction-triggers.md)):

- **One repository** — because the engine must be one artefact at one version everywhere.
  Cross-repo version drift would turn NFR-3 into a release-coordination problem.
- **Three deployable units** — `api`, `worker`, `web`. Not twelve. There is no scaling
  profile, deploy cadence or team boundary today that justifies a network hop inside a
  single user request.

### Modules inside the API

```
apps/api/src/modules/
  auth/          identity, sessions, passkeys
  tenancy/       tenant · organisation · workspace · membership
  catalog/       colours, palettes — read-heavy, cache-fronted
  corpus/        content versions, provenance, publication
  profile/       personal colour profiles
  wardrobe/      garments, images, outfits
  recommendation/ scoring orchestration (the maths lives in packages/)
  content/       rules, weights, editorial state
  billing/       subscriptions, entitlements, metering
  platform/      health, config, telemetry, errors
```

Modules communicate through **explicit interfaces only**. Reaching into another module's
internals fails `lint`, not code review — a boundary that depends on vigilance is not a
boundary.

### Extraction triggers

A module becomes its own service when **at least two** of these are true. Not before:

1. Its scaling profile diverges materially from the rest of the API.
2. Its deploy cadence must decouple (regulatory, risk or velocity).
3. A distinct team owns it end to end.
4. Its failure must be isolated from the rest of the platform.
5. Its runtime needs differ (a different language, GPU, or a long-running process).

The likely first candidates are `recommendation` (CPU-bound, burst-shaped) and `corpus`
(read-only, globally cacheable). Because both already sit behind an interface and hold no
other module's state, extraction is a deployment change.

---

## 4. Bounded contexts

| Context | Owns | Never owns |
|---|---|---|
| **Colour** | Conversion, difference, contrast, gamut, CVD | Any product concept — it does not know what a garment is |
| **Corpus** | Colour entries, palettes, provenance, versions | User data |
| **Person** | Profiles, preferences, feedback weights | Colour maths |
| **Garment** | Wardrobe items, images, materials | Outfit rules |
| **Outfit** | Slots, combinations, scores, explanations | Persistence |
| **Recommendation** | Weighting, ranking, envelopes | Colour maths, corpus storage |
| **Identity** | Users, tenants, sessions, entitlements | Everything else |
| **Content ops** | Editorial state, rules, weights, review | Runtime scoring |

The **Colour** context knowing nothing about fashion is deliberate. It is what makes the
engine independently testable against physical reference data, publishable as an API, and
correct in a way that has nothing to do with our opinions about trousers.

---

## 5. Packages

```
packages/
  color-spaces/       conversions. Pure. Zero dependencies. WASM-portable.
  color-difference/   ΔE76 · ΔE94 · ΔE00 · ΔEok · WCAG · APCA
  cvd-engine/         Brettel/Viénot · Machado · separation scoring
  color-harmony/      harmony generators
  color-naming/       nearest-match and naming
  color-core/         facade · the Color value type · provenance · envelopes
  corpus/             typed corpus access, version pinning
  recommendation/     rules, weights, scoring, explanation objects
  optimization/       capsule and coverage solvers
  contracts/          shared schemas and types — the wire-format source of truth
  design-tokens/      OKLCH tokens → CSS · TS · RN · Tailwind
  ui/                 shared React primitives
  telemetry/          OpenTelemetry wrappers
  config/             env schema, deployment profiles
  testing/            golden datasets, property helpers, fixtures
```

**Dependency direction is strictly one-way.** `color-spaces` depends on nothing.
`color-core` depends on the colour packages. `recommendation` depends on `color-core` and
`corpus`. Applications depend on packages. **No package ever imports an application.**
A cycle fails `lint`.

The colour packages additionally may not import `node:*`, touch `window`, `document` or
`process`, or add a runtime dependency. Those are lint rules in
[`eslint.config.mjs`](../../eslint.config.mjs), and they exist so the engine cannot
accidentally become platform-specific — which is the failure mode that would quietly
break NFR-3.

---

## 6. Request paths

### 6.1 A colour scan (no network at all)

```
camera frame
  → colour-space metadata (P3 or sRGB, from the platform)
  → exposure / white-balance assessment          ─┐
  → sampling region                               │ FR-17, FR-18
  → spatial pixel sampling (≥1000 px)             │ all local
  → outlier rejection (specular, shadow, edge)    │
  → robust average IN LINEAR LIGHT                │
  → XYZ → Lab / OKLCh                             │
  → nearest corpus match (ΔE00)                   │
  → harmony + personal compatibility              │
  → recommendation with explanation              ─┘
  → frame discarded
```

Nothing leaves the device (NFR-12). The frame is discarded, not cached. This is asserted
in e2e by a network interceptor that fails the test if any image bytes are transmitted.

### 6.2 A catalog read

```
client → CDN (immutable, version-keyed) → API → Valkey → Postgres
```

The corpus is effectively immutable per version, so cache keys include the corpus version
and entries are cached indefinitely. A corpus publish mints a new version rather than
invalidating a cache — which means a publish can never serve a half-updated catalog.

### 6.3 A wardrobe write (offline-first)

```
local write → local DB (source of truth for the client) → outbox
                                                            │  when online
                                                            ▼
                                        sync API → conflict resolution → Postgres
                                                            │
                                                            ▼
                                                    other devices
```

Detail in [`sync-protocol.md`](sync-protocol.md).

---

## 7. Data

PostgreSQL 17 is the single system of record
([ADR-0013](../adr/0013-postgres-drizzle-single-system-of-record.md)). The colour catalog
is highly relational — colours, palettes, roles, sources, versions — and introducing a
second store because the domain is "about colour" would buy nothing and cost consistency.

- **Tenancy** — every user-data table carries `tenant_id` with a row-level-security
  policy. Application code is the second line of defence, not the first
  ([ADR-0017](../adr/0017-multi-tenancy-and-rls-from-day-one.md)).
- **Content versioning** — corpus and rule versions are immutable once published.
- **Search** — Postgres full-text plus `pg_trgm` for fuzzy name matching, and perceptual
  nearest-neighbour computed in the engine over a cached index. No search engine until
  the catalog demonstrably outgrows this.
- **Migrations** — Drizzle, forward-only, reversible by a compensating migration, applied
  under an advisory lock so concurrent boots on a VPS cannot race.

Full schema: [`data-model.md`](data-model.md).

---

## 8. Deployment profiles

One image set, three profiles, selected by `IRODORA_PROFILE`
([ADR-0016](../adr/0016-deployment-profiles-local-vps-cloud.md)):

| Profile | Blob | Cache/queue | Database | Secrets | Proxy |
|---|---|---|---|---|---|
| `local` | MinIO | Valkey container | Postgres container | `.env` | none |
| `vps` | MinIO / Garage / R2 | Valkey container | Postgres container or managed | platform env | Traefik (Coolify/Dokploy) |
| `cloud` | S3 | ElastiCache | Aurora Serverless v2 | Secrets Manager + KMS | CloudFront + WAF + ALB |

Every cloud service sits behind a **port** — `BlobStore`, `Cache`, `Queue`, `Mailer`,
`Secrets`, `KeyManagement` — with an adapter per profile and one conformance suite that
every adapter must pass. This is what makes the VPS profile a first-class target rather
than a degraded mode: the same tests prove the same behaviour on both.

**VPS requirements** (Coolify / Dokploy): containers expose `/healthz` (liveness) and
`/readyz` (readiness, including database reachability), run as non-root, accept
configuration entirely through environment variables, tolerate being restarted at any
moment, and declare their volumes. Migrations run at boot under an advisory lock, so
there is no separate migration step to orchestrate.

---

## 9. Observability

OpenTelemetry throughout — traces, metrics, structured JSON logs
([ADR-0022](../adr/0022-observability-opentelemetry-no-raw-imagery.md)).

**Never logged, never traced, never sent to telemetry:** raw camera frames, wardrobe
images, image buffers, skin-tone estimates, and any personal-colour profile dimension. A
redaction test asserts these cannot reach a sink; it fails the build if a new code path
makes them reachable.

**Dashboards:** API latency by route · engine computation time · recommendation latency ·
5xx rate · database latency · cache hit rate · sync conflict rate · scan failure rate by
cause · mobile crash rate · corpus publish events.

### Analytics events

Product events only, never imagery: `color_scanned` · `color_saved` ·
`recommendation_viewed` · `recommendation_accepted` · `recommendation_rejected` ·
`outfit_created` · `outfit_saved` · `wardrobe_item_added` · `palette_opened` ·
`cvd_mode_enabled` · `profile_completed` · `profile_corrected` · `export_generated`.

Every metric in [PRD §8](../PRD.md#8-success-metrics) derives from an event in this list
or from a named gate. A metric with no instrumentation behind it does not get published.

---

## 10. Security

Full analysis: [`security/threat-model.md`](security/threat-model.md).

The two domain-specific concerns worth stating at architecture level:

**Content is a trust boundary.** The recommendation engine is content-driven — corpus,
palettes and rule weights determine what every user is told. Someone who can write to
content changes the product's behaviour without touching code. Content therefore lives
behind the admin application only, is versioned immutably, is integrity-checked at load,
and every publish is audit-logged with actor and diff.

**Images are hostile input.** Decoding happens in the worker under hard limits on bytes,
pixel count and wall-clock time — never in the API process, so a decoder bomb costs one
worker rather than the platform. Ordinary colour detection uploads no image at all, which
means the largest attack surface is one most users never touch.

---

## 11. Performance strategy

| Concern | Approach |
|---|---|
| Engine hot paths | Typed arrays, precomputed matrices, no allocation in inner loops; WASM only if a measured budget miss demands it |
| Catalog reads | Immutable version-keyed cache at CDN, Valkey and client |
| Recommendation | Candidate generation bounded before scoring; the search space is pruned, not the maths |
| Capsule optimisation | Branch-and-bound with a heuristic seed, hard time budget, best-so-far returned on expiry — a deterministic answer within budget beats an optimal one that never arrives |
| Web | Server components by default; the engine is loaded on the routes that use it, not globally |
| Mobile | Frame processing on a worklet thread; the UI thread never blocks on colour maths |

Budgets are absolute and committed (NFR-4, NFR-5), never baseline deltas — CI hardware
varies, and a delta gate flakes until someone disables it.

---

## 12. What this architecture deliberately refuses

| Refused | Why |
|---|---|
| Microservices at day one | No scaling, ownership or cadence pressure exists; the cost is real and immediate |
| A second database "for colour" | The catalog is relational; a second store buys nothing and costs consistency |
| A search engine at R1 | Postgres FTS + trigram covers the catalog by an order of magnitude |
| Server-side colour computation for scans | Slower, costlier, less private, and offline-incapable |
| A vendor SDK inside the colour engine | Would break WASM portability and platform identity — the one thing that cannot break |
| Lambda for everything | The engine is CPU-bound and latency-sensitive; cold starts are the wrong trade |
| An ML model in the trust path | [ADR-0002](../adr/0002-deterministic-core-tiered-capability-policy.md) |
