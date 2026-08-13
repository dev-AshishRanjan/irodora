---
kind: effect
id: E-004
title: The contract → OpenAPI → SDK chain only works while it stays one-way
severity: high
guard: gate:build
confidence: 0.93
created: 2026-08-13
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

CI regenerates and diffs; a stale committed document fails the build. That is the guard.

## What must happen on a contract change

1. Change the schema in `@irodora/contracts` — never the route file, never the document.
2. Regenerate `openapi.json` and `@irodora/sdk`.
3. Update every consumer. The SDK build failure tells you which.
4. **Additive only inside `/v1`.** A break mints `/v2` with a ≥ 12-month sunset.
5. Commit the regenerated document, so the contract diff is visible in review.

## One nuance

**Generating the contract is not a deployment.** A regenerated `openapi.json` in the
repository describes an API that may not be running yet. The document is versioned with the
release that ships it, not with the commit that generated it.
