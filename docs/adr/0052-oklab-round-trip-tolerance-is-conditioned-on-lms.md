# ADR-0052 — The OKLab round-trip tolerance is conditioned on LMS, and 1e-12 was wrong

## Status

Accepted

## Date

2026-08-19

## Context

`packages/color-spaces/test/oklab.test.ts` asserted that XYZ ↔ OKLab round-trips **arbitrary**
OKLab values to better than `1e-12`, over a generator declaring `L ∈ [0,1]`, `a,b ∈ [-0.4,0.4]`.

That assertion is false, and had been since it was written.

F-071 recorded it as a flake: the test failed once during F-009 at `1.2477e-12` against a
`1e-12` bound — "a 25 percent overshoot, so it will recur". **The recorded diagnosis was
wrong, and comfortably so.** Measured over 2,000,000 cases drawn from that exact generator,
the worst round-trip error is `5.422e-8` — not a 25 % overshoot but a factor of **54,000**.

It had been passing because 5,000 unseeded samples almost never reach the tail. Seeding it
under F-071 would have frozen that luck in place: a green run proving nothing, permanently.

### Why the error is there

It is conditioning, not a defect in the implementation.

`oklabToXyz` cubes the LMS′ components; `xyzToOklab` takes the cube root to invert. Since
`d/dx x^(1/3) → ∞` as `x → 0`, an LMS′ component near zero has a cube that underflows toward
the floating-point noise floor, and the inverse amplifies that noise back into OKLab units.

The worst case found is OKLab `[0.0447, 0.1818, 0.4]`, whose LMS′ is
`[0.203, -3.7e-5, -0.488]`. Cubed, those span `[8.4e-3, -5.1e-14, -1.2e-1]` — a ratio of
`2.3e12`. The middle component is doing arithmetic at the edge of double precision while its
neighbours are not.

The error tracks the conditioning number precisely, over 2,000,000 samples:

| `min|LMS′|` ≥ | worst round-trip error |
|---|---|
| anything | 5.422e-8 |
| 1e-6 | 5.422e-8 |
| 1e-5 | 3.174e-10 |
| 1e-4 | 1.169e-10 |
| 1e-3 | 6.457e-12 |
| 1e-2 | 4.607e-14 |

**No real colour is anywhere near this.** Every input in that generator's range is far outside
any physical gamut — an OKLab chroma of 0.4 at `L = 0.045` corresponds to nothing. The
stratified sRGB round-trip test in the same file covers actual colours and holds at `1e-14`,
and a direct probe of in-gamut values measures `2.78e-16`.

Requirements at stake: **NFR-1** (engine accuracy), **NFR-3** (determinism), **NFR-19**
(testability).

## Decision

**Split the claim in two, and set each bound from a measurement.**

1. **Over the full declared range**, assert `< 1e-6`. That is 18× the measured worst case of
   `5.422e-8`. This property's job is to assert the transform stays *sane* — finite,
   invertible, no NaN — in a region where nothing physical lives.
2. **Where LMS′ is well conditioned** (`min|LMS′| ≥ 1e-2`, which includes every real colour),
   assert `< 1e-12`. That is 21× the measured worst case of `4.607e-14`, and it preserves the
   guarantee the original test was reaching for.
3. **Every tolerance in this file states its measured worst case and the sample size behind
   it**, in the test, next to the number.

The measurement method is recorded so it can be repeated: draw from the same generator across
several recorded seeds, track the maximum absolute deviation, and bucket by `min|LMS′|`.

## Consequences

**Good**

- The test now asserts something true. It was green and wrong, which is worse than red.
- The tight guarantee survives where it means something, rather than being abandoned along
  with the false one.
- The failure mode is documented: anyone who later sees a large OKLab round-trip error has
  the conditioning explanation and the table, instead of rediscovering it.
- It removes a live trap. Seeding this property under F-071 without measuring first would
  have locked in a passing seed and made the test permanently incapable of failing.

**Bad**

- **`1e-6` is a weak assertion.** Over the full range this property would no longer catch a
  moderate implementation error — only a gross one. That weakness is real; it is mitigated by
  the conditioned property, the stratified sRGB test at `1e-14`, and the golden datasets, none
  of which this bound replaces.
- **The bound is empirical, not derived.** A forward error analysis of the cube/cube-root pair
  would give a defensible closed form; this is 2,000,000 samples and a safety factor. Honest,
  but weaker than mathematics.
- The heavy tail means a much larger sample could still find something above `5.422e-8`. The
  18× margin is the answer to that, and it is a judgement rather than a proof.

**Neutral**

- No `src/` change. The engine is correct; only the claim about it moves.
- The golden datasets are untouched — this is a property tolerance, not a reference value, so
  no claim about physical reality changes.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep `1e-12` and restrict the generator to real colours** | Good at: preserving a strong bound, and testing only what ships. Not enough: it deletes the coverage that found this, and the transform genuinely is asked for out-of-gamut values — [ADR-0045](0045-gamut-mapping-is-chroma-bisection-without-minde.md) maps them, so they arrive constantly. A test that only sees comfortable inputs cannot report that uncomfortable ones behave differently. |
| **Widen to `1e-6` and stop there** | Good at: one number, one property, minimal change. Not enough: it silently abandons the `1e-14`-class guarantee that real colours actually have, and nothing would then notice a genuine regression in the region that matters. |
| **Assert a relative rather than absolute bound** | Good at: relative error is the natural measure for a conditioning problem. Not enough: OKLab `a` and `b` legitimately pass through zero, so a relative bound is undefined exactly where neutral colours live — the most common case in the product. |
| **Treat the amplification as a defect and fix the engine** | Good at: it would be the right response if it were one. Not enough: the mechanism is inherent to inverting a cube near zero in floating point. Any implementation cube-rooting a value that underflowed has the same behaviour, and [ADR-0040](0040-oklab-uses-the-css-color-4-recalculated-matrices.md) fixes the matrices we invert. There is nothing to fix. |
| **Leave it, and record the finding as a known gap** | Good at: it changes no test, so it cannot break one. Not enough: the test makes a false claim in its own name — "round-trips arbitrary OKLab values". Leaving a false assertion green because correcting it is awkward is the failure this repository exists to prevent. |

## Revisit when

- A forward error analysis of the cube/cube-root pair is done, which would replace the
  empirical bound with a derived one and should tighten `1e-6` considerably.
- Any measured round-trip error exceeds `5.422e-8`, which means the sample that produced this
  bound was not representative and the margin needs re-deriving rather than widening.
- The engine moves to a different OKLab formulation, or to WASM with different intermediate
  precision — both change the conditioning and invalidate every number in the table above.
