/**
 * What goes with a colour — `19` (F-252), pure.
 *
 * `19` draws one named corpus colour per row, with its relationship to the anchor and a *Wear* that
 * needs a slug. The engine GENERATES companions; nothing in the product classifies the relationship of
 * two given colours (F-349). So each row is a corpus colour that stands in a hue relationship to the
 * anchor, to a stated tolerance (ADR-0168):
 *
 * 1. **Curated rows first.** Each curated combination holding the anchor, by slug; its other members
 *    by rank — FR-73's curated sets, placed first as F-196 placed them.
 * 2. **Geometric rows.** For complementary, analogous, split, triadic and tetradic, in that order, each
 *    companion `generateHarmony` produces (the source dropped by value, `companionsOf`) yields at most
 *    one row: the first entry by `nearestByOklch(companion)` that is not the anchor, not already a row,
 *    whose chroma is at least the lexicon's hue floor, and whose hue lies within ±{@link HUE_TOLERANCE}°
 *    of the companion's requested hue. Tetradic's 180° is complementary's, realised once.
 *
 * **What the word claims**: the hue angle between the two colours lies within ±9° of the relationship's.
 * Nothing about lightness or chroma. An anchor under the floor is one the product calls grey and names
 * no hue for, so it has no geometric rows (`chromatic: false`); its curated rows still show.
 *
 * No re-implementation: the angles are the generator's, the measure `hueDistance`, the ranking the one
 * route (`nearestByOklch`, ADR-0158), the floor the published lexicon's, and every value the bundle's.
 */

import { generateHarmony, hueDistance, VARIES, type HarmonyKind } from '@irodora/color-harmony';
import type { CombinationIntent } from '@irodora/corpus';
import { companionsOf } from './combinations';
import { compare } from './compare';
import {
  CORPUS_ENTRY_COUNT,
  combinationsContaining,
  entryBySlug,
  type PublishedEntry,
} from './corpus';
import { labelled } from './detail';
import { lexicon, nearestByOklch } from './finder';
import type { MessageKey } from './i18n';
import { nameLine } from './notation';
import { DEFAULT_SLOT } from './wear';

type T = (key: MessageKey) => string;
type Script = 'latin' | 'japanese';

/**
 * The relationships whose definition is a hue angle from the anchor (`VARIES[k]` is exactly `['h']`),
 * less `warm-cool`, whose targets are absolute hues. In ADR-0168's order: 19's drawn order for the
 * first three, the README's for triadic, and tetradic, which the README omits, last.
 */
export const HUE_RELATIONSHIPS = [
  'complementary',
  'analogous',
  'split',
  'triadic',
  'tetradic',
] as const satisfies readonly HarmonyKind[];
export type HueRelationship = (typeof HUE_RELATIONSHIPS)[number];

/** The kinds the engine defines by hue alone, less warm–cool: what {@link HUE_RELATIONSHIPS} orders. */
export const HUE_ONLY_KINDS: readonly HarmonyKind[] = (Object.keys(VARIES) as HarmonyKind[]).filter(
  (k) => k !== 'warm-cool' && VARIES[k].length === 1 && VARIES[k][0] === 'h',
);

/**
 * ±9° of OKLCh hue: half the 18° single-hue sector of Matsuda's templates, as Cohen-Or et al. (2006)
 * reproduce them. The five relationships' windows are disjoint, so no colour is two at once.
 */
export const HUE_TOLERANCE = 9;

/**
 * The published lexicon's hue-term chroma floor: below it the product names no hue (ADR-0168 D4).
 * Read from the lexicon, never retyped; every hue term carries one, and the smallest is the floor at
 * which any hue is named.
 */
export function hueFloor(): number {
  const floors = lexicon().terms.flatMap((term) =>
    term.constrains.hue !== undefined && term.constrains.chroma !== undefined
      ? [term.constrains.chroma.min]
      : [],
  );
  if (floors.length === 0) throw new Error('goes-with: the lexicon carries no hue term');
  return Math.min(...floors);
}

interface RowBase {
  readonly entry: PublishedEntry;
  /** `compare(anchor, row).deltaE00` — the double 08 prints (FR-48). */
  readonly deltaE00: number;
}

/** A member of a curated combination holding the anchor (FR-73's curated half). */
export interface CuratedRow extends RowBase {
  readonly source: 'curated';
  readonly intent: CombinationIntent;
  readonly combination: string;
}

/** A corpus colour in one of the five hue relationships to the anchor. */
export interface GeometricRow extends RowBase {
  readonly source: 'geometric';
  readonly kind: HueRelationship;
  /** The relationship's angle from the anchor, in degrees: 180, 330, 30, 150, 210, 120, 240, 90, 270. */
  readonly angle: number;
}

export type GoesWithRow = CuratedRow | GeometricRow;

export interface GoesWith {
  readonly anchor: PublishedEntry;
  readonly rows: readonly GoesWithRow[];
  /** The anchor's chroma is at or above the hue floor, so a hue relationship can be stated for it. */
  readonly chromatic: boolean;
}

const memo = new Map<string, GoesWith>();

/** The rows for an anchor (ADR-0168), at ±{@link HUE_TOLERANCE}°. Memoised by slug: the bundle is immutable. */
export function goesWith(anchor: PublishedEntry): GoesWith {
  const known = memo.get(anchor.entry.slug);
  if (known !== undefined) return known;
  const answer = goesWithAt(anchor, HUE_TOLERANCE);
  memo.set(anchor.entry.slug, answer);
  return answer;
}

/**
 * The rows at a stated tolerance. Only {@link goesWith}'s ±9° ships; another tolerance exists so the
 * census ADR-0168 weighs (±15°) is computed by the same code, not a copy of it.
 */
export function goesWithAt(anchor: PublishedEntry, tolerance: number): GoesWith {
  const slug = anchor.entry.slug;

  const rows: GoesWithRow[] = [];
  const taken = new Set<string>([slug]);

  const curated = [...combinationsContaining(slug)].sort((a, b) =>
    a.combination.slug < b.combination.slug ? -1 : a.combination.slug > b.combination.slug ? 1 : 0,
  );
  for (const { combination } of curated) {
    const members = [...combination.colors]
      .filter((m) => m.slug !== slug)
      .sort((a, b) => a.rank - b.rank);
    for (const member of members) {
      const entry = entryBySlug(member.slug);
      // The whole-corpus check resolves every member's slug; a miss would be a bundle defect.
      if (entry === null)
        throw new Error(`goes-with: ${combination.slug} names ${member.slug}, not in this corpus`);
      if (taken.has(member.slug)) continue;
      taken.add(member.slug);
      rows.push({
        source: 'curated',
        entry,
        intent: combination.intent,
        combination: combination.slug,
        deltaE00: compare(anchor, entry).deltaE00,
      });
    }
  }

  const floor = hueFloor();
  const source = anchor.derived.oklch;
  const chromatic = source[1] >= floor;
  if (chromatic) {
    const handled = new Set<number>();
    for (const kind of HUE_RELATIONSHIPS) {
      for (const companion of companionsOf(generateHarmony(source, kind), source)) {
        const hue = companion.requested[2];
        const angle = Math.round((((hue - source[2]) % 360) + 360) % 360) % 360;
        if (handled.has(angle)) continue;
        handled.add(angle);
        // The REQUESTED colour, at the anchor's own lightness and chroma: the in-window colour nearest
        // it is the one nearest the anchor's L and C (the mapped one has lost chroma to the gamut).
        const pick = nearestByOklch(companion.requested, CORPUS_ENTRY_COUNT).find(
          ({ entry }) =>
            !taken.has(entry.entry.slug) &&
            entry.derived.oklch[1] >= floor &&
            hueDistance(entry.derived.oklch[2], hue) <= tolerance,
        );
        if (pick === undefined) continue;
        taken.add(pick.entry.entry.slug);
        rows.push({
          source: 'geometric',
          entry: pick.entry,
          kind,
          angle,
          deltaE00: compare(anchor, pick.entry).deltaE00,
        });
      }
    }
  }

  return { anchor, rows, chromatic };
}

// ---- words and figures (ADR-0170)

/** The relationship words, read through literal keys so the unused-key scan sees each reader. */
export const RELATIONSHIP_KEYS = {
  complementary: 'with.relationship.complementary',
  analogous: 'with.relationship.analogous',
  split: 'with.relationship.split',
  triadic: 'with.relationship.triadic',
  tetradic: 'with.relationship.tetradic',
} as const satisfies Readonly<Record<HueRelationship, MessageKey>>;

/** A curated set's intent, in the catalogue's existing words (F-196). */
export const INTENT_KEYS = {
  contrast: 'combos.intent.contrast',
  harmony: 'combos.intent.harmony',
  accent: 'combos.intent.accent',
  tonal: 'combos.intent.tonal',
} as const satisfies Readonly<Record<CombinationIntent, MessageKey>>;

/**
 * A row's relationship (ADR-0169 D2): an FR-6 relationship, which the product only generates, or
 * *Curated ‹intent›* — a space in Latin, ・ in Japanese.
 */
export function relationshipWords(row: GoesWithRow, t: T, script: Script): string {
  if (row.source === 'geometric') return t(RELATIONSHIP_KEYS[row.kind]);
  const joiner = script === 'japanese' ? '・' : ' ';
  return `${t('combos.curated')}${joiner}${t(INTENT_KEYS[row.intent])}`;
}

/**
 * The row's ΔE00 as 19 prints it: one place, FLOORED, so a printed distance never exceeds the computed
 * one (ADR-0170 D3), as 08's APCA figure is floored (`compare-readout.ts`).
 */
export function distanceFigure(row: GoesWithRow): number {
  return Math.floor(row.deltaE00 * 10) / 10;
}

/** The anchor's name: kanji, capitalised romaji, English in parentheses (ADR-0170 D2). */
export function anchorName(entry: PublishedEntry): string {
  return `${nameLine(entry)} (${entry.entry.name.en})`;
}

/** *Anchor Garment: Top* — the slot Wear and Build place the anchor in, joined by the script's colon. */
export function anchorSlotLine(t: T, script: Script): string {
  return labelled(t('with.anchorSlot'), t(`outfit.${DEFAULT_SLOT}`), script);
}

// ---- the filter (ADR-0171 D5)

export type FilterChoice = 'all' | 'curated' | HueRelationship;

const choiceOf = (row: GoesWithRow): Exclude<FilterChoice, 'all'> =>
  row.source === 'curated' ? 'curated' : row.kind;

/**
 * *All*, then each relationship the list holds, in the list's order. No choice empties the list, and
 * none is offered that would not narrow it: a list of one kind offers *All* alone (F-252's review, L4).
 */
export function filterOptions(rows: readonly GoesWithRow[]): readonly FilterChoice[] {
  const kinds: Exclude<FilterChoice, 'all'>[] = [];
  for (const row of rows) if (!kinds.includes(choiceOf(row))) kinds.push(choiceOf(row));
  return ['all', ...(kinds.length > 1 ? kinds : [])];
}

export function filterRows(
  rows: readonly GoesWithRow[],
  choice: FilterChoice,
): readonly GoesWithRow[] {
  return choice === 'all' ? rows : rows.filter((row) => choiceOf(row) === choice);
}

export const FILTER_KEYS = {
  all: 'with.all',
  curated: 'combos.curated',
  ...RELATIONSHIP_KEYS,
} as const satisfies Readonly<Record<FilterChoice, MessageKey>>;

// ---- where the controls go (ADR-0171 D3, D4)

/** A row's Wear: 07 with the anchor as the top and the row's colour locked in the trousers. */
export const wearHref = (anchor: string, row: string): string =>
  `/atlas/wear/${anchor}?with=${row}`;

/** Build: 07, which builds a complete four-piece outfit around the colour. */
export const buildHref = (anchor: string): string => `/atlas/wear/${anchor}`;

// ---- the states (ADR-0171 D6)

export const EMPTY_KEYS = {
  nearGrey: 'with.empty.nearGrey',
  none: 'with.empty.none',
} as const satisfies Readonly<Record<string, MessageKey>>;

/**
 * A row's Wear, named by what it does (WCAG 2.5.3: the name begins with, or holds, the word drawn):
 * *Wear ‹row› with ‹anchor›*, and in Japanese 「‹row›を‹anchor›と合わせて着る」, each colour by the name
 * its locale reads first.
 */
export function wearName(
  row: PublishedEntry,
  anchor: PublishedEntry,
  t: T,
  script: Script,
): string {
  if (script === 'japanese')
    return `${row.entry.name.kanji}を${anchor.entry.name.kanji}${t('with.wearWith')}${t('with.wear')}`;
  return `${t('with.wear')} ${row.entry.name.en} ${t('with.wearWith')} ${anchor.entry.name.en}`;
}

/* ------------------------------------------------------------------ 19's drawn sizes */
/*
 * Each from `19.json` at its 0.6124 dp a pixel, to the half dp; `goes-with-fidelity.test` recomputes
 * every one. A line glyph's size is (ink − the line's fixed width) × 24 ÷ its path's extent, the two
 * readings averaged (09's rule): the back arrow's path and Build's arrow span 15.5 × 12 units, the
 * filter's 18 × 17.
 */

/** `19.header`: 78 px. */
export const WITH_APP_BAR = 48;
/** `19.back`'s arrow: 27 × 24 px of ink. */
export const BACK_GLYPH = 24.5;
/** `19.filter`: 33 × 28 px of ink. */
export const FILTER_GLYPH = 23.5;
/** `19.header-divider`: 35 px. */
export const DIVIDER = 21.5;
/** `19.anchor.ring`: the ring 3.75 px wide, then a 6.2 px gap to the sample (F-233), to the tenth. */
export const ANCHOR_RING = { ring: 2.3, gap: 3.8 } as const;
/** `19.anchor.swatch`: 143 × 132 px. */
export const ANCHOR_SAMPLE = { width: 87.5, height: 81 } as const;
/** `19.bar.build`: 67 px. */
export const BUILD = 41;
/** Build's arrow: 20 × 19 px of ink. */
export const ARROW_GLYPH = 18;
