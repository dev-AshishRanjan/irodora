/**
 * Behaviour of CIELAB and CIELCh.
 *
 * The hue tests are the ones that earn their place. Hue is an angle, and every bug that
 * comes from forgetting it produces a plausible number: a mean hue of 180° for two colours
 * either side of red, a sort order that breaks at one point on the wheel, an interpolation
 * that travels the long way round.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  CANONICAL_WHITE,
  D50,
  hueDelta,
  labToLch,
  labToXyz,
  lchToLab,
  normalizeHue,
  srgbToXyz,
  xyzToLab,
  xyzToLch,
  lchToXyz,
  type Lab,
  type Triple,
} from '../src/index.js';

const maxAbsDiff = (a: Triple, b: Triple): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

const labArb = (): fc.Arbitrary<Lab> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 100, noNaN: true }),
      fc.double({ min: -128, max: 128, noNaN: true }),
      fc.double({ min: -128, max: 128, noNaN: true }),
    )
    .map(([l, a, b]) => [l, a, b] as Lab);

describe('XYZ ↔ CIELAB', () => {
  it('round-trips the stratified sample', () => {
    for (const { rgb, stratum, index } of sampleSrgb('lab-round-trip', 10_000)) {
      const xyz = srgbToXyz(rgb);
      expect(
        maxAbsDiff(labToXyz(xyzToLab(xyz)), xyz),
        `sample ${String(index)} (${stratum})`,
      ).toBeLessThan(1e-14);
    }
  });

  it('round-trips arbitrary Lab values, including ones no display can show', () => {
    fc.assert(
      fc.property(labArb(), (lab) => {
        expect(maxAbsDiff(xyzToLab(labToXyz(lab)), lab)).toBeLessThan(1e-11);
      }),
      { numRuns: 5_000, seed: 20260843 },
    );
  });

  it('is monotonic in lightness — more Y is never less L*', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 1e-6, max: 1, noNaN: true }),
        (y, step) => {
          const lower = xyzToLab([CANONICAL_WHITE[0] * y, y, CANONICAL_WHITE[2] * y])[0];
          const upper = xyzToLab([
            CANONICAL_WHITE[0] * (y + step),
            y + step,
            CANONICAL_WHITE[2] * (y + step),
          ])[0];
          expect(upper).toBeGreaterThan(lower);
        },
      ),
      { numRuns: 3_000, seed: 20260844 },
    );
  });

  it('gives a neutral exactly zero chroma when the scale is exact in binary', () => {
    // A neutral is the white point scaled. Its three ratios are equal, so the differences
    // that make a* and b* are differences of identical numbers. Where the scaling is exact in
    // float64 — a power of two — that is exactly zero, not nearly zero.
    for (let e = 0; e <= 10; e++) {
      const k = Math.pow(2, -e);
      const [, a, b] = xyzToLab([CANONICAL_WHITE[0] * k, k, CANONICAL_WHITE[2] * k]);
      expect(a, `k = 2^-${String(e)}`).toBe(0);
      expect(b, `k = 2^-${String(e)}`).toBe(0);
    }
  });

  it('and effectively zero otherwise — 5.6e-14, from one division', () => {
    // For a scale that is not a power of two, `(Xn · k) / Xn` is not bit-identical to `k`,
    // and that single rounding is the whole residual. It is 5.6e-14 in a*, or 5.6e-14 ΔE:
    // ten orders of magnitude below anything a display or an eye resolves.
    //
    // Stated as a measured bound rather than "approximately zero", because a normalisation
    // against a slightly WRONG white would also look approximately zero — at around 0.03,
    // which is how a grey ends up rendered faintly green. The bound is what separates them.
    let worst = 0;
    for (let i = 1; i <= 1_000; i++) {
      const k = i / 1_000;
      const [, a, b] = xyzToLab([CANONICAL_WHITE[0] * k, k, CANONICAL_WHITE[2] * k]);
      worst = Math.max(worst, Math.abs(a), Math.abs(b));
    }
    expect(worst).toBeLessThan(1e-13);
  });

  it('uses the white it is given — the same XYZ under D50 is a different Lab', () => {
    const xyz = srgbToXyz([0.8, 0.4, 0.2]);
    const underD65 = xyzToLab(xyz);
    const underD50 = xyzToLab(xyz, D50);
    expect(maxAbsDiff(underD65, underD50)).toBeGreaterThan(5);
  });
});

describe('CIELAB ↔ CIELCh', () => {
  it('round-trips', () => {
    fc.assert(
      fc.property(labArb(), (lab) => {
        expect(maxAbsDiff(lchToLab(labToLch(lab)), lab)).toBeLessThan(1e-12);
      }),
      { numRuns: 5_000, seed: 20260845 },
    );
  });

  it('round-trips through XYZ as well', () => {
    for (const { rgb, index } of sampleSrgb('lch-round-trip', 4_000)) {
      const xyz = srgbToXyz(rgb);
      expect(maxAbsDiff(lchToXyz(xyzToLch(xyz)), xyz), `sample ${String(index)}`).toBeLessThan(
        1e-13,
      );
    }
  });

  it('keeps chroma non-negative and hue in [0, 360)', () => {
    fc.assert(
      fc.property(labArb(), (lab) => {
        const [, chroma, hue] = labToLch(lab);
        expect(chroma).toBeGreaterThanOrEqual(0);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }),
      { numRuns: 5_000, seed: 20260846 },
    );
  });

  it('treats hue as an angle: 350° and 10° are 20° apart, not 340°', () => {
    // The canonical example. A naive difference gives 340 and a naive mean gives 180 — a
    // colour on the opposite side of the wheel from both inputs.
    expect(hueDelta(350, 10)).toBe(20);
    expect(hueDelta(10, 350)).toBe(-20);
    expect(normalizeHue(350 + hueDelta(350, 10) / 2)).toBe(0);
  });

  it('folds every representation of the same angle to the same number', () => {
    for (const h of [0, 360, 720, -360, -0]) expect(normalizeHue(h)).toBe(0);
    expect(normalizeHue(-10)).toBe(350);
    expect(normalizeHue(370)).toBe(10);
  });

  it('never reports 360, which is the same angle as 0 and a different number', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (h) => {
        const folded = normalizeHue(h);
        expect(folded).toBeLessThan(360);
        expect(folded).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 5_000, seed: 20260847 },
    );
  });

  it('puts the shortest arc in (-180, 180]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        (from, to) => {
          const delta = hueDelta(from, to);
          expect(delta).toBeGreaterThan(-180);
          expect(delta).toBeLessThanOrEqual(180);
        },
      ),
      { numRuns: 5_000, seed: 20260848 },
    );
  });
});
