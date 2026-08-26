/**
 * The rule set, and the validator that makes FR-29's range a property rather than a clamp.
 *
 * A score is `100 x the weighted sum of fits in [0,1]`. If the weights sum to 1 the result is
 * in [0,100] by construction — so every assertion in `score.test.ts` about the range rests on
 * this file, and every refusal here is watched failing with the valid set asserted green beside
 * it [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { describe, expect, it } from 'vitest';
import { parseRuleSet, RuleError, SCORE_FACTORS, WEIGHT_TOLERANCE } from '../src/index.js';

/** A rule set the validator accepts. Every refusal below is this, with one field spoiled. */
const VALID = {
  versionId: '2026.08.1',
  weights: { temperature: 0.35, lightness: 0.3, chroma: 0.2, contrast: 0.15 },
  falloff: { lightness: 0.25, chroma: 0.12 },
  poles: { warm: 60, cool: 240 },
};

const spoil = (patch: Record<string, unknown>): unknown => ({ ...VALID, ...patch });

describe('a rule set the engine accepts', () => {
  it('is accepted — the baseline, without which every refusal below proves nothing', () => {
    const rules = parseRuleSet(VALID, 'fixture');
    expect(rules.versionId).toBe('2026.08.1');
    expect(rules.weights).toEqual(VALID.weights);
    expect(rules.poles).toEqual({ warm: 60, cool: 240 });
  });

  it('carries a weight for every factor the engine scores, and no others', () => {
    const rules = parseRuleSet(VALID, 'fixture');
    // Driven from the engine's own list: a fifth factor would be a weight nobody supplies and
    // a test nobody fails.
    expect(Object.keys(rules.weights).sort()).toEqual([...SCORE_FACTORS].sort());
  });

  it('tolerates binary floating point, because 0.4+0.3+0.2+0.1 is not 1', () => {
    // The most obvious weight set anybody would write sums to 0.9999999999999999. A validator
    // demanding exact equality would reject it, and the fix somebody reaches for is to delete
    // the validator.
    const drifty = { temperature: 0.4, lightness: 0.3, chroma: 0.2, contrast: 0.1 };
    expect(drifty.temperature + drifty.lightness + drifty.chroma + drifty.contrast).not.toBe(1);
    expect(() => parseRuleSet(spoil({ weights: drifty }), 'fixture')).not.toThrow();
  });

  it('and the tolerance is far too small to admit an editorial mistake', () => {
    // 0.35 typed as 0.3 is off by 0.05 — fifty million times the tolerance.
    expect(WEIGHT_TOLERANCE).toBeLessThan(0.05 / 1_000_000);
  });
});

describe('what it refuses', () => {
  it('weights that do not sum to 1, naming what that would do to the score', () => {
    let message = '';
    try {
      parseRuleSet(
        spoil({ weights: { temperature: 0.5, lightness: 0.5, chroma: 0.5, contrast: 0.5 } }),
        'fixture',
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('sum to 2');
    // The refusal has to survive being read by somebody trying to add a weight, so it says why
    // clamping is not the answer rather than only that the number is wrong.
    expect(message).toContain('clamping');
  });

  it('a missing factor', () => {
    expect(() =>
      parseRuleSet(spoil({ weights: { temperature: 0.5, lightness: 0.5, chroma: 0 } }), 'fixture'),
    ).toThrow(RuleError);
  });

  it('a factor this engine does not score, rather than ignoring it', () => {
    // A weight that has no effect is a decision somebody made and nobody applied. Dropping it
    // silently is [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]]
    // arriving from the content side.
    let message = '';
    try {
      parseRuleSet(spoil({ weights: { ...VALID.weights, season: 0 } }), 'fixture');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('season');
    expect(message).toContain('not a factor this engine scores');
  });

  it('a weight outside [0,1], and a non-number', () => {
    expect(() =>
      parseRuleSet(spoil({ weights: { ...VALID.weights, chroma: -0.2, contrast: 0.35 } }), 'x'),
    ).toThrow(RuleError);
    expect(() =>
      parseRuleSet(spoil({ weights: { ...VALID.weights, chroma: '0.2' } }), 'x'),
    ).toThrow(RuleError);
  });

  it('a version that does not sort', () => {
    for (const versionId of ['latest', '2026-08-01', '', '1.2'])
      expect(() => parseRuleSet(spoil({ versionId }), 'x')).toThrow(RuleError);
  });

  it('a falloff of zero, because it would divide and make a cliff nobody chose', () => {
    expect(() => parseRuleSet(spoil({ falloff: { lightness: 0, chroma: 0.1 } }), 'x')).toThrow(
      /positive number/u,
    );
  });

  it('a hue pole outside [0,360)', () => {
    expect(() => parseRuleSet(spoil({ poles: { warm: 60, cool: 360 } }), 'x')).toThrow(RuleError);
    expect(() => parseRuleSet(spoil({ poles: { warm: -1, cool: 240 } }), 'x')).toThrow(RuleError);
  });

  it('something that is not an object at all', () => {
    for (const value of [null, 'rules', 42, []])
      expect(() => parseRuleSet(value, 'x')).toThrow(RuleError);
  });
});
