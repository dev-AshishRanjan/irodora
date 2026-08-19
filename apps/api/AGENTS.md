# AGENTS.md — `apps/api`

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** Stricter, never looser.

Fastify 5 modular monolith. Zod schemas are the single source of validation, types and
OpenAPI.

---

## Module boundaries are real

```
src/modules/
  auth · tenancy · catalog · corpus · profile
  wardrobe · recommendation · content · billing · platform
```

Each registers as a Fastify plugin with its own scope. **Cross-module access goes through a
declared interface**, not a direct import — lint-enforced.

The boundaries are what make a module extractable later as a deployment change rather than a
refactor ([ADR-0001](../../docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md)).

## Tenancy is the highest-stakes rule here

- **`tenant_id` comes from the authenticated session. Never from a request field.** Ever.
- Set per connection. **A missing setting raises**; it does not fall through to an unscoped
  query. Failing open on a tenancy boundary is the worst available default.
- RLS with `ENABLE` **and** `FORCE`. Without `FORCE` the table owner bypasses the policy, and
  the migration role is usually the owner.
- **404, never 403**, for another tenant's resource. A 403 confirms the id exists.
- The negative test needs a **populated decoy tenant** — against an empty one it passes
  whether or not the policy works. [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]

## Every route declares schemas

Params, query, body, **and every response status**. A route without response schemas cannot
appear in the generated OpenAPI document, so the contract silently omits it.

Schemas live in `@irodora/contracts`, so the web app, mobile app and SDK import what the
server validates against.

**Register through `route()` in `src/http/`, never through a bare `app.get`.** The wrapper is
what enforces all of this; ESLint bans the bare form outside `src/http/`, and boundary guard #12
proves that rule fires rather than assuming it. The wrapper refuses, with a message naming the
route:

- a route declaring **no 2xx** — the document would describe an endpoint that can only fail
- a **path parameter with no `params` schema**, or one the schema does not name. Fastify serves
  `/v1/x/:slug` without a schema and validates nothing, so the document would have to invent a
  type for an input the server never checks — and `:slug` against a schema naming `id` is a
  rename that validates nothing and publishes a phantom
- a **mutating method with no body schema and no stated `idempotencyExemptBecause`** — an
  unexplained exemption is one nobody can evaluate later

It **adds** 500 to every route, and 422 wherever there is input to validate, rather than making
each author write them out. What an author declares is the domain; what the framework can
produce, the framework documents.

## Cross-cutting behaviour belongs to the assembled server, not to a module

The error handler, the correlation id, the rate limiter and the idempotency hooks live in
`src/http/lifecycle.ts` and are installed by `buildServer`. That is not organisation — it is
the lesson F-015 paid for. Increments 1–6 built every one of those mechanisms with passing
tests, and **none of them was attached to the server**: a thrown `Error` went out as the
framework's default 500 carrying its own message.

A unit test proves a function behaves; only a request through the whole stack proves it runs.
So anything cross-cutting is **exercised through `app.inject` in `e2e/`**, and the proof is that
unwiring it turns cases red.
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]

## `openapi.json` is derived, never edited

`apps/api/openapi.json` is generated from the route registry and compared byte for byte, by
`src/openapi.test.ts` and by `pnpm openapi:check`. Change a schema, run
`pnpm --filter @irodora/api generate:openapi`, commit the result. Editing the document by hand
makes the SDK generated from it a fiction ([E-004](../../.harness/state/effects.json)).

## Additive only inside `/v1`

New endpoints, new optional request fields, new response fields. **Never** removing or
renaming a field, narrowing a type, changing a default, or changing an error code's meaning.

A break mints `/v2` with a ≥ 12-month sunset.

## Health endpoints are not interchangeable

| | Checks |
|---|---|
| `/healthz` | The process. **Nothing external** |
| `/readyz` | Database, cache, content version loaded |

A liveness probe that fails when the database blips causes the orchestrator to restart a
healthy container — turning a brief hiccup into an outage. Under Coolify and Dokploy that
restart is quick and unceremonious, so the distinction matters more, not less.

## Colour on the wire carries provenance

Always. Explanation `detail` is a **message key**, never a sentence — the same response must
render in English and Japanese, and a server returning prose has made the locale decision
for the client, wrongly.

Every response carries its reproducibility envelope, stored as **four indexed columns**, not
a JSON blob — "which recommendations used rule version 2026.08.4?" gets asked every time a
ranking change is investigated.

## Images are hostile input

Decoding happens **only in the worker**, never in this process. Hard limits on bytes, pixel
count and wall-clock time, enforced before full decode. Content type by magic bytes. EXIF
stripped. **No fetch-by-URL, ever** — no SSRF surface.

## Migrations

Forward-only. **Expand/contract** for anything destructive, across separate releases — a
migration that drops a column in the same release that stops writing it cannot be rolled
back, and the release checklist requires that the previous image runs against the new schema.

Applied at boot under `pg_advisory_lock`: simultaneous container starts are the normal case
on a VPS, not an edge case.

## Before you start

[`.harness/rules/api/api.md`](../../.harness/rules/api/api.md) ·
[`.harness/rules/security/security.md`](../../.harness/rules/security/security.md) ·
[`docs/architecture/api-contract.md`](../../docs/architecture/api-contract.md) ·
[`api-design`](../../.harness/skills/api-design/SKILL.md).
