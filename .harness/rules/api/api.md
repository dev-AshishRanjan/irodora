# API Rules

`apps/api`, `apps/worker`, `packages/contracts`. Contract:
[`api-contract.md`](../../../docs/architecture/api-contract.md).

---

## Every route declares schemas

Params, query, body, **and every response status**. A route without response schemas cannot
appear in the generated OpenAPI document, so the contract silently omits it.

Schemas live in `@irodora/contracts`, not in the route file — the web app, mobile app and
SDK import the same definitions the server validates against.

**The handler receives the parsed type. It never sees an unvalidated shape.**

---

## Additive only inside a version

Permitted in `/v1`: new endpoints · new optional request fields · new response fields.

Never inside a version: removing or renaming a field · narrowing a type · changing a
default · changing an error code's meaning · changing what an existing field means.

A break mints `/v2`, and `/v1` runs for **at least 12 months** with `Deprecation` and
`Sunset` headers.

---

## Tenancy

**`tenant_id` comes from the authenticated session. Never from a request field.** Ever.

Set it per connection; a missing value **raises**, and does not fall through to an
unscoped query. Failing open on a tenancy boundary is the worst available default.

**404, not 403, for another tenant's resource.** A 403 confirms the id exists, which is a
free enumeration oracle.

---

## Errors

```jsonc
{ "error": { "code": "colour_out_of_gamut", "message": "…", "details": {}, "requestId": "…" } }
```

- Codes are a **closed, versioned enum** in `@irodora/contracts`. Clients switch on them,
  so a typo'd string in one handler is a broken client.
- **Never leak internals** — no stack traces, no SQL, no file paths.
- Always return `requestId`; it is the user's handle into our traces.

---

## Idempotency

Every non-idempotent mutation requires `Idempotency-Key`.

| Case | Behaviour |
|---|---|
| Same key, same body | Return the stored response. No second write |
| Same key, different body | `409` |
| No key on a mutating route | `400` |

Mobile clients retry on flaky networks. A duplicate wardrobe item created by a retry is a
data-quality bug the user has to clean up by hand.

---

## Pagination

**Cursor-based only.** Opaque, signed cursors encoding the sort key and direction.

Offset pagination skips and duplicates rows when the underlying set changes mid-scroll —
which is exactly what a catalog does while an editor is publishing.

**A cursor encodes a sort order, not just a position.** Changing the sort invalidates the
cursor; it must not be silently reinterpreted against a different ordering.

---

## Caching

- Catalog responses: `Cache-Control: public, max-age=31536000, immutable`, with the
  **corpus version in the cache key**.
- A publish mints a new version rather than invalidating, so a half-updated catalog cannot
  be served.
- **Locale is part of the cache key.** So is any content that varies by it.
- Authenticated responses: `private, no-store`, unless deliberately and demonstrably safe.

---

## Health

| Endpoint | Checks |
|---|---|
| `/healthz` | The process. **Nothing external** |
| `/readyz` | Database, cache, content version loaded |

A liveness probe that fails when the database blips causes the orchestrator to restart a
healthy container — turning a brief hiccup into an outage. Under Coolify and Dokploy that
restart happens quickly and without ceremony, so the distinction matters more, not less.

---

## Workers

- Jobs are **idempotent**. They will be retried.
- Every job is bounded — time, memory, retries.
- **Image decoding happens only in the worker**, never in the API process, under hard
  limits on bytes, pixel count and wall-clock time.
- Failures go to a dead-letter queue with enough context to diagnose. Nothing is silently
  dropped.

---

## Never

- Build SQL by string concatenation. Lint-enforced.
- Trust a client-supplied type, id, tenant, price or entitlement.
- Log a secret, a token, an image, or a profile dimension.
- Return an unbounded collection.
- Perform an external call without a timeout.
- Fetch a URL supplied by a client. No SSRF surface — uploads only.
