/**
 * The harmony engine.
 *
 * Two things here carry more weight than the rest:
 *
 * 1. **The OKLCh-versus-HSL measurement.** `color-engine.md` §9 asserts that rotating hue in HSL
 *    produces perceptually inconsistent steps, and this whole package is built on that. A claim
 *    the repository makes and never measures is the class of defect the last two features each
 *    shipped one of, so it is measured.
 * 2. **Hue relationships surviving gamut mapping.** Criterion 4 (map everything) and FR-6 (hold
 *    the relationship to a stated tolerance) pull against each other, and ADR-0045 is what
 *    resolves it. If that ever stopped being true, every generator would quietly return
 *    something other than the relationship it claims.
 *
 * No `node:*` anywhere: `packages/color-harmony` is in the colour-engine ESLint zone, whose
 * override has no `ignores` for tests. Everything is generated in-process from recorded seeds.
 */

import { deltaE00 } from '@irodora/color-difference';
import { isXyzInGamut, oklchToXyz, srgbToXyz, xyzToLab, type Lab } from '@irodora/color-spaces';
import { converter } from 'culori';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  COOL_HUE,
  generateHarmony,
  HARMONY_KINDS,
  HarmonyError,
  hueDistance,
  lightnessRamp,
  NEAR_NEUTRAL_CHROMA,
  rotateHue,
  VARIES,
  WARM_HUE,
  wrapHue,
  type Oklch,
} from '../src/index.js';

/** In-gamut-ish OKLCh sources, plus deliberately out-of-gamut chroma. */
const sourceArb = fc
  .tuple(
    fc.double({ min: 0.15, max: 0.9, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0, max: 0.37, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0, max: 359.999, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([l, c, h]) => [l, c, h] as Oklch);

describe('the twelve relationships FR-6 requires', () => {
  it('are all present, and `editorial` is not among them', () => {
    // The stub listed nine and carried `editorial` as a KIND, which conflates the two axes: an
    // editorial harmony still stands in some relationship. Family and kind are separate.
    expect([...HARMONY_KINDS].sort()).toEqual(
      [
        'analogous',
        'chroma-contrast',
        'complementary',
        'monochromatic',
        'near-neutral',
        'neutral',
        'split',
        'tetradic',
        'tonal',
        'triadic',
        'value-contrast',
        'warm-cool',
      ].sort(),
    );
    expect(HARMONY_KINDS).not.toContain('editorial');
    expect(HARMONY_KINDS).toHaveLength(12);
  });

  it('each generates at least two colours', () => {
    for (const kind of HARMONY_KINDS)
      expect(generateHarmony([0.6, 0.12, 250], kind).colors.length).toBeGreaterThanOrEqual(2);
  });

  it('is always geometric with no provenance', () => {
    // Criterion 3: the two families are kept distinct. A geometric harmony carrying attribution
    // would be claiming a curated source it does not have.
    for (const kind of HARMONY_KINDS) {
      const harmony = generateHarmony([0.6, 0.12, 250], kind);
      expect(harmony.family).toBe('geometric');
      expect(harmony.provenance).toBeNull();
    }
  });
});

describe('criterion 4 — every generated colour is in gamut', () => {
  it('holds for every kind, including deliberately out-of-gamut sources', () => {
    fc.assert(
      fc.property(sourceArb, (source) => {
        for (const kind of HARMONY_KINDS)
          for (const colour of generateHarmony(source, kind).colors)
            expect(isXyzInGamut(colour.xyz, 'srgb')).toBe(true);
      }),
      { numRuns: 300, seed: 20261001 },
    );
  });

  it('reports what mapping cost rather than hiding it', () => {
    // A very high chroma source: most of this harmony cannot be shown as asked.
    const harmony = generateHarmony([0.7, 0.35, 30], 'triadic');
    const mapped = harmony.colors.filter((c) => c.wasGamutMapped);
    expect(mapped.length).toBeGreaterThan(0);
    for (const colour of mapped) {
      expect(colour.gamutDeltaE00).toBeGreaterThan(0);
      // `requested` is kept, so a caller can say by how much rather than just "less vivid".
      expect(colour.requested[1]).toBeGreaterThan(colour.oklch[1] - 1e-9);
    }
  });

  it('reports zero cost when nothing moved', () => {
    for (const colour of generateHarmony([0.6, 0.03, 250], 'complementary').colors)
      if (!colour.wasGamutMapped) expect(colour.gamutDeltaE00).toBe(0);
  });
});

describe('hue relationships survive gamut mapping — the ADR-0045 consequence', () => {
  it('a complementary pair is still 180 degrees apart after both ends are mapped', () => {
    // If this failed, every hue-based generator would silently return something other than the
    // relationship it claims. Measured, not assumed.
    let worst = 0;
    fc.assert(
      fc.property(sourceArb, (source) => {
        const [a, b] = generateHarmony(source, 'complementary').colors;
        if (a === undefined || b === undefined) return;
        // Achromatic results have no meaningful hue, so they are excluded rather than fudged.
        if (a.oklch[1] < 1e-4 || b.oklch[1] < 1e-4) return;
        worst = Math.max(worst, Math.abs(hueDistance(a.oklch[2], b.oklch[2]) - 180));
      }),
      { numRuns: 500, seed: 20261002 },
    );
    console.log(`  complementary hue error after mapping: worst ${worst.toExponential(2)} deg`);
    expect(worst).toBeLessThan(0.5);
  });

  it('a triad stays 120 degrees apart after mapping', () => {
    let worst = 0;
    fc.assert(
      fc.property(sourceArb, (source) => {
        const colors = generateHarmony(source, 'triadic').colors;
        if (colors.some((c) => c.oklch[1] < 1e-4)) return;
        const [a, b, c] = colors;
        if (a === undefined || b === undefined || c === undefined) return;
        worst = Math.max(
          worst,
          Math.abs(hueDistance(a.oklch[2], b.oklch[2]) - 120),
          Math.abs(hueDistance(b.oklch[2], c.oklch[2]) - 120),
        );
      }),
      { numRuns: 500, seed: 20261003 },
    );
    console.log(`  triadic hue error after mapping: worst ${worst.toExponential(2)} deg`);
    expect(worst).toBeLessThan(0.5);
  });
});

describe('what each kind is allowed to vary', () => {
  it('monochromatic holds hue and chroma; tonal holds hue only', () => {
    // The distinction most often collapsed. Asserted on the REQUESTED values, because gamut
    // mapping is free to reduce chroma afterwards and that is a separate claim.
    const source: Oklch = [0.5, 0.1, 200];
    for (const colour of generateHarmony(source, 'monochromatic').colors) {
      expect(colour.requested[1]).toBeCloseTo(0.1, 12);
      expect(colour.requested[2]).toBeCloseTo(200, 12);
    }
    const tonal = generateHarmony(source, 'tonal').colors;
    for (const colour of tonal) expect(colour.requested[2]).toBeCloseTo(200, 12);
    expect(new Set(tonal.map((c) => c.requested[1])).size).toBeGreaterThan(1);
    expect(VARIES.monochromatic).toEqual(['l']);
    expect(VARIES.tonal).toEqual(['l', 'c']);
  });

  it('neutral reaches exactly zero chroma; near-neutral stays under its ceiling', () => {
    const [neutral] = generateHarmony([0.5, 0.2, 100], 'neutral').colors;
    expect(neutral?.requested[1]).toBe(0);

    const [near] = generateHarmony([0.5, 0.2, 100], 'near-neutral').colors;
    expect(near?.requested[1]).toBeLessThanOrEqual(NEAR_NEUTRAL_CHROMA);
  });

  it('warm-cool points at the stated anchors, not at something invented per call', () => {
    const colors = generateHarmony([0.6, 0.1, 300], 'warm-cool').colors;
    expect(colors[1]?.requested[2]).toBe(WARM_HUE);
    expect(colors[2]?.requested[2]).toBe(COOL_HUE);
  });

  it('chroma-contrast varies chroma and holds hue', () => {
    const colors = generateHarmony([0.6, 0.1, 300], 'chroma-contrast').colors;
    for (const colour of colors) expect(colour.requested[2]).toBeCloseTo(300, 12);
    expect(colors[0]?.requested[1]).toBeLessThan(colors[2]?.requested[1] ?? 0);
  });
});

describe('hue arithmetic', () => {
  it('wraps rather than running past 360', () => {
    expect(wrapHue(380)).toBeCloseTo(20, 12);
    expect(wrapHue(-30)).toBeCloseTo(330, 12);
    expect(rotateHue([0.5, 0.1, 350], 30)[2]).toBeCloseTo(20, 12);
  });

  it('is an involution for complementary', () => {
    fc.assert(
      fc.property(sourceArb, (source) => {
        expect(wrapHue(rotateHue(rotateHue(source, 180), 180)[2])).toBeCloseTo(
          wrapHue(source[2]),
          9,
        );
      }),
      { numRuns: 500, seed: 20261004 },
    );
  });

  it('the decoy — arithmetic without wrapping produces a hue that is not a hue', () => {
    // What the code would do if `wrapHue` were dropped. Without this, the wrap tests could be
    // passing because nothing ever exceeds 360 in the fixtures.
    expect(350 + 30).toBe(380);
    expect(wrapHue(350 + 30)).not.toBe(380);
  });

  it('rejects a non-finite angle rather than propagating NaN into a colour', () => {
    expect(() => wrapHue(Number.NaN)).toThrow(HarmonyError);
  });
});

describe('OKLCh is not HSL, and here is the measurement that says so', () => {
  it('a 30 degree HSL rotation is a wildly inconsistent perceptual step', () => {
    // `color-engine.md` section 9 asserts this; the whole package rests on it. Measured over
    // the hue circle at fixed HSL saturation and lightness: how far, in ΔE00, does a 30 degree
    // HSL rotation actually move the colour?
    const toRgb = converter('rgb');
    const toLab = (h: number): Lab => {
      // culori's rgb converter is total for an hsl input, so no undefined check: the types say
      // so, and a defensive branch the types prove unreachable is dead code pretending to be care.
      const rgb = toRgb({ mode: 'hsl', h, s: 0.7, l: 0.5 });
      return xyzToLab(srgbToXyz([rgb.r, rgb.g, rgb.b]));
    };

    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (let h = 0; h < 360; h += 5) {
      const step = deltaE00(toLab(h), toLab((h + 30) % 360));
      min = Math.min(min, step);
      max = Math.max(max, step);
    }

    console.log(
      `  HSL 30deg rotation: ΔE00 ranges ${min.toFixed(1)} to ${max.toFixed(1)} ` +
        `(ratio ${(max / min).toFixed(1)}x)`,
    );

    // The claim is INCONSISTENCY, so the assertion is on the spread rather than on either end.
    // A ratio near 1 would mean HSL was perceptually uniform and this package's premise wrong.
    expect(max / min).toBeGreaterThan(2);
  });

  it('the same rotation in OKLCh is far more consistent', () => {
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (let h = 0; h < 360; h += 5) {
      const a = xyzToLab(oklchToXyz([0.6, 0.1, h]));
      const b = xyzToLab(oklchToXyz([0.6, 0.1, (h + 30) % 360]));
      const step = deltaE00(a, b);
      min = Math.min(min, step);
      max = Math.max(max, step);
    }
    console.log(
      `  OKLCh 30deg rotation: ΔE00 ranges ${min.toFixed(1)} to ${max.toFixed(1)} ` +
        `(ratio ${(max / min).toFixed(1)}x)`,
    );
    // Not asserted as perfect — OKLab is not claimed to be ΔE00-uniform, and pretending it were
    // would be its own over-claim. Asserted as BETTER than HSL, which is the actual design claim.
    expect(max / min).toBeLessThan(2);
  });
});

describe('input validation', () => {
  it('rejects an out-of-range lightness or negative chroma', () => {
    for (const bad of [
      [-0.1, 0.1, 0],
      [1.1, 0.1, 0],
      [0.5, -0.1, 0],
    ] as Oklch[])
      expect(() => generateHarmony(bad, 'complementary')).toThrow(HarmonyError);
  });

  it('rejects a spread that would collapse a split onto the complement', () => {
    expect(() => generateHarmony([0.5, 0.1, 0], 'split', { spread: 180 })).toThrow(
      /collapses onto the complement/u,
    );
    expect(() => generateHarmony([0.5, 0.1, 0], 'split', { spread: 0 })).toThrow(HarmonyError);
  });

  it('rejects a non-positive step count', () => {
    expect(() => generateHarmony([0.5, 0.1, 0], 'monochromatic', { steps: 0 })).toThrow(
      HarmonyError,
    );
  });
});

describe('ramps', () => {
  it('includes both endpoints and steps evenly between them', () => {
    // Asserted per element rather than as an exact array: `0.2 + 0.6*1/4` is
    // 0.35000000000000003, and pinning that bit pattern would be testing float arithmetic
    // rather than the ramp. The endpoints are the claim, and they must be exact.
    const ramp = lightnessRamp(5, 0.2, 0.8);
    expect(ramp).toHaveLength(5);
    expect(ramp[0]).toBe(0.2);
    expect(ramp[4]).toBe(0.8);
    for (const [i, step] of ramp.entries()) expect(step).toBeCloseTo(0.2 + 0.15 * i, 12);
  });

  it('returns the midpoint for a single step, which is the only non-arbitrary answer', () => {
    expect(lightnessRamp(1, 0.2, 0.8)).toEqual([0.5]);
  });
});

describe('determinism', () => {
  it('two runs over the same input produce identical output', () => {
    for (const kind of HARMONY_KINDS) {
      const source: Oklch = [0.55, 0.14, 137];
      expect(generateHarmony(source, kind)).toEqual(generateHarmony(source, kind));
    }
  });
});
