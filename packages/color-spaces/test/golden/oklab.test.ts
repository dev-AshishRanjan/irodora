/**
 * Gate 5 — OKLab and OKLCh.
 *
 * **This file exists in the shape it does because of a defect it failed to catch.** The first
 * version of the OKLab golden set contained only Ottosson's four published table values,
 * quoted to three decimal places. A digit dropped from the tenth decimal of the XYZ→LMS
 * matrix — `0.0329845436` typed as `0.032984543` — sailed through it, and through the oracle
 * cross-check, and was found by review.
 *
 * Two things changed as a result:
 *
 * 1. **The matrix elements are golden entries in their own right, at tolerance 0.** A
 *    transcription error is a transcription error; the only check that reliably catches one
 *    is comparing the transcription to the source.
 * 2. **The set's blind spot is measured rather than described.** Ottosson's three decimals
 *    resolve a 2% error, not a 1e-9 one, and that is asserted below instead of being implied.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/oklab.golden.json' with { type: 'json' };
import {
  applyMatrix3,
  LMS_TO_OKLAB,
  LMS_TO_XYZ_OKLAB,
  OKLAB_TO_LMS,
  oklabToXyz,
  XYZ_TO_LMS_OKLAB,
  xyzToOklab,
  xyzToOklch,
  type Matrix3,
  type Triple,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'oklab');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

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

const MATRIX_ENTRIES: readonly (readonly [string, Matrix3])[] = [
  ['matrix-xyz-to-lms', XYZ_TO_LMS_OKLAB],
  ['matrix-lms-to-oklab', LMS_TO_OKLAB],
  ['matrix-lms-to-xyz', LMS_TO_XYZ_OKLAB],
  ['matrix-oklab-to-lms', OKLAB_TO_LMS],
];

describe('the matrices match the published values digit for digit', () => {
  // The check that would have caught the dropped digit. Tolerance 0, no arithmetic in between.
  for (const [id, stored] of MATRIX_ENTRIES)
    it(`${id} is transcribed exactly`, () => {
      const published = entry(id).expected as Matrix3;
      expect(published).toHaveLength(9);
      for (let i = 0; i < 9; i++)
        expect(stored[i], `${id} element ${String(i)}`).toBe(published[i]);
    });

  it('a single dropped digit would be caught, where the reference table cannot see it', () => {
    // The decoy, and the actual defect that shipped. 0.0329845436 → 0.032984543 is a 1.8e-8
    // relative change: invisible to a three-decimal table, invisible to the oracle check, and
    // caught immediately by a digit-for-digit comparison.
    const published = entry('matrix-xyz-to-lms').expected as Matrix3;
    const dropped = 0.032984543;
    expect(dropped).not.toBe(published[3]);
    expect(Math.abs(dropped - 0.0329845436) / 0.0329845436).toBeLessThan(2e-8);
  });
});

const OKLCH_IDS = new Set(['oklch-red-primary', 'oklch-blue-primary']);
const MATRIX_IDS = new Set(MATRIX_ENTRIES.map(([id]) => id));

describe('oklab golden set', () => {
  it('has the four values Ottosson prints, plus the four matrices', () => {
    const published = dataset.entries.filter((e) => e.derivation === 'published-value');
    expect(published).toHaveLength(8);
  });

  for (const golden of dataset.entries) {
    if (MATRIX_IDS.has(golden.id)) continue;

    const input = triple(golden.input);
    const expected = triple(golden.expected);

    it(`${golden.id}: XYZ ${JSON.stringify(input)} → ${OKLCH_IDS.has(golden.id) ? 'OKLCh' : 'OKLab'}`, () => {
      const actual = OKLCH_IDS.has(golden.id) ? xyzToOklch(input) : xyzToOklab(input);
      expectClose(actual, expected, golden.tolerance, golden.id);
    });
  }
});

describe('what the reference table can and cannot see', () => {
  const oklabWith = (m1: Matrix3, xyz: Triple): Triple => {
    const lms = applyMatrix3(m1, xyz);
    return applyMatrix3(LMS_TO_OKLAB, [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])]);
  };

  const publishedTable = dataset.entries.filter(
    (e) => e.derivation === 'published-value' && !MATRIX_IDS.has(e.id),
  );

  const passesTable = (m1: Matrix3): boolean =>
    publishedTable.every((golden) => {
      const actual = oklabWith(m1, triple(golden.input));
      const expected = triple(golden.expected);
      return actual.every((v, i) => Math.abs(v - expected[i]!) <= golden.tolerance);
    });

  const perturb = (index: number, relative: number): Matrix3 => {
    const m: number[] = [...XYZ_TO_LMS_OKLAB];
    m[index] = m[index]! * (1 + relative);
    return m as unknown as Matrix3;
  };

  it('the unmutated matrix passes, so the harness is not simply failing everything', () => {
    expect(passesTable(XYZ_TO_LMS_OKLAB)).toBe(true);
  });

  it('catches a 2% error in any element, in either direction', () => {
    for (let i = 0; i < 9; i++) {
      expect(passesTable(perturb(i, 0.02)), `+2% at ${String(i)}`).toBe(false);
      expect(passesTable(perturb(i, -0.02)), `-2% at ${String(i)}`).toBe(false);
    }
  });

  it('and is blind to the 1.8e-8 error that actually shipped', () => {
    // Not a hypothetical. This is the mutation that reached main and was caught by review.
    // The digit-for-digit matrix entries above are what closed it; this test is what stops
    // anyone concluding the reference table was ever going to.
    expect(passesTable(perturb(3, -1.82e-8))).toBe(true);
  });
});

describe('OKLab is not CIELAB with a decimal point moved', () => {
  it('50% sRGB grey is L 0.598 in OKLab and L* 53.4 in CIELAB', () => {
    const grey = xyzToOklab([0.20343667060423742, 0.21404114048223255, 0.23310316302365935]);
    expect(grey[0]).toBeCloseTo(0.5982, 4);
    expect(grey[0]).not.toBeCloseTo(0.5339, 3);
  });
});

describe('OKLab round trip', () => {
  it('returns the XYZ it was given for every golden input', () => {
    for (const golden of dataset.entries) {
      if (OKLCH_IDS.has(golden.id) || MATRIX_IDS.has(golden.id)) continue;
      const input = triple(golden.input);
      expectClose(oklabToXyz(xyzToOklab(input)), input, 1e-14, `${golden.id} round trip`);
    }
  });
});
