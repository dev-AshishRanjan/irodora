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

import { srgbToLinear, srgbToXyz, xyzToLab, xyzToOklab, type Rgb } from '@irodora/color-spaces';
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

/* ======================================================= the stage vector (F-083) */

/**
 * The intermediate values every metric is built on, so a divergence can be located.
 *
 * **Why this exists.** The first Linux CI run disagreed with the committed digest in *all
 * eight* metrics — including `deltaE76`, which is a Euclidean distance in Lab and uses no
 * implementation-approximated operation at all: subtraction, multiplication, addition and
 * `Math.sqrt`, every one of them exactly specified by IEEE-754. A metric that cannot itself
 * diverge, diverging, means **its inputs did**.
 *
 * There is one operation upstream of all eight. `srgbToLinear` is `Math.pow(x, 2.4)` above
 * the cutoff, and it feeds `srgbToXyz` (hence Lab, hence ΔE76/94/00, hence Oklab and ΔEok)
 * *and* the relative luminance inside `wcagContrast` *and* the exponentiation inside
 * `apcaLc`. ECMAScript specifies `Math.pow` as implementation-approximated.
 *
 * So this vector digests each stage separately, and the first column that disagrees names
 * the operation:
 *
 * | column | if it diverges |
 * |---|---|
 * | `linear*` | `Math.pow` — the sRGB EOTF, and the whole engine rests on it |
 * | `xyz*` with `linear*` clean | the matrix multiply, which would be *impossible*: plain `+` and `*` on doubles are exactly specified, so this would mean something far stranger |
 * | `lab*` with `xyz*` clean | `Math.cbrt` |
 * | `ok*` with `xyz*` clean | `Math.cbrt` in the Oklab path |
 *
 * Same seed and same samples as `computeDifferenceVector`, so the two are directly
 * comparable — a sample that diverges here is a sample that diverges there.
 */
export const STAGE_NAMES: readonly string[] = [
  'linearR',
  'linearG',
  'linearB',
  'X',
  'Y',
  'Z',
  'L*',
  'a*',
  'b*',
  'okL',
  'oka',
  'okb',
];

export function computeStageVector(rgb: Rgb): readonly number[] {
  const xyz = srgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const oklab = xyzToOklab(xyz);

  return [
    srgbToLinear(rgb[0]),
    srgbToLinear(rgb[1]),
    srgbToLinear(rgb[2]),
    xyz[0],
    xyz[1],
    xyz[2],
    lab[0],
    lab[1],
    lab[2],
    oklab[0],
    oklab[1],
    oklab[2],
  ];
}
