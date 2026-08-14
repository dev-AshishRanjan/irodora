/**
 * Gate 5 — APCA 0.0.98G-4g.
 *
 * Every Lc value here is asserted **bitwise** against `colorjs.io`, which implements the same
 * revision independently. `toBe`, not a tolerance: two implementations of the same published
 * algorithm agreeing to the last bit is a much stronger statement than agreeing to 1e-6, and
 * it can detect a single changed constant.
 */

import { describe, expect, it } from 'vitest';
import Color from 'colorjs.io';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/apca.golden.json' with { type: 'json' };
import {
  APCA_BLACK_CLAMP,
  APCA_BLACK_THRESHOLD,
  APCA_DELTA_Y_MIN,
  APCA_LOW_CLIP,
  APCA_LOW_OFFSET,
  APCA_NORM_BG,
  APCA_NORM_TXT,
  APCA_REV_BG,
  APCA_REV_TXT,
  APCA_SCALE,
  APCA_VERSION,
  apcaLc,
} from '../../src/index.js';
import type { Rgb } from '@irodora/color-spaces';

const dataset = assertGoldenDataset(raw, 'apca');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const rgb = (value: unknown): Rgb => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not an rgb triple');
  return value as unknown as Rgb;
};
const numbers = (value: unknown): readonly number[] => {
  if (!Array.isArray(value)) throw new Error('not an array');
  return value as readonly number[];
};
const scalar = (value: unknown): number => {
  if (typeof value !== 'number') throw new Error('not a number');
  return value;
};

const oracle = (background: Rgb, text: Rgb): number =>
  Color.contrast(new Color('srgb', [...background]), new Color('srgb', [...text]), 'APCA');

const LC_ENTRIES = dataset.entries.filter(
  (e) => typeof e.input === 'object' && e.input !== null && 'background' in e.input,
);

describe('every constant, digit for digit', () => {
  it('the version is part of the answer', () => {
    expect(APCA_VERSION).toBe(entry('version').expected);
  });

  it('exponents', () => {
    const [normBg, normTxt, revTxt, revBg] = numbers(entry('exponents').expected);
    expect(APCA_NORM_BG).toBe(normBg);
    expect(APCA_NORM_TXT).toBe(normTxt);
    expect(APCA_REV_TXT).toBe(revTxt);
    expect(APCA_REV_BG).toBe(revBg);
  });

  it('clamps', () => {
    const [blkThrs, blkClmp, loClip, deltaYmin] = numbers(entry('clamps').expected);
    expect(APCA_BLACK_THRESHOLD).toBe(blkThrs);
    expect(APCA_BLACK_CLAMP).toBe(blkClmp);
    expect(APCA_LOW_CLIP).toBe(loClip);
    expect(APCA_DELTA_Y_MIN).toBe(deltaYmin);
  });

  it('scalers', () => {
    const [scale, lowOffset] = numbers(entry('scalers').expected);
    expect(APCA_SCALE).toBe(scale);
    expect(APCA_LOW_OFFSET).toBe(lowOffset);
  });

  it('the four exponents are all different — swapping two would be invisible to a spot check', () => {
    // normBG/normTXT and revTXT/revBG are 0.56/0.57 and 0.62/0.65. Transposing a pair within
    // a polarity changes Lc by a few points, which reads as a plausible answer.
    const values = [APCA_NORM_BG, APCA_NORM_TXT, APCA_REV_TXT, APCA_REV_BG];
    expect(new Set(values).size).toBe(4);
  });
});

describe('Lc values, bitwise against colorjs.io', () => {
  for (const golden of LC_ENTRIES) {
    const input = golden.input as { background: number[]; text: number[] };
    const background = rgb(input.background);
    const text = rgb(input.text);

    it(`${golden.id}: matches the golden value exactly`, () => {
      expect(apcaLc(background, text)).toBe(scalar(golden.expected));
    });

    it(`${golden.id}: matches colorjs.io exactly`, () => {
      expect(apcaLc(background, text)).toBe(oracle(background, text));
    });
  }
});

describe('the three things about APCA that surprise people', () => {
  it('is NOT symmetric — swapping background and text is a different number', () => {
    const white: Rgb = [1, 1, 1];
    const black: Rgb = [0, 0, 0];
    expect(apcaLc(white, black)).not.toBe(-apcaLc(black, white));
    expect(Math.abs(apcaLc(white, black))).not.toBe(Math.abs(apcaLc(black, white)));
  });

  it('carries polarity in the SIGN — positive is dark text on light', () => {
    expect(apcaLc([1, 1, 1], [0, 0, 0])).toBeGreaterThan(0);
    expect(apcaLc([0, 0, 0], [1, 1, 1])).toBeLessThan(0);
  });

  it('gates near-identical colours to exactly 0 rather than reporting a small number', () => {
    // The decoy: an implementation without the gates returns roughly 0.5 for one 8-bit step,
    // which looks harmless and is a measurement that was not made.
    const white: Rgb = [1, 1, 1];
    const nearlyWhite: Rgb = [254 / 255, 254 / 255, 254 / 255];

    expect(apcaLc(white, nearlyWhite)).toBe(0);

    const withoutGates = (background: Rgb, text: Rgb): number => {
      const y = (c: Rgb): number =>
        0.2126729 * Math.pow(c[0], 2.4) + 0.7151522 * Math.pow(c[1], 2.4) + 0.072175 * Math.pow(c[2], 2.4);
      const bg = y(background);
      const tx = y(text);
      return (Math.pow(bg, 0.56) - Math.pow(tx, 0.57)) * 1.14 * 100;
    };

    expect(Math.abs(withoutGates(white, nearlyWhite))).toBeGreaterThan(0.1);
  });
});

describe('APCA and WCAG are different models, reported together', () => {
  it('APCA uses a pure power function, so it is not derivable from WCAG luminance', () => {
    // Guards against a future "simplification" that routes APCA through wcagLuminance. The
    // engine's and WCAG's piecewise transfer functions both have a linear segment near black;
    // APCA does not, and at 8-bit code 3 the two differ by a factor of 39.
    const nearBlack: Rgb = [3 / 255, 3 / 255, 3 / 255];
    const white: Rgb = [1, 1, 1];

    const lc = apcaLc(white, nearBlack);
    expect(lc).toBeGreaterThan(100);
    expect(lc).toBe(oracle(white, nearBlack));
  });
});
