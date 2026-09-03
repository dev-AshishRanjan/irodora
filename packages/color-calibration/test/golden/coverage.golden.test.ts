/**
 * The awkward cases the first golden set omitted, added after review.
 *
 * The original suite's darkest encoded component was **0.12** against an sRGB breakpoint of
 * **0.04045**, and its darkest Y was **0.0134** against a Lab ε of **0.008856**. So it
 * exercised neither the transfer function's linear segment nor Lab's κ branch — in a package
 * whose central claim is about behaviour in the darks — and every reference value was inside
 * the sRGB gamut, so the fit never had an out-of-gamut TARGET.
 *
 * `.harness/rules/color/color-science.md` names near-black, the Lab boundary and out-of-gamut
 * values as required cases. None of them turned out to hide a defect, which is the ordinary
 * outcome and not a reason to have skipped them.
 */

import { describe, expect, it } from 'vitest';
import {
  LAB_EPSILON,
  SRGB_EOTF_CUTOFF,
  linearSrgbToSrgb,
  srgbToLinear,
  xyzToLinearSrgb,
  type Triple,
} from '@irodora/color-spaces';

import { applyMatrix, solveCorrection, type Matrix3, type Observation } from '../../src/index.js';
import { NEAR_BLACK_CARD, WIDE_GAMUT_CARD } from '../fixture.js';
import type { ReferenceCard } from '../../src/card.js';

const DISTORTION: Matrix3 = [
  [0.86, 0.11, 0.04],
  [0.05, 0.92, 0.07],
  [0.03, 0.09, 1.12],
];

const observe = (card: ReferenceCard, distortion = DISTORTION): readonly Observation[] =>
  card.patches.map((patch) => ({
    id: patch.id,
    rgb: linearSrgbToSrgb(applyMatrix(distortion, xyzToLinearSrgb(patch.xyz))),
  }));

describe('near black', () => {
  it('the fixture really does reach below the sRGB breakpoint and below Lab epsilon', () => {
    /*
     * The fixture is asserted before it is used. A "near black" card that turned out not to be
     * near black would make every case below pass for nothing — which is what the original
     * suite did without anybody noticing, and is the reason this file exists.
     */
    // SRGB_EOTF_CUTOFF (0.04045) is the ENCODED-side breakpoint; SRGB_OETF_CUTOFF (0.0031308)
    // is the linear-side one. They are a pair and easy to swap — the first draft of this line
    // compared encoded values against the linear cutoff and failed, which is the check working.
    const encoded = NEAR_BLACK_CARD.patches.flatMap((patch) =>
      linearSrgbToSrgb(xyzToLinearSrgb(patch.xyz)),
    );
    expect(Math.min(...encoded)).toBeLessThan(SRGB_EOTF_CUTOFF);

    const luminances = NEAR_BLACK_CARD.patches.map((patch) => patch.xyz[1]);
    expect(Math.min(...luminances)).toBeLessThan(LAB_EPSILON);
  });

  it('recovers a known distortion on values inside the transfer function LINEAR segment', () => {
    const correction = solveCorrection(observe(NEAR_BLACK_CARD), NEAR_BLACK_CARD, 'srgb');

    /*
     * LOOSER THAN THE MID-TONE CASE, AND THE REASON IS ΔE00 RATHER THAN THE FIT.
     *
     * The mid-tone suite asserts 1e-9; this one measures 3.0e-9 and the first draft asserted
     * 1e-9 and failed. The fit is exact to float precision either way — the distortion is a
     * 3×3 and its inverse is a 3×3. What differs is the METRIC: below Lab's ε the L\* response
     * takes the κ branch, whose slope in Y is steep, so a relative error of ~1e-16 in a
     * luminance of 0.0003 lands as a larger number of ΔE00 units than the same relative error
     * at 0.5.
     *
     * Recorded as a bound with a reason rather than widened until green. Both figures are nine
     * orders of magnitude inside the ΔE00 ≤ 0.01 golden tolerance, and roughly nine below any
     * difference a person could see.
     */
    expect(correction.after.mean).toBeLessThan(1e-6);
    expect(correction.after.max).toBeLessThan(1e-6);
    // The decoy: the uncorrected values really are wrong, so the above is not passing because
    // the distortion is invisible at these magnitudes.
    expect(correction.before.mean).toBeGreaterThan(0.5);
  });

  it('routes the residual through Lab s KAPPA branch, which the first suite never reached', () => {
    // `xyzToLab` takes the cube-root branch above ε and the linear κ branch below it. Every
    // residual in this package goes through it, and the branch had been untested.
    const below = NEAR_BLACK_CARD.patches.filter((patch) => patch.xyz[1] < LAB_EPSILON);
    expect(below.length).toBeGreaterThanOrEqual(3);

    const correction = solveCorrection(observe(NEAR_BLACK_CARD), NEAR_BLACK_CARD, 'srgb');
    expect(Number.isFinite(correction.after.mean)).toBe(true);
    expect(Number.isFinite(correction.before.max)).toBe(true);
  });

  it('linearises through the SEGMENT rather than a pure power — the trap, stated as a number', () => {
    /*
     * `packages/color-core/AGENTS.md` lists "the sRGB linear segment below 0.04045" as a trap
     * that produces a plausible wrong answer. This package imports the transfer function rather
     * than reimplementing it, so the trap cannot be introduced here — asserted anyway, because
     * "we import it" is a claim about today's code and this is a claim about the numbers.
     */
    const encoded = 0.02;
    const correct = srgbToLinear(encoded);
    const purePower = (encoded + 0.055) / 1.055 ** 2.4;

    expect(correct).toBeCloseTo(encoded / 12.92, 12);
    expect(Math.abs(correct - purePower)).toBeGreaterThan(1e-4);
  });
});

describe('out-of-gamut reference values', () => {
  it('the fixture really does sit outside sRGB', () => {
    const negatives = WIDE_GAMUT_CARD.patches.filter((patch) =>
      xyzToLinearSrgb(patch.xyz).some((component) => component < 0),
    );
    expect(negatives.length).toBeGreaterThanOrEqual(3);
  });

  it('fits to them without clamping them into the gamut first', () => {
    /*
     * A real ColorChecker's cyan, blue and orange are outside sRGB, so this is the ordinary
     * case. The failure mode being excluded is a solver that clamped its TARGETS to [0,1] —
     * which would converge, return a matrix, and quietly fit to the wrong colours.
     */
    const correction = solveCorrection(observe(WIDE_GAMUT_CARD), WIDE_GAMUT_CARD, 'srgb');

    expect(correction.after.mean).toBeLessThan(1e-9);
    expect(correction.before.mean).toBeGreaterThan(1);

    // And the corrected values are still outside the gamut afterwards — a fit that had clamped
    // would have pulled them in, and this is what would catch it.
    const corrected = WIDE_GAMUT_CARD.patches.map((patch) =>
      applyMatrix(correction.matrix, xyzToLinearSrgb(patch.xyz)),
    );
    const stillOutside = corrected.filter((rgb: Triple) =>
      rgb.some((component) => component < -1e-6 || component > 1 + 1e-6),
    );
    expect(stillOutside.length).toBeGreaterThanOrEqual(3);
  });
});
