/**
 * ADR-0125's band table and the readings built on it (F-222).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  axisReading,
  DELTA_E00_BANDS,
  deltaE00Band,
  printedDeltaE00,
  type DeltaE00Band,
} from '../src/index.js';

const ORDER: readonly DeltaE00Band[] = DELTA_E00_BANDS.map((edge) => edge.band);

describe('the band of a ΔE00', () => {
  it('rises with the value and never falls', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 200, noNaN: true }),
        fc.double({ min: 0, max: 200, noNaN: true }),
        (x, y) => {
          const [lo, hi] = x <= y ? [x, y] : [y, x];
          expect(ORDER.indexOf(deltaE00Band(lo))).toBeLessThanOrEqual(
            ORDER.indexOf(deltaE00Band(hi)),
          );
        },
      ),
      { numRuns: 3_000, seed: 20261009 },
    );
  });

  it('puts each edge in the band above it', () => {
    expect(deltaE00Band(0)).toBe('veryClose');
    expect(deltaE00Band(0.8)).toBe('slight');
    expect(deltaE00Band(0.79999)).toBe('veryClose');
    expect(deltaE00Band(1.8)).toBe('perceptible');
    expect(deltaE00Band(1.79999)).toBe('slight');
    // Past acceptability there is no further edge: a large difference is still "perceptible".
    expect(deltaE00Band(5)).toBe('perceptible');
    expect(deltaE00Band(40)).toBe('perceptible');
  });

  it('refuses what is not a ΔE00 rather than banding it', () => {
    for (const bad of [Number.NaN, -0.1, Number.POSITIVE_INFINITY])
      expect(() => deltaE00Band(bad)).toThrow(TypeError);
    for (const bad of [Number.NaN, -1, Number.NEGATIVE_INFINITY])
      expect(() => printedDeltaE00(bad)).toThrow(TypeError);
  });

  it('bands a total as it is printed, so the word never contradicts the figure', () => {
    // 0.7999 prints as 0.80, which is at the perceptibility edge.
    expect(printedDeltaE00(0.7999)).toBe(0.8);
    expect(deltaE00Band(printedDeltaE00(0.7999))).toBe('slight');
    // DECOY: banding the raw value would call a printed 0.80 "very close".
    expect(deltaE00Band(0.7999)).toBe('veryClose');
  });
});

describe('the reading beside a component', () => {
  it('takes its band from the weighted term’s magnitude, on the same table as the total', () => {
    const grid = [0, 0.3, 0.79, 0.8, 1.2, 1.79, 1.8, 3.4, 4.99, 5, 9];
    for (const term of grid)
      for (const sign of [1, -1]) {
        expect(axisReading(sign, sign * term).band).toBe(deltaE00Band(term));
      }
  });

  it('takes its direction from the printed figure, not the term', () => {
    expect(axisReading(1.2, 0.4).direction).toBe('more');
    expect(axisReading(-1.2, -0.4).direction).toBe('less');
    // DECOY: near neutral ΔC* and ΔC′ can disagree in sign; the word follows the figure beside it.
    expect(axisReading(-0.6, 0.2)).toStrictEqual({ band: 'veryClose', direction: 'less' });
  });

  it('reads a printed zero of either sign as level', () => {
    expect(axisReading(0, 0).direction).toBe('level');
    expect(axisReading(-0, 0.001).direction).toBe('level');
  });

  it('refuses a figure or a term that is not finite', () => {
    expect(() => axisReading(Number.NaN, 0)).toThrow(TypeError);
    expect(() => axisReading(0, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
