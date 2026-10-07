/**
 * The figures `13` and `22` print, defined (F-222, ADR-0124).
 *
 * - `countsAsOutfit` — whether an outfit's score counts it among the valid outfits: the predicate
 *   `coverage()` counts with, so `13`'s label and `01`'s count cannot disagree.
 * - `gapsAddressedBy` — `22`'s *Gaps Addressed*: the regions `gaps()` reports before the candidate
 *   and not after, BY REGION. Asserted on constructed wardrobes against the PUBLISHED lexicon,
 *   because both traps it avoids live there: synonyms (one region, four names) and gaps a garment
 *   opens.
 * - `wardrobePairings` — `22`'s *Wardrobe Pairings*: the owned garments the candidate forms a valid
 *   outfit with.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromXyz, type Color } from '@irodora/color-core';
import { oklchToXyz } from '@irodora/color-spaces';
import { parsePhraseLexicon } from '@irodora/corpus';
import {
  outfitWeights,
  parseWeightContent,
  ruleSetFor,
  scoreOutfit,
  type Candidate,
  type PersonalProfile,
} from '@irodora/recommendation';
import {
  applyChange,
  countsAsOutfit,
  coverage,
  COVERAGE_THRESHOLD,
  gaps,
  gapsAddressedBy,
  wardrobePairings,
  type CoverageContext,
  type CoverageGarment,
  type GapRegion,
} from '../src/index.js';

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const CONTENT = parseWeightContent(
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.2.json'),
      'utf8',
    ),
  ),
  'weights.2026.08.2.json',
);
const LEXICON = parsePhraseLexicon(
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'rules', 'phrase-lexicon.2026.08.1.json'),
      'utf8',
    ),
  ),
  'phrase-lexicon.2026.08.1.json',
).terms;

const oklch = (l: number, c: number, h = 250): Color =>
  fromXyz(oklchToXyz([l, c, h]), { source: 'declared', confidence: 1, originSpace: 'oklch' });

const REFERENCE: readonly Candidate[] = [
  { id: 'r1', color: oklch(0.3, 0.02) },
  { id: 'r2', color: oklch(0.6, 0.02) },
];
const PROFILE: PersonalProfile = {
  lightness: { min: 0.2, max: 0.9 },
  temperatureBias: 0,
  chroma: { min: 0, max: 0.4 },
  contrast: 'medium',
  confidence: { temperature: 0.7, lightness: 0.7, chroma: 0.7, contrast: 0.7 },
};
const RULES = ruleSetFor(CONTENT, 'default');
const WEIGHTS = outfitWeights(CONTENT);
const context = (threshold: number = COVERAGE_THRESHOLD): CoverageContext => ({
  reference: REFERENCE,
  profile: PROFILE,
  rules: RULES,
  weights: WEIGHTS,
  threshold,
});
const garment = (id: string, slot: CoverageGarment['slot'], color: Color): CoverageGarment => ({
  id,
  slot,
  color,
});

/** Near-neutral colours in each published lightness band. */
const DARK = oklch(0.2, 0.01);
const LIGHT = oklch(0.9, 0.01);
const VIVID = oklch(0.6, 0.15, 30);

const keyOf = (r: GapRegion): string =>
  [r.slot, r.lightness.min, r.lightness.max, r.chroma.min, r.chroma.max].join('|');

describe('the published lexicon names one region more than once', () => {
  it('names the dark near-neutral region four ways — dark and 暗い, grey and neutral', () => {
    const wardrobe = [
      garment('top', 'top', LIGHT),
      garment('trouser', 'trouser', LIGHT),
      garment('shoe', 'shoe', LIGHT),
    ];
    const darkTops = gaps(wardrobe, LEXICON, context(0)).filter(
      (gap) => gap.slot === 'top' && gap.region.lightness.max <= 0.4,
    );
    expect(darkTops.map((gap) => gap.terms.join(' ')).sort()).toStrictEqual([
      'dark grey',
      'dark neutral',
      '暗い grey',
      '暗い neutral',
    ]);
    expect(new Set(darkTops.map((gap) => keyOf(gap.region))).size).toBe(1);
  });
});

describe('gaps addressed are counted by region (22, criterion 4)', () => {
  it('counts one region filled where the names would count four', () => {
    const wardrobe = [
      garment('top', 'top', LIGHT),
      garment('trouser', 'trouser', LIGHT),
      garment('shoe', 'shoe', LIGHT),
    ];
    const candidate = garment('candidate', 'top', DARK);
    const addressed = gapsAddressedBy(candidate, wardrobe, LEXICON, context(0));
    expect(addressed).toHaveLength(1);
    expect(addressed[0]?.region.slot).toBe('top');
    expect(addressed[0]?.named).toHaveLength(4);
    // DECOY: the difference of lengths counts the four names.
    const before = gaps(wardrobe, LEXICON, context(0)).length;
    const after = gaps([...wardrobe, candidate], LEXICON, context(0)).length;
    expect(before - after).toBe(4);
  });

  it('counts the region a first shoe fills, though the shoe opens more gaps than it closes', () => {
    const wardrobe = [garment('top', 'top', LIGHT), garment('trouser', 'trouser', LIGHT)];
    const candidate = garment('candidate', 'shoe', DARK);
    const addressed = gapsAddressedBy(candidate, wardrobe, LEXICON, context(0));
    expect(addressed.map((a) => a.region.slot)).toStrictEqual(['shoe']);
    // DECOY: with a shoe, every top and trouser region starts unlocking outfits — the list grows.
    const before = gaps(wardrobe, LEXICON, context(0)).length;
    const after = gaps([...wardrobe, candidate], LEXICON, context(0)).length;
    expect(after).toBeGreaterThan(before);
  });

  it('answers 0 for a vivid candidate: gaps() names near-neutral regions only', () => {
    const wardrobe = [
      garment('top', 'top', LIGHT),
      garment('trouser', 'trouser', LIGHT),
      garment('shoe', 'shoe', LIGHT),
    ];
    expect(
      gapsAddressedBy(garment('candidate', 'top', VIVID), wardrobe, LEXICON, context(0)),
    ).toStrictEqual([]);
  });

  it('is the criterion’s sentence: the regions gaps() reports before and not after', () => {
    const wardrobe = [garment('top', 'top', LIGHT), garment('shoe', 'shoe', DARK)];
    const candidate = garment('candidate', 'trouser', DARK);
    const before = new Set(gaps(wardrobe, LEXICON, context(0)).map((gap) => keyOf(gap.region)));
    const after = new Set(
      gaps([...wardrobe, candidate], LEXICON, context(0)).map((gap) => keyOf(gap.region)),
    );
    const oracle = [...before].filter((k) => !after.has(k)).sort();
    expect(
      gapsAddressedBy(candidate, wardrobe, LEXICON, context(0))
        .map((a) => keyOf(a.region))
        .sort(),
    ).toStrictEqual(oracle);
  });

  it('orders its answer the same way every time', () => {
    const wardrobe = [garment('top', 'top', LIGHT)];
    const candidate = garment('candidate', 'shoe', DARK);
    const once = gapsAddressedBy(candidate, wardrobe, LEXICON, context(0));
    const twice = gapsAddressedBy(
      candidate,
      [...wardrobe].reverse(),
      [...LEXICON].reverse(),
      context(0),
    );
    expect(twice.map((a) => keyOf(a.region))).toStrictEqual(once.map((a) => keyOf(a.region)));
  });
});

describe('wardrobe pairings (22)', () => {
  const owned = [
    garment('trouser-1', 'trouser', LIGHT),
    garment('trouser-2', 'trouser', DARK),
    garment('trouser-3', 'trouser', oklch(0.55, 0.01)),
    garment('shoe', 'shoe', DARK),
  ];
  const candidate = garment('candidate', 'top', LIGHT);
  const after = (threshold: number) =>
    applyChange(
      coverage(owned, context(threshold)),
      [...owned, candidate],
      { kind: 'added', garment: candidate },
      context(threshold),
    );

  it('counts the owned garments the candidate forms a valid outfit with', () => {
    const pairings = wardrobePairings(after(0), 'candidate');
    expect(pairings.map((p) => p.id)).toStrictEqual([
      'shoe',
      'trouser-1',
      'trouser-2',
      'trouser-3',
    ]);
    expect(pairings[0]).toStrictEqual({ id: 'shoe', outfits: 3 });
    // DECOY: the outfits it unlocks are 3; the garments it pairs with are 4.
    expect(after(0).valid - coverage(owned, context(0)).valid).toBe(3);
    expect(pairings).toHaveLength(4);
  });

  it('pairs with nothing where nothing counts, and never with itself', () => {
    expect(wardrobePairings(after(101), 'candidate')).toStrictEqual([]);
    expect(wardrobePairings(after(0), 'candidate').some((p) => p.id === 'candidate')).toBe(false);
  });
});

describe('the predicate 13 and coverage() share', () => {
  const wardrobe = [
    garment('top-1', 'top', LIGHT),
    garment('top-2', 'top', DARK),
    garment('trouser-1', 'trouser', oklch(0.5, 0.02)),
    garment('trouser-2', 'trouser', VIVID),
    garment('shoe-1', 'shoe', DARK),
    garment('shoe-2', 'shoe', oklch(0.7, 0.03, 80)),
  ];
  const overalls: number[] = [];
  for (const top of wardrobe.filter((g) => g.slot === 'top'))
    for (const trouser of wardrobe.filter((g) => g.slot === 'trouser'))
      for (const shoe of wardrobe.filter((g) => g.slot === 'shoe'))
        overalls.push(
          scoreOutfit(
            [top, trouser, shoe].map((g) => ({ slot: g.slot, color: g.color })),
            REFERENCE,
            PROFILE,
            RULES,
            WEIGHTS,
          ).overall,
        );

  it('counts exactly what coverage() counts, at every threshold', () => {
    const attained = overalls[3] ?? 0;
    for (const threshold of [0, COVERAGE_THRESHOLD, 101, attained])
      expect(overalls.filter((o) => countsAsOutfit(o, threshold)).length).toBe(
        coverage(wardrobe, context(threshold)).valid,
      );
  });

  it('DECOY — an outfit AT the threshold counts: a strict comparison would miss it', () => {
    const attained = overalls[3] ?? 0;
    expect(countsAsOutfit(attained, attained)).toBe(true);
    expect(overalls.filter((o) => o > attained).length).toBeLessThan(
      coverage(wardrobe, context(attained)).valid,
    );
  });

  it('defaults to the coverage threshold', () => {
    expect(countsAsOutfit(COVERAGE_THRESHOLD)).toBe(true);
    expect(countsAsOutfit(COVERAGE_THRESHOLD - 0.001)).toBe(false);
  });
});
