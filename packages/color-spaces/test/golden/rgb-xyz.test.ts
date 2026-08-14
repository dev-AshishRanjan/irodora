/**
 * Gate 5 — sRGB and Display-P3 against their published primaries.
 *
 * The two tests that matter here are not the conversions. They are:
 *
 *   1. **The matrix is re-derived from the published chromaticities** and asserted equal to
 *      the stored one. That turns the citation into a check: the constants in `matrices.ts`
 *      can no longer be "close to what a source says" without anyone noticing.
 *   2. **Every stored inverse is asserted to be the inverse.** Transcribing one wrong is the
 *      single easiest way to ship a plausible, uniformly-biased engine, and this check caught
 *      exactly that during implementation — the OKLab M1 inverse was wrong by 7.6e-4 and
 *      every conversion still looked reasonable.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/rgb-xyz.golden.json' with { type: 'json' };
import {
  applyMatrix3,
  displayP3ToXyz,
  LINEAR_P3_TO_XYZ,
  LINEAR_SRGB_TO_XYZ,
  LMS_TO_OKLAB,
  LMS_TO_XYZ_BRADFORD,
  LMS_TO_XYZ_CAT16,
  LMS_TO_XYZ_OKLAB,
  multiplyMatrix3,
  OKLAB_TO_LMS,
  srgbToXyz,
  XYZ_TO_LINEAR_P3,
  XYZ_TO_LINEAR_SRGB,
  XYZ_TO_LMS_BRADFORD,
  XYZ_TO_LMS_CAT16,
  XYZ_TO_LMS_OKLAB,
  xyzToSrgb,
  type Matrix3,
  type Triple,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'rgb-xyz');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const triple = (value: unknown): Triple => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not a triple');
  return value as unknown as Triple;
};
const matrix = (value: unknown): Matrix3 => {
  if (!Array.isArray(value) || value.length !== 9) throw new Error('not a 3x3 matrix');
  return value as unknown as Matrix3;
};

const expectClose = (actual: Triple, expected: Triple, tolerance: number, label: string): void => {
  for (let i = 0; i < 3; i++)
    expect(Math.abs(actual[i]! - expected[i]!), `${label} component ${String(i)}`).toBeLessThanOrEqual(
      tolerance,
    );
};

/**
 * The standard construction of an RGB-to-XYZ matrix from chromaticities (CIE 15; the same
 * derivation SMPTE and IEC use). Written out here rather than imported from `src` on purpose:
 * a golden test that reuses the code it checks proves the code agrees with itself.
 */
function deriveMatrix(
  primaries: readonly (readonly [number, number])[],
  white: readonly [number, number],
): Matrix3 {
  const cols = primaries.map(([x, y]) => [x / y, 1, (1 - x - y) / y] as const);
  const m = [0, 1, 2].map((row) => cols.map((c) => c[row]!));

  const [r0, r1, r2] = m as [number[], number[], number[]];
  const det =
    r0[0]! * (r1[1]! * r2[2]! - r1[2]! * r2[1]!) -
    r0[1]! * (r1[0]! * r2[2]! - r1[2]! * r2[0]!) +
    r0[2]! * (r1[0]! * r2[1]! - r1[1]! * r2[0]!);

  const inv = [
    [
      (r1[1]! * r2[2]! - r1[2]! * r2[1]!) / det,
      (r0[2]! * r2[1]! - r0[1]! * r2[2]!) / det,
      (r0[1]! * r1[2]! - r0[2]! * r1[1]!) / det,
    ],
    [
      (r1[2]! * r2[0]! - r1[0]! * r2[2]!) / det,
      (r0[0]! * r2[2]! - r0[2]! * r2[0]!) / det,
      (r0[2]! * r1[0]! - r0[0]! * r1[2]!) / det,
    ],
    [
      (r1[0]! * r2[1]! - r1[1]! * r2[0]!) / det,
      (r0[1]! * r2[0]! - r0[0]! * r2[1]!) / det,
      (r0[0]! * r1[1]! - r0[1]! * r1[0]!) / det,
    ],
  ];

  const w = [white[0] / white[1], 1, (1 - white[0] - white[1]) / white[1]];
  const scale = inv.map((row) => row[0]! * w[0]! + row[1]! * w[1]! + row[2]! * w[2]!);

  return [
    m[0]![0]! * scale[0]!,
    m[0]![1]! * scale[1]!,
    m[0]![2]! * scale[2]!,
    m[1]![0]! * scale[0]!,
    m[1]![1]! * scale[1]!,
    m[1]![2]! * scale[2]!,
    m[2]![0]! * scale[0]!,
    m[2]![1]! * scale[1]!,
    m[2]![2]! * scale[2]!,
  ];
}

describe('the matrices come from the published chromaticities', () => {
  for (const [id, stored] of [
    ['srgb-chromaticities', LINEAR_SRGB_TO_XYZ],
    ['p3-chromaticities', LINEAR_P3_TO_XYZ],
  ] as const) {
    it(`${id}: the stored matrix is what the primaries produce`, () => {
      const golden = entry(id);
      const input = golden.input as {
        primaries: readonly (readonly [number, number])[];
        white: readonly [number, number];
      };
      const derived = deriveMatrix(input.primaries, input.white);
      const published = matrix(golden.expected);

      for (let i = 0; i < 9; i++) {
        expect(Math.abs(stored[i]! - published[i]!), `stored vs published ${String(i)}`).toBe(0);
        // 4e-17 rather than 0: the derivation multiplies and divides in a different order
        // than whoever produced the published values, and float64 addition is not associative.
        expect(Math.abs(derived[i]! - published[i]!), `derived vs published ${String(i)}`).toBeLessThan(
          4e-16,
        );
      }
    });
  }

  it('the P3 red primary has exactly zero Z, and the published matrix says so', () => {
    // 1 - 0.680 - 0.320 is exactly 0 in real arithmetic and -3.97e-17 in float64. The
    // published matrix carries the exact zero; a matrix derived at runtime would not.
    expect(LINEAR_P3_TO_XYZ[6]).toBe(0);
  });
});

describe('every stored inverse is the inverse', () => {
  const pairs: readonly (readonly [string, Matrix3, Matrix3, number])[] = [
    ['sRGB', LINEAR_SRGB_TO_XYZ, XYZ_TO_LINEAR_SRGB, 2.3e-16],
    ['Display-P3', LINEAR_P3_TO_XYZ, XYZ_TO_LINEAR_P3, 2.3e-16],
    ['CAT16', XYZ_TO_LMS_CAT16, LMS_TO_XYZ_CAT16, 2.3e-16],
    ['Bradford', XYZ_TO_LMS_BRADFORD, LMS_TO_XYZ_BRADFORD, 2.3e-16],
    ['OKLab M1', XYZ_TO_LMS_OKLAB, LMS_TO_XYZ_OKLAB, 2.3e-16],
    ['OKLab M2', LMS_TO_OKLAB, OKLAB_TO_LMS, 6.7e-16],
  ];

  for (const [name, forward, inverse, tolerance] of pairs)
    it(`${name}: M x Minv is the identity`, () => {
      const product = multiplyMatrix3(forward, inverse);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          expect(
            Math.abs(product[i * 3 + j]! - (i === j ? 1 : 0)),
            `${name}[${String(i)}][${String(j)}]`,
          ).toBeLessThanOrEqual(tolerance);
    });
});

describe('rgb-xyz golden set', () => {
  const conversions = dataset.entries.filter(
    (e) => typeof e.input === 'object' && e.input !== null && 'space' in e.input,
  );

  it('has conversion entries', () => {
    expect(conversions.length).toBeGreaterThanOrEqual(11);
  });

  for (const golden of conversions) {
    const input = golden.input as { space: 'srgb' | 'display-p3'; rgb: Triple };

    if (golden.id === 'p3-red-in-srgb-is-out-of-gamut') {
      it(`${golden.id}: P3 red leaves the sRGB gamut`, () => {
        const encoded = xyzToSrgb(displayP3ToXyz(input.rgb));
        expectClose(encoded, triple(golden.expected), golden.tolerance, golden.id);
        // The point of the entry: nothing clamped it back into range.
        expect(encoded[0]).toBeGreaterThan(1);
        expect(encoded[1]).toBeLessThan(0);
        expect(encoded[2]).toBeLessThan(0);
      });
      continue;
    }

    it(`${golden.id}: ${input.space} ${JSON.stringify(input.rgb)} → XYZ`, () => {
      const actual = input.space === 'srgb' ? srgbToXyz(input.rgb) : displayP3ToXyz(input.rgb);
      expectClose(actual, triple(golden.expected), golden.tolerance, golden.id);
    });
  }

  it('d65-white-point derives from its published chromaticity', () => {
    const golden = entry('d65-white-point');
    const [x, y] = triple([...(golden.input as number[]), 0]);
    expectClose(
      [x / y, 1, (1 - x - y) / y],
      triple(golden.expected),
      golden.tolerance,
      'd65-white-point',
    );
  });
});

describe('the decoys: real mutations this set must catch', () => {
  const transpose = (m: Matrix3): Matrix3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  const swapRedAndGreenColumns = (m: Matrix3): Matrix3 => [
    m[1],
    m[0],
    m[2],
    m[4],
    m[3],
    m[5],
    m[7],
    m[6],
    m[8],
  ];

  it('the green primary catches a transposed matrix', () => {
    const wrong = applyMatrix3(transpose(LINEAR_SRGB_TO_XYZ), [0, 1, 0]);
    const right = triple(entry('srgb-green-primary').expected);
    expect(Math.abs(wrong[0] - right[0])).toBeGreaterThan(0.1);
  });

  it('a swapped pair of columns leaves white BIT-IDENTICAL and destroys every primary', () => {
    // This is why the primaries are in the golden set rather than white alone. White is the
    // column sum, so any permutation of the columns leaves it exactly unchanged — not close,
    // identical to the last bit — while red and green have swapped places entirely.
    const mutated = swapRedAndGreenColumns(LINEAR_SRGB_TO_XYZ);

    const white = applyMatrix3(mutated, [1, 1, 1]);
    const rightWhite = triple(entry('srgb-white').expected);
    for (let i = 0; i < 3; i++) expect(white[i]).toBe(rightWhite[i]);

    const red = applyMatrix3(mutated, [1, 0, 0]);
    const rightRed = triple(entry('srgb-red-primary').expected);
    expect(Math.abs(red[1] - rightRed[1])).toBeGreaterThan(0.5);
  });
});
