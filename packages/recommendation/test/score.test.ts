/**
 * The score, and the four criteria it has to satisfy.
 *
 * 1. in [0,100], a **pure** function of profile and colour given the rule version;
 * 2. explanations are **data** — factor, contribution, direction, message key;
 * 3. **per-dimension confidence weights** the contribution of uncertain dimensions;
 * 4. **no prose** is generated at scoring time.
 *
 * Criterion 3 is the one this file works hardest at, because "confidence is read" and "the
 * value happens to be constant" are indistinguishable from a single assertion — every case
 * carries the other half [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { describe, expect, it } from 'vitest';
import { fromSpace, type Color } from '@irodora/color-core';
import {
  hueBias,
  intervalFit,
  MESSAGE_KEYS,
  NO_EVIDENCE_SCORE,
  parseRuleSet,
  SCORE_FACTORS,
  scoreColor,
  type PersonalProfile,
  type RuleSet,
} from '../src/index.js';

const RULES: RuleSet = parseRuleSet(
  {
    versionId: '2026.08.1',
    weights: { temperature: 0.35, lightness: 0.3, chroma: 0.2, contrast: 0.15 },
    falloff: { lightness: 0.25, chroma: 0.12 },
    poles: { warm: 60, cool: 240 },
  },
  'fixture',
);

const confident = (over: Partial<Record<string, number>> = {}) =>
  ({
    temperature: 0.75,
    lightness: 0.75,
    chroma: 0.75,
    contrast: 0.75,
    ...over,
  }) as PersonalProfile['confidence'];

const profile = (over: Partial<PersonalProfile> = {}): PersonalProfile => ({
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 1,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: confident(),
  ...over,
});

/** A colour with provenance, because a `Color` cannot exist without one (ADR-0005). */
const colour = (oklch: readonly [number, number, number]): Color =>
  fromSpace('oklch', [oklch[0], oklch[1], oklch[2]], { source: 'declared', confidence: 1 });

/** Warm, mid-lightness, moderate chroma — a colour the fixture profile should like. */
const WARM_MID = colour([0.6, 0.08, 60]);
/** Cool, very light, very saturated — one it should not. */
const COOL_LIGHT = colour([0.95, 0.25, 240]);

describe('the score is in [0,100], by construction', () => {
  it('stays in range across a grid of profiles and colours', () => {
    const biases = [-1, -0.5, 0, 0.5, 1];
    const contrasts = ['low', 'medium', 'high'] as const;
    let checked = 0;
    for (const bias of biases)
      for (const contrast of contrasts)
        for (const l of [0.05, 0.3, 0.6, 0.9])
          for (const c of [0, 0.08, 0.3])
            for (const h of [0, 60, 150, 240, 330]) {
              const result = scoreColor(
                profile({ temperatureBias: bias, contrast }),
                colour([l, c, h]),
                RULES,
              );
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(result.score).toBeLessThanOrEqual(100);
              expect(Number.isInteger(result.score)).toBe(true);
              checked += 1;
            }
    // A loop that ran zero times asserts nothing [[a-gate-that-errors-is-failing-open]].
    expect(checked).toBe(biases.length * contrasts.length * 4 * 3 * 5);
  });

  it('is a pure function of its three arguments', () => {
    // FR-29, and what makes a stored recommendation reproducible from its versions alone.
    expect(scoreColor(profile(), WARM_MID, RULES)).toEqual(scoreColor(profile(), WARM_MID, RULES));
  });

  it('records the rule version it was produced under', () => {
    expect(scoreColor(profile(), WARM_MID, RULES).rulesVersion).toBe('2026.08.1');
  });

  it('prefers a colour that matches the profile to one that does not', () => {
    // The sanity check the range assertions cannot make: a score that is always 50 is in [0,100]
    // and means nothing.
    const good = scoreColor(profile(), WARM_MID, RULES).score;
    const bad = scoreColor(profile(), COOL_LIGHT, RULES).score;
    expect(good).toBeGreaterThan(bad);
  });

  it('sums to the total shown beside it', () => {
    // Rounded once at the end, so the arithmetic a person checks first actually adds up.
    const result = scoreColor(profile(), WARM_MID, RULES);
    const sum = result.factors.reduce((n, f) => n + f.contribution, 0);
    expect(result.score).toBe(Math.round(sum));
  });
});

describe('confidence weights the contribution (criterion 3)', () => {
  it('moves the score toward what the confident dimensions say', () => {
    /*
     * THE CASE THAT MATTERS, both halves. The colour matches on temperature and misses on
     * lightness. Silencing lightness must RAISE the score; silencing temperature must LOWER it.
     * A single direction would also be produced by an implementation that simply scaled
     * everything down when confidence fell.
     */
    const warmButTooDark = colour([0.15, 0.08, 60]);
    const base = scoreColor(profile(), warmButTooDark, RULES).score;
    const noLightness = scoreColor(
      profile({ confidence: confident({ lightness: 0 }) }),
      warmButTooDark,
      RULES,
    ).score;
    const noTemperature = scoreColor(
      profile({ confidence: confident({ temperature: 0 }) }),
      warmButTooDark,
      RULES,
    ).score;

    expect(noLightness).toBeGreaterThan(base);
    expect(noTemperature).toBeLessThan(base);
  });

  it('does NOT simply scale the whole score down when a dimension is uncertain', () => {
    /*
     * The renormalisation, asserted directly. Halving every confidence changes how much the
     * PROFILE is trusted, not how well the colour matches — so the score must not move at all.
     * Without dividing by the total, this would fall by half, and an uncertain profile would
     * read as "this suits you less" rather than "we know less about you".
     */
    const full = scoreColor(profile(), WARM_MID, RULES).score;
    const halved = scoreColor(
      profile({
        confidence: confident({
          temperature: 0.375,
          lightness: 0.375,
          chroma: 0.375,
          contrast: 0.375,
        }),
      }),
      WARM_MID,
      RULES,
    ).score;
    expect(halved).toBe(full);
  });

  it('reports how much of the profile was speaking, separately from the score', () => {
    expect(scoreColor(profile(), WARM_MID, RULES).confidence).toBeCloseTo(0.75, 10);
    const mixed = scoreColor(profile({ confidence: confident({ contrast: 0 }) }), WARM_MID, RULES);
    // Contrast dropped out, so the weighted mean is over the three that remain — still 0.75,
    // because they all carry it. The number describes the profile, not the ranking.
    expect(mixed.confidence).toBeCloseTo(0.75, 10);
    expect(mixed.factors.find((f) => f.factor === 'contrast')?.weight).toBe(0);
  });

  it('gives a silenced dimension no weight and no direction', () => {
    const result = scoreColor(profile({ confidence: confident({ chroma: 0 }) }), WARM_MID, RULES);
    const chroma = result.factors.find((f) => f.factor === 'chroma');
    expect(chroma?.weight).toBe(0);
    expect(chroma?.contribution).toBe(0);
    // `neutral`, not a direction derived from the fit: a factor that moved nothing did not
    // support anything.
    expect(chroma?.direction).toBe('neutral');
    // And the baseline — with confidence it DOES carry a weight.
    expect(
      scoreColor(profile(), WARM_MID, RULES).factors.find((f) => f.factor === 'chroma')?.weight,
    ).toBeGreaterThan(0);
  });

  it('answers 50 with nothing to go on, rather than throwing or averaging', () => {
    /*
     * Reachable rather than theoretical: F-027's photo estimate abstains on contrast at
     * confidence 0, and a profile nobody has filled in is zero across the board.
     */
    const blank = profile({
      confidence: confident({ temperature: 0, lightness: 0, chroma: 0, contrast: 0 }),
    });
    const result = scoreColor(blank, WARM_MID, RULES);
    expect(result.score).toBe(NO_EVIDENCE_SCORE);
    expect(result.confidence).toBe(0);
    expect(result.factors.every((f) => f.weight === 0 && f.contribution === 0)).toBe(true);
    // The fits are still reported — the engine computed them, it just did not weigh them.
    expect(result.factors.every((f) => f.fit >= 0 && f.fit <= 1)).toBe(true);
    // And the same colour with a real profile does NOT score 50, so this is a branch rather
    // than the only answer the engine has.
    expect(scoreColor(profile(), WARM_MID, RULES).score).not.toBe(NO_EVIDENCE_SCORE);
  });
});

describe('explanations are data, and no prose is generated (criteria 2 and 4)', () => {
  /** A dotted i18n key: lowercase segments, no spaces, no punctuation a sentence would carry. */
  const KEY = /^[a-z]+(?:\.[a-zA-Z]+)+$/u;

  it('carries factor, fit, weight, contribution, direction and a key — and nothing else', () => {
    const result = scoreColor(profile(), WARM_MID, RULES);
    for (const factor of result.factors)
      expect(Object.keys(factor).sort()).toEqual(
        ['contribution', 'direction', 'factor', 'fit', 'messageKey', 'weight'].sort(),
      );
  });

  it('names all four factors, always, in a fixed order', () => {
    // A missing factor is not an absent opinion — it is a factor whose contribution nobody can
    // see. The order is fixed so a rendered explanation does not reshuffle between renders.
    for (const p of [profile(), profile({ confidence: confident({ chroma: 0 }) })])
      expect(scoreColor(p, WARM_MID, RULES).factors.map((f) => f.factor)).toEqual([
        ...SCORE_FACTORS,
      ]);
  });

  it('emits only message KEYS, never a sentence', () => {
    const result = scoreColor(profile(), COOL_LIGHT, RULES);
    for (const factor of result.factors) {
      expect(factor.messageKey).toMatch(KEY);
      expect(MESSAGE_KEYS).toContain(factor.messageKey);
    }
  });

  it('DECOY — the key shape rejects prose, so the assertion above discriminates', () => {
    // Without this, `toMatch(KEY)` would be satisfied by a pattern that accepts anything
    // [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
    expect(KEY.test('This colour is too cool for you.')).toBe(false);
    expect(KEY.test('too cool')).toBe(false);
    expect(KEY.test('explain.temperature.opposes')).toBe(true);
  });

  it('declares every key it can emit, so the catalogue contract is checkable', () => {
    // The app cannot typecheck against this — the engine has no idea `MessageKey` exists — so
    // the key set is exported as DATA for a test on the other side to drive from.
    expect(MESSAGE_KEYS).toHaveLength(SCORE_FACTORS.length * 3);
    expect(new Set(MESSAGE_KEYS).size).toBe(MESSAGE_KEYS.length);
    for (const key of MESSAGE_KEYS) expect(key).toMatch(KEY);
  });

  it('derives direction from the fit rather than deciding it separately', () => {
    const good = scoreColor(profile(), WARM_MID, RULES);
    const temperature = good.factors.find((f) => f.factor === 'temperature');
    expect(temperature?.direction).toBe('supports');
    expect(temperature?.messageKey).toBe('explain.temperature.supports');

    const bad = scoreColor(profile(), COOL_LIGHT, RULES);
    const opposed = bad.factors.find((f) => f.factor === 'temperature');
    expect(opposed?.direction).toBe('opposes');
    expect(opposed?.messageKey).toBe('explain.temperature.opposes');
  });
});

describe('the fits', () => {
  it('is 1 anywhere inside the interval and falls to 0 over the falloff', () => {
    const range = { min: 0.4, max: 0.6 };
    expect(intervalFit(0.4, range, 0.2)).toBe(1);
    expect(intervalFit(0.5, range, 0.2)).toBe(1);
    expect(intervalFit(0.6, range, 0.2)).toBe(1);
    expect(intervalFit(0.7, range, 0.2)).toBeCloseTo(0.5, 10);
    expect(intervalFit(0.8, range, 0.2)).toBe(0);
    // Clamped, not negative — a colour twice as far outside is not worse than one at the edge.
    expect(intervalFit(1, range, 0.2)).toBe(0);
    expect(intervalFit(0.2, range, 0.2)).toBe(0);
  });

  it('reads warm and cool from the hue, and neither from halfway between', () => {
    const poles = { warm: 60, cool: 240 };
    expect(hueBias(60, poles)).toBeCloseTo(1, 10);
    expect(hueBias(240, poles)).toBeCloseTo(-1, 10);
    // A threshold comparison would give a confident answer here and flip it on one degree.
    expect(hueBias(150, poles)).toBeCloseTo(0, 10);
    expect(hueBias(330, poles)).toBeCloseTo(0, 10);
  });

  it('treats the hue circle as circular', () => {
    // 350 and 10 are 20 apart. A subtraction says 340, and every hue near the wrap would score
    // as its own opposite.
    const poles = { warm: 0, cool: 180 };
    expect(hueBias(350, poles)).toBeCloseTo(hueBias(10, poles), 10);
  });

  it('scores too little separation and too much as different kinds of miss', () => {
    // A contrast preference is a target, not a floor. A one-sided comparison would call a
    // hugely contrasting colour a perfect fit for somebody who asked for a soft one.
    const soft = profile({
      contrast: 'low',
      confidence: confident({ temperature: 0, chroma: 0, lightness: 0 }),
    });
    const middle = (soft.lightness.min + soft.lightness.max) / 2;
    const near = scoreColor(soft, colour([middle + 0.12, 0.05, 60]), RULES).score;
    const far = scoreColor(soft, colour([middle + 0.6, 0.05, 60]), RULES).score;
    const identical = scoreColor(soft, colour([middle, 0.05, 60]), RULES).score;
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(identical);
  });
});
