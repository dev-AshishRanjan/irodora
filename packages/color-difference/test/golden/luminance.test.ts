/**
 * Gate 5 — the three luminance definitions and every constant behind them.
 *
 * The first block is the one F-006 did not have: **constants compared digit for digit at
 * tolerance 0, with no arithmetic in between.** A dropped digit is not an arithmetic error and
 * arithmetic checks do not find it — F-006 proved that by shipping one past six datasets, two
 * oracles and a matrix-inverse check.
 * [[measure-what-a-golden-set-can-detect-before-trusting-it]]
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/luminance.golden.json' with { type: 'json' };
import {
  APCA_GAMMA,
  APCA_LUMINANCE_COEFFICIENTS,
  apcaLuminance,
  WCAG_GAMMA,
  WCAG_LINEAR_SLOPE,
  WCAG_LUMINANCE_COEFFICIENTS,
  WCAG_OFFSET,
  WCAG_TRANSFER_CUTOFF,
  wcagLuminance,
} from '../../src/index.js';
import { srgbToXyz, type Rgb } from '@irodora/color-spaces';

const dataset = assertGoldenDataset(raw, 'luminance');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const numbers = (value: unknown): readonly number[] => {
  if (!Array.isArray(value)) throw new Error('not an array');
  return value as readonly number[];
};
const scalar = (value: unknown): number => {
  if (typeof value !== 'number') throw new Error('not a number');
  return value;
};
const rgb = (value: unknown): Rgb => {
  const v = numbers(value);
  if (v.length !== 3) throw new Error('not an rgb triple');
  return v as unknown as Rgb;
};

describe('every constant, digit for digit', () => {
  it('WCAG luminance coefficients', () => {
    const published = numbers(entry('wcag-coefficients').expected);
    expect([...WCAG_LUMINANCE_COEFFICIENTS]).toEqual([...published]);
  });

  it('APCA luminance coefficients', () => {
    const published = numbers(entry('apca-coefficients').expected);
    expect([...APCA_LUMINANCE_COEFFICIENTS]).toEqual([...published]);
  });

  it('WCAG transfer constants', () => {
    const [cutoff, slope, offset, gamma] = numbers(entry('wcag-transfer-constants').expected);
    expect(WCAG_TRANSFER_CUTOFF).toBe(cutoff);
    expect(WCAG_LINEAR_SLOPE).toBe(slope);
    expect(WCAG_OFFSET).toBe(offset);
    expect(WCAG_GAMMA).toBe(gamma);
  });

  it('APCA gamma', () => {
    expect(APCA_GAMMA).toBe(scalar(entry('apca-gamma').expected));
  });

  it('a dropped digit in any coefficient would be caught', () => {
    // The decoy. Not hypothetical — this is the shape of the defect F-006 shipped.
    const published = numbers(entry('apca-coefficients').expected);
    const dropped = [0.212672, published[1]!, published[2]!];
    expect(dropped).not.toEqual([...published]);
  });
});

describe('the coefficient sums, which are not both 1', () => {
  it('WCAG sums to exactly 1', () => {
    const [r, g, b] = WCAG_LUMINANCE_COEFFICIENTS;
    expect(r + g + b).toBe(scalar(entry('wcag-coefficients-sum-to-one').expected));
  });

  it('APCA sums to 1.0000001, and that is not a defect to normalise away', () => {
    const [r, g, b] = APCA_LUMINANCE_COEFFICIENTS;
    expect(r + g + b).toBe(scalar(entry('apca-coefficients-do-not-sum-to-one').expected));
  });
});

describe('WCAG relative luminance', () => {
  for (const id of ['wcag-luminance-white', 'wcag-luminance-black', 'wcag-luminance-mid-grey'])
    it(id, () => {
      const golden = entry(id);
      expect(Math.abs(wcagLuminance(rgb(golden.input)) - scalar(golden.expected))).toBeLessThanOrEqual(
        golden.tolerance,
      );
    });

  it('matches the engine exactly for a NEUTRAL, because WCAG rounded to a sum of 1', () => {
    // The reason a grey is safe to check either way, and a chromatic colour is not.
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const grey: Rgb = [v, v, v];
      expect(Math.abs(wcagLuminance(grey) - srgbToXyz(grey)[1])).toBeLessThan(1e-16);
    }
  });

  it('and DIVERGES from the engine for a chromatic colour — the reason wcag.ts has its own constants', () => {
    // Pure red. WCAG's rounded coefficients and the exact sRGB Y row differ by 3.9e-5 in
    // luminance, which is 5.9e-4 in the resulting contrast ratio against white. Small, and it
    // moves a pairing across a 4.5:1 threshold if the pairing sits on the threshold.
    const red: Rgb = [1, 0, 0];
    const divergence = Math.abs(wcagLuminance(red) - srgbToXyz(red)[1]);
    expect(divergence).toBeGreaterThan(1e-5);
    expect(divergence).toBeLessThan(1e-4);
  });
});

describe('APCA screen luminance', () => {
  for (const id of ['apca-luminance-white', 'apca-luminance-mid-grey'])
    it(id, () => {
      const golden = entry(id);
      expect(Math.abs(apcaLuminance(rgb(golden.input)) - scalar(golden.expected))).toBeLessThanOrEqual(
        golden.tolerance,
      );
    });

  it('is a PURE power function — 39x below WCAG at 8-bit code 3', () => {
    const golden = entry('apca-and-wcag-diverge-by-39x-at-near-black');
    const expected = golden.expected as { wcag: number; apca: number };
    const input = rgb(golden.input);

    expect(wcagLuminance(input)).toBe(expected.wcag);
    expect(apcaLuminance(input)).toBe(expected.apca);
    expect(expected.wcag / expected.apca).toBeGreaterThan(38);
  });

  it('never returns NaN for an out-of-gamut component', () => {
    // Math.pow of a negative base is NaN, and NaN fails every comparison — so a contrast
    // check on an out-of-gamut colour would silently pass. Both luminance functions are
    // sign-symmetric for that reason.
    for (const v of [-0.2, -1, 1.4]) {
      expect(Number.isFinite(apcaLuminance([v, 0.5, 0.5]))).toBe(true);
      expect(Number.isFinite(wcagLuminance([v, 0.5, 0.5]))).toBe(true);
    }
  });
});

describe("WCAG's cutoff and IEC's are indistinguishable for 8-bit input", () => {
  it('no 8-bit code lies between 0.03928 and 0.04045, so the choice cannot change a result', () => {
    const golden = entry('the-two-wcag-cutoffs-are-indistinguishable-for-8-bit-input');

    const linearise = (value: number, cutoff: number): number =>
      value <= cutoff ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

    let worst = 0;
    let between = 0;
    for (let code = 0; code < 256; code++) {
      const v = code / 255;
      if (v > 0.03928 && v <= 0.04045) between++;
      worst = Math.max(worst, Math.abs(linearise(v, 0.03928) - linearise(v, 0.04045)));
    }

    expect(between).toBe(0);
    expect(worst).toBe(scalar(golden.expected));
  });

  it('but they DO differ inside the band, so the test above is not vacuous', () => {
    // The decoy for the entry above: if the two cutoffs agreed everywhere, "no 8-bit code
    // lies between them" would be an irrelevant observation rather than the reason.
    const linearise = (value: number, cutoff: number): number =>
      value <= cutoff ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

    const inside = 0.04;
    expect(inside).toBeGreaterThan(0.03928);
    expect(inside).toBeLessThan(0.04045);
    expect(linearise(inside, 0.03928)).not.toBe(linearise(inside, 0.04045));
  });
});
