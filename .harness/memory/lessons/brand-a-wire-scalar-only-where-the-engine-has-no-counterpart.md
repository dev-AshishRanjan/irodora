---
kind: lesson
title: Brand a wire scalar only where the colour engine has no counterpart type
created: 2026-08-14
feature: F-002
scope: [packages/contracts, packages/color-core, packages/color-spaces]
links: [[mutual-assignability-does-not-catch-an-optional-field]], [[provenance-in-the-type-is-what-makes-honesty-structural]]
---

# Brand a wire scalar only where the engine has no counterpart type

Branded types are the right tool for values that must not be swapped:

```ts
export const slugSchema = z.string().regex(/…/).brand<'Slug'>();
```

They have one property that interacts badly with the colour engine: **a branded string is
not assignable from a plain `string`.** And `packages/color-*` has zero runtime dependencies
(NFR-3), so it can never import Zod and can never name our brands. Its types say `string`.

The rule that follows:

> **Brand a wire scalar only where the colour engine has no counterpart type for it.**

| Scalar | Branded? | Because |
|---|---|---|
| `slug`, `hex`, `requestId`, `cursor` | yes | wire-only; nothing in the engine holds them |
| `confidence` | **no** | it is `Provenance.confidence`, declared `number` |
| `corpusVersion`, `semanticVersion` | **no** | they are `ReproducibilityEnvelope` fields, declared `string` |

Branding one of the second group compiles fine and quietly breaks the compile-time pinning
in [ADR-0036](../../../docs/adr/0036-wire-schema-and-engine-type-pinned-by-the-compiler.md),
which is the only thing keeping the wire schema and the engine type from drifting.

**Constrain instead.** `z.number().min(0).max(1)` still infers `number`, so the validation is
real and the assignability survives. A brand buys type-level distinctness; a refinement buys
runtime correctness. Inside the engine's shapes, only the second is available — and it is the
one that was actually needed.
