# ADR-0051 — Irodora is a local-first mobile app; there is no server tier

## Status

Accepted

## Date

2026-08-19

## Context

R0 and most of R1 are delivered. Reading what actually shipped against what it serves
produced the observation that forced this decision:

- **`apps/api` is 4,269 lines** of Fastify carrying an error envelope, idempotency keys, a
  fixed-window rate limiter, cursor pagination and a generated OpenAPI document. Its <!-- retired-ok: ADR-0051 is the record that retired the server tier. Naming what it retired is its content. -->
  published contract is two paths: `/healthz` and `/readyz`. The e2e suite exercises
  *fixture* routes, and `apps/api/e2e/surface.ts` (readable at the `pre-rehaul-server` tag)
  explains at length why they must never become real ones — because there are no domain
  routes for the machinery to act on.
- **`content/colors/` contains one file: `.gitkeep`.** Zero corpus entries. Meanwhile
  [ADR-0007](0007-colour-corpus-provenance-and-licensing.md),
  [ADR-0046](0046-published-corpus-is-an-immutable-generated-bundle.md) and
  [ADR-0047](0047-editorial-identity-is-a-roster-id-not-a-name.md), a complete provenance
  schema and a mutation-proofed content gate all govern a corpus that does not exist.
- **`feature_list.json` carries 73 features**, 28 of them backlog for R3–R5 — multi-tenancy, <!-- retired-ok: Lists the features this decision cancelled. The list is the evidence for the decision. -->
  RLS, OIDC, passkeys, billing, entitlements, quotas, audit trails, an admin CMS — for a
  product with no users.

The pattern is one thing, not three: **the infrastructure was built before the product.**
Terraform with an AWS provider for zero servers. Rate limiting for zero users. Row-level
security for a single-user wardrobe.

What makes the server removable rather than merely premature is that the PRD already
committed to the properties that make it redundant. FR-12 puts the full engine client-side
with no network. FR-55 requires full core value with no account. NFR-3 requires byte-identical
results on every surface offline. NFR-12 and [ADR-0026](0026-privacy-on-device-by-default.md)
forbid transmitting imagery at all.

If the engine is authoritative offline, the server was never the authority on any answer.
It was a cache, a sync point and a billing boundary. For a personal wardrobe none of the
three is load-bearing at this stage.

The engine itself is not the problem and is not in scope for removal: ~17,300 lines across
`color-spaces`, `color-difference`, `cvd-engine`, `color-harmony`, `color-naming`,
`color-core`, `corpus`, `design-tokens` and `testing`, with zero runtime dependencies, no
`node:*`, no DOM, validated against published golden data. It already runs on-device
unchanged. That is the product.

## Decision

**Irodora ships as a single mobile application. The SQLite database on the device is the
system of record. There is no server, no API, and no account.**

1. **One surface**: `apps/mobile` — Expo SDK 57, React Native 0.86, New Architecture, iOS
   and Android. No web, no desktop, no admin app.
2. **Storage**: `expo-sqlite` with SQLCipher, accessed through Drizzle. The encryption key
   lives in the iOS Keychain / Android Keystore via `expo-secure-store`, never in the bundle.
3. **Retired entirely**: `apps/api`, `apps/worker`, `apps/admin`, `packages/ports`,
   `packages/adapters`, `packages/config`, `infra/`, `docker-compose.yml`. Recoverable
   through the annotated tag `pre-rehaul-server`.
4. **The corpus ships as a signed bundle inside the app**, its digest verified at load by
   the machinery [`packages/corpus/src/digest.ts`](../../packages/corpus/src/digest.ts)
   already provides. Corpus updates ride app releases or Expo OTA.
5. **Durability is the user's export.** Backup, export and verified re-import are a
   first-release feature, not a follow-up. With no server, this *is* the disaster-recovery
   story and it must exist before the product is usable.
6. **The schema is sync-shaped although sync is not built.** Every row carries a
   client-generated UUIDv7 `id`, `updated_at`, and a `deleted_at` tombstone; every write
   appends to a `change_log` table. Roughly forty lines. This keeps the door open without
   building anything behind it.
7. **No monetisation in the first release.** Tiers, entitlements, quotas and the public API
   leave the roadmap rather than being implemented unenforceably.

The engine packages are not modified by this decision. Not one line.

## Consequences

**Good**

- The product's central claims stop depending on a component that could contradict them.
  Offline is not a mode; it is the only mode.
- The attack surface largely disappears. No tokens, no sessions, no CORS, no tenancy
  isolation to get wrong, no secrets in the bundle — because there is no boundary to cross.
  Whole classes of vulnerability become unreachable rather than defended.
- Hosting cost is zero and stays zero at any number of users.
- ~6,900 lines and ~28 features leave the maintenance surface. Roughly 22 features remain
  to build instead of 59.
- Latency budgets collapse to one number that is honest: what the device can do.

**Bad**

- **No cross-device sync.** One phone, one wardrobe. Item 6 keeps this addable; it does not
  make it free.
- **A lost phone is lost data** unless the user exported. We can make export easy and
  prompt for it; we cannot make it automatic without somewhere to put it. This is the
  single largest user-facing regression and it is not fully mitigable.
- **The web acquisition channel closes.** J1 ("first value under 60 seconds, web, no
  account") and FR-20's indexable atlas are withdrawn, not deferred. Discovery becomes an
  app-store and marketing problem with no organic search path.
- **We learn nothing about usage.** No telemetry means product decisions rest on
  qualitative feedback alone.
- **App Store review** enters the release path for the first time.
- **Corpus corrections require a release.** A wrong colour value is visible until an
  update ships.
- Entitlement enforcement becomes impossible, which is why item 7 removes monetisation
  rather than implementing something defeatable.

**Neutral**

- "Scalable" is redefined: 10,000 wardrobe items and a 100k-entry corpus responsive on a
  four-year-old mid-range Android, rather than 1,000 rps. NFR-7 is rewritten, not dropped.
- Search moves from Postgres FTS to SQLite FTS5, superseding
  [ADR-0008](0008-search-postgres-fts-with-engine-side-perceptual-ranking.md). The
  engine-side perceptual ranking half of that decision is unaffected.
- The verification harness is retained in full for the engine. The gates that caught a
  duplicate JSON key silently disabling the contrast gate, and 37 of 38 tokens whose hex
  disagreed with their own OKLCH, are the reason the engine is trustworthy. Scope shrinks;
  rigour does not.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep the server, stop adding to it** | Good at: preserving sync, web SEO and monetisation optionality at no immediate cost. Not enough: the API serves two health endpoints, so "keeping" it means carrying 4,269 lines, a Postgres and Valkey dependency, two Dockerfiles, a Terraform skeleton and ~28 roadmap features to preserve options for a product with no users. The cost is paid continuously; the option is exercised never. |
| **Mobile + static web PWA from one Expo Router tree** | Good at: preserving a discovery channel and costing far less than a Next.js app. Not enough: Expo's web SQLite support is documented as alpha and OPFS needs `SharedArrayBuffer` with COOP/COEP headers, so web needs a second storage driver and a second conformance suite. And a static export has no SSR, so the SEO it preserves is weak — paying real complexity for a fraction of the benefit. Revisit once the app exists. | <!-- retired-ok: An alternative considered and rejected. Rejected options necessarily name what they would have built. -->
| **Local-first with an optional sync server** | Good at: the honest long-term shape of this product. Not enough: it is the same server, deferred. Building sync before a single user has one device's worth of data is the mistake this ADR corrects. Item 6 makes it a later feature rather than a later rewrite. |
| **Keep the API purely as a corpus CDN** | Good at: shipping corpus corrections without an app release. Not enough: a corpus bundle is a static file. If it ever needs distribution, that is object storage and a digest check — not Fastify, Postgres and Valkey. |
| **Delete the harness too, as part of "simplifying"** | Good at: it is what "we over-engineered this" usually means. Not enough: the harness is what made the engine correct. Its gates caught defects that human review missed, on record in F-003. Deleting it would repeat the original error in the opposite direction. |

## Revisit when

- **Sync**: more than 30% of surveyed users report wanting a second device, or support
  requests about lost data after a device change exceed 5% of contacts.
- **A server of any kind**: a feature is specified that provably cannot run on-device —
  not merely one that would be easier off it.
- **Web**: app-store discovery is measured and found insufficient, *and* the app's own
  retention justifies spending on a second surface.
- **Monetisation**: there are enough retained users that pricing is answerable with data
  rather than a guess.
