/**
 * The sRGB transfer function — IEC 61966-2-1:1999.
 *
 * This is the single most commonly mis-implemented function in colour software, and the way
 * it is got wrong is specific: the standard defines a **piecewise** curve with a linear
 * segment near black, and a great many implementations use the pure power function
 * `v ** 2.4` throughout because it is one line and looks close enough.
 *
 * It is not close enough. At 8-bit code 3, the pure power function returns a linear value
 * **39 times too small**. The error is largest exactly where this product lives: indigo,
 * sumi and charcoal are half the corpus, and a 39× error in linear light is not a rounding
 * difference, it is a different colour. [[srgb-transfer-function-has-a-linear-segment]]
 *
 * Display-P3 shares this transfer function (SMPTE RP 431-2 as profiled by CSS Color 4); only
 * the primaries differ. So this module is used by both and neither has its own copy.
 */

/**
 * Encoded value at or below which the curve is linear. IEC 61966-2-1.
 *
 * The standard's two published constants do not join exactly: at 0.04045 the linear branch
 * gives 0.0031308049535603713 and the power branch 0.0031308072830676845, a step of about
 * 2.3e-9. That is a property of the standard, not of this code, and it is asserted in the
 * golden set rather than smoothed away — a "fix" here would be us disagreeing with the
 * document we claim to implement.
 */
export const SRGB_EOTF_CUTOFF = 0.04045;

/** Linear value at or below which the inverse curve is linear. IEC 61966-2-1. */
export const SRGB_OETF_CUTOFF = 0.0031308;

/** Slope of the linear segment. IEC 61966-2-1. */
export const SRGB_LINEAR_SLOPE = 12.92;

/** Exponent of the power segment. IEC 61966-2-1. */
export const SRGB_GAMMA = 2.4;

/** Offset of the power segment. IEC 61966-2-1. */
export const SRGB_OFFSET = 0.055;

/**
 * Encoded sRGB → linear light, for one component.
 *
 * **Sign-symmetric.** A negative component is not an error: `xyzToSrgb` returns one for any
 * colour outside the sRGB gamut, and gamut mapping (F-009) needs that value intact to know
 * how far outside it is. `Math.pow(-0.1, 2.4)` is `NaN`, so the curve is applied to the
 * magnitude and the sign restored. Without this, every round trip through an out-of-gamut
 * colour returns `NaN` — silently, because `NaN` compares false against every tolerance.
 *
 * The sign comes from `Math.sign`, not from `value < 0 ? -1 : 1`. The difference is only
 * visible at zero — `-0 < 0` is false, so the ternary turns `-0` into `+0` and the function
 * stops being odd at exactly one point. That would be invisible in any numeric comparison
 * and loud in the cross-platform identity digest, which compares IEEE-754 bytes and for
 * which `-0` and `+0` are different values (NFR-3).
 */
export function srgbToLinear(value: number): number {
  const magnitude = Math.abs(value);

  return (
    Math.sign(value) *
    (magnitude <= SRGB_EOTF_CUTOFF
      ? magnitude / SRGB_LINEAR_SLOPE
      : Math.pow((magnitude + SRGB_OFFSET) / (1 + SRGB_OFFSET), SRGB_GAMMA))
  );
}

/**
 * Linear light → encoded sRGB, for one component. Sign-symmetric, for the same reason.
 *
 * Note that `linearToSrgb(1)` returns 0.9999999999999999 rather than 1: `1.055 * 1 - 0.055`
 * is not exactly 1 in float64. It is left alone. Special-casing the endpoint would make this
 * function no longer be the published formula, to hide an error of one part in 10^16 that no
 * downstream tolerance can see — and the first time someone trusted that special case for
 * something else it would be a real defect.
 */
export function linearToSrgb(value: number): number {
  const magnitude = Math.abs(value);

  return (
    Math.sign(value) *
    (magnitude <= SRGB_OETF_CUTOFF
      ? magnitude * SRGB_LINEAR_SLOPE
      : (1 + SRGB_OFFSET) * Math.pow(magnitude, 1 / SRGB_GAMMA) - SRGB_OFFSET)
  );
}

/**
 * The encoded interval on which an encoded → linear → encoded round trip is lossy, and by
 * how much.
 *
 * The standard's two cutoffs do not correspond: `0.0031308 × 12.92` is `0.040449936`, not
 * `0.04045`. Encoded values in the 6.4e-8-wide gap between them leave on the linear branch
 * and come back on the power branch, losing up to 2.96e-8. Everywhere else the round trip is
 * good to 1.2e-16.
 *
 * Exported because a test that asserts a round-trip bound has to know where the published
 * standard makes that bound different, and hard-coding the window in the test would put the
 * explanation somewhere nobody reading this file will find it. It is 4e-6 of one 8-bit code:
 * no rendering can see it, and no tolerance should silently absorb it either.
 */
export const SRGB_JOIN_GAP = {
  from: SRGB_OETF_CUTOFF * SRGB_LINEAR_SLOPE,
  to: SRGB_EOTF_CUTOFF,
  worstRoundTripError: 3e-8,
} as const;
