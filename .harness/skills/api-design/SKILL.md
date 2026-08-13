---
name: api-design
description: Add or change an API endpoint so the schema, the types, the OpenAPI document and the SDK stay one artefact.
---

# Skill: api-design

Rules: [`api.md`](../../rules/api/api.md) ·
Contract: [`api-contract.md`](../../../docs/architecture/api-contract.md) ·
[ADR-0012](../../../docs/adr/0012-backend-fastify-zod-openapi.md) ·
[ADR-0025](../../../docs/adr/0025-api-first-and-generated-sdk.md).

## The direction is one-way

```
Zod schema (in @irodora/contracts)
   ├─→ runtime validation
   ├─→ TypeScript types
   └─→ OpenAPI → @irodora/sdk → web · mobile · admin · external
```

**Never hand-write the OpenAPI document.** It is a build output; editing it is editing a
build output.

## Adding an endpoint

1. **Schema first, in `@irodora/contracts`** — request and **every** response status. A
   route without response schemas cannot appear in the generated document, so the contract
   silently omits it.
2. **Name the error codes** from the closed enum. New code → add it to the enum, so clients
   can switch on it.
3. **Register the route** with the schemas. The handler receives the parsed type.
4. **Decide the shape:**
   - Public and cacheable? Version-keyed cache headers.
   - Authenticated? Tenant scoping is **from the session, never a request field**.
   - Mutating? `Idempotency-Key` required.
   - Returns a list? Cursor pagination, hard limit.
5. **Regenerate** OpenAPI and the SDK. CI diffs them; a stale committed document fails the
   build.
6. **Update consumers.** They are downstream of the contract — effect link
   [E-004](../../state/effects.json).

## Changing one

**Additive only inside `/v1`:** new endpoints, new optional request fields, new response
fields.

**Never inside a version:** removing or renaming a field · narrowing a type · changing a
default · changing an error code's meaning · changing what a field means.

A break mints `/v2`; `/v1` runs at least 12 months with `Deprecation` and `Sunset` headers.

**Run [`effect-trace`](../effect-trace/SKILL.md).** A contract change reaches OpenAPI, the
SDK, and every consumer.

## Colour on the wire

Always carries provenance (FR-9):

```jsonc
{ "space": "oklch", "components": [0.58, 0.06, 155],
  "provenance": { "source": "estimated", "confidence": 0.81 } }
```

Explanation `detail` is a **message key**, never a sentence. The same response renders in
English and Japanese, and a server that returns prose has made the locale decision for the
client, wrongly.

Every response carries its reproducibility envelope.

## Checks before you finish

- [ ] Every response status has a schema
- [ ] Error codes are in the enum, and nothing internal leaks
- [ ] `tenant_id` from the session, never the request
- [ ] **404, not 403**, for another tenant's resource
- [ ] Idempotency on mutations
- [ ] Cursor pagination with a hard limit
- [ ] Cache headers include the corpus version **and the locale**
- [ ] Rate limit class chosen
- [ ] OpenAPI and SDK regenerated; consumers updated
- [ ] e2e covers the happy path **and** the tenancy negative case — with a decoy
