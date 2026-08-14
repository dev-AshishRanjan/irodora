# Plan: F-002 — Shared contracts package

| | |
|---|---|
| **Feature** | F-002 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/contracts` · `@irodora/contracts` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-08-14 |

---

## Intent

`@irodora/contracts` becomes the one place a wire shape is defined. A Zod schema written
here validates at runtime, infers the TypeScript type every consumer uses, and converts to
JSON Schema for the OpenAPI document — **one artefact, three uses**
([ADR-0012](../../docs/adr/0012-backend-fastify-zod-openapi.md)).

To a user this delivers nothing directly. What it delivers to the product is that the API,
the web app, the mobile app and the SDK cannot disagree about what a colour, an error or a
page of results looks like — and that a contract change breaks our build rather than a
consumer's production ([ADR-0025](../../docs/adr/0025-api-first-and-generated-sdk.md),
[E-004](../state/effects.json)).

**Done looks like:** every exported schema converts to JSON Schema without throwing, the
error-code enum rejects a plausible near-miss, no exported type in the package is
hand-written, and the four types the colour engine declares are pinned to their wire schemas
by the compiler.

## Approach

### The decision this feature actually turns on

`packages/color-*` has **zero runtime dependencies** (NFR-3) and must produce byte-identical
results in Node, the browser and React Native. Zod is a runtime dependency. **The engine
therefore cannot own its own schemas**, and `@irodora/color-core` already declares
`Provenance`, `MeasurementSource` and `ReproducibilityEnvelope` as hand-written TypeScript.

That is a direct deviation from a documented default —
[`rules/typescript`](../rules/typescript/typescript.md): *"Never hand-write a type that
duplicates a schema."* It is forced by a golden constraint, so it gets an **ADR**
(golden rule 7), and the duplication is made safe rather than tolerated:

> The wire schema in `@irodora/contracts` and the engine type in `@irodora/color-core` are
> asserted **mutually assignable at compile time**. Drift in either direction fails
> `pnpm typecheck`.

Mutual assignability, not `toEqualTypeOf`, is the right strictness here: it catches every
wire-relevant difference — an added field, a removed field, a renamed field, a retyped
field, a field that became optional — while ignoring `readonly`, which has no wire meaning.

Direction of dependency is `contracts → color-core`, never the reverse. The engine stays
ignorant of the wire.

### Scope: the cross-cutting primitives, not the endpoint surface

The acceptance list is entirely about *mechanism*. The package needs enough real content to
prove the mechanism across the shapes that will actually stress it — a branded scalar, a
tuple, a discriminated envelope, a closed enum, and a generic wrapper — and no more.
Endpoint request/response schemas belong to F-015 and F-016.

**Reused:**

- `@irodora/color-core` — `Provenance`, `MeasurementSource`, `ReproducibilityEnvelope`, and
  `ColorSpace` (see the one-line fix below). The wire schemas are derived from these, not
  invented alongside them.
- `scripts/verify-guards.mjs` — the existing guard-proof harness from F-001. The new
  "no hand-written duplicate" boundary becomes guard #6 in it, not a new script.
- `eslint.config.mjs` — the existing zone-override pattern, with the F-001 lesson applied:
  **a later flat-config object replaces a rule rather than merging with it**
  ([[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]]). The contracts zone
  introduces `no-restricted-syntax`, which no earlier object sets, so there is nothing to
  re-declare — but the reason must be checked, not assumed.
- `vitest` and the root toolchain as-is. No new test runner, no new build step.

**New:**

```
packages/contracts/src/primitives.ts    branded scalars, locale, localized text
packages/contracts/src/color.ts         colour on the wire + the identity assertions
packages/contracts/src/errors.ts        the closed, versioned error-code enum
packages/contracts/src/pagination.ts    cursor page params and the generic page wrapper
packages/contracts/src/json-schema.ts   the OpenAPI leg: Zod → JSON Schema (draft 2020-12)
packages/contracts/src/version.ts       API_VERSION, CONTRACTS_VERSION
packages/contracts/src/index.ts         barrel — and the surface the tests enumerate
```

**One defect fixed in `color-core`:** it types `Provenance.originSpace` with `ColorSpace`
but does not export that type, so no consumer can name it. A one-line re-export. Without it
`contracts` would need a second package dependency to say something `color-core` already
says.

### Increments

Each leaves `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green.

| # | Step | Verified by |
|---|---|---|
| 1 | Add `zod` and `vitest` to `packages/contracts`; re-export `ColorSpace` from `color-core`; install | build + typecheck |
| 2 | `primitives.ts` + `json-schema.ts` + the self-enumerating representability test | test |
| 3 | `color.ts` + the four compile-time identity assertions against `color-core` | typecheck (proven to fail) |
| 4 | `errors.ts` — closed enum, exhaustive status map, frozen-v1 additive-only test, decoy negative test | test |
| 5 | `pagination.ts` — cursor params, generic page wrapper, its JSON Schema case | test |
| 6 | The guard: `no-restricted-syntax` in the contracts zone + guard #6 in `verify-guards.mjs` | `pnpm lint` (proven to fire) |
| 7 | Effect trace: `effects.json` E-004, its memory note, `api-contract.md`; ADR-0036; progress | state |

## Files to touch

```
packages/contracts/package.json          — add zod (dep), vitest (devDep)
packages/contracts/src/index.ts          — barrel; replaces the F-001 stub
packages/contracts/src/version.ts        — NEW  API_VERSION, CONTRACTS_VERSION
packages/contracts/src/primitives.ts     — NEW  slug, hex, requestId, corpusVersion,
                                                unitInterval, locale, localizedText
packages/contracts/src/color.ts          — NEW  colourSpace, measurementSource, provenance,
                                                colorValue, reproducibilityEnvelope
packages/contracts/src/errors.ts         — NEW  ERROR_CODES_V1, errorCode, errorResponse,
                                                ERROR_CODE_STATUS
packages/contracts/src/pagination.ts     — NEW  cursor, pageParams, paginated<T>
packages/contracts/src/json-schema.ts    — NEW  toJsonSchema() targeting draft 2020-12
packages/contracts/src/*.test.ts         — NEW  colocated, per rules/common/testing.md

packages/color-core/src/index.ts         — re-export ColorSpace; align capturedAt optionality
                                           if Zod's inference requires it (see Risks)

eslint.config.mjs                        — contracts zone: no-restricted-syntax
scripts/verify-guards.mjs                — guard #6, with its violating fixture

docs/adr/0036-*.md                       — NEW  the engine type / wire schema duality
docs/adr/README.md                       — index row
docs/architecture/api-contract.md        — provenance example is missing originSpace
.harness/state/effects.json              — E-004 `from.exists` → true
.harness/memory/effects/contract-to-openapi-to-sdk-is-one-direction.md — what now exists
.harness/state/feature_list.json         — status → done
.harness/state/progress.md               — the entry
```

## Anticipated effects

| Effect | Dependents | Guard |
|---|---|---|
| **E-004** — `packages/contracts/src` is the `from` node. This feature makes it exist for the first time. | `apps/api/openapi.json`, `@irodora/sdk`, `apps/web`, `apps/mobile`, `docs/architecture/api-contract.md` | The OpenAPI/SDK diff check lands with F-015/F-057 and does not exist yet. **What exists now** is the JSON-Schema representability test — a schema that cannot become OpenAPI fails here, at the moment it is written, rather than at F-015. Recorded honestly as partial coverage. |
| **E-002** — `Provenance` reaches every surface, and making it optional would compile. | every consumer of a colour value | **New:** the mutual-assignability assertions. Loosening `Provenance` in `color-core` now fails `pnpm typecheck` in `contracts`. This feature strengthens E-002's guard; it does not weaken it. |
| **New:** the error-code enum becomes a client-visible contract. | every client that switches on `code` | The frozen-v1 additive-only test. Removing or renaming a code fails `pnpm test`. |
| **New:** `contracts` acquires a runtime dependency (Zod). | nothing in `packages/color-*` — the engine must never import it | The existing colour-engine lint zone forbids it structurally; `contracts` is outside that zone by design and its dependency direction is one-way. |

`docs/architecture/api-contract.md` §4 shows a provenance object with `source` and
`confidence` only. Against the schema derived from `Provenance` that example **fails
validation** — `originSpace` is required (ADR-0005). The doc is corrected as part of this
feature; that is the effect link doing its job on its first use.

## Test plan

- **Representability (the OpenAPI leg).** Enumerate the package's own public exports at
  runtime, filter for Zod schemas, and assert each converts to JSON Schema draft 2020-12
  without throwing. Self-maintaining: a schema added later is covered automatically, so the
  test cannot fall behind the surface it checks.
- **Type identity (property-shaped, at compile time).** Mutual `expectTypeOf` assertions for
  `MeasurementSource`, `ColorSpace`, `Provenance` and `ReproducibilityEnvelope`. **Proven to
  fail:** add a field to the schema, watch `pnpm typecheck` go red, remove it.
- **Closed enum — negative, with a decoy.** `errorCodeSchema.safeParse('color_out_of_gamut')`
  must fail. The decoy is the American spelling of our own British `colour_out_of_gamut` —
  a mistake someone will actually make, not `"xxxx"`. An empty-string test would prove
  nothing.
- **Additive-only.** A literal list of the v1 codes, written independently of the
  implementation, asserted to be a subset of `ERROR_CODES_V1`. **The duplication is the
  mechanism, not an oversight** — the test file records what v1 promised, and the check is
  that the promise still holds. It carries a comment saying so, because the next reader's
  instinct will be to DRY it away.
- **Exhaustive status map.** Every code has an HTTP status, and the status is one the
  contract documents. The compiler enforces exhaustiveness via `Record<ErrorCode, …>`; the
  test catches a status outside the documented set, which the compiler cannot see.
- **Round-trip.** A representative colour value parses, and its parsed output re-parses
  identically — the wire shape survives its own validator.
- **Boundary guard.** `verify-guards.mjs` #6 writes `export interface X { … }` into
  `packages/contracts/src/` and asserts `no-restricted-syntax` fires.

**Not tested here, and deliberately:** OpenAPI document generation and SDK generation. Both
require routes, which do not exist until F-015.

## Verification

```
node scripts/verify-state.mjs        # gate 0
pnpm typecheck                       # gate 1 — carries the type-identity assertions
pnpm lint                            # gate 2 — includes all 6 boundary guards
pnpm format:check                    # gate 3
pnpm test                            # gate 4
pnpm build                           # gate 6
```

Not applicable: `color-golden`, `e2e`, `a11y`, `contrast`, `cvd`, `content`, `perf`,
`web-perf`, `e2e-full`, `security`. Each activates with its own feature. **This will be
stated in the report rather than left to inference.**

Evidence to capture: the guard runner's six lines, the typecheck failure observed when an
identity assertion is deliberately broken, and the test counts per file.

## Risks and open questions

1. **`exactOptionalPropertyTypes` vs Zod's `.optional()`.** Zod infers `capturedAt?: string |
   undefined`; `color-core` declares `capturedAt?: string`. Under
   `exactOptionalPropertyTypes` those are genuinely different types and mutual assignability
   will fail one direction. The fix is to align `color-core` — `?: T | undefined` is the
   honest shape for a field that arrives through a validator. To be confirmed empirically in
   increment 3 rather than assumed.
2. **`z.toJSONSchema` on branded and tuple schemas.** Brands are type-level only in Zod 4, so
   they should convert cleanly; tuples become `prefixItems`, which draft 2020-12 supports and
   OpenAPI 3.1 inherits. If either throws, the branded scalar or the tuple changes shape —
   **not** the test. Discovering this now is the point of writing the representability test
   before there are any routes.
3. **`no-restricted-syntax` false positives.** A generic helper that must be expressed as a
   type alias would trip the rule. Current design has none: the generic page wrapper is a
   *function* returning a schema, and its type is `z.infer<ReturnType<…>>`. If a legitimate
   case appears, it is an allowlisted exception with a comment — never a relaxed rule.
4. **The enum is under-filled on purpose.** Additive-only means adding a code later is free
   and removing one is a `/v2` break. Under-including is the safe direction, so v1 carries
   only codes traceable to a line in `api-contract.md`. `quota_exceeded` (F-057) and
   `corpus_version_unknown` (F-016) are deliberately absent.

No `OQ-*` blocks this feature.

## Out of scope

- Endpoint request/response schemas — F-015, F-016.
- The OpenAPI document and its diff check — F-015.
- `@irodora/sdk` generation — F-057.
- Header plumbing (`Idempotency-Key`, `Accept-Language`, `X-Irodora-Corpus`) — F-015, where
  routes give them somewhere to attach.
- `MessageKey` for explanation factors — F-028.
- Enforcing "no hand-written duplicate" in *consumer* packages. There are no consumers yet;
  the rule lands with them at F-015. **This limit is stated in the report** rather than
  allowed to read as full coverage of acceptance criterion 4.

---

## Revisions

Recorded rather than rewritten, so this file still says what was intended.

### 2026-08-14 — during implementation

**`CONTRACTS_VERSION` dropped.** The plan listed it as a deliverable of `version.ts`, pinned
to `package.json` by a test. Building it showed the cost: reading the manifest needs
`@types/node` in a package `apps/mobile` imports, which makes a `node:fs` import in `src` a
plausible next step. The constant duplicated the manifest with nothing keeping the two in
step, and no consumer reads it. Removed; `API_VERSION` — the version that means something on
the wire — stays. Reasoning is in `version.ts` where someone looking for the constant will
find it.

**Two lint rules and four guards were added beyond the plan's one.** Giving the package Node
types was rejected above, but the risk it exposed was real, so `packages/contracts/src` now
carries the `node:*` restriction the colour engine has, for the same reason: the browser and
React Native both import this package. And the "no hand-written type" selector in the plan
(`TSTypeAliasDeclaration > TSTypeLiteral`) turned out to cover two of roughly seven
duplication forms — it misses string unions, which is the form the two duplicated engine
types actually take. Both found in review; see ADR-0036 for what now fires.

### 2026-08-14 — after independent verification

The evaluator found two defects the gates could not see, both now fixed and both with a
regression test proven to fail:

1. **`toJsonSchema` published the wrong side of the wire.** Zod defaults to `io: 'output'`,
   so `pageParamsSchema` — whose `limit` has a `.default()` — converted to a document
   marking `limit` **required**, while the validator accepts `{}`. Every generated client
   would have been told to send a field the API does not need. `io` is now a required
   argument with no default. This is exactly the defect class the representability test was
   written to catch, and it did not, because it only asserted "does not throw".
2. **The schema-surface scan could silently cover less.** Deleting one `export *` line from
   the barrel dropped coverage from 18 schemas to 10 with every test still green; the
   `length >= 10` floor did not notice. The barrel's export list is now pinned explicitly.

Also pinned: each error code's published HTTP status. Changing `validation_failed` from 422
to 400 previously passed typecheck, lint and the full suite.
