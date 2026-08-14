/**
 * Gate 5 — chromatic adaptation against Lindbloom's published Bradford matrix and the
 * defining property of a von Kries transform.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/adaptation.golden.json' with { type: 'json' };
import {
  adapt,
  adaptationMatrix,
  D50,
  D65,
  srgbToXyz,
  type AdaptationMethod,
  type Matrix3,
  type Triple,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'adaptation');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

interface AdaptationInput {
  method: AdaptationMethod;
  from: Triple;
  to: Triple;
  xyz?: Triple;
}

describe('adaptation golden set', () => {
  for (const id of [
    'bradford-d65-to-d50-lindbloom-whites',
    'bradford-d65-to-d50-derived-whites',
    'cat16-d65-to-d50-matrix',
  ])
    it(`${id}: the composed matrix matches`, () => {
      const golden = entry(id);
      const input = golden.input as AdaptationInput;
      const actual = adaptationMatrix(input.from, input.to, input.method);
      const expected = golden.expected as Matrix3;

      for (let i = 0; i < 9; i++)
        expect(
          Math.abs(actual[i]! - expected[i]!),
          `${id} element ${String(i)}`,
        ).toBeLessThanOrEqual(golden.tolerance);
    });

  for (const id of [
    'cat16-maps-source-white-to-destination-white',
    'bradford-maps-source-white-to-destination-white',
    'black-is-fixed',
  ])
    it(id, () => {
      const golden = entry(id);
      const input = golden.input as AdaptationInput;
      const actual = adapt(input.xyz!, input.from, input.to, input.method);
      const expected = golden.expected as Triple;

      for (let i = 0; i < 3; i++)
        expect(
          Math.abs(actual[i]! - expected[i]!),
          `${id} component ${String(i)}`,
        ).toBeLessThanOrEqual(golden.tolerance);
    });
});

describe('which white point — the same question as in CIELAB, in a second place', () => {
  it('the published matrix needs Lindbloom’s white points; ours differ by 2.6e-4', () => {
    const withLindbloom = adaptationMatrix([0.95047, 1, 1.08883], [0.96422, 1, 0.82521], 'bradford');
    const withDerived = adaptationMatrix(D65, D50, 'bradford');

    let worst = 0;
    for (let i = 0; i < 9; i++) worst = Math.max(worst, Math.abs(withLindbloom[i]! - withDerived[i]!));

    expect(worst).toBeGreaterThan(1e-4);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe('adapting to the same white point is exactly the identity', () => {
  it('returns the input bit for bit, not to within 1e-16', () => {
    // Without the short circuit this is `Minv · I · M`, which is the identity in arithmetic
    // and one part in 10^16 away from it in float64. That is enough to make a no-op show up
    // in the cross-platform identity digest, and enough for "adapt everything to D65 on
    // load" to quietly perturb a corpus that was already D65 (E-001).
    for (const rgb of [
      [0.2, 0.3, 0.4],
      [1, 1, 1],
      [0, 0, 0],
      [0.011764705882352941, 0.011764705882352941, 0.011764705882352941],
    ] as const) {
      const xyz = srgbToXyz(rgb);
      expect(adapt(xyz, D65, D65)).toEqual(xyz);
      expect(adapt(xyz, D65, D65, 'bradford')).toEqual(xyz);
    }
  });

  it('and the un-short-circuited path really is NOT bit-exact, so the short circuit earns its place', () => {
    // The decoy for the test above: if `Minv · I · M` were already exact, the short circuit
    // would be dead code and the test above would prove nothing.
    const identity = adaptationMatrix(D65, D65);
    let offBy = 0;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        offBy = Math.max(offBy, Math.abs(identity[i * 3 + j]! - (i === j ? 1 : 0)));

    expect(offBy).toBeGreaterThan(0);
    expect(offBy).toBeLessThan(1e-15);
  });
});
