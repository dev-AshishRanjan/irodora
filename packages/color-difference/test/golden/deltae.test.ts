/**
 * Gate 5 — ΔE76, ΔE94 and ΔEok.
 *
 * Fewer published reference values exist for these than for CIEDE2000, so this set does two
 * things instead: it pins the definitional anchors, and it cross-validates every metric
 * against `culori` over the published Sharma–Wu–Dalal colours, which are real Lab values
 * chosen to stress a difference formula.
 */

import { describe, expect, it } from 'vitest';
import { differenceCie76, differenceCie94 } from 'culori';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/deltae.golden.json' with { type: 'json' };
import ciede2000Raw from '../../golden/ciede2000.golden.json' with { type: 'json' };
import {
  deltaE00,
  deltaE76,
  deltaE94,
  deltaEok,
  DELTAE94_GRAPHIC_ARTS,
  DELTAE94_TEXTILES,
} from '../../src/index.js';
import type { Lab, OkLab } from '@irodora/color-spaces';

const dataset = assertGoldenDataset(raw, 'deltae');
const pairsDataset = assertGoldenDataset(ciede2000Raw, 'ciede2000');

const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const triple = (value: unknown): readonly number[] => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not a triple');
  return value as readonly number[];
};
const lab = (value: unknown): Lab => triple(value) as unknown as Lab;
const oklab = (value: unknown): OkLab => triple(value) as unknown as OkLab;
const scalar = (value: unknown): number => {
  if (typeof value !== 'number') throw new Error('not a number');
  return value;
};

const culori76 = differenceCie76();
const culori94 = differenceCie94();
const tag = (c: Lab): { mode: 'lab65'; l: number; a: number; b: number } => ({
  mode: 'lab65',
  l: c[0],
  a: c[1],
  b: c[2],
});

describe('the ΔE94 weightings, digit for digit', () => {
  it('graphic arts', () => {
    const [kL, k1, k2] = triple(entry('deltae94-graphic-arts-weights').expected);
    expect(DELTAE94_GRAPHIC_ARTS).toEqual({ kL, k1, k2 });
  });

  it('textiles', () => {
    const [kL, k1, k2] = triple(entry('deltae94-textiles-weights').expected);
    expect(DELTAE94_TEXTILES).toEqual({ kL, k1, k2 });
  });

  it('and the two produce different answers, so the parameter is not decorative', () => {
    const a: Lab = [60.2574, -34.0099, 36.2677];
    const b: Lab = [60.4626, -34.1751, 39.4387];
    expect(deltaE94(a, b, DELTAE94_GRAPHIC_ARTS)).not.toBe(deltaE94(a, b, DELTAE94_TEXTILES));
  });
});

describe('definitional anchors', () => {
  it('ΔE76 white to black is 100', () => {
    const golden = entry('deltae76-white-to-black');
    const input = golden.input as { lab1: number[]; lab2: number[] };
    expect(deltaE76(lab(input.lab1), lab(input.lab2))).toBe(scalar(golden.expected));
  });

  it('ΔE00 white to black is also 100 — Sl is exactly 1 at Lbar 50', () => {
    const golden = entry('deltae00-white-to-black');
    const input = golden.input as { lab1: number[]; lab2: number[] };
    expect(
      Math.abs(deltaE00(lab(input.lab1), lab(input.lab2)) - scalar(golden.expected)),
    ).toBeLessThanOrEqual(golden.tolerance);
  });

  it('ΔEok identity is exactly 0', () => {
    const golden = entry('deltaeok-identity');
    const input = golden.input as { oklab1: number[]; oklab2: number[] };
    expect(deltaEok(oklab(input.oklab1), oklab(input.oklab2))).toBe(scalar(golden.expected));
  });

  it('ΔEok white to black is 1, not 100 — OKLab lightness is on [0,1]', () => {
    const golden = entry('deltaeok-white-to-black');
    const input = golden.input as { oklab1: number[]; oklab2: number[] };
    expect(deltaEok(oklab(input.oklab1), oklab(input.oklab2))).toBe(scalar(golden.expected));
    // Stated because the two scales get conflated, and a threshold copied from a ΔE00 context
    // into a ΔEok one is off by two orders of magnitude.
    expect(scalar(golden.expected)).not.toBe(100);
  });
});

describe('symmetry, as published rather than as assumed', () => {
  it('ΔE00 is symmetric, and the published data says so directly', () => {
    // Sharma pairs 7 and 8 are the same two colours in both orders, both published as 2.3669.
    // That is a published fact about the formula, not a property test of our code.
    const seven = pairsDataset.entries.find((e) => e.id === 'pair-07');
    const eight = pairsDataset.entries.find((e) => e.id === 'pair-08');
    expect(seven?.expected).toBe(eight?.expected);

    const golden = entry('deltae00-is-symmetric-per-the-published-data');
    const input = golden.input as { lab1: number[]; lab2: number[] };
    const a = lab(input.lab1);
    const b = lab(input.lab2);
    expect(Math.abs(deltaE00(a, b) - scalar(golden.expected))).toBeLessThanOrEqual(
      golden.tolerance,
    );
    expect(deltaE00(a, b)).toBe(deltaE00(b, a));
  });

  it('ΔE94 is NOT symmetric, by specification, and by 2.4% here', () => {
    const golden = entry('deltae94-is-asymmetric-by-specification');
    const input = golden.input as { lab1: number[]; lab2: number[] };
    const expected = golden.expected as { forward: number; reversed: number };
    const a = lab(input.lab1);
    const b = lab(input.lab2);

    expect(Math.abs(deltaE94(a, b) - expected.forward)).toBeLessThanOrEqual(golden.tolerance);
    expect(Math.abs(deltaE94(b, a) - expected.reversed)).toBeLessThanOrEqual(golden.tolerance);
    expect(deltaE94(a, b)).not.toBe(deltaE94(b, a));
  });
});

describe('why ΔE76 is never a stated result', () => {
  it('over-reports a saturated blue difference by a factor of 1.96', () => {
    const golden = entry('deltae76-over-reports-saturated-blue');
    const input = golden.input as { lab1: number[]; lab2: number[] };
    const expected = golden.expected as { de76: number; ratioToDe00: number };
    const a = lab(input.lab1);
    const b = lab(input.lab2);

    expect(Math.abs(deltaE76(a, b) - expected.de76)).toBeLessThanOrEqual(golden.tolerance);
    expect(Math.abs(deltaE76(a, b) / deltaE00(a, b) - expected.ratioToDe00)).toBeLessThan(1e-3);
  });
});

describe('culori cross-validation over the published colours', () => {
  const colours = pairsDataset.entries.map((e) => {
    const input = e.input as { lab1: number[]; lab2: number[] };
    return { id: e.id, a: lab(input.lab1), b: lab(input.lab2) };
  });

  it('ΔE76 agrees to 1e-13 across all 34 published pairs', () => {
    let worst = 0;
    for (const { a, b } of colours)
      worst = Math.max(worst, Math.abs(deltaE76(a, b) - culori76(tag(a), tag(b))));
    expect(worst).toBeLessThan(1e-13);
  });

  it('ΔE94 agrees to 1e-13 across all 34 published pairs, in the same argument order', () => {
    // Argument order matters for ΔE94, so this also checks that culori and we agree about
    // WHICH colour is the reference. A mismatch there would show as a systematic disagreement
    // on chromatic pairs and none on neutrals.
    let worst = 0;
    for (const { a, b } of colours)
      worst = Math.max(worst, Math.abs(deltaE94(a, b) - culori94(tag(a), tag(b))));
    expect(worst).toBeLessThan(1e-13);
  });

  it('and the reference-order check is not vacuous — swapping breaks it', () => {
    let worst = 0;
    for (const { a, b } of colours)
      worst = Math.max(worst, Math.abs(deltaE94(b, a) - culori94(tag(a), tag(b))));
    expect(worst).toBeGreaterThan(0.01);
  });
});
