/**
 * The wardrobe as `coverage()` reads it, assembled once (F-242, ADR-0138 D6, E-208).
 *
 * - **The garments it counts** are those that fill an outfit slot; a garment with none is left out,
 *   which the decoy shows by adding one.
 * - **The context is the four things the Wardrobe route assembled inline** — the profile, the rule
 *   set, the weights and the corpus as a reference — so a count through it equals one through a
 *   context written out by hand here, the oracle.
 * - **Without a profile there is no context**, so no screen prints a count it never computed.
 * - **No route assembles its own**: read from source, as `lookbook.test` reads the Wardrobe route.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coverage, type CoverageGarment } from '@irodora/optimization';
import { outfitWeights, parseWeightContent } from '@irodora/recommendation';
import type { SavedColorRow, StoredGarment, StoredPersonalProfile } from '@irodora/store';
import { allEntries } from '../src/corpus';
import { engineProfile, slotFor } from '../src/outfit/builder';
import { toWorking } from '../src/profile/store';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { colorOf } from '../src/wardrobe';
import { coverageContext, placeableGarments } from '../src/wardrobe/coverage';
import { referenceSet } from '../src/wardrobe/reference';

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

const SLUGS = allEntries()
  .slice(0, 6)
  .map((e) => e.entry.slug);
const slug = (i: number): string => {
  const s = SLUGS[i];
  if (s === undefined) throw new Error(`no slug ${String(i)}`);
  return s;
};

const WARDROBE = [
  garment('g-01', 'jumper', slug(0)),
  garment('g-02', 'shirt', slug(1)),
  garment('g-03', 'trousers', slug(2)),
  garment('g-04', 'jeans', slug(3)),
  garment('g-05', 'shoes', slug(4)),
  garment('g-06', 'boots', slug(5)),
];

const STORED: StoredPersonalProfile = {
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
  createdAt: 1,
  updatedAt: 2,
  deletedAt: null,
};

describe('the garments coverage counts', () => {
  it('are those that fill an outfit slot, with their colours', () => {
    const placed = placeableGarments(WARDROBE);
    expect(placed.map((g) => g.id)).toStrictEqual(WARDROBE.map((g) => g.id));
    for (const p of placed) {
      const g = WARDROBE.find((w) => w.id === p.id);
      expect(p.slot).toBe(g === undefined ? null : slotFor(g));
      expect(p.color).toStrictEqual(colorOf(g?.color ?? rowOf(slug(0))));
    }
  });

  it('DECOY — a garment that fills no slot is left out', () => {
    const odd = garment('g-07', 'umbrella', slug(0));
    expect(slotFor(odd)).toBeNull();
    expect(placeableGarments([...WARDROBE, odd]).map((g) => g.id)).not.toContain('g-07');
  });
});

describe('the context a valid outfit is counted against', () => {
  it('is undefined without a stored profile', () => {
    expect(coverageContext(null)).toBeUndefined();
  });

  it('counts what a context written out by hand counts (the oracle)', () => {
    const context = coverageContext(STORED);
    if (context === undefined) throw new Error('a profile gives a context');
    const oracle = {
      profile: engineProfile(toWorking(STORED)),
      rules: ruleSet(),
      weights: outfitWeights(parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json')),
      reference: referenceSet(),
    };
    const placed: readonly CoverageGarment[] = placeableGarments(WARDROBE);
    const ours = coverage(placed, context);
    const theirs = coverage(placed, oracle);
    expect(ours.valid).toBe(theirs.valid);
    expect([...ours.combinations].sort()).toStrictEqual([...theirs.combinations].sort());
    // The fixture makes outfits to count, so equality above is not two zeros.
    expect(ours.valid).toBeGreaterThan(0);
  });
});

describe('no route assembles a context of its own (E-208)', () => {
  const source = (path: string): string =>
    readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');

  it('the Wardrobe route takes it from src/wardrobe/coverage.ts', () => {
    const route = source('app/(tabs)/wardrobe/index.tsx');
    expect(route).toContain('coverageContext(');
    expect(route).toContain('placeableGarments(');
    for (const own of ['engineProfile(', 'referenceSet(', 'parseWeightContent('])
      expect(route).not.toContain(own);
  });

  it('DECOY — the shopping route still assembles its own, so the read can see one', () => {
    expect(source('app/(tabs)/wardrobe/shopping.tsx')).toContain('referenceSet(');
  });
});
