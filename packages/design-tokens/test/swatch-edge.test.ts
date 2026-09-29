/**
 * The one boundary in this product that no declared pairing can express.
 *
 * `swatch.well` sits beneath an **arbitrary garment colour**, so there is no second token to
 * name in a `pairsWith` — which is why both tokens carry an `uncheckedReason` rather than a
 * pairing. This file is what makes "unchecked" false: it scans the gamut instead.
 *
 * ## The decoy is the design that shipped
 *
 * A check that the new treatment passes proves nothing unless the old one demonstrably fails.
 * The single translucent hairline measured **1.00** at its worst case — a black sample on a
 * black line, which is not a weak edge but no edge at all — and this file asserts that.
 */

import { describe, expect, it } from 'vitest';
import { wcagContrast } from '@irodora/color-difference';
import { srgbToLinear } from '@irodora/color-spaces';
import { COLOR, onSample, paintedOver, THEMES } from '../src/index.js';
import { toHex } from '../src/derive.js';

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

const relLum = ([r, g, b]: readonly number[]): number =>
  0.2126 * srgbToLinear(r ?? 0) + 0.7152 * srgbToLinear(g ?? 0) + 0.0722 * srgbToLinear(b ?? 0);

const ratio = (a: readonly number[], b: readonly number[]): number => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

/** Composite a translucent line over a sample, in BOTH models. */
const composited = (
  over: readonly number[],
  alpha: number,
  base: readonly number[],
): readonly number[][] => [
  // Encoded: what React Native actually draws.
  base.map((c, i) => (over[i] ?? 0) * alpha + c * (1 - alpha)),
  // Linear: physically correct. Neither dominates, so the check takes the worse
  // [[a-gate-must-model-what-renders-not-what-is-physically-correct]].
  base.map((c, i) => {
    const l = srgbToLinear(over[i] ?? 0) * alpha + srgbToLinear(c) * (1 - alpha);
    return l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  }),
];

interface Edge {
  readonly rgb: readonly number[];
  readonly alpha: number;
}

/**
 * How well a treatment edges one sample: the best of its tones, where a translucent tone counts at
 * the WORSE of the two compositing models. (Until F-233 this took the better model, against its own
 * comment; no case the file carried turned on it, and `the worse model` below now pins it.)
 */
function edgeContrast(sample: readonly number[], edges: readonly Edge[]): number {
  // The edge is perceptible if ANY of its tones contrasts with the sample.
  let best = 0;
  for (const edge of edges) {
    const tone =
      edge.alpha >= 1
        ? ratio(sample, edge.rgb)
        : Math.min(...composited(edge.rgb, edge.alpha, sample).map((c) => ratio(sample, c)));
    best = Math.max(best, tone);
  }
  return best;
}

/**
 * The worst sample in the gamut, for a set of candidate edge treatments — fixed, or chosen per
 * sample.
 *
 * 0.05 steps — 9261 samples. Scanning only greys is where a single line looks best, and is
 * exactly the convenient subset that would have hidden this defect.
 */
function worstCase(edges: readonly Edge[] | ((sample: readonly number[]) => readonly Edge[])): {
  worst: number;
  at: readonly number[];
} {
  let worst = Infinity;
  let at: readonly number[] = [];
  for (let r = 0; r <= 1.001; r += 0.05)
    for (let g = 0; g <= 1.001; g += 0.05)
      for (let b = 0; b <= 1.001; b += 0.05) {
        // Each sample is an 8-bit colour, as every colour this product draws is: a line moved to
        // clear the floor by the smallest step clears it for the sample as drawn, not for a
        // colour between two codes.
        const sample = [r, g, b].map((c) => Math.round(Math.min(c, 1) * 255) / 255);
        const contrast = edgeContrast(sample, typeof edges === 'function' ? edges(sample) : edges);
        if (contrast < worst) {
          worst = contrast;
          at = sample;
        }
      }
  return { worst, at };
}

/** WCAG's floor for a graphical object or a UI component boundary. */
const NON_TEXT_FLOOR = 3;

describe('a sample of ANY colour keeps a perceptible edge', () => {
  it.each(THEMES)('%s: the two-tone keyline clears the non-text floor everywhere', (theme) => {
    const tone = hex(COLOR[theme]['swatch.hairline'].srgb);
    const inverse = hex(COLOR[theme]['swatch.hairline.inverse'].srgb);
    const { worst, at } = worstCase([
      { rgb: tone, alpha: 1 },
      { rgb: inverse, alpha: 1 },
    ]);
    // Computed over the gamut, not asserted at a convenient sample. The worst case is a
    // mid-tone, where neither a dark nor a light line has an easy job.
    expect(
      `${theme} worst ${worst.toFixed(2)} at ${at.map((n) => n.toFixed(2)).join(',')}`,
    ).toMatch(/worst [3-9]\./u);
    expect(worst).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    // The figure the manifest's role, the reticle (E-072) and the export card quote. It read 4.23
    // until F-233 pinned it: the tones had moved since F-068 measured them, and nothing held the
    // prose to the scan.
    expect(worst.toFixed(2)).toBe('4.16');
  });

  it.each(THEMES)('%s: the two tones differ from each other whatever is behind them', (theme) => {
    // The property that makes a keyline work at all: opaque tones do not depend on the
    // sample, so their mutual contrast is fixed.
    const tone = hex(COLOR[theme]['swatch.hairline'].srgb);
    const inverse = hex(COLOR[theme]['swatch.hairline.inverse'].srgb);
    expect(ratio(tone, inverse)).toBeGreaterThan(15);
  });

  it('THE DECOY: the single translucent hairline that shipped FAILS this check', () => {
    // rgba(0,0,0,0.14) — the light theme's previous treatment. Against a black sample it is
    // literally invisible, and a check the new design passes proves nothing unless the old
    // one demonstrably does not.
    const { worst, at } = worstCase([{ rgb: [0, 0, 0], alpha: 0.14 }]);
    expect(worst).toBeLessThan(NON_TEXT_FLOOR);
    expect(worst).toBeCloseTo(1, 2);
    expect(at.every((c) => c === 0)).toBe(true);
  });

  it('THE DECOY, dark theme: the white translucent hairline fails against white', () => {
    const { worst, at } = worstCase([{ rgb: [1, 1, 1], alpha: 0.16 }]);
    expect(worst).toBeCloseTo(1, 2);
    expect(at.every((c) => c >= 0.999)).toBe(true);
  });

  it('THE DECOY: two TRANSLUCENT tones do not rescue it either', () => {
    // Both halves composite over the SAME sample, so their difference compresses. This is why
    // the treatment is opaque rather than simply doubled.
    const { worst } = worstCase([
      { rgb: [0, 0, 0], alpha: 0.14 },
      { rgb: [1, 1, 1], alpha: 0.16 },
    ]);
    expect(worst).toBeLessThan(NON_TEXT_FLOOR);
  });

  it.each(['dark', 'light'] as const)(
    'F-225, %s: the README keyline ALONE fails this check — which is why F-233 moves it per sample',
    (theme) => {
      /*
       * F-225 declares `swatch.keyline` as the README draws it (#FFFFFF22 dark, #1A1B1E18 light).
       * Measured the way the two-tone keyline is measured, a single translucent line cannot keep an
       * edge against every sample — the same failure the decoys above record for the treatments
       * that shipped before. F-233 (ADR-0116) answers it below: the line is drawn where it is
       * needed, moved per sample.
       */
      const { oklch } = COLOR[theme]['swatch.keyline'];
      const rgb = theme === 'dark' ? [1, 1, 1] : hex('#1A1B1E');
      const { worst } = worstCase([{ rgb, alpha: oklch.alpha }]);
      expect(worst).toBeLessThan(NON_TEXT_FLOOR);
    },
  );

  it('judges a translucent line by the WORSE of the two compositing models', () => {
    // White at half opacity over black: blended in encoded sRGB it is #808080 (5.28:1); blended in
    // linear light it is Y 0.5 (11:1). The better model would report 11 and hide the weak edge.
    const edge = edgeContrast([0, 0, 0], [{ rgb: [1, 1, 1], alpha: 0.5 }]);
    expect(edge).toBeCloseTo(ratio([0, 0, 0], [0.5, 0.5, 0.5]), 6);
    expect(edge).toBeLessThan(6);
  });

  it.each(THEMES)(
    'F-233, %s: the README keyline over the well, moved per sample (ADR-0116), keeps the edge everywhere',
    (theme) => {
      const drawn = paintedOver(
        COLOR[theme]['swatch.keyline'].srgb,
        COLOR[theme]['swatch.well'].srgb,
      );
      const perSample = (sample: readonly number[]): readonly Edge[] => [
        {
          rgb: hex(
            onSample({
              candidates: [drawn],
              sampleHex: toHex(sample as [number, number, number]),
              floor: NON_TEXT_FLOOR,
            }).hex,
          ),
          alpha: 1,
        },
      ];
      // Measured by this file's own ratio, not by the function that chose the line.
      const { worst } = worstCase(perSample);
      expect(worst).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
      // THE DECOY: the same line, opaque and unmoved, loses the edge against its own colour.
      expect(worstCase([{ rgb: hex(drawn), alpha: 1 }]).worst).toBeCloseTo(1, 2);
    },
    120_000,
  );

  it('uses the same contrast function the gate uses', () => {
    // Not a second implementation. If this disagreed with gate 9, one of them would be wrong
    // and nothing would say which.
    const black = COLOR.light['swatch.hairline'].srgb;
    const white = COLOR.light['swatch.hairline.inverse'].srgb;
    expect(wcagContrast(hex(black), hex(white))).toBeCloseTo(ratio(hex(black), hex(white)), 6);
  });
});
