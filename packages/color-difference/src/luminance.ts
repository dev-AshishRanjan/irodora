/**
 * Relative luminance — three definitions, because three standards define it differently.
 *
 * This module exists so that the three sit **side by side, in one file, with the reason**.
 * Scattered across the modules that use them they look like three transcriptions of the same
 * number, one of which must be wrong; together they are visibly three standards, each of which
 * has to be reproduced exactly by whatever claims to implement it.
 *
 * | Used by | Coefficients | Linearisation |
 * |---|---|---|
 * | The engine (`@irodora/color-spaces`) | the exact sRGB→XYZ Y row | piecewise, IEC 61966-2-1 |
 * | **WCAG 2.x contrast** | `0.2126, 0.7152, 0.0722` — rounded to 4 dp | piecewise, WCAG's own cutoff |
 * | **APCA Lc** | `0.2126729, 0.7151522, 0.072175` — Lindbloom's | **pure power 2.4, no linear segment** |
 *
 * **None of these may be substituted for another.** WCAG's worked examples are computed with
 * its rounded coefficients, so using the exact Y row produces a conformance claim the
 * specification does not support. APCA deliberately uses a simple gamma with no linear
 * segment near black — reusing the engine's piecewise transfer function there changes Lc for
 * every dark colour, which is most of this corpus.
 *
 * Recorded as ADR-0041, with the measurements behind it.
 *
 * That is why this package does **not** import the engine's luminance, and why nothing here
 * is shared between `wcag.ts` and `apca.ts` beyond the type.
 *
 * The engine's own definition is not duplicated here. Anything wanting *our* luminance calls
 * `srgbToXyz(rgb)[1]`, which is the same number by construction and has one implementation.
 */

import type { Rgb } from '@irodora/color-spaces';

/** A luminance coefficient triple, in R G B order. */
export type LuminanceCoefficients = readonly [r: number, g: number, b: number];

/**
 * WCAG 2.x, §relative luminance. Rounded to four decimal places by the specification.
 *
 * These are the exact sRGB Y row rounded — `0.21263900587151027` → `0.2126`. The rounding is
 * the specification's, and reproducing its worked examples requires reproducing the rounding.
 */
export const WCAG_LUMINANCE_COEFFICIENTS: LuminanceCoefficients = [0.2126, 0.7152, 0.0722];

/**
 * APCA (Myndex, `apca-w3`), as carried by the reference implementation.
 *
 * A different rounding of the same physical quantity, taken from Lindbloom rather than from
 * CSS Color 4. `colorjs.io` notes in its own source that these "should be from CSS Color 4"
 * — but APCA's published Lc values are computed with these, so these are what an
 * implementation claiming to compute APCA Lc has to use.
 */
export const APCA_LUMINANCE_COEFFICIENTS: LuminanceCoefficients = [0.2126729, 0.7151522, 0.072175];

/**
 * WCAG 2.x transfer cutoff.
 *
 * The specification publishes `0.03928` where IEC 61966-2-1 publishes `0.04045`. The two
 * differ only for encoded values inside a 1.17e-3-wide band, and the luminance difference
 * there is around 1e-9 — but the constant is the specification's, and this package's job is
 * to reproduce the specification rather than to improve it. Which value the worked examples
 * actually require is asserted in the golden set rather than assumed here.
 */
export const WCAG_TRANSFER_CUTOFF = 0.03928;

/** Slope of WCAG's linear segment. Same value as IEC 61966-2-1. */
export const WCAG_LINEAR_SLOPE = 12.92;

/** Offset of WCAG's power segment. Same value as IEC 61966-2-1. */
export const WCAG_OFFSET = 0.055;

/** Exponent of WCAG's power segment. Same value as IEC 61966-2-1. */
export const WCAG_GAMMA = 2.4;

/**
 * APCA's exponent. There is no linear segment and no offset — APCA linearises with a **pure
 * power function**, which the engine's transfer module explicitly does not do.
 */
export const APCA_GAMMA = 2.4;

const dot = (rgb: Rgb, coefficients: LuminanceCoefficients): number =>
  rgb[0] * coefficients[0] + rgb[1] * coefficients[1] + rgb[2] * coefficients[2];

/**
 * WCAG 2.x relative luminance of an encoded sRGB colour.
 *
 * Sign-symmetric for the same reason the engine's transfer function is: `xyzToSrgb` returns
 * negative components for out-of-gamut colours, and `Math.pow` of a negative base is `NaN`.
 * WCAG does not contemplate out-of-gamut input; producing `NaN` for it would make a contrast
 * check silently pass, since `NaN` fails every comparison.
 */
export function wcagLuminance(rgb: Rgb): number {
  const linearise = (value: number): number => {
    const magnitude = Math.abs(value);
    return (
      Math.sign(value) *
      (magnitude <= WCAG_TRANSFER_CUTOFF
        ? magnitude / WCAG_LINEAR_SLOPE
        : Math.pow((magnitude + WCAG_OFFSET) / (1 + WCAG_OFFSET), WCAG_GAMMA))
    );
  };

  return dot(
    [linearise(rgb[0]), linearise(rgb[1]), linearise(rgb[2])],
    WCAG_LUMINANCE_COEFFICIENTS,
  );
}

/**
 * APCA "screen luminance" — a pure power function, no linear segment.
 *
 * This is not a simplification of WCAG's; it is APCA's specified behaviour, and the
 * difference is largest exactly at the dark end. At 8-bit code 3 the pure power function
 * returns roughly a 39th of the piecewise value.
 */
export function apcaLuminance(rgb: Rgb): number {
  const linearise = (value: number): number =>
    Math.sign(value) * Math.pow(Math.abs(value), APCA_GAMMA);

  return dot(
    [linearise(rgb[0]), linearise(rgb[1]), linearise(rgb[2])],
    APCA_LUMINANCE_COEFFICIENTS,
  );
}
