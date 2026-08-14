/**
 * Behaviour of the RGB ↔ XYZ conversions, as distinct from their published values.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  displayP3ToXyz,
  linearSrgbToXyz,
  srgbToXyz,
  xyzToDisplayP3,
  xyzToLinearSrgb,
  xyzToSrgb,
  type Triple,
} from '../src/index.js';

const maxAbsDiff = (a: Triple, b: Triple): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

const rgbArb = (): fc.Arbitrary<Triple> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    )
    .map(([r, g, b]) => [r, g, b] as Triple);

describe('sRGB ↔ XYZ', () => {
  it('round-trips the stratified sample', () => {
    for (const { rgb, stratum, index } of sampleSrgb('rgb-xyz-round-trip', 10_000))
      expect(
        maxAbsDiff(xyzToSrgb(srgbToXyz(rgb)), rgb),
        `sample ${String(index)} (${stratum})`,
      ).toBeLessThan(1e-12);
  });

  it('round-trips arbitrary in-gamut colours', () => {
    fc.assert(
      fc.property(rgbArb(), (rgb) => {
        expect(maxAbsDiff(xyzToSrgb(srgbToXyz(rgb)), rgb)).toBeLessThan(1e-12);
      }),
      { numRuns: 5_000 },
    );
  });

  it('round-trips OUT-of-gamut colours, because nothing clamps', () => {
    // The property that makes gamut mapping possible at all (F-009). If any step clamped,
    // this round trip would silently return a different colour and F-009 would be mapping
    // from a value that had already lost the information it needs.
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
        ),
        ([r, g, b]) => {
          const rgb: Triple = [r, g, b];
          expect(maxAbsDiff(xyzToSrgb(srgbToXyz(rgb)), rgb)).toBeLessThan(1e-12);
        },
      ),
      { numRuns: 3_000 },
    );
  });

  it('is linear in linear light — the property that makes averaging correct', () => {
    // Averaging happens in linear light because the transfer function is not linear. This
    // asserts the half of that statement that lives in this file: the MATRIX is linear, so
    // the mean of two linear-light colours converts to the mean of their XYZ.
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        const mid: Triple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        const meanOfXyz = ((): Triple => {
          const [xa, xb] = [linearSrgbToXyz(a), linearSrgbToXyz(b)];
          return [(xa[0] + xb[0]) / 2, (xa[1] + xb[1]) / 2, (xa[2] + xb[2]) / 2];
        })();
        expect(maxAbsDiff(linearSrgbToXyz(mid), meanOfXyz)).toBeLessThan(1e-15);
      }),
      { numRuns: 2_000 },
    );
  });

  it('shows the cost of averaging ENCODED sRGB instead', () => {
    // Black and white. Averaged in linear light the result carries half the light (Y = 0.5);
    // averaged as encoded values it carries 21.4%. Not a subtle bias: the linear-light answer
    // is 2.3x brighter, and averaging encoded values is always the darker of the two.
    const encodedMean: Triple = [0.5, 0.5, 0.5];
    expect(srgbToXyz(encodedMean)[1]).toBeCloseTo(0.21404114, 8);

    const linearMean: Triple = [0.5, 0.5, 0.5];
    expect(linearSrgbToXyz(linearMean)[1]).toBeCloseTo(0.5, 12);
  });
});

describe('Display-P3 ↔ XYZ', () => {
  it('round-trips arbitrary in-gamut colours', () => {
    fc.assert(
      fc.property(rgbArb(), (rgb) => {
        expect(maxAbsDiff(xyzToDisplayP3(displayP3ToXyz(rgb)), rgb)).toBeLessThan(1e-12);
      }),
      { numRuns: 5_000 },
    );
  });

  it('contains the sRGB gamut — every sRGB colour is in-gamut P3', () => {
    for (const { rgb, index } of sampleSrgb('p3-contains-srgb', 4_000)) {
      const p3 = xyzToDisplayP3(srgbToXyz(rgb));
      for (const c of p3) {
        expect(c, `sample ${String(index)}`).toBeGreaterThan(-1e-9);
        expect(c, `sample ${String(index)}`).toBeLessThan(1 + 1e-9);
      }
    }
  });

  it('is strictly larger — P3 red is outside sRGB', () => {
    expect(xyzToSrgb(displayP3ToXyz([1, 0, 0]))[0]).toBeGreaterThan(1.09);
  });
});

describe('linear sRGB ↔ XYZ', () => {
  it('round-trips', () => {
    fc.assert(
      fc.property(rgbArb(), (rgb) => {
        expect(maxAbsDiff(xyzToLinearSrgb(linearSrgbToXyz(rgb)), rgb)).toBeLessThan(1e-15);
      }),
      { numRuns: 5_000 },
    );
  });

  it('maps black to black exactly', () => {
    expect(linearSrgbToXyz([0, 0, 0])).toEqual([0, 0, 0]);
  });
});
