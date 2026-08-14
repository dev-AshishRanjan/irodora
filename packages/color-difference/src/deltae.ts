/**
 * ΔE76, ΔE94 and ΔEok.
 *
 * None of these is the default. ΔE00 is (ADR-0008), and every user-facing claim uses it. These
 * exist for specific reasons:
 *
 * - **ΔE76** — a plain Euclidean distance in CIELAB. Available for comparison and for
 *   explaining why ΔE00 exists at all; never a stated result. It over-reports differences in
 *   saturated colours by a factor of two or more, which is the whole reason CIE 142 was
 *   written.
 * - **ΔE94** — legacy interoperability. Some professional workflows still quote it, and being
 *   able to reproduce someone else's number is worth having.
 * - **ΔEok** — a Euclidean distance in OKLab, which is nearly uniform, so this is cheap and
 *   close. Used to **pre-rank large candidate sets before ΔE00 decides** (F-013, F-030). It is
 *   never a stated result either: "0.02 ΔEok" means nothing to anyone outside this codebase.
 */

import type { Lab, OkLab } from '@irodora/color-spaces';

/**
 * ΔE94 weighting. `kL` and the two chroma/hue coefficients differ by application.
 *
 * **ΔE94 is asymmetric on purpose.** `Sc` and `Sh` are computed from the FIRST colour, which
 * the standard calls the reference. `deltaE94(a, b)` and `deltaE94(b, a)` are different
 * numbers, and that is the specification rather than a defect — but it means a caller ranking
 * candidates must pass the reference consistently, or the ordering is meaningless.
 */
export interface DeltaE94Weights {
  readonly kL: number;
  readonly k1: number;
  readonly k2: number;
}

/** CIE 1994 graphic-arts weighting. The default. */
export const DELTAE94_GRAPHIC_ARTS: DeltaE94Weights = { kL: 1, k1: 0.045, k2: 0.015 };

/** CIE 1994 textiles weighting. */
export const DELTAE94_TEXTILES: DeltaE94Weights = { kL: 2, k1: 0.048, k2: 0.014 };

/**
 * ΔE76 — Euclidean distance in CIELAB (CIE 1976).
 *
 * `Math.hypot` rather than `Math.sqrt(dl*dl + …)`: hypot is specified to avoid intermediate
 * overflow and underflow, and it costs nothing here.
 */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * ΔE94 (CIE 1994). `a` is the **reference**; the result changes if the arguments are swapped.
 */
export function deltaE94(a: Lab, b: Lab, weights: DeltaE94Weights = DELTAE94_GRAPHIC_ARTS): number {
  const [l1, a1, b1] = a;
  const [l2, a2, b2] = b;
  const { kL, k1, k2 } = weights;

  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);

  const deltaL = l1 - l2;
  const deltaC = c1 - c2;
  const deltaA = a1 - a2;
  const deltaB = b1 - b2;

  // ΔH² is a difference of squares and can come out very slightly negative for colours that
  // differ only in chroma — pure float64 cancellation, around -1e-14. Clamping to zero is not
  // papering over anything: the true value is zero, and `Math.sqrt` of -1e-14 is NaN, which
  // would propagate silently through every comparison downstream.
  const deltaHSquared = Math.max(0, deltaA * deltaA + deltaB * deltaB - deltaC * deltaC);

  const sc = 1 + k1 * c1;
  const sh = 1 + k2 * c1;

  const termL = deltaL / kL;
  const termC = deltaC / sc;

  return Math.sqrt(termL * termL + termC * termC + deltaHSquared / (sh * sh));
}

/**
 * ΔEok — Euclidean distance in OKLab.
 *
 * OKLab is near-uniform, so a Euclidean distance in it is a reasonable perceptual ordering at
 * a fraction of ΔE00's cost. **It is a pre-filter, not an answer**: it disagrees with ΔE00 on
 * ordering in specific regions, and the whole point of ΔE00 is that those regions matter.
 */
export function deltaEok(a: OkLab, b: OkLab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
