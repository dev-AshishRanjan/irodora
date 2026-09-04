/**
 * What Home selects (F-146).
 *
 * The screen draws these answers and does not work them out, so this is where the rules are
 * checked — without rendering anything, and without a store.
 */

import { colourOfTheDay, homeContent, isFirstRun, lastReading, wardrobeSummary } from '../src/home';
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
    expect(s.colors).toEqual([]);
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
