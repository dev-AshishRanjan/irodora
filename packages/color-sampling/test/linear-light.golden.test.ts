/**
 * The golden case for the one rule that governs this package.
 *
 * > Averaging happens in linear light. Convert, average, convert back.
 * > [[averaging-non-linear-srgb-reads-too-dark]] · AGENTS.md §7
 *
 * This does NOT assert the correct answer against itself. It computes both routes and states
 * the difference as a NUMBER — and asserts the direction, because the error is one-directional
 * and that is the property that makes it dangerous: the wrong route does not look like a bug,
 * it looks like the photograph was taken in slightly worse light.
 */

import { describe, expect, it } from 'vitest';
import { srgbToLinear } from '@irodora/color-spaces';
import { aggregate, averageEncoded, linearLuminance, type Sample } from '../src/index.js';

const px = (r: number, g: number, b: number): Sample => ({ r, g, b, alpha: 1 });

describe('averaging encoded sRGB reads too dark, measurably', () => {
  /**
   * Half black, half white — the case with the largest gap, and the one whose right answer is
   * known independently: the mean of 0 and 1 in LIGHT is 0.5 linear, which encodes to ~0.7354.
   * The encoded average is 0.5, which is a mid-grey that reflects ~21% of the light.
   */
  it('is 0.5 encoded where linear light gives ~0.735', () => {
    const region = [px(0, 0, 0), px(1, 1, 1)];

    const right = aggregate(region).mean;
    const wrong = averageEncoded(region);

    // Independently recomputed from the published sRGB encode — 1.055 * L^(1/2.4) - 0.055 —
    // rather than compared to whatever aggregate() returned.
    //
    // The first version of this line put the 1.055 INSIDE the power, and it disagreed with the
    // implementation by 0.024. The implementation was right; the check was wrong. That is
    // exactly what an independent recomputation is for, and it is the reason not to write
    // `expect(right.r).toBeCloseTo(right.r)` in any of its disguises.
    const expected = 1.055 * 0.5 ** (1 / 2.4) - 0.055;
    expect(right.r).toBeCloseTo(expected, 4);
    expect(wrong.r).toBeCloseTo(0.5, 10);

    // THE DIFFERENCE, AS A NUMBER, ASSERTED — not printed. A log is swallowed by the runner
    // and proves nothing on a later run; an assertion on the magnitude is what stops the two
    // routes quietly converging if someone "simplifies" the transfer function.
    //
    // 0.7354 - 0.5 = 0.2354 of full scale. On an 8-bit channel that is 60 levels: the encoded
    // route returns mid-grey where the light says light-grey.
    expect(right.r - wrong.r).toBeCloseTo(0.2354, 3);
  });

  it('is DARKER in the same direction across the whole range, never lighter', () => {
    // The direction is the property. A test on one pair could pass by luck on a sign error.
    for (let lo = 0; lo <= 0.8; lo += 0.1) {
      const hi = lo + 0.2;
      const region = [px(lo, lo, lo), px(hi, hi, hi)];
      const right = linearLuminance(aggregate(region).mean);
      const wrong = linearLuminance(averageEncoded(region));
      expect(right, `pair ${lo.toFixed(1)}/${hi.toFixed(1)}`).toBeGreaterThan(wrong);
    }
  });

  it('agrees exactly when every pixel is identical — the baseline', () => {
    // Without this, "linear is always brighter" would pass on an implementation that simply
    // added a constant. With no spread there is nothing to disagree about, and the two routes
    // must coincide.
    const region = [px(0.4, 0.4, 0.4), px(0.4, 0.4, 0.4), px(0.4, 0.4, 0.4)];
    expect(aggregate(region).mean.r).toBeCloseTo(averageEncoded(region).r, 10);
  });

  it('uses the transfer function, not a 2.2 power — the dark end is where they differ', () => {
    // The sRGB curve has a LINEAR SEGMENT below 0.04045, and half this corpus lives there
    // [[srgb-transfer-function-has-a-linear-segment]]. A pure power function is wrong exactly
    // in the dark colours a garment photograph is full of.
    const dark = 0.02;
    expect(srgbToLinear(dark)).toBeCloseTo(dark / 12.92, 10);
    expect(srgbToLinear(dark)).not.toBeCloseTo(dark ** 2.2, 6);
  });
});
