/**
 * The engine names the checks a capture failed (F-236; FR-18).
 *
 * Before F-236 a capture's quality was a count and an instruction; which checks failed was not
 * said. A surface that refuses a capture has to name the check, its threshold and what to do, so
 * the assessment reports its `failures` — and nothing it already said may move:
 *
 * - `failures` is in the fix-first order of `QUALITY_CHECKS`, and is exactly what the rule table
 *   gives for the metrics;
 * - `quality` is still a function of how many failed, and `instruction` is still the first one's.
 *
 * PROPERTY TESTS over seeded random regions (no generator dependency: a fixed LCG, so a failure
 * reproduces), with each check made to fail on its own as the decoy for the order.
 */

import { describe, expect, it } from 'vitest';
import {
  assessQuality,
  failedChecks,
  QUALITY_CEILING,
  QUALITY_CHECK_RULES,
  QUALITY_CHECKS,
  QUALITY_INSTRUCTIONS,
  QUALITY_THRESHOLDS,
  type QualityCheck,
  type QualityMetrics,
  type Region,
  type Sample,
} from '../src/index.js';

/** A small linear congruential generator: the same sequence on every run, every platform. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** A random region: a base colour, texture, a light falloff, some clipped pixels, a size. */
function region(next: () => number): Region {
  const width = 4 + Math.floor(next() * 60);
  const height = 4 + Math.floor(next() * 60);
  const base = [next(), next(), next()] as const;
  const texture = next() * 0.08;
  const falloff = next() * 0.6;
  const clipShare = next() < 0.3 ? next() * 0.1 : 0;
  const samples: Sample[] = [];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      if (next() < clipShare) {
        samples.push({ r: 1, g: 1, b: 1, alpha: 1 });
        continue;
      }
      const t = ((row + col) % 2 === 0 ? 1 : -1) * texture;
      const light = 1 - (falloff * col) / width;
      const c = (v: number): number => Math.min(1, Math.max(0, (v + t) * light));
      samples.push({ r: c(base[0]), g: c(base[1]), b: c(base[2]), alpha: 1 });
    }
  return { samples, width, height };
}

const CLASS = ['excellent', 'good', 'fair', 'poor'] as const;

describe('the assessment names its failures without moving anything it said', () => {
  const next = random(0x1f236);
  const cases = Array.from({ length: 600 }, () => assessQuality(region(next)));

  it('draws regions that fail every count of checks — a sweep that never failed proves nothing', () => {
    const counts = new Set(cases.map((a) => Math.min(a.failures.length, 3)));
    expect([...counts].sort()).toStrictEqual([0, 1, 2, 3]);
    const seen = new Set(cases.flatMap((a) => a.failures));
    expect([...seen].sort()).toStrictEqual([...QUALITY_CHECKS].sort());
  });

  it('lists the failures in fix-first order, exactly as the rule table gives them', () => {
    for (const a of cases) {
      expect(a.failures).toStrictEqual(failedChecks(a.metrics));
      const positions = a.failures.map((f) => QUALITY_CHECKS.indexOf(f));
      expect(positions).toStrictEqual([...positions].sort((x, y) => x - y));
    }
  });

  it('keeps the class a function of how many failed, and the instruction the first one’s', () => {
    for (const a of cases) {
      expect(a.quality).toBe(CLASS[Math.min(a.failures.length, 3)]);
      expect(a.confidenceCeiling).toBe(QUALITY_CEILING[a.quality]);
      const first = a.failures[0];
      expect(a.instruction).toBe(first === undefined ? '' : QUALITY_INSTRUCTIONS[first]);
    }
  });
});

describe('each check reads its metric against its own threshold', () => {
  /** Metrics that pass every check, by a margin. */
  const passing: QualityMetrics = {
    usableSamples: QUALITY_THRESHOLDS.minSamples * 2,
    clipped: 0,
    sharpness: QUALITY_THRESHOLDS.minSharpness * 2,
    unevenness: 0,
    colourVariance: 0,
  };
  /** The same metrics with one check pushed just past its threshold. */
  const failing = (check: QualityCheck): QualityMetrics => {
    const rule = QUALITY_CHECK_RULES[check];
    const limit = QUALITY_THRESHOLDS[rule.threshold];
    return {
      ...passing,
      [rule.metric]: rule.fails === 'below' ? limit * 0.99 : limit * 1.01 + 1e-9,
    };
  };

  it('passes every check on passing metrics', () => {
    expect(failedChecks(passing)).toStrictEqual([]);
  });

  it.each(QUALITY_CHECKS.map((c) => [c]))(
    'fails %s alone when only its metric crosses',
    (check) => {
      expect(failedChecks(failing(check))).toStrictEqual([check]);
    },
  );

  it('DECOY — a value exactly at a threshold is not past it, on either side', () => {
    for (const check of QUALITY_CHECKS) {
      const rule = QUALITY_CHECK_RULES[check];
      const at = { ...passing, [rule.metric]: QUALITY_THRESHOLDS[rule.threshold] };
      expect(failedChecks(at)).toStrictEqual([]);
    }
  });

  it('DECOY — the order is the fix-first one, not the table’s alphabetical or reversed', () => {
    // A region failing the first and the last check names the first: an instruction that named
    // the second-most-important problem would be followed and would not help.
    const both: QualityMetrics = {
      ...failing('singleColour'),
      usableSamples: QUALITY_THRESHOLDS.minSamples - 1,
    };
    expect(failedChecks(both)).toStrictEqual(['samples', 'singleColour']);
  });
});
