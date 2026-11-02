/**
 * What `10`'s catalogue and `16`'s builder print (F-251, ADR-0164, ADR-0165): the pure half, as
 * `compare-readout.ts` is `08`'s. The screens lay it out; every word and figure is decided here.
 *
 * ## Every figure is the engine's, for the pair or the set its words name
 *
 * - **The contrast badge** is the anchor against the first `light` member by rank — the pair a
 *   palette's text would sit on — at WCAG 2.2's ratio, floored to one place as `10` prints it, beside
 *   the threshold the PRINTED ratio reaches (`08`'s rule). A palette with no light member draws no
 *   badge rather than a figure for some other pair.
 * - **The separation badge** is the worst pair of the set over the three deficiencies at severity 1
 *   (`worstSeparation`, E-005), FLOORED: it prints 100 only when it is 100 (rule 11; `07` rounds, and
 *   F-357 carries that). *approximate* rides on it when the worst deficiency is tritan (ADR-0131).
 * - **`16`'s matrix** is slot 1 against slot 2 (`contrastLine`, two figures), the set's warm–cool
 *   relation in `07`'s words (E-226), and the floored worst separation (`separationLine`). Under two
 *   colours a row says so; it never prints a figure for a pair that is not there.
 *
 * ## Words
 *
 * Every word comes from a literal map over the schema's values, so the unused-key scan sees each
 * reader and a fifth role or category fails to compile. The role words are each surface's own —
 * `10`'s columns, `16`'s headings, `16`'s roles — and they are role NAMES, an editorial statement the
 * schema records, not measurements (ADR-0164 D5).
 */

import type { Color } from '@irodora/color-core';
import { apcaLc, wcagContrast } from '@irodora/color-difference';
import { xyzToSrgb, type Triple } from '@irodora/color-spaces';
import {
  PALETTE_CATEGORIES,
  type Classification,
  type PaletteCategory,
  type PaletteRole,
  type RecordProvenance,
} from '@irodora/corpus';
import type { Deficiency } from '@irodora/cvd-engine';
import { warmCoolRelation } from '@irodora/recommendation';
import type { StoredPalette } from '@irodora/store';
import { BILINGUAL_SEPARATOR, type Script } from '@irodora/ui';
import { MODEL_KEYS, thresholdKey } from './compare-readout';
import {
  allPalettes,
  colorFor,
  entryBySlug,
  type PublishedEntry,
  type PublishedPalette,
} from './corpus';
import { CLASSIFICATION_KEYS, reviewLineOf, SOURCE_TYPE_KEYS } from './detail';
import type { MessageKey } from './i18n';
import { nameLine } from './notation';
import { worstSeparation } from './outfit/cvd';
import type { WornCombination } from './outfit/fromWear';
import {
  slotOf,
  SLOT_ROLES,
  type DraftCategory,
  type DraftProblem,
  type PaletteDraft,
} from './palette';
import { ruleSet } from './rules';
import { HARMONY_KEYS } from './temperature';
import { colorOf } from './wardrobe';
import { contrastLine, separationLine } from './wear';

type T = (key: MessageKey) => string;

/* ------------------------------------------------------------------ the literal maps */

/** FR-23's displayed category, as form 1's description opens. */
export const CATEGORY_KEYS = {
  contemporary: 'palettes.category.contemporary',
  traditional: 'palettes.category.traditional',
  seasonal: 'palettes.category.seasonal',
  kasane: 'palettes.category.kasane',
} as const satisfies Record<PaletteCategory, MessageKey>;

/** `10`'s column role words. */
export const COLUMN_ROLE_KEYS = {
  anchor: 'palettes.column.anchor',
  light: 'palettes.column.light',
  neutral: 'palettes.column.neutral',
  accent: 'palettes.column.accent',
} as const satisfies Record<PaletteRole, MessageKey>;

/** `16`'s slot headings: *Slot 1: Anchor / Dark Base* (ADR-0163 reads its brackets as notation). */
export const SLOT_HEADING_KEYS = {
  anchor: 'palettes.slot.anchor',
  light: 'palettes.slot.light',
  neutral: 'palettes.slot.neutral',
  accent: 'palettes.slot.accent',
} as const satisfies Record<PaletteRole, MessageKey>;

/** `16`'s role line: *Role: Anchor*. */
export const ROLE_KEYS = {
  anchor: 'role.anchor',
  light: 'role.light',
  neutral: 'role.neutral',
  accent: 'role.accent',
} as const satisfies Record<PaletteRole, MessageKey>;

/** `16`'s type chips, by the category each names (ADR-0164 D7). */
export const TYPE_KEYS = {
  contemporary: 'palettes.type.contemporary',
  kasane: 'palettes.type.kasane',
  seasonal: 'palettes.type.seasonal',
} as const satisfies Record<DraftCategory, MessageKey>;

/** Why a draft cannot be saved, in words (FR-49). */
export const PROBLEM_KEYS = {
  empty: 'studio.problem.empty',
  noAnchor: 'studio.problem.noAnchor',
  noName: 'studio.problem.noName',
  tooFewLayers: 'studio.problem.tooFewLayers',
  other: 'studio.problem.other',
} as const satisfies Record<DraftProblem, MessageKey>;

/* ------------------------------------------------------------------ a palette as a card shows it */

/** Where a palette came from: the corpus, or this device. */
export type PaletteOrigin = 'curated' | 'personal';

/** One member, as a card draws it. */
export interface ShownMember {
  readonly slug: string;
  readonly role: PaletteRole;
  readonly weight: number;
  /** The rendered value: the bundle's for a curated palette, the stored row's for a personal one. */
  readonly hex: string;
  readonly color: Color;
  /** The corpus entry the slug names, where this bundle holds it: its kanji and romaji. */
  readonly entry: PublishedEntry | null;
  /** The English name, which the stored row keeps whether or not the bundle still does. */
  readonly name: string;
}

export interface ShownPalette {
  /** Unique across both origins: `curated:‹slug›` or `personal:‹id›`. */
  readonly key: string;
  /** The corpus slug, or the stored row's id. */
  readonly id: string;
  readonly origin: PaletteOrigin;
  readonly name: { readonly en: string; readonly ja: string };
  readonly category: PaletteCategory;
  /** A curated palette's classification; a personal one is shown by its origin instead (ADR-0067). */
  readonly classification: Classification | null;
  readonly provenance: RecordProvenance | null;
  readonly versionId: string;
  /** In rank order. */
  readonly members: readonly ShownMember[];
}

/** The curated palettes in `10`'s order: by category, as the schema lists them, then by slug. */
export function curatedOrder(
  palettes: readonly PublishedPalette[] = allPalettes(),
): readonly PublishedPalette[] {
  return [...palettes].sort(
    (a, b) =>
      PALETTE_CATEGORIES.indexOf(a.palette.category) -
        PALETTE_CATEGORIES.indexOf(b.palette.category) ||
      a.palette.slug.localeCompare(b.palette.slug),
  );
}

/** A corpus palette as a card shows it. */
export function curatedShown(published: PublishedPalette): ShownPalette {
  const { palette } = published;
  return {
    key: `curated:${palette.slug}`,
    id: palette.slug,
    origin: 'curated',
    name: palette.name,
    category: palette.category,
    classification: palette.classification,
    provenance: palette.provenance,
    versionId: palette.versionId,
    members: [...palette.colors]
      .sort((a, b) => a.rank - b.rank)
      .map((m) => {
        const entry = entryBySlug(m.slug);
        // Gate 11 holds every palette member to a published entry; a bundle that broke that is
        // corrupt, and a card that drew some other colour in its place would hide it.
        if (entry === null)
          throw new Error(`palette ${palette.slug}: member ${m.slug} is not in this corpus`);
        return {
          slug: m.slug,
          role: m.role,
          weight: m.weight,
          hex: entry.derived.hex,
          color: colorFor(entry.entry),
          entry,
          name: entry.entry.name.en,
        };
      }),
  };
}

/** A palette saved on this device as a card shows it: the colours it holds, as stored. */
export function personalShown(stored: StoredPalette): ShownPalette {
  return {
    key: `personal:${stored.id}`,
    id: stored.id,
    origin: 'personal',
    name: { en: stored.nameEn, ja: stored.nameJa },
    category: (PALETTE_CATEGORIES as readonly string[]).includes(stored.category)
      ? (stored.category as PaletteCategory)
      : 'contemporary',
    classification: null,
    provenance: null,
    versionId: stored.versionId,
    members: stored.members.map((m) => ({
      slug: m.slug,
      role: m.role as PaletteRole,
      weight: m.weight,
      hex: m.color.hex,
      color: colorOf(m.color),
      entry: entryBySlug(m.slug),
      name: m.color.name,
    })),
  };
}

/** `10`'s two card forms: a kasane's layers drawn apart (form 2); every other palette's band (form 1). */
export function cardForm(category: PaletteCategory): 'band' | 'layers' {
  return category === 'kasane' ? 'layers' : 'band';
}

/* ------------------------------------------------------------------ the card's words */

const stop = (script: Script): string => (script === 'japanese' ? '。' : '.');

/** The title: both of a curated palette's names; a personal palette's one name, once. */
export function titleLine(palette: ShownPalette): string {
  return palette.origin === 'personal' || palette.name.en === palette.name.ja
    ? palette.name.en
    : `${palette.name.en}${BILINGUAL_SEPARATOR}${palette.name.ja}`;
}

/** Form 1's description: FR-23's category and classification, or a personal palette's origin. */
export function descriptionLine(palette: ShownPalette, t: T, script: Script): string {
  if (palette.classification === null) return t('studio.origin');
  const end = stop(script);
  const space = script === 'japanese' ? '' : ' ';
  return `${t(CATEGORY_KEYS[palette.category])}${end}${space}${t(CLASSIFICATION_KEYS[palette.classification])}${end}`;
}

/** Form 1's provenance line: the source type and the review the record holds (F-084's words). */
export function provenanceLine(palette: ShownPalette, t: T, script: Script): string {
  const space = script === 'japanese' ? '' : ' ';
  const lead = `${t('palettes.provenance')}${space}`;
  if (palette.provenance === null)
    return `${lead}${t('palettes.builtFrom')}${space}${palette.versionId}`;
  const comma = script === 'japanese' ? '、' : ', ';
  return `${lead}${t(SOURCE_TYPE_KEYS[palette.provenance.sourceType])}${comma}${reviewLineOf(palette.provenance, t, script)}`;
}

/** A column beneath the band: the role word, the hex, the kanji and romaji, the English. */
export interface ColumnLines {
  readonly role: string;
  readonly hex: string;
  readonly name: string;
  /** `(English)`, or `null` where the name line is already the English one. */
  readonly english: string | null;
}

export function columnLines(member: ShownMember, t: T): ColumnLines {
  return {
    role: t(COLUMN_ROLE_KEYS[member.role]),
    hex: member.hex,
    name: member.entry === null ? member.name : nameLine(member.entry),
    english: member.entry === null ? null : `(${member.entry.entry.name.en})`,
  };
}

/** Form 2's kind: *Curated Palette* or *Your Palette*. */
export function kindLabel(palette: ShownPalette, t: T): string {
  return t(palette.origin === 'curated' ? 'palettes.kind.curated' : 'palettes.kind.personal');
}

/** Form 2's layering tag: inspired by, never the Heian system itself (FR-23, C14). */
export function layeringTag(t: T): string {
  return t('palettes.layering');
}

/** Form 2's provenance tag: the classification, or the device's words (ADR-0067). */
export function provenanceTag(palette: ShownPalette, t: T): string {
  return palette.classification === null
    ? t('palettes.madeHere')
    : t(CLASSIFICATION_KEYS[palette.classification]);
}

/* ------------------------------------------------------------------ the figures */

/** The sRGB a figure is computed on: the bundle's derivation where it holds the entry, as `08`'s. */
function rgbOf(member: ShownMember): Triple {
  return member.entry === null ? xyzToSrgb(member.color.xyz) : member.entry.derived.rgb;
}

/** The pair the contrast badge measures: the anchor and the first light member by rank. */
export function contrastPair(
  members: readonly ShownMember[],
): readonly [ShownMember, ShownMember] | null {
  const anchor = members.find((m) => m.role === 'anchor');
  const light = members.find((m) => m.role === 'light');
  return anchor === undefined || light === undefined ? null : [anchor, light];
}

/** A ratio as `10` prints it: floored to one place, so it never claims a threshold it does not reach. */
export function printedRatio(ratio: number): number {
  return Math.floor(ratio * 10) / 10;
}

/** The contrast badge's words, or `null` when the palette holds no light member. */
export function contrastBadge(members: readonly ShownMember[], t: T): string | null {
  const pair = contrastPair(members);
  if (pair === null) return null;
  const ratio = printedRatio(wcagContrast(rgbOf(pair[0]), rgbOf(pair[1])));
  return `${t('palettes.badge.wcag')} ${t(thresholdKey(ratio))} ${ratio.toFixed(1)}:1`;
}

/** The worst separation over every pair of a set: its floored figure, its exact value and its deficiency. */
export interface SetSeparation {
  readonly score: number;
  readonly exact: number;
  readonly worst: Deficiency;
}

/** `null` under two colours: a separation is between colours. */
export function paletteSeparation(colors: readonly Color[]): SetSeparation | null {
  const pairs = colors.flatMap((a, i) => colors.slice(i + 1).map((b) => worstSeparation(a, b)));
  const worst = pairs.reduce<(typeof pairs)[number] | null>(
    (found, pair) => (found === null || pair.score < found.score ? pair : found),
    null,
  );
  return worst === null
    ? null
    : { score: Math.floor(worst.score), exact: worst.score, worst: worst.deficiency };
}

/** The separation badge's words: *CVD ‹n›% Separation (Machado 2009)*, or `null` under two colours. */
export function separationBadge(
  members: readonly ShownMember[],
  t: T,
  script: Script,
): string | null {
  const separation = paletteSeparation(members.map((m) => m.color));
  if (separation === null) return null;
  const [open, close] = script === 'japanese' ? ['（', '）'] : [' (', ')'];
  return `${t('palettes.badge.cvd')} ${String(separation.score)}% ${t('cvd.separation')}${open}${t(MODEL_KEYS[separation.worst])}${close}`;
}

/* ------------------------------------------------------------------ 16's matrix */

/** One of the matrix's three rows. */
export interface MatrixRow {
  readonly key: 'contrast' | 'harmony' | 'separation';
  readonly label: string;
  /** The contrast row's pair, set apart as `16` draws it: *(Slot 1 vs 2)*. */
  readonly pair: string | null;
  readonly value: string;
}

/** The draft's colours in slot order: what the matrix computes on. */
export function draftColours(draft: PaletteDraft): readonly PublishedEntry[] {
  return SLOT_ROLES.flatMap((role) => {
    const slug = slotOf(draft, role);
    const entry = slug === null ? null : entryBySlug(slug);
    return entry === null ? [] : [entry];
  });
}

export function matrixRows(draft: PaletteDraft, t: T, script: Script): readonly MatrixRow[] {
  const choose = t('palettes.chooseTwo');
  const [first, second] = SLOT_ROLES.map((role) => {
    const slug = slotOf(draft, role);
    return slug === null ? null : entryBySlug(slug);
  });
  const contrast =
    first === null || first === undefined || second === null || second === undefined
      ? null
      : contrastLine({
          ratio: wcagContrast(first.derived.rgb, second.derived.rgb),
          // The SMALLER magnitude of the two directions, as `07` prints it (rule 11).
          lc: Math.min(
            Math.abs(apcaLc(first.derived.rgb, second.derived.rgb)),
            Math.abs(apcaLc(second.derived.rgb, first.derived.rgb)),
          ),
        });
  const colours = draftColours(draft).map((e) => colorFor(e.entry));
  const separation = paletteSeparation(colours);
  return [
    {
      key: 'contrast',
      label: t('palettes.matrix.contrast'),
      pair: t('palettes.matrix.pair'),
      value: contrast ?? choose,
    },
    {
      key: 'harmony',
      label: t('palettes.matrix.harmony'),
      pair: null,
      value:
        colours.length < 2
          ? choose
          : t(HARMONY_KEYS[warmCoolRelation(colours, ruleSet()).direction]),
    },
    {
      key: 'separation',
      label: t('palettes.matrix.separation'),
      pair: null,
      value: separation === null ? choose : separationLine(separation.score, t, script),
    },
  ];
}

/* ------------------------------------------------------------------ what leaves the Studio */

/**
 * `10`'s *Apply to Outfit Lab* (ADR-0165 D2): the anchor on top, locked by `labDraftFrom`; the
 * trousers the first member by rank after it that is not an accent; the shoes the first accent, or
 * the next member not yet placed. No colour sits in two slots.
 */
export function labHandOff(members: readonly ShownMember[]): WornCombination {
  const anchor = members.find((m) => m.role === 'anchor') ?? members[0];
  if (anchor === undefined) throw new Error('labHandOff: a palette has at least one member');
  const rest = members.filter((m) => m !== anchor);
  const trouser = rest.find((m) => m.role !== 'accent') ?? null;
  const shoe =
    rest.find((m) => m.role === 'accent' && m !== trouser) ??
    rest.find((m) => m !== trouser) ??
    null;
  return { top: anchor.slug, trouser: trouser?.slug ?? null, shoe: shoe?.slug ?? null };
}

/** Where *Export Tokens* goes: the export screen, holding this palette and, if given, the format. */
export function exportHref(palette: ShownPalette, format?: string): string {
  const which =
    palette.origin === 'curated'
      ? `palette=${encodeURIComponent(palette.id)}`
      : `saved=${encodeURIComponent(palette.id)}`;
  return `/profile/export?${which}${format === undefined ? '' : `&format=${encodeURIComponent(format)}`}`;
}

/* ------------------------------------------------------------------ 16's tray */

/** How many tiles `16`'s tray shows a page. */
export const TRAY_PAGE = 7;

/** The tray's pages: every entry once, in the order given, `size` a page. */
export function trayPages<E>(
  entries: readonly E[],
  size: number = TRAY_PAGE,
): readonly (readonly E[])[] {
  const pages: E[][] = [];
  entries.forEach((entry, i) => {
    if (i % size === 0) pages.push([]);
    pages[pages.length - 1]?.push(entry);
  });
  return pages;
}

/** The page holding `slug`, or `null` when no page does. */
export function pageOf(pages: readonly (readonly PublishedEntry[])[], slug: string): number | null {
  const index = pages.findIndex((page) => page.some((e) => e.entry.slug === slug));
  return index === -1 ? null : index;
}

/* ------------------------------------------------------------------ the drawn sizes */

/*
 * What 10 and 16 draw, in dp, from their inventories (`mockups/inventory/10.json`, `16.json`). Each is
 * recomputed from the JSON by the screens' fidelity tests, so a re-measured element that moves one
 * fails a test instead of leaving a stale constant (F-248's lesson).
 */

/** `10`'s app bar, its title row below the controls included (`10.header`). */
export const STUDIO_APP_BAR = 84;
/** *Create New Palette* (`10.create`). */
export const CREATE = 24;
/** The segmented control (`10.source`). */
export const SOURCE_HEIGHT = 33;
/** The band (`10.palette-1.strip`): shown, not judged (ADR-0162). */
export const BAND_HEIGHT = 60;
/** A badge or a tag (`10.palette-1.badge-*`, `10.palette-2.tag-*`): siblings, one height. */
export const BADGE = 19.5;
/** A card's two actions (`10.palette-1.apply`, `.export`). */
export const CARD_ACTION = 27.5;
/** A kasane's layer (`10.palette-2.swatch-*`): siblings, one height. */
export const LAYER_HEIGHT = 61.5;
/** The export bar's button (`10.export-bar.button`). */
export const EXPORT_SELECTED = 29;
/** `10`'s leaves down the right margin (`10.art`), from the screen's top, drawn at their width: the drawing keeps its own proportion. */
export const STUDIO_ART = { top: 30, width: 62.5 } as const;

/** `16`'s bar, to its rule (`16.header-rule`). */
export const BUILDER_APP_BAR = 49;
/** *Save Palette* (`16.save`). */
export const SAVE = 25.5;
/** The name field (`16.name.field`). */
export const NAME_FIELD = 27;
/** A type chip (`16.name.kind.*`): siblings, one height. */
export const TYPE_CHIP = 20;
/** A slot's sample (`16.slots.slot-*.swatch`): siblings, one height. */
export const SLOT_SAMPLE = 34.5;
/** The padlock on *Locked* (`16.slots.slot-1.locked`). */
export const LOCK_GLYPH_16 = 9.5;
/** The glyph after *Replace* (`16.slots.slot-*.replace`). */
export const REPLACE_GLYPH = 9.5;
/** The matrix's label column: from a label's start to its value's (`16.matrix.*.label`, `.value`). */
export const MATRIX_LABEL_COLUMN = 148;
/** A tray tile (`16.tray.chip-*`): siblings, one width — the median — and one height. */
export const TILE_WIDTH = 35.5;
export const TILE_HEIGHT = 56.5;
/** How much of a neighbouring page's tile shows at the screen's edge (`16.tray.chip-1`). */
export const TRAY_PEEK = 21;
/** The tray's rule to its tiles (`16.tray` to `16.tray.chip-*`). */
export const TRAY_INSET = 11;
/** The tray's chevrons (`16.tray.previous`, `.next`). */
export const CHEVRON_GLYPH = 15;
/** *Create & Save Palette* (`16.create`). */
export const CREATE_AND_SAVE = 30.5;
/** `16`'s art, from the top of the page under its bar (`16.art-*`; ADR-0166 D7). */
export const BUILDER_ART = [
  { key: 'kimono', name: 'kimono', side: 'left', top: 116, width: 40 },
  { key: 'sashiko-top', name: 'sashiko', side: 'right', top: 45, width: 39 },
  { key: 'sashiko-bottom', name: 'sashiko', side: 'right', top: 391, width: 36.5 },
] as const;
