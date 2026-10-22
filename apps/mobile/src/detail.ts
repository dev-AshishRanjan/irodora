/**
 * What the colour page says, decided here (F-247; mockups `06` and `26`).
 *
 * The screen draws these answers and does not work them out, as the Atlas's `atlas.ts` and Home's
 * `home.ts` do: what the readout prints, what the pill and the provenance card say, and which of the
 * person's garments the page offers are written where somebody can disagree with them, and tested
 * without rendering anything.
 *
 * ## What the page says (ADR-0146)
 *
 * - **The readout**: the record's own derivation — hex, OKLCh, CIELAB — and sRGB as the hex's bytes;
 *   Display P3 is the engine's conversion of the record's XYZ, passed in, because a conversion is the
 *   engine's (`engine.ts`), never this file's.
 * - **The pill**: the family group, *Era: None* where the record holds none (all 120 today), and the
 *   season, or *Not assigned* — labelled segments state an absent value rather than leaving a blank.
 * - **The provenance card**: the classification as its lead (FR-23), the source, its type and its
 *   licence (FR-24), and the check the record holds (F-084) — never *Verified*.
 *
 * ## Which garments (ADR-0148)
 *
 * The person's own, ranked by the builder's one ranking with this colour as a top; the order only.
 *
 * Pure: every input is an argument, except the corpus and the vocabulary, which are the verified
 * bundle's.
 */

import {
  illustrationBox,
  swatchAccessibleName,
  type ReadoutPart,
  type TableRow,
} from '@irodora/ui';
import type { OutfitPiece } from '@irodora/recommendation';
import type { StoredGarment } from '@irodora/store';
import { seasonLine } from './atlas';
import { colorFor, groupOf, type PublishedEntry } from './corpus';
import type { MessageKey } from './i18n';
import { capitalised } from './notation';
import { rankForSlot, type RankedGarment, type RankingContext } from './outfit/builder';
import { colorOf } from './wardrobe';
import { DEFAULT_SLOT, OUTFIT_SLOTS } from './wear';

type T = (key: MessageKey) => string;
type Script = 'latin' | 'japanese';
type Triple = readonly [number, number, number];

/* ------------------------------------------------------------------ the record's vocabulary */

/**
 * Classification → its label (FR-23). Exported so the card uses the SAME map: two copies of the
 * FR-23 vocabulary would drift, and the one that drifts would be the one on the artefact that leaves
 * the app with none of its context. (It lived on the colour page until F-247, which re-exports it.)
 */
export const CLASSIFICATION_KEYS = {
  historical: 'classification.historical',
  traditional: 'classification.traditional',
  'modern-japanese': 'classification.modern-japanese',
  'japanese-inspired': 'classification.japanese-inspired',
  editorial: 'classification.editorial',
} as const satisfies Record<string, MessageKey>;

export const SOURCE_TYPE_KEYS = {
  measurement: 'sourceType.measurement',
  publication: 'sourceType.publication',
  'museum-record': 'sourceType.museum-record',
  editorial: 'sourceType.editorial',
  standard: 'sourceType.standard',
} as const satisfies Record<string, MessageKey>;

export const INDEPENDENCE_KEYS = {
  independent: 'independence.independent',
  self: 'independence.self',
} as const satisfies Record<string, MessageKey>;

/* ------------------------------------------------------------------ 06's drawn sizes, in dp */

/** `06.header`: 71 px at 0.8101 dp/px. */
export const DETAIL_APP_BAR = 57.5;
/** `06.swatch`: 369 px tall. A named constant, so the screen states no bare size over 264 (E-076). */
export const HERO_HEIGHT = 299;
/** `06.swatch`'s line: 8.5 px across (`raw.keylinePx`), 6.9 dp. */
export const HERO_KEYLINE = 6.9;
/** `06.swatch.stack`: 17 px wide, the layer drawn behind the hero's trailing edge. */
export const STACK_WIDTH = 14;
/** `06.swatch.stack`: 368 px tall. Named, as the hero's height is (E-076). */
export const STACK_HEIGHT = 298;
/** `06.taxonomy`: 27 px. */
export const PILL = 22;
/** `06.combinations.item-n.photo`: 83 px. */
export const PHOTO = 67;
/** `06.combinations.item-n.rank`: 28 px. */
export const RANK = 22.5;
/** `06.actions.wear`: 44 px. */
export const WEAR = 35.5;
/** `06.actions.hold`: 42 px. */
export const HOLD = 34;
/**
 * `06.provenance.art`: drawn 134 px (108.5 dp) tall. The plum branch's own grid is squarer than 06's crop
 * (60 × 52 against 231 × 134 px), so at 06's 187 dp width it would draw 162 dp tall, past the card; it
 * is sized by its drawn height, and its width follows the drawing (F-247's review, ADR-0145 D3 amended).
 */
export const ART_HEIGHT = 108.5;
const [ART_BOX_W, ART_BOX_H] = illustrationBox('plum-branch');
/** The art's width: its drawn height at the drawing's own aspect, to the half dp. */
export const ART_WIDTH = Math.round(((ART_HEIGHT * ART_BOX_W) / ART_BOX_H) * 2) / 2;

/*
 * THE GLYPHS, at the size that inks what 06 draws. A line glyph's ink is its path's extent on the
 * 24-unit grid scaled to its size, PLUS the line, whose width is fixed on screen (`size.iconStroke`,
 * 1.65 dp): so size = (drawn ink − 1.65) × 24 ÷ the path's extent, to the half dp. Each is recomputed
 * from 06.json by the fidelity test.
 */
/** `06.back.icon`: inks 16 px (13.0 dp) tall; the arrow's path spans 12 units. */
export const BACK_GLYPH = 22.5;
/** `06.bookmark`: 22 px (17.8 dp); the path spans 18 units. */
export const BOOKMARK_GLYPH = 21.5;
/** `06.share`: 23 px (18.6 dp); 17.5 units. */
export const SHARE_GLYPH = 23.5;
/** `06.export`: 21 px (17.0 dp); 16.5 units. */
export const EXPORT_GLYPH = 22.5;
/** `06.actions.hold.icon`, the reticle: 21 px (17.0 dp); 16 units. */
export const HOLD_GLYPH = 23;
/**
 * `06.provenance.review`'s seal: inks 15 × 16 px (12.6 dp). A solid glyph has no line to add, and
 * the scalloped ring spans 17.8 of the grid's 24 units, so 12.6 × 24 ÷ 17.8.
 */
export const SEAL_GLYPH = 17;

/* ------------------------------------------------------------------ the names */

/** `06.name`: *Romaji • English* — the romaji capitalised, the English the corpus's. */
export function nameLine(entry: PublishedEntry): string {
  return `${capitalised(entry.entry.name.romaji)} • ${entry.entry.name.en}`;
}

/** A label and its value, joined as each script joins them. */
const labelled = (label: string, value: string, script: Script): string =>
  `${label}${script === 'japanese' ? '：' : ': '}${value}`;

/**
 * `06.taxonomy`: *Family: Ao (Blue) • Era: None • Season: Autumn* (ADR-0146 D2). The family is the
 * entry's F-224 group, as 06 draws it; in Japanese, its kanji. An era the record holds is printed as
 * it is; none is *None*. A season authored is the season's words; none is *Not assigned*.
 */
export function taxonomyLine(entry: PublishedEntry, t: T, script: Script): string {
  const group = groupOf(entry.entry.taxonomy.family);
  const family = script === 'japanese' ? group.kanji : `${group.romaji} (${group.en})`;
  const era = entry.entry.taxonomy.era ?? t('detail.eraNone');
  const season = seasonLine(entry, t, script) ?? t('detail.seasonNone');
  return [
    labelled(t('filter.family'), family, script),
    labelled(t('detail.era'), era, script),
    labelled(t('filter.season'), season, script),
  ].join(' • ');
}

/* ------------------------------------------------------------------ the readout */

const measure = (
  value: number,
  places: number,
  quantity: string,
  space: string,
  unit?: string,
): ReadoutPart => ({
  figure: {
    kind: 'measure',
    value,
    places,
    quantity,
    space,
    ...(unit === undefined ? {} : { unit }),
  },
});

/** The hex's three bytes. */
const bytesOf = (hex: string): Triple => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * `06.readout.table`: Hex, OKLCh, CIELAB, and sRGB with Display P3 after the bar (ADR-0146 D4). Each
 * value names its space (FR-61). The one entry outside sRGB says its hex is the nearest rendering,
 * and by how much (E2, rule 11). `p3` is the engine's conversion of the record's XYZ.
 */
export function readoutRows(entry: PublishedEntry, t: T, p3: Triple): readonly TableRow[] {
  const { derived } = entry;
  const hex = derived.hex;
  // In the row's own script, after its value: never inside the hex's code run (E2, F-152's faces).
  const note = derived.inSrgbGamut
    ? {}
    : {
        note: `${t('detail.nearestSrgb')}, ${t('colour.differenceUnit')} ${derived.renderDeltaE00.toFixed(2)}`,
      };
  const [r, g, b] = bytesOf(hex);
  return [
    {
      key: 'hex',
      label: t('colour.hex'),
      value: { kind: 'code', text: hex, spoken: `hex ${hex.slice(1)}` },
      ...note,
    },
    {
      key: 'oklch',
      label: t('coord.oklch'),
      value: {
        kind: 'figures',
        separator: ' • ',
        parts: [
          measure(derived.oklch[0], 3, 'L', 'OKLCh'),
          measure(derived.oklch[1], 3, 'C', 'OKLCh'),
          measure(derived.oklch[2], 1, 'h', 'OKLCh', '°'),
        ],
      },
    },
    {
      key: 'cielab',
      label: t('coord.lab'),
      value: {
        kind: 'figures',
        separator: ', ',
        parts: [
          { label: 'L*', ...measure(derived.lab[0], 1, 'L*', 'CIELAB') },
          { label: 'a*', ...measure(derived.lab[1], 1, 'a*', 'CIELAB') },
          { label: 'b*', ...measure(derived.lab[2], 1, 'b*', 'CIELAB') },
        ],
      },
    },
    {
      key: 'srgb',
      label: t('coord.rgb'),
      // The sRGB bytes are the hex's, so the one entry outside sRGB says so here too (F-247's review).
      ...note,
      value: {
        kind: 'figures',
        separator: ', ',
        parts: [measure(r, 0, 'R', 'sRGB'), measure(g, 0, 'G', 'sRGB'), measure(b, 0, 'B', 'sRGB')],
      },
      also: {
        label: t('coord.displayP3'),
        value: {
          kind: 'figures',
          separator: ', ',
          parts: [
            measure(p3[0], 3, 'R', 'Display P3'),
            measure(p3[1], 3, 'G', 'Display P3'),
            measure(p3[2], 3, 'B', 'Display P3'),
          ],
        },
      },
    },
  ];
}

/* ------------------------------------------------------------------ the provenance card */

/** `06.provenance.body`'s bold lead: the classification (FR-23, ADR-0065). */
export function provenanceLead(entry: PublishedEntry, t: T): string {
  return t(CLASSIFICATION_KEYS[entry.entry.classification]);
}

/** `06.provenance.body`: the source, its type and its licence (FR-24). */
export function provenanceBody(entry: PublishedEntry, t: T): string {
  const { provenance } = entry.entry;
  return [
    provenance.source,
    t(SOURCE_TYPE_KEYS[provenance.sourceType]),
    provenance.sourceLicence,
  ].join(' · ');
}

/**
 * `06.provenance.review`: the check the record holds — who checked it, relative to its author, and
 * when (F-084) — after the bold *Editorial Review*. Never *Verified*: the words say what was done.
 */
export function reviewLine(entry: PublishedEntry, t: T, script: Script): string {
  const { reviewIndependence, verifiedAt } = entry.entry.provenance;
  const who =
    reviewIndependence === null
      ? t('detail.notRecorded')
      : t(INDEPENDENCE_KEYS[reviewIndependence]);
  if (verifiedAt === null) return who;
  return `${who}${script === 'japanese' ? '、' : ', '}${verifiedAt}`;
}

/**
 * Whether the record holds an INDEPENDENT check: the seal is drawn only then (F-247's review, S3).
 * A seal beside *Checked by its own author* would say *verified* in a picture where the words say
 * otherwise; all 120 entries are self-reviewed today, so none draws it (ADR-0146 D3, amended).
 */
export function reviewSealed(entry: PublishedEntry): boolean {
  const { reviewIndependence, verifiedAt } = entry.entry.provenance;
  return reviewIndependence === 'independent' && verifiedAt !== null;
}

/* ------------------------------------------------------------------ the combinations */

export interface WearableCombination {
  /** 1, 2 or 3: the drawn number. */
  readonly rank: number;
  readonly garment: StoredGarment;
  readonly hex: string;
  readonly color: ReturnType<typeof colorOf>;
}

/** Best first, ties by garment id — the builder's own order. */
const better = (a: RankedGarment, b: RankedGarment): number =>
  a.score.overall !== b.score.overall
    ? b.score.overall - a.score.overall
    : a.garment.id < b.garment.id
      ? -1
      : a.garment.id > b.garment.id
        ? 1
        : 0;

/**
 * `06.combinations`: the person's own garments the engine ranks best with this colour as a top
 * (ADR-0148). Every garment that fills another slot is scored WITH the colour by the builder's one
 * ranking; the first `limit` are numbered. No score leaves this function: the page shows the order.
 */
export function wearableCombinations(
  entry: PublishedEntry,
  wardrobe: readonly StoredGarment[],
  context: RankingContext,
  limit = 3,
): readonly WearableCombination[] {
  const top: OutfitPiece = { slot: DEFAULT_SLOT, color: colorFor(entry.entry) };
  return OUTFIT_SLOTS.filter((slot) => slot !== DEFAULT_SLOT)
    .flatMap((slot) => rankForSlot(slot, [top], wardrobe, context))
    .sort(better)
    .slice(0, limit)
    .map((ranked, i) => ({
      rank: i + 1,
      garment: ranked.garment,
      hex: ranked.garment.color.hex,
      color: colorOf(ranked.garment.color),
    }));
}

/** What a combination is called: its name where the person gave one, its type where not. */
export function garmentLabel(garment: StoredGarment): string {
  return garment.name === null || garment.name.trim() === '' ? garment.type : garment.name;
}

/** A combination's caption, as 06 sets it: the name over the hex. */
export function combinationCaption(c: WearableCombination): string {
  return `${garmentLabel(c.garment)}\n${c.hex}`;
}

/**
 * A combination as a screen reader hears it: its number and name, then its colour as every sample in
 * the app is named — name, hex, source and confidence (`swatchAccessibleName`, as the Wardrobe names a
 * garment): the sample inside the control is hidden, so this is the only place its provenance is heard.
 */
export function combinationName(c: WearableCombination): string {
  return `${String(c.rank)}. ${garmentLabel(c.garment)} — ${swatchAccessibleName(c.garment.color.name, c.hex, c.color)}`;
}
