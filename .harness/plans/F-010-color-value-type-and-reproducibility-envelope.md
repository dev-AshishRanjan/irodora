# Plan: F-010 — The `Color` value type and reproducibility envelope

| | |
|---|---|
| **Feature** | F-010 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-9, FR-10 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/color-core` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-15 |

---

## Intent

Every colour in this product carries how it came to exist, and every derived answer carries
the versions that produced it. Not as a convention — as a type, so that a component which
renders a camera estimate as though it were a measured value **cannot be written**
([ADR-0005](../../docs/adr/0005-measurement-provenance-is-a-type.md)).

To a user: the confidence figure next to a colour is never missing, never stale, and never
attached to the wrong reading — because there is no code path that could separate them.

---

## What exists already, and what does not

`@irodora/color-core` today is **types only** — `Provenance`, `MeasurementSource`,
`ReproducibilityEnvelope`, and `CORE_VERSION = '0.0.0'` marked "Implemented in F-010". There
is no `Color`. That is the feature.

Two things constrain the design before it starts:

**ADR-0005 specifies a field this package does not have.** Its `Provenance` includes
`conditions?: CaptureConditions`, "required when source is `estimated`|`calibrated`".
Acceptance criterion 2 names it. It is genuinely absent today.

**The wire schema is pinned to the engine type at compile time.**
`packages/contracts/src/color.test.ts` asserts `keyof ProvenanceWire` equals `keyof
Provenance` and that the two are mutually assignable (ADR-0036). **Adding `conditions` will
break that pin, deliberately** — which is the mechanism working, not an obstacle. It means
the contract must move in the same commit, and that is the point of pinning them.

---

## Approach

**Reused.** `Xyz`, `Rgb`, `ColorSpace` and every conversion from `@irodora/color-spaces`;
`gamutMap` from F-009 where a `Color` must be rendered. `@irodora/contracts` for the wire
shape. No colour maths is added here — this package is a *facade*, and a conversion
implemented in it would be a second implementation.

**New**, in `packages/color-core/src/`:

- `provenance.ts` — `CaptureConditions`, and `Provenance` as a **discriminated union on
  `source`**.
- `color.ts` — the `Color` value type and its constructors.
- `envelope.ts` — `ReproducibilityEnvelope` helpers and the replay check.

**The design decision, stated up front because it is the whole feature.**

`Provenance` becomes a **discriminated union**, not a flat interface with an optional field:

```ts
type Provenance =
  | { source: 'reference' | 'declared'; confidence: number; originSpace: ColorSpace; … }
  | { source: 'estimated' | 'calibrated'; confidence: number; originSpace: ColorSpace;
      conditions: CaptureConditions; … }   // required, not optional
```

An optional `conditions?: CaptureConditions` satisfies the letter of criterion 2 and none of
its purpose: an estimate whose capture conditions were dropped would still compile, and that
is precisely the object nobody should be able to build. The union is the same move
`Provenance` itself is — [[provenance-in-the-type-is-what-makes-honesty-structural]].

**Constructors, and the one unpleasant one.**

- `fromXyz(xyz, provenance)` — the honest path. Provenance is a positional argument with no
  default, so forgetting it is a compile error rather than a silent `declared`.
- `fromSpace(space, components, provenance)` — records `originSpace` from what was passed,
  so `originSpace` cannot disagree with reality.
- `unsafeFromHex(hex)` — the **only** untracked path. Sets `source: 'declared'`,
  `confidence: 0.5`. Named to be unpleasant, and its call sites are countable by grep, which
  is what "every call site is reviewed" has to mean in practice.

**Increments.** Each leaves the build green.

1. `CaptureConditions` + the `Provenance` union + the contracts schema moved with it, in one
   step, because the pin will not let them move separately.
2. `Color` and its constructors; the compile-fail tests.
3. `ReproducibilityEnvelope` helpers and the replay fixture.
4. Effects, records, ADR if the union shape needs one.

---

## Files to touch

```
packages/color-core/src/provenance.ts     — new
packages/color-core/src/color.ts          — new
packages/color-core/src/envelope.ts       — new
packages/color-core/src/index.ts          — Provenance moves out; CORE_VERSION becomes real
packages/color-core/test/*                — new
packages/color-core/golden/envelopes.fixture.json — the replay fixture
packages/contracts/src/color.ts           — provenanceSchema gains conditions
packages/contracts/src/color.test.ts      — the pin's SHAPE changes for a union
packages/color-core/package.json          — needs @irodora/contracts for the pin
docs/adr/00NN-…                            — only if the union is a real deviation
```

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **`Provenance` gains `conditions` and becomes a union** | `@irodora/contracts`, and every future consumer of a colour | **E-002.** The ADR-0036 compile-time pin is the guard and it will go red first — that is the design |
| **`Color` becomes the type every surface handles** | web, mobile, API, corpus, recommendation — none of which exist yet | **E-002.** The guard is the type itself; the risk it names is someone making `provenance` optional "temporarily", which would compile everywhere |
| **The wire schema changes** | OpenAPI → SDK, once F-015 exists | **E-004.** No OpenAPI document today, so this is additive now and would not be later |
| **`CORE_VERSION` becomes a real version** | every `ReproducibilityEnvelope` ever written | The replay fixture: historical envelopes must still replay byte-identically |

**A conversion is NOT added here.** If a golden test in `color-spaces` moves, I did something
wrong.

---

## Test plan

- **Compile-fail, which is most of the value.** Each with `@ts-expect-error`, so `tsc` errors
  on an *unused* directive if the type ever stops rejecting:
  - a `Color` built without provenance;
  - `source: 'estimated'` without `conditions` — the union's whole purpose;
  - `provenance` made optional in a structural copy of the type;
  - and a **baseline** that a complete, correct `Color` does compile, or every assertion
    above passes for a type that rejects everything [[a-decoy-that-is-not-broken-proves-nothing]].
- **Runtime.** `confidence` outside `[0,1]` rejected; `originSpace` matching the constructor
  used; `unsafeFromHex` producing exactly `declared` / 0.5.
- **Negative — a decoy, not an empty fixture.** `unsafeFromHex` call sites are asserted
  countable and enumerated in the test, so "every call site is reviewed" is a number that
  fails when it grows rather than a claim in a document.
- **Replay.** A committed fixture of historical envelopes, replayed byte-identically.
  The fixture must contain an envelope whose versions are *not* the current ones — otherwise
  it passes trivially today and stops meaning anything the moment a version bumps.
- **Pin.** The contracts test must still assert engine ↔ wire equivalence, in whatever shape a
  discriminated union requires. `keyof` on a union gives only the common keys, so the existing
  assertion would silently weaken — it has to be rewritten, not adjusted
  [[mutual-assignability-does-not-catch-an-optional-field]].

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:golden && pnpm build
pnpm test:contrast && pnpm test:cvd    # blocking, and this package sits under them
```

Evidence: the pass line for each, the `unsafeFromHex` call-site count, and the compile-fail
directives proving they still fire.

---

## Risks and open questions

- **The union may be over-engineering.** If `CaptureConditions` cannot be given honest fields
  now — illuminant, device, sample count — a union that requires an empty object is worse than
  an optional field. **Decide by writing the fields first**; if they are speculative, fall back
  to the optional field and record why.
- **`keyof` on a discriminated union is the common keys only.** The existing pin would keep
  passing while checking less. This is the single most likely way to ship a weakened guard
  here, and it must be verified by breaking the type deliberately.
- **`CORE_VERSION` at `0.0.0` is in no envelope yet.** Setting it to `0.1.0` is safe now and
  will not be once anything has been persisted.
- **No `OQ-*` blocks this feature.**

## Out of scope

- Persisting provenance to a database (F-042), or serving it over an API (F-015).
- The claims copy lint that binds language to `source` — that is **F-025**.
- `CaptureConditions` capture logic. This defines the type; the Lens fills it in (F-022).
