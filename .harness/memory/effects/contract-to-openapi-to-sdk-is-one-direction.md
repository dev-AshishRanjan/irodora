---
kind: effect
id: E-004
title: The contract → OpenAPI → SDK chain only works while it stays one-way
severity: high
guard: test:apps/api/src/openapi.test.ts
confidence: 0.93
created: 2026-08-13
updated: 2026-08-19
scope: [packages/contracts, apps/api, apps/web, apps/mobile, apps/admin]
links: [[the-color-type-reaches-every-surface]]
---

# Contract → OpenAPI → SDK is one direction

```
Zod schemas → runtime validation + types → openapi.json → @irodora/sdk → every consumer
```

## The property this buys

**A breaking contract change fails in our CI before it reaches anyone else's production.**

Because our own web, mobile and admin apps consume the generated SDK exactly as an external
developer would, a change that breaks a consumer breaks the SDK build first. We are the
first users of every contract change, which is also why the contract's ergonomics get
exercised rather than assumed.

## How it gets severed

**By hand-editing `openapi.json`.** It is a build output. Editing it makes the document
describe something the implementation does not do, and from that moment the SDK is generated
from a fiction.

CI regenerates and compares; a stale committed document fails. That is the guard — and note
what it is *not*: it was recorded as `gate:build` for eighteen months of plan time, and a build
has never compared anything. Generating an artefact and checking it are different acts, and
naming the wrong one made the graph look guarded while nothing was watching.

## What must happen on a contract change

1. Change the schema in `@irodora/contracts` — never the route file, never the document.
2. Regenerate `openapi.json` and `@irodora/sdk`.
3. Update every consumer. The SDK build failure tells you which.
4. **Additive only inside `/v1`.** A break mints `/v2` with a ≥ 12-month sunset.
5. Commit the regenerated document, so the contract diff is visible in review.

## What exists today, and what does not — as of F-015 (2026-08-19)

| Link | Status |
|---|---|
| Zod schema → runtime validation → inferred types | **live** — `pnpm typecheck`, `pnpm test` |
| Zod schema → JSON Schema | **live** — every exported schema is asserted convertible to draft 2020-12, by a test that enumerates the barrel's own exports so it cannot fall behind |
| JSON Schema → `openapi.json` | **live since F-015** — built from the route registry by `apps/api/src/openapi.ts`, written by `scripts/generate-openapi.mjs` |
| the regenerate-and-compare check | **live since F-015** — `openapi.test.ts` under gate 4 and `pnpm openapi:check` in CI |
| `openapi.json` → `@irodora/sdk` → consumers | **still not built** — F-057 |

**The second arrow is the one still missing**, and it carries the property this link exists for.
"A contract change breaks the SDK build before it reaches anyone else's production" is not yet
true, because nothing generates the SDK. What *is* true today is narrower and worth stating
exactly: a contract change that is not reflected in the committed document fails gate 4.

Two things F-015 learned while making the third arrow real:

- **The `io` argument earns its keep at the document boundary.** A field with a `.default()`
  published as `output` is *required*, which is a contract wrong in the one direction clients
  cannot work around. Requests are `input`, responses are `output`, and the generator is where
  getting that backwards becomes visible to every consumer at once.
- **A route with a path parameter and no `params` schema was legal.** Fastify serves it and
  validates nothing; the document would have had to invent a type for an input the server never
  checks. Generating the document is what surfaced it — the third leg of ADR-0012 finding a hole
  the first two could not see. `route()` now refuses it, and refuses a schema naming the *wrong*
  parameter.

## One nuance

**Generating the contract is not a deployment.** A regenerated `openapi.json` in the
repository describes an API that may not be running yet. The document is versioned with the
release that ships it, not with the commit that generated it.
