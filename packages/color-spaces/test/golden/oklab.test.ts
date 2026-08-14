/**
 * Gate 5 — OKLab and OKLCh against Ottosson (2020).
 *
 * The four `ottosson-*` entries are printed in the source. Everything else in this file is a
 * consequence of our own matrices, so those four are the only entries that can catch a
 * transcribed digit in M1 or M2 — and a wrong digit there is genuinely hard to see, because
 * the space stays smooth, continuous and perceptually plausible. It just answers a different
 * question than the one everyone else is answering.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/oklab.golden.json' with { type: 'json' };
import {
  applyMatrix3,
  LMS_TO_OKLAB,
  oklabToXyz,
  XYZ_TO_LMS_OKLAB,
  xyzToOklab,
  xyzToOklch,
  type Matrix3,
  type Triple,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'oklab');
const triple = (value: unknown): Triple => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not a triple');
  return value as unknown as Triple;
};

const expectClose = (actual: Triple, expected: Triple, tolerance: number, label: string): void => {
  for (let i = 0; i < 3; i++)
    expect(
      Math.abs(actual[i]! - expected[i]!),
      `${label} component ${String(i)}`,
    ).toBeLessThanOrEqual(tolerance);
};

const OKLCH_IDS = new Set(['oklch-red-primary', 'oklch-blue-primary']);

describe('oklab golden set', () => {
  it('has the four values Ottosson prints', () => {
    const published = dataset.entries.filter((e) => e.derivation === 'published-value');
    expect(published).toHaveLength(4);
  });

  for (const entry of dataset.entries) {
    const input = triple(entry.input);
    const expected = triple(entry.expected);

    it(`${entry.id}: XYZ ${JSON.stringify(input)} → ${OKLCH_IDS.has(entry.id) ? 'OKLCh' : 'OKLab'}`, () => {
      const actual = OKLCH_IDS.has(entry.id) ? xyzToOklch(input) : xyzToOklab(input);
      expectClose(actual, expected, entry.tolerance, entry.id);
    });
  }
});

describe('the decoy, and how much of an error this set can actually see', () => {
  /** The OKLab pipeline with a substituted M1, so a mutation can be run through it. */
  const oklabWith = (m1: Matrix3, xyz: Triple): Triple => {
    const lms = applyMatrix3(m1, xyz);
    return applyMatrix3(LMS_TO_OKLAB, [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])]);
  };

  const publishedEntries = dataset.entries.filter((e) => e.derivation === 'published-value');

  const passesPublishedSet = (m1: Matrix3): boolean =>
    publishedEntries.every((entry) => {
      const actual = oklabWith(m1, triple(entry.input));
      const expected = triple(entry.expected);
      return actual.every((v, i) => Math.abs(v - expected[i]!) <= entry.tolerance);
    });

  const perturb = (index: number, relative: number): Matrix3 => {
    const m: number[] = [...XYZ_TO_LMS_OKLAB];
    m[index] = m[index]! * (1 + relative);
    return m as unknown as Matrix3;
  };

  it('the unmutated matrix passes, so the harness is not simply failing everything', () => {
    expect(passesPublishedSet(XYZ_TO_LMS_OKLAB)).toBe(true);
  });

  it('catches a 2% error in any element of M1, in either direction', () => {
    // 2% and not 1%: at 1%, M1[6] — the X-to-S coefficient — escapes when perturbed DOWNWARD
    // while being caught upward. Sensitivity is not symmetric, and 2% is the smallest round
    // figure that holds for all eighteen cases. Measured by running all eighteen, not by
    // picking a number that made the test green.
    for (let i = 0; i < 9; i++) {
      expect(passesPublishedSet(perturb(i, 0.02)), `M1[${String(i)}] +2%`).toBe(false);
      expect(passesPublishedSet(perturb(i, -0.02)), `M1[${String(i)}] -2%`).toBe(false);
    }
  });

  it('CANNOT catch a 0.1% error, and that limit is recorded rather than implied', () => {
    // Ottosson publishes three decimal places, so this set resolves a relative error of
    // roughly 0.2% to 1% depending on the element. A retyped fourth decimal in M1[0] is
    // 0.11%, and it passes — the mutation is real and the golden set is blind to it.
    //
    // This is not a hole left open. It is the band the ORACLE cross-check covers: culori and
    // colorjs.io carry the same published matrices at full precision, and agreement with
    // them is asserted over 10,000 samples. Two checks with different blind spots, and the
    // blind spot of each written down rather than left for someone to discover.
    const retypedFourthDecimal = (0.8198330101 - 0.8189330101) / 0.8189330101;
    expect(retypedFourthDecimal).toBeLessThan(0.002);
    expect(passesPublishedSet(perturb(0, retypedFourthDecimal))).toBe(true);
  });

  it('the one element that escapes at 1% escapes DOWNWARD only', () => {
    // Pinned so the asymmetry is a recorded fact rather than a surprise the next time
    // someone tightens this test and finds it inexplicably red.
    expect(passesPublishedSet(perturb(6, -0.01))).toBe(true);
    expect(passesPublishedSet(perturb(6, 0.01))).toBe(false);
  });
});

describe('OKLab is not CIELAB with a decimal point moved', () => {
  it('50% sRGB grey is L 0.598 in OKLab and L* 53.4 in CIELAB', () => {
    // Stated because the two get conflated, and a component that treats OKLab L as
    // "CIELAB L* / 100" is off by 6.5 lightness points at mid-grey — visible, and the kind
    // of error that gets attributed to the display.
    const grey = xyzToOklab([0.20343667060423742, 0.21404114048223255, 0.23310316302365935]);
    expect(grey[0]).toBeCloseTo(0.5982, 4);
    expect(grey[0]).not.toBeCloseTo(0.5339, 3);
  });
});

describe('OKLab round trip', () => {
  it('returns the XYZ it was given for every golden input', () => {
    for (const entry of dataset.entries) {
      if (OKLCH_IDS.has(entry.id)) continue;
      const input = triple(entry.input);
      expectClose(oklabToXyz(xyzToOklab(input)), input, 1e-14, `${entry.id} round trip`);
    }
  });
});
