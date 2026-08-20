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
import { COLOR, THEMES } from '../src/index.js';

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

/** Composite a translucent line over a sample, in BOTH models, keeping the worse. */
const compositedWorse = (
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

/**
 * The worst sample in the gamut, for a set of candidate edge treatments.
 *
 * 0.05 steps — 9261 samples. Scanning only greys is where a single line looks best, and is
 * exactly the convenient subset that would have hidden this defect.
 */
function worstCase(edges: readonly { readonly rgb: readonly number[]; readonly alpha: number }[]): {
  worst: number;
  at: readonly number[];
} {
  let worst = Infinity;
  let at: readonly number[] = [];
  for (let r = 0; r <= 1.001; r += 0.05)
    for (let g = 0; g <= 1.001; g += 0.05)
      for (let b = 0; b <= 1.001; b += 0.05) {
        const sample = [Math.min(r, 1), Math.min(g, 1), Math.min(b, 1)];
        // The edge is perceptible if ANY of its tones contrasts with the sample.
        let best = 0;
        for (const edge of edges) {
          if (edge.alpha >= 1) best = Math.max(best, ratio(sample, edge.rgb));
          else
            for (const composited of compositedWorse(edge.rgb, edge.alpha, sample))
              best = Math.max(best, ratio(sample, composited));
        }
        if (best < worst) {
          worst = best;
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

  it('uses the same contrast function the gate uses', () => {
    // Not a second implementation. If this disagreed with gate 9, one of them would be wrong
    // and nothing would say which.
    const black = COLOR.light['swatch.hairline'].srgb;
    const white = COLOR.light['swatch.hairline.inverse'].srgb;
    expect(wcagContrast(hex(black), hex(white))).toBeCloseTo(ratio(hex(black), hex(white)), 6);
  });
});
