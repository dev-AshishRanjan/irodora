/**
 * Acceptance criterion 5: property tests asserting ΔE symmetry and identity.
 *
 * Symmetry is asserted **where it holds and where it does not**, which is the only honest
 * reading of the criterion. ΔE76, ΔE00 and ΔEok are symmetric; ΔE94 is asymmetric by
 * specification, and asserting symmetry for it would either fail or be quietly deleted by
 * whoever met it next.
 *
 * WCAG contrast is symmetric. APCA deliberately is not.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  srgbToXyz,
  xyzToLab,
  xyzToOklab,
  type Lab,
  type OkLab,
  type Rgb,
} from '@irodora/color-spaces';
import {
  apcaLc,
  deltaE00,
  deltaE76,
  deltaE94,
  deltaEok,
  DELTAE94_TEXTILES,
  wcagContrast,
} from '../src/index.js';

const labArb = (): fc.Arbitrary<Lab> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 100, noNaN: true }),
      fc.double({ min: -128, max: 128, noNaN: true }),
      fc.double({ min: -128, max: 128, noNaN: true }),
    )
    .map(([l, a, b]) => [l, a, b] as Lab);

const oklabArb = (): fc.Arbitrary<OkLab> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: -0.4, max: 0.4, noNaN: true }),
      fc.double({ min: -0.4, max: 0.4, noNaN: true }),
    )
    .map(([l, a, b]) => [l, a, b] as OkLab);

const rgbArb = (): fc.Arbitrary<Rgb> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    )
    .map(([r, g, b]) => [r, g, b] as Rgb);

describe('identity — every metric is exactly 0 for a colour against itself', () => {
  it('ΔE76', () => {
    fc.assert(
      fc.property(labArb(), (c) => {
        expect(deltaE76(c, c)).toBe(0);
      }),
      { numRuns: 3_000 },
    );
  });

  it('ΔE94, in both weightings', () => {
    fc.assert(
      fc.property(labArb(), (c) => {
        expect(deltaE94(c, c)).toBe(0);
        expect(deltaE94(c, c, DELTAE94_TEXTILES)).toBe(0);
      }),
      { numRuns: 3_000 },
    );
  });

  it('ΔE00 — exactly 0, not merely small', () => {
    // The one worth being strict about. ΔE00's compensation terms involve differences of
    // nearly-equal quantities, and an implementation that returned 1e-16 here would rank a
    // colour as marginally different from itself — which surfaces as an item being its own
    // nearest neighbour but not its own exact match.
    fc.assert(
      fc.property(labArb(), (c) => {
        expect(deltaE00(c, c)).toBe(0);
      }),
      { numRuns: 5_000 },
    );
  });

  it('ΔEok', () => {
    fc.assert(
      fc.property(oklabArb(), (c) => {
        expect(deltaEok(c, c)).toBe(0);
      }),
      { numRuns: 3_000 },
    );
  });

  it('and the whole stratified sample, through the real conversion path', () => {
    for (const { rgb, stratum, index } of sampleSrgb('difference-identity', 10_000)) {
      const lab = xyzToLab(srgbToXyz(rgb));
      const oklab = xyzToOklab(srgbToXyz(rgb));
      const where = `sample ${String(index)} (${stratum})`;
      expect(deltaE00(lab, lab), where).toBe(0);
      expect(deltaE76(lab, lab), where).toBe(0);
      expect(deltaE94(lab, lab), where).toBe(0);
      expect(deltaEok(oklab, oklab), where).toBe(0);
    }
  });
});

describe('symmetry — where it holds', () => {
  it('ΔE76 is symmetric, bitwise', () => {
    fc.assert(
      fc.property(labArb(), labArb(), (a, b) => {
        expect(deltaE76(a, b)).toBe(deltaE76(b, a));
      }),
      { numRuns: 5_000 },
    );
  });

  it('ΔE00 is symmetric, bitwise', () => {
    // Bitwise, not "within 1e-12". CIEDE2000 is symmetric by construction — every term is
    // either a squared difference or is computed from the mean — and an implementation that
    // was only nearly symmetric would rank A-then-B differently from B-then-A, which is a
    // defect that surfaces as an unstable sort.
    fc.assert(
      fc.property(labArb(), labArb(), (a, b) => {
        expect(deltaE00(a, b)).toBe(deltaE00(b, a));
      }),
      { numRuns: 5_000 },
    );
  });

  it('ΔEok is symmetric, bitwise', () => {
    fc.assert(
      fc.property(oklabArb(), oklabArb(), (a, b) => {
        expect(deltaEok(a, b)).toBe(deltaEok(b, a));
      }),
      { numRuns: 5_000 },
    );
  });

  it('WCAG contrast is symmetric, bitwise', () => {
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        expect(wcagContrast(a, b)).toBe(wcagContrast(b, a));
      }),
      { numRuns: 5_000 },
    );
  });
});

describe('symmetry — where it does not hold, and must not be asserted', () => {
  it('ΔE94 is asymmetric for chromatic pairs', () => {
    // Sc and Sh come from the reference colour. Asserting symmetry here would fail; asserting
    // it "within a tolerance" would be worse, because it would pass for neutrals and hide the
    // specification from whoever read the test.
    let asymmetric = 0;
    for (const { rgb } of sampleSrgb('de94-asymmetry-a', 500)) {
      const a = xyzToLab(srgbToXyz(rgb));
      const b: Lab = [a[0] + 5, a[1] + 8, a[2] - 6];
      if (deltaE94(a, b) !== deltaE94(b, a)) asymmetric++;
    }
    expect(asymmetric).toBeGreaterThan(400);
  });

  it('ΔE94 IS symmetric for a pair with equal chroma, which is why the asymmetry hides', () => {
    // Sc and Sh depend only on C1. Two colours with the same chroma give the same weights
    // either way round — so a test suite built from greys would find ΔE94 symmetric.
    const a: Lab = [40, 3, 4];
    const b: Lab = [60, -4, -3];
    expect(Math.hypot(a[1], a[2])).toBeCloseTo(Math.hypot(b[1], b[2]), 12);
    expect(deltaE94(a, b)).toBeCloseTo(deltaE94(b, a), 12);
  });

  it('APCA is asymmetric, by design', () => {
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        fc.pre(Math.abs(apcaLc(a, b)) > 1);
        expect(apcaLc(a, b)).not.toBe(-apcaLc(b, a));
      }),
      { numRuns: 2_000 },
    );
  });
});

describe('bounds', () => {
  it('every ΔE metric is non-negative and finite', () => {
    fc.assert(
      fc.property(labArb(), labArb(), (a, b) => {
        for (const value of [deltaE76(a, b), deltaE94(a, b), deltaE00(a, b)]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(value)).toBe(true);
        }
      }),
      { numRuns: 5_000 },
    );
  });

  it('ΔE00 never returns NaN, including for the chroma-zero cases', () => {
    // The guarded branches: when C1'·C2' is 0 the hue difference and mean hue take different
    // rules, and an unguarded implementation divides by zero or takes atan2(0,0) somewhere it
    // did not expect. Neutrals are half this corpus.
    const neutrals: Lab[] = [
      [0, 0, 0],
      [50, 0, 0],
      [100, 0, 0],
      [50, 0, 0],
    ];
    for (const a of neutrals)
      for (const b of neutrals) expect(Number.isFinite(deltaE00(a, b))).toBe(true);

    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), labArb(), (l, other) => {
        expect(Number.isFinite(deltaE00([l, 0, 0], other))).toBe(true);
        expect(Number.isFinite(deltaE00(other, [l, 0, 0]))).toBe(true);
      }),
      { numRuns: 3_000 },
    );
  });

  it('WCAG contrast stays in [1, 21] for in-gamut input', () => {
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        const ratio = wcagContrast(a, b);
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21);
      }),
      { numRuns: 5_000 },
    );
  });

  it('APCA Lc stays within [-108, 107] for in-gamut input', () => {
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        const lc = apcaLc(a, b);
        expect(lc).toBeGreaterThan(-108);
        expect(lc).toBeLessThan(107);
      }),
      { numRuns: 5_000 },
    );
  });
});

describe('ΔE00 across the ±180° hue boundary', () => {
  it('is continuous — a colour either side of the boundary is close to one on it', () => {
    // The discontinuity is the classic CIEDE2000 defect. An implementation with a naive hue
    // difference produces a jump here, and nowhere else.
    const lightness = 50;
    const chroma = 30;

    let worstJump = 0;
    for (let i = 0; i < 720; i++) {
      const h1 = (i / 2) % 360;
      const h2 = (h1 + 0.5) % 360;
      const toLab = (h: number): Lab => [
        lightness,
        chroma * Math.cos((h * Math.PI) / 180),
        chroma * Math.sin((h * Math.PI) / 180),
      ];
      worstJump = Math.max(worstJump, deltaE00(toLab(h1), toLab(h2)));
    }

    // Half a degree of hue at chroma 30 is a small perceptual step everywhere on the wheel.
    // A wrap defect makes one of these steps enormous.
    expect(worstJump).toBeLessThan(0.5);
  });

  it('and a naive hue difference WOULD jump there, so the test above is not vacuous', () => {
    const naive = (h1: number, h2: number): number => h2 - h1;
    expect(Math.abs(naive(359.75, 0.25))).toBeGreaterThan(359);
  });
});
