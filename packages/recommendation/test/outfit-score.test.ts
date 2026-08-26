/**
 * Six component scores and an overall, and the three things F-031 has to be true about them.
 *
 * The hardest to test honestly is **discrimination**. "Every component returns a number in
 * [0,100]" is satisfied by six functions that return 50, so every component here is asserted in
 * **both directions** — an outfit that should score well on it must beat one that should score
 * badly, and the pairing must reverse where the component says it should
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromXyz, type Color } from '@irodora/color-core';
import {
  OUTFIT_COMPONENTS,
  OUTFIT_MESSAGE_KEYS,
  outfitWeights,
  parseWeightContent,
  ruleSetFor,
  scoreOutfit,
  type Candidate,
  type OutfitPiece,
  type PersonalProfile,
  type RuleSet,
} from '../src/index.js';

/* Paths written out in full — `verify-cache-scope.mjs` resolves a read statically, and a shared
 * constant reduces what it can see to the directory (F-030 found that the hard way). */
const CONTENT_2 = parseWeightContent(
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.2.json'),
      'utf8',
    ),
  ),
  'weights.2026.08.2.json',
);
const CONTENT_1 = parseWeightContent(
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.1.json'),
      'utf8',
    ),
  ),
  'weights.2026.08.1.json',
);

const RULES: RuleSet = ruleSetFor(CONTENT_2, 'default');
const WEIGHTS = outfitWeights(CONTENT_2);

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
    color: fromXyz([e.entry.color.xyz.x, e.entry.color.xyz.y, e.entry.color.xyz.z], {
      source: 'reference',
      confidence: 1,
      originSpace: 'oklch',
    }),
  }));
})();

const colourOf = (slug: string): Color => {
  const found = POOL.find((c) => c.id === slug);
  if (found === undefined) throw new Error(`${slug} is not in the published corpus`);
  return found.color;
};

const profile = (over: Partial<PersonalProfile> = {}): PersonalProfile => ({
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 0.5,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75 },
  ...over,
});

const outfit = (top: string, trouser: string, shoe: string): OutfitPiece[] => [
  { slot: 'top', color: colourOf(top) },
  { slot: 'trouser', color: colourOf(trouser) },
  { slot: 'shoe', color: colourOf(shoe) },
];

const score = (pieces: OutfitPiece[], p: PersonalProfile = profile()) =>
  scoreOutfit(pieces, POOL, p, RULES, WEIGHTS);

const componentOf = (pieces: OutfitPiece[], name: string, p: PersonalProfile = profile()): number =>
  score(pieces, p).components.find((c) => c.component === name)?.score ?? -1;

/** A considered, coherent outfit: warm earths at three lightnesses. */
const COHERENT = outfit('aka-tsuchi', 'furu-kawa', 'kuro-tsuchi');
/** Colours pulled from opposite ends of every axis. */
const SCATTERED = outfit('mi-aka', 'fuka-mizu', 'ina-ho');

describe('all six components, and an overall (criterion 1)', () => {
  const result = score(COHERENT);

  it('returns every component FR-32 names, in a fixed order', () => {
    expect(result.components.map((c) => c.component)).toEqual([...OUTFIT_COMPONENTS]);
    expect(result.components).toHaveLength(6);
  });

  it('scores each in [0,100], as an integer', () => {
    for (const component of result.components) {
      expect(component.score).toBeGreaterThanOrEqual(0);
      expect(component.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(component.score)).toBe(true);
    }
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('records the rule version the whole set was produced under', () => {
    expect(result.rulesVersion).toBe('2026.08.2');
  });

  it('is a pure function of its inputs', () => {
    expect(score(COHERENT)).toEqual(score(COHERENT));
  });
});

describe('the overall never replaces the six (criterion 2)', () => {
  it('cannot be returned without them — every result carries all six', () => {
    // Structural rather than conventional: there is no shape of `OutfitScore` that has an
    // `overall` and no `components`, and both branches below produce the full set.
    for (const pieces of [COHERENT, SCATTERED, [COHERENT[0]!]])
      expect(score(pieces).components).toHaveLength(OUTFIT_COMPONENTS.length);
  });

  it('names every component in its OWN decomposition', () => {
    // "Why is it 71?" has to be answerable from the object. A factor list missing a component
    // would hide the one that pulled the number down, which is the only reason to look.
    const result = score(COHERENT);
    expect(result.factors.map((f) => f.component)).toEqual([...OUTFIT_COMPONENTS]);
    for (const factor of result.factors) {
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.contribution).toBeGreaterThanOrEqual(0);
    }
  });

  it('sums to the overall shown beside it', () => {
    const result = score(COHERENT);
    expect(result.overall).toBe(Math.round(result.factors.reduce((n, f) => n + f.contribution, 0)));
  });
});

describe('every score carries its decomposition, as data (criterion 3, FR-11)', () => {
  const KEY = /^[a-z]+(?:\.[a-zA-Z]+)+$/u;

  it('gives each component a direction and a message key, never a sentence', () => {
    for (const component of score(COHERENT).components) {
      expect(['supports', 'opposes', 'neutral']).toContain(component.direction);
      expect(component.messageKey).toMatch(KEY);
      expect(OUTFIT_MESSAGE_KEYS).toContain(component.messageKey);
    }
  });

  it('DECOY — the key shape rejects prose', () => {
    expect(KEY.test('These colours work well together.')).toBe(false);
    expect(KEY.test('outfit.harmony.supports')).toBe(true);
  });

  it('carries numeric evidence, so the number can be disagreed with', () => {
    // Values are numbers, deliberately: `evidence` must not become a place an untranslated
    // English word escapes the engine.
    for (const component of score(COHERENT).components) {
      expect(Object.keys(component.evidence).length).toBeGreaterThan(0);
      for (const value of Object.values(component.evidence)) expect(typeof value).toBe('number');
    }
  });

  it('declares every key it can emit', () => {
    expect(OUTFIT_MESSAGE_KEYS).toHaveLength(OUTFIT_COMPONENTS.length * 3);
    expect(new Set(OUTFIT_MESSAGE_KEYS).size).toBe(OUTFIT_MESSAGE_KEYS.length);
  });
});

describe('each component reads its input — both directions', () => {
  it('harmony: a coherent temperature beats a scattered one', () => {
    expect(componentOf(COHERENT, 'harmony')).toBeGreaterThan(componentOf(SCATTERED, 'harmony'));
  });

  it('personalFit: an outfit inside the profile beats one outside it', () => {
    const suits = profile({ lightness: { min: 0.2, max: 0.8 }, temperatureBias: 1 });
    const doesNot = profile({ lightness: { min: 0.9, max: 0.95 }, temperatureBias: -1 });
    expect(componentOf(COHERENT, 'personalFit', suits)).toBeGreaterThan(
      componentOf(COHERENT, 'personalFit', doesNot),
    );
  });

  it('personalFit: area-weighted, so a shoe matters less than a top', () => {
    /*
     * The assertion that earns `SLOT_AREA`'s magnitudes. Putting the badly-suited colour on the
     * SHOE must cost less than putting it on the TROUSER, which covers three times the area.
     * An unweighted mean would score these two identically.
     */
    const p = profile({ lightness: { min: 0.55, max: 0.8 }, temperatureBias: 1 });
    const badOnShoe = outfit('aka-tsuchi', 'kari-ato', 'fuka-mizu');
    const badOnTrouser = outfit('aka-tsuchi', 'fuka-mizu', 'kari-ato');
    expect(componentOf(badOnShoe, 'personalFit', p)).toBeGreaterThan(
      componentOf(badOnTrouser, 'personalFit', p),
    );
  });

  it('contrast: the preference decides, in both directions', () => {
    const close = outfit('yu-dachi', 'fuka-moya', 'yoru-kawa');
    const spread = outfit('soko-zumi', 'yu-dachi', 'usu-gami');
    expect(componentOf(close, 'contrast', profile({ contrast: 'low' }))).toBeGreaterThan(
      componentOf(spread, 'contrast', profile({ contrast: 'low' })),
    );
    expect(componentOf(spread, 'contrast', profile({ contrast: 'high' }))).toBeGreaterThan(
      componentOf(close, 'contrast', profile({ contrast: 'high' })),
    );
  });

  it('corpusAffinity: corpus colours beat colours the corpus does not have', () => {
    // A magenta and a lime are nowhere near a corpus of Japanese earths, indigos and greys.
    const foreign: OutfitPiece[] = [
      {
        slot: 'top',
        color: fromXyz([0.35, 0.18, 0.55], {
          source: 'declared',
          confidence: 1,
          originSpace: 'oklch',
        }),
      },
      {
        slot: 'trouser',
        color: fromXyz([0.3, 0.55, 0.1], {
          source: 'declared',
          confidence: 1,
          originSpace: 'oklch',
        }),
      },
    ];
    expect(componentOf(COHERENT, 'corpusAffinity')).toBeGreaterThan(
      componentOf(foreign, 'corpusAffinity'),
    );
  });

  it('corpusAffinity: an EMPTY reference set scores 50, not 100', () => {
    // A distance to nothing is not a perfect distance. This is the branch a caller who forgot
    // to pass the corpus would otherwise never notice.
    const withoutReference = scoreOutfit(COHERENT, [], profile(), RULES, WEIGHTS);
    const affinity = withoutReference.components.find((c) => c.component === 'corpusAffinity');
    expect(affinity?.score).toBe(50);
    expect(affinity?.evidence['references']).toBe(0);
  });

  it('versatility: a neutral anchor beats a saturated one', () => {
    /*
     * THIS TEST FOUND A REAL DEFECT AND KEPT ITS NAME. With versatility built on `pairingFit`,
     * a warm grey scored 62 and a vivid red 63 — and probing the corpus showed `mi-aka`, the
     * most saturated red in it, ranked MOST versatile at 73.3%. The separation term dominated,
     * so the component was measuring lightness centrality and scoring the same property as
     * `contrast` twice over.
     *
     * It reads `pairingCoherence` now: temperature agreement and chroma competition, without
     * separation. That is what "goes with a lot of things" means.
     */
    const neutral = outfit('hai-suna', 'fuyu-tsuchi', 'yaki-sugi');
    const loud = outfit('mi-aka', 'yama-moe', 'aki-yu');
    expect(componentOf(neutral, 'versatility')).toBeGreaterThan(componentOf(loud, 'versatility'));
  });

  it('cvdAccessibility: two colours a deutan cannot separate score below two they can', () => {
    /*
     * The one component resting on a published model rather than a convention. A red and a
     * green of similar lightness collapse under deutan simulation; a near-black and a
     * near-white survive every deficiency.
     */
    // MEASURED, not assumed. The first draft used a red and a green and FAILED — both scored
    // 100, because those two differ in lightness and `separationScore` weights that. The pair
    // below is the hardest in the whole corpus by the model's own reckoning (0.68 of 100), found
    // by asking it rather than by reasoning about hue.
    const collapses = [
      { slot: 'top' as const, color: colourOf('kawaki-suna') },
      { slot: 'trouser' as const, color: colourOf('usu-shiba') },
    ];
    const survives = [
      { slot: 'top' as const, color: colourOf('soko-zumi') },
      { slot: 'trouser' as const, color: colourOf('usu-gami') },
    ];
    expect(componentOf(survives, 'cvdAccessibility')).toBeGreaterThan(
      componentOf(collapses, 'cvdAccessibility'),
    );
  });

  it('cvdAccessibility: takes the WORST pair, not the mean', () => {
    // An outfit where one pair vanishes is not rescued by two that survive, and a mean would
    // report exactly that.
    const oneBadPair = [
      { slot: 'top' as const, color: colourOf('kawaki-suna') },
      { slot: 'trouser' as const, color: colourOf('usu-shiba') },
      { slot: 'shoe' as const, color: colourOf('soko-zumi') },
    ];
    const justTheBadPair = oneBadPair.slice(0, 2);
    expect(componentOf(oneBadPair, 'cvdAccessibility')).toBe(
      componentOf(justTheBadPair, 'cvdAccessibility'),
    );
  });
});

describe('the outfit weights are content', () => {
  it('come from the published file and sum to 1', () => {
    const total = OUTFIT_COMPONENTS.reduce((n, c) => n + WEIGHTS[c], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('carry a rationale each, and the ledger counts them', () => {
    expect(CONTENT_2.outfit).not.toBeNull();
    for (const component of OUTFIT_COMPONENTS)
      expect(CONTENT_2.outfit?.[component].rationale.length ?? 0).toBeGreaterThan(20);
  });

  it('REFUSE to be invented for a version that predates them', () => {
    /*
     * 2026.08.1 was published before outfit scoring existed and is immutable. Asking it for
     * outfit weights must throw naming the version — not fall back to a number nobody
     * published, which would make "scored under 2026.08.1" and "scored under weights we made
     * up" the same sentence on a screen whose whole proposition is explainability.
     */
    expect(CONTENT_1.outfit).toBeNull();
    expect(() => outfitWeights(CONTENT_1)).toThrow(/2026\.08\.1 carry no outfit block/u);
  });

  it('and the older version still PARSES — immutability is not a licence to break it', () => {
    // The baseline for the refusal above: 2026.08.1 is still valid content, still checked by
    // gate 11, and still usable for everything it was published for.
    expect(CONTENT_1.versionId).toBe('2026.08.1');
    expect(CONTENT_1.occasions).toHaveLength(5);
    expect(ruleSetFor(CONTENT_1, 'office').weights.contrast).toBeGreaterThan(0);
  });
});
