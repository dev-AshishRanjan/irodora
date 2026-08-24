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

import { canonicalise } from '@irodora/testing';
import { srgbToLinear, srgbToXyz, xyzToLab, xyzToOklab, type Rgb } from '@irodora/color-spaces';
import { apcaLc, deltaE00, deltaE76, deltaE94, deltaEok, wcagContrast } from '../../src/index.js';

/** The seed and size the committed fixture was produced with. */
export const IDENTITY_SEED = 'irodora/f-007/identity';
export const IDENTITY_COUNT = 10_000;
/**
 * Every twentieth sample (F-083).
 *
 * It was six — 0, 1, 2, 3, 5000, 9999 — and all six reproduce on Linux while the whole-run
 * digest does not, which told us the divergence is rare and nothing more. Probes are the only
 * part of this fixture that records EXACT VALUES rather than a hash, so they are the only part
 * that can answer **by how much**, and six of them landed on none of the unlucky samples.
 *
 * 13 of 100 chunks contain a divergence, so five probes per chunk lands several. They are
 * RECORDED, never digested, so widening the set cannot move `digest` — which is what keeps
 * this distinguishable from regenerating a fixture to make a red test green.
 */
export const IDENTITY_PROBE_INDICES: readonly number[] = Array.from(
  { length: 500 },
  (_, i) => i * 20,
);
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

/* =================================================== the constants (F-083, round 3) */

/**
 * Fixed inputs and fixed outputs — exact doubles, not digests.
 *
 * Round 2 narrowed the divergence to `linearR` and, surprisingly, **only** `linearR`:
 * `linearG`, `linearB`, `X`, `Y`, `Z`, `L*a*b*` and Oklab all reproduce per sample. That is
 * hard to reconcile, because `X`, `Y` and `Z` are linear combinations of all three linear
 * channels — a divergent `linearR` should carry into them.
 *
 * Unless very few samples diverge, and the reference is what moves the metrics. All four ΔE
 * columns are measured against `REFERENCE_LAB` / `REFERENCE_OKLAB`, computed **once** from
 * mid grey. If those constants differ by an ulp, every one of 10,000 ΔE values shifts while
 * every per-sample Lab stays identical — which is exactly the pattern observed. And
 * `wcagContrast` and `apcaLc` take `rgb` directly and linearise internally, so they would
 * see a `Math.pow` disagreement without any per-sample XYZ moving at all.
 *
 * Digests cannot test that hypothesis: they say *something* differs, not *what*. These are
 * exact values, so a failure prints the two doubles side by side and the whole investigation
 * reduces to one line anybody can paste into a REPL on either operating system.
 */
export const CONSTANT_NAMES: readonly string[] = [
  'srgbToLinear(0)',
  'srgbToLinear(0.0031308)',
  'srgbToLinear(0.04045)',
  'srgbToLinear(0.05)',
  'srgbToLinear(0.1)',
  'srgbToLinear(1/3)',
  'srgbToLinear(0.5)',
  'srgbToLinear(0.8)',
  'srgbToLinear(0.999)',
  'srgbToLinear(1)',
  'REFERENCE_LAB.L',
  'REFERENCE_LAB.a',
  'REFERENCE_LAB.b',
  'REFERENCE_OKLAB.L',
  'REFERENCE_OKLAB.a',
  'REFERENCE_OKLAB.b',
];

export function computeConstants(): readonly number[] {
  return [
    srgbToLinear(0),
    srgbToLinear(0.003_130_8),
    srgbToLinear(0.040_45),
    srgbToLinear(0.05),
    srgbToLinear(0.1),
    srgbToLinear(1 / 3),
    srgbToLinear(0.5),
    srgbToLinear(0.8),
    srgbToLinear(0.999),
    srgbToLinear(1),
    REFERENCE_LAB[0],
    REFERENCE_LAB[1],
    REFERENCE_LAB[2],
    REFERENCE_OKLAB[0],
    REFERENCE_OKLAB[1],
    REFERENCE_OKLAB[2],
  ];
}

/* ================================================== the canonical vector (F-083) */

/**
 * What the product actually shows, and the only form NFR-3 can promise to be identical.
 *
 * **Raw doubles are not identical across platforms and cannot be made so.** ECMAScript
 * specifies `pow`, `cbrt`, `atan2`, `sin`, `cos` and `exp` as implementation-approximated,
 * and Node ships Windows builds from MSVC and Linux builds from GCC/Clang. Measured: **2 to 4
 * ULP on roughly 0.2 % of inputs** — the fifteenth significant digit.
 *
 * So the guarantee moves to a value coarse enough that the disagreement stops existing.
 * `canonicalise` in `@irodora/testing` carries the rule and the arithmetic behind the
 * precision — it is a correctness property rather than a taste, and the same rule is used by
 * `@irodora/color-spaces` so the two fixtures cannot drift apart.
 */
export const CANONICAL_SIGNIFICANT_DIGITS = 5;

export function computeCanonicalVector(rgb: Rgb): readonly number[] {
  return computeDifferenceVector(rgb).map((v) => canonicalise(v, CANONICAL_SIGNIFICANT_DIGITS));
}

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
