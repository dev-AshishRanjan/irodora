/**
 * Gate 5 — CIELAB and CIELCh against CIE 15:2018.
 *
 * Most of this set has tolerance 0. That is not bravado: the constants of CIELAB are exact
 * rationals chosen so the branches of `f` meet exactly, and an implementation that writes
 * them as decimals fails these entries by a measurable amount. A tolerance here would let
 * that through.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/xyz-lab.golden.json' with { type: 'json' };
import {
  CANONICAL_WHITE,
  LAB_EPSILON,
  LAB_KAPPA,
  labToLch,
  srgbToXyz,
  xyzToLab,
  xyzToLch,
  type Lab,
  type Triple,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'xyz-lab');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const triple = (value: unknown): Triple => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not a triple');
  return value as unknown as Triple;
};
const scalar = (value: unknown): number => {
  if (typeof value !== 'number') throw new Error('not a number');
  return value;
};

const expectClose = (actual: Triple, expected: Triple, tolerance: number, label: string): void => {
  for (let i = 0; i < 3; i++)
    expect(
      Math.abs(actual[i]! - expected[i]!),
      `${label} component ${String(i)}`,
    ).toBeLessThanOrEqual(tolerance);
};

describe('the constants are exact rationals', () => {
  it('epsilon is 216/24389', () => {
    expect(LAB_EPSILON).toBe(scalar(entry('epsilon').expected));
  });

  it('kappa is 24389/27', () => {
    expect(LAB_KAPPA).toBe(scalar(entry('kappa').expected));
  });

  it('kappa x epsilon is exactly 8', () => {
    expect(LAB_KAPPA * LAB_EPSILON).toBe(scalar(entry('kappa-times-epsilon-is-eight').expected));
  });

  it('both branches of f agree at epsilon, to the last bit', () => {
    // This is the whole reason the constants are rationals. cbrt(216/24389) is 6/29, and
    // (kappa x epsilon + 16)/116 is 24/116, which is also 6/29. Not close — equal.
    const viaCbrt = Math.cbrt(LAB_EPSILON);
    const viaLinear = (LAB_KAPPA * LAB_EPSILON + 16) / 116;
    const published = scalar(entry('f-of-epsilon-is-six-twentyninths').expected);

    expect(viaCbrt).toBe(published);
    expect(viaLinear).toBe(published);
    expect(viaCbrt).toBe(viaLinear);
  });

  it('the decimal-rounded constants would NOT join', () => {
    // The decoy. 0.008856 and 903.3 are what a great many implementations use. They put a
    // step of 3.7e-5 in L* at the boundary — small, and exactly the kind of small that
    // accumulates into a visible seam in a dark gradient.
    const roundedEpsilon = 0.008856;
    const roundedKappa = 903.3;
    const viaCbrt = Math.cbrt(roundedEpsilon);
    const viaLinear = (roundedKappa * roundedEpsilon + 16) / 116;

    expect(Math.abs(viaCbrt - viaLinear)).toBeGreaterThan(1e-7);
    expect(Math.abs(116 * viaCbrt - 116 * viaLinear)).toBeGreaterThan(1e-5);
  });
});

describe('xyz-lab golden set', () => {
  it('white is exactly (100, 0, 0)', () => {
    const actual = xyzToLab(CANONICAL_WHITE);
    expectClose(actual, triple(entry('white-is-100-0-0').expected), 0, 'white');
  });

  it('black is exactly (0, 0, 0)', () => {
    expectClose(xyzToLab([0, 0, 0]), triple(entry('black-is-0-0-0').expected), 0, 'black');
  });

  it('L* at the epsilon boundary is exactly 8', () => {
    const golden = entry('lightness-at-the-epsilon-boundary');
    const ratio = (golden.input as { yRatio: number }).yRatio;
    const xyz: Triple = [
      CANONICAL_WHITE[0] * ratio,
      CANONICAL_WHITE[1] * ratio,
      CANONICAL_WHITE[2] * ratio,
    ];
    expectClose(xyzToLab(xyz), triple(golden.expected), golden.tolerance, golden.id);
  });

  it('L* below the boundary is linear in Y', () => {
    const golden = entry('lightness-below-the-boundary-is-linear');
    const ratio = (golden.input as { yRatio: number }).yRatio;
    const xyz: Triple = [
      CANONICAL_WHITE[0] * ratio,
      CANONICAL_WHITE[1] * ratio,
      CANONICAL_WHITE[2] * ratio,
    ];
    expectClose(xyzToLab(xyz), triple(golden.expected), golden.tolerance, golden.id);
  });

  for (const id of ['srgb-mid-grey', 'srgb-red-primary', 'srgb-green-primary', 'srgb-blue-primary'])
    it(`${id} converts to its published Lab`, () => {
      const golden = entry(id);
      const rgb = triple((golden.input as { srgb: number[] }).srgb);
      expectClose(xyzToLab(srgbToXyz(rgb)), triple(golden.expected), golden.tolerance, id);
    });

  for (const id of ['lch-red-primary', 'lch-blue-primary'])
    it(`${id} converts to its published LCh`, () => {
      const golden = entry(id);
      const rgb = triple((golden.input as { srgb: number[] }).srgb);
      expectClose(xyzToLch(srgbToXyz(rgb)), triple(golden.expected), golden.tolerance, id);
    });
});

describe('which D65 — a difference worth naming rather than absorbing', () => {
  it('the rounded white point moves sRGB red by 0.004 dE76, all of it in the white point', () => {
    // Tables quoting sRGB red as Lab [53.2408, 80.0925, 67.2032] use XYZ white
    // [0.95047, 1, 1.08883]; we derive white from the published chromaticity x=0.3127
    // y=0.3290, giving [0.9504559..., 1, 1.0890578]. Recorded so nobody later "fixes" our
    // white point to match a table and moves every corpus value by 0.004 (E-001).
    const roundedWhite: Triple = [0.95047, 1, 1.08883];
    const ours = xyzToLab(srgbToXyz([1, 0, 0]));
    const theirs: Lab = xyzToLab(srgbToXyz([1, 0, 0]), roundedWhite);

    const delta = Math.hypot(ours[0] - theirs[0], ours[1] - theirs[1], ours[2] - theirs[2]);
    expect(delta).toBeGreaterThan(0.003);
    expect(delta).toBeLessThan(0.005);
    // L* is identical: the two white points differ only in X and Z.
    expect(ours[0]).toBe(theirs[0]);
  });
});

describe('the decoy: a sign-flipped a* must fail this set', () => {
  it('the green primary catches it', () => {
    const right = triple(entry('srgb-green-primary').expected);
    const actual = xyzToLab(srgbToXyz([0, 1, 0]));
    const flipped: Triple = [actual[0], -actual[1], actual[2]];
    expect(Math.abs(flipped[1] - right[1])).toBeGreaterThan(170);
  });

  it('a neutral would NOT catch it, which is why the primaries are in the set', () => {
    // a* is 0 for every neutral, so a sign flip is numerically invisible on grey. The three
    // entries that catch it are the three that have chroma.
    //
    // `-0` and `0` are the same number and different bits — `expect(-grey[1]).toBe(0)` fails
    // on Object.is while being true of every comparison a colour ever makes. The claim here
    // is about the arithmetic, so it is asserted arithmetically; the bit-level distinction is
    // asserted where it matters, in the identity digest.
    const grey = xyzToLab(srgbToXyz([0.5, 0.5, 0.5]));
    expect(grey[1]).toBe(0);
    expect(-grey[1] === grey[1]).toBe(true);
  });
});

describe('hue is an angle', () => {
  it('folds a negative atan2 result into [0, 360)', () => {
    const golden = entry('lch-blue-primary');
    const lch = xyzToLch(srgbToXyz([0, 0, 1]));
    expect(lch[2]).toBeGreaterThan(300);
    expectClose(lch, triple(golden.expected), golden.tolerance, golden.id);
  });

  it('reports 0 for a neutral, and chroma says why that number means nothing', () => {
    const [, chroma, hue] = labToLch(xyzToLab(srgbToXyz([0.5, 0.5, 0.5])));
    expect(chroma).toBe(0);
    expect(hue).toBe(0);
  });
});
