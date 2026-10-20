/**
 * What Home shows, decided here (F-146; rebuilt to `01` by F-242).
 *
 * ## Why the screen does not decide this
 *
 * `palette.ts`, `finder.ts` and `wardrobe/browse.ts` already work this way: the screen draws an
 * answer, and a pure module works the answer out. It is testable without rendering, it can be
 * reasoned about without a store, and — the part that matters most on a front door — the rule for
 * *which* colour appears is written somewhere a person can disagree with it.
 *
 * ## No reading is selected here (ADR-0138)
 *
 * `lastReading` picked the newest live `saved_color` row, whatever wrote it, and Home called it
 * *Last reading* — so a palette saved after a reading put a corpus value where a measurement was
 * announced (F-337, golden rule 11). `01` draws no reading: its hero and its colour card are the
 * day's corpus colour. So Home reads garments and nothing else, and a colour the Lens read appears
 * as its garment's tile, with its own provenance.
 *
 * Nothing here touches React, the repository, or the clock. Every input is an argument.
 */

import { nativeSpacing } from '@irodora/design-tokens';
import { allEntries, colorFor, type PublishedEntry } from './corpus';
import type { MessageKey } from './i18n';
import type { StoredGarment } from '@irodora/store';

/** `01.wardrobe.tile-N`: each garment sample is drawn 52 dp square at 384 dp. */
export const HOME_TILE = 52;

/** `01.hero.sample`: the day's colour, full width, drawn 172 dp tall. */
export const HOME_HERO = 172;

/** How many garments the preview draws: `01`'s five tiles. */
export const HOME_TILES = 5;

export interface WardrobeSummary {
  readonly count: number;
  /** Up to five live garments, newest first: `01`'s preview row. */
  readonly garments: readonly StoredGarment[];
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
    garments: newest.slice(0, HOME_TILES),
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
  readonly wardrobe: WardrobeSummary;
  /** The day's corpus colour: `01`'s hero and its colour card. `null` only for an empty corpus. */
  readonly today: PublishedEntry | null;
}

/**
 * Everything Home draws, from everything Home has: the garments, and the day.
 *
 * No colour row is read here but a garment's own (ADR-0138 D2). `today` is `null` only if the
 * corpus failed to load — a broken bundle rather than a new install — and the screen then draws
 * the wardrobe alone rather than a hero with nothing in it.
 */
export function homeContent(garments: readonly StoredGarment[], now: number): HomeContent {
  return {
    wardrobe: wardrobeSummary(garments),
    today: colourOfTheDay(now),
  };
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

/* ------------------------------------------------------------- 01, element by element (F-242) */

/**
 * A garment's material as recorded, trimmed — or `null` when none is (ADR-0137 D1).
 *
 * The texture badge is drawn when this is a string and not otherwise, and the tile's name says it in
 * words. A blank field is no material: an absent badge is an absent fact, never a placeholder.
 */
export function recordedMaterial(garment: Pick<StoredGarment, 'material'>): string | null {
  const material = garment.material?.trim() ?? '';
  return material === '' ? null : material;
}

/**
 * `01.hero.sample.name`, in the form `01` draws it: the romaji, its first letter capitalised, then
 * the English in brackets — *Kumori-garasu (Frosted Glass)*. Both halves are the entry's own names.
 */
export function heroName(name: { readonly romaji: string; readonly en: string }): string {
  const romaji = name.romaji.charAt(0).toUpperCase() + name.romaji.slice(1);
  return `${romaji} (${name.en})`;
}

/**
 * `01.hero.sample.oklch`: the space's name, then L, C and h from the entry's derivation, at the
 * precision the corpus is authored at and the Lens prints (3, 3 and 1 decimals), separated as `01`
 * separates them. `01`'s own figures are sample content (R9 §4 E1).
 */
export function oklchLine(oklch: readonly [number, number, number], unit: string): string {
  const [l, c, h] = oklch;
  return `${unit} ${l.toFixed(3)} • ${c.toFixed(3)} • ${h.toFixed(1)}°`;
}

/**
 * `01.wardrobe.count`: *N Garments • M Valid Outfits* (ADR-0138 D6).
 *
 * - **M is `coverage().valid`**, the outfits that clear the threshold against the person's profile
 *   (FR-42) — coverage, not the lookbook (ADR-0136).
 * - **Without a profile there is no M**, and the pill says the garment count alone rather than
 *   printing a figure nobody computed (R9 §4 E2).
 * - **English takes its singular**, so nobody reads *1 Garments*; Japanese joins a figure to its
 *   counter with no space, and its counter does not inflect.
 */
export function wardrobeCountLabel(
  count: number,
  coverage: { readonly valid: number } | undefined,
  t: (key: MessageKey) => string,
  script: 'latin' | 'japanese',
): string {
  const join = script === 'japanese' ? '' : ' ';
  const garments = `${String(count)}${join}${t(count === 1 ? 'home.countGarment' : 'home.countGarments')}`;
  if (coverage === undefined) return garments;
  const outfits = `${String(coverage.valid)}${join}${t(
    coverage.valid === 1 ? 'home.countOutfit' : 'home.countOutfits',
  )}`;
  return `${garments} • ${outfits}`;
}

/**
 * The pill's accessible name: what it prints, and the threshold the outfits were counted at, which
 * the drawing has no room for and a valid outfit means nothing without (FR-42).
 */
export function wardrobeCountName(
  label: string,
  coverage: { readonly threshold: number } | undefined,
  t: (key: MessageKey) => string,
): string {
  return coverage === undefined
    ? label
    : `${label}. ${t('shopping.countedAt')}: ${String(coverage.threshold)}`;
}

/**
 * A tile's name, as the Wardrobe names a garment (`name ?? type — colour`), with its material where
 * one is recorded (ADR-0137 D3): the texture badge says it by shape, and this says it in words.
 * The swatch adds the value and the provenance.
 */
export function garmentTileName(
  garment: Pick<StoredGarment, 'name' | 'type' | 'material' | 'color'>,
  t: (key: MessageKey) => string,
): string {
  const material = recordedMaterial(garment);
  const base = `${garment.name ?? garment.type} — ${garment.color.name}`;
  return material === null ? base : `${base}, ${t('browse.material')} ${material}`;
}

/**
 * The tiles' side on a phone of this width: `01`'s 52 dp, shrunk only where five would not fit in a
 * single row inside Home's inset and the card's padding with at least `xs` between them — so `01`'s
 * one row of five holds at 360 and 320 dp. Floored to the half dp, never above the drawn size.
 */
export function wardrobeTileSize(windowWidth: number): number {
  const room =
    windowWidth - 2 * nativeSpacing.xl - 2 * nativeSpacing.md - (HOME_TILES - 1) * nativeSpacing.xs;
  return Math.min(HOME_TILE, Math.floor((room / HOME_TILES) * 2) / 2);
}
