# ADR-0025 — The implementation generates the contract, and the contract generates the SDK

## Status

**Superseded by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** There is no public API and no generated
SDK. The principle that a contract is generated from the implementation rather than
hand-written survives where it still applies: the design token outputs and the corpus bundle.

## Date

2026-08-13

## Context

A public API is on the roadmap (FR-62), and our own web, mobile and admin surfaces are its
first consumers. That gives us a choice about where the contract lives, and the choice
determines whether it stays true.

**Hand-written OpenAPI drifts.** A field is added to a response and not to the spec. A
status code changes. Within a few months the spec documents what the API used to do, and
every consumer generated from it is subtly wrong.

**Hand-written SDKs drift twice** — once from the API, once from the spec.

There is a second, more valuable property available if the direction is right: **make a
breaking contract change break our own build first.** If the SDK is generated from the
contract and our clients consume the SDK, then a change that breaks a consumer fails in our
CI rather than in someone else's production.

## Decision

**One direction, no exceptions: implementation → OpenAPI → SDK → clients.**

```
Zod schemas in @irodora/contracts
      ↓ validate at runtime, and infer TypeScript types
Fastify routes
      ↓ generated at build time
openapi.json  (a build artefact, committed)
      ↓ generated
@irodora/sdk
      ↓ consumed by
apps/web · apps/mobile · apps/admin · external developers
```

1. **The OpenAPI document is never hand-edited.** It is generated; editing it is editing a
   build output.
2. **Our clients consume the generated SDK**, exactly as an external developer would. They
   are the first users of every contract change, which means contract quality is felt
   internally before it is published.
3. **The SDK is a thin typed client**, not a framework. Types from the contract; transport,
   auth and retry are small and explicit.
4. **CI regenerates and diffs.** A contract change with a stale committed document fails
   the build.
5. **Additive-only inside a version** (`api-contract.md` §9, retired with the API).
   Clients ignore unknown response fields, and the generated SDK does.
6. **The generation chain is an effect link** ([E-004](../../.harness/state/effects.json)):
   changing a contract requires regenerating OpenAPI and the SDK and updating consumers —
   guarded by the diff check, so it cannot be forgotten.

**Generating the contract is not a deployment.** A regenerated `openapi.json` in the
repository describes an API that may not be running yet. The document is versioned with the
release that ships it, not with the commit that generated it.

## Consequences

**Good.** The contract cannot describe an endpoint that does not exist. Drift is
structurally impossible rather than merely discouraged. Breaking changes surface in our CI
before a consumer's production. Our clients are honest first users of the public API, so
its ergonomics get exercised rather than assumed.

**Bad.** A build-order dependency — the SDK cannot build until the API's schemas do, which
makes the graph less parallel. Generated code needs review discipline; a bad generator
output is easy to merge because it looks machine-authored. Some OpenAPI expressiveness is
lost relative to hand-writing, since we can only describe what the schema layer can encode.

**Neutral.** `openapi.json` is committed as a build artefact so contract diffs are visible
in review — which is the point of committing it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Spec-first: write OpenAPI, generate server stubs** | Contract-driven design, parallel client and server work. The spec and implementation drift the moment a handler is edited, and enforcing agreement needs its own tooling — which is the problem restated |
| **Hand-written SDK** | Better ergonomics, hand-tuned. Drifts from the API, and every contract change is manual work in two places |
| **tRPC for internal, REST for public** | Best-in-class internal types. Two contracts to maintain, and the internal one would inevitably lead — leaving the public API as the neglected second-class surface |
| **GraphQL** | Client-specified queries, one endpoint. Caching the catalog at the edge becomes far harder — and edge-cacheable catalog reads are the largest traffic class. Query-cost control is also a real burden for a public API |

## Revisit when

- External developers need a language SDK we cannot generate from OpenAPI.
- The contract layer becomes expressive enough that the generated document loses fidelity
  we need.
