# Plan: F-031 — Outfit scoring and explainability

| | |
|---|---|
| **Feature** | F-031 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-11, FR-32 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

An outfit gets **six component scores and an overall**, and the overall never stands in for the
six. Each component returns its own factor decomposition — direction and magnitude, as data —
so a person can see *which* part of an outfit is working and which is not, rather than being
handed a number.

## Approach

### The six, and what each one is honestly measuring

| Component | Measured as | Reads |
|---|---|---|
| **harmony** | hue relationships between the outfit's colours, against the rule set's poles | the outfit |
| **personalFit** | `scoreColor` per garment, area-weighted by slot | F-028, the profile |
| **contrast** | separation between pieces against the person's preference | `CONTRAST_TARGET` |
| **corpusAffinity** | ΔE00 from each colour to its nearest **published corpus entry** | a reference set the caller supplies |
| **versatility** | how many of the reference colours the outfit's colours pair well with | `pairingFit` (F-030) |
| **cvdAccessibility** | `separationScore` between every pair, at the strongest tabulated severity | `@irodora/cvd-engine` |

**"Japanese aesthetic" is named `corpusAffinity`, and that is the whole point.** FR-32 lists it,
and a number claiming to say how *Japanese* an outfit is would be an aesthetic judgement nobody
has measured and nobody could defend — precisely what golden rule 11 and
[ADR-0031](../../docs/adr/0031-measurement-claims-policy.md) exist to stop. What is measurable
is **how close the colours sit to a curated corpus of Japanese colours**, which is a real
distance with a real unit. The field name, its doc comment and its message key all say that
rather than the thing it might be mistaken for. An ADR records the rename and why.

### CVD reads the one definition that already exists

[E-005](../state/effects.json) named this exact consumer before it existed:

> *The UI's CVD preview, **the recommendation engine's separation factor** and the design
> system's `cvdPairs` check all read the same score.*

So `cvdAccessibility` imports `separationScore` from `@irodora/cvd-engine`. It does not define a
second one, and the link gains a real `to` rather than a predicted one.

### The overall never replaces the six

Criterion 2. Two mechanisms, because a convention would not survive:

1. `OutfitScore.overall` is a number **and** `components` is always all six, in a fixed order —
   there is no shape of the result that carries an overall without them.
2. The overall's own decomposition names the six components as its factors, so "why is it 71?"
   is answerable from the object rather than from the source.

**Reused:** `scoreColor`, `pairingFit`, `CONTRAST_TARGET`, `hueBias`, `SLOT_AREA`, the published
rule set. **New:** `outfit-score.ts`, two dependencies (`@irodora/cvd-engine`,
`@irodora/color-difference`), tests, an ADR.

**Increments:** the dependencies and their lockfile entries → the six components → the overall
and its decomposition → the tests.

## Files to touch

```
packages/recommendation/src/outfit-score.ts   — NEW. Six components and the overall
packages/recommendation/src/index.ts          — export
packages/recommendation/package.json          — cvd-engine, color-difference
pnpm-lock.yaml                                — the matching importer entries
packages/recommendation/test/outfit-score.test.ts — NEW
docs/adr/00NN-…                               — why the component is corpusAffinity
.harness/state/effects.json + memory          — E-005 gains its predicted consumer
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **`separationScore` gains the consumer E-005 predicted** | the CVD engine's definition now decides a recommendation's accessibility claim as well as a preview | **E-005**, `gate:cvd` — and the link's `to` stops being a prediction |
| Two new workspace dependencies | the lockfile, which must agree with the manifest | **gate 0's lockfile check** (F-098) — watched failing before it is fixed |
| A sixth message-key family | both catalogues, eventually | **E-016** — still owed by the first feature that renders a score, unchanged |
| `SLOT_AREA` becomes a weight | it was ordinal-only in F-030; area-weighting personal fit makes its magnitudes matter | `gate:test` — asserted, and the constant's doc comment updated to say so |

## Test plan

- **Criterion 1:** all six components present, each in [0,100], for a real outfit built from the
  published corpus.
- **Criterion 2, with a decoy:** the result type cannot express an overall without components —
  asserted structurally, plus that every component appears in the overall's decomposition.
- **Criterion 3:** every component returns factors with `direction` and a magnitude, and every
  `messageKey` matches the dotted shape; the decoy asserts that shape rejects prose.
- **Discrimination, both directions per component:** an outfit that is good on a component
  scores above one that is bad — and the reverse pairing scores the other way, so each
  component is shown to *read* its input rather than return a constant.
- **CVD:** an outfit of two colours a deutan cannot separate scores below one of two they can,
  and the number comes from `separationScore` rather than a local calculation.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
pnpm test:cvd
```

`e2e` is in this feature's list and **cannot run** — gate 7 is `pending` and F-091 is blocked on
the environment. Reported as not run. **Known red and pre-existing:** `test` on
`color-difference` and `color-spaces` (Node-22 ULP, F-083).

## Risks and open questions

- **Five of the six components are conventions.** Only `cvdAccessibility` rests on a published
  model. The others are formulas this repository invented, and each doc comment has to say so —
  a component that reads like a measurement is worse than one that admits it is a judgement.
- **The component weights for the overall.** Six numbers that must sum to 1 is exactly the shape
  F-029 made content. Publishing `weights.2026.08.2` with an `outfit` block would be correct and
  is a real cost; folding them in as declared constants would repeat what F-030 explicitly
  refused to do. **Decision: publish a new weight version.** F-029 built the machinery precisely
  so this is a content change, and the first time it is used should not be the first time it is
  avoided.
- **`e2e` cannot run**, so nothing here proves a person ever sees six numbers.

## Out of scope

The CVD *mode* — flagging and alternatives with a measured improvement (FR-35, F-032) · the
outfit builder and locking (F-033) · storing a scored outfit or its envelope · rendering any of
this.
