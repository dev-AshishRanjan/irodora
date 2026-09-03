/**
 * The outfit builder, and the assertion criterion 2 actually needs (FR-33, F-045).
 *
 * > *The same locked set and versions always regenerate the same candidates.*
 *
 * **"Call it twice and compare" does not test that.** It passes for an implementation that is
 * entirely order-dependent, and it passes for one that caches. What it checks is that the
 * function is not actively random, which was never in doubt — the engine is pure.
 *
 * The threat is the *app's* ordering. `sort` is stable, so two equally-scored garments come
 * back in **wardrobe order**, and the wardrobe's order changes the day somebody adds a jumper.
 * So the assertion here is the same locks over a **differently ordered wardrobe**, which is
 * the only version that can fail.
 */

import { ruleSet } from '../src/rules';
import { allEntries } from '../src/corpus';
import { colorOf } from '../src/wardrobe';
import { place, regenerate, setLocked, slotFor, type OutfitDraft } from '../src/outfit/builder';
import type { Profile } from '../src/profile/dimensions';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { parseWeightContent } from '@irodora/recommendation';

const weights = parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.test.json');
const rules = ruleSet();

/** The corpus as the reference set every component scores against. */
const reference = allEntries().map((e) => ({
  id: e.entry.slug,
  color: colorOf(rowOf(e.entry.slug)),
}));

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

/** `id` is the tie-break, so it is given explicitly rather than generated. */
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

const SLUGS = allEntries()
  .slice(0, 6)
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

const WARDROBE: readonly StoredGarment[] = [
  garment('g-01', 'jumper', SLUGS[0]!),
  garment('g-02', 'shirt', SLUGS[1]!),
  garment('g-03', 'trousers', SLUGS[2]!),
  garment('g-04', 'jeans', SLUGS[3]!),
  garment('g-05', 'shoes', SLUGS[4]!),
  garment('g-06', 'boots', SLUGS[5]!),
];

const run = (draft: OutfitDraft, wardrobe: readonly StoredGarment[] = WARDROBE) =>
  regenerate({ draft, wardrobe, profile: PROFILE, rules, weights, reference });

describe('which slot a garment fills', () => {
  it('reads the words people actually type', () => {
    expect(slotFor(garment('a', 'jumper', SLUGS[0]!))).toBe('top');
    expect(slotFor(garment('a', 'JEANS', SLUGS[0]!))).toBe('trouser');
    expect(slotFor(garment('a', '  boots  ', SLUGS[0]!))).toBe('shoe');
  });

  it('fills NO slot for a type nobody recognised', () => {
    // Not defaulted to `top`. A belt silently proposed as a shirt is worse than one the builder
    // does not offer, because the second is visible and the first is not.
    expect(slotFor(garment('a', 'belt', SLUGS[0]!))).toBeNull();
  });
});

describe('locking constrains generation', () => {
  it('proposes nothing for a locked slot', () => {
    const draft = setLocked(place([], 'top', WARDROBE[0]!), 'top', true);
    const proposals = run(draft);

    expect(proposals.map((p) => p.slot)).toEqual(['trouser', 'shoe']);
    expect(proposals.some((p) => p.slot === 'top')).toBe(false);
  });

  it('proposes for every slot when nothing is locked', () => {
    expect(run([]).map((p) => p.slot)).toEqual(['top', 'trouser', 'shoe']);
  });

  it('proposes nothing at all when everything is locked', () => {
    let draft: OutfitDraft = [];
    draft = setLocked(place(draft, 'top', WARDROBE[0]!), 'top', true);
    draft = setLocked(place(draft, 'trouser', WARDROBE[2]!), 'trouser', true);
    draft = setLocked(place(draft, 'shoe', WARDROBE[4]!), 'shoe', true);
    // An empty list, not a throw: "everything is decided" is a state, not an error.
    expect(run(draft)).toHaveLength(0);
  });

  it('does not treat an UNLOCKED placement as a constraint', () => {
    // The decoy for the first test. A regenerate that skipped any FILLED slot would pass it,
    // and would make the button unable to change its mind about anything.
    const draft = place([], 'top', WARDROBE[0]!);
    expect(run(draft).map((p) => p.slot)).toEqual(['top', 'trouser', 'shoe']);
  });
});

describe('determinism — criterion 2', () => {
  it('gives the same candidates over a DIFFERENTLY ORDERED wardrobe', () => {
    /*
     * THE ASSERTION THAT CAN FAIL. Calling regenerate twice on the same input passes for an
     * implementation that is entirely order-dependent; the wardrobe's order is what changes in
     * practice, every time somebody adds a garment.
     */
    const draft = setLocked(place([], 'top', WARDROBE[0]!), 'top', true);

    const forward = run(draft, WARDROBE);
    const reversed = run(draft, [...WARDROBE].reverse());

    expect(reversed.map((p) => p.ranked.map((r) => r.garment.id))).toEqual(
      forward.map((p) => p.ranked.map((r) => r.garment.id)),
    );
  });

  it('breaks a tie on id, not on arrival', () => {
    // Two garments in the SAME colour therefore score identically, so only the tie-break
    // decides. Without it `sort`'s stability returns them in wardrobe order.
    const same = [garment('g-zz', 'shoes', SLUGS[0]!), garment('g-aa', 'boots', SLUGS[0]!)];
    const forward = run([], same);
    const reversed = run([], [...same].reverse());

    const ids = (proposals: ReturnType<typeof run>) =>
      proposals.find((p) => p.slot === 'shoe')?.ranked.map((r) => r.garment.id);

    expect(ids(forward)).toEqual(['g-aa', 'g-zz']);
    expect(ids(reversed)).toEqual(['g-aa', 'g-zz']);
  });

  it('is stable across repeated calls too', () => {
    // Weaker than the two above and still worth having: it is the one that would catch a
    // cache keyed on something that moves.
    const draft = setLocked(place([], 'trouser', WARDROBE[2]!), 'trouser', true);
    expect(run(draft)).toEqual(run(draft));
  });
});

describe('what a proposal carries', () => {
  it('gives the whole score, never a bare number', () => {
    // F-031's criterion 2 at the surface: the overall is never present without its components,
    // and a builder that ranked on a number would make that unsatisfiable one layer up.
    const top = run([]).find((p) => p.slot === 'top')?.ranked[0];
    expect(top).toBeDefined();
    expect(top?.score.overall).toBeGreaterThanOrEqual(0);
    expect(top?.score.components.length).toBeGreaterThan(0);
    expect(top?.score.factors.length).toBe(top?.score.components.length);
  });

  it('scores the candidate WITH the locked garments, not alone', () => {
    /*
     * The whole design in one assertion. If the score ignored the locks, locking a different
     * top could not change how the trousers rank — and "compose slots, lock items, regenerate"
     * would be three controls over one fixed answer.
     */
    const withFirst = run(setLocked(place([], 'top', WARDROBE[0]!), 'top', true));
    const withSecond = run(setLocked(place([], 'top', WARDROBE[1]!), 'top', true));

    const trousers = (p: ReturnType<typeof run>) =>
      p.find((x) => x.slot === 'trouser')?.ranked.map((r) => r.score.overall);

    expect(trousers(withFirst)).not.toEqual(trousers(withSecond));
  });

  it('returns an empty ranking rather than crashing on an empty wardrobe', () => {
    const proposals = run([], []);
    expect(proposals.map((p) => p.slot)).toEqual(['top', 'trouser', 'shoe']);
    expect(proposals.every((p) => p.ranked.length === 0)).toBe(true);
  });
});
