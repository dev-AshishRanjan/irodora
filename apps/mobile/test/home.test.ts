/**
 * What Home selects (F-146).
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
  homeLead,
  isFirstRun,
  lastReading,
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

describe('the last reading', () => {
  it('is the newest by created_at, not the last in the array', () => {
    // Deliberately out of order: a function that returned `rows.at(-1)` would pass a sorted
    // fixture and be wrong on a real store, which returns rows in whatever order it likes.
    const picked = lastReading([reading('a', 300), reading('b', 900), reading('c', 100)]);
    expect(picked?.id).toBe('b');
  });

  it('IGNORES a deleted row, even when it is the newest', () => {
    /*
     * The case that would be wrong for a year. A soft-deleted reading is still a row, and Home
     * shows exactly one — so a person deletes a reading and the front door keeps presenting it
     * as their last.
     */
    const picked = lastReading([reading('kept', 100), reading('gone', 999, 1_000)]);
    expect(picked?.id).toBe('kept');
  });

  it('is null on an empty store rather than throwing', () => {
    expect(lastReading([])).toBeNull();
    expect(lastReading([reading('gone', 5, 6)])).toBeNull();
  });
});

describe('the wardrobe summary', () => {
  it('counts only live garments', () => {
    const s = wardrobeSummary([garment('a', 1), garment('b', 2, 3), garment('c', 4)]);
    expect(s.count).toBe(2);
  });

  it('takes at most five colours, newest first', () => {
    const many = Array.from({ length: 9 }, (_, i) => garment(`g${String(i)}`, i));
    const s = wardrobeSummary(many);
    expect(s.colors).toHaveLength(5);
    expect(s.count).toBe(9);
  });

  it('is a count of zero rather than an absence', () => {
    // `count: 0` and `colors: []` — not `null`. The screen renders a first-run block from the
    // zero; a null would make it render nothing, which is the state it is trying to replace.
    const s = wardrobeSummary([]);
    expect(s.count).toBe(0);
    // `toHaveLength(0)` rather than `toEqual([])`: the latter accepts an array holding
    // `undefined`, so it does not assert emptiness at all (F-133). Emptiness is the claim here.
    expect(s.colors).toHaveLength(0);
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

describe('first run', () => {
  it('is true when nothing has been read and nothing is owned', () => {
    expect(isFirstRun(homeContent([], [], Date.now()))).toBe(true);
  });

  it('is false once EITHER exists — the decoy for a check that only looked at one', () => {
    expect(isFirstRun(homeContent([reading('a', 1)], [], Date.now()))).toBe(false);
    expect(isFirstRun(homeContent([], [garment('g', 1)], Date.now()))).toBe(false);
  });

  it("does not depend on today's colour, which is always there", () => {
    // A first-run store still has a corpus. If `isFirstRun` consulted `today`, it would be false
    // on a brand-new install and the state most people see would never render.
    const content = homeContent([], [], Date.now());
    expect(content.today).not.toBeNull();
    expect(isFirstRun(content)).toBe(true);
  });
});

/**
 * F-164 — which block leads.
 *
 * Home led with the last reading unconditionally, so a new install opened on an empty state with
 * a second empty state under it. The corpus is never empty, so there is always a colour to lead
 * with; leading with an absence was a choice, and this is the rule that replaces it.
 */
describe('the lead is whichever block has something to show (F-164)', () => {
  const FIXED = Date.UTC(2026, 8, 6);
  const empty = homeContent([], [], FIXED);

  it('leads with the reading when there is one', () => {
    expect(homeLead(homeContent([reading('a', 100)], [], FIXED))).toBe('reading');
  });

  it("leads with today's colour when there is not", () => {
    // The case the old screen answered with two lines of grey and a button.
    expect(homeLead(empty)).toBe('today');
  });

  it("DECOY — today's colour is always there, which is what makes the rule total", () => {
    /*
     * Without this the case above could be passing because `homeLead` returns `'today'` for
     * anything, and the screen would then have no lead on an install where the corpus failed to
     * load. `'none'` exists for that, and it is a broken bundle rather than a new install.
     */
    expect(empty.today).not.toBeNull();
    expect(empty.lastReading).toBeNull();
    expect(homeLead({ ...empty, today: null })).toBe('none');
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
