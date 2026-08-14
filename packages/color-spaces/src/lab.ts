/**
 * CIELAB and CIELCh — CIE 15:2018.
 *
 * Two things are worth knowing before changing anything here.
 *
 * **ε and κ are exact rationals, and that is not decoration.** `216/24389` and `24389/27`
 * are chosen so the two branches of `f` meet exactly: `κ · ε = 8`, and `(κ·ε + 16)/116` is
 * bit-identical to `cbrt(ε)`. Writing them as decimals — 0.008856 and 903.3 — breaks that
 * join and puts a step in the curve at the darkest end, which is the end this product lives
 * at. The golden set asserts the join to zero tolerance.
 *
 * **Lab here is D65-referenced.** Almost everywhere else it is D50: CSS `lab()` is D50, and
 * `culori`'s `lab` mode is D50. A comparison against another library that does not account
 * for this disagrees by several ΔE and looks like an implementation bug in whichever
 * direction you were not expecting. Cross-check against `lab65` / `lab-d65`, or adapt first.
 */

import { degreesToRadians, normalizeHue, radiansToDegrees } from './numeric.js';
import { CANONICAL_WHITE } from './whitepoints.js';
import type { Lab, LCh, Xyz } from './types.js';

/** CIE 15:2018 — `216/24389`. Written as the rational so the branches join exactly. */
export const LAB_EPSILON = 216 / 24389;

/** CIE 15:2018 — `24389/27`. `LAB_KAPPA * LAB_EPSILON` is exactly 8. */
export const LAB_KAPPA = 24389 / 27;

/**
 * The nonlinearity, applied to a normalised tristimulus ratio.
 *
 * `Math.cbrt`, not `Math.pow(t, 1/3)`. For a negative ratio — which happens for any XYZ
 * outside the RGB gamut it came from — `pow` returns `NaN` and `cbrt` returns the real cube
 * root. The branch condition sends negatives down the linear side anyway, which is what
 * makes the inverse exact for them, but relying on that and also using `pow` would be one
 * refactor away from a silent `NaN`.
 */
function forwardF(ratio: number): number {
  return ratio > LAB_EPSILON ? Math.cbrt(ratio) : (LAB_KAPPA * ratio + 16) / 116;
}

/** The inverse nonlinearity. The condition is on `f³`, which is what makes the join exact. */
function inverseF(f: number): number {
  const cubed = f * f * f;
  return cubed > LAB_EPSILON ? cubed : (116 * f - 16) / LAB_KAPPA;
}

/** CIE XYZ → CIELAB, against `white` (D65 by default — this repository's canonical). */
export function xyzToLab(xyz: Xyz, white: Xyz = CANONICAL_WHITE): Lab {
  const fx = forwardF(xyz[0] / white[0]);
  const fy = forwardF(xyz[1] / white[1]);
  const fz = forwardF(xyz[2] / white[2]);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB → CIE XYZ, against `white`. */
export function labToXyz(lab: Lab, white: Xyz = CANONICAL_WHITE): Xyz {
  const fy = (lab[0] + 16) / 116;
  const fx = lab[1] / 500 + fy;
  const fz = fy - lab[2] / 200;

  // The Y branch is on L* against κ·ε = 8 rather than on fy³, because CIE 15 defines it that
  // way and the two are not identical for L* slightly below 8 — a difference of 1e-16 in Y,
  // which is nothing, in a place where "follows the standard" is worth more than "is close".
  const yr = lab[0] > LAB_KAPPA * LAB_EPSILON ? fy * fy * fy : lab[0] / LAB_KAPPA;

  return [inverseF(fx) * white[0], yr * white[1], inverseF(fz) * white[2]];
}

/**
 * CIELAB → CIELCh.
 *
 * Hue is an angle in degrees, folded to `[0, 360)`. For a neutral colour `a` and `b` are both
 * zero and the hue is undefined; `Math.atan2(0, 0)` is `0`, and 0° is as good an arbitrary
 * answer as any — but a caller ranking by hue must check chroma first, because a neutral is
 * not "red".
 */
export function labToLch(lab: Lab): LCh {
  const [l, a, b] = lab;
  return [l, Math.hypot(a, b), radiansToDegrees(Math.atan2(b, a))];
}

/** CIELCh → CIELAB. */
export function lchToLab(lch: LCh): Lab {
  const [l, c, h] = lch;
  const radians = degreesToRadians(normalizeHue(h));
  return [l, c * Math.cos(radians), c * Math.sin(radians)];
}

/** CIE XYZ → CIELCh, against `white`. */
export function xyzToLch(xyz: Xyz, white: Xyz = CANONICAL_WHITE): LCh {
  return labToLch(xyzToLab(xyz, white));
}

/** CIELCh → CIE XYZ, against `white`. */
export function lchToXyz(lch: LCh, white: Xyz = CANONICAL_WHITE): Xyz {
  return labToXyz(lchToLab(lch), white);
}
