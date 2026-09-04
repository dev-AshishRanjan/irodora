/**
 * What Home shows, decided here (F-146).
 *
 * ## Why the screen does not decide this
 *
 * `palette.ts`, `finder.ts` and `wardrobe/browse.ts` already work this way: the screen draws an
 * answer, and a pure module works the answer out. It is testable without rendering, it can be
 * reasoned about without a store, and — the part that matters most on a front door — the rule for
 * *which* colour appears is written somewhere a person can disagree with it.
 *
 * Nothing here touches React, the repository, or the clock. Every input is an argument.
 */

import { allEntries, colorFor, type PublishedEntry } from './corpus';
import type { SavedColorRow, StoredGarment } from '@irodora/store';

/** The most recent reading, or `null` on a store nobody has used yet. */
export function lastReading(rows: readonly SavedColorRow[]): SavedColorRow | null {
  /*
   * `deleted_at` IS CHECKED, and it is the kind of thing that is wrong for a year.
   *
   * The repository's rows carry a soft-delete column, so a deleted reading is still a row. Home
   * is the one surface that shows exactly ONE of them, which makes it the one surface where
   * showing a deleted row is not a small error — a person deletes a reading and the front door
   * keeps presenting it as their last.
   */
  const live = rows.filter((r) => r.deleted_at === null);
  if (live.length === 0) return null;

  // Reduce rather than sort: sorting copies an array to read one element from it, and this runs
  // on every render of the first screen.
  return live.reduce((newest, row) => (row.created_at > newest.created_at ? row : newest));
}

export interface WardrobeSummary {
  readonly count: number;
  /** Up to five garment colours, newest first — enough to read as a wardrobe, not a gallery. */
  readonly colors: readonly SavedColorRow[];
}

/** What the wardrobe block says. An empty wardrobe is a count of zero, never an absence. */
export function wardrobeSummary(garments: readonly StoredGarment[]): WardrobeSummary {
  /*
   * CAMEL CASE HERE, SNAKE CASE ABOVE, and it is the store that differs rather than a slip:
   * `SavedColorRow` is a row as SQLite returns it and carries `created_at`, while `StoredGarment`
   * is a composed object the repository builds and carries `createdAt`. Reading one shape with
   * the other compiles to `undefined` in JavaScript and silently sorts by nothing — which is why
   * this comment exists rather than a shared helper that would have to guess.
   */
  const live = garments.filter((g) => g.deletedAt === null);
  const newest = [...live].sort((a, b) => b.createdAt - a.createdAt);
  return {
    count: live.length,
    colors: newest.slice(0, 5).map((g) => g.color),
  };
}

/**
 * How many whole days a timestamp is past the epoch, in the LOCAL day.
 *
 * `Date` is used for exactly this and nothing else. The alternative — dividing the epoch by
 * 86 400 000 — is the UTC day, so a person in Tokyo would see the colour change at 09:00 rather
 * than at midnight, which is a visible wrong answer in the product's second locale.
 */
function localDayIndex(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * One corpus entry for today.
 *
 * ## Deterministic, and that is the whole design
 *
 * The same day gives the same entry, on every device, with nothing stored and nothing random. A
 * front door that picked randomly would flicker between renders and would make the words "today's
 * colour" false — and this repository has a rule about not saying things that are not so.
 *
 * ## It is a rotation, not a recommendation
 *
 * The entry is chosen by the day and by nothing else: not by the profile, not by the wardrobe,
 * not by anything about the person. That is a deliberate limit rather than a missing feature —
 * a colour presented on the front door as *chosen for you* is a claim, and the copy that goes
 * with this says only what it is.
 *
 * `entries` is passed in rather than read from the corpus here, so a test can hand it three and
 * check the arithmetic instead of asserting against 120 real ones.
 */
export function colourOfTheDay(
  now: number,
  entries: readonly PublishedEntry[] = allEntries(),
): PublishedEntry | null {
  if (entries.length === 0) return null;
  const index = ((localDayIndex(now) % entries.length) + entries.length) % entries.length;
  // `%` on a negative day index — a date before 1970 — would otherwise return a negative, and
  // indexing an array with one yields `undefined` rather than throwing. Guarded above, and the
  // non-null assertion is safe because `index` is now within bounds by construction.
  return entries[index] ?? null;
}

export interface HomeContent {
  readonly lastReading: SavedColorRow | null;
  readonly wardrobe: WardrobeSummary;
  readonly today: PublishedEntry | null;
}

/**
 * Everything Home draws, from everything Home has.
 *
 * One call so the screen makes one decision — whether it has content — rather than three, and so
 * the first-run state is a property of the whole page rather than of each block separately.
 */
export function homeContent(
  rows: readonly SavedColorRow[],
  garments: readonly StoredGarment[],
  now: number,
): HomeContent {
  return {
    lastReading: lastReading(rows),
    wardrobe: wardrobeSummary(garments),
    today: colourOfTheDay(now),
  };
}

/** Is this a store nobody has used yet? Both blocks empty; today's colour is always there. */
export function isFirstRun(content: HomeContent): boolean {
  return content.lastReading === null && content.wardrobe.count === 0;
}

/** A published entry as the swatch needs it: a hex, and a `Color` that carries provenance. */
export function entrySwatch(entry: PublishedEntry): {
  readonly hex: string;
  readonly color: ReturnType<typeof colorFor>;
} {
  // `colorFor` takes the CorpusEntry, not the published wrapper around it — the same call the
  // colour page makes. The wrapper carries the derived values; the entry carries the measurement.
  return { hex: entry.derived.hex, color: colorFor(entry.entry) };
}
