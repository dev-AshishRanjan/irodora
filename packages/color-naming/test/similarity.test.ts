/**
 * The similarity scale (ADR-0048).
 *
 * The property that matters is **rank-consistency**: a presentation scale that could disagree
 * with the ordering it decorates would be worse than no scale. Everything else here is guarding
 * the claims the ADR makes, so that a future change to the curve has to break a test rather than
 * quietly alter what a user is shown.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { similarityPercent, SIMILARITY_HALF_LIFE_DELTA_E } from '../src/index.js';

const deltaArb = fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true });

describe('the stated scale', () => {
  it('is exactly 100 at zero distance', () => {
    expect(similarityPercent(0)).toBe(100);
  });

  it('halves at the half-life, and again at twice it', () => {
    expect(similarityPercent(SIMILARITY_HALF_LIFE_DELTA_E)).toBeCloseTo(50, 12);
    expect(similarityPercent(2 * SIMILARITY_HALF_LIFE_DELTA_E)).toBeCloseTo(25, 12);
    expect(similarityPercent(3 * SIMILARITY_HALF_LIFE_DELTA_E)).toBeCloseTo(12.5, 12);
  });

  it('pins the constant, so changing what a user sees breaks a test', () => {
    expect(SIMILARITY_HALF_LIFE_DELTA_E).toBe(10);
  });
});

describe('rank consistency — the property the ranking depends on', () => {
  it('is monotone non-increasing', () => {
    fc.assert(
      fc.property(deltaArb, deltaArb, (a, b) => {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        expect(similarityPercent(lo)).toBeGreaterThanOrEqual(similarityPercent(hi));
      }),
      { numRuns: 5000, seed: 20260825 },
    );
  });

  it('is NOT injective, which is why deltaE00 and not similarity is the sort key', () => {
    // The first version of this file asserted "strictly decreasing"; fast-check produced a
    // counterexample on run 1. Two distinct ΔE00 close enough together map to the same
    // `Number`, so sorting by similarity would TIE where ΔE00 does not — and near-identical
    // candidates would then reorder non-deterministically with input order.
    //
    // Asserted rather than merely noted, so the limitation is a fact the suite knows.
    expect(similarityPercent(0)).toBe(similarityPercent(Number.MIN_VALUE));
  });

  it('never INVERTS an ordering', () => {
    // The weaker, true claim, and the one the design actually needs: a further colour can never
    // display as more similar than a nearer one.
    fc.assert(
      fc.property(deltaArb, deltaArb, (a, b) => {
        if (similarityPercent(a) > similarityPercent(b)) expect(a).toBeLessThan(b);
      }),
      { numRuns: 5000, seed: 20260826 },
    );
  });

  it('leaves a ΔE00-sorted list non-increasing in similarity', () => {
    fc.assert(
      fc.property(fc.array(deltaArb, { minLength: 2, maxLength: 30 }), (deltas) => {
        const byDistance = [...deltas].sort((x, y) => x - y);
        const similarities = byDistance.map((d) => similarityPercent(d));
        for (let i = 1; i < similarities.length; i += 1)
          expect(similarities[i]).toBeLessThanOrEqual(similarities[i - 1]!);
      }),
      { numRuns: 2000, seed: 20260827 },
    );
  });
});

describe('range', () => {
  it('stays within (0, 100] across every attainable ΔE00', () => {
    // 200 is comfortably beyond the largest distance two CIELAB colours can be apart (~150).
    fc.assert(
      fc.property(deltaArb, (d) => {
        const s = similarityPercent(d);
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThanOrEqual(100);
      }),
      { numRuns: 5000, seed: 20260871 },
    );
  });

  it('never reaches zero for a distance a real pair can produce', () => {
    // A legitimate third candidate must not display as "0 % similar" — that reads as a claim
    // of unrelatedness, and it is the specific failure a clamped ramp would have caused.
    expect(similarityPercent(150)).toBeGreaterThan(0);
  });
});

describe('it refuses inputs that are not distances', () => {
  it('rejects a negative ΔE00', () => {
    expect(() => similarityPercent(-1)).toThrow(TypeError);
  });

  it('rejects NaN and Infinity rather than returning a plausible number', () => {
    expect(() => similarityPercent(Number.NaN)).toThrow(TypeError);
    expect(() => similarityPercent(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
