/**
 * Gate 10 (`cvd`) — the separation guarantee.
 *
 * Split from gate 5 deliberately. Gate 5 asks *"do the models reproduce their published
 * values"*; this gate asks *"does a pairing this product would recommend stay
 * distinguishable"*. The second is the accessibility promise (NFR-10), and it must be able to
 * go red on its own rather than as one line inside a run of everything.
 *
 * **The separation weights are not calibrated** and nothing here should be read as a tuned
 * threshold. F-029 moves them into versioned content. What this gate asserts is the *shape* of
 * the function — bounds, symmetry, the direction it moves in, and the false negative it exists
 * to avoid.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import {
  separationDetail,
  separationScore,
  SEPARATION_DELTA_E_CEILING,
  SEPARATION_LIGHTNESS_CEILING,
  SEPARATION_LIGHTNESS_WEIGHT,
  type Deficiency,
} from '../../src/index.js';
import type { Rgb } from '@irodora/color-spaces';

const DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

const rgbArb = (): fc.Arbitrary<Rgb> =>
  fc
    .tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    )
    .map(([r, g, b]) => [r, g, b] as Rgb);

describe('bounds and shape', () => {
  it('is always within [0, 100]', () => {
    fc.assert(
      fc.property(
        rgbArb(),
        rgbArb(),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (a, b, severity) => {
          for (const deficiency of DEFICIENCIES) {
            const score = separationScore(a, b, deficiency, severity);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(Number.isFinite(score)).toBe(true);
          }
        },
      ),
      { numRuns: 2_000, seed: 20260869 },
    );
  });

  it('is exactly 0 for a colour against itself, at every severity', () => {
    for (const { rgb } of sampleSrgb('separation-identity', 2_000))
      for (const deficiency of DEFICIENCIES)
        for (const severity of [0, 0.35, 0.7, 1])
          expect(separationScore(rgb, rgb, deficiency, severity)).toBe(0);
  });

  it('is symmetric — neither ΔE00 nor an absolute lightness difference is directional', () => {
    fc.assert(
      fc.property(rgbArb(), rgbArb(), (a, b) => {
        for (const deficiency of DEFICIENCIES)
          expect(separationScore(a, b, deficiency, 1)).toBe(separationScore(b, a, deficiency, 1));
      }),
      { numRuns: 2_000, seed: 20260870 },
    );
  });

  it('clamps severity rather than throwing mid-scoring', () => {
    const a: Rgb = [0.8, 0.3, 0.2];
    const b: Rgb = [0.2, 0.6, 0.4];
    expect(separationScore(a, b, 'deutan', 1.7)).toBe(separationScore(a, b, 'deutan', 1));
    expect(separationScore(a, b, 'deutan', -0.4)).toBe(separationScore(a, b, 'deutan', 0));
  });
});

describe('the guarantee: severity 0 is no deficiency', () => {
  it('separation at severity 0 is the unsimulated separation', () => {
    // If this drifted, every "compare with and without CVD" surface in the product would be
    // comparing two simulations.
    for (const { rgb } of sampleSrgb('separation-severity-zero', 500)) {
      const other: Rgb = [1 - rgb[0], rgb[1], 1 - rgb[2]];
      const scores = DEFICIENCIES.map((d) => separationScore(rgb, other, d, 0));
      expect(new Set(scores.map((s) => s.toFixed(12))).size).toBe(1);
    }
  });
});

describe('the false negative this formula exists to avoid', () => {
  it('a hue-confusable but value-separable pair still scores as usable', () => {
    // A navy and a dark green are a classic deutan confusion pair by hue. They are obviously
    // different by lightness, and telling someone that outfit fails would teach them to
    // distrust the tool.
    const navy: Rgb = [0.08, 0.1, 0.32];
    const paleOlive: Rgb = [0.72, 0.74, 0.45];

    const detail = separationDetail(navy, paleOlive, 'deutan', 1);

    expect(detail.lightnessDifference).toBeGreaterThan(30);
    expect(detail.score).toBeGreaterThan(50);
  });

  it('and a score ignoring lightness rates a lightness-carried pair 14 points lower', () => {
    // The decoy for the whole design, and it took two attempts to write correctly.
    //
    // The first version used the navy/pale-olive pair above — where BOTH terms saturate, so
    // removing the lightness term changed nothing and the "decoy" proved the term was
    // decoration. Deleting the term entirely and re-running this gate passed, which is how it
    // was found. [[a-decoy-that-is-not-broken-proves-nothing]]
    //
    // The term binds only when `lightnessTerm > differenceTerm`, which happens in roughly 9%
    // of sampled pairs — ΔE00 already contains the lightness difference, so the two are
    // strongly correlated. This pair is the one where the gap is widest.
    const dark: Rgb = [0.0091, 0.0225, 0.0224];
    const mid: Rgb = [0.2374, 0.1835, 0.2028];
    const detail = separationDetail(dark, mid, 'deutan', 1);

    const withoutLightness = Math.min(1, detail.deltaE00 / SEPARATION_DELTA_E_CEILING) * 100;

    expect(detail.lightnessDifference).toBeGreaterThan(detail.deltaE00);
    expect(detail.score).toBeGreaterThan(withoutLightness + 10);
    expect(SEPARATION_LIGHTNESS_WEIGHT).toBeGreaterThan(0);
  });

  it('the lightness term binds for a real fraction of pairs, not a contrived one', () => {
    // Otherwise the test above is a single hand-picked case and the term is still effectively
    // decoration. Measured rather than asserted: ~9% of sampled adjacent pairs.
    let binds = 0;
    let total = 0;
    const samples = sampleSrgb('separation-lightness-binds', 2_000);

    for (let i = 0; i < samples.length - 1; i++) {
      const detail = separationDetail(samples[i]!.rgb, samples[i + 1]!.rgb, 'deutan', 1);
      const differenceTerm = Math.min(1, detail.deltaE00 / SEPARATION_DELTA_E_CEILING);
      const lightnessTerm = Math.min(1, detail.lightnessDifference / SEPARATION_LIGHTNESS_CEILING);
      total++;
      if (lightnessTerm > differenceTerm) binds++;
    }

    expect(binds / total).toBeGreaterThan(0.03);
  });

  it('a genuinely confusable pair scores low — the term does not rescue everything', () => {
    // The counterweight. If the lightness term made every pair pass, it would be hiding the
    // failures it was added to avoid mis-reporting.
    const a: Rgb = [0.55, 0.42, 0.3];
    const b: Rgb = [0.48, 0.45, 0.3];
    const detail = separationDetail(a, b, 'deutan', 1);

    expect(detail.lightnessDifference).toBeLessThan(5);
    expect(detail.score).toBeLessThan(35);
  });
});

describe('severity moves the score in the direction it should', () => {
  it('a red-green pair separates less as deutan severity rises', () => {
    const red: Rgb = [0.75, 0.2, 0.2];
    const green: Rgb = [0.2, 0.65, 0.25];

    const scores = [0, 0.25, 0.5, 0.75, 1].map((s) => separationScore(red, green, 'deutan', s));

    expect(scores[0]!).toBeGreaterThan(scores[4]!);
    for (let i = 1; i < scores.length; i++) expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
  });

  it('and a light/dark neutral pair is barely affected by it', () => {
    // Value contrast survives CVD. This is the product-relevant half of the model.
    const dark: Rgb = [0.12, 0.12, 0.12];
    const light: Rgb = [0.82, 0.82, 0.82];

    const at0 = separationScore(dark, light, 'deutan', 0);
    const at1 = separationScore(dark, light, 'deutan', 1);

    expect(Math.abs(at1 - at0)).toBeLessThan(1);
  });
});

describe('the detail explains the score', () => {
  it('returns the parts it was computed from', () => {
    const detail = separationDetail([0.8, 0.3, 0.2], [0.2, 0.6, 0.4], 'protan', 0.6);
    expect(detail.deficiency).toBe('protan');
    expect(detail.severity).toBe(0.6);
    expect(detail.deltaE00).toBeGreaterThan(0);
    expect(detail.lightnessDifference).toBeGreaterThanOrEqual(0);
    expect(detail.score).toBe(separationScore([0.8, 0.3, 0.2], [0.2, 0.6, 0.4], 'protan', 0.6));
  });
});
