# AGENTS.md — `packages/color-*`, `packages/cvd-engine`, and their dependency closure

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** This scope is **stricter**, never looser — no scope may relax a golden rule, and
> the `state` gate checks that.

**This is the strictest zone in the repository, because it is the product.** Everything
else is an interface to it.

---

## The three constraints that cannot bend

### 1. Zero runtime dependencies, zero platform APIs

```ts
// All of these fail lint here:
import fs from 'node:fs';
import chroma from 'chroma-js';
if (typeof window !== 'undefined') { … }
process.env.ANYTHING;
```

The engine must produce **byte-identical results in Node, the browser and React Native**
(NFR-3), and must port to WASM without a rewrite. A platform API breaks both. A dependency
puts a third party's precision decisions inside our central correctness claim.

### 2. Provenance is not optional

There is no `Color` without a `Provenance`. Do not work around the type
([ADR-0005](../../docs/adr/0005-measurement-provenance-is-a-type.md)).

`Color.unsafeFromHex()` is the only untracked construction path. Its name is unpleasant on
purpose, and every call site is reviewed.

### 3. A golden value is a claim about physical reality

**Changing one requires an ADR.**

> If a golden test fails after your change, the default assumption is that **you broke the
> engine** — not that the expected value needs adjusting.

---

## Numerical discipline

| Rule | Why |
|---|---|
| `float64` throughout | No `Math.fround`, no deliberate precision reduction |
| No approximated `pow`, `cbrt`, `atan2` | A hot path that needs one gets a flag, a golden test proving its error bound, and an ADR |
| Matrices at full published precision | Never rounded for readability |
| Inverses stored explicitly | A runtime inverse introduces platform-dependent error where we can least afford it |
| Round only at the boundary | Producing a hex or a display value. Never mid-pipeline |
| **Average in linear light** | Averaging non-linear sRGB is systematically too dark |
| Hue is an angle | Shortest arc. `(350° + 10°) / 2 = 0°` |

---

## The traps

Each of these produces a **plausible wrong answer**, and each is present in at least one
widely-copied blog implementation.

- **The sRGB linear segment below 0.04045.** Pure power throughout is visibly wrong in dark
  colours — and half this corpus is dark. [[srgb-transfer-function-has-a-linear-segment]]
- **CIEDE2000's hue discontinuity at ±180°, and the `Rt` sign.** Why all 34
  Sharma–Wu–Dalal pairs are asserted to 4 decimal places.
- **Averaging encoded sRGB.** [[averaging-non-linear-srgb-reads-too-dark]]
- **ΔE00 behind a spatial index.** It is not a metric.
  [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
- **Chroma called saturation.** A naming error that propagates into a claim.

**Read the paper, not a summary of it.**

---

## Verifying a change here

```bash
pnpm --filter @irodora/color-spaces test
pnpm test:golden
pnpm test:cvd          # if separation or recommendation is affected
```

- [ ] Golden datasets updated, **or explicitly confirmed unchanged**
- [ ] Property tests: round-trip · symmetry · monotonicity · bounds · hue wrap · idempotence
- [ ] Oracle cross-validation against `culori` and `colorjs.io` — a disagreement is a
      **finding**, not automatically our bug
- [ ] **Cross-platform identity**: Node, browser, React Native, bitwise identical
- [ ] Effects traced — did a conversion change? Then the corpus is invalid
      ([E-001](../../.harness/state/effects.json))

## Tolerances

| Comparison | Tolerance |
|---|---|
| Golden conversion | ΔE00 ≤ 0.01, Lab ≤ 0.02 absolute |
| CIEDE2000 vs reference | 4 decimal places |
| Cross-platform | **Bitwise. Zero** |

Loosening one requires an ADR. Loosening one to make a test pass is the specific failure
this file exists to prevent.

---

## Language, in code as much as in copy

`isWithinTolerance`, not `isExactMatch`. "Estimates", not "measures". "Closest reference",
not "exact colour". A misnamed identifier propagates into a field, a response, and finally a
claim we cannot support ([ADR-0031](../../docs/adr/0031-measurement-claims-policy.md)).

## Before you start

[`.harness/rules/color/color-science.md`](../../.harness/rules/color/color-science.md) ·
[`docs/architecture/color-engine.md`](../../docs/architecture/color-engine.md) ·
[`color-math`](../../.harness/skills/color-math/SKILL.md).
