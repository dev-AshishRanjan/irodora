# Plan: F-030 — Outfit colour engine

| | |
|---|---|
| **Feature** | F-030 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-31, FR-38 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

*"What goes with this?"* — given a garment colour and the slot it is worn in, return **ranked
colours for the other slots**, each with the score and the four contributions behind it, plus
**alternatives labelled with the dimension they move along** (warmer, cooler, lighter, higher
contrast).

## Approach

### Ranking: what suits the person, and what goes with the garment

`scoreColor` (F-028) answers *does this suit me*. It says nothing about the garment in hand, and
a "what goes with this" that ignored the input would be a personal-colour list wearing a
different name.

So a candidate's rank is the mean of two numbers:

| | |
|---|---|
| **personal** | `scoreColor(profile, candidate, rules)` — content-weighted, already built |
| **pairing** | how well the candidate sits *with the garment*: lightness separation judged against the profile's contrast preference, and temperature coherence between the two colours |

**The 50/50 split is declared, not tuned, and it is the one number here that is not content.**
That is deliberate and stated in the code: FR-32's six-factor model is **F-031**, and inventing
a weight now would put an editorial-looking number in code where F-029 just finished proving
weights belong in `content/rules`. Equal weight is the split that asserts no preference, which
is the honest position while there is no basis for one.

Both halves reuse the **published rule set** — the same `falloff`, the same `poles`, the same
`CONTRAST_TARGET`. No second definition of any axis.

### Bounded before scoring, and observable

Criterion 3. Scoring is the expensive half, so the pool is narrowed *first* by a cheap filter
that touches no score, then capped at `SHORTLIST_LIMIT` per slot.

**The bound is reported, not just applied**: the result carries `considered` and `scored`, so the
test asserts *"a pool of 10 000 was scored at most N times"* rather than asserting that a
constant exists. That is the difference between a bound and a comment
([E-015](../state/effects.json) is the same subject one system over — a shortlist bound is the
only thing making a two-stage search equal a full scan).

### Alternatives are a move along one named axis

FR-38 names the four: **warmer, cooler, lighter, higher contrast**. An alternative is the
best-scoring candidate that moves along that axis *relative to the top pick*, and it carries the
axis as data — never a sentence, same rule as F-028.

At least three are required. Four axes are offered and **an axis with no candidate is omitted
rather than filled**, so the guarantee is "three or more, each real" rather than "four, some
invented". The test asserts both the floor and that a thin pool produces fewer rather than
duplicates.

**Reused:** `scoreColor`, `hueBias`, `intervalFit`, `CONTRAST_TARGET`, `SCORE_FACTORS`,
`ruleSetFor` and the published weights. **New:** `slots.ts`, `outfit.ts`, tests, and a bench.

**Increments:** slots and the pairing fit → bounded generation → ranking → alternatives → the
latency measurement.

## Files to touch

```
packages/recommendation/src/slots.ts    — NEW. The slot vocabulary
packages/recommendation/src/outfit.ts   — NEW. Generation, ranking, alternatives
packages/recommendation/src/index.ts    — export
packages/recommendation/test/outfit.test.ts — NEW
tests/bench/src/index.ts                — a recommendation benchmark reporting p95
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| A second consumer of `RuleSet` | the published weights — a rule version that scores well for one colour must still behave for a pairing | `gate:test`; the outfit tests run against the **published** file, not a fixture |
| `CONTRAST_TARGET` now serves two callers | `scoreColor`'s contrast fit and the pairing fit | `gate:test` — both are asserted, and the constant has one definition |
| A latency claim | NFR-4, gate 12 | **Gate 12 is `pending` and activates with F-038, which is blocked by this feature.** See the risk below |

## Test plan

- **Criterion 1:** ≥ 5 trouser and ≥ 4 shoe candidates from the published corpus, each with a
  score and its four contributions.
- **Criterion 2:** ≥ 3 alternatives, each labelled; every label is a member of the axis union;
  a **thin pool yields fewer alternatives rather than duplicates**.
- **Criterion 3, with the bound observed:** a pool of 10 000 synthetic candidates is scored no
  more than `SHORTLIST_LIMIT` times per slot — asserted from the reported `scored`, with the
  baseline that a small pool is scored entirely.
- **Determinism:** the same inputs produce the same order twice; ties break on slug so the order
  cannot depend on input order.
- **Negative:** the input slot is never recommended back; an empty pool returns empty rather
  than throwing.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
```

`perf` cannot run — see below. **Known red and pre-existing:** `test` on `color-difference` and
`color-spaces` (Node-22 ULP, F-083).

## Risks and open questions

- **Criterion 4 cannot be gated by this feature.** Gate 12 (`perf`) is `pending` and
  `activatesWith: F-038` — and **F-038 is blocked by F-030**, so the gate that would check the
  latency arrives after the feature that produces it. What is measurable here is a **Node-side
  p95 over the real corpus**, which is a design signal and is worth having; what NFR-4 actually
  claims is *"measured on the slowest device in the support matrix"*, and that is a device
  measurement this workstation cannot make. The number will be reported with its conditions and
  the criterion **attested, blocking release**, owed to F-038.
- **The 50/50 blend is not content**, and F-031 replaces it. Recorded in the code and here so it
  is not mistaken for a tuned value.
- **`envelope.rules` on a stored recommendation** (ADR-0011 §2) is still owed. Nothing stores a
  recommendation yet; this engine returns one and records the rule version on it.

## Out of scope

The six-factor outfit score and its explanations (FR-32, F-031) · CVD outfit mode (F-032) ·
the outfit builder UI and locking (FR-33, F-033) · storing a recommendation · harmony rules
between families (ADR-0011's `harmony_rule`) · occasion selection on a screen.
