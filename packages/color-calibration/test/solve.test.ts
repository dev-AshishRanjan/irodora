import { describe, expect, it } from 'vitest';
import { D50, linearSrgbToSrgb, xyzToLinearSrgb, type Triple } from '@irodora/color-spaces';

import { CardError } from '../src/card.js';
import {
  applyCorrection,
  CorrectionError,
  MINIMUM_PATCHES,
  solveCorrection,
  type Matrix3,
  type Observation,
} from '../src/solve.js';
import { CONSTRUCTED_CARD, truncated } from './fixture.js';

const DISTORTION: Matrix3 = [
  [0.9, 0.08, 0.02],
  [0.04, 0.95, 0.03],
  [0.02, 0.06, 1.08],
];

function observations(card = CONSTRUCTED_CARD): Observation[] {
  return card.patches.map((patch) => ({
    id: patch.id,
    rgb: linearSrgbToSrgb([
      DISTORTION[0][0] * xyzToLinearSrgb(patch.xyz)[0] +
        DISTORTION[0][1] * xyzToLinearSrgb(patch.xyz)[1] +
        DISTORTION[0][2] * xyzToLinearSrgb(patch.xyz)[2],
      DISTORTION[1][0] * xyzToLinearSrgb(patch.xyz)[0] +
        DISTORTION[1][1] * xyzToLinearSrgb(patch.xyz)[1] +
        DISTORTION[1][2] * xyzToLinearSrgb(patch.xyz)[2],
      DISTORTION[2][0] * xyzToLinearSrgb(patch.xyz)[0] +
        DISTORTION[2][1] * xyzToLinearSrgb(patch.xyz)[1] +
        DISTORTION[2][2] * xyzToLinearSrgb(patch.xyz)[2],
    ]),
  }));
}

describe('solveCorrection', () => {
  it('does not depend on the order the patches arrive in', () => {
    const forwards = solveCorrection(observations(), CONSTRUCTED_CARD, 'srgb');
    const backwards = solveCorrection([...observations()].reverse(), CONSTRUCTED_CARD, 'srgb');

    for (const [row, values] of forwards.matrix.entries())
      for (const [column, value] of values.entries())
        expect(value).toBeCloseTo(backwards.matrix[row]?.[column] ?? Number.NaN, 12);
  });

  it('records which space the observations were in, so the matrix input is unambiguous', () => {
    expect(solveCorrection(observations(), CONSTRUCTED_CARD, 'srgb').space).toBe('srgb');
    expect(solveCorrection(observations(), CONSTRUCTED_CARD, 'srgb').cardId).toBe(
      CONSTRUCTED_CARD.id,
    );
  });

  it('refuses an observation naming a patch the card does not publish', () => {
    const wrong = [...observations(), { id: 'not-a-patch', rgb: [0.5, 0.5, 0.5] as Triple }];
    expect(() => solveCorrection(wrong, CONSTRUCTED_CARD, 'srgb')).toThrow(/names no patch/u);
  });

  it('refuses the same patch observed twice', () => {
    const first = observations()[0];
    if (first === undefined) throw new Error('no observations');
    expect(() => solveCorrection([...observations(), first], CONSTRUCTED_CARD, 'srgb')).toThrow(
      /observed twice/u,
    );
  });

  it('refuses fewer patches than can determine a 3x3', () => {
    const card = truncated(MINIMUM_PATCHES - 1);
    expect(() => solveCorrection(observations(card), card, 'srgb')).toThrow(CorrectionError);
  });

  it('refuses observations that do not span three dimensions', () => {
    /*
     * A decoy rather than an empty fixture: these are real observations of real patches, all
     * of them the same grey. That is what a camera reports when the card is not in frame — a
     * uniform surface — and the normal equations are singular, so there is no matrix to return.
     */
    const flat = CONSTRUCTED_CARD.patches.map((patch) => ({
      id: patch.id,
      rgb: [0.5, 0.5, 0.5] as Triple,
    }));
    expect(() => solveCorrection(flat, CONSTRUCTED_CARD, 'srgb')).toThrow(
      /do not span three dimensions/u,
    );
  });

  it('refuses a card whose values are under a different white point', () => {
    const d50Card = { ...CONSTRUCTED_CARD, white: D50 };
    expect(() => solveCorrection(observations(), d50Card, 'srgb')).toThrow(CardError);
    expect(() => solveCorrection(observations(), d50Card, 'srgb')).toThrow(/adapt/iu);
  });

  it('refuses a non-finite observation rather than fitting around it', () => {
    const broken = observations();
    broken[0] = { id: broken[0]?.id ?? 'p00', rgb: [Number.NaN, 0.5, 0.5] };
    expect(() => solveCorrection(broken, CONSTRUCTED_CARD, 'srgb')).toThrow(/non-finite/u);
  });
});

describe('applyCorrection', () => {
  it('does not clamp an out-of-gamut result into a claim', () => {
    const correction = solveCorrection(observations(), CONSTRUCTED_CARD, 'srgb');
    const corrected = applyCorrection(correction, [1, 0, 0]);

    // Something must leave [0, 1] for this to be testing anything; a correction of a saturated
    // primary is exactly the case that does. Reporting 1.0 here would turn an out-of-gamut
    // value into an in-gamut one silently, which is gamutMap's decision and not this one's.
    const outside = corrected.some((component) => component < 0 || component > 1);
    expect(outside).toBe(true);
    for (const component of corrected) expect(Number.isFinite(component)).toBe(true);
  });

  it('reproduces the published values when applied to what was observed', () => {
    const correction = solveCorrection(observations(), CONSTRUCTED_CARD, 'srgb');
    const first = observations()[0];
    const patch = CONSTRUCTED_CARD.patches[0];
    if (first === undefined || patch === undefined) throw new Error('no fixture');

    const corrected = applyCorrection(correction, first.rgb);
    const expected = xyzToLinearSrgb(patch.xyz);
    for (const [index, value] of corrected.entries())
      expect(value).toBeCloseTo(expected[index] ?? Number.NaN, 9);
  });
});
