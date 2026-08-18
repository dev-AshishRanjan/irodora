/**
 * A provable lower bound on ΔE00 from a query to *any* point in a Lab box.
 *
 * **This is the correctness argument of the whole feature.** The two-stage search visits
 * buckets in increasing lower bound and stops when the next bucket's bound is at least the
 * k-th best ΔE00 found so far. That stopping rule is sound if and only if `boxLowerBoundDeltaE00`
 * never overestimates. Loosen it wrongly and every ranking becomes quietly, regionally wrong —
 * no error, no failing conversion, just a different answer than a full scan would give.
 *
 * ## Why not a fixed radius
 *
 * The obvious design is "shortlist everything within R Lab units". It is wrong, and it is wrong
 * in a way that passes its own test: **ΔE00 is not a metric**
 * [[deltae00-is-not-a-metric-and-cannot-be-indexed]], so Euclidean distance in Lab does not
 * bound it. An R sufficient for one corpus is insufficient for another, and adding a single
 * entry can silently change an answer. A test would then prove the radius correct *for the
 * corpus it ran on* — precisely the property that will not survive F-012.
 *
 * With a sound bound plus expansion, **correctness does not depend on the bucket size at all**;
 * it only affects speed. `test/bound.test.ts` asserts identical results at bucket steps 1, 5,
 * 25 and 10⁶ (one bucket = a full scan), which is what makes that claim checkable.
 *
 * ## The derivation
 *
 * For CIEDE2000 with unit weights, writing `x = ΔL′/S_L`, `y = ΔC′/S_C`, `z = ΔH′/S_H`:
 *
 * ```
 * ΔE00² = x² + y² + z² + Rt·y·z
 * ```
 *
 * Four facts, each re-derived rather than taken from a reference, and each one confirmed
 * empirically by the soundness property over millions of random box/point pairs — **the test is
 * the authority here, not this comment.**
 *
 * **1. The chroma-hue pair is bounded below by plain Lab distance.**
 * `ΔC′² + ΔH′² = Δa′² + Δb′²` exactly — expand both sides and each equals
 * `C₁′² + C₂′² − 2C₁′C₂′cos(Δh′)`. And `a′ = (1+G)a`, `b′ = b`, with the **same** `G ∈ [0, 0.5]`
 * applied to both colours of the pair, so `Δa′ = (1+G)Δa` and
 * `Δa′² + Δb′² ≥ Δa² + Δb² = d_ab²`.
 *
 * **2. The `Rt` cross term cannot cancel more than a fixed fraction.**
 * `Rt = −sin(2Δθ)·R_c` with `R_c < 2` and `Δθ = 30°·exp(−((h̄′−275°)/25°)²) ∈ (0°, 30°]`, so
 * `2Δθ ≤ 60°` and `|Rt| ≤ 2·sin 60° = √3`. Since `|y·z| ≤ (y² + z²)/2`:
 *
 * ```
 * y² + z² + Rt·y·z  ≥  (1 − √3/2)(y² + z²)  ≈  0.13397 (y² + z²)
 * ```
 *
 * **3. One divisor bounds both.** `S_H = 1 + 0.015·C̄′·T` and `S_C = 1 + 0.045·C̄′`, with
 * `T ≤ 1 + 0.17 + 0.24 + 0.32 + 0.20 = 1.93`. Since `0.015 × 1.93 = 0.02895 < 0.045`,
 * `S_H ≤ S_C` always — so replacing `S_H` with `S_C` only decreases the expression:
 * `y² + z² ≥ (ΔC′² + ΔH′²)/S_C² ≥ d_ab²/S_C²`.
 *
 * **4. `S_L` is maximised at a box endpoint.** `S_L = 1 + 0.015(L̄−50)²/√(20+(L̄−50)²)` is
 * monotone increasing in `|L̄ − 50|`, so its supremum over an interval of `L̄` is at one end.
 *
 * Combining, with `ΔL_min` and `d_ab_min` the distances from the query to the box (zero when the
 * query lies inside it along that axis):
 *
 * ```
 * lb(box)² = (ΔL_min / S_L_max)²  +  RT_FLOOR × (d_ab_min / S_C_max)²
 * ```
 *
 * ## How loose it is, and why that is acceptable
 *
 * `RT_FLOOR ≈ 0.134` means the chroma-hue term contributes only `≈ 0.37 × d_ab / S_C`, so at
 * high chroma the bound is well below the true distance and the search visits more buckets than
 * a tight bound would. **Worst case is exactly brute force**, which is correct and merely slow.
 * `NamingResult.shortlistSize` reports how much of the corpus was actually examined so that
 * cost is a measured number rather than a claim.
 */

import type { Triple } from '@irodora/color-spaces';

/**
 * `1 − √3/2`. The fraction of `y² + z²` that survives the worst possible `Rt` cancellation.
 *
 * Derived, not tuned: see fact 2 above. Changing it changes what the search is allowed to skip,
 * so it is a correctness constant, not a knob.
 */
export const RT_FLOOR = 1 - Math.sqrt(3) / 2;

/** `T`'s upper bound, `1 + 0.17 + 0.24 + 0.32 + 0.20`. Used only to justify `S_H ≤ S_C`. */
export const T_MAX = 1.93;

/** `G`'s upper bound. `G = 0.5(1 − √(C̄⁷/(C̄⁷ + 25⁷)))` and the radical is in `[0, 1]`. */
export const G_MAX = 0.5;

/** An axis-aligned box in CIELAB. Tight around its members, not the nominal bucket cell. */
export interface LabBox {
  readonly lMin: number;
  readonly lMax: number;
  readonly aMin: number;
  readonly aMax: number;
  readonly bMin: number;
  readonly bMax: number;
}

/** The box containing exactly one point. */
export function boxOf(lab: Triple): LabBox {
  return { lMin: lab[0], lMax: lab[0], aMin: lab[1], aMax: lab[1], bMin: lab[2], bMax: lab[2] };
}

/** Grow a box to contain a point. */
export function extendBox(box: LabBox, lab: Triple): LabBox {
  return {
    lMin: Math.min(box.lMin, lab[0]),
    lMax: Math.max(box.lMax, lab[0]),
    aMin: Math.min(box.aMin, lab[1]),
    aMax: Math.max(box.aMax, lab[1]),
    bMin: Math.min(box.bMin, lab[2]),
    bMax: Math.max(box.bMax, lab[2]),
  };
}

/** Distance from `v` to `[lo, hi]`; zero when inside. */
function axisGap(v: number, lo: number, hi: number): number {
  if (v < lo) return lo - v;
  if (v > hi) return v - hi;
  return 0;
}

/** CIEDE2000's lightness weighting, for a mean lightness. */
function sL(lBar: number): number {
  const d = (lBar - 50) ** 2;
  return 1 + (0.015 * d) / Math.sqrt(20 + d);
}

/**
 * The largest `S_L` attainable for a query lightness against any lightness in `[lMin, lMax]`.
 *
 * `S_L` is monotone in `|L̄ − 50|`, so the maximum over the interval of achievable means is at
 * one of its two endpoints — no search needed.
 */
function maxSL(queryL: number, lMin: number, lMax: number): number {
  return Math.max(sL((queryL + lMin) / 2), sL((queryL + lMax) / 2));
}

/** The largest `√(a² + b²)` attainable inside the box's (a, b) rectangle — always a corner. */
function maxChroma(aMin: number, aMax: number, bMin: number, bMax: number): number {
  const a = Math.max(Math.abs(aMin), Math.abs(aMax));
  const b = Math.max(Math.abs(bMin), Math.abs(bMax));
  return Math.hypot(a, b);
}

/**
 * A value `lb` such that **every** point `p` in `box` satisfies `deltaE00(query, p) >= lb`.
 *
 * Never overestimates. That one-directional guarantee is the entire contract; being close to
 * the true minimum is a performance property and is measured, not asserted.
 */
export function boxLowerBoundDeltaE00(query: Triple, box: LabBox): number {
  const [qL, qA, qB] = query;

  // --- lightness term -----------------------------------------------------------------
  const dL = axisGap(qL, box.lMin, box.lMax);
  const lightness = dL / maxSL(qL, box.lMin, box.lMax);

  // --- chroma-and-hue term ------------------------------------------------------------
  const dA = axisGap(qA, box.aMin, box.aMax);
  const dB = axisGap(qB, box.bMin, box.bMax);
  const dAb = Math.hypot(dA, dB);

  // S_C is computed from the LARGEST mean chroma the box can produce, because a larger S_C
  // makes the term smaller and we need a lower bound. `C′ = (1+G)·C_ab` with `G <= 0.5`.
  const queryChroma = Math.hypot(qA, qB);
  const boxChroma = maxChroma(box.aMin, box.aMax, box.bMin, box.bMax);
  const maxCBar = (1 + G_MAX) * ((queryChroma + boxChroma) / 2);
  const maxSC = 1 + 0.045 * maxCBar;

  const chromaHue = dAb / maxSC;

  return Math.sqrt(lightness * lightness + RT_FLOOR * chromaHue * chromaHue);
}

/**
 * The integer bucket coordinates of a Lab point at `step` units per cell.
 *
 * `+ 0` normalises `-0` to `0`. `Math.floor(-0 / step)` is `-0`, and while a `Map` keyed on a
 * joined string would not care, a key that stringifies to `"-0"` for one point and `"0"` for
 * another that is in the same cell would split a bucket in two — halving its box and, worse,
 * making the bucket boxes no longer tight around what they contain.
 */
export function labBucketKey(lab: Triple, step: number): readonly [number, number, number] {
  return [
    Math.floor(lab[0] / step) + 0,
    Math.floor(lab[1] / step) + 0,
    Math.floor(lab[2] / step) + 0,
  ];
}
