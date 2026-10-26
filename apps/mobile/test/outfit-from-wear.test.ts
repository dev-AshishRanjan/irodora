/**
 * `07`'s *Save to Outfit Lab* (F-248, ADR-0152 D5, E-219): the combination is handed to the Lab once,
 * and the Lab opens with the owned garment of each slot nearest the combination's colour, the top
 * locked.
 *
 * Nearest is the engine's ΔE00, through `engine.ts`; a test that recomputed it would agree with the
 * module on the day it was written and never again, so the cases below are built where the answer is
 * known without arithmetic — a garment the very colour asked for, against garments of other colours.
 */

import { allEntries } from '../src/corpus';
import { differenceOklch } from '../src/engine';
import {
  labDraftFrom,
  offerCombination,
  takeCombination,
  type WornCombination,
} from '../src/outfit/fromWear';
import type { SavedColorRow, StoredGarment } from '@irodora/store';

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

const [P, Q, R, S] = allEntries().map((e) => e.entry.slug) as [string, string, string, string];

describe('the Lab opens with the owned garment nearest each colour (E-219)', () => {
  it('fills each slot with the garment of that slot nearest the colour, and locks the top', () => {
    const wardrobe = [
      garment('t-far', 'shirt', Q),
      garment('t-same', 'shirt', P),
      garment('b-same', 'trousers', R),
      garment('b-far', 'jeans', P),
      garment('s-same', 'boots', S),
    ];
    const draft = labDraftFrom({ top: P, trouser: R, shoe: S }, wardrobe);
    expect(draft.map((p) => [p.slot, p.garment.id, p.locked])).toStrictEqual([
      ['top', 't-same', true],
      ['trouser', 'b-same', false],
      ['shoe', 's-same', false],
    ]);
  });

  it('DECOY: the garments chosen above are genuinely nearer than the ones passed over', () => {
    // Without this, the case above would pass with a module that took each slot's FIRST garment
    // whenever the wardrobe happened to list the right one first.
    const oklch = (slug: string) => allEntries().find((e) => e.entry.slug === slug)!.derived.oklch;
    expect(differenceOklch(oklch(P), oklch(Q))).toBeGreaterThan(0);
    expect(differenceOklch(oklch(R), oklch(P))).toBeGreaterThan(0);
    const reversed = labDraftFrom({ top: P, trouser: R, shoe: null }, [
      garment('t-same', 'shirt', P),
      garment('t-far', 'shirt', Q),
    ]);
    expect(reversed.map((p) => p.garment.id)).toStrictEqual(['t-same']);
  });

  it('breaks a tie on the earlier garment id, whatever order the wardrobe lists them in', () => {
    const twins = [garment('b', 'shirt', P), garment('a', 'shirt', P)];
    for (const wardrobe of [twins, [...twins].reverse()])
      expect(labDraftFrom({ top: P, trouser: null, shoe: null }, wardrobe)[0]?.garment.id).toBe(
        'a',
      );
  });

  it('leaves a slot empty when nothing owned fills it, or the combination has no colour for it', () => {
    const draft = labDraftFrom({ top: P, trouser: null, shoe: S }, [
      garment('t', 'shirt', P),
      garment('b', 'trousers', R),
    ]);
    // No shoes owned, and no trouser colour handed over: only the top.
    expect(draft.map((p) => p.slot)).toStrictEqual(['top']);
    expect(labDraftFrom({ top: P, trouser: R, shoe: S }, [])).toStrictEqual([]);
  });

  it('a colour this corpus does not hold places nothing', () => {
    expect(
      labDraftFrom({ top: 'no-such-colour', trouser: null, shoe: null }, [
        garment('t', 'shirt', P),
      ]),
    ).toStrictEqual([]);
  });
});

describe('the hand-off is taken once', () => {
  const COMBINATION: WornCombination = { top: P, trouser: R, shoe: S };

  afterEach(() => {
    takeCombination();
  });

  it('gives the Lab the combination offered', () => {
    offerCombination(COMBINATION);
    expect(takeCombination()).toStrictEqual(COMBINATION);
  });

  it('DECOY: a second take finds the box empty, so a Lab opened later starts as it always has', () => {
    offerCombination(COMBINATION);
    takeCombination();
    expect(takeCombination()).toBeNull();
  });

  it('a second offer before the Lab takes the first replaces it', () => {
    offerCombination(COMBINATION);
    offerCombination({ ...COMBINATION, shoe: null });
    expect(takeCombination()?.shoe).toBeNull();
  });
});
