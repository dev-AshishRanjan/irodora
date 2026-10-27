/**
 * What `08` prints for a pair, and the pair itself (F-249).
 *
 * ## Every figure is the engine's, and every word agrees with the figure beside it
 *
 * `compare()` computes; this module decides what is PRINTED and what the words beside each figure
 * say ([ADR-0155](../../../docs/adr/0155-08s-figures-and-words-say-what-the-engine-computes.md)):
 *
 * | row | prints | its words |
 * |---|---|---|
 * | ΔE00 | `printedDeltaE00`, 2 dp | ADR-0125's band of the printed figure |
 * | ΔEok | OKLab distance, 3 dp | — |
 * | ΔL\*, ΔC\* | the record's CIELAB LCh, B less A, 1 dp | `axisReading(printed, weighted term)` |
 * | ΔH | the hue angle, `hueDelta`, 1 dp, ° | the hue band, then *towards ‹B's term›* where D2 allows |
 * | WCAG | the ratio, FLOORED to 2 dp | the threshold it reaches, and the warm–cool relation |
 * | APCA | the smaller \|Lc\|, floored to 1 dp | — |
 * | separations | `floor(score)` % at severity 1 | *(Machado 2009)*, approximate for tritan |
 *
 * **A direction is the printed figure's**, never the unrounded value's: a ΔL\* that prints 0.0 is
 * *level* even when the unrounded difference is not (16 corpus pairs), and it prints unsigned
 * (`signed`). **A threshold is the floored ratio's**: rounding would lift 14 corpus pairs across
 * 3:1 that flooring keeps under it.
 *
 * ## Two colours, always two
 *
 * `initialPair` never returns one colour twice, `choose` refuses the other slot's colour, and
 * `pickList` never offers it (ADR-0156 D1, D2). A comparison of a colour with itself is a page of
 * zeros, and the page had a line apologising for it; now it cannot be reached.
 *
 * ## The words are read through these maps as literals
 *
 * So the i18n suite's unused-key scan sees each key's reader (F-247's lesson), and a fourth threshold
 * or a fourth deficiency is a compile error rather than a missing string.
 */

import { axisReading, printedDeltaE00 } from '@irodora/color-difference';
import { matchesRegion, type LexiconTerm } from '@irodora/corpus';
import type { Deficiency } from '@irodora/cvd-engine';
import { nativeSpacing } from '@irodora/design-tokens';
import {
  SELECTION_EDGE,
  type Figure,
  type ReadoutValue,
  type RuledRow,
  type Script,
} from '@irodora/ui';
import { compare, COMPARED_DEFICIENCIES, type CompareMetrics } from './compare';
import { allEntries, entryBySlug, type PublishedEntry } from './corpus';
import { axisKey, bandKey } from './delta-readings';
import { find, lexicon } from './finder';
import type { Locale, MessageKey } from './i18n';
import { capitalised, oklchLine } from './notation';
import { HARMONY_KEYS } from './temperature';

type T = (key: MessageKey) => string;

/** The WCAG 2.2 thresholds a floored ratio can reach, highest first (SC 1.4.6, 1.4.3, 1.4.11). */
export const THRESHOLDS = [
  { at: 7, key: 'compare.threshold.textAAA' },
  { at: 4.5, key: 'compare.threshold.textAA' },
  { at: 3, key: 'compare.threshold.nonText' },
] as const satisfies readonly { readonly at: number; readonly key: MessageKey }[];

/** Below every threshold. */
export const UNDER_THRESHOLD_KEY = 'compare.threshold.under' satisfies MessageKey;

/** Each deficiency's row label: at severity 1 each is the dichromat's case, what *-anopia* names. */
export const DEFICIENCY_LABEL_KEYS = {
  protan: 'vision.mode.protanopia',
  deutan: 'vision.mode.deuteranopia',
  tritan: 'vision.mode.tritanopia',
} as const satisfies Record<Deficiency, MessageKey>;

/** The model each row was computed under; tritan's is not validated with tritanopes (ADR-0131). */
export const MODEL_KEYS = {
  protan: 'compare.model',
  deutan: 'compare.model',
  tritan: 'compare.modelApproximate',
} as const satisfies Record<Deficiency, MessageKey>;

/** The ratio as printed: floored to two places, so it never claims a threshold it does not reach. */
export function flooredRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}

/** The smaller |Lc| of the two directions, floored to one place, so the figure never overstates. */
export function shownLc(contrast: CompareMetrics['contrast']): number {
  return Math.floor(Math.min(Math.abs(contrast.apcaBOnA), Math.abs(contrast.apcaAOnB)) * 10) / 10;
}

/** The highest threshold the PRINTED ratio reaches, or the key for none. */
export function thresholdKey(printedRatio: number): MessageKey {
  return THRESHOLDS.find((x) => printedRatio >= x.at)?.key ?? UNDER_THRESHOLD_KEY;
}

/** A figure printed to `places`, as the number the words beside it describe. */
const printed = (value: number, places: number): number => Number(value.toFixed(places));

/** The lexicon's hue terms in one language: the terms that constrain hue. */
function hueTerms(locale: Locale): readonly LexiconTerm[] {
  return lexicon().terms.filter((t) => t.locale === locale && t.constrains.hue !== undefined);
}

const axesOf = (t: LexiconTerm): number => Object.keys(t.constrains).length;
const arcOf = (t: LexiconTerm): number => {
  const hue = t.constrains.hue;
  return hue === undefined ? 360 : (hue.max - hue.min + 360) % 360;
};

/**
 * The hue term an entry lies in, in one language, or `null`.
 *
 * DETERMINISTIC (ADR-0155 D2): the term that constrains the most axes (a dark orange is *brown*, not
 * *orange*), then the narrowest arc, then the file's order. Below the lexicon's chroma floor no hue
 * term applies, and a grey has none.
 */
export function hueTerm(entry: PublishedEntry, locale: Locale): LexiconTerm | null {
  const inside = hueTerms(locale).filter((t) => matchesRegion(t.constrains, entry.derived.oklch));
  const ranked = inside
    .map((t, i) => ({ t, i }))
    .sort((x, y) => axesOf(y.t) - axesOf(x.t) || arcOf(x.t) - arcOf(y.t) || x.i - y.i);
  return ranked[0]?.t ?? null;
}

/**
 * B's hue term, when the hue phrase may say the pair moves *towards* it: the hue band is at least
 * slight, B lies in a hue term of the locale's own language, and A's hue angle is outside that term's
 * arc. `null` otherwise — *towards blue* when A is already at blue's angle would say A was not.
 */
export function towards(
  a: PublishedEntry,
  b: PublishedEntry,
  band: 'veryClose' | 'slight' | 'perceptible',
  locale: Locale,
): string | null {
  if (band === 'veryClose') return null;
  const term = hueTerm(b, locale);
  if (term === null) return null;
  /*
   * A'S HUE ANGLE ALREADY IN THE TERM'S ARC — whatever its lightness or chroma — means the hue did not
   * move towards it, and the words sit beside a hue-angle figure (F-249's review, S2). B can be *brown*
   * while A, a light orange at 48°, is outside brown only because brown constrains lightness; and a
   * near-grey A at 245° is already at blue's angle, though no hue term names a grey.
   */
  const arc = term.constrains.hue;
  if (arc !== undefined && matchesRegion({ hue: arc }, a.derived.oklch)) return null;
  return term.term;
}

/** One figure as a readout value. */
const figure = (f: Figure): ReadoutValue => ({
  kind: 'figures',
  separator: '',
  parts: [{ figure: f }],
});

/** What `08` prints for one pair. */
export interface PairReadout {
  readonly metrics: readonly RuledRow[];
  readonly access: readonly RuledRow[];
  /** `‹kanji› ‹Romaji›`, as `08` names each sample. */
  readonly names: { readonly a: string; readonly b: string };
  /** `‹hex› • OKLCh ‹L› • ‹h›°`: two figures, as drawn. */
  readonly meta: { readonly a: string; readonly b: string };
}

/** `08`'s name line: the kanji, then the romaji. */
export function nameLine(entry: PublishedEntry): string {
  return `${entry.entry.name.kanji} ${capitalised(entry.entry.name.romaji)}`;
}

/** `08`'s meta line: the hex, then the record's OKLCh L and h. C is not printed (ADR-0155 D1). */
export function pairMeta(entry: PublishedEntry): string {
  return `${entry.derived.hex} • ${oklchLine(entry.derived.oklch, 'OKLCh', ' ', { chroma: false })}`;
}

/**
 * Every row `08` prints for A against B, in the locale's words.
 *
 * The numbers come from `compare()` once; nothing here is colour maths beyond printing them.
 */
export function pairReadout(
  a: PublishedEntry,
  b: PublishedEntry,
  t: T,
  locale: Locale,
  script: Script,
): PairReadout {
  const m = compare(a, b);
  const cielab = t('space.cielab');
  const dE = printedDeltaE00(m.deltaE00);
  const dL = printed(m.lch.l.delta, 1);
  const dC = printed(m.lch.c.delta, 1);
  const dH = printed(m.lch.h.delta, 1);
  const hue = axisReading(dH, m.terms.termH);
  const term = towards(a, b, hue.band, locale);
  const phrase = t(axisKey('hue', hue));
  // English reads *‹phrase› towards ‹term›*; Japanese puts the term before 寄り (*‹phrase›・緑寄り*).
  const hueWords =
    term === null
      ? phrase
      : script === 'japanese'
        ? `${phrase}・${term}${t('compare.towards')}`
        : `${phrase} ${t('compare.towards')} ${term}`;

  const metrics: RuledRow[] = [
    {
      key: 'delta-e00',
      label: 'ΔE00',
      formula: '(CIEDE2000)',
      value: figure({
        kind: 'measure',
        value: dE,
        places: 2,
        quantity: 'ΔE00',
        space: 'CIEDE2000',
      }),
      reading: t(bandKey(m.deltaE00)),
    },
    {
      key: 'delta-eok',
      label: 'ΔE',
      subscript: 'ok',
      value: figure({
        kind: 'measure',
        value: m.deltaEok,
        places: 3,
        quantity: 'ΔEok',
        space: 'OKLab',
      }),
    },
    {
      key: 'lightness',
      label: t('compare.lightness'),
      notation: 'ΔL*',
      value: figure({
        kind: 'measure',
        value: dL,
        places: 1,
        signed: true,
        quantity: 'ΔL*',
        space: cielab,
      }),
      reading: t(axisKey('lightness', axisReading(dL, m.terms.termL))),
    },
    {
      key: 'chroma',
      label: t('compare.chroma'),
      notation: 'ΔC*',
      value: figure({
        kind: 'measure',
        value: dC,
        places: 1,
        signed: true,
        quantity: 'ΔC*',
        space: cielab,
      }),
      reading: t(axisKey('chroma', axisReading(dC, m.terms.termC))),
    },
    {
      key: 'hue',
      label: t('compare.hue'),
      notation: 'ΔH',
      value: figure({
        kind: 'measure',
        value: dH,
        places: 1,
        signed: true,
        unit: '°',
        quantity: t('compare.hueAngle'),
        space: cielab,
      }),
      reading: hueWords,
    },
  ];

  const ratio = flooredRatio(m.contrast.wcagRatio);
  const lc = shownLc(m.contrast).toFixed(1);
  const [open, close, colon] = script === 'japanese' ? ['（', '）', '：'] : [' (', ')', ': '];
  const access: RuledRow[] = [
    {
      key: 'wcag',
      label: t('compare.wcag'),
      value: figure({
        kind: 'measure',
        value: ratio,
        places: 2,
        unit: ':1',
        quantity: t('compare.ratio'),
        space: 'WCAG 2.2',
      }),
      reading: `• ${t(thresholdKey(ratio))} / ${t(HARMONY_KEYS[m.temperature.direction])}`,
      // Spoken without the drawn bullet and slash (F-249's review, M9).
      readingName: `${t(thresholdKey(ratio))}, ${t(HARMONY_KEYS[m.temperature.direction])}`,
      readingInk: 'figure',
      note: `${open.trim()}${t('compare.apcaLc')}${colon}${lc}${close}`,
      // The printed Lc is one of two directions; its name says which (ADR-0155 D3).
      noteName: `${t('compare.apcaLc')} ${lc}, ${t('compare.apcaSmaller')}`,
    },
    ...COMPARED_DEFICIENCIES.map((d, i): RuledRow => {
      const detail = m.separation[i];
      // One reading per deficiency, by construction; a missing one is a defect, never a printed 0 %.
      if (detail === undefined) throw new Error(`compare: no separation for ${d}`);
      const score = Math.floor(detail.score);
      return {
        key: d,
        label: t(DEFICIENCY_LABEL_KEYS[d]),
        value: figure({
          kind: 'measure',
          value: score,
          places: 0,
          unit: '%',
          quantity: t('cvd.separation'),
          space: t(MODEL_KEYS[d]),
        }),
        reading: `${t('cvd.separation')}${open}${t(MODEL_KEYS[d])}${close}`,
        // The figure's own name already says what it is and the model (M9): not said twice.
        readingName: '',
      };
    }),
  ];

  return {
    metrics,
    access,
    names: { a: nameLine(a), b: nameLine(b) },
    meta: { a: pairMeta(a), b: pairMeta(b) },
  };
}

/** Which slot a chooser is for. */
export type Side = 'a' | 'b';

/** The pair on screen: two corpus slugs, never one twice. */
export interface PairState {
  readonly a: string;
  readonly b: string;
}

/**
 * The pair a route opens on (ADR-0156 D1): A is `?a` if the corpus holds it, else the first entry;
 * B is the last entry, or the first when A is the last. `null` when `?a` names a colour this corpus
 * does not hold — the absent state.
 */
export function initialPair(aParam?: string): PairState | null {
  const entries = allEntries();
  const first = entries[0]?.entry.slug ?? '';
  const last = entries.at(-1)?.entry.slug ?? '';
  if (aParam !== undefined && aParam !== '' && entryBySlug(aParam) === null) return null;
  const a = aParam === undefined || aParam === '' ? first : aParam;
  return { a, b: a === last ? first : last };
}

/** Choose a colour for one slot. The other slot's colour is refused: the pair stays two colours. */
export function choose(state: PairState, side: Side, slug: string): PairState {
  const other = side === 'a' ? state.b : state.a;
  if (slug === other || entryBySlug(slug) === null) return state;
  return side === 'a' ? { ...state, a: slug } : { ...state, b: slug };
}

/**
 * What a slot's sheet lists for a query: the Finder's own `find()` (a name, a phrase or a hex), or
 * every entry while the field is empty — less the other slot's colour (ADR-0156 D2).
 */
export function pickList(query: string, side: Side, state: PairState): readonly PublishedEntry[] {
  const other = side === 'a' ? state.b : state.a;
  const found = query.trim() === '' ? allEntries() : find(query).entries;
  return found.filter((e) => e.entry.slug !== other);
}

/** `08.seam`: 2 px at 2 px per dp. */
export const SEAM = 1;

/**
 * Each sample's side (ADR-0154 D2): the pair card spans the page less its `md` insets and reserves
 * its state edge inside its box (`SELECTION_EDGE`, 2 dp a side, transparent at rest); the seam splits
 * what is left; each half is padded `sm` all round. 157.5 dp at 384, 125.5 at 320. F-249's review
 * (S1) found the edge left out: the sample overran its half by 2 dp.
 */
export function pairSampleSize(width: number): number {
  return (width - 2 * nativeSpacing.md - 2 * SELECTION_EDGE - SEAM) / 2 - 2 * nativeSpacing.sm;
}

/*
 * THE DRAWN SIZES (ADR-0157), each recomputed from 08.json by `compare-fidelity.test`. A line glyph's
 * ink is its path's extent on the 24-unit grid scaled to its size, plus the line, whose width is fixed
 * on screen (`size.iconStroke`, 1.65 dp): size = (drawn ink − 1.65) × 24 ÷ the path's extent (06's rule).
 */

/** `08.header`: the bar to its rule, 93 px. */
export const COMPARE_APP_BAR = 46.5;
/** `08.back`'s arrow: 18 px (9 dp) tall; the path spans 12 units. */
export const BACK_GLYPH = 14.5;
/** `08.export`: 32 px (16 dp) tall; the page spans 18 units. */
export const EXPORT_GLYPH = 19;
/** `08.pair.*.change`: 54 px. */
export const CHANGE = 27;
/** `08.actions.pdf` and `08.actions.studio`: 61 px each — one height (ADR-0157 D1). */
export const ACTION = 30.5;

/**
 * `08`'s plum branch, three fragments of the product's one drawing (`plum-branch`, 60 × 52), in the
 * scroll content's art layer — whose top is the app bar's rule. Each is placed so its strokes cross its
 * inventory box at 384 dp and clipped at the frame, as `01`'s `HOME_ART` places its own: the top and
 * the right hug the trailing edge at any width, the left the leading edge.
 */
export const COMPARE_ART = {
  /** `08.art-top`: x 260–362.5, y 50–88 dp, above the pair card. */
  top: { right: 9, top: 0, width: 120 },
  /** `08.art-right`: the trailing 15 dp, y 95–220.5, beside the pair card. */
  right: { right: -104, top: 40, width: 120 },
  /** `08.art-left`: the leading 16 dp, y 471–610, beside the metrics card. */
  left: { left: -104, top: 423.5, width: 120 },
} as const;
