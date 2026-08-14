/**
 * Behaviour of chromatic adaptation.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  adapt,
  adaptationMatrix,
  D50,
  D65,
  srgbToXyz,
  xyzToLab,
  type AdaptationMethod,
  type Triple,
} from '../src/index.js';

const maxAbsDiff = (a: Triple, b: Triple): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

const METHODS: readonly AdaptationMethod[] = ['cat16', 'bradford'];

describe('adaptation', () => {
  for (const method of METHODS) {
    describe(method, () => {
      it('round-trips D65 → D50 → D65', () => {
        for (const { rgb, stratum, index } of sampleSrgb(`adapt-${method}`, 4_000)) {
          const xyz = srgbToXyz(rgb);
          const there = adapt(xyz, D65, D50, method);
          const back = adapt(there, D50, D65, method);
          expect(maxAbsDiff(back, xyz), `sample ${String(index)} (${stratum})`).toBeLessThan(1e-14);
        }
      });

      it('maps the source white to the destination white', () => {
        expect(maxAbsDiff(adapt(D65, D65, D50, method), D50)).toBeLessThan(1e-15);
        expect(maxAbsDiff(adapt(D50, D50, D65, method), D65)).toBeLessThan(1e-15);
      });

      it('is linear — it fixes black and scales', () => {
        expect(adapt([0, 0, 0], D65, D50, method)).toEqual([0, 0, 0]);

        fc.assert(
          fc.property(
            fc.double({ min: 0, max: 1, noNaN: true }),
            fc.double({ min: 0.1, max: 3, noNaN: true }),
            (v, k) => {
              const xyz: Triple = [v, v * 1.1, v * 0.9];
              const scaled: Triple = [xyz[0] * k, xyz[1] * k, xyz[2] * k];
              const a = adapt(scaled, D65, D50, method);
              const b = adapt(xyz, D65, D50, method);
              expect(maxAbsDiff(a, [b[0] * k, b[1] * k, b[2] * k])).toBeLessThan(1e-14);
            },
          ),
          { numRuns: 2_000 },
        );
      });

      it('actually changes a colour — a no-op adaptation would pass every test above', () => {
        // The decoy for this whole file. Every property here (round trip, white mapping,
        // linearity, black fixed) is satisfied by returning the input unchanged. Without
        // this, an adaptation that did nothing would look fully verified.
        const xyz = srgbToXyz([0.8, 0.6, 0.3]);
        const adapted = adapt(xyz, D65, D50, method);
        expect(maxAbsDiff(adapted, xyz)).toBeGreaterThan(0.02);

        // And it changes it in the direction it should: D50 is warmer than D65, so the same
        // XYZ interpreted under D50 has less blue.
        expect(adapted[2]).toBeLessThan(xyz[2]);
      });
    });
  }

  it('the two methods agree for most colours and disagree by up to 8.6 ΔE76 on saturated blue', () => {
    // Measured, and larger than it sounds. Over 4000 stratified samples adapted D65 → D50:
    //
    //   median  0.15 ΔE76      — invisible
    //   max     8.57 ΔE76      — a different colour, at sRGB [0.087, 0.017, 0.993]
    //
    // The worst case is a saturated blue, which is where every cone-space transform diverges
    // and which is half this corpus: indigo, ai, kon. **The choice of adaptation transform is
    // therefore a product decision, not an implementation detail**, and it is why CAT16 is
    // named in one place (DEFAULT_ADAPTATION) rather than repeated at call sites.
    //
    // It is also the answer when a professional user's colorimeter software disagrees with
    // us by roughly this much on a blue: the first question is which transform each side
    // used, not which of us is broken.
    const deltas: number[] = [];
    let worst = 0;
    let worstRgb: Triple = [0, 0, 0];

    for (const { rgb } of sampleSrgb('cat16-vs-bradford', 4_000)) {
      const xyz = srgbToXyz(rgb);
      const a = xyzToLab(adapt(xyz, D65, D50, 'cat16'), D50);
      const b = xyzToLab(adapt(xyz, D65, D50, 'bradford'), D50);
      const delta = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      deltas.push(delta);
      if (delta > worst) {
        worst = delta;
        worstRgb = rgb;
      }
    }

    deltas.sort((x, y) => x - y);
    const median = deltas[Math.floor(deltas.length / 2)]!;

    expect(median).toBeGreaterThan(0.05);
    expect(median).toBeLessThan(1);
    expect(worst).toBeGreaterThan(5);
    expect(worst).toBeLessThan(12);

    // The worst case is blue-dominant. Asserted so a future change that moved the divergence
    // somewhere else is visible rather than absorbed by the bounds above.
    expect(worstRgb[2]).toBeGreaterThan(worstRgb[0]);
    expect(worstRgb[2]).toBeGreaterThan(worstRgb[1]);
  });

  it('the composed matrix and the direct call agree', () => {
    // adaptationMatrix exists so the corpus build (F-011) can compose once and apply many
    // times. If the two paths ever disagreed, entries built in bulk would differ from the
    // same entry converted on its own — invisibly, and only in bulk.
    const m = adaptationMatrix(D65, D50);
    for (const { rgb } of sampleSrgb('composed-vs-direct', 1_000)) {
      const xyz = srgbToXyz(rgb);
      const viaMatrix: Triple = [
        m[0] * xyz[0] + m[1] * xyz[1] + m[2] * xyz[2],
        m[3] * xyz[0] + m[4] * xyz[1] + m[5] * xyz[2],
        m[6] * xyz[0] + m[7] * xyz[1] + m[8] * xyz[2],
      ];
      expect(adapt(xyz, D65, D50)).toEqual(viaMatrix);
    }
  });

  it('defaults to CAT16', () => {
    const xyz = srgbToXyz([0.4, 0.7, 0.2]);
    expect(adapt(xyz, D65, D50)).toEqual(adapt(xyz, D65, D50, 'cat16'));
    expect(adapt(xyz, D65, D50)).not.toEqual(adapt(xyz, D65, D50, 'bradford'));
  });
});
