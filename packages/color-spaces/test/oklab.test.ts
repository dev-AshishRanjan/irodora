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

  /**
   * The tolerance here is **1e-6, not 1e-12**, and the six orders of magnitude are the
   * point. See [ADR-0052](../../../docs/adr/0052-oklab-round-trip-tolerance-is-conditioned-on-lms.md).
   *
   * `1e-12` stood here until F-071 and was **wrong by five orders of magnitude**. It passed
   * because 5,000 unseeded samples almost never reach the tail. Measured over **2,000,000**
   * cases from this exact generator, the worst round-trip error is **5.422e-8**.
   *
   * The mechanism is conditioning, not a defect. `oklabToXyz` cubes LMS′ and `xyzToOklab`
   * cube-roots it back, and `d/dx x^(1/3) → ∞` as `x → 0`. When one LMS′ component lands
   * near zero while the others do not, its cube underflows toward the noise floor and the
   * inverse amplifies that noise. The worst case found — OKLab `[0.0447, 0.1818, 0.4]` —
   * has LMS′ = `[0.203, -3.7e-5, -0.488]`, whose cubes span a ratio of 2.3e12.
   *
   * The error tracks the conditioning exactly, over 2,000,000 samples:
   *
   * | `min|LMS′|` ≥ | worst round-trip error |
   * |---|---|
   * | anything | 5.422e-8 |
   * | 1e-5 | 3.174e-10 |
   * | 1e-4 | 1.169e-10 |
   * | 1e-3 | 6.457e-12 |
   * | 1e-2 | 4.607e-14 |
   *
   * **No real colour goes near this.** Every input in this generator's declared range is far
   * outside any physical gamut; the stratified sRGB test above round-trips actual colours to
   * **1e-14**, and that is the guarantee the product depends on. This property exists to
   * assert the transform stays *sane* — finite, invertible, no NaN — where nothing real
   * lives, and 1e-6 gives 18× margin over the measured worst case.
   *
   * Widening a tolerance to make a red test green is the thing this repository most
   * consistently refuses. This is the opposite: the test was **green and wrong**, and the
   * new number is measured rather than chosen.
   */
  it('round-trips arbitrary OKLab values, to a bound set by LMS conditioning', () => {
    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        expect(maxAbsDiff(xyzToOklab(oklabToXyz(oklab)), oklab)).toBeLessThan(1e-6);
      }),
      { numRuns: 5_000, seed: 20260849 },
    );
  });

  /**
   * The half of the old claim that IS true, kept as its own property so it cannot be lost
   * inside the loosened bound above. Where LMS′ is well conditioned, the round trip is
   * essentially exact — 4.607e-14 measured worst case, asserted at 1e-12 for 21× margin.
   */
  it('round-trips to 1e-12 wherever LMS is well conditioned', () => {
    const wellConditioned = (oklab: OkLab): boolean => {
      const [l, a, b] = oklab;
      return (
        Math.min(
          Math.abs(l + 0.3963377774 * a + 0.2158037573 * b),
          Math.abs(l - 0.1055613458 * a - 0.0638541728 * b),
          Math.abs(l - 0.0894841775 * a - 1.291485548 * b),
        ) >= 1e-2
      );
    };

    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        fc.pre(wellConditioned(oklab));
        expect(maxAbsDiff(xyzToOklab(oklabToXyz(oklab)), oklab)).toBeLessThan(1e-12);
      }),
      { numRuns: 5_000, seed: 20260872 },
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
      { numRuns: 3_000, seed: 20260850 },
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
      { numRuns: 3_000, seed: 20260851 },
    );
  });
});

describe('OKLab ↔ OKLCh', () => {
  it('round-trips', () => {
    fc.assert(
      fc.property(oklabArb(), (oklab) => {
        expect(maxAbsDiff(oklchToOklab(oklabToOklch(oklab)), oklab)).toBeLessThan(1e-15);
      }),
      { numRuns: 5_000, seed: 20260852 },
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
      { numRuns: 5_000, seed: 20260853 },
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
