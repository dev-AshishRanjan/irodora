# Colour Science Rules

**The zone is a GRAPH, not a name (F-073).** These rules bind `packages/color-*` and
`packages/cvd-engine` — and **every workspace package they depend on, transitively**.
`scripts/verify-engine-purity.mjs` computes that closure and holds each member to the same
platform-API and runtime-dependency rules, because an engine package depending on a package
that imports `node:fs` breaks NFR-3 just as surely as importing it directly.

**Mandatory for `packages/color-*`, `packages/cvd-engine`, and anything computing a colour
value.**

This is the strictest zone in the repository, because it is the product. Everything else is
an interface to it.

---

## The three hard constraints

### 1. Zero runtime dependencies, zero platform APIs

```ts
// All of these fail lint in packages/color-*:
import fs from 'node:fs';
if (typeof window !== 'undefined') { … }
process.env.SOMETHING;
import chroma from 'chroma-js';
```

The engine must produce **byte-identical results in Node, the browser and React Native**
(NFR-3), and must port to WASM without a rewrite. A platform API breaks both. A dependency
puts a third party's precision decisions inside our central correctness claim
([ADR-0004](../../../docs/adr/0004-own-the-colour-engine-culori-as-test-oracle.md)).

### 2. Every colour carries its provenance

There is no `Color` without a `Provenance`. Do not work around this
([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).

`Color.unsafeFromHex()` exists for genuinely untracked origins. Its name is unpleasant on
purpose, and every call site is reviewed.

### 3. Golden values are claims about physical reality

**Changing a golden value requires an ADR.** If a golden test fails after your change, the
default assumption is that you broke the engine — not that the expected value needs
adjusting.

> A change to the engine that ships without a golden-dataset check is a defect, even if
> every test is green — because the tests are then agreeing with the change rather than
> checking it.

---

## Numerical discipline

| Rule | Why |
|---|---|
| `float64` throughout | No `Math.fround`, no deliberate precision reduction |
| No approximated `pow`, `cbrt`, `atan2` | If a hot path needs one, it goes behind a flag with a golden test proving its error bound |
| Matrices stored at full published precision | Never rounded for readability |
| Inverse matrices stored explicitly | A runtime inverse introduces platform-dependent error in the one place we cannot afford it |
| Round only at the boundary | When producing a hex or a display value. Never mid-pipeline |
| **Average in linear light** | Averaging non-linear sRGB is the most common colour bug there is, and it always reads too dark |
| Hue is an angle | Shortest arc. `(350° + 10°) / 2 = 0°`, not `180°`. Property-tested |

---

## Known traps

**The sRGB transfer function has a linear segment below 0.04045.** Using the pure power
function throughout is visibly wrong in dark colours — and dark colours are half this
corpus, because indigo, sumi and charcoal are what the product is about. The golden set
contains near-black values specifically for this.

**CIEDE2000 has a hue discontinuity at ±180° and an easily sign-wrong `Rt` term.** Both
errors produce plausible-looking results. This is why all 34 Sharma–Wu–Dalal test pairs are
in the golden set, asserted to 4 decimal places. An implementation that does not reproduce
them is wrong regardless of how it reads.

**ΔE00 is not a metric.** It violates the triangle inequality by design. Never put it
behind a spatial index — the ordering will be almost right, wrong in specific regions, and
silent about it
([ADR-0008](../../../docs/adr/0008-search-postgres-fts-with-engine-side-perceptual-ranking.md)).

**Chroma is not saturation.** Chroma is colourfulness; saturation is chroma relative to
lightness. Say what you mean, and name the variable accordingly.

**HSL's `L` is not perceptual lightness.** `hsl(60 100% 50%)` and `hsl(240 100% 50%)` have
wildly different perceived lightness. Manipulate in OKLCh.

---

## Verification, for any engine change

| | |
|---|---|
| **Golden** | Update, or explicitly confirm unchanged. Changed → ADR |
| **Property** | Round-trip, symmetry, monotonicity, bounds, hue wrap, idempotence |
| **Oracle** | Cross-validate against `culori` and `colorjs.io` over large random samples |
| **Cross-platform** | Node, browser and React Native produce bitwise-identical output |
| **CVD** | The `cvd` gate, if separation or recommendation is affected |
| **Effects** | [E-001](../../state/effects.json) — does the corpus need rebuilding? |

A disagreement with an oracle is a **finding**, not automatically our bug. Determine which
is right against the published standard before changing anything.

---

## Language

Enforced by the claims lint
([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md)), and it applies to code
comments and variable names, not only to UI copy.

| Never | Instead |
|---|---|
| "exact colour" | "closest reference" |
| "the actual colour" | "the estimated colour" |
| "measures" (for an estimated source) | "estimates" |
| `isExactMatch` | `isWithinTolerance` |
| "100% accurate" | a measured ΔE00 with its conditions |

**Naming is never identity.** The output is "closest digital reference", never "this is
藍鼠". A rendered hex is a modern approximation of a colour historically produced by a dye on
a fibre under daylight.

---

## Before you start

Read [`../../../docs/architecture/color-engine.md`](../../../docs/architecture/color-engine.md)
in full, and [`packages/color-core/AGENTS.md`](../../../packages/color-core/AGENTS.md).

If you are about to implement a published algorithm, **read the paper, not a blog summary
of it.** Every one of the traps above is present in at least one widely-copied blog
implementation.
