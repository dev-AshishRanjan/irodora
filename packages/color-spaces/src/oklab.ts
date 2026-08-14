/**
 * OKLab and OKLCh — Ottosson (2020).
 *
 * OKLab is the space every generator in this product works in (F-014): rotating hue in HSL
 * produces perceptually inconsistent steps, and a 30° rotation from yellow is not the same
 * perceptual distance as a 30° rotation from blue. Users notice even when they cannot say
 * why.
 *
 * **The route is XYZ → LMS → OKLab.** Ottosson also publishes a direct linear-sRGB → LMS
 * matrix, and it is tuned so that sRGB white lands exactly on `(1, 0, 0)`. We do not use it,
 * because XYZ is canonical (ADR-0003) and a second path for one input space is a second
 * answer waiting to disagree with the first. The cost is measured and small: white through
 * the XYZ route is `L = 0.9999988`, `C = 1.25e-4` rather than exactly `(1, 0, 0)`, a residual
 * of the published matrices' ten-decimal precision. It is asserted in the golden set rather
 * than corrected, because correcting it would mean using numbers no source publishes.
 *
 * `Math.cbrt`, never `Math.pow(x, 1/3)`: LMS components go negative for colours outside the
 * gamut they came from, and `pow` returns `NaN` for a negative base.
 */

import { applyMatrix3, degreesToRadians, normalizeHue, radiansToDegrees } from './numeric.js';
import { LMS_TO_OKLAB, LMS_TO_XYZ_OKLAB, OKLAB_TO_LMS, XYZ_TO_LMS_OKLAB } from './matrices.js';
import type { OkLab, OkLCh, Xyz } from './types.js';

/** CIE XYZ (D65) → OKLab. */
export function xyzToOklab(xyz: Xyz): OkLab {
  const lms = applyMatrix3(XYZ_TO_LMS_OKLAB, xyz);
  return applyMatrix3(LMS_TO_OKLAB, [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])]);
}

/** OKLab → CIE XYZ (D65). */
export function oklabToXyz(oklab: OkLab): Xyz {
  const lms = applyMatrix3(OKLAB_TO_LMS, oklab);
  return applyMatrix3(LMS_TO_XYZ_OKLAB, [
    lms[0] * lms[0] * lms[0],
    lms[1] * lms[1] * lms[1],
    lms[2] * lms[2] * lms[2],
  ]);
}

/**
 * OKLab → OKLCh.
 *
 * Same polar form as CIELCh, and the same caveat: hue is meaningless at zero chroma, and a
 * caller ranking by hue must look at chroma first.
 */
export function oklabToOklch(oklab: OkLab): OkLCh {
  const [l, a, b] = oklab;
  return [l, Math.hypot(a, b), radiansToDegrees(Math.atan2(b, a))];
}

/** OKLCh → OKLab. */
export function oklchToOklab(oklch: OkLCh): OkLab {
  const [l, c, h] = oklch;
  const radians = degreesToRadians(normalizeHue(h));
  return [l, c * Math.cos(radians), c * Math.sin(radians)];
}

/** CIE XYZ (D65) → OKLCh. */
export function xyzToOklch(xyz: Xyz): OkLCh {
  return oklabToOklch(xyzToOklab(xyz));
}

/** OKLCh → CIE XYZ (D65). */
export function oklchToXyz(oklch: OkLCh): Xyz {
  return oklabToXyz(oklchToOklab(oklch));
}
