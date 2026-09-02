/**
 * The wardrobe grouped by colour (FR-41, F-122).
 *
 * > *Colour grouping uses perceptual distance, not hex string sorting.*
 *
 * ## The fixture has to be able to tell the two apart
 *
 * A wardrobe built entirely from corpus picks rates **grouping by `corpus_slug`** and **grouping
 * by perceptual distance** identically — every garment has a slug, and the slug's own entry is
 * the nearest one to itself. So the fixture carries a **Lens-captured** garment, whose
 * `corpus_slug` is `null`, and a slug-based implementation leaves it ungrouped
 * [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
 *
 * And the insertion order is deliberately not the expected order, or the ordering assertions
 * would pass for a function that returns its input.
 */

import { allEntries } from '../src/corpus';
import {
  familyOf,
  filterGarments,
  filterOptions,
  groupByColour,
  NO_FILTER,
  textPatch,
  UNGROUPED,
  type WardrobeFilter,
} from '../src/wardrobe/browse';
import type { GarmentSeason, SavedColorRow, StoredGarment } from '@irodora/store';

/** A stored colour row for a published entry. Reference-sourced, so it owes no conditions. */
function rowOf(slug: string, id = `c-${slug}`): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id,
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

/**
 * The same colour as a **camera capture**: no `corpus_slug`, and the four conditions ADR-0005
 * requires of an estimate.
 */
function capturedRow(slug: string, id: string): SavedColorRow {
  return {
    ...rowOf(slug, id),
    name: '#000000',
    source: 'estimated',
    confidence: 0.7,
    corpus_slug: null,
    capture_illuminant: 'daylight',
    capture_quality: 'good',
    capture_samples: 4096,
    capture_variance: 0.004,
  };
}

const garment = (id: string, color: SavedColorRow): StoredGarment => ({
  id,
  type: 'jumper',
  color,
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
  .slice(0, 12)
  .map((e) => e.entry.slug);

describe('a garment belongs to the family it is nearest to', () => {
  it('gives a corpus-picked garment the family of its own entry', () => {
    const slug = SLUGS[0]!;
    const published = allEntries().find((e) => e.entry.slug === slug)!;

    expect(familyOf(garment('g', rowOf(slug)))).toBe(published.entry.taxonomy.family);
  });

  /*
   * THE DECOY FOR A SLUG-BASED IMPLEMENTATION. A camera capture has no `corpus_slug` at all, so
   * an implementation that grouped by slug leaves this ungrouped — and every corpus-picked
   * garment in this file would still pass.
   */
  it('gives a CAPTURED garment a family too, though it has no slug', () => {
    const slug = SLUGS[0]!;
    const captured = capturedRow(slug, 'captured');

    expect(captured.corpus_slug).toBeNull();
    expect(familyOf(garment('g', captured))).toBe(familyOf(garment('h', rowOf(slug))));
  });
});

describe('the groups', () => {
  /*
   * Insertion order is deliberately NOT the expected order: two garments of one family are
   * separated by a garment of another, so a function that returned its input unchanged would
   * fail rather than pass.
   */
  const wardrobe = (() => {
    const bySlug = new Map(allEntries().map((e) => [e.entry.slug, e.entry.taxonomy.family]));
    const first = SLUGS.find((s) => bySlug.get(s) !== undefined)!;
    const other = SLUGS.find((s) => bySlug.get(s) !== bySlug.get(first))!;
    const alsoFirst = SLUGS.find((s) => s !== first && bySlug.get(s) === bySlug.get(first));
    return {
      first,
      other,
      alsoFirst,
      garments: [
        garment('a', rowOf(first)),
        garment('b', rowOf(other)),
        garment('c', rowOf(alsoFirst ?? first, 'c-dup')),
      ],
    };
  })();

  it('collects every garment, and loses none', () => {
    const groups = groupByColour(wardrobe.garments);
    const total = groups.reduce((n, g) => n + g.garments.length, 0);

    expect(total).toBe(wardrobe.garments.length);
  });

  it('puts two garments of one family together and the third apart', () => {
    const groups = groupByColour(wardrobe.garments);
    const sizes = groups.map((g) => g.garments.length);

    expect(sizes[0]).toBe(2);
    expect(sizes.at(-1)).toBe(1);
  });

  /*
   * THE INSERTION ORDER IS THE ASSERTION, and the first version of this test did not have it.
   *
   * `groupByColour` builds a Map, so the natural order is FIRST-SEEN. The wardrobe above
   * happens to introduce the two-garment family first, which means it is already size-ordered
   * before the sort runs — and a mutation deleting the sort left this test green.
   *
   * This fixture introduces the ONE-garment family first, so the Map order is 1 then 2 and only
   * the sort can produce 2 then 1 [[a-decoy-that-is-not-broken-proves-nothing]].
   */
  it('orders groups by size, largest first — from a wardrobe that is not already in that order', () => {
    const smallFirst = [
      garment('x', rowOf(wardrobe.other)),
      garment('y', rowOf(wardrobe.first)),
      garment('z', rowOf(wardrobe.alsoFirst ?? wardrobe.first, 'z-dup')),
    ];
    const groups = groupByColour(smallFirst);

    // The fixture is only discriminating if the small group really is seen first.
    expect(familyOf(smallFirst[0]!)).not.toBe(familyOf(smallFirst[1]!));
    expect(groups[0]!.garments.length).toBe(2);
    expect(groups.at(-1)!.garments.length).toBe(1);

    for (let i = 1; i < groups.length; i += 1)
      expect(groups[i]!.garments.length).toBeLessThanOrEqual(groups[i - 1]!.garments.length);
  });

  /*
   * WHAT NOTHING HERE COVERS, SAID OUT LOUD.
   *
   * `UNGROUPED` collects garments `familyOf` cannot place — and `familyOf` returns `null` only
   * when the corpus offers no entry at all, which a published bundle never does. So the branch
   * is **unreachable in any test that uses the real corpus**, and a mutation that DROPPED
   * ungrouped garments instead of collecting them passes this whole file.
   *
   * It is kept because an empty bundle should degrade visibly rather than crash, and it is
   * recorded here rather than covered by a test that would only be checking the corpus is
   * non-empty. Stubbing `familyOf` would test the stub.
   */
  it('has a family for every garment the real corpus can place, which is all of them', () => {
    for (const g of wardrobe.garments) expect(familyOf(g)).not.toBeNull();
  });

  it('orders garments within a group by lightness, light first — not by hex', () => {
    const dark = SLUGS.map((s) => allEntries().find((e) => e.entry.slug === s)!)
      .sort((a, b) => a.derived.lab[0] - b.derived.lab[0])
      .slice(0, 3);
    // All three forced into one group by construction: the assertion is the ordering, not the
    // grouping, so they are handed to the sorter as one family's members.
    const groups = groupByColour(dark.map((e, i) => garment(`g${String(i)}`, rowOf(e.entry.slug))));

    for (const group of groups)
      for (let i = 1; i < group.garments.length; i += 1)
        expect(group.garments[i]!.color.lab_l).toBeLessThanOrEqual(
          group.garments[i - 1]!.color.lab_l,
        );
  });

  it('breaks a tie on id, so the order is not the wardrobe’s', () => {
    const slug = SLUGS[0]!;
    const forward = groupByColour([garment('b', rowOf(slug)), garment('a', rowOf(slug, 'c2'))]);
    const reversed = groupByColour([garment('a', rowOf(slug, 'c2')), garment('b', rowOf(slug))]);

    expect(forward[0]!.garments.map((g) => g.id)).toEqual(['a', 'b']);
    expect(reversed[0]!.garments.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('returns nothing for an empty wardrobe rather than a group of nothing', () => {
    expect(groupByColour([])).toEqual([]);
  });

  it('never invents a family key of its own', () => {
    const published = new Set(allEntries().map((e) => e.entry.taxonomy.family));
    const groups = groupByColour(wardrobe.garments);

    for (const group of groups)
      expect(
        `${group.family}: ${String(published.has(group.family) || group.family === UNGROUPED)}`,
      ).toBe(`${group.family}: true`);
  });
});

describe('an edited field that is emptied clears it', () => {
  /*
   * `GarmentEnrichment` reads `undefined` as "leave it" and an explicit `null` as "erase it". An
   * editor that wrote `''` would store an empty brand where somebody meant to remove one, and
   * every reader downstream would then have to decide whether `''` counts.
   */
  it('writes null, never an empty string', () => {
    expect(textPatch('brand', '   ')).toEqual({ brand: null });
    expect(textPatch('brand', '')).toEqual({ brand: null });
  });

  it('DECOY — a field with a value writes the value, trimmed', () => {
    expect(textPatch('brand', '  Kapital  ')).toEqual({ brand: 'Kapital' });
  });

  it('carries exactly the one key it was asked for', () => {
    expect(Object.keys(textPatch('material', 'wool'))).toEqual(['material']);
  });
});

/**
 * Narrowing the wardrobe (FR-41, F-131).
 *
 * ## What earns these cases
 *
 * A predicate over three optional fields is four lines, and almost every wrong version of it
 * passes a test that filters by one axis and counts the result. What separates them is the
 * empty filter, the intersection, and what absent data does — so those are the cases here, and
 * each has a neighbour that must NOT behave the same way.
 */
describe('narrowing the wardrobe', () => {
  const withFields = (
    id: string,
    fields: {
      readonly type?: string;
      readonly formality?: string | null;
      readonly seasons?: readonly GarmentSeason[];
    },
  ): StoredGarment => ({
    ...garment(id, rowOf(SLUGS[0]!, `c-${id}`)),
    type: fields.type ?? 'jumper',
    formality: fields.formality ?? null,
    seasons: fields.seasons ?? [],
  });

  const WARDROBE: readonly StoredGarment[] = [
    withFields('coat-winter', { type: 'coat', formality: 'smart', seasons: ['winter'] }),
    withFields('coat-summer', { type: 'Coat ', formality: 'everyday', seasons: ['summer'] }),
    withFields('jumper-winter', { type: 'jumper', formality: 'everyday', seasons: ['winter'] }),
    withFields('shirt-none', { type: 'shirt', formality: null, seasons: [] }),
  ];

  const ids = (filter: WardrobeFilter): string[] =>
    filterGarments(WARDROBE, filter).map((g) => g.id);

  /*
   * THE DECOY THAT MATTERS MOST. A predicate returning `false` for everything satisfies every
   * "it narrowed" case below and leaves the screen permanently empty.
   */
  it('an empty filter returns the whole wardrobe, in its own order', () => {
    expect(ids(NO_FILTER)).toEqual(WARDROBE.map((g) => g.id));
  });

  it('narrows by type, folding case and spacing', () => {
    // 'coat' and 'Coat ' are one kind of garment, not two.
    expect(ids({ ...NO_FILTER, type: 'coat' })).toEqual(['coat-winter', 'coat-summer']);
  });

  it('narrows by season', () => {
    expect(ids({ ...NO_FILTER, season: 'winter' })).toEqual(['coat-winter', 'jumper-winter']);
  });

  it('narrows by formality', () => {
    expect(ids({ ...NO_FILTER, formality: 'everyday' })).toEqual(['coat-summer', 'jumper-winter']);
  });

  /*
   * THE INTERSECTION DECOY. Each single-axis case above passes for a predicate that ORs its
   * axes; only a two-axis case can tell them apart, and the fixture is built so the union and
   * the intersection differ.
   */
  it('combines axes with AND — two filters narrow further, never wider', () => {
    const both = ids({ ...NO_FILTER, type: 'coat', season: 'winter' });

    expect(both).toEqual(['coat-winter']);
    expect(both.length).toBeLessThan(ids({ ...NO_FILTER, type: 'coat' }).length);
    expect(both.length).toBeLessThan(ids({ ...NO_FILTER, season: 'winter' }).length);
  });

  it('a garment with no formality does not match a formality filter', () => {
    // Absent data is not a wildcard.
    expect(ids({ ...NO_FILTER, formality: 'smart' })).not.toContain('shirt-none');
  });

  it('and that garment is still there when formality is not narrowed', () => {
    // The other half. Without it, "absent data does not match" is indistinguishable from
    // "absent data is excluded", which would be a hidden filter nobody chose.
    expect(ids(NO_FILTER)).toContain('shirt-none');
    expect(ids({ ...NO_FILTER, type: 'shirt' })).toEqual(['shirt-none']);
  });

  it('a value nothing carries returns nothing, rather than everything', () => {
    expect(ids({ ...NO_FILTER, type: 'kimono' })).toEqual([]);
    expect(ids({ ...NO_FILTER, season: 'spring' })).toEqual([]);
  });

  it('composes in front of the grouping — a narrowed wardrobe is still grouped', () => {
    // Criterion 3, by construction rather than by the screen remembering.
    const narrowed = filterGarments(WARDROBE, { ...NO_FILTER, type: 'coat' });
    const groups = groupByColour(narrowed);

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.reduce((n, g) => n + g.garments.length, 0)).toBe(narrowed.length);
  });
});

describe('the options a wardrobe offers', () => {
  const withFields = (id: string, type: string, formality: string | null): StoredGarment => ({
    ...garment(id, rowOf(SLUGS[0]!, `c-${id}`)),
    type,
    formality,
  });

  const WARDROBE: readonly StoredGarment[] = [
    withFields('a', 'coat', 'smart'),
    withFields('b', 'Coat ', 'everyday'),
    withFields('c', 'jumper', null),
    withFields('d', 'shirt', '  '),
  ];

  it('offers every value something carries', () => {
    const { types, formalities } = filterOptions(WARDROBE);

    expect(types).toEqual(['coat', 'jumper', 'shirt']);
    expect(formalities).toEqual(['everyday', 'smart']);
  });

  /*
   * THE DECOY. Without it, an option list that is EMPTY passes "offers no value nothing
   * carries", and one that is COMPLETE passes "offers every value something carries" — the two
   * assertions have to be made of the same list for either to mean anything.
   */
  it('offers nothing the wardrobe does not carry', () => {
    const { types, formalities } = filterOptions(WARDROBE);

    expect(types).not.toContain('kimono');
    expect(formalities).not.toContain('formal');
    // And a blank formality is not an option — it is an absence with a space in it.
    expect(formalities).not.toContain('');
    expect(formalities).not.toContain('  ');
  });

  it('keeps the first spelling, so a chip reads the way somebody typed it', () => {
    expect(filterOptions(WARDROBE).types).toContain('coat');
    expect(filterOptions(WARDROBE).types).not.toContain('Coat ');
  });

  it('offers nothing for an empty wardrobe, rather than a vocabulary', () => {
    expect(filterOptions([])).toEqual({ types: [], formalities: [] });
  });
});
