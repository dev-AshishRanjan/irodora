/**
 * sRGB and Display-P3 ↔ CIE XYZ (D65).
 *
 * Both spaces share the sRGB transfer function and differ only in their primaries, so the
 * pipeline is the same in both cases: apply the transfer function per component, then one
 * matrix multiply. Writing it twice would be two places for a transposed matrix to hide.
 *
 * **Nothing clamps.** `xyzToSrgb` returns components outside `[0, 1]` for any colour outside
 * the sRGB gamut — Display-P3 red is `[1.093, −0.227, −0.150]` — and that is the correct
 * answer, not an error. Gamut mapping (F-009) needs the real value to know how far outside
 * the colour is; clamping here would throw that away and leave every out-of-gamut colour
 * looking like the nearest primary. Rounding happens at the boundary, and this is not the
 * boundary.
 */

import { applyMatrix3 } from './numeric.js';
import {
  LINEAR_P3_TO_XYZ,
  LINEAR_SRGB_TO_XYZ,
  XYZ_TO_LINEAR_P3,
  XYZ_TO_LINEAR_SRGB,
} from './matrices.js';
import { linearToSrgb, srgbToLinear } from './transfer.js';
import type { LinearRgb, Rgb, Xyz } from './types.js';

/** Encoded sRGB → linear-light sRGB, component-wise. */
export function srgbToLinearSrgb(rgb: Rgb): LinearRgb {
  return [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
}

/** Linear-light sRGB → encoded sRGB, component-wise. */
export function linearSrgbToSrgb(rgb: LinearRgb): Rgb {
  return [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])];
}

/** Encoded Display-P3 → linear-light P3. Same transfer function as sRGB (CSS Color 4). */
export function displayP3ToLinearP3(rgb: Rgb): LinearRgb {
  return srgbToLinearSrgb(rgb);
}

/** Linear-light P3 → encoded Display-P3. */
export function linearP3ToDisplayP3(rgb: LinearRgb): Rgb {
  return linearSrgbToSrgb(rgb);
}

/**
 * Linear-light sRGB → CIE XYZ (D65).
 *
 * This is the function E-001 is about: every derived value in the corpus — every `lab`,
 * `oklch` and rendered hex — is computed from an entry's `xyz` through here at build time. A
 * change to it invalidates published corpus entries, and there is no import edge from this
 * file to `content/` for anyone to notice.
 */
export function linearSrgbToXyz(rgb: LinearRgb): Xyz {
  return applyMatrix3(LINEAR_SRGB_TO_XYZ, rgb);
}

/** CIE XYZ (D65) → linear-light sRGB. Unclamped; components may fall outside `[0, 1]`. */
export function xyzToLinearSrgb(xyz: Xyz): LinearRgb {
  return applyMatrix3(XYZ_TO_LINEAR_SRGB, xyz);
}

/** Linear-light Display-P3 → CIE XYZ (D65). */
export function linearP3ToXyz(rgb: LinearRgb): Xyz {
  return applyMatrix3(LINEAR_P3_TO_XYZ, rgb);
}

/** CIE XYZ (D65) → linear-light Display-P3. Unclamped. */
export function xyzToLinearP3(xyz: Xyz): LinearRgb {
  return applyMatrix3(XYZ_TO_LINEAR_P3, xyz);
}

/** Encoded sRGB → CIE XYZ (D65). */
export function srgbToXyz(rgb: Rgb): Xyz {
  return linearSrgbToXyz(srgbToLinearSrgb(rgb));
}

/** CIE XYZ (D65) → encoded sRGB. Unclamped. */
export function xyzToSrgb(xyz: Xyz): Rgb {
  return linearSrgbToSrgb(xyzToLinearSrgb(xyz));
}

/** Encoded Display-P3 → CIE XYZ (D65). */
export function displayP3ToXyz(rgb: Rgb): Xyz {
  return linearP3ToXyz(displayP3ToLinearP3(rgb));
}

/** CIE XYZ (D65) → encoded Display-P3. Unclamped. */
export function xyzToDisplayP3(xyz: Xyz): Rgb {
  return linearP3ToDisplayP3(xyzToLinearP3(xyz));
}
