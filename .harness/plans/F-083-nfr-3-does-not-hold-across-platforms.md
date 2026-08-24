# Plan: F-083 — NFR-3 does not hold across platforms

| | |
|---|---|
| **Feature** | F-083 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-3 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/color-difference` · `packages/testing` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-24 |

---

## Intent

NFR-3 says *"identical outputs on every platform"*. It is false. The same Node 24.19.0
produces a different digest on Windows and on Linux for roughly 0.2 % of inputs, and CI has
been red on it since the first run that reached gate 4.

**This increment does not decide anything.** It measures the one thing every option depends
on and nobody has: **by how much.** A last-ulp disagreement and a visible colour difference
are the same red gate and completely different products, and the choice between shipping
deterministic transcendentals and restating the guarantee cannot be made without knowing
which one this is.

## What is already established

| | |
|---|---|
| Whole-run digest | `9801fa1ab561ec61` (Linux) vs `31d18557233bbe42` (Windows) |
| Metrics | 8 of 8 differ |
| Stages | 12 of 12 differ — `linearR`…`okb` |
| Metric chunks | 19 of 100 |
| Stage chunks | 13 of 100 |
| Fixed constants | all 16 reproduce — including `srgbToLinear(0.5)` and both references |
| Probes | all 6 inputs and outputs reproduce |

So: rare, input-dependent, and upstream of everything — one divergent linear channel carries
into XYZ, Lab, Oklab and every metric for that sample. The six probe colours and the ten
constant inputs are simply not among the unlucky ones.

**Three earlier diagnoses were withdrawn**, all read off a truncated annotation list
([[a-truncated-report-reads-exactly-like-a-passing-one]]). The magnitude is the first
question this feature asks that has not already been answered wrongly once.

## Approach

**Reused.** The probe mechanism already exists and already records inputs and outputs in exact
hex — it was built for precisely this and has been carrying six samples, none of which
diverge.

**The change is one number: six probes become five hundred**, every twentieth sample. With 13
of 100 chunks containing a divergence, an evenly spread 500 lands several. Probes are
*recorded*, never digested, so **the whole-run digest is unchanged** and this cannot be
mistaken for regenerating a fixture to go green.

**New.** The single assertion — one, because the reporting channel caps at ten — computes and
prints, per column:

- how many probes differ;
- the **maximum ULP distance** between the committed value and this platform's;
- the worst sample's input, both values, and the relative difference.

ULP distance is computed from the IEEE-754 bit patterns, which is the only honest unit here: a
relative epsilon flatters values near zero and punishes values near a binade edge.

**Increments.**

1. `ulpDistance` in `@irodora/testing`, with unit tests including the sign-boundary and
   subnormal cases that a naive bit subtraction gets wrong.
2. Probe set widened to 500; stage probes recorded alongside metric probes; fixture
   regenerated with the digest asserted unchanged.
3. The report gains the magnitude section.

## Files to touch

```
packages/testing/src/bits.ts                       — ulpDistance
packages/testing/test/bits.test.ts                 — its edge cases
packages/testing/src/identity.ts                   — record stage probes too
packages/color-difference/test/identity/vectors.ts — 500 probe indices
packages/color-difference/test/golden/identity.test.ts — the magnitude report
scripts/generate-identity-fixture.mjs              — emit both probe sets
packages/color-difference/golden/cross-platform-identity.fixture.json — regenerated
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| The probe set grows | the fixture's size, ~250 KB | none needed; probes are data, not a claim |
| `IdentityRun` gains stage probes | `@irodora/color-spaces`' identity test | additive; that test ignores the new field |
| **The whole-run digest must not move** | every NFR-3 claim | asserted byte-identical either side of the regeneration, as in the three previous rounds |

## Test plan

- **Unit:** `ulpDistance` on adjacent doubles (1), identical (0), across zero, across a binade
  boundary, and on a NaN or Infinity — which must be reported, not silently returned as 0.
- **Not testable here:** the magnitude itself. It needs the Linux run. This workstation
  produces one side of the comparison and the fixture already holds it.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm build && node scripts/generate-identity-fixture.mjs   # digest MUST be unchanged
pnpm test:golden
```

## Risks and open questions

- **500 probes may still miss every divergent sample.** 13 % of chunks contain one, and the
  probes are spread five per chunk, so the chance of missing all of them is small — but not
  zero, and if it happens the answer is more probes, not a different conclusion.
- **The decision itself is out of scope here and stays with the maintainer** — deterministic
  transcendentals, or NFR-3 restated as identity after canonical rounding. The recommendation
  and both costings are in the feature's notes.

## Out of scope

- Choosing between the two options, or writing the ADR that records it.
- Changing any engine code. Nothing in the engine moves in this increment.
- `@irodora/color-spaces`' own fixture, which passes and may be passing by luck. Answering
  that is a separate measurement and a separate seed.
