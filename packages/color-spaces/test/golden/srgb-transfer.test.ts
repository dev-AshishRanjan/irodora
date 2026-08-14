/**
 * Gate 5 — the sRGB transfer function against IEC 61966-2-1.
 *
 * The last test in this file is the one that matters most. It does not check our
 * implementation at all: it checks that **this golden set is capable of failing**, by
 * computing what a pure-power implementation would return and asserting the difference
 * exceeds the tolerance. A golden set that a known-wrong implementation also passes is
 * decoration. [[a-decoy-that-is-not-broken-proves-nothing]]
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/srgb-transfer.golden.json' with { type: 'json' };
import {
  linearToSrgb,
  srgbToLinear,
  SRGB_EOTF_CUTOFF,
  SRGB_GAMMA,
  SRGB_JOIN_GAP,
  SRGB_LINEAR_SLOPE,
  SRGB_OFFSET,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'srgb-transfer');

const numeric = (value: unknown, what: string): number => {
  if (typeof value !== 'number') throw new Error(`golden entry ${what} is not a number`);
  return value;
};

describe('srgb-transfer golden set', () => {
  it('has entries, all cited', () => {
    expect(dataset.entries.length).toBeGreaterThanOrEqual(13);
    for (const entry of dataset.entries) expect(entry.source).not.toBe('');
  });

  for (const entry of dataset.entries) {
    const input = numeric(entry.input, `${entry.id}.input`);
    const expected = numeric(entry.expected, `${entry.id}.expected`);

    it(`${entry.id}: encoded ${String(input)} → linear ${String(expected)}`, () => {
      const actual = srgbToLinear(input);
      // toBeCloseTo works in decimal places, which cannot express "exactly equal" or a
      // tolerance of 1e-15 without arithmetic nobody will check. The subtraction is explicit.
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(entry.tolerance);
    });

    it(`${entry.id}: inverts back to ${String(input)}`, () => {
      // Two bounds, because the published standard has two regimes. Inside the gap between
      // its two cutoffs a value leaves on the linear branch and returns on the power branch;
      // everywhere else the round trip is exact to the last few bits. Using the loose bound
      // everywhere would let a real regression hide inside the standard's own artefact.
      const inGap = input > SRGB_JOIN_GAP.from && input <= SRGB_JOIN_GAP.to;
      const bound = inGap ? SRGB_JOIN_GAP.worstRoundTripError : 1e-12;
      expect(Math.abs(linearToSrgb(expected) - input)).toBeLessThanOrEqual(bound);
    });
  }
});

describe('the standard, as published', () => {
  it('joins its two branches to within 2.4e-9 at the cutoff', () => {
    // Not a defect in this code. The standard publishes 0.04045, 12.92, 0.055 and 2.4, and
    // those four constants do not make the curve exactly continuous. Asserting the step
    // rather than hiding it means a future change that alters it has to say why.
    const linearBranch = SRGB_EOTF_CUTOFF / SRGB_LINEAR_SLOPE;
    const powerBranch = Math.pow((SRGB_EOTF_CUTOFF + SRGB_OFFSET) / (1 + SRGB_OFFSET), SRGB_GAMMA);
    const step = Math.abs(powerBranch - linearBranch);

    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(2.4e-9);
  });

  it('is continuous enough that the cutoff is not visible in 8-bit output', () => {
    const below = srgbToLinear(SRGB_EOTF_CUTOFF - 1e-9);
    const above = srgbToLinear(SRGB_EOTF_CUTOFF + 1e-9);
    expect(Math.abs(above - below)).toBeLessThan(1 / 255 / 12.92);
  });

  it('has a 6.4e-8-wide encoded window where a round trip is lossy, and it is only that wide', () => {
    // 0.0031308 × 12.92 = 0.040449936, not 0.04045. Values in between leave on the linear
    // branch and return on the power branch. Measured, not assumed: the worst case is at the
    // top of the window and is 2.96e-8 — four millionths of one 8-bit code.
    expect(SRGB_JOIN_GAP.to - SRGB_JOIN_GAP.from).toBeCloseTo(6.4e-8, 12);

    let worstInside = 0;
    for (let i = 0; i <= 1_000; i++) {
      const v = SRGB_JOIN_GAP.from + ((SRGB_JOIN_GAP.to - SRGB_JOIN_GAP.from) * i) / 1_000;
      worstInside = Math.max(worstInside, Math.abs(linearToSrgb(srgbToLinear(v)) - v));
    }
    expect(worstInside).toBeLessThanOrEqual(SRGB_JOIN_GAP.worstRoundTripError);
    expect(worstInside).toBeGreaterThan(1e-9);

    let worstOutside = 0;
    for (let i = 0; i <= 10_000; i++) {
      const v = i / 10_000;
      if (v > SRGB_JOIN_GAP.from && v <= SRGB_JOIN_GAP.to) continue;
      worstOutside = Math.max(worstOutside, Math.abs(linearToSrgb(srgbToLinear(v)) - v));
    }
    expect(worstOutside).toBeLessThan(1e-15);
  });
});

describe('the decoy: a pure-power implementation must fail this set', () => {
  const purePower = (v: number): number => Math.pow(v, SRGB_GAMMA);

  const nearBlack = dataset.entries.filter(
    (e) => typeof e.input === 'number' && e.input > 0 && e.input <= SRGB_EOTF_CUTOFF,
  );

  it('has near-black entries to test with', () => {
    expect(nearBlack.length).toBeGreaterThanOrEqual(8);
  });

  for (const entry of nearBlack) {
    const input = numeric(entry.input, `${entry.id}.input`);
    const expected = numeric(entry.expected, `${entry.id}.expected`);

    it(`${entry.id} rejects the pure power function`, () => {
      const wrong = purePower(input);
      expect(Math.abs(wrong - expected)).toBeGreaterThan(Math.max(entry.tolerance, 1e-6));
    });
  }

  it('and the error is a factor, not a rounding difference', () => {
    // 8-bit code 3. A 39x error in linear light on the colours this product is about.
    const input = 3 / 255;
    expect(srgbToLinear(input) / purePower(input)).toBeGreaterThan(38);
  });
});
