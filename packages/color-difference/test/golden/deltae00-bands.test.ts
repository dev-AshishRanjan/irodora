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
import { DELTA_E00_BANDS, type DeltaE00Band } from '../../src/index.js';

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

  it('DECOY — an edge at ΔE*ab’s JND of 2.3 is not a published ΔE00 edge', () => {
    // The conflation ADR-0048 refused: 2.3 is a CIELAB just-noticeable difference.
    const moved = dataset.entries.find((e) => e.id === 'acceptability-threshold');
    expect(Math.abs(2.3 - (moved?.expected as number))).toBeGreaterThan(moved?.tolerance ?? 0);
  });
});
