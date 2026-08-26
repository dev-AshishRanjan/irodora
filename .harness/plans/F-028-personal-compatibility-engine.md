# Plan: F-028 — Personal compatibility engine

| | |
|---|---|
| **Feature** | F-028 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-11, FR-29 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-25 |

---

## Intent

*"Does this colour suit me?"* answered as a number in [0,100] with **four named contributions**
behind it — temperature, lightness, chroma, contrast — each carrying how much it moved the
score and in which direction, as **data**. No sentence is produced anywhere in the engine.

The two profile features exist for this. F-026 and F-027 produce seven dimensions with a
confidence each; this is what reads them, and criterion 3 is where those confidences finally do
something: **an uncertain dimension influences the score less.**

## Approach

### The score

```
fit(factor)        ∈ [0,1]     how well the colour matches on that axis
weight(factor)     from the RuleSet, the four summing to 1
effective(factor)  = weight × confidence(factor),  renormalised over the four
score              = round(100 × Σ effective × fit)
```

Because the fits are in [0,1] and the effective weights sum to 1, **the score is in [0,100] by
construction** rather than by clamping. That is what makes criterion 1 a property instead of a
range check, and it is why `parseRuleSet` refuses weights that do not sum to 1: a clamp would
hide the defect and still return a plausible number.

### Confidence weights the contribution — and the case where there is none

Renormalising is what makes "weights uncertain dimensions less" mean something: dropping a
dimension's influence has to raise the others, or the score simply drifts downward for an
uncertain profile and looks like a *worse match* rather than a *less certain* one. Those are
different claims and the second is the true one.

**When every confidence is zero the effective weights are all zero**, and there is nothing to
renormalise. The engine returns `50` with all four contributions at `0` and its own `confidence`
at `0` — a legible "nothing to go on". It does **not** fall back to equal weights, which would
be an answer asserting certainty the profile does not have. F-027 makes this reachable rather
than theoretical: a photo estimate abstains on contrast at confidence 0.

### Explanations are data

```ts
{ factor, fit, weight, contribution, direction, messageKey }
```

`messageKey` is an i18n key the engine never renders — that is FR-11's whole point, and
criterion 4's. The key set is a **contract with the catalogue** ([E-016](../state/effects.json)'s
shape, from a new direction): the engine can emit a key the app does not have, and the compiler
cannot see it because the engine has no idea `MessageKey` exists. Guard: a test asserts every
key the engine can emit is present in the English catalogue, driven from the engine's own
exported list rather than a hand-written one.

**Reused:** `@irodora/color-core` (`Color`, so a scored colour cannot exist without provenance —
ADR-0005), `@irodora/color-spaces` (`xyzToOklch`, the one conversion), the existing
`ExplanationDirection` in the package.

**New:** `profile.ts` (the structural input), `rules.ts` (`RuleSet`, factors, `parseRuleSet`),
`score.ts` (the scoring), tests.

### The profile arrives structurally, not as an import

`@irodora/recommendation` must not depend on `@irodora/store` — the engine has no business
knowing about a database, and the store package deliberately has no runtime dependencies either.
So the engine declares the **narrow shape it needs** and `NewPersonalProfile` satisfies it
structurally, exactly as `Repository` satisfies `PaletteStore`. `typecheck` is what proves the
two agree, and an assignability test asserts it in both directions so a store change that breaks
the engine fails here rather than in F-030.

**Increments:** rules and the validator → the four fits → scoring and renormalisation →
explanations and the key contract → the duplication guard.

## Files to touch

```
packages/recommendation/src/profile.ts   — NEW. The structural profile input
packages/recommendation/src/rules.ts     — NEW. RuleSet, factors, parseRuleSet, RuleError
packages/recommendation/src/score.ts     — NEW. The four fits and the score
packages/recommendation/src/index.ts     — the public surface
packages/recommendation/package.json     — @irodora/color-spaces, and store as a devDependency
packages/recommendation/test/*.test.ts   — NEW
.harness/state/effects.json + memory     — the key contract, and the duplicated hue rule
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| The engine emits **i18n keys** | both catalogues — a key with no entry renders nothing, and the compiler cannot see it from here | **NEW LINK.** A test drives the assertion from the engine's exported key list against `en` |
| The **structural profile** shape | `@irodora/store`'s `NewPersonalProfile`; a column removed there breaks scoring with no import edge moving | `gate:typecheck` + an explicit assignability test |
| **Warm/cool reference hues** are defined here **and already exist in `apps/mobile/src/profile/photo.ts`** | two definitions of one product rule — the [E-008](../state/effects.json) shape | **A cross-package agreement test**, plus a backlog feature to delete the duplicate. See the risk below |
| Rule **weights** become an input | F-029, which will supply them from content and close **E-009** | F-029's own |

## Test plan

- **Unit:** each fit at its boundaries — inside the range, at the edge, far outside; the
  temperature fit at both poles and at neutral.
- **Property:** the score is in [0,100] for a grid of profiles × colours; it is **pure** (same
  inputs, same output, twice); a higher fit never lowers the score.
- **Criterion 3, with a decoy:** dropping one dimension's confidence to 0 changes the score
  toward what the other three say — **and** the same profile with full confidence gives the
  other answer, so "confidence is read" is distinguishable from "the value is constant".
- **Criterion 4, with a decoy:** every explanation field is a number, an enum member or a key
  matching `^[a-z]+(\.[a-zA-Z]+)+$`; the decoy asserts that shape rejects a sentence.
- **Negative:** `parseRuleSet` refuses weights that do not sum to 1, a missing factor, an
  unknown factor and a bad version — each watched failing, with the valid set asserted green in
  the same table.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm build
```

`a11y`, `contrast`, `content` and `cvd` do not apply — this feature renders nothing and ships no
content. **Known red and pre-existing:** `test` on `color-difference` and `color-spaces`
(Node-22 ULP, F-083), `security` (F-096). Neither may be reported as green.

## Risks and open questions

- **The warm/cool rule now exists twice.** `apps/mobile/src/profile/photo.ts` derives a
  temperature bias from a hue, and so must this engine. The correct fix is for the app to import
  the engine's — and **it cannot**: `apps/mobile/node_modules/@irodora/` has no `recommendation`
  link and `pnpm install` refuses on this workstation (Node 22.16.0 against `engines`).
  So the engine owns the definition, a test asserts the app's constants still agree with it, and
  the deletion is filed. This is stated rather than absorbed because a second definition of a
  colour rule is exactly what E-008 exists to prevent.
- **Nothing consumes this engine yet.** F-030 is what will, and it is blocked on F-029. The same
  shape as F-040's seam and F-027's estimate; it is why the key-contract guard matters more than
  usual, since the compiler cannot connect the two ends.
- **The weights are not content yet.** FR-67 and E-009 are F-029's, and the engine requires a
  `RuleSet` argument rather than shipping a default precisely so that no weight lives in code
  where F-029 would have to find it.

## Out of scope

Outfit scoring across slots (F-031) · occasion contexts (FR-34, F-029) · the rule content
pipeline and its publish validation (F-029) · storing a recommendation or its envelope (F-030) ·
CVD scoring (F-032) · wiring the engine into the app, which needs an install this workstation
cannot run.
