/**
 * The seam between the profile the database holds and the profile the engine scores.
 *
 * `@irodora/recommendation` must not depend on `@irodora/store` at runtime — an engine has no
 * business knowing there is a database. So `PersonalProfile` is a **shape**, and
 * `NewPersonalProfile` satisfies it structurally.
 *
 * Nothing enforces that except a test. `typecheck` proves it only where the two meet, and today
 * they meet nowhere: the app cannot yet import this package, and F-030 is what will finally put
 * them in one call. Until then **this file is the only place a column removed in the store
 * fails**, and it is a devDependency import precisely so that failure lands here rather than
 * three features away.
 */

import { describe, expect, it } from 'vitest';
import type { NewPersonalProfile } from '@irodora/store';
import { SCORE_FACTORS, scoreColor, type PersonalProfile } from '../src/index.js';
import { fromSpace } from '@irodora/color-core';
import { parseRuleSet } from '../src/index.js';

/** A profile exactly as the store's type describes it, with all seven dimensions. */
const STORED: NewPersonalProfile = {
  id: '0198e2f1-4c3a-7b21-9d54-6e0a1b2c3d4e',
  method: 'guided',
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 0.5,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: {
    lightness: 0.75,
    temperature: 0.5,
    chroma: 0.75,
    contrast: 0.5,
    neutrals: 0.5,
    accents: 0.5,
    avoid: 0.5,
  },
  origin: {
    lightness: 'derived',
    temperature: 'user',
    chroma: 'derived',
    contrast: 'derived',
    neutrals: 'derived',
    accents: 'derived',
    avoid: 'derived',
  },
  neutrals: ['ai-nezumi'],
  accents: ['beni-hi'],
  avoid: ['kariyasu'],
};

describe('a stored profile is a scorable profile', () => {
  it('satisfies the engine shape with no conversion', () => {
    // The assignment IS the assertion: this line stops compiling the day the store drops a
    // column the engine reads, which is the failure that would otherwise surface in F-030 as a
    // score computed from `undefined`.
    const scorable: PersonalProfile = STORED;
    expect(scorable.contrast).toBe('medium');
    expect(scorable.lightness).toEqual({ min: 0.45, max: 0.75 });
  });

  it('scores without anything being mapped or copied', () => {
    const rules = parseRuleSet(
      {
        versionId: '2026.08.1',
        weights: { temperature: 0.35, lightness: 0.3, chroma: 0.2, contrast: 0.15 },
        falloff: { lightness: 0.25, chroma: 0.12 },
        poles: { warm: 60, cool: 240 },
      },
      'fixture',
    );
    const result = scoreColor(
      STORED,
      fromSpace('oklch', [0.6, 0.08, 60], { source: 'declared', confidence: 1 }),
      rules,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('reads the four dimensions it scores and carries the other three untouched', () => {
    /*
     * The engine's `confidence` is keyed by `ScoreFactor`, so a SEVEN-key record satisfies a
     * four-key requirement. That is deliberate — refusing a profile for carrying more than the
     * engine needs would force a mapping step, and a mapping step is where a dimension quietly
     * stops being passed on.
     */
    for (const factor of SCORE_FACTORS) expect(STORED.confidence[factor]).toBeTypeOf('number');
    expect(STORED.neutrals).toEqual(['ai-nezumi']);
  });

  it('DECOY — a profile missing a scored dimension does not satisfy the shape', () => {
    /*
     * Without this, "the store's type is assignable" would be equally true of an engine shape
     * that required nothing at all [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    const withoutContrast: Omit<NewPersonalProfile, 'contrast'> = STORED;
    // @ts-expect-error — `contrast` is a dimension the engine scores; a profile without it is
    // not scorable, and the compiler is what says so.
    const broken: PersonalProfile = withoutContrast;
    expect(broken).toBeDefined();
  });
});
