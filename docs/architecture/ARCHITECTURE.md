# Irodora — Architecture

| | |
|---|---|
| **Status** | Baseline for R2 — the app |
| **Version** | 2.0 · 2026-08-19 |
| **Implements** | [`../PRD.md`](../PRD.md) |
| **Decisions** | [`../adr/`](../adr/) |
| **Supersedes** | Version 1.0, which described a Fastify/Postgres tier retired by [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) |

---

## 1. The shaping constraint

One constraint drives nearly every decision below:

> **The colour engine must produce byte-identical results on every surface, offline,
> forever.**

That single requirement (NFR-3) is why the engine is one TypeScript implementation in a
monorepo rather than a service; why it is dependency-free and platform-free; why it is
validated against golden datasets rather than snapshots of itself; and why the version
tuple travels with every result.

**The rehaul made this constraint load-bearing rather than aspirational.** In version 1.0
the engine ran on the client *and* on a server, and "identical everywhere" was a property
we had to maintain across two runtimes that could drift. Now there is one runtime. If a
result is wrong, there is exactly one place it came from.

---

## 2. System context

```
                        ┌────────────────────────────┐
                        │          A person          │
                        │  no account · no network   │
                        └─────────────┬──────────────┘
                                      │
                        ┌─────────────▼──────────────┐
                        │        apps/mobile         │
                        │   Expo 57 · RN 0.86 · New  │
                        │   Architecture · iOS+Android│
                        └─────────────┬──────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────▼────────┐          ┌─────────▼─────────┐        ┌──────────▼────────┐
│  @irodora/     │          │   @irodora/store  │        │  corpus bundle    │
│  color-*       │          │  expo-sqlite +    │        │  shipped in the   │
│  THE ENGINE    │          │  SQLCipher, via   │        │  app, digest-     │
│                │          │  Drizzle          │        │  checked at load  │
│  no deps       │          │                   │        │                   │
│  no platform   │          │  THE SYSTEM OF    │        │  immutable per    │
│  APIs          │          │  RECORD           │        │  version          │
└────────────────┘          └─────────┬─────────┘        └───────────────────┘
                                      │
                            ┌─────────▼─────────┐
                            │  the device's     │
                            │  encrypted        │
                            │  filesystem       │
                            │  key in Keychain/ │
                            │  Keystore         │
                            └───────────────────┘

                    ── no network boundary anywhere in this diagram ──
```

**There is nothing above the app.** No API, no database server, no cache, no object store,
no identity provider, no telemetry collector. The absence is the architecture
([ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).

---

## 3. Topology

**One repository, one deployable artefact.** The repository holds the engine, the content
and the app; the artefact is an app-store build.

[ADR-0001](../adr/0001-monorepo-modular-monolith-with-extraction-triggers.md) separated
repository layout from deployment topology and named extraction triggers for pulling
modules into services. **Those triggers are void** — there are no services to extract to.
What survives from that decision is the reason for one repository: the engine must be one
artefact at one version everywhere, and cross-repo drift would turn NFR-3 into a release
coordination problem.

The module boundaries did not go away with the server. They moved into packages, where
`lint` enforces them — a boundary that depends on vigilance is not a boundary.

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
| **Storage** | Schema, migrations, encryption, backup | Any domain rule |

The **Colour** context knowing nothing about fashion is deliberate. It is what makes the
engine independently testable against physical reference data and correct in a way that has
nothing to do with our opinions about trousers.

Two contexts left with the server: **Identity** (users, tenants, sessions, entitlements) has
nothing to own when there is one user and no account, and **Content ops** collapsed into the
build — editorial state is now git state, enforced by the `content` gate.

---

## 5. Packages

```
apps/
  mobile/             the app — Expo Router, screens, camera, navigation

packages/
  color-spaces/       conversions. Pure. Zero dependencies. WASM-portable.
  color-difference/   ΔE76 · ΔE94 · ΔE00 · ΔEok · WCAG · APCA
  cvd-engine/         Brettel/Viénot · Machado · separation scoring
  color-harmony/      harmony generators
  color-naming/       nearest-match and naming
  color-core/         facade · the Color value type · provenance · envelopes
  corpus/             typed corpus access, version pinning, digest verification
  recommendation/     rules, weights, scoring, explanation objects
  optimization/       capsule and coverage solvers
  contracts/          Zod schemas — validation at every trust boundary
  design-tokens/      OKLCH tokens → CSS · TS · RN
  store/              SQLite schema, migrations, repositories, backup
  ui/                 shared React Native primitives over the tokens
  testing/            golden datasets, property helpers, fixtures
```

**Dependency direction is strictly one-way.** `color-spaces` depends on nothing.
`color-core` depends on the colour packages. `recommendation` depends on `color-core`.
`optimization` depends on `recommendation` — **a solver optimises over a score, and never the
reverse**. `store` depends on `contracts`. The app depends on packages. **No package ever
imports the app.** A cycle fails `lint`.

The colour packages additionally may not import `node:*`, touch `window`, `document` or
`process`, or add a runtime dependency. Those are lint rules in
[`eslint.config.mjs`](../../eslint.config.mjs), proven by
[`verify-guards.mjs`](../../scripts/verify-guards.mjs) — which plants a deliberate violation
at each boundary and asserts the rule fires. They exist so the engine cannot accidentally
become platform-specific, which is the failure mode that would quietly break NFR-3.

**`store` is the one new boundary the rehaul created**, and it is deliberately thin: one
interface, one implementation, one conformance suite. Not a port/adapter hierarchy — that
was version 1.0's answer to a question (which database?) that no longer has two answers.

---

## 6. Paths through the system

### 6.1 A colour scan — the path that defines the product

```
camera frame  (worklet thread, YUV — never the UI thread)
  → colour-space metadata (P3 or sRGB, from the platform)
  → exposure / white-balance assessment          ─┐
  → sampling region                               │ FR-17, FR-18
  → spatial pixel sampling (≥1000 px)             │
  → outlier rejection (specular, shadow, edge)    │ all on-device,
  → robust average IN LINEAR LIGHT                │ all synchronous,
  → XYZ → Lab / OKLCh                             │ no await on anything
  → nearest corpus match (ΔE00)                   │
  → harmony + personal compatibility              │
  → recommendation with explanation              ─┘
  → frame discarded
```

Nothing leaves the device (NFR-12). The frame is discarded, not cached.

**How this is asserted changed, and got stronger.** Version 1.0 checked it with a network
interceptor that failed if image bytes were transmitted — which proves the request carried
no image, not that nothing was sent. The e2e charter now asserts that the process **opens no
socket** during the journey. That is a claim about the whole app rather than about one
request.

**Averaging happens in linear light.** Averaging non-linear sRGB is the most common colour
bug there is, and it always makes the result too dark. It is written here because it is the
step most likely to be reimplemented incorrectly by someone optimising the sampling loop.

### 6.2 A corpus read

```
screen → @irodora/corpus → the bundle shipped inside the app
```

There is no cache tier because there is no fetch. The corpus is an immutable, digest-checked
bundle ([ADR-0046](../adr/0046-published-corpus-is-an-immutable-generated-bundle.md)) loaded
from app assets. A corpus correction ships as an app release or an Expo OTA update.

**The digest is still verified even though we shipped the file.** "We built it" is a claim
about the build, not about the bytes on this device.

### 6.3 A wardrobe write

```
user action → validate (Zod) → SQLite transaction → UI reads back from the database
                                      │
                                      └→ change_log row (append-only)
```

There is no outbox and no sync target. The `change_log` table exists anyway: it is the
difference between sync being a *feature we can add* and a *migration we cannot run*, and it
costs about forty lines
([ADR-0014](../adr/0014-offline-first-sqlite-outbox-and-merge-policy.md), amended).

**The UI reads back from the database rather than from memory.** An optimistic in-memory
update that diverges from what was persisted is the bug class that makes local-first apps
feel haunted, and reading back is cheap when the database is a file.

---

## 7. Data

**The SQLite database on the device is the system of record.** There is no other copy.

- **Engine** — `expo-sqlite` with SQLCipher, accessed through Drizzle. Prepared statements
  only.
- **Encryption at rest** — the key is generated on-device at first run and held in the iOS
  Keychain / Android Keystore via `expo-secure-store`. It is never in the bundle, never in
  an environment variable, never in a log. NFR-13.
- **Sync-shaped schema** — every row carries a client-generated UUIDv7 `id`, `updated_at`,
  and a `deleted_at` tombstone; every write appends to `change_log`. Sync is not built.
- **Search** — SQLite FTS5 narrows candidates; perceptual ranking happens in the engine.
  This is [ADR-0008](../adr/0008-search-postgres-fts-with-engine-side-perceptual-ranking.md)
  with Postgres swapped out and its actual decision intact: **the database narrows, the
  engine ranks.** ΔE00 is not a metric and cannot be indexed, which is why a two-stage
  shortlist is the only thing making naming fast at 100k entries.
- **Migrations** — Drizzle, forward-only, applied at app start. No advisory lock, because
  there is exactly one process. A migration that fails leaves the previous version intact
  and surfaces an error the user can act on — an app that silently opens a half-migrated
  database is worse than one that says it cannot start.
- **Backup** — user-initiated export of the whole database, re-importable to a byte-identical
  state. **With no server this is the entire durability story** (FR-58).

Full schema: [`data-model.md`](data-model.md).

---

## 8. Distribution

There is nothing to deploy. There is something to ship.

| | |
|---|---|
| **Build** | EAS Build — iOS and Android, from a Windows workstation (attested in F-039) |
| **Release** | App Store and Google Play |
| **Updates** | App releases; Expo OTA for JS-only changes including corpus corrections |
| **Rollback** | A prior OTA update, or a store rollout halt. **There is no instant rollback** — this is the largest operational difference from a server, and release discipline is what substitutes for it |
| **Signing** | EAS-managed credentials, never in this repository under any name |

The three deployment profiles, the port/adapter conformance suites, the Dockerfiles, the
compose file and the Terraform skeleton are retired
([ADR-0016](../adr/0016-deployment-profiles-local-vps-cloud.md), superseded).

---

## 9. Observability — what we gave up

**There is none, and this is the most expensive consequence of the rehaul.**

No traces, no metrics, no error aggregation, no funnel, no measure of whether a
recommendation was accepted. Product decisions rest on qualitative feedback and store
reviews. [ADR-0022](../adr/0022-observability-opentelemetry-no-raw-imagery.md) is superseded,
and every dashboard and analytics event it specified is withdrawn with it.

That is a deliberate trade for NFR-12, which becomes **absolute rather than conditional** —
the privacy claim needs no qualifier about what telemetry does or does not include, because
there is no telemetry.

The prohibition that decision carried is retained and strengthened: **raw camera frames,
wardrobe images, image buffers, skin-tone estimates and personal-colour profile dimensions
may never be written to any sink.** Version 1.0 enforced this with a redaction test against
a telemetry pipeline. It is now satisfied by construction — there is no sink — but the rule
stays written down, because the first time someone adds crash reporting is exactly when it
will matter and exactly when nobody will remember.

**Adding any diagnostic requires an ADR.** Opt-in, on-device, user-inspectable, and never
carrying the data listed above. It will not arrive quietly.

---

## 10. Security

Full analysis: [`security/threat-model.md`](security/threat-model.md).

The rehaul removed most of the attack surface rather than defending it. No tokens, no
sessions, no CORS, no tenancy isolation, no secrets in the bundle — because there is no
boundary to cross. Whole classes of vulnerability became unreachable.

Three concerns survive, and one of them got harder:

**Content is still a trust boundary.** The recommendation engine is content-driven — corpus,
palettes and rule weights determine what every user is told. Version 1.0 put content behind
an admin application with audit logging. It now lives in this repository, which means the
boundary is **the pull request and the `content` gate**: provenance completeness, roster-id
review identity ([ADR-0047](../adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)),
and a digest verified at load on the device. That is checked on every commit rather than
only in production, which is stronger — but it also means repository write access is now
product write access, and branch protection is a security control rather than hygiene.

**Images are hostile input, and there is no worker to sacrifice.** Version 1.0 decoded
images in a worker process under hard limits, so a decoder bomb cost one worker rather than
the platform. On a device the blast radius is the user's app. Decoding therefore happens
with explicit bounds on pixel count and wall-clock time, off the UI thread, and a failure
must surface as a handled error rather than a crash.

**The database key is the whole of at-rest security.** It lives in the platform keystore.
A key that reaches a log, a crash report or a backup file defeats SQLCipher entirely, which
is why §9's prohibition list is not optional.

---

## 11. Performance strategy

Every budget is now a device budget (NFR-4). There is no network to blame and no server to
scale.

| Concern | Approach |
|---|---|
| Engine hot paths | Typed arrays, precomputed matrices, no allocation in inner loops; WASM only if a measured budget miss demands it |
| Frame processing | Worklet thread, YUV rather than RGB (~2.6× less bandwidth); the UI thread never blocks on colour maths |
| Corpus reads | An immutable bundle in memory; no fetch, no cache invalidation |
| Naming at scale | FTS5 narrows, engine ranks — the shortlist bound is what makes two-stage equal a full scan |
| Recommendation | Candidate generation bounded before scoring; the search space is pruned, not the maths |
| Capsule optimisation | Branch-and-bound with a heuristic seed, hard time budget, best-so-far returned on expiry — a deterministic answer within budget beats an optimal one that never arrives |
| Cold start | The engine is pure computation with no I/O; the corpus bundle is the only load-time cost, and it is memory-mapped rather than parsed eagerly |

Budgets are absolute and committed, never baseline deltas — hardware varies, and a delta
gate flakes until someone disables it. They are measured on the **slowest** device in the
support matrix, because that is the one that fails.

---

## 12. What this architecture deliberately refuses

| Refused | Why |
|---|---|
| A server of any kind | Nothing this product does requires one. [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) names the conditions that would reopen it |
| Sync, for now | The schema is shaped for it and it is not built. Building sync before one device's worth of data exists is the mistake the rehaul corrected |
| A port/adapter layer over SQLite | There is one database and there will be one database. Abstraction over a choice nobody is making is the pattern that produced 4,269 lines serving two health endpoints |
| A second surface (web, desktop) | Until the app earns retention, a second surface is a second maintenance burden and a second storage driver |
| Telemetry that ships anywhere | §9. An opt-in on-device diagnostic needs its own ADR |
| Server-side colour computation | Slower, costlier, less private, offline-incapable — and there is no server |
| A vendor SDK inside the colour engine | Would break WASM portability and platform identity — the one thing that cannot break |
| An ML model in the trust path | [ADR-0002](../adr/0002-deterministic-core-tiered-capability-policy.md) |
| Entitlement checks | [PRD §7](../PRD.md#7-monetisation). A lock that does not lock is worse than no lock |
