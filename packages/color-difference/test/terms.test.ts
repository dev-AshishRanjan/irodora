/**
 * `deltaE00Terms` — the properties the published pairs cannot cover (F-222).
 *
 * 1. **One computation.** The total it reports is `deltaE00`'s, bit for bit, over the 10,000 inputs the
 *    cross-platform identity fixture is built from — not merely close: NFR-3 is about the bit, and a
 *    second CIEDE2000 would agree to the eye and not to the digest.
 * 2. **Direction.** Swapping the colours negates every term, so a reading's direction is the sign.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import { srgbToXyz, xyzToLab, type Lab } from '@irodora/color-spaces';
import { deltaE00, deltaE00Terms } from '../src/index.js';
import { IDENTITY_SEED, IDENTITY_COUNT, REFERENCE_SRGB } from './identity/vectors.js';

const REFERENCE: Lab = xyzToLab(srgbToXyz(REFERENCE_SRGB));
const identityLabs = sampleSrgb(IDENTITY_SEED, IDENTITY_COUNT).map(({ rgb }) =>
  xyzToLab(srgbToXyz(rgb)),
);

const labArb = (): fc.Arbitrary<Lab> =>
  fc.tuple(
    fc.double({ min: 0, max: 100, noNaN: true }),
    fc.double({ min: -128, max: 128, noNaN: true }),
    fc.double({ min: -128, max: 128, noNaN: true }),
  );

describe('one computation', () => {
  it('reports deltaE00’s own double over the identity fixture’s 10,000 inputs', () => {
    expect(identityLabs).toHaveLength(IDENTITY_COUNT);
    const differing = identityLabs.filter(
      (lab) => !Object.is(deltaE00Terms(lab, REFERENCE).deltaE00, deltaE00(lab, REFERENCE)),
    );
    expect(differing).toHaveLength(0);
  });

  it('DECOY — the same terms summed in another order are not always the same double', () => {
    // Why the total is never recomposed from the terms: the identity above is the core's, not the
    // algebra's. Some pair differs in the last bit when the sum is reordered. (Against the grey
    // reference the hue term is zero, so the pairs are consecutive samples, every term non-zero.)
    const reordered = identityLabs.slice(1).filter((lab, i) => {
      const t = deltaE00Terms(lab, identityLabs[i] ?? REFERENCE);
      const other = Math.sqrt(
        t.termH * t.termH + t.termC * t.termC + t.termL * t.termL + t.rt * t.termC * t.termH,
      );
      return !Object.is(other, t.deltaE00);
    });
    expect(reordered.length).toBeGreaterThan(0);
  });

  it('holds for arbitrary pairs and weights, not only against the reference', () => {
    fc.assert(
      fc.property(labArb(), labArb(), (a, b) => {
        expect(Object.is(deltaE00Terms(a, b).deltaE00, deltaE00(a, b))).toBe(true);
        const w = { kL: 2, kC: 1, kH: 1 };
        expect(Object.is(deltaE00Terms(a, b, w).deltaE00, deltaE00(a, b, w))).toBe(true);
      }),
      { numRuns: 3_000, seed: 20261007 },
    );
  });
});

describe('direction', () => {
  it('negates every term when the colours are swapped, away from the ±180° hue branch', () => {
    fc.assert(
      fc.property(labArb(), labArb(), (a, b) => {
        const ab = deltaE00Terms(a, b);
        const ba = deltaE00Terms(b, a);
        expect(ab.termL).toBeCloseTo(-ba.termL, 10);
        expect(ab.termC).toBeCloseTo(-ba.termC, 10);
        // At exactly 180° apart the branch choice, not the colours, decides the sign.
        const h1 = Math.atan2(a[2], a[1]);
        const h2 = Math.atan2(b[2], b[1]);
        const apart = Math.abs(((((h2 - h1) * 180) / Math.PI + 540) % 360) - 180);
        if (apart < 179.9) expect(ab.termH).toBeCloseTo(-ba.termH, 10);
      }),
      { numRuns: 3_000, seed: 20261008 },
    );
  });

  it('reads lighter as a positive lightness term, and more chromatic as a positive chroma term', () => {
    const grey: Lab = [50, 0, 0];
    expect(deltaE00Terms(grey, [60, 0, 0]).termL).toBeGreaterThan(0);
    expect(deltaE00Terms([60, 0, 0], grey).termL).toBeLessThan(0);
    expect(deltaE00Terms([50, 10, 0], [50, 30, 0]).termC).toBeGreaterThan(0);
    // DECOY: a pure lightness difference moves no other term.
    const lighter = deltaE00Terms(grey, [60, 0, 0]);
    expect([lighter.termC, lighter.termH]).toStrictEqual([0, 0]);
  });
});
