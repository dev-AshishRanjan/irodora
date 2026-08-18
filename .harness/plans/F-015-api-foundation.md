# Plan: F-015 — API foundation

| | |
|---|---|
| **Feature** | F-015 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-4, NFR-14 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service** | `apps/api` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-18 |

> **Written directly rather than through the planner subagent**, as F-014 was, and for the same
> recorded reason: both planner-authored plans this session contained a factual error about this
> repository that surfaced during implementation. The deviation is noted, not hidden — the plan
> still exists before any source is edited, and gate 0 enforces that.

---

## Intent

The HTTP surface every later feature hangs off: a Fastify 5 app where **a route cannot exist
without declaring its schemas**, errors are a closed set that never leak internals, mutations are
idempotent, lists are cursor-paginated with hard limits, and the OpenAPI document is generated
rather than written.

To a consumer: the SDK, the web app and the mobile app all import the same schemas the server
validates against, so a contract drift is a compile error rather than a support ticket.

**No domain routes ship here.** The catalog is F-016. What ships is the machinery plus enough
surface to prove it — and, as with the last three features, the machinery arrives before its
data, so the guards must not pass vacuously.

---

## What exists

- **`@irodora/contracts` (F-002)** already owns the wire schemas: `ERROR_CODES_V1` as a closed
  enum, `ERROR_CODE_STATUS` mapping each to an HTTP status, `errorResponseSchema`,
  `cursorSchema`, `pageParamsSchema` with `PAGE_LIMIT_MAX = 100`, and `z.toJSONSchema` helpers.
  **F-015 wires these up; it does not redefine them.** A second error enum here would be the
  duplication defect, and E-004 (contract → OpenAPI → SDK is one direction) exists to say so.
- **`apps/api` (F-005)** is a health-only server: `buildServer`, `/healthz`, `/readyz`,
  `trustProxy: true`, and 142 lines of tests. Its own comment says routing, the Zod type
  provider and OpenAPI are F-015.
- **`apps/api/AGENTS.md`** is binding and stricter than the global harness. Four rules shape
  this feature: every route declares schemas *including every response status*; `/v1` is
  additive-only; `/healthz` and `/readyz` check different things and are not interchangeable;
  colour on the wire carries provenance.
- **`docs/architecture/api-contract.md`** §§5–8 specify errors, idempotency, pagination and rate
  limiting in detail. This feature implements that document; it does not invent a shape.

---

## The problem this feature has, and it is now familiar

Acceptance criterion 2 is *"every route declares schemas for params, query, body and every
response status"*. **There are no domain routes yet.** A check that walks the route table and
finds nothing to complain about is green for a reason that has nothing to do with the rule —
exactly F-011's gate-before-its-data problem, third repeat.

So the enforcement gets the same treatment, deliberately:

1. **A route-registration helper that makes an undeclared schema unrepresentable**, rather than
   a linter that inspects them afterwards. The type system refuses first.
2. **A runtime assertion at boot** over the built route table, which fails if any route under
   `/v1` lacks a response schema for every status it can return.
3. **Decoy routes in the test suite** — registered in an isolated app — that omit a schema and
   are asserted to be rejected. Without them, (1) and (2) are checks nobody has watched fail.
4. **The count printed**: how many routes were verified. `0 domain routes` alongside
   `N foundation routes` so a green run cannot be read as coverage.

---

## Approach

### D1 — The Zod type provider, and why schemas are not optional

Fastify 5 + `fastify-type-provider-zod`. Every route is registered through a **wrapper** —
`route()` in `src/http/route.ts` — whose type signature *requires* a `response` record covering
every status the handler can produce, plus `params`/`query`/`body` where the method implies them.

The wrapper is the mechanism. A raw `app.get()` would bypass it, so:

- ESLint bans `app.get|post|put|patch|delete` outside `src/http/`, with a boundary guard proving
  the rule fires — the `verify-guards.mjs` pattern, which is how every other boundary here is
  proven rather than assumed.
- The boot-time assertion catches anything that still slips through, including routes registered
  by a plugin.

### D2 — Errors: closed enum, mapped status, nothing internal

`ERROR_CODES_V1` is already closed in contracts. F-015 adds the **error handler**:

- Any thrown `ApiError` serialises to `errorResponseSchema` with its mapped status.
- **Anything else becomes `internal_error` / 500 with no detail.** The message, the stack, the
  SQL — none of it reaches a client. The full error goes to the log with a `requestId` that the
  response also carries, so support can correlate without the client ever seeing internals.
- A Zod validation failure becomes `validation_failed` / 422 with the *field paths* but not the
  received values, because a received value can be user data.
- **The decoy:** a route that throws a raw `Error` containing a recognisable secret string; the
  response is asserted not to contain it. Without that, "no internal detail" is a comment.

### D3 — Idempotency

`Idempotency-Key` required on every non-idempotent mutation (POST/PATCH/DELETE under `/v1`),
per api-contract §6. Missing key → `idempotency_key_required`. A repeat with the same key and
the same body returns the stored response; the same key with a *different* body →
`idempotency_key_reused`, which is the case that matters — silently serving the first response
for a different request is worse than failing.

Storage is behind a port. F-015 ships the in-memory adapter and the conformance suite; Valkey
is F-036's concern. **The conformance suite must contain a case verified to fail against a
deliberately broken adapter**, which is this repository's standing rule for port suites.

### D4 — Pagination and rate limiting

Cursor pagination from `pageParamsSchema`, `PAGE_LIMIT_MAX = 100` enforced server-side — a
client asking for 10 000 gets 422, not 10 000. Cursors are opaque and validated.

Rate limiting per IP and per identifier on auth routes. There are no auth routes until F-033, so
what ships is the **plugin plus its configuration surface**, applied to the foundation routes,
with the per-identifier path tested against a decoy identifier rather than left unexercised.

> **DISCOVERED DURING INCREMENT 5, AND IT CHANGES INCREMENT 6'S SHAPE.**
>
> `CachePort`'s own comment says `setIfAbsent` is *"the primitive behind idempotency keys and
> rate limits"*. It is sufficient for the first and **not for the second.** A counter needs an
> atomic read-modify-write; `setIfAbsent` + `get` + `set` is a race two concurrent requests win
> together, and the failure direction is **under-counting** — the limiter admits more than its
> limit, silently, exactly under the load a limiter exists for.
>
> Idempotency was fine because its primitive genuinely is "claim once". Rate limiting is not the
> same shape, and the comment conflates them.
>
> **So increment 6 begins with a port change: `CachePort.increment(key, ttlSeconds): Promise<number>`.**
> Per E-011 that is a change to *every* adapter and to the conformance suite:
>
> - `packages/ports/src/cache.ts` — the method, and why `setIfAbsent` cannot stand in for it
> - `packages/ports/src/memory/cache.ts` — Map-backed, honouring the existing injectable clock
> - `packages/adapters/src/valkey-cache.ts` — `INCR` plus `EXPIRE` on first write; Valkey has
>   this natively, which is part of why the port can afford to require it
> - `packages/ports/src/conformance/cache.ts` — a case for it, **and at least one case verified
>   to fail against a deliberately broken adapter**, which is this repository's standing rule for
>   port suites
>
> Only then the limiter. **Shipping the racy version and recording the gap was considered and
> rejected**: a rate limiter is a security control, and one that under-enforces under concurrency
> is worse than none because it reports a protection it does not provide.

### D5 — OpenAPI generated at build time

`z.toJSONSchema` over the registered routes → `apps/api/openapi.json`, written by a script and
**compared in CI** rather than regenerated silently — the ADR-0043 shape, third application. A
hand-edited document fails; a route added without regenerating fails.

E-004 already says contract → OpenAPI → SDK is one direction. This makes the first arrow real.

### D6 — Health endpoints stay different

`/healthz` checks the process and nothing external. `/readyz` checks database, cache and content
version. That distinction already exists from F-005 and must not erode: a test asserts `/healthz`
still returns 200 while a dependency is down, because a liveness probe that fails on a database
blip turns a hiccup into a restart loop.

---

## Increments

| # | Increment | Verified by | Status |
|---|---|---|---|
| 0 | This plan; `feature_list.json` gains `plan` | `state` | **done** |
| 1 | Dependencies; `ApiError` and the error mapper | `typecheck`, `lint`, `test` | **done** |
| 2 | `route()` wrapper, the boot-time assertion, and the 2020-12 validator | `lint`, `test` | **done** |
| 3 | The ESLint ban + boundary guard #12; health moved onto the wrapper | `lint`, `verify:guards` | **done** |
| 4 | Idempotency over the **existing** `CachePort` — no new port was needed | `test` | **done** |
| 5 | Pagination: the hard limit, and the AJV-does-not-apply-defaults seam | `test` | **done** |
| 6a | **`CachePort.increment`** — port, both adapters, conformance case + broken-adapter case (E-011) | `test` | next |
| 6b | Rate limiting on top of it, per-IP and per-identifier | `test` | |
| 7 | OpenAPI generation + `--check` + the hand-edit decoy | `build`, `test` | |
| 8 | e2e suite via `app.inject`; **activate gate 7**; CI step; mirror proof | `e2e`, `state`, `verify:mirror` | |
| 9 | Docs, effects (E-004), memory, `progress.md` | `state` | |

**Where increments 1–5 landed**, so a fresh session need not go looking:

```
apps/api/src/http/errors.ts        ApiError, mapError — only an ApiError's message is shown
apps/api/src/http/route.ts         route(), assertRoutesDeclared, the per-app registry
apps/api/src/http/validation.ts    the 2020-12 AJV, and the query/body coercion split
apps/api/src/http/health-routes.ts /healthz and /readyz, on the wrapper like everything else
apps/api/src/http/idempotency.ts   claim / replay / conflict, over CachePort.setIfAbsent
apps/api/src/http/pagination.ts    parsePageParams — the hard limit, and the Zod-lens argument
```

**Three findings from those increments that later work depends on:**

1. **AJV is the gate, Zod is the lens.** AJV does not apply Zod's `.default()` or produce its
   brands, so a handler needing either must parse the already-validated input. Pinned in
   `pagination.test.ts`.
2. **Coercion is per request part**, not global: querystring and params coerce, body and headers
   never do. `z.coerce` in a contract schema does **not** run at the server.
3. **`requestId` is branded**, so anything constructing an error response must have parsed one.

---

## Test plan

**Unit and integration** via `app.inject` — no network, no port binding, so the suite is
deterministic and fast.

**Conformance:** the idempotency port, with at least one case proven to fail against a broken
adapter.

**E2E (gate 7, activating here):** the HTTP surface end to end — a request with a valid schema,
one with an invalid schema, a missing idempotency key, a reused key with a different body, an
over-limit page request, a rate-limited burst, `/healthz` and `/readyz`.

**Negative — decoys, never empty fixtures:**

| # | Decoy | Must |
|---|---|---|
| 1 | A route registered without a response schema | be rejected at boot, naming the route |
| 2 | A raw `app.get` outside `src/http/` | fail lint, proven by a boundary guard |
| 3 | A handler throwing an `Error` containing a secret string | return 500 with the secret absent from the body |
| 4 | The same idempotency key with a different body | return `idempotency_key_conflict` (the real code; the plan first named it `idempotency_key_reused`), not the stored response |
| 5 | `limit=10000` | 422, not a large page |
| 6 | A hand-edited `openapi.json` | fail the `--check` |
| 7 | `/healthz` with the database down | still 200 |

Decoys 1, 3 and 4 are the ones that matter: without them, three acceptance criteria are comments.

---

## Verification

```
node scripts/verify-state.mjs && node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:e2e                      # gate 7 — activating here
node scripts/verify-guards.mjs
```

---

## Risks and open questions

- **Gate 7's charter is broader than this feature.** It names Playwright, axe, a keyboard
  journey, a CVD journey and the NFR-12 network assertion — all of which belong to the **web**
  surface (F-017+). Activating it here means gate 7 covers the API half only, and **the gate must
  say so on every run** rather than implying web coverage that does not exist. That is gate 9's
  precedent, and it is the honest way to activate a gate whose charter outruns its subject.
- **Rate limiting has no auth routes to protect yet** (F-033). The per-identifier path is
  exercised against a decoy identifier rather than left dormant.
- **No `OQ-*` blocks this feature.** OQ-1 (OIDC provider) attaches to F-033.
- **Idempotency storage is in-memory here.** That is correct for a single process and wrong for
  a multi-container deployment; the port is the seam, and F-036 supplies the Valkey adapter. The
  limitation is recorded rather than implied away.

## Out of scope

- **Catalog routes and caching — F-016.** **Auth — F-033.** **Tenancy and RLS — F-034.**
- **The generated SDK** — E-004's third arrow; the OpenAPI document is what F-015 owes.
- **Observability beyond a request id — F-036.**
- **Postgres, Drizzle and migrations — F-016 onward.** `/readyz` checks a port, not a schema.
- **Performance thresholds — F-038.**
