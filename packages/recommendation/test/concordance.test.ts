/**
 * `profileConcordance` — `23`'s garment history line (F-222, ADR-0124).
 *
 * The share of owned garments FR-29 scores at or above the personal-fit component's *supports*
 * boundary. Exhaustive over a grid rather than sampled: this package carries no property-testing
 * dependency, and the grid covers the boundary exactly.
 */

import { describe, expect, it } from 'vitest';
import { fromSpace, type Color } from '@irodora/color-core';
import {
  COMPONENT_SUPPORTS_ABOVE,
  NO_EVIDENCE_SCORE,
  parseRuleSet,
  profileConcordance,
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

const PROFILE: PersonalProfile = {
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 1,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75 },
};

const colour = (l: number, c: number, h: number): Color =>
  fromSpace('oklch', [l, c, h], { source: 'declared', confidence: 1 });

/** A grid over lightness, chroma and hue: every garment colour a wardrobe could plausibly hold. */
const GRID: readonly Color[] = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].flatMap((l) =>
  [0, 0.04, 0.08, 0.14, 0.2].flatMap((c) => [20, 60, 140, 240, 320].map((h) => colour(l, c, h))),
);

/** A colour scoring exactly `target`, found by sweeping lightness, or null. */
function scoringExactly(target: number): Color | null {
  for (let i = 0; i <= 2000; i += 1) {
    const color = colour(i / 2000, 0.05, 60);
    if (scoreColor(PROFILE, color, RULES).score === target) return color;
  }
  return null;
}

describe('the share of owned garments the profile supports', () => {
  it('counts what scoreColor scores at or above the supports boundary — over the whole grid', () => {
    const result = profileConcordance(PROFILE, GRID, RULES);
    const oracle = GRID.filter(
      (c) => scoreColor(PROFILE, c, RULES).score >= COMPONENT_SUPPORTS_ABOVE,
    ).length;
    expect(result).toStrictEqual({
      garments: GRID.length,
      concordant: oracle,
      share: oracle / GRID.length,
      threshold: COMPONENT_SUPPORTS_ABOVE,
      rulesVersion: '2026.08.1',
    });
    // DECOY: the grid holds both sides of the boundary, so the count is not all or nothing.
    expect(oracle).toBeGreaterThan(0);
    expect(oracle).toBeLessThan(GRID.length);
  });

  it('counts a garment AT the boundary, and not one just below it', () => {
    const at = scoringExactly(COMPONENT_SUPPORTS_ABOVE);
    const below = scoringExactly(COMPONENT_SUPPORTS_ABOVE - 1);
    if (at === null || below === null) throw new Error('no colour scores at the boundary');
    expect(profileConcordance(PROFILE, [at], RULES)?.concordant).toBe(1);
    expect(profileConcordance(PROFILE, [below], RULES)?.concordant).toBe(0);
  });

  it('carries the threshold and the rule version it was counted at', () => {
    const result = profileConcordance(PROFILE, GRID, RULES);
    expect(result?.threshold).toBe(66);
    expect(result?.rulesVersion).toBe(RULES.versionId);
  });

  it('does not change what it is given', () => {
    const colours = Object.freeze([...GRID]);
    expect(() => profileConcordance(PROFILE, colours, RULES)).not.toThrow();
    expect(colours).toStrictEqual(GRID);
  });
});

describe('no answer is a refusal, not 0 %', () => {
  it('has no share for an empty wardrobe', () => {
    expect(profileConcordance(PROFILE, [], RULES)).toBeNull();
  });

  it('has no share for a profile that brings no evidence', () => {
    const blank: PersonalProfile = {
      ...PROFILE,
      confidence: { temperature: 0, lightness: 0, chroma: 0, contrast: 0 },
    };
    expect(profileConcordance(blank, GRID, RULES)).toBeNull();
    // DECOY: without the refusal, every colour scores NO_EVIDENCE_SCORE, under the bar — 0 %.
    expect(scoreColor(blank, GRID[0] ?? colour(0.5, 0, 0), RULES).score).toBe(NO_EVIDENCE_SCORE);
    expect(NO_EVIDENCE_SCORE).toBeLessThan(COMPONENT_SUPPORTS_ABOVE);
  });
});
