# ADR-0012 — Fastify with Zod schemas that generate the OpenAPI document

## Status

Accepted

## Date

2026-08-13

## Context

The API is read-dominated (catalog), latency-sensitive (NFR-4: p95 ≤ 300 ms), and must
expose a public contract that a generated SDK consumes ([ADR-0025](0025-api-first-and-generated-sdk.md)).

The requirement that actually decides the framework is not throughput. It is that
**runtime validation, static types and the published contract must be one artefact.**
Where those are three separate things — a validator, an interface, and a hand-written
spec — they drift within weeks, and the spec becomes documentation of what the API used to
do.

## Decision

**Fastify 5 + TypeScript, with Zod 4 schemas as the single source of truth for validation,
types and OpenAPI.**

```
Zod schema (in @irodora/contracts)
    ├─→ runtime validation at the boundary
    ├─→ TypeScript types (z.infer) for handlers and clients
    └─→ JSON Schema → OpenAPI document → @irodora/sdk
```

1. **Schemas live in `@irodora/contracts`**, not in route files, so the web app, mobile app
   and SDK import the same definitions the server validates against.
2. **Every route declares schemas** for params, query, body and each response status. A
   route without response schemas cannot appear in the OpenAPI document, so the contract
   cannot silently omit anything.
3. **The type provider bridges Zod to Fastify**, so handlers receive parsed, typed values.
   Handlers never see an unvalidated shape.
4. **OpenAPI is generated at build time** and committed as a build artefact. A contract
   change that breaks a consumer breaks the SDK build in our CI, before it reaches theirs
   ([E-004](../../.harness/state/effects.json)).
5. **Fastify's plugin encapsulation implements module boundaries** — each module registers
   as a plugin with its own scope, so cross-module access has to be deliberate.
6. **`pino` structured JSON logs**, which Fastify uses natively, feeding the observability
   baseline ([ADR-0022](0022-observability-opentelemetry-no-raw-imagery.md)).

## Consequences

**Good.** One definition serves validation, types and documentation, so they cannot
diverge. Fastify's schema-based serialisation is genuinely fast — it compiles a serialiser
per response shape rather than reflecting per request. Plugin encapsulation gives module
boundaries a runtime dimension in addition to the lint rule. The generated SDK is
structurally incapable of describing an endpoint that does not exist.

**Bad.** The Zod-to-Fastify type bridge is a real integration with its own version
sensitivity — a Zod or Fastify major bump can break it, and it is a known maintenance
point. Fastify's plugin lifecycle and encapsulation model take genuine learning. Declaring
response schemas for every status is more upfront work than returning an object.

**Neutral.** Zod 4's JSON Schema output is close enough to OpenAPI 3.1 that the conversion
is mechanical rather than lossy.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Express** | Ubiquitous, enormous middleware ecosystem, everyone knows it. No first-class schema story — validation, types and docs stay three separate things. Measurably slower serialisation. For a greenfield API in 2026, choosing it means opting into the drift problem |
| **NestJS** | Excellent structure, DI, and decorator-driven OpenAPI. Heavier runtime, decorator/metadata magic that complicates the type story, and its structure duplicates boundaries the monorepo already enforces |
| **Hono** | Very fast, edge-portable, good typing. Smaller ecosystem for the things we need (rate limiting, OIDC, multipart), and edge portability is not a goal — the worker needs a full Node runtime anyway |
| **tRPC** | Best-in-class end-to-end types for our own clients. But the public API (FR-62) needs a language-neutral HTTP contract, and tRPC's is not one. We would end up maintaining both |

## Revisit when

- The Zod/Fastify type bridge becomes a recurring upgrade blocker across two consecutive
  major versions.
- A module extracted per [ADR-0001](0001-monorepo-modular-monolith-with-extraction-triggers.md)
  has genuinely different framework needs.
