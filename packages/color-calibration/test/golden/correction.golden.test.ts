/**
 * The correction is solved against a distortion whose inverse is known exactly.
 *
 * This is the golden suite for this package, and its ground truth is **constructed rather than
 * cited** — see `test/fixture.ts` for why that is the stronger fixture here and not a shortcut
 * around [ADR-0085](../../../../docs/adr/0085-the-reference-card-is-a-partner-card-and-its-values-are-cited-not-measured.md).
 *
 * A real card would let this assert that *a* matrix comes out. A known distortion lets it
 * assert **which** matrix comes out, to machine precision — so a regression that degrades the
 * fit by a percent is a failure here rather than a number somebody widens a tolerance for.
 */

import { describe, expect, it } from 'vitest';
import {
  linearSrgbToSrgb,
  linearSrgbToXyz,
  srgbToLinearSrgb,
  xyzToLab,
  xyzToLinearSrgb,
  CANONICAL_WHITE,
  type Triple,
} from '@irodora/color-spaces';
import { deltaE00 } from '@irodora/color-difference';

import { applyMatrix, solveCorrection, type Matrix3, type Observation } from '../../src/index.js';
import { CONSTRUCTED_CARD } from '../fixture.js';

/**
 * A camera-like distortion: cross-talk between channels and a per-channel gain.
 *
 * Invented, and stated as invented. It is a plausible SHAPE — real sensors do mix channels and
 * do have unequal gains — which is all that is needed, because what is being tested is that
 * the solver inverts whatever linear map it is given, not that this is anybody's camera.
 */
const DISTORTION: Matrix3 = [
  [0.86, 0.11, 0.04],
  [0.05, 0.92, 0.07],
  [0.03, 0.09, 1.12],
];

/** What such a camera would report for each patch, encoded as sRGB. */
function observe(distortion: Matrix3): readonly Observation[] {
  return CONSTRUCTED_CARD.patches.map((patch) => ({
    id: patch.id,
    rgb: linearSrgbToSrgb(applyMatrix(distortion, xyzToLinearSrgb(patch.xyz))),
  }));
}

describe('a correction solved from a known distortion', () => {
  it('recovers the distortion, to machine precision', () => {
    const correction = solveCorrection(observe(DISTORTION), CONSTRUCTED_CARD, 'srgb');

    // The residual is the assertion. A 3x3 distortion is exactly invertible by a 3x3, so any
    // meaningful residual here means the fit is wrong — not that the model is too simple.
    expect(correction.after.mean).toBeLessThan(1e-9);
    expect(correction.after.max).toBeLessThan(1e-9);
    expect(correction.patchCount).toBe(24);

    // And the DECOY: the uncorrected values are genuinely far from the references, so the
    // "after" figure above is not passing because the distortion did nothing.
    expect(correction.before.mean).toBeGreaterThan(2);
  });

  it('is the identity when the camera is already correct', () => {
    const identity: Matrix3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const correction = solveCorrection(observe(identity), CONSTRUCTED_CARD, 'srgb');

    for (const [row, expected] of correction.matrix.entries())
      for (const [column, value] of expected.entries())
        expect(value).toBeCloseTo(row === column ? 1 : 0, 9);

    expect(correction.before.mean).toBeLessThan(1e-9);
  });

  it('reports the residual it cannot remove, rather than hiding it', () => {
    /*
     * A per-channel GAMMA is not a linear map, so no 3x3 can undo it. The point of this case
     * is not that the fit fails — it is that the fit still returns, and `after.mean` is the
     * number that says how far short it fell. A solver that clamped, threw, or quietly
     * reported its best linear residual as success would be the failure mode.
     */
    const observations = CONSTRUCTED_CARD.patches.map((patch) => {
      const linear = xyzToLinearSrgb(patch.xyz);
      const bent: Triple = [linear[0] ** 1.35, linear[1] ** 1.35, linear[2] ** 1.35];
      return { id: patch.id, rgb: linearSrgbToSrgb(bent) };
    });

    const correction = solveCorrection(observations, CONSTRUCTED_CARD, 'srgb');

    expect(correction.after.mean).toBeGreaterThan(0.5);
    expect(correction.after.max).toBeGreaterThan(correction.after.mean);
    // It still improved on doing nothing — reported, not claimed, and asserted here so the
    // "reports the residual" story cannot quietly become "returns garbage".
    expect(correction.after.mean).toBeLessThan(correction.before.mean);
  });

  it('fits in LINEAR LIGHT, and the encoded-space fit is measurably worse', () => {
    /*
     * The decoy for the one correctness question this module really has. A least-squares 3x3
     * solved on ENCODED sRGB is fitting a straight line to a curve; it converges and returns a
     * matrix, and the matrix is wrong. This solves the same system both ways and asserts the
     * difference is real rather than theoretical.
     *
     * The encoded fit is written out here rather than exposed from `src` on purpose: it is
     * the wrong answer, and the wrong answer should not be importable.
     */
    const observations = observe(DISTORTION);

    const sources = observations.map((observation) => observation.rgb);
    const targets = CONSTRUCTED_CARD.patches.map((patch) =>
      linearSrgbToSrgb(xyzToLinearSrgb(patch.xyz)),
    );

    // Normal equations on the encoded values — the same arithmetic, the wrong space.
    const gram = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const rhs = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const [index, source] of sources.entries()) {
      const target = targets[index] ?? [0, 0, 0];
      for (let i = 0; i < 3; i += 1)
        for (let j = 0; j < 3; j += 1) {
          const gramRow = gram[i];
          if (gramRow !== undefined) gramRow[j] = (gramRow[j] ?? 0) + (source[i] ?? 0) * (source[j] ?? 0);
        }
      for (let channel = 0; channel < 3; channel += 1)
        for (let i = 0; i < 3; i += 1) {
          const rhsRow = rhs[channel];
          if (rhsRow !== undefined)
            rhsRow[i] = (rhsRow[i] ?? 0) + (target[channel] ?? 0) * (source[i] ?? 0);
        }
    }

    const encodedRows: Triple[] = [];
    for (let channel = 0; channel < 3; channel += 1) {
      const a = gram.map((row) => [...row]);
      const b = [...(rhs[channel] ?? [0, 0, 0])];
      for (let column = 0; column < 3; column += 1) {
        const head = a[column]?.[column] ?? 1;
        for (let row = column + 1; row < 3; row += 1) {
          const factor = (a[row]?.[column] ?? 0) / head;
          for (let k = 0; k < 3; k += 1) {
            const target = a[row];
            if (target !== undefined) target[k] = (target[k] ?? 0) - factor * (a[column]?.[k] ?? 0);
          }
          b[row] = (b[row] ?? 0) - factor * (b[column] ?? 0);
        }
      }
      const x = [0, 0, 0];
      for (let row = 2; row >= 0; row -= 1) {
        let sum = b[row] ?? 0;
        for (let column = row + 1; column < 3; column += 1)
          sum -= (a[row]?.[column] ?? 0) * (x[column] ?? 0);
        x[row] = sum / (a[row]?.[row] ?? 1);
      }
      encodedRows.push([x[0] ?? 0, x[1] ?? 0, x[2] ?? 0]);
    }
    const encodedMatrix: Matrix3 = [
      encodedRows[0] ?? [0, 0, 0],
      encodedRows[1] ?? [0, 0, 0],
      encodedRows[2] ?? [0, 0, 0],
    ];

    const encodedResidual =
      observations.reduce((total, observation, index) => {
        const patch = CONSTRUCTED_CARD.patches[index];
        if (patch === undefined) return total;
        const corrected = applyMatrix(encodedMatrix, observation.rgb);
        const xyz = linearSrgbToXyz(srgbToLinearSrgb(corrected));
        return total + deltaE00(xyzToLab(xyz, CANONICAL_WHITE), xyzToLab(patch.xyz, CANONICAL_WHITE));
      }, 0) / observations.length;

    const linearResidual = solveCorrection(observations, CONSTRUCTED_CARD, 'srgb').after.mean;

    // The encoded fit is not merely worse — it is worse by a margin nobody could call noise.
    expect(encodedResidual).toBeGreaterThan(0.1);
    expect(linearResidual).toBeLessThan(1e-9);
  });
});
