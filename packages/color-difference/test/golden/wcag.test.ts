/**
 * Gate 5 — WCAG 2.x contrast ratio.
 *
 * The last block is the one that matters. It is easy to read `luminance.ts` and conclude that
 * carrying a second set of luminance coefficients to four decimal places is fussiness over a
 * 5e-4 difference. It is not: that difference moves real 8-bit colours across the AA
 * threshold, in both directions, and a WCAG conformance claim computed with the wrong
 * coefficients is a claim the specification does not support.
 */

import { describe, expect, it } from 'vitest';
import Color from 'colorjs.io';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/wcag.golden.json' with { type: 'json' };
import { WCAG_FLARE, wcagContrast } from '../../src/index.js';
import { srgbToXyz, type Rgb } from '@irodora/color-spaces';

const dataset = assertGoldenDataset(raw, 'wcag');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const rgb = (value: unknown): Rgb => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not an rgb triple');
  return value as unknown as Rgb;
};
const scalar = (value: unknown): number => {
  if (typeof value !== 'number') throw new Error('not a number');
  return value;
};

/** Contrast computed with the ENGINE's luminance instead of WCAG's. Used only as a decoy. */
const contrastWithExactY = (a: Rgb, b: Rgb): number => {
  const la = srgbToXyz(a)[1];
  const lb = srgbToXyz(b)[1];
  return (Math.max(la, lb) + WCAG_FLARE) / (Math.min(la, lb) + WCAG_FLARE);
};

describe('the flare term', () => {
  it('is 0.05, digit for digit', () => {
    expect(WCAG_FLARE).toBe(scalar(entry('flare').expected));
  });
});

describe('the worked examples', () => {
  const simple = [
    'white-on-black-is-21',
    'identical-colours-are-1',
    'black-on-red-is-exactly-5252',
    '767676-on-white',
    'red-on-white',
    'blue-on-white',
  ];

  for (const id of simple)
    it(id, () => {
      const golden = entry(id);
      const input = golden.input as { a: number[]; b: number[] };
      const actual = wcagContrast(rgb(input.a), rgb(input.b));
      expect(Math.abs(actual - scalar(golden.expected))).toBeLessThanOrEqual(golden.tolerance);
    });

  it('black on red is EXACTLY 5.252, with no float64 residue', () => {
    // 0.2626 / 0.05. Exact, and it fails immediately if a coefficient is wrong.
    expect(wcagContrast([0, 0, 0], [1, 0, 0])).toBe(5.252);
  });

  it('is symmetric — which colour is the foreground does not change the ratio', () => {
    const golden = entry('red-on-white');
    const input = golden.input as { a: number[]; b: number[] };
    expect(wcagContrast(rgb(input.a), rgb(input.b))).toBe(
      wcagContrast(rgb(input.b), rgb(input.a)),
    );
  });

  it('stays within [1, 21]', () => {
    for (const [a, b] of [
      [
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [1, 0, 0],
        [0, 0, 1],
      ],
    ] as const) {
      const ratio = wcagContrast(rgb(a), rgb(b));
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThanOrEqual(21);
    }
  });
});

describe('colorjs.io agrees on neutrals and disagrees on chromatic colours', () => {
  // Not a defect in either. colorjs.io computes relative luminance from XYZ's exact Y;
  // we compute it from WCAG's published coefficients. On a neutral the two are identical,
  // because WCAG's rounding was chosen to sum to exactly 1.
  const oracle = (a: Rgb, b: Rgb): number =>
    Color.contrast(new Color('srgb', [...a]), new Color('srgb', [...b]), 'WCAG21');

  it('bitwise identical on greys', () => {
    for (const v of [0, 0.2, 0.4627450980392157, 0.6, 1]) {
      const grey: Rgb = [v, v, v];
      expect(wcagContrast(grey, [1, 1, 1])).toBe(oracle(grey, [1, 1, 1]));
    }
  });

  it('and differs by up to 8e-4 on chromatic colours', () => {
    let worst = 0;
    for (const c of [
      [1, 0, 0],
      [0, 0, 1],
      [0, 0.5, 0],
      [0.8, 0.2, 0.4],
    ] as const)
      worst = Math.max(worst, Math.abs(wcagContrast(rgb(c), [1, 1, 1]) - oracle(rgb(c), [1, 1, 1])));

    expect(worst).toBeGreaterThan(1e-4);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe('the difference is a conformance requirement, not pedantry', () => {
  it('flips a real 8-bit colour across the AA threshold', () => {
    const golden = entry('the-rounded-coefficients-flip-a-real-pass-fail');
    const input = golden.input as { a: number[]; b: number[] };
    const expected = golden.expected as { wcag: number; exactY: number; threshold: number };

    const a = rgb(input.a);
    const b = rgb(input.b);

    expect(wcagContrast(a, b)).toBe(expected.wcag);
    expect(contrastWithExactY(a, b)).toBe(expected.exactY);

    // The point, stated as a boolean rather than as a difference.
    expect(wcagContrast(a, b) >= expected.threshold).toBe(false);
    expect(contrastWithExactY(a, b) >= expected.threshold).toBe(true);
  });

  it('and it is not a single lucky colour — a sweep finds many', () => {
    // Coarse sweep, so this stays fast. The FULL 16,777,216-colour sweep against white finds
    // 984 flips across the 3:1, 4.5:1 and 7:1 thresholds — measured, and corrected from an
    // earlier claim of 111 that came from a partial sweep. This stride finds a smaller
    // number of the same thing, and asserting "more than one" is what makes the previous
    // test a rule rather than an anecdote.
    const white: Rgb = [1, 1, 1];
    let flips = 0;

    for (let r = 0; r < 256; r += 7)
      for (let g = 0; g < 256; g += 7)
        for (let b = 0; b < 256; b += 7) {
          const c: Rgb = [r / 255, g / 255, b / 255];
          const ours = wcagContrast(c, white);
          const theirs = contrastWithExactY(c, white);
          for (const threshold of [3, 4.5, 7])
            if (ours >= threshold !== theirs >= threshold) flips++;
        }

    expect(flips).toBeGreaterThan(1);
  });
});
