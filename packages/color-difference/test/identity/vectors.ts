/**
 * What the cross-platform identity check computes for the difference metrics (NFR-3).
 *
 * Separate from `packages/color-spaces`' fixture because the dependency runs
 * difference → spaces: a shared fixture would have to live in whichever package could import
 * both, and that is neither of them.
 *
 * **This is where a cross-engine divergence would show up first.** The conversions use `pow`
 * and `cbrt`; these functions add `atan2`, `exp`, `sin` and `cos`, and ECMAScript specifies
 * every one of them as implementation-approximated. If V8, JavaScriptCore and Hermes ever
 * disagree, CIEDE2000 is the most likely place to see it.
 *
 * The output order is part of the fixture, and so is the reference colour.
 */

import { srgbToXyz, xyzToLab, xyzToOklab, type Rgb } from '@irodora/color-spaces';
import { apcaLc, deltaE00, deltaE76, deltaE94, deltaEok, wcagContrast } from '../../src/index.js';

/** The seed and size the committed fixture was produced with. */
export const IDENTITY_SEED = 'irodora/f-007/identity';
export const IDENTITY_COUNT = 10_000;
export const IDENTITY_PROBE_INDICES: readonly number[] = [0, 1, 2, 3, 5_000, 9_999];
export const IDENTITY_VALUES_PER_SAMPLE = 8;

/** Mid grey — a reference chosen for being ordinary rather than for being a special case. */
export const REFERENCE_SRGB: Rgb = [0.5, 0.5, 0.5];

const REFERENCE_LAB = xyzToLab(srgbToXyz(REFERENCE_SRGB));
const REFERENCE_OKLAB = xyzToOklab(srgbToXyz(REFERENCE_SRGB));
const WHITE: Rgb = [1, 1, 1];
const BLACK: Rgb = [0, 0, 0];

/** Every number this package produces for one sRGB input, in a fixed order. */
export function computeDifferenceVector(rgb: Rgb): readonly number[] {
  const xyz = srgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const oklab = xyzToOklab(xyz);

  return [
    deltaE76(lab, REFERENCE_LAB),
    deltaE94(lab, REFERENCE_LAB),
    deltaE00(lab, REFERENCE_LAB),
    deltaEok(oklab, REFERENCE_OKLAB),
    wcagContrast(rgb, WHITE),
    wcagContrast(rgb, BLACK),
    apcaLc(WHITE, rgb),
    apcaLc(BLACK, rgb),
  ];
}
