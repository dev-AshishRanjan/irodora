/**
 * Gate 5 — CIEDE2000's weighted terms against all 34 Sharma–Wu–Dalal pairs (F-222, ADR-0125).
 *
 * The total is checked by `ciede2000.test.ts`. A lightness, chroma or hue reading is banded on its
 * weighted term, so the terms need their own published check: a term can be wrong while the total
 * is right — a sign swapped between ΔL′ and ΔC′ leaves the sum of squares unchanged.
 *
 * Two kinds of entry per pair:
 *
 * 1. **The weights** S<sub>L</sub>, S<sub>C</sub>, S<sub>H</sub> and R<sub>T</sub>, as Table I
 *    prints them — published values.
 * 2. **The terms**, computed by hand from Table I's printed L, C′ and h′ with the paper's equations —
 *    published formulas, each with its arithmetic in the entry.
 *
 * And the transcription is checked apart from the implementation: the terms and R<sub>T</sub>
 * rebuild every printed ΔE00, within the table's own rounding propagated through them.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import type { Lab } from '@irodora/color-spaces';
import raw from '../../golden/ciede2000-terms.golden.json' with { type: 'json' };
import totals from '../../golden/ciede2000.golden.json' with { type: 'json' };
import { deltaE00, deltaE00Terms } from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'ciede2000-terms');
const published = assertGoldenDataset(totals, 'ciede2000');

interface Weights {
  readonly sl: number;
  readonly sc: number;
  readonly sh: number;
  readonly rt: number;
}
interface Terms {
  readonly termL: number;
  readonly termC: number;
  readonly termH: number;
}
interface Input {
  readonly lab1: Lab;
  readonly lab2: Lab;
}

const weights = dataset.entries.filter((e) => e.id.endsWith('-weights'));
const terms = dataset.entries.filter((e) => e.id.endsWith('-terms'));

describe('the published set is complete', () => {
  it('has both kinds of entry for all 34 pairs, each citing Table I', () => {
    expect(weights).toHaveLength(34);
    expect(terms).toHaveLength(34);
    for (const e of dataset.entries)
      expect(e.source).toMatch(/Sharma, Wu & Dalal \(2005\).*Table I/u);
    for (const e of weights) expect(e.derivation).toBe('published-value');
    for (const e of terms) {
      expect(e.derivation).toBe('published-formula');
      expect(e.derivationNote).toMatch(/termL = .*termC = .*termH = /u);
    }
  });

  it('rests on the same inputs as the published totals', () => {
    weights.forEach((e, i) => {
      expect(e.input).toStrictEqual(published.entries[i]?.input);
    });
  });
});

describe('our terms reproduce Table I', () => {
  for (const e of weights)
    it(`${e.id}: SL, SC, SH and RT to the table's four decimals`, () => {
      const { lab1, lab2 } = e.input as Input;
      const want = e.expected as Weights;
      const got = deltaE00Terms(lab1, lab2);
      expect(Math.abs(got.sl - want.sl)).toBeLessThanOrEqual(e.tolerance);
      expect(Math.abs(got.sc - want.sc)).toBeLessThanOrEqual(e.tolerance);
      expect(Math.abs(got.sh - want.sh)).toBeLessThanOrEqual(e.tolerance);
      expect(Math.abs(got.rt - want.rt)).toBeLessThanOrEqual(e.tolerance);
    });

  for (const e of terms)
    it(`${e.id}: ΔL′/SL, ΔC′/SC and ΔH′/SH within the table's propagated rounding`, () => {
      const { lab1, lab2 } = e.input as Input;
      const want = e.expected as Terms;
      const got = deltaE00Terms(lab1, lab2);
      expect(Math.abs(got.termL - want.termL)).toBeLessThanOrEqual(e.tolerance);
      expect(Math.abs(got.termC - want.termC)).toBeLessThanOrEqual(e.tolerance);
      expect(Math.abs(got.termH - want.termH)).toBeLessThanOrEqual(e.tolerance);
    });

  it('DECOY — swapping the lightness and chroma terms keeps the total and fails the terms', () => {
    // The defect the totals cannot see: Σ of squares is unchanged by the swap.
    const e = terms.find((x) => x.id === 'pair-25-terms');
    if (e === undefined) throw new Error('pair 25');
    const { lab1, lab2 } = e.input as Input;
    const want = e.expected as Terms;
    const got = deltaE00Terms(lab1, lab2);
    expect(Math.abs(got.termC - want.termL)).toBeGreaterThan(e.tolerance);
  });
});

describe('the transcription is checked apart from the implementation', () => {
  /** A rebuilt total's bound: √3 times the term tolerance, through RT, plus the total's own rounding. */
  const bound = (tolerance: number, rt: number): number =>
    Math.sqrt(3) * tolerance * (1 + Math.abs(rt)) + 5e-5;
  const rebuild = (t: Terms, rt: number): number =>
    Math.sqrt(t.termL ** 2 + t.termC ** 2 + t.termH ** 2 + rt * t.termC * t.termH);

  it('the transcribed terms and RT rebuild every printed ΔE00', () => {
    terms.forEach((e, i) => {
      const rt = (weights[i]?.expected as Weights).rt;
      const total = published.entries[i]?.expected as number;
      expect(Math.abs(rebuild(e.expected as Terms, rt) - total)).toBeLessThanOrEqual(
        bound(e.tolerance, rt),
      );
    });
  });

  it('DECOY — one mistyped SL breaks the rebuild', () => {
    // Pair 25: L′ differs, so termL carries weight. A typo in SL moves termL, and the total with it.
    const i = terms.findIndex((x) => x.id === 'pair-25-terms');
    const e = terms[i];
    if (e === undefined) throw new Error('pair 25');
    const w = weights[i]?.expected as Weights;
    const t = e.expected as Terms;
    const mistyped: Terms = { ...t, termL: (t.termL * w.sl) / (w.sl + 0.1) };
    const total = published.entries[i]?.expected as number;
    expect(Math.abs(rebuild(mistyped, w.rt) - total)).toBeGreaterThan(bound(e.tolerance, w.rt));
  });

  it('RT is never positive: −sin(2Δθ)·Rc, with Δθ in (0°, 30°]', () => {
    for (const e of weights) expect((e.expected as Weights).rt).toBeLessThanOrEqual(0);
    // DECOY: and the implementation agrees on every pair, so a sign-flipped RT would fail above.
    for (const e of weights) {
      const { lab1, lab2 } = e.input as Input;
      expect(deltaE00Terms(lab1, lab2).rt).toBeLessThanOrEqual(0);
    }
  });
});

describe('the total is the same double either way', () => {
  it('deltaE00Terms(a, b).deltaE00 is deltaE00(a, b), bit for bit, on all 34 pairs', () => {
    for (const e of weights) {
      const { lab1, lab2 } = e.input as Input;
      expect(Object.is(deltaE00Terms(lab1, lab2).deltaE00, deltaE00(lab1, lab2))).toBe(true);
    }
  });
});
