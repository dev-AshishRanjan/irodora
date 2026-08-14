/**
 * Independent oracles — `culori` and `colorjs.io`, dev-only, never shipped (ADR-0004).
 *
 * These are the check the golden sets cannot be: they compare every conversion against two
 * separately-written implementations over 10 000 colours, which covers the band a published
 * table quoted to three decimals is blind to (see `test/golden/oklab.test.ts`).
 *
 * **A disagreement is a finding, not automatically our bug.** One of the four results below
 * is a disagreement, it is ours, it is deliberate, and it is measured rather than tolerated.
 */

import { describe, expect, it } from 'vitest';
import { converter, differenceCiede2000 } from 'culori';
import Color from 'colorjs.io';
import { sampleSrgb } from '@irodora/testing';
import {
  oklabToXyz,
  srgbToLinearSrgb,
  srgbToXyz,
  xyzToDisplayP3,
  xyzToLab,
  xyzToOklab,
  type Triple,
} from '../src/index.js';

const toCuloriXyz = converter('xyz65');
const toCuloriLab = converter('lab65');
const toCuloriOklab = converter('oklab');
const toCuloriP3 = converter('p3');

const SAMPLES = sampleSrgb('oracle-cross-validation', 10_000);

const rawDeltaE00 = differenceCiede2000();

/** ΔE00 between two D65 Lab triples. `lab65`, never `lab` — see `test/round-trip.test.ts`. */
const deltaE00 = (a: Triple, b: Triple): number =>
  rawDeltaE00(
    { mode: 'lab65', l: a[0], a: a[1], b: a[2] },
    { mode: 'lab65', l: b[0], a: b[1], b: b[2] },
  );

const maxAbsDiff = (a: Triple, b: Triple): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

const worstOver = (compare: (rgb: Triple) => number): { worst: number; at: Triple } => {
  let worst = 0;
  let at: Triple = [0, 0, 0];
  for (const { rgb } of SAMPLES) {
    const delta = compare(rgb);
    if (delta > worst) {
      worst = delta;
      at = rgb;
    }
  }
  return { worst, at };
};

describe('colorjs.io agrees bitwise', () => {
  // Not "within a tolerance" — identical. colorjs.io carries the same CSS Color 4 matrices at
  // the same precision and composes them in the same order, so any difference at all would be
  // a difference in the maths rather than in the rounding. Asserting 0 rather than 1e-15 is
  // what makes this test able to detect a change of one bit.
  it('XYZ (D65)', () => {
    const { worst, at } = worstOver((rgb) =>
      maxAbsDiff(srgbToXyz(rgb), new Color('srgb', [...rgb]).to('xyz-d65').coords as Triple),
    );
    expect(worst, `worst at ${JSON.stringify(at)}`).toBe(0);
  });

  it('CIELAB (D65)', () => {
    const { worst, at } = worstOver((rgb) =>
      maxAbsDiff(
        xyzToLab(srgbToXyz(rgb)),
        new Color('srgb', [...rgb]).to('lab-d65').coords as Triple,
      ),
    );
    expect(worst, `worst at ${JSON.stringify(at)}`).toBe(0);
  });

  it('Display-P3', () => {
    const { worst, at } = worstOver((rgb) =>
      maxAbsDiff(
        xyzToDisplayP3(srgbToXyz(rgb)),
        new Color('srgb', [...rgb]).to('p3').coords as Triple,
      ),
    );
    expect(worst, `worst at ${JSON.stringify(at)}`).toBe(0);
  });

  it('linear sRGB', () => {
    const { worst, at } = worstOver((rgb) =>
      maxAbsDiff(
        srgbToLinearSrgb(rgb),
        new Color('srgb', [...rgb]).to('srgb-linear').coords as Triple,
      ),
    );
    expect(worst, `worst at ${JSON.stringify(at)}`).toBe(0);
  });
});

describe('culori agrees to float64 rounding', () => {
  // culori composes the same matrices in a different order, so it differs in the last bits
  // and not before them. The bounds are measured, and they are tight enough that a real
  // change would break them: 5.7e-14 in Lab is 5.7e-14 ΔE.
  it('XYZ (D65) — within 3e-16', () => {
    const { worst, at } = worstOver((rgb) => {
      const c = toCuloriXyz({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
      return maxAbsDiff(srgbToXyz(rgb), [c.x, c.y, c.z]);
    });
    expect(worst, `worst at ${JSON.stringify(at)}`).toBeLessThan(3e-16);
  });

  it('CIELAB (D65) — within 1e-13', () => {
    const { worst, at } = worstOver((rgb) => {
      const c = toCuloriLab({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
      return maxAbsDiff(xyzToLab(srgbToXyz(rgb)), [c.l, c.a, c.b]);
    });
    expect(worst, `worst at ${JSON.stringify(at)}`).toBeLessThan(1e-13);
  });

  it('Display-P3 — within 3e-15', () => {
    const { worst, at } = worstOver((rgb) => {
      const c = toCuloriP3({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
      return maxAbsDiff(xyzToDisplayP3(srgbToXyz(rgb)), [c.r, c.g, c.b]);
    });
    expect(worst, `worst at ${JSON.stringify(at)}`).toBeLessThan(3e-15);
  });
});

describe('OKLab — and the disagreement that used to be here', () => {
  /**
   * This block once asserted a 1.24e-4 disagreement with both oracles, attributed to a path
   * difference: we compose XYZ → LMS → OKLab, and the theory was that both libraries use
   * Ottosson's direct linear-sRGB matrix.
   *
   * **The theory was wrong and the assertion was measuring our own defect.** `colorjs.io`
   * goes through XYZ exactly as we do (`base: XYZ_D65`). The real cause was that we carried
   * Ottosson's original ten-decimal matrices while both oracles carry CSS Color 4's
   * recalculation of the same transform for a consistent reference white. Adopting the
   * recalculated constants (ADR-0040) removed the disagreement entirely.
   *
   * Kept as a named block rather than deleted, because "the oracles disagree with us by a
   * consistent amount, so it must be structural" is a comfortable conclusion that was
   * available here and was false.
   */
  it('is bitwise identical to colorjs.io', () => {
    const { worst, at } = worstOver((rgb) =>
      maxAbsDiff(
        xyzToOklab(srgbToXyz(rgb)),
        new Color('srgb', [...rgb]).to('oklab').coords as Triple,
      ),
    );
    expect(worst, `worst at ${JSON.stringify(at)}`).toBe(0);
  });

  it('agrees with culori to float64 rounding, despite culori taking the direct path', () => {
    // culori composes linear-sRGB → LMS in one matrix rather than going through XYZ. That the
    // two compositions agree to 1e-15 is the evidence that the path genuinely does not matter
    // — which is what the earlier version of this file asserted the opposite of.
    const { worst, at } = worstOver((rgb) => {
      const c = toCuloriOklab({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
      return maxAbsDiff(xyzToOklab(srgbToXyz(rgb)), [c.l, c.a, c.b]);
    });
    expect(worst, `worst at ${JSON.stringify(at)}`).toBeLessThan(1e-14);
  });

  it('and the perceptual difference is zero, not merely small', () => {
    let worst = 0;
    for (const { rgb } of SAMPLES) {
      const c = toCuloriOklab({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
      const ours = xyzToLab(oklabToXyz(xyzToOklab(srgbToXyz(rgb))));
      const theirs = xyzToLab(oklabToXyz([c.l, c.a, c.b]));
      worst = Math.max(worst, deltaE00(ours, theirs));
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it('D65 white is exactly neutral, which is what the recalculation was for', () => {
    // With Ottosson's original constants this was chroma 1.25e-4 — a neutral that is very
    // slightly not neutral, at the top of the lightness range. It was documented as an
    // inherent property of OKLab. It was not; it was the matrices.
    const white = xyzToOklab([0.9504559270516716, 1, 1.0890577507598784]);
    expect(Math.hypot(white[1], white[2])).toBeLessThan(1e-15);
    expect(white[0]).toBeCloseTo(1, 15);
  });
});

describe('the oracles are actually being consulted', () => {
  it('a deliberately wrong value disagrees with both', () => {
    // The decoy for this whole file. Every test above passes if the oracle calls silently
    // returned our own numbers — through a converter misconfiguration, a caching mistake, or
    // a mode tag that makes the conversion a no-op. Perturbing our input by 1% must show up.
    const rgb: Triple = [0.4, 0.6, 0.8];
    const wrong = srgbToXyz([rgb[0] * 1.01, rgb[1], rgb[2]]);
    const c = toCuloriXyz({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });

    expect(maxAbsDiff(wrong, [c.x, c.y, c.z])).toBeGreaterThan(1e-4);
    expect(
      maxAbsDiff(wrong, new Color('srgb', [...rgb]).to('xyz-d65').coords as Triple),
    ).toBeGreaterThan(1e-4);
  });
});
