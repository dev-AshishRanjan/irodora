# ADR-0036 — The wire schema and the engine type are two artefacts, pinned by the compiler

## Status

Accepted

## Date

2026-08-14

## Context

[`rules/typescript`](../../.harness/rules/typescript/typescript.md) is unambiguous:

> Never hand-write a type that duplicates a schema. It will diverge, and the divergence
> will be invisible until it matters.

Building `@irodora/contracts` (F-002) put that rule directly against NFR-3.

`packages/color-*` must produce **byte-identical results in Node, the browser and React
Native**, and must port to WASM. It therefore has **zero runtime dependencies** and no
platform APIs. Zod is a runtime dependency. The colour engine cannot import it.

So `@irodora/color-core` declares `Provenance`, `MeasurementSource` and
`ReproducibilityEnvelope` as plain TypeScript, and `@irodora/contracts` needs Zod schemas
for the same three shapes to validate them at the boundary and to generate OpenAPI. That is <!-- retired-ok: The wire-schema problem as it existed when there was a wire. The compiler-pinning principle survives. -->
one shape defined twice, which is exactly what the rule forbids — and the rule is right
about why: the two would diverge the first time only one was edited, and nothing would say
so.

Three ways out were available.

## Decision

**Keep both definitions, and make the compiler prove they are the same shape.**

`packages/contracts/src/color.test.ts` asserts, per type:

```ts
expectTypeOf<keyof ProvenanceWire>().toEqualTypeOf<keyof Provenance>();
expectTypeOf<ProvenanceWire>().toExtend<Provenance>();
expectTypeOf<Provenance>().toExtend<ProvenanceWire>();
```

These are compile-time only. Drift fails `pnpm typecheck` — gate 1, on every commit.

Three properties make this work, and each was arrived at by watching something fail:

1. **The dependency runs one way.** `contracts → color-core`, never the reverse, and as
   `import type` so no runtime edge exists. The engine never learns about the wire.

2. **`toEqualTypeOf` on the whole object is unusable, and mutual assignability alone is not
   enough.** Zod infers mutable properties where the engine declares `readonly` ones, so
   exact equality fails forever for a difference with no wire meaning. But mutual
   assignability is weaker than it looks: an object with an **extra optional property** is
   still assignable in both directions. Adding `device?: string` to `provenanceSchema`
   produced no error at all. Asserting the **key set** separately closes that hole, and a
   removed optional property with it.

3. **A wire scalar may be branded only where the engine has no counterpart type.** A branded
   `string` is not assignable from a plain `string`, and the engine can never name our
   brands. So `slug`, `hex`, `requestId` and `cursor` are branded; `confidence` and the
   version strings inside `Provenance` and `ReproducibilityEnvelope` are constrained but
   not branded. Branding those would silently break the pinning that is the whole point.

**The duplication is permitted only where NFR-3 forces it** — that is, only between
`@irodora/contracts` and `packages/color-*`. Inside `packages/contracts` the original rule
stands unchanged and is enforced by `no-restricted-syntax`.

What that rule actually rejects, stated precisely because a broader claim would be worse
than none — each row has a fixture in `scripts/verify-guards.mjs` or is covered by one:

| Form | Selector |
|---|---|
| `interface X { … }` | `TSInterfaceDeclaration` |
| `type X = { … }`, and wrapped: `Readonly<{ … }>`, `{ … }[]`, `{ … } & { … }` | `TSTypeAliasDeclaration TSTypeLiteral` (descendant — a `>` child selector is defeated by any wrapper) |
| `type X = 'a' \| 'b'` | `TSTypeAliasDeclaration > TSUnionType` |
| `type X = A & B` | `TSTypeAliasDeclaration > TSIntersectionType` |
| `enum X { … }` | `TSEnumDeclaration` |

The union row is the one that earns the rule: the two engine types this package duplicates
— `ColorSpace` and `MeasurementSource` — **are string unions**, so a selector written only
for object literals would have left the actual risk uncovered.

**What it does not reach:** a duplicate declared in a *consumer* package. There are no
consumers yet; that rule lands with `apps/api` and `apps/web` at F-015. Until then,
acceptance criterion 4 is enforced inside the contract layer and is convention outside it.

## Consequences

**Good.** The guarantee is structural. Loosening `Provenance` in the engine — the specific
failure [E-002](../../.harness/state/effects.json) exists to prevent — now fails a gate
rather than merely contradicting a comment. It costs no runtime code and no build step. And
it strengthens E-002: before this, the effect link named a consequence with no automated
check behind it.

**Bad.** Two files must be edited to change one shape, and the second edit is discovered by
a type error rather than by the author. The assertion is subtle enough that someone
simplifying it to a single `toEqualTypeOf` would make it fail permanently, and someone
simplifying it to a single mutual-assignability pair would make it pass permanently — the
worse of the two. The docstring explains this at length for that reason. Type-level
assertions also produce error messages (`Expected 1 arguments, but got 0`) that say nothing
about what actually drifted.

**Neutral.** The check lives in a test file but is not a runtime test; it contributes
nothing to the test count and everything to gate 1. That is worth knowing when reading a
verification report.

### One change to `Provenance`, taken deliberately

Adopting this required widening two engine fields from `?: T` to `?: T | undefined`
(`Provenance.capturedAt`, `ReproducibilityEnvelope.profile`). Under
`exactOptionalPropertyTypes` those are different types, and only the wider one is what a
validator can produce.

This is recorded rather than left to a diff because **relaxing `Provenance` is precisely the
class of change [E-002](../../.harness/state/effects.json) exists to watch**, and "it was
forced by a downstream package" is exactly the justification that link expects to be
scrutinised. The effect is that `{ capturedAt: undefined }` is now legal where it was not.

It is accepted because it removes no guarantee that mattered: `?: string` claimed the key
would never be present-and-undefined, which was never true of a value arriving over the wire,
and `source`, `confidence` and `originSpace` — the fields that carry the honesty guarantee —
remain required and are now pinned by the assertions above. The alternative was to leave
`capturedAt` off the wire entirely, which would have lost real information to preserve a
distinction that only existed inside the type system.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Zod in the colour engine, schemas as the only definition** | The clean answer, and it costs NFR-3 — the one guarantee that cannot bend. A runtime dependency in the engine ends byte-identical output across Node, browser and React Native, and ends the WASM port |
| **Generate the engine types from the schemas at build time** | No duplication in source. Adds a codegen step to the package with the strictest purity requirements, makes its types unreadable without running a build, and means the engine's public API is a build artefact. Heavy machinery for four types |
| **Generate the schemas from the engine types** (`ts-to-zod` and similar) | Right direction, wrong reliability. Round-tripping brands, refinements and `exactOptionalPropertyTypes` through a generator is exactly where these tools produce something that compiles and validates differently |
| **Contracts owns the shapes; the engine imports its types** | Inverts the dependency. The colour engine would depend on the wire format, so a contract change could alter engine behaviour — the opposite of what ADR-0005 and NFR-3 are protecting |
| **Convention and code review** | This is what the rule already says, and it is precisely what "invisible until it matters" describes |

## Revisit when

- Zod ships a build-time-only mode with no runtime footprint that the engine could adopt
  without acquiring a dependency.
- The number of pinned types grows past roughly a dozen, at which point generation earns its
  machinery.
- TypeScript gains a native exact-shape comparison that ignores `readonly`, which would
  replace the three-assertion pattern with one.
