/**
 * What Home selects (F-146; rebuilt to 01 by F-242).
 *
 * The screen draws these answers and does not work them out, so this is where the rules are
 * checked — without rendering anything, and without a store.
 */

import {
  colourOfTheDay,
  garmentTileName,
  heroName,
  HOME_TILE,
  homeContent,
  HOME_TILES,
  oklchLine,
  recordedMaterial,
  wardrobeCountLabel,
  wardrobeCountName,
  wardrobeSummary,
  wardrobeTileSize,
} from '../src/home';
import { allEntries } from '../src/corpus';
import { t as message, type MessageKey } from '../src/i18n';
import type { SavedColorRow, StoredGarment } from '@irodora/store';

/** A reading, with only the fields the selection reads. */
const reading = (id: string, created: number, deleted: number | null = null): SavedColorRow =>
  ({
    id,
    created_at: created,
    updated_at: created,
    deleted_at: deleted,
    name: id,
    hex: '#445566',
    source: 'declared',
    confidence: 1,
    corpus_slug: null,
  }) as unknown as SavedColorRow;

const garment = (id: string, created: number, deleted: number | null = null): StoredGarment =>
  ({
    id,
    createdAt: created,
    updatedAt: created,
    deletedAt: deleted,
    type: 'shirt',
    color: reading(`${id}-c`, created),
  }) as unknown as StoredGarment;

describe('the wardrobe summary', () => {
  it('counts only live garments', () => {
    const s = wardrobeSummary([garment('a', 1), garment('b', 2, 3), garment('c', 4)]);
    expect(s.count).toBe(2);
  });

  it('takes at most five garments, newest first: 01’s row (F-242)', () => {
    const many = Array.from({ length: 9 }, (_, i) => garment(`g${String(i)}`, i));
    const s = wardrobeSummary(many);
    expect(s.garments.map((g) => g.id)).toStrictEqual(['g8', 'g7', 'g6', 'g5', 'g4']);
    expect(s.garments).toHaveLength(HOME_TILES);
    expect(s.count).toBe(9);
  });

  it('DECOY — a deleted garment is neither counted nor shown, even when it is the newest', () => {
    const s = wardrobeSummary([garment('kept', 1), garment('gone', 99, 100)]);
    expect(s.garments.map((g) => g.id)).toStrictEqual(['kept']);
    expect(s.count).toBe(1);
  });

  it('is a count of zero rather than an absence', () => {
    // `count: 0` and `garments: []` — not `null`. The screen renders a first-run block from the
    // zero; a null would make it render nothing, which is the state it is trying to replace.
    const s = wardrobeSummary([]);
    expect(s.count).toBe(0);
    // `toHaveLength(0)` rather than `toEqual([])`: the latter accepts an array holding
    // `undefined`, so it does not assert emptiness at all (F-133). Emptiness is the claim here.
    expect(s.garments).toHaveLength(0);
  });
});

describe("today's colour", () => {
  const entries = ['a', 'b', 'c'].map((slug) => ({ entry: { slug } }) as never);

  const noon = (y: number, m: number, d: number): number => new Date(y, m, d, 12).getTime();

  it('is the same for the same day', () => {
    expect(colourOfTheDay(noon(2026, 8, 3), entries)).toBe(
      colourOfTheDay(noon(2026, 8, 3) + 3_600_000, entries),
    );
  });

  it('DIFFERS on the next day — the decoy', () => {
    /*
     * Without this, a function returning `entries[0]` would satisfy the test above completely.
     * Three entries and consecutive days, so the rotation has to actually move.
     */
    expect(colourOfTheDay(noon(2026, 8, 3), entries)).not.toBe(
      colourOfTheDay(noon(2026, 8, 4), entries),
    );
  });

  it('is stable across the whole of one local day', () => {
    // 00:30 and 23:30 on the same date. The UTC-day version of this arithmetic fails here for
    // any timezone east of London, which is where the product's second locale is.
    const early = new Date(2026, 8, 3, 0, 30).getTime();
    const late = new Date(2026, 8, 3, 23, 30).getTime();
    expect(colourOfTheDay(early, entries)).toBe(colourOfTheDay(late, entries));
  });

  it('handles a date before the epoch without indexing out of bounds', () => {
    expect(colourOfTheDay(new Date(1962, 0, 1).getTime(), entries)).not.toBeNull();
  });

  it('is null only when the corpus is empty', () => {
    expect(colourOfTheDay(Date.now(), [])).toBeNull();
  });
});

describe('what Home has (F-242, ADR-0138)', () => {
  const FIXED = Date.UTC(2026, 8, 6);

  it("always has the day's colour, with or without a wardrobe", () => {
    expect(homeContent([], FIXED).today).not.toBeNull();
    expect(homeContent([garment('g', 1)], FIXED).today).not.toBeNull();
  });

  it('carries the wardrobe it was given, and nothing else', () => {
    const content = homeContent([garment('g', 1)], FIXED);
    expect(Object.keys(content).sort()).toStrictEqual(['today', 'wardrobe']);
    expect(content.wardrobe.count).toBe(1);
    // DECOY: an empty wardrobe is a zero, which is what the screen's absent state reads.
    expect(homeContent([], FIXED).wardrobe.count).toBe(0);
  });
});

/**
 * 01, ELEMENT BY ELEMENT (F-242): the values Home's rebuilt elements print, worked out here so the
 * screen only draws them. Each binding is R9 §8's, and none is 01's sample content.
 */
describe('what 01’s elements print (F-242)', () => {
  const t = (key: MessageKey): string => message('en', key);
  const tJa = (key: MessageKey): string => message('ja', key);

  it('records a material only where one is written, trimmed (ADR-0137 D1)', () => {
    expect(recordedMaterial({ material: ' Linen ' })).toBe('Linen');
    // DECOYS: blank, spaces and null are no material, so no badge and no words.
    expect(recordedMaterial({ material: '' })).toBeNull();
    expect(recordedMaterial({ material: '   ' })).toBeNull();
    expect(recordedMaterial({ material: null })).toBeNull();
  });

  it('names the hero as 01 does: the romaji capitalised, the English in brackets', () => {
    expect(heroName({ romaji: 'kumori-garasu', en: 'Frosted Glass' })).toBe(
      'Kumori-garasu (Frosted Glass)',
    );
  });

  it('prints the OKLCh line at 3, 3 and 1 decimals, with the space’s name and 01’s bullets', () => {
    expect(oklchLine([0.849, 0.013, 228], 'OKLCh')).toBe('OKLCh 0.849 • 0.013 • 228.0°');
  });

  it('GOLDEN: the line restates each entry’s own derivation (content/colors, ADR-0065)', () => {
    /*
     * Every entry is authored in OKLCh and says so in its provenance: "Specified in OKLCh as
     * L 0.849, C 0.013, h 228.0°". The line Home prints is the engine's round trip through XYZ,
     * so it must give back the authored figures. Hue is compared only where chroma reaches 0.02:
     * below that the hue of a near-grey is ill-conditioned, and a round trip moves it freely.
     */
    const SPEC = /Specified in OKLCh as L ([\d.]+), C ([\d.]+), h ([\d.]+)°/u;
    const misses: string[] = [];
    let read = 0;
    for (const { entry, derived } of allEntries()) {
      const spec = SPEC.exec(entry.provenance.derivation);
      if (spec === null) continue;
      read += 1;
      const [, l, c, h] = spec;
      const [pl, pc, ph] = oklchLine(derived.oklch, 'OKLCh')
        .replace('OKLCh ', '')
        .replace('°', '')
        .split(' • ');
      if (pl !== l || pc !== c) misses.push(`${entry.slug}: L ${String(pl)} C ${String(pc)}`);
      if (Number(c) >= 0.02 && Math.abs(Number(ph) - Number(h)) > 0.1)
        misses.push(`${entry.slug}: h ${String(ph)} against ${String(h)}`);
    }
    expect(read).toBe(allEntries().length);
    expect(misses).toStrictEqual([]);
  });

  it('counts garments and valid outfits, in each locale’s grammar (ADR-0138 D6)', () => {
    expect(wardrobeCountLabel(14, { valid: 38 }, t, 'latin')).toBe(
      '14 Garments • 38 Valid Outfits',
    );
    expect(wardrobeCountLabel(1, { valid: 1 }, t, 'latin')).toBe('1 Garment • 1 Valid Outfit');
    expect(wardrobeCountLabel(14, { valid: 38 }, tJa, 'japanese')).toBe(
      '14着 • 38通りの有効なコーディネート',
    );
  });

  it('DECOY — without a profile the count is the garments alone, never an uncomputed zero', () => {
    const label = wardrobeCountLabel(5, undefined, t, 'latin');
    expect(label).toBe('5 Garments');
    expect(label).not.toContain('•');
    expect(label).not.toContain('0');
  });

  it('names the pill with the threshold its outfits were counted at', () => {
    expect(wardrobeCountName('14 Garments • 38 Valid Outfits', { threshold: 60 }, t)).toBe(
      '14 Garments • 38 Valid Outfits. Counted at: 60',
    );
    expect(wardrobeCountName('5 Garments', undefined, t)).toBe('5 Garments');
  });

  it('names a tile for the garment, its colour and, where recorded, its material', () => {
    const g = (material: string | null) => ({
      name: null,
      type: 'shirt',
      material,
      color: { name: 'Ai-iro' } as SavedColorRow,
    });
    expect(garmentTileName(g('Linen'), t)).toBe('shirt — Ai-iro, Material Linen');
    // DECOY: no material, no material words.
    expect(garmentTileName(g(null), t)).toBe('shirt — Ai-iro');
  });

  it('keeps 01’s five tiles in one row on every supported width, never above 52 dp', () => {
    expect(wardrobeTileSize(384)).toBe(HOME_TILE);
    expect(wardrobeTileSize(360)).toBe(49.5);
    expect(wardrobeTileSize(320)).toBe(41.5);
    // DECOY: a wide window does not grow the drawn tile.
    expect(wardrobeTileSize(1000)).toBe(HOME_TILE);
  });
});
