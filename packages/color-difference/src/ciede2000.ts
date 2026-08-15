/**
 * CIEDE2000 — ΔE00. CIE 142:2001, in the formulation of Sharma, Wu & Dalal (2005).
 *
 * **This is the single most consequential function in the product.** Every naming result,
 * every duplicate warning, every CVD separation score and every recommendation ranking
 * derives from it ([E-003](../../../.harness/state/effects.json)). A defect here changes every
 * answer and produces no error.
 *
 * It also has two failure modes that produce *plausible* results, which is why it is checked
 * against all 34 published test pairs rather than a handful:
 *
 * 1. **The hue difference has a discontinuity at ±180°.** A naive `h2 − h1` is right for every
 *    pair that does not straddle the boundary, so it passes a casual test suite. In the
 *    published set it is caught by **pairs 16, 17 and 19** — pair 19 by 10.8 ΔE00. It is *not*
 *    caught by pairs 9–15, which is the intuitive guess and is wrong: those have ΔC′ ≈ 0 and
 *    near-equal chroma, so the sign flip is squared away and the `Rt` cross-term vanishes.
 *    They test the branch *selection* at exactly ±180°, which is a different defect. Both
 *    facts are asserted in the golden test, because the first version of this comment had it
 *    backwards and nothing in the suite disagreed.
 * 2. **`Rt` is easy to sign-wrong.** It only matters in the blue region around h ≈ 275°, so
 *    an implementation with the sign flipped is correct almost everywhere and wrong exactly
 *    where indigo lives.
 *
 * **ΔE00 is not a metric.** It violates the triangle inequality by design, so it can never sit
 * behind a spatial index — the ordering will be almost right, wrong in specific regions, and
 * silent about it (ADR-0008). [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
 */

import { degreesToRadians, normalizeHue, radiansToDegrees, type Lab } from '@irodora/color-spaces';

/**
 * `25^7`, the chroma pivot in the `G` and `Rc` terms.
 *
 * Written as the literal rather than `Math.pow(25, 7)` because it is exact in float64
 * (6.1e9 is well under 2^53) and because a constant a reader can check against the paper is
 * worth more than one they have to evaluate.
 */
export const CIEDE2000_CHROMA_PIVOT_POW7 = 6103515625;

/** Weighting factors. `1, 1, 1` is the CIE default and the one the published pairs use. */
export interface Ciede2000Weights {
  readonly kL: number;
  readonly kC: number;
  readonly kH: number;
}

/** CIE 142:2001 default weighting — unit weights. */
export const CIEDE2000_DEFAULT_WEIGHTS: Ciede2000Weights = { kL: 1, kC: 1, kH: 1 };

/** The five cosine terms of `T`. CIE 142:2001. */
export const CIEDE2000_T_COEFFICIENTS = [0.17, 0.24, 0.32, 0.2] as const;

/** The phase offsets inside `T`, in degrees. CIE 142:2001. */
export const CIEDE2000_T_PHASES = [30, 6, 63] as const;

/** `Δθ` amplitude, centre and width, in degrees. CIE 142:2001. */
export const CIEDE2000_ROTATION = { amplitude: 30, centre: 275, width: 25 } as const;

/** `Sl` coefficients, `Sc` coefficient, `Sh` coefficient. CIE 142:2001. */
export const CIEDE2000_COMPENSATION = { sl: 0.015, slOffset: 20, sc: 0.045, sh: 0.015 } as const;

const pow7 = (value: number): number => {
  const squared = value * value;
  return squared * squared * squared * value;
};

/**
 * ΔE00 between two CIELAB colours.
 *
 * Both inputs must be in the **same** reference white. This package does not adapt, because a
 * function that silently adapted would make a comparison between a D50 measurement and a D65
 * one look like a valid answer.
 */
export function deltaE00(
  a: Lab,
  b: Lab,
  weights: Ciede2000Weights = CIEDE2000_DEFAULT_WEIGHTS,
): number {
  const [l1, a1, b1] = a;
  const [l2, a2, b2] = b;
  const { kL, kC, kH } = weights;

  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar = (c1 + c2) / 2;

  const g = 0.5 * (1 - Math.sqrt(pow7(cBar) / (pow7(cBar) + CIEDE2000_CHROMA_PIVOT_POW7)));

  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);

  // atan2(0, 0) is 0, which is as good an arbitrary answer as any for an undefined hue — but
  // the guard is explicit because the CHROMA-ZERO cases below depend on it being a real 0
  // rather than something that happens to be 0.
  const h1p = a1p === 0 && b1 === 0 ? 0 : radiansToDegrees(Math.atan2(b1, a1p));
  const h2p = a2p === 0 && b2 === 0 ? 0 : radiansToDegrees(Math.atan2(b2, a2p));

  const deltaLp = l2 - l1;
  const deltaCp = c2p - c1p;

  // The ±180° discontinuity. `h2p - h1p` alone is wrong for every pair that straddles the
  // boundary — which is what published pairs 9 through 15 are for.
  const chromaProduct = c1p * c2p;
  let deltahp: number;
  if (chromaProduct === 0) deltahp = 0;
  else if (Math.abs(h2p - h1p) <= 180) deltahp = h2p - h1p;
  else if (h2p - h1p > 180) deltahp = h2p - h1p - 360;
  else deltahp = h2p - h1p + 360;

  const deltaHp = 2 * Math.sqrt(chromaProduct) * Math.sin(degreesToRadians(deltahp) / 2);

  const lBarP = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;

  // The mean hue has its own wrap, and it is NOT the same rule as the difference above.
  let hBarP: number;
  if (chromaProduct === 0) hBarP = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBarP = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hBarP = (h1p + h2p + 360) / 2;
  else hBarP = (h1p + h2p - 360) / 2;

  const [t1, t2, t3, t4] = CIEDE2000_T_COEFFICIENTS;
  const [p1, p2, p3] = CIEDE2000_T_PHASES;
  const t =
    1 -
    t1 * Math.cos(degreesToRadians(hBarP - p1)) +
    t2 * Math.cos(degreesToRadians(2 * hBarP)) +
    t3 * Math.cos(degreesToRadians(3 * hBarP + p2)) -
    t4 * Math.cos(degreesToRadians(4 * hBarP - p3));

  const deltaTheta =
    CIEDE2000_ROTATION.amplitude *
    Math.exp(-Math.pow((hBarP - CIEDE2000_ROTATION.centre) / CIEDE2000_ROTATION.width, 2));

  const rc = 2 * Math.sqrt(pow7(cBarP) / (pow7(cBarP) + CIEDE2000_CHROMA_PIVOT_POW7));

  const lMinus50 = lBarP - 50;
  const sl =
    1 +
    (CIEDE2000_COMPENSATION.sl * lMinus50 * lMinus50) /
      Math.sqrt(CIEDE2000_COMPENSATION.slOffset + lMinus50 * lMinus50);
  const sc = 1 + CIEDE2000_COMPENSATION.sc * cBarP;
  const sh = 1 + CIEDE2000_COMPENSATION.sh * cBarP * t;

  // The sign is the trap. Negative, and only significant near h ≈ 275° — the blue region.
  const rt = -Math.sin(degreesToRadians(2 * deltaTheta)) * rc;

  const termL = deltaLp / (kL * sl);
  const termC = deltaCp / (kC * sc);
  const termH = deltaHp / (kH * sh);

  return Math.sqrt(termL * termL + termC * termC + termH * termH + rt * termC * termH);
}

/** Re-exported for the property tests and for anything needing a stated hue convention. */
export { normalizeHue };
