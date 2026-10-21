/**
 * What the Atlas shows, decided here (F-246; mockup `05`).
 *
 * The screen draws these answers and does not work them out, as Home's `home.ts` and the Wardrobe's
 * `browse.ts` do: the rule for which colours appear, in what order, and what each card and chip says
 * is written where somebody can disagree with it, and tested without rendering anything.
 *
 * ## What the field searches (ADR-0143 D1)
 *
 * `05`'s placeholder promises *kanji, romaji, family or #hex*, and that is what it answers. A hex
 * ranks the whole corpus by ΔE00 through the Finder's own index (`hexNearest`), then the filters
 * and the bookmark toggle narrow that ranking, and the nearest `HEX_LIMIT` are shown. Anything else
 * is a case-folded substring of the names, the slug, the hex, the family's words, or its chip's.
 * A natural phrase is the Finder's: one drawn tap away, and not drawn here.
 *
 * ## What the card says (ADR-0140)
 *
 * The kanji and the hex, the romaji, the OKLCh line from the entry's own derivation, and the season
 * the entry was authored with — or nothing where none was. No era: no entry holds one.
 *
 * Pure: every input is an argument, except the corpus and the vocabulary, which are the verified
 * bundle's.
 */

import { deltaE00 } from '@irodora/color-difference';
import { swatchAccessibleName } from '@irodora/ui';
import type { FamilyGroupId } from '@irodora/corpus';
import {
  colorFor,
  familyGroups,
  familyLabel,
  groupOf,
  type FamilyGroup,
  type PublishedEntry,
} from './corpus';
import { HEX_LIMIT, hexNearest } from './finder';
import type { MessageKey } from './i18n';
import { capitalised, oklchLine } from './notation';

/* ------------------------------------------------------------------ the vocabulary's words */

/**
 * Corpus vocabulary → catalogue key.
 *
 * Written as total records rather than as template strings, so a value the corpus can hold and the
 * catalogue cannot name is a **compile error** rather than a blank on a screen. It is also what
 * keeps every one of these keys "used" for the unused-key check, including the ones the seed corpus
 * happens not to exercise. (They lived in the Atlas screen until F-246; it re-exports them.)
 */
export const TEMPERATURE_KEYS = {
  warm: 'temperature.warm',
  cool: 'temperature.cool',
  neutral: 'temperature.neutral',
} as const satisfies Record<string, MessageKey>;

export const LIGHTNESS_KEYS = {
  dark: 'band.dark',
  mid: 'band.mid',
  light: 'band.light',
} as const satisfies Record<string, MessageKey>;

export const CHROMA_KEYS = {
  low: 'chroma.low',
  mid: 'chroma.mid',
  high: 'chroma.high',
} as const satisfies Record<string, MessageKey>;

export const SEASON_KEYS = {
  spring: 'season.spring',
  summer: 'season.summer',
  autumn: 'season.autumn',
  winter: 'season.winter',
} as const satisfies Record<string, MessageKey>;

export type Season = keyof typeof SEASON_KEYS;
export const SEASONS = Object.keys(SEASON_KEYS) as readonly Season[];

/* ------------------------------------------------------------------ 05's drawn sizes, in dp */

/** `05.card-N.swatch`: 103 dp tall (siblings 103, 103, 106, 106.5 — most snap to 103). */
export const ATLAS_SAMPLE = 103;
/** How far inside its card the sample sits: 5 dp on every card. */
export const ATLAS_MEDIA_INSET = 5;
/** `05.filters.season.*`: 21 dp (siblings 21, 21, 21, 21, 22). */
export const SEASON_PILL = 21;
/** `05.filters.family.*`: 20 dp. */
export const FAMILY_CHIP = 20;
/** `05.count`: 21 dp. */
export const COUNT_PILL = 21;
/** `05.compare` · `05.finder` · `05.palettes`: 18.5 dp (siblings 20, 18.5, 18.5). */
export const NAV_PILL = 18.5;
/** `05.search`: 26.5 dp. */
export const SEARCH_FIELD = 26.5;
/** The app bar, from the top to its rule: 139 px, 69.5 dp. */
export const APP_BAR = 69.5;
/**
 * `05.search`'s glyph: it inks 23 px (11.5 dp), and the drawing inks 0.755 of its 24-unit grid
 * (the glass from 3.2 to the handle's end at 21.3), so it is drawn at 15 dp.
 */
export const SEARCH_GLYPH = 15;
/**
 * `05.more`: `05.json` records its ink 24 px across (12 dp), and the three dots ink 0.633 of the
 * grid (4.4 to 19.6), so it is drawn at 19 dp, to the half dp (F-246's review, M2: an earlier reading
 * of 22 px disagreed with the record the test reads).
 */
export const MORE_GLYPH = 19;

/* ------------------------------------------------------------------ the filters */

export interface AtlasFilters {
  readonly season: Season | null;
  /** The family chips that are on: OR within the row, AND with everything else (ADR-0143 D3). */
  readonly groups: ReadonlySet<FamilyGroupId>;
  readonly temperature: keyof typeof TEMPERATURE_KEYS | null;
  readonly lightness: keyof typeof LIGHTNESS_KEYS | null;
  readonly chroma: keyof typeof CHROMA_KEYS | null;
}

export const NO_FILTERS: AtlasFilters = {
  season: null,
  groups: new Set(),
  temperature: null,
  lightness: null,
  chroma: null,
};

function matchesFilters(entry: PublishedEntry, f: AtlasFilters): boolean {
  const { taxonomy } = entry.entry;
  if (f.season !== null && !(taxonomy.season ?? []).includes(f.season)) return false;
  if (f.groups.size > 0 && !f.groups.has(groupOf(taxonomy.family).group)) return false;
  if (f.temperature !== null && taxonomy.temperature !== f.temperature) return false;
  if (f.lightness !== null && taxonomy.lightnessBand !== f.lightness) return false;
  if (f.chroma !== null && taxonomy.chromaBand !== f.chroma) return false;
  return true;
}

/**
 * Whether a query names this entry: a case-folded substring of its names, slug and hex, its
 * family's words in both languages, or its chip's romaji, kanji and English.
 */
export function atlasMatches(entry: PublishedEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const { name, slug, taxonomy } = entry.entry;
  const group = groupOf(taxonomy.family);
  return [
    name.kanji,
    name.kana,
    name.romaji,
    name.en,
    slug,
    entry.derived.hex,
    familyLabel(taxonomy.family, 'en'),
    familyLabel(taxonomy.family, 'ja'),
    group.romaji,
    group.kanji,
    group.en,
  ].some((form) => form.toLowerCase().includes(q));
}

/**
 * What the Atlas lists, given the field, the filters and the bookmark toggle.
 *
 * A hex lists the nearest `HEX_LIMIT` of what the filters leave, nearest first; anything else lists
 * every match in the corpus's own order. `bookmarked` is the set the toggle narrows to, or `null`
 * when the toggle is off.
 */
export function atlasShown(
  entries: readonly PublishedEntry[],
  query: string,
  filters: AtlasFilters,
  bookmarked: ReadonlySet<string> | null = null,
): readonly PublishedEntry[] {
  const kept = (e: PublishedEntry): boolean =>
    matchesFilters(e, filters) && (bookmarked === null || bookmarked.has(e.entry.slug));
  const ranked = hexNearest(query, entries.length);
  if (ranked !== null) {
    const listed = new Set(entries.map((e) => e.entry.slug));
    return ranked
      .map((n) => n.entry)
      .filter((e) => listed.has(e.entry.slug) && kept(e))
      .slice(0, HEX_LIMIT);
  }
  return entries.filter((e) => atlasMatches(e, query) && kept(e));
}

/** Whether anything narrows the list — the condition under which *Showing* and *Clear* appear. */
export function atlasNarrowed(
  query: string,
  filters: AtlasFilters,
  bookmarkedOnly: boolean,
): boolean {
  return (
    query.trim() !== '' ||
    bookmarkedOnly ||
    filters.season !== null ||
    filters.groups.size > 0 ||
    filters.temperature !== null ||
    filters.lightness !== null ||
    filters.chroma !== null
  );
}

/* ------------------------------------------------------------------ the card's words */

/** `05.card-N.romaji`: the romaji, its first letter capitalised. */
export const capitalisedRomaji = capitalised;

/** `05.card-N.oklch`: *OKLCh: L • C • h°*, from the entry's derivation (ADR-0140 D1). */
export function atlasOklch(oklch: readonly [number, number, number], unit: string): string {
  return oklchLine(oklch, unit, ': ');
}

/**
 * `05.card-N.era`: the season the entry was authored with, in the catalogue's word — several
 * joined by ` · ` in Latin and `・` in Japanese — or `null` where none was (ADR-0140 D2).
 */
export function seasonLine(
  entry: PublishedEntry,
  t: (key: MessageKey) => string,
  script: 'latin' | 'japanese',
): string | null {
  const seasons = entry.entry.taxonomy.season ?? [];
  if (seasons.length === 0) return null;
  return seasons.map((s) => t(SEASON_KEYS[s])).join(script === 'japanese' ? '・' : ' · ');
}

/**
 * A card's name, as a screen reader hears it: everything the card prints, and the English it does
 * not (ADR-0143 D8). The card is one control, so this is the only way its words are heard.
 */
export function atlasCardName(
  entry: PublishedEntry,
  t: (key: MessageKey) => string,
  script: 'latin' | 'japanese',
): string {
  const { name } = entry.entry;
  const season = seasonLine(entry, t, script);
  return [
    swatchAccessibleName(
      `${name.kanji}, ${capitalised(name.romaji)}, ${name.en}`,
      entry.derived.hex,
      colorFor(entry.entry),
    ),
    atlasOklch(entry.derived.oklch, t('coord.oklch')),
    ...(season === null ? [] : [season]),
  ].join(' ');
}

/** `05.count`: *120 Original Colours* — a figure joined to its noun with no space in Japanese. */
export function atlasCountLabel(
  count: number,
  t: (key: MessageKey) => string,
  script: 'latin' | 'japanese',
): string {
  return `${String(count)}${script === 'japanese' ? '' : ' '}${t('atlas.countNoun')}`;
}

/* ------------------------------------------------------------------ the family chips */

/**
 * Each entry list's dots, remembered per list: the same groups over another list (a test's, or a
 * later publish's) are worked out again rather than answered from the first (F-246's review, S1).
 */
const dots = new WeakMap<readonly PublishedEntry[], Map<FamilyGroupId, PublishedEntry>>();

/**
 * The entry a family chip's dot is drawn in: the group's MEDOID — the member whose summed CIEDE2000
 * to the other members, over each entry's published Lab, is least; ties to the earlier slug
 * (ADR-0143 D4). A real corpus colour with its own provenance (rule 12), chosen by a stated rule.
 */
export function familyDotEntry(
  group: FamilyGroup,
  entries: readonly PublishedEntry[],
): PublishedEntry {
  const members = entries
    .filter((e) => group.families.includes(e.entry.taxonomy.family))
    .sort((a, b) => a.entry.slug.localeCompare(b.entry.slug));
  const first = members[0];
  if (first === undefined) throw new Error(`the ${group.group} chip holds no entry`);
  let best = first;
  let bestSum = Number.POSITIVE_INFINITY;
  for (const m of members) {
    let sum = 0;
    for (const o of members) if (o !== m) sum += deltaE00(m.derived.lab, o.derived.lab);
    if (sum < bestSum) {
      best = m;
      bestSum = sum;
    }
  }
  return best;
}

/** The dot of a chip, as a sample: its medoid's hex and colour, remembered per group and list. */
export function familyDot(
  group: FamilyGroup,
  entries: readonly PublishedEntry[],
): { readonly hex: string; readonly color: ReturnType<typeof colorFor> } {
  let known = dots.get(entries);
  if (known === undefined) {
    known = new Map();
    dots.set(entries, known);
  }
  let entry = known.get(group.group);
  if (entry === undefined) {
    entry = familyDotEntry(group, entries);
    known.set(group.group, entry);
  }
  return { hex: entry.derived.hex, color: colorFor(entry.entry) };
}

export { familyGroups };
