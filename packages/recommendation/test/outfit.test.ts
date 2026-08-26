/**
 * "What goes with this", and the four things F-030 has to be true about it.
 *
 * The pool is the **real published corpus** and the weights are the **real published file**. A
 * recommendation engine exercised only on fixtures is one nobody has pointed at the data it
 * will actually rank, and the counts the criteria name — five trousers, four shoes — are claims
 * about a corpus of 120 entries rather than about an arbitrary list.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromXyz, type Color } from '@irodora/color-core';
import { xyzToOklch } from '@irodora/color-spaces';
import {
  ALTERNATIVE_AXES,
  OUTFIT_SLOTS,
  pairingFit,
  parseWeightContent,
  recommendForSlot,
  recommendOutfit,
  ruleSetFor,
  SHORTLIST_LIMIT,
  type Candidate,
  type PersonalProfile,
  type RuleSet,
} from '../src/index.js';

/*
 * The paths are written out in full at each call rather than built from a shared `CONTENT`
 * constant. `verify-cache-scope.mjs` resolves a read STATICALLY, and a constant reduces what it
 * can see to the directory — which it then reports as unaccounted, correctly, because
 * "content" is not what turbo.json declares. Spelling each path out lets the check see
 * `content/rules` and `content/versions` and match them against globalDependencies.
 */
const RULES: RuleSet = ruleSetFor(
  parseWeightContent(
    JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.1.json'),
        'utf8',
      ),
    ),
    'weights.2026.08.1.json',
  ),
  'default',
);

/** Every published corpus entry, as a candidate. Canonical XYZ exactly as published. */
const POOL: readonly Candidate[] = (() => {
  const bundle = JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'versions', '2026.08.1.json'),
      'utf8',
    ),
  ) as {
    entries: { entry: { slug: string; color: { xyz: { x: number; y: number; z: number } } } }[];
  };
  return bundle.entries.map((e) => ({
    id: e.entry.slug,
    // `fromXyz`, so nothing is converted: a published corpus entry is a reference value with a
    // recorded origin (ADR-0005), and re-deriving it here would be today's engine answering for
    // a published version.
    // The bundle stores XYZ as an OBJECT; the engine takes a triple. Named rather than
    // destructured inline so the axis order is visible — swapping x and z here would produce a
    // plausible colour and a wrong one.
    color: fromXyz([e.entry.color.xyz.x, e.entry.color.xyz.y, e.entry.color.xyz.z], {
      source: 'reference',
      confidence: 1,
      originSpace: 'oklch',
    }),
  }));
})();

const profile = (over: Partial<PersonalProfile> = {}): PersonalProfile => ({
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 0.5,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75 },
  ...over,
});

/** A mid indigo, worn as a top — the garment the product's own samples are built around. */
const GARMENT: Color = POOL.find((c) => c.id === 'yoru-kawa')!.color;
const INPUT = { slot: 'top' as const, color: GARMENT };

describe('the pool is the real one', () => {
  it('carries the published corpus, so the counts below mean something', () => {
    // Without this, "5 or more trousers" would be satisfiable by a pool of five.
    expect(POOL.length).toBeGreaterThanOrEqual(120);
    expect(RULES.versionId).toBe('2026.08.1');
  });
});

describe('given a garment and a slot, it ranks the other slots (FR-31)', () => {
  const results = recommendOutfit(INPUT, POOL, profile(), RULES);

  it('returns 5 or more trousers and 4 or more shoes', () => {
    const trouser = results.find((r) => r.slot === 'trouser');
    const shoe = results.find((r) => r.slot === 'shoe');
    expect(trouser?.ranked.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(shoe?.ranked.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('never recommends the slot the garment is already in', () => {
    // A second top is not what "what goes with this" means, and returning one would be the kind
    // of answer that is technically responsive.
    expect(results.map((r) => r.slot)).not.toContain('top');
    expect(results.map((r) => r.slot).sort()).toEqual(
      OUTFIT_SLOTS.filter((s) => s !== 'top').sort(),
    );
  });

  it('carries a score AND the four contributions behind it, per candidate', () => {
    // FR-31 says "with score and reasons". The reasons are F-028's explanation objects, which
    // are data — so this asserts they arrived, not that a sentence was produced.
    for (const result of results)
      for (const candidate of result.ranked) {
        expect(candidate.score).toBeGreaterThanOrEqual(0);
        expect(candidate.score).toBeLessThanOrEqual(100);
        expect(candidate.personal.factors).toHaveLength(4);
        for (const factor of candidate.personal.factors)
          expect(factor.messageKey).toMatch(/^explain\.[a-z]+\.[a-zA-Z]+$/u);
      }
  });

  it('records the rule version every score was produced under', () => {
    for (const result of results) expect(result.rulesVersion).toBe('2026.08.1');
  });

  it('ranks by score, descending, with ties broken on id', () => {
    for (const result of results) {
      const scores = result.ranked.map((r) => r.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    }
  });

  it('is deterministic, and independent of the order the pool arrived in', () => {
    /*
     * Reversing the pool must not change the answer. Without the id tiebreak it would, wherever
     * two candidates score the same — and a recommendation that depends on input order is not
     * reproducible from a stored envelope, which is the whole of FR-10.
     */
    const forward = recommendForSlot(INPUT, 'trouser', POOL, profile(), RULES);
    const reversed = recommendForSlot(INPUT, 'trouser', [...POOL].reverse(), profile(), RULES);
    expect(reversed.ranked.map((r) => r.id)).toEqual(forward.ranked.map((r) => r.id));
  });

  it('answers the garment, not just the person', () => {
    /*
     * THE ASSERTION THAT EARNS THE PAIRING HALF. A "what goes with this" built on personal fit
     * alone returns the same list whatever you are holding. Two very different garments must
     * produce different orders for the same person and the same pool.
     */
    const dark = POOL.find((c) => c.id === 'soko-zumi')!.color;
    const light = POOL.find((c) => c.id === 'usu-gami')!.color;
    const withDark = recommendForSlot(
      { slot: 'top', color: dark },
      'trouser',
      POOL,
      profile(),
      RULES,
    );
    const withLight = recommendForSlot(
      { slot: 'top', color: light },
      'trouser',
      POOL,
      profile(),
      RULES,
    );
    expect(withDark.ranked[0]?.id).not.toBe(withLight.ranked[0]?.id);
  });
});

describe('alternatives move along a named dimension (FR-38)', () => {
  const trouser = recommendForSlot(INPUT, 'trouser', POOL, profile(), RULES);

  it('offers at least three, each labelled', () => {
    expect(trouser.alternatives.length).toBeGreaterThanOrEqual(3);
    for (const alternative of trouser.alternatives)
      expect(ALTERNATIVE_AXES).toContain(alternative.axis);
  });

  it('labels each with a DISTINCT axis, and never the top pick itself', () => {
    const axes = trouser.alternatives.map((a) => a.axis);
    expect(new Set(axes).size).toBe(axes.length);
    for (const alternative of trouser.alternatives)
      expect(alternative.candidate.id).not.toBe(trouser.ranked[0]?.id);
  });

  it('actually moves along the axis it claims', () => {
    // The label is a claim about the colour. `lighter` must be lighter than the top pick, or the
    // dimension is decoration.
    const best = trouser.ranked[0];
    const lighter = trouser.alternatives.find((a) => a.axis === 'lighter');
    if (lighter !== undefined && best !== undefined) {
      const lightnessOf = (id: string): number => {
        const found = POOL.find((c) => c.id === id)!;
        // Read through the same conversion the engine uses, so this is not a second definition.
        return pairingLightness(found.color);
      };
      expect(lightnessOf(lighter.candidate.id)).toBeGreaterThan(lightnessOf(best.id));
    } else {
      throw new Error('the corpus should offer a lighter alternative for this garment');
    }
  });

  it('OMITS an axis with no candidate rather than filling it', () => {
    /*
     * The decoy for the floor. A pool of two near-identical off-whites cannot offer four
     * genuine directions, and the honest answer is fewer — not four where one is mislabelled
     * [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    const thin = POOL.filter((c) => ['usu-gami', 'kai-jiro'].includes(c.id));
    expect(thin).toHaveLength(2);
    const result = recommendForSlot(INPUT, 'trouser', thin, profile(), RULES);
    expect(result.alternatives.length).toBeLessThan(ALTERNATIVE_AXES.length);
    // And no duplicates were invented to pad it.
    const ids = result.alternatives.map((a) => a.candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generation is bounded BEFORE scoring (criterion 3)', () => {
  it('scores no more than the shortlist limit, however large the pool', () => {
    /*
     * ASSERTED FROM WHAT THE ENGINE REPORTS, not from the existence of a constant. NFR-7 asks
     * for 100 000 entries responsive on a four-year-old Android, and scoring is O(n) with a
     * real constant — so if the narrowing does not happen before it, the latency budget is a
     * function of the corpus size.
     */
    const many: Candidate[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `synthetic-${String(i).padStart(5, '0')}`,
      color: fromXyz([0.2 + (i % 100) / 500, 0.2 + (i % 70) / 400, 0.2 + (i % 50) / 300], {
        source: 'declared',
        confidence: 1,
        originSpace: 'oklch',
      }),
    }));

    const result = recommendForSlot(INPUT, 'trouser', many, profile(), RULES);
    expect(result.considered).toBe(10_000);
    expect(result.scored).toBeLessThanOrEqual(SHORTLIST_LIMIT);
    expect(result.ranked).toHaveLength(result.scored);
  });

  it('and scores a small pool ENTIRELY — the baseline', () => {
    // Without this, "scored <= 64" would be equally satisfied by an engine that scored nothing.
    const few = POOL.slice(0, 10);
    const result = recommendForSlot(INPUT, 'trouser', few, profile(), RULES);
    expect(result.considered).toBe(10);
    expect(result.scored).toBeGreaterThan(0);
    expect(result.scored).toBeLessThanOrEqual(10);
  });

  it('reports the pool it was given, so the bound is legible', () => {
    const result = recommendForSlot(INPUT, 'trouser', POOL, profile(), RULES);
    expect(result.considered).toBe(POOL.length);
    expect(result.scored).toBeLessThanOrEqual(SHORTLIST_LIMIT);
  });
});

describe('the pairing fit', () => {
  it('prefers the separation the person asked for — in BOTH directions', () => {
    /*
     * A contrast preference is a TARGET, not a floor, and this test is where that becomes
     * legible. Its first draft asserted that somebody who wants high contrast prefers the
     * furthest colour available, and it failed: against a near-black top, an off-white
     * overshoots the high target (0.776 separation against 0.5) by more than a mid grey
     * undershoots it (0.314), so the mid grey scores higher — correctly.
     *
     * "More is always better" is the model this engine deliberately does not have. A person who
     * asked for strong contrast did not ask for the maximum, and one who asked for soft contrast
     * is not asking for none.
     */
    const dark = POOL.find((c) => c.id === 'soko-zumi')!.color;
    // Two candidates either side of the two targets, matched in hue class so the temperature
    // half of the fit cannot be what decides the comparison.
    const nearTarget = POOL.find((c) => c.id === 'ko-men')!.color; // separation ~0.55
    const closeIn = POOL.find((c) => c.id === 'hoshi-nashi')!.color; // separation ~0.12

    const high = profile({ contrast: 'high' });
    const low = profile({ contrast: 'low' });
    expect(pairingFit(dark, 'top', nearTarget, 'trouser', high, RULES)).toBeGreaterThan(
      pairingFit(dark, 'top', closeIn, 'trouser', high, RULES),
    );
    expect(pairingFit(dark, 'top', closeIn, 'trouser', low, RULES)).toBeGreaterThan(
      pairingFit(dark, 'top', nearTarget, 'trouser', low, RULES),
    );
  });

  it('treats overshooting the target as a miss, and further past is worse', () => {
    /*
     * The property the test above discovered, asserted directly.
     *
     * THE TWO CANDIDATES ARE MATCHED IN CHROMA AND HUE ON PURPOSE. `pairingFit` is the mean of
     * separation and coherence, so a comparison between candidates whose coherence differs
     * measures both halves at once. The first draft used an off-white against a mid blue and
     * failed once `temperatureOf` landed — correctly: a near-neutral cannot clash with a
     * near-neutral garment, so the off-white's coherence rose enough to offset its worse
     * separation. Both candidates below are cool, both above `NEUTRAL_CHROMA`, six degrees
     * apart, so coherence cancels and only the separation is being compared.
     */
    const dark = POOL.find((c) => c.id === 'soko-zumi')!.color;
    const closerToTarget = POOL.find((c) => c.id === 'to-yama')!.color; // overshoots by ~0.10
    const furtherPast = POOL.find((c) => c.id === 'asa-kawa')!.color; // overshoots by ~0.17
    const high = profile({ contrast: 'high' });
    expect(pairingFit(dark, 'top', closerToTarget, 'trouser', high, RULES)).toBeGreaterThan(
      pairingFit(dark, 'top', furtherPast, 'trouser', high, RULES),
    );
  });

  it('penalises two large areas both carrying strong chroma, and not a shoe', () => {
    // A bright top with bright trousers competes; the same colour on a shoe does not. The
    // threshold is the person's OWN chroma tolerance, so somebody who wears strong colour is
    // not told their preference is a clash.
    const vivid = POOL.find((c) => c.id === 'mi-aka')!.color;
    const alsoVivid = POOL.find((c) => c.id === 'yama-moe')!.color;
    const modest = profile({ chroma: { min: 0, max: 0.08 } });
    const large = pairingFit(vivid, 'top', alsoVivid, 'trouser', modest, RULES);
    const small = pairingFit(vivid, 'top', alsoVivid, 'shoe', modest, RULES);
    expect(small).toBeGreaterThan(large);

    // The baseline: a person whose tolerance covers both is not penalised at all.
    const tolerant = profile({ chroma: { min: 0, max: 0.4 } });
    expect(pairingFit(vivid, 'top', alsoVivid, 'trouser', tolerant, RULES)).toBeGreaterThan(large);
  });
});

describe('how long it takes, and what that number is NOT', () => {
  it('reports a p95 over the real corpus, asserting nothing about NFR-4', () => {
    /*
     * NFR-4 says *recommendation p95 <= 200 ms*, "measured on the slowest device in the support
     * matrix rather than the fastest". THIS IS NOT THAT MEASUREMENT and must never be quoted as
     * one: it is a desktop, on Node, with the corpus already in memory.
     *
     * It is printed rather than asserted for the reason gate 12's own description gives — a
     * latency assertion on a shared runner flakes until somebody disables it, and a threshold
     * that passes trivially on fast hardware is worse than no threshold because it reads like
     * coverage. What is asserted about cost lives in the bounded-generation block above, where
     * `scored` is a number the engine reports rather than a duration the machine decides.
     *
     * The device measurement is F-030's attested criterion and gate 12's subject, and gate 12
     * activates with F-038 — which is blocked by this feature.
     */
    const runs = 200;
    const durations: number[] = [];
    for (let i = 0; i < runs; i += 1) {
      const started = performance.now();
      recommendOutfit(INPUT, POOL, profile(), RULES);
      durations.push(performance.now() - started);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(runs * 0.95)] ?? 0;
    const median = durations[Math.floor(runs * 0.5)] ?? 0;

    console.log(
      `  recommendOutfit over ${String(POOL.length)} candidates, ${String(runs)} runs: ` +
        `median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms ` +
        `(Node ${process.version}, desktop — NOT the NFR-4 measurement, which is on-device)`,
    );

    // The only assertion: it finished. A run that never returns is a defect this file can see.
    expect(durations).toHaveLength(runs);
    expect(p95).toBeGreaterThan(0);
  });
});

describe('the edges', () => {
  it('returns empty for an empty pool rather than throwing', () => {
    const result = recommendForSlot(INPUT, 'trouser', [], profile(), RULES);
    expect(result.ranked).toEqual([]);
    expect(result.alternatives).toEqual([]);
    expect(result.considered).toBe(0);
    expect(result.scored).toBe(0);
  });
});

/**
 * OKLCh lightness, through the engine.
 *
 * Imported rather than recomputed: a test that reimplemented the conversion it is checking
 * would agree with itself and with nothing else (E-008).
 */
function pairingLightness(color: Color): number {
  return xyzToOklch(color.xyz)[0];
}
