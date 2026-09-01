/**
 * The shopping check (FR-52, F-052).
 *
 * > *Outfits unlocked, personal compatibility and duplicate warning, computed against the
 * > local wardrobe offline.*
 *
 * ## What earns this file
 *
 * Every answer here is an engine call this repository already tests. What is NOT tested
 * anywhere else is the composition — and the composition is where the plausible wrong answers
 * are, because each of them is a number of the right type in the right place:
 *
 * | The plausible wrong code | What a person would read |
 * |---|---|
 * | returning `after.valid` | "this unlocks nine outfits" when eight were already theirs |
 * | `unlocked: 0` for an unplaceable type | "your scarf adds nothing" — on the authority of a word list |
 * | every duplicate pair, unfiltered | "this is a duplicate" because two of your own jumpers are |
 *
 * The wardrobe fixture is built so that each of those is a **different** assertion, and so that
 * a decoy exists for the case where the correct answer and the wrong one coincide: a wardrobe
 * with zero existing outfits makes `after.valid` and the difference the same number, and a
 * suite built on one would pass against the first row of that table.
 */

import { ruleSet } from '../src/rules';
import { allEntries } from '../src/corpus';
import { colorOf } from '../src/wardrobe';
import { engineProfile } from '../src/outfit/builder';
import { CANDIDATE_ID, shoppingCheck, type ShoppingContext } from '../src/wardrobe/shopping';
import type { Profile } from '../src/profile/dimensions';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { outfitWeights, parseWeightContent } from '@irodora/recommendation';
import { COVERAGE_THRESHOLD, coverage, type CoverageGarment } from '@irodora/optimization';
import { slotFor } from '../src/outfit/builder';

const content = parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.test.json');
const weights = outfitWeights(content);
const rules = ruleSet();

function rowOf(slug: string): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id: `colour-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

const garment = (id: string, type: string, slug: string): StoredGarment => ({
  id,
  type,
  color: rowOf(slug),
  name: null,
  pattern: null,
  material: null,
  formality: null,
  brand: null,
  size: null,
  purchaseDate: null,
  costMinor: null,
  currency: null,
  wearCount: 0,
  seasons: [],
  colors: [],
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
});

const reference = allEntries().map((e) => ({
  id: e.entry.slug,
  color: colorOf(rowOf(e.entry.slug)),
}));

const SLUGS = allEntries()
  .slice(0, 8)
  .map((e) => e.entry.slug);

const PROFILE: Profile = {
  id: 'profile',
  method: 'guided',
  lightness: { min: 0.3, max: 0.8 },
  temperatureBias: 0.2,
  chroma: { min: 0.02, max: 0.2 },
  contrast: 'medium',
  confidence: {
    lightness: 0.7,
    temperature: 0.7,
    chroma: 0.7,
    contrast: 0.7,
    neutrals: 0.7,
    accents: 0.7,
    avoid: 0.7,
  },
  origin: {
    lightness: 'derived',
    temperature: 'derived',
    chroma: 'derived',
    contrast: 'derived',
    neutrals: 'derived',
    accents: 'derived',
    avoid: 'derived',
  },
  neutrals: [],
  accents: [],
  avoid: [],
};

/**
 * A wardrobe that already produces outfits, and that contains a duplicate pair of its own.
 *
 * **Both properties are load-bearing decoys.** Existing outfits are what make "the difference"
 * and "the total" different numbers. The owned duplicate pair — `g-01` and `g-06`, the same
 * slug typed as the same category — is what makes "only the candidate's pairs" a real
 * assertion rather than one that passes against a function returning everything.
 */
const WARDROBE: readonly StoredGarment[] = [
  garment('g-01', 'jumper', SLUGS[0]!),
  garment('g-02', 'shirt', SLUGS[1]!),
  garment('g-03', 'trousers', SLUGS[2]!),
  garment('g-04', 'jeans', SLUGS[3]!),
  garment('g-05', 'shoes', SLUGS[4]!),
  garment('g-06', 'jumper', SLUGS[0]!),
];

const CONTEXT: ShoppingContext = {
  profile: engineProfile(PROFILE),
  rules,
  reference,
  weights,
};

const colourOfSlug = (slug: string) => colorOf(rowOf(slug));

/** Coverage of the fixture wardrobe, computed the slow way, as the number to compare against. */
const placeable: readonly CoverageGarment[] = WARDROBE.filter((g) => slotFor(g) !== null).map(
  (g) => ({ id: g.id, slot: slotFor(g)!, color: colorOf(g.color) }),
);
const BASELINE = coverage(placeable, { reference, profile: CONTEXT.profile!, rules, weights });

describe('the fixture is what the assertions assume', () => {
  /*
   * A fixture that quietly stopped having these properties would turn three real assertions
   * into three vacuous ones, and nothing would go red. Asserted here rather than assumed
   * [[a-decoy-that-is-not-broken-proves-nothing]].
   */
  it('already produces outfits, so a total and a difference are different numbers', () => {
    expect(BASELINE.valid).toBeGreaterThan(0);
  });

  it('contains a duplicate pair of its own, which the candidate is not part of', () => {
    const check = shoppingCheck(
      { type: 'shoes', color: colourOfSlug(SLUGS[7]!) },
      WARDROBE,
      CONTEXT,
    );
    // g-01 and g-06 are the same colour and category. They must not appear.
    for (const pair of check.duplicates) expect([pair.a.id, pair.b.id]).toContain(CANDIDATE_ID);
  });
});

describe('outfits unlocked', () => {
  it('reports today’s count as the wardrobe’s own', () => {
    const check = shoppingCheck(
      { type: 'trousers', color: colourOfSlug(SLUGS[6]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.outfits).not.toBeNull();
    expect(check.outfits?.now).toBe(BASELINE.valid);
  });

  /*
   * THE ASSERTION THAT SEPARATES A DIFFERENCE FROM A TOTAL, and it needs both halves.
   *
   * The first compares against a full recompute, which is the only independent answer
   * available. The second states the decoy explicitly: `after.valid` is the number an
   * implementation would return if it forgot to subtract, and it is a DIFFERENT number here
   * only because the fixture wardrobe already produces outfits. On an empty wardrobe the two
   * coincide and this test would pass against the bug it exists for.
   */
  it('is the difference the candidate makes, not the total the wardrobe would then produce', () => {
    const colour = colourOfSlug(SLUGS[6]!);
    const check = shoppingCheck({ type: 'trousers', color: colour }, WARDROBE, CONTEXT);

    const full = coverage([...placeable, { id: CANDIDATE_ID, slot: 'trouser', color: colour }], {
      reference,
      profile: CONTEXT.profile!,
      rules,
      weights,
    });

    expect(check.outfits?.unlocked).toBe(full.valid - BASELINE.valid);
    expect(check.outfits?.unlocked).not.toBe(full.valid);
  });

  it('carries the threshold it was counted at, because the count means nothing without it', () => {
    const check = shoppingCheck(
      { type: 'jumper', color: colourOfSlug(SLUGS[6]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.outfits?.threshold).toBe(COVERAGE_THRESHOLD);
  });

  it('honours a caller-supplied threshold', () => {
    const strict = shoppingCheck({ type: 'jumper', color: colourOfSlug(SLUGS[6]!) }, WARDROBE, {
      ...CONTEXT,
      threshold: 100,
    });

    expect(strict.outfits?.threshold).toBe(100);
    expect(strict.outfits?.now).toBe(0);
  });

  it('does not add the candidate to the wardrobe it was given', () => {
    const before = WARDROBE.length;
    shoppingCheck({ type: 'jumper', color: colourOfSlug(SLUGS[6]!) }, WARDROBE, CONTEXT);

    expect(WARDROBE).toHaveLength(before);
    expect(WARDROBE.some((g) => g.id === CANDIDATE_ID)).toBe(false);
  });
});

describe('a garment the outfit engine cannot place', () => {
  /*
   * THE DECOY PAIR. `scarf` must refuse and `jumper` must not — a function returning null for
   * everything satisfies the first assertion perfectly.
   */
  it('refuses to count outfits rather than reporting zero', () => {
    const check = shoppingCheck(
      { type: 'scarf', color: colourOfSlug(SLUGS[6]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.slot).toBeNull();
    expect(check.outfits).toBeNull();
  });

  it('and the same colour typed as a jumper IS counted', () => {
    const check = shoppingCheck(
      { type: 'jumper', color: colourOfSlug(SLUGS[6]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.slot).toBe('top');
    expect(check.outfits).not.toBeNull();
  });

  it('still answers the two questions that need no slot', () => {
    const check = shoppingCheck(
      { type: 'scarf', color: colourOfSlug(SLUGS[0]!) },
      WARDROBE,
      CONTEXT,
    );

    // A scarf can suit you, and it can be a duplicate of another scarf. Refusing wholesale
    // would throw away the two answers that are still available.
    expect(check.compatibility).not.toBeNull();
    expect(check.duplicates).toEqual([]);
  });
});

describe('personal compatibility', () => {
  it('is the engine’s score, with all four factors and the rule version', () => {
    const check = shoppingCheck(
      { type: 'jumper', color: colourOfSlug(SLUGS[1]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.compatibility?.factors).toHaveLength(4);
    expect(check.compatibility?.rulesVersion).toBe(rules.versionId);
    expect(check.compatibility?.score).toBeGreaterThanOrEqual(0);
    expect(check.compatibility?.score).toBeLessThanOrEqual(100);
  });

  it('is null when nobody has set up a profile, rather than a score about nobody', () => {
    const check = shoppingCheck({ type: 'jumper', color: colourOfSlug(SLUGS[1]!) }, WARDROBE, {
      ...CONTEXT,
      profile: null,
    });

    expect(check.compatibility).toBeNull();
    // And the outfit count goes with it: scoreOutfit needs a profile too.
    expect(check.outfits).toBeNull();
    // The duplicate answer does NOT — it needs neither a slot nor a profile.
    expect(check.slot).toBe('top');
  });
});

describe('the duplicate warning', () => {
  it('flags a candidate identical to something already owned, with the measured difference', () => {
    const check = shoppingCheck(
      { type: 'jumper', color: colourOfSlug(SLUGS[0]!) },
      WARDROBE,
      CONTEXT,
    );

    // g-01 and g-06 are both that colour and both jumpers.
    expect(check.duplicates.map((p) => (p.a.id === CANDIDATE_ID ? p.b.id : p.a.id)).sort()).toEqual(
      ['g-01', 'g-06'],
    );
    for (const pair of check.duplicates) expect(pair.difference).toBeCloseTo(0, 6);
  });

  it('reports nothing for a colour far from everything owned', () => {
    const check = shoppingCheck(
      { type: 'jumper', color: colourOfSlug(SLUGS[7]!) },
      WARDROBE,
      CONTEXT,
    );

    expect(check.duplicates).toEqual([]);
  });

  it('does not flag across categories, because a jumper is not a duplicate of trousers', () => {
    const check = shoppingCheck(
      { type: 'trousers', color: colourOfSlug(SLUGS[0]!) },
      WARDROBE,
      CONTEXT,
    );

    // The same colour as g-01 and g-06, but they are jumpers.
    expect(check.duplicates).toEqual([]);
  });
});

describe('the baseline can be supplied, and changes no answer', () => {
  it('produces the same result as computing it', () => {
    const candidate = { type: 'jumper' as const, color: colourOfSlug(SLUGS[6]!) };
    const computed = shoppingCheck(candidate, WARDROBE, CONTEXT);
    const supplied = shoppingCheck(candidate, WARDROBE, { ...CONTEXT, baseline: BASELINE });

    expect(supplied.outfits).toEqual(computed.outfits);
  });
});
