/**
 * The invariants, over generated input rather than chosen input.
 *
 * `fast-check` was declared in this package's manifest and never imported — review caught it.
 * The zone's rules name round-trip, symmetry, bounds and idempotence as required for an engine
 * change, and a hand-picked distortion matrix proves the solver inverts *that* matrix.
 *
 * Generators are bounded to **plausibly invertible** cameras: diagonal terms near 1, cross-talk
 * small. That is not a way of avoiding hard cases — the hard cases have their own named tests,
 * where the expected behaviour is a specific refusal rather than a property. A generator that
 * mostly produced singular matrices would spend its budget re-testing one `throw`.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { linearSrgbToSrgb, xyzToLinearSrgb } from '@irodora/color-spaces';

import {
  applyCorrection,
  applyMatrix,
  solveCorrection,
  type Matrix3,
  type Observation,
} from '../src/index.js';
import { CONSTRUCTED_CARD } from './fixture.js';

/** A camera-shaped 3×3: gains near 1, cross-talk within ±0.15. */
const distortion = fc
  .tuple(
    fc.double({ min: 0.7, max: 1.3, noNaN: true }),
    fc.double({ min: 0.7, max: 1.3, noNaN: true }),
    fc.double({ min: 0.7, max: 1.3, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
    fc.double({ min: -0.15, max: 0.15, noNaN: true }),
  )
  .map(([rr, gg, bb, rg, rb, gr, gb, br, bg]): Matrix3 => [
    [rr, rg, rb],
    [gr, gg, gb],
    [br, bg, bb],
  ]);

const observe = (matrix: Matrix3): readonly Observation[] =>
  CONSTRUCTED_CARD.patches.map((patch) => ({
    id: patch.id,
    rgb: linearSrgbToSrgb(applyMatrix(matrix, xyzToLinearSrgb(patch.xyz))),
  }));

describe('solveCorrection, over generated cameras', () => {
  it('inverts ANY well-conditioned linear camera, not just the one in the golden test', () => {
    fc.assert(
      fc.property(distortion, (matrix) => {
        const correction = solveCorrection(observe(matrix), CONSTRUCTED_CARD, 'srgb');
        // The tolerance is ΔE00, and the fit is exact in linear RGB — what is left is float
        // rounding through two Lab conversions. Nine orders inside the golden tolerance.
        expect(correction.after.mean).toBeLessThan(1e-6);
      }),
      { numRuns: 200 },
    );
  });

  it('is invariant to the order the patches arrive in', () => {
    fc.assert(
      fc.property(distortion, fc.integer({ min: 0, max: 1_000_000 }), (matrix, seed) => {
        const observations = observe(matrix);
        // A deterministic shuffle from the seed, so a failure is reproducible from the counter-
        // example fast-check prints rather than from a random it did not record.
        const shuffled = [...observations]
          .map((observation, index) => ({ observation, key: (seed * (index + 7)) % 9973 }))
          .sort((a, b) => a.key - b.key)
          .map((entry) => entry.observation);

        const a = solveCorrection(observations, CONSTRUCTED_CARD, 'srgb');
        const b = solveCorrection(shuffled, CONSTRUCTED_CARD, 'srgb');

        for (const [row, values] of a.matrix.entries())
          for (const [column, value] of values.entries())
            expect(value).toBeCloseTo(b.matrix[row]?.[column] ?? Number.NaN, 9);
      }),
      { numRuns: 100 },
    );
  });

  it('produces finite coefficients and finite residuals, always', () => {
    fc.assert(
      fc.property(distortion, (matrix) => {
        const correction = solveCorrection(observe(matrix), CONSTRUCTED_CARD, 'srgb');
        for (const row of correction.matrix)
          for (const value of row) expect(Number.isFinite(value)).toBe(true);

        for (const value of [
          correction.before.mean,
          correction.before.max,
          correction.after.mean,
          correction.after.max,
        ])
          expect(Number.isFinite(value)).toBe(true);

        // The max is over the same set as the mean, so it can never be the smaller of the two.
        // The store has this as a CHECK constraint; this is where the value is produced.
        expect(correction.after.max).toBeGreaterThanOrEqual(correction.after.mean);
        expect(correction.before.max).toBeGreaterThanOrEqual(correction.before.mean);
      }),
      { numRuns: 200 },
    );
  });

  it('is idempotent: correcting the observations and re-solving gives the identity', () => {
    /*
     * The first draft of this applied the correction to the card's REFERENCE values rather than
     * to the observations, and so re-solved from `M·reference` — which recovers `M⁻¹`, not the
     * identity. fast-check found it immediately with the simplest possible counterexample, a
     * uniform 0.7 gain, and printed `0.6999999999999993` where 1 was expected.
     *
     * Worth leaving a note about: the property was mis-stated, not the code, and a hand-written
     * example with a less symmetric matrix would have produced a wrong number that looked like
     * noise rather than one that reads as "this is 0.7".
     */
    fc.assert(
      fc.property(distortion, (matrix) => {
        const observations = observe(matrix);
        const correction = solveCorrection(observations, CONSTRUCTED_CARD, 'srgb');

        const corrected: readonly Observation[] = observations.map((observation) => ({
          id: observation.id,
          rgb: linearSrgbToSrgb(applyCorrection(correction, observation.rgb)),
        }));

        const second = solveCorrection(corrected, CONSTRUCTED_CARD, 'srgb');
        for (const [row, values] of second.matrix.entries())
          for (const [column, value] of values.entries())
            expect(value).toBeCloseTo(row === column ? 1 : 0, 6);
      }),
      { numRuns: 50 },
    );
  });
});
