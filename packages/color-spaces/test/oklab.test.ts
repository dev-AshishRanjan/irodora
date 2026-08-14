/**
 * Behaviour of OKLab and OKLCh.
 *
 * The uniformity test is the one that says why this space exists at all. Everything else in
 * this engine could be done in CIELCh; hue rotation could not, because CIELAB's hue lines
 * bend and a rotation there changes perceived lightness as a side effect.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  labToLch,
  oklabToOklch,
  oklabToXyz,
  oklchToOklab,
  oklchToXyz,
  srgbToXyz,
  xyzToLab,
  xyzToOklab,
  xyzToOklch,
  type OkLab,
  type Triple,
} from '../src/index.js';

const maxAbsDiff = (a: Triple, b: Triple): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

const oklabArb = (): fc.Arbitrary<OkLab> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: -0.4, max: 0.4, noNaN: true }),
      fc.double({ min: -0.4, max: 0.4, noNaN: true }),
    )
    .map(([l, a, b]) => [l, a, b] as OkLab);

describe('XYZ ↔ OKLab', () => {
  it('round-trips the stratified sample', () => {
    for (const { rgb, stratum, index } of sampleSrgb('oklab-round-trip', 10_000)) {
      const xyz = srgbToXyz(rgb);
      expect(
        maxAbsDiff(oklabToXyz(xyzToOklab(xyz)), xyz),
        `sample ${String(index)} (${stratum})`,
      ).toBeLessThan(1e-14);
    }
  });

  it('round-trips arbitrary OKLab values', () => {
    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        expect(maxAbsDiff(xyzToOklab(oklabToXyz(oklab)), oklab)).toBeLessThan(1e-12);
      }),
      { numRuns: 5_000 },
    );
  });

  it('handles negative LMS without producing NaN', () => {
    // Math.pow(negative, 1/3) is NaN and Math.cbrt is not. LMS goes negative for colours
    // outside the gamut they came from, which is every colour F-009 will be asked to map.
    // A NaN here would compare false against every tolerance and look like a passing test.
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
          fc.double({ min: -0.5, max: 1.5, noNaN: true }),
        ),
        ([x, y, z]) => {
          const oklab = xyzToOklab([x, y, z]);
          for (const c of oklab) expect(Number.isFinite(c)).toBe(true);
        },
      ),
      { numRuns: 3_000 },
    );
  });

  it('is monotonic in lightness', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 1e-5, max: 1, noNaN: true }),
        (y, step) => {
          const lower = xyzToOklab([0.9504559270516716 * y, y, 1.0890577507598784 * y])[0];
          const upper = xyzToOklab([
            0.9504559270516716 * (y + step),
            y + step,
            1.0890577507598784 * (y + step),
          ])[0];
          expect(upper).toBeGreaterThan(lower);
        },
      ),
      { numRuns: 3_000 },
    );
  });
});

describe('OKLab ↔ OKLCh', () => {
  it('round-trips', () => {
    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        expect(maxAbsDiff(oklchToOklab(oklabToOklch(oklab)), oklab)).toBeLessThan(1e-15);
      }),
      { numRuns: 5_000 },
    );
  });

  it('round-trips through XYZ', () => {
    for (const { rgb, index } of sampleSrgb('oklch-round-trip', 4_000)) {
      const xyz = srgbToXyz(rgb);
      expect(maxAbsDiff(oklchToXyz(xyzToOklch(xyz)), xyz), `sample ${String(index)}`).toBeLessThan(
        1e-14,
      );
    }
  });

  it('keeps hue in [0, 360) and chroma non-negative', () => {
    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        const [, chroma, hue] = oklabToOklch(oklab);
        expect(chroma).toBeGreaterThanOrEqual(0);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }),
      { numRuns: 5_000 },
    );
  });
});

describe('OKLCh and CIELCh disagree about lightness, and the disagreement is bounded', () => {
  const spread = (samples: readonly number[]): number =>
    Math.max(...samples) - Math.min(...samples);

  it('an OKLCh hue rotation holds OKLab lightness exactly', () => {
    // True by construction — L is not touched. Asserted anyway, because "by construction" is
    // what people say about the thing that turns out to have been touched.
    const lightness: number[] = [];
    for (let i = 0; i < 36; i++) lightness.push(xyzToOklab(oklchToXyz([0.55, 0.12, i * 10]))[0]);
    expect(spread(lightness)).toBeLessThan(1e-15);
  });

  it('and moves CIELAB L* by up to 12 points while doing it', () => {
    // The two spaces genuinely disagree about what "the same lightness" means, so the choice
    // of space is a real decision rather than a formatting preference. The number is pinned
    // so a future change to either conversion shows up here.
    //
    // What this does NOT do is prove OKLab is the correct one. That rests on Ottosson's
    // published fit to perceptual datasets, which is a citation, not something a test in this
    // repository can establish. F-014 generates in OKLCh on the strength of that citation and
    // this measurement says how much is at stake in the choice.
    const lStar: number[] = [];
    for (let i = 0; i < 36; i++) lStar.push(xyzToLab(oklchToXyz([0.55, 0.12, i * 10]))[0]);

    const drift = spread(lStar);
    expect(drift).toBeGreaterThan(1);
    expect(drift).toBeLessThan(12);
  });

  it('the same colour has different lightness numbers in each space', () => {
    const xyz = srgbToXyz([0.45, 0.35, 0.7]);
    const okL = xyzToOklch(xyz)[0];
    const labL = labToLch(xyzToLab(xyz))[0];
    // Not a scaling of one another: OKLab L is on [0,1] and CIELAB L* on [0,100], and
    // `okL * 100` is not `labL`. Code that treats one as the other is off by several points.
    expect(Math.abs(okL * 100 - labL)).toBeGreaterThan(3);
  });
});
