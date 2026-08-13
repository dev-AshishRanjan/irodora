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
