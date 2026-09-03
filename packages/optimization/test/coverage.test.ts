/**
 * Wardrobe coverage (FR-42, F-048).
 *
 * ## The two assertions that earn this file
 *
 * **The threshold is load-bearing.** A coverage count that equals `tops × trousers × shoes` is
 * a multiplication wearing a name — it rises when you buy a second black jumper, which is the
 * opposite of what somebody asking "how much does my wardrobe give me" wants to know. So the
 * first thing asserted is that a wardrobe whose combinations all score badly has coverage **0**
 * and not `t × r × s`.
 *
 * **Incremental equals whole**, which is criterion 1. An incremental cache that drifts is worse
 * than no cache: it is confidently wrong and nothing looks broken. So `applyChange` is checked
 * against a full recompute after *sequences* of changes, not after one — one sequence proves
 * one path, and the failure mode is state that accumulates.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromXyz, type Color } from '@irodora/color-core';
import {
  applyChange,
  coverage,
  COVERAGE_THRESHOLD,
  gaps,
  type CoverageContext,
  type CoverageGarment,
} from '../src/index.js';
import {
  outfitWeights,
  parseWeightContent,
  ruleSetFor,
  type Candidate,
  type PersonalProfile,
  type RuleSet,
} from '@irodora/recommendation';

const CONTENT = parseWeightContent(
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.2.json'),
      'utf8',
    ),
  ),
  'weights.2026.08.2.json',
);

const RULES: RuleSet = ruleSetFor(CONTENT, 'default');
const WEIGHTS = outfitWeights(CONTENT);

const colour = (x: number, y: number, z: number): Color =>
  fromXyz([x, y, z], { source: 'reference', confidence: 1, originSpace: 'oklch' });

const REFERENCE: readonly Candidate[] = [
  { id: 'r1', color: colour(0.2, 0.2, 0.2) },
  { id: 'r2', color: colour(0.4, 0.42, 0.45) },
  { id: 'r3', color: colour(0.6, 0.62, 0.58) },
];

const PROFILE: PersonalProfile = {
  lightness: { min: 0.2, max: 0.9 },
  temperatureBias: 0,
  chroma: { min: 0, max: 0.4 },
  contrast: 'medium',
  confidence: { temperature: 0.7, lightness: 0.7, chroma: 0.7, contrast: 0.7 },
};

const context = (threshold?: number): CoverageContext => ({
  reference: REFERENCE,
  profile: PROFILE,
  rules: RULES,
  weights: WEIGHTS,
  ...(threshold === undefined ? {} : { threshold }),
});

const g = (id: string, slot: CoverageGarment['slot'], v: number): CoverageGarment => ({
  id,
  slot,
  color: colour(v, v + 0.02, v + 0.05),
});

const WARDROBE: readonly CoverageGarment[] = [
  g('t1', 'top', 0.2),
  g('t2', 'top', 0.5),
  g('r1', 'trouser', 0.3),
  g('r2', 'trouser', 0.6),
  g('s1', 'shoe', 0.25),
];

describe('the threshold is load-bearing', () => {
  it('counts NOTHING when nothing clears the bar', () => {
    /*
     * THE ASSERTION THAT STOPS THIS BEING A MULTIPLICATION. With an impossible threshold the
     * count must be 0 and not 2 x 2 x 1 = 4. An implementation that returned the product would
     * pass every other test in this file, and would report a wardrobe of identical black
     * jumpers as richly capable.
     */
    const result = coverage(WARDROBE, context(101));
    expect(result.valid).toBe(0);
    expect([...result.perGarment.values()].every((n) => n === 0)).toBe(true);
  });

  it('counts EVERYTHING when the bar is on the floor', () => {
    // The decoy for the line above: a coverage that always returned 0 would pass it.
    const result = coverage(WARDROBE, context(0));
    expect(result.valid).toBe(4);
  });

  it('carries the threshold it counted at', () => {
    // "34 outfits" means nothing without it. A caller showing the number without the bar is
    // reporting a measurement with no units.
    expect(coverage(WARDROBE, context()).threshold).toBe(COVERAGE_THRESHOLD);
    expect(coverage(WARDROBE, context(42)).threshold).toBe(42);
  });
});

describe('per-garment counts', () => {
  it('include a garment that is in nothing', () => {
    // Absent and zero are different answers. "Which of mine is dead weight" is the question
    // this number exists for, and a garment missing from the map cannot be told from one
    // nobody looked at.
    const lonely = [...WARDROBE, g('t9', 'top', 0.95)];
    const result = coverage(lonely, context(101));
    expect(result.perGarment.has('t9')).toBe(true);
    expect(result.perGarment.get('t9')).toBe(0);
  });

  it('sum to three times the outfit count', () => {
    // Every valid outfit contributes exactly one to each of its three garments. A count that
    // double-counted, or missed a slot, breaks this identity and nothing else would notice.
    const result = coverage(WARDROBE, context(0));
    const total = [...result.perGarment.values()].reduce((n, x) => n + x, 0);
    expect(total).toBe(result.valid * 3);
  });
});

describe('incremental equals whole — criterion 1', () => {
  const whole = (w: readonly CoverageGarment[], t?: number) => coverage(w, context(t)).valid;

  it('agrees after an ADD', () => {
    const start = WARDROBE.slice(0, 4);
    const added = g('s2', 'shoe', 0.7);
    const incremental = applyChange(
      coverage(start, context(0)),
      [...start, added],
      { kind: 'added', garment: added },
      context(0),
    );
    expect(incremental.valid).toBe(whole([...start, added], 0));
    expect(incremental.perGarment).toEqual(coverage([...start, added], context(0)).perGarment);
  });

  it('agrees after a REMOVE', () => {
    const incremental = applyChange(
      coverage(WARDROBE, context(0)),
      WARDROBE.filter((x) => x.id !== 't1'),
      { kind: 'removed', id: 't1' },
      context(0),
    );
    const rest = WARDROBE.filter((x) => x.id !== 't1');
    expect(incremental.valid).toBe(whole(rest, 0));
    expect(incremental.perGarment).toEqual(coverage(rest, context(0)).perGarment);
  });

  it('agrees after a SEQUENCE, which is what a cache gets wrong', () => {
    /*
     * One change proves one path. The failure mode of an incremental recompute is state that
     * ACCUMULATES — a stale combination left in the set, a count decremented twice — and that
     * only shows up over a sequence. Checked against a full recompute at every step, so the
     * first divergence is the one reported rather than the last.
     */
    let live: CoverageGarment[] = [...WARDROBE];
    let acc = coverage(live, context(0));

    const changes: { change: Parameters<typeof applyChange>[2]; next: () => CoverageGarment[] }[] =
      [
        {
          change: { kind: 'added', garment: g('s2', 'shoe', 0.7) },
          next: () => [...live, g('s2', 'shoe', 0.7)],
        },
        { change: { kind: 'removed', id: 't1' }, next: () => live.filter((x) => x.id !== 't1') },
        {
          change: { kind: 'added', garment: g('t3', 'top', 0.35) },
          next: () => [...live, g('t3', 'top', 0.35)],
        },
        { change: { kind: 'removed', id: 'r2' }, next: () => live.filter((x) => x.id !== 'r2') },
      ];

    for (const step of changes) {
      live = step.next();
      acc = applyChange(acc, live, step.change, context(0));
      const fresh = coverage(live, context(0));
      expect(acc.valid).toBe(fresh.valid);
      expect(acc.perGarment).toEqual(fresh.perGarment);
    }
  });

  it('returns to the same number after remove-then-re-add', () => {
    // A set that leaked state would drift. The identity is exact, not approximate.
    const before = coverage(WARDROBE, context(0));
    const without = WARDROBE.filter((x) => x.id !== 't2');
    const removed = applyChange(before, without, { kind: 'removed', id: 't2' }, context(0));
    const restored = applyChange(
      removed,
      WARDROBE,
      { kind: 'added', garment: WARDROBE[1]! },
      context(0),
    );

    expect(restored.valid).toBe(before.valid);
    expect(restored.combinations).toEqual(before.combinations);
  });
});

describe('an empty or partial wardrobe', () => {
  it('produces nothing rather than throwing', () => {
    expect(coverage([], context(0)).valid).toBe(0);
  });

  it('produces nothing when a slot is unfilled', () => {
    // Two tops and two trousers make no outfits without shoes. A count that ignored a missing
    // slot would report combinations nobody can wear.
    const noShoes = WARDROBE.filter((x) => x.slot !== 'shoe');
    expect(coverage(noShoes, context(0)).valid).toBe(0);
  });
});

/* ------------------------------------------------------------------ gaps (FR-43) */

/** A fixture lexicon in the published shape. Kept small so a removal is visible. */
const LEXICON = [
  { term: 'dark', locale: 'en', constrains: { lightness: { min: 0, max: 0.395 } }, rationale: 'x' },
  {
    term: 'light',
    locale: 'en',
    constrains: { lightness: { min: 0.725, max: 1 } },
    rationale: 'x',
  },
  { term: 'neutral', locale: 'en', constrains: { chroma: { min: 0, max: 0.039 } }, rationale: 'x' },
  // Above NEUTRAL_CHROMA: this must never appear in a gap name, because a region with a hue
  // nobody published is one `gaps` would have to invent a hue for.
  { term: 'vivid', locale: 'en', constrains: { chroma: { min: 0.12, max: 0.4 } }, rationale: 'x' },
];

describe('gaps are named from the lexicon, not from this file', () => {
  it('uses only published words', () => {
    const found = gaps(WARDROBE, LEXICON, context(0));
    const vocabulary = new Set(LEXICON.map((t) => t.term));
    for (const gap of found) for (const term of gap.terms) expect(vocabulary.has(term)).toBe(true);
  });

  it('LOSES a name when the lexicon loses the term', () => {
    /*
     * THE DECOY FOR "THE VOCABULARY IS CONTENT". An implementation with the words hard-coded
     * would pass the test above — the terms would still all be in the fixture — and would fail
     * here, because removing `light` must remove every gap named with it.
     */
    const withLight = gaps(WARDROBE, LEXICON, context(0));
    const withoutLight = gaps(
      WARDROBE,
      LEXICON.filter((t) => t.term !== 'light'),
      context(0),
    );

    expect(withLight.some((g) => g.terms.includes('light'))).toBe(true);
    expect(withoutLight.some((g) => g.terms.includes('light'))).toBe(false);
  });

  it('never names a region above NEUTRAL_CHROMA', () => {
    // `vivid` has a hue nobody published. Naming it would mean inventing the most consequential
    // part of the answer, so the region is not offered at all — see the header on `gaps`.
    const found = gaps(WARDROBE, LEXICON, context(0));
    expect(found.some((g) => g.terms.includes('vivid'))).toBe(false);
  });
});

describe('what a gap reports', () => {
  it('carries the representative it projected from', () => {
    // The number is a PROJECTION from a synthetic colour. Carrying the colour is what makes it
    // reproducible, and what makes reporting the number without its basis inconvenient.
    const found = gaps(WARDROBE, LEXICON, context(0));
    expect(found.length).toBeGreaterThan(0);
    for (const gap of found) {
      expect(gap.representative.provenance.source).toBe('declared');
      expect(gap.representative.xyz.every(Number.isFinite)).toBe(true);
    }
  });

  it('offers nothing that would unlock nothing', () => {
    // A gap nobody would benefit from filling is not a gap. With an impossible threshold no
    // projected garment unlocks anything, so there is nothing to say.
    expect(gaps(WARDROBE, LEXICON, context(101))).toHaveLength(0);
  });

  it('orders by what it would unlock, with a total tie-break', () => {
    const found = gaps(WARDROBE, LEXICON, context(0));
    for (let i = 1; i < found.length; i += 1)
      expect(found[i - 1]!.wouldUnlock).toBeGreaterThanOrEqual(found[i]!.wouldUnlock);
    // Deterministic across calls, which a sort by score alone would not be when two tie.
    expect(gaps(WARDROBE, LEXICON, context(0))).toEqual(found);
  });

  it('reports no gap for a region the wardrobe already occupies', () => {
    // The decoy for the whole feature: a `gaps` that ignored the wardrobe would return the same
    // list for every input, and every assertion above would still pass.
    const bare = gaps([], LEXICON, context(0));
    const stocked = gaps(WARDROBE, LEXICON, context(0));
    expect(stocked).not.toEqual(bare);
  });
});
