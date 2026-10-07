/**
 * Gate 5 — ADR-0125's band edges against their sources (F-222).
 *
 * A band is a claim about a number, so its edges are golden data like any other published value: if
 * someone moves 0.8 to 1 because "it reads better", this fails, and the ADR is where that change
 * would have to be argued.
 */

import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/deltae00-bands.golden.json' with { type: 'json' };
import { deltaE00, deltaE76, DELTA_E00_BANDS, type DeltaE00Band } from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'deltae00-bands');

const edgeOf = (band: DeltaE00Band): number | undefined =>
  DELTA_E00_BANDS.find((edge) => edge.band === band)?.from;

describe('the band edges are their sources’ numbers', () => {
  it('has every edge above zero, and nothing else', () => {
    expect(dataset.entries.map((e) => (e.input as { band: DeltaE00Band }).band)).toStrictEqual(
      DELTA_E00_BANDS.slice(1).map((edge) => edge.band),
    );
    expect(DELTA_E00_BANDS[0]).toStrictEqual({ band: 'veryClose', from: 0 });
  });

  for (const entry of dataset.entries)
    it(`${entry.id}: ${String(entry.expected)}`, () => {
      const band = (entry.input as { band: DeltaE00Band }).band;
      expect(entry.derivation).toBe('published-value');
      expect(Math.abs((edgeOf(band) ?? NaN) - (entry.expected as number))).toBeLessThanOrEqual(
        entry.tolerance,
      );
    });

  it('has no edge above acceptability: no ΔE00 threshold bounds a larger difference', () => {
    expect(DELTA_E00_BANDS.map((edge) => edge.from)).toStrictEqual([0, 0.8, 1.8]);
    // DECOY — why a range stated in CIELAB units is not a ΔE00 edge: near neutral, a ΔE*ab of 4
    // (inside CIEDE2000's 0–5 CIELAB range) is already a ΔE00 above 5.
    const a = [50, -2, 0] as const;
    const b = [50, 2, 0] as const;
    expect(deltaE76(a, b)).toBeCloseTo(4, 10);
    expect(deltaE00(a, b)).toBeGreaterThan(5);
  });

  it('DECOY — an edge at ΔE*ab’s JND of 2.3 is not a published ΔE00 edge', () => {
    // The conflation ADR-0048 refused: 2.3 is a CIELAB just-noticeable difference.
    const moved = dataset.entries.find((e) => e.id === 'acceptability-threshold');
    expect(Math.abs(2.3 - (moved?.expected as number))).toBeGreaterThan(moved?.tolerance ?? 0);
  });
});
