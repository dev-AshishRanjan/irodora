/**
 * What `09`'s Finder holds and prints: the search, its point, the sliders' readings and each result's
 * lines — pure, so every case the data allows is tested without rendering anything (E-230).
 *
 * ## A query names a set and sets a point (ADR-0158)
 *
 * ```
 * a hex      → the whole corpus     at the hex's own OKLCh
 * a phrase   → the region's entries at their medoid
 * a name     → the matching entries at their medoid
 * the empty  → the whole corpus     at the corpus's medoid
 * ```
 *
 * The sliders show the point and move it; the results are the set, ranked by ΔE00 from it through
 * the one ranking route (`finder.ts#rankedFrom`). A named set is shown whole; the whole corpus as its
 * nearest `HEX_LIMIT`. The point is a SEARCH TARGET: it is never drawn as a colour and never called a
 * measurement (rule 11), and no sample of it is drawn, because it has no provenance (rule 12).
 *
 * ## The words describe the printed figures (ADR-0159)
 *
 * Each slider prints the point at its precision, then the locale's lexicon terms whose NAMING AXIS is
 * that slider's and whose whole region holds the PRINTED point — so a word never contradicts the
 * figure beside it at a boundary. A term names one axis: hue if it constrains hue, else lightness,
 * else chroma. *Pale* is read on lightness and *brown* on hue; the hue terms' chroma floor and brown's
 * lightness cap are conditions, never readings of their own.
 */

import { printedDeltaE00 } from '@irodora/color-difference';
import {
  matchesRegion,
  type LexiconAxis,
  type LexiconTerm,
  type PhraseLexicon,
} from '@irodora/corpus';
import type { Triple } from '@irodora/color-spaces';
import { allEntries, type PublishedEntry } from './corpus';
import {
  find,
  findAs,
  hexPoint,
  HEX_LIMIT,
  lexicon,
  rankedFrom,
  type NearestEntry,
  type Reading,
} from './finder';
import type { Locale, MessageKey } from './i18n';
import { medoid } from './medoid';
import { capitalised, nameLine, oklchLine } from './notation';

type Translate = (key: MessageKey) => string;

/** The three sliders, in the order `09` draws them. */
export const AXES = ['lightness', 'chroma', 'hue'] as const satisfies readonly LexiconAxis[];
export type Axis = (typeof AXES)[number];

/** Each slider's label (`09`'s *Lightness (L) · Chroma (C) · Hue (H)*). A literal map, so the key scan sees it. */
export const AXIS_LABEL_KEYS: Readonly<Record<Axis, MessageKey>> = {
  lightness: 'finder.lightness',
  chroma: 'finder.chroma',
  hue: 'finder.hue',
};

/** Each slider's accessible name: the OKLCh axis of the search point (ADR-0158 D6). */
export const AXIS_NAME_KEYS: Readonly<Record<Axis, MessageKey>> = {
  lightness: 'finder.lightnessName',
  chroma: 'finder.chromaName',
  hue: 'finder.hueName',
};

/** The three readings of the search, in `09`'s order; `Japanese Kanji` is E2's *Colour Name*. */
export const READINGS = ['phrase', 'name', 'hex'] as const satisfies readonly Reading[];
export const MODE_KEYS: Readonly<Record<Reading, MessageKey>> = {
  phrase: 'finder.mode.phrase',
  name: 'finder.mode.name',
  hex: 'finder.mode.hex',
};

/**
 * The sliders' ranges (ADR-0159 D1): CSS Color 4's OKLCh reference ranges — *"for L: 0% = 0.0, 100% =
 * 1.0"*, *"for C: 0% = 0.0 100% = 0.4"* — and the hue's whole turn, in whole degrees.
 */
export const SLIDER_RANGE: Readonly<Record<Axis, { min: number; max: number; step: number }>> = {
  lightness: { min: 0, max: 1, step: 0.01 },
  chroma: { min: 0, max: 0.4, step: 0.001 },
  hue: { min: 0, max: 359, step: 1 },
};

/* ------------------------------------------------------------------ the search and its point */

export interface FinderState {
  /** What the field holds. */
  readonly text: string;
  /** The reading a person chose with a chip, or `null` while the field's own kind decides. */
  readonly chosen: Reading | null;
  /** The search point, OKLCh [L, C, h], held as set: the sliders print it, every ΔE00 is from it. */
  readonly point: Triple;
}

let corpusPoint: Triple | null = null;

/** The start's point: the corpus medoid's record OKLCh (ADR-0158 D2), worked out once. */
export function defaultPoint(): Triple {
  corpusPoint ??= medoid(allEntries()).derived.oklch;
  return corpusPoint;
}

/** The empty field, no reading chosen, the point at the corpus medoid. */
export function start(): FinderState {
  return { text: '', chosen: null, point: defaultPoint() };
}

/**
 * The reading in effect, which the chosen chip shows (ADR-0160 D1): the person's choice if they made
 * one; else, while the field holds text, the kind `find()` read it as; else none.
 */
export function readingInEffect(s: FinderState): Reading | null {
  if (s.chosen !== null) return s.chosen;
  const kind = find(s.text).kind;
  return kind === 'empty' ? null : kind;
}

/** The set a text names under a reading: the corpus, its entries, or none with the reason. */
type NamedSet =
  | { readonly kind: 'corpus' }
  | { readonly kind: 'entries'; readonly entries: readonly PublishedEntry[] }
  | { readonly kind: 'none'; readonly hint: MessageKey };

function setOf(text: string, reading: Reading | null): NamedSet {
  if (reading === null || text.trim() === '') return { kind: 'corpus' };
  const answer = findAs(text, reading);
  if (answer.unreadable === true)
    return { kind: 'none', hint: reading === 'hex' ? 'finder.notHex' : 'finder.notPhrase' };
  if (reading === 'hex') return { kind: 'corpus' };
  if (answer.entries.length === 0)
    return {
      kind: 'none',
      hint: reading === 'phrase' ? 'finder.nonePhraseHint' : 'finder.noneNameHint',
    };
  return { kind: 'entries', entries: answer.entries };
}

/** The point a text sets under a reading, or `null` where it sets none (ADR-0158 D2, D4). */
function pointOf(text: string, reading: Reading | null): Triple | null {
  if (reading === null || text.trim() === '') return null;
  if (reading === 'hex') return hexPoint(text);
  const set = setOf(text, reading);
  return set.kind === 'entries' ? medoid(set.entries).derived.oklch : null;
}

/**
 * The field changes: a NEW answer moves the point to its own; an empty one leaves it (D4). The same
 * answer — a trailing space, the same words — is no new answer, so a slider's move survives it (review,
 * M8).
 */
export function typed(s: FinderState, text: string): FinderState {
  const reading = s.chosen ?? kindOf(text);
  if (text.trim() === s.text.trim() && reading === readingInEffect(s)) return { ...s, text };
  const point = pointOf(text, reading);
  return { ...s, text, point: point ?? s.point };
}

/**
 * A chip is chosen: the text is read that way, and the point moves to that answer's (ADR-0160 D1).
 * Choosing the reading already in effect is no new answer: the point stays (review, M8).
 */
export function choose(s: FinderState, reading: Reading): FinderState {
  if (reading === readingInEffect(s)) return { ...s, chosen: reading };
  const point = pointOf(s.text, reading);
  return { ...s, chosen: reading, point: point ?? s.point };
}

/** A slider moves one axis of the point, clamped to its range; the hue wraps (ADR-0158 D4). */
export function moved(s: FinderState, axis: Axis, value: number): FinderState {
  const i = AXES.indexOf(axis);
  const { min, max } = SLIDER_RANGE[axis];
  const next = axis === 'hue' ? ((value % 360) + 360) % 360 : Math.min(max, Math.max(min, value));
  const point = [...s.point] as [number, number, number];
  point[i] = next;
  return { ...s, point };
}

/** The field's ⊗: the words go; the point and the choice stay (ADR-0160 D2). */
export function clearedText(s: FinderState): FinderState {
  return { ...s, text: '' };
}

/** *✕ Clear*: the start (ADR-0160 D3). */
export function cleared(): FinderState {
  return start();
}

function kindOf(text: string): Reading | null {
  const kind = find(text).kind;
  return kind === 'empty' ? null : kind;
}

export interface FinderAnswer {
  /** The reading the chosen chip shows. */
  readonly reading: Reading | null;
  /** The set ranked by ΔE00 from the point: the whole set, or the corpus's nearest `HEX_LIMIT`. */
  readonly results: readonly NearestEntry[];
  /** Why there are none: `00`'s caption takes this hint (ADR-0160 D8). */
  readonly hint?: MessageKey;
}

/** What the page shows for a state: its reading and its results, recomputed on every change. */
export function answerOf(s: FinderState): FinderAnswer {
  const reading = readingInEffect(s);
  const set = setOf(s.text, reading);
  if (set.kind === 'none') return { reading, results: [], hint: set.hint };
  return {
    reading,
    results:
      set.kind === 'corpus'
        ? rankedFrom(s.point, 'corpus', HEX_LIMIT)
        : rankedFrom(s.point, set.entries),
  };
}

/* ------------------------------------------------------------------ the sliders' words */

/** A term's naming axis: hue if it constrains hue, else lightness, else chroma (ADR-0159 D2). */
export function namingAxis(term: LexiconTerm): Axis {
  if (term.constrains.hue !== undefined) return 'hue';
  if (term.constrains.lightness !== undefined) return 'lightness';
  return 'chroma';
}

/** The point as the sliders print it: L to whole percent, C to 3 dp, h to whole degrees. */
export function printedPoint(point: Triple): Triple {
  const [l, c, h] = point;
  return [
    Math.round(l * 100) / 100,
    Math.round(c * 1000) / 1000,
    ((Math.round(h) % 360) + 360) % 360,
  ];
}

/** The locale's terms on this axis whose whole region holds the printed point, in file order. */
export function termsHolding(
  axis: Axis,
  printed: Triple,
  locale: Locale,
  from: PhraseLexicon = lexicon(),
): readonly LexiconTerm[] {
  return from.terms.filter(
    (term) =>
      term.locale === locale &&
      namingAxis(term) === axis &&
      matchesRegion(term.constrains, printed),
  );
}

export interface SliderReading {
  /** The figure as printed: `61%`, `0.012`, `72°`. */
  readonly figure: string;
  /** The terms, as printed (capitalised in Latin). Empty where none holds. */
  readonly terms: readonly string[];
  /** The value drawn: the figure, then the terms in the script's parentheses. */
  readonly text: string;
  /** The value spoken: no slash, no parentheses. */
  readonly spoken: string;
}

/** Each slider's figure and words, in the locale's language (ADR-0159 D1–D2). */
export function sliderReadings(
  point: Triple,
  locale: Locale,
  t: Translate,
  from: PhraseLexicon = lexicon(),
): Readonly<Record<Axis, SliderReading>> {
  const printed = printedPoint(point);
  const japanese = locale === 'ja';
  const figure: Record<Axis, string> = {
    lightness: `${String(Math.round(printed[0] * 100))}%`,
    chroma: printed[1].toFixed(3),
    hue: `${String(printed[2])}°`,
  };
  const reading = (axis: Axis): SliderReading => {
    const terms = termsHolding(axis, printed, locale, from).map((term) =>
      japanese ? term.term : capitalised(term.term),
    );
    const words = terms.length === 0 ? t('finder.noTerm') : terms.join(japanese ? '・' : ' / ');
    return {
      figure: figure[axis],
      terms,
      text: japanese ? `${figure[axis]}（${words}）` : `${figure[axis]} (${words})`,
      spoken: `${figure[axis]}${japanese ? '、' : ', '}${terms.length === 0 ? words : terms.join(japanese ? '、' : ', ')}`,
    };
  };
  return { lightness: reading('lightness'), chroma: reading('chroma'), hue: reading('hue') };
}

/* ------------------------------------------------------------------ a result's lines */

export interface ResultLines {
  readonly name: string;
  readonly english: string;
  /** `hex • ΔE00 d`, the distance from the search point at `printedDeltaE00`. */
  readonly distance: string;
  /** The nearest card only, as `09` draws it: the record's OKLCh at 3 / 3 / 1. */
  readonly oklch?: string;
  /** The card's words for a screen reader, its provenance appended by the screen. */
  readonly spoken: string;
}

/** One card's lines (ADR-0159 D3). */
export function resultLines(result: NearestEntry, index: number, t: Translate): ResultLines {
  const { entry, deltaE00 } = result;
  const d = printedDeltaE00(deltaE00).toFixed(2);
  const name = nameLine(entry);
  const english = `(${entry.entry.name.en})`;
  const distance = `${entry.derived.hex} • ${t('unit.deltaE00')} ${d}`;
  const oklch = index === 0 ? oklchLine(entry.derived.oklch, t('coord.oklch')) : undefined;
  const spoken = [
    name,
    entry.entry.name.en,
    entry.derived.hex,
    `${t('unit.deltaE00')} ${d} ${t('finder.fromPoint')}`,
    ...(oklch === undefined ? [] : [oklch]),
  ].join(', ');
  return { name, english, distance, ...(oklch === undefined ? {} : { oklch }), spoken };
}

/* ------------------------------------------------------------------ 09's drawn sizes */

/** `09.header`: 116 px, symmetric about its controls; no rule (ADR-0161 D1). */
export const FINDER_APP_BAR = 58;
/** `09.back`'s arrow: 15 × 12.5 dp of ink over a 15.5 × 12 unit path (ADR-0161 D4). */
export const BACK_GLYPH_09 = 21;
/** `09.clear`'s ×: 12 dp of ink over 11 units. */
export const CLEAR_GLYPH = 22.5;
/** `09.search.clear`: a solid disc of 20 units, 16 dp across at half luma (review, M4). */
export const QUERY_CLEAR_GLYPH = 19;
/** `09.search.mode-*`: 47 px. */
export const MODE_CHIP = 23.5;
/** `09.results.result-*`: 108 and 110.5 dp, two each — the tie takes the smaller; a minimum. */
export const RESULT_HEIGHT = 108;
/**
 * `09.art`: the leaves at the strokes' height (211 dp), flush with the screen's right edge, from
 * 48.5 dp — 9.5 dp above the bar's foot, where the list clips them (ADR-0161 D6).
 */
export const FINDER_ART = { right: 0, top: -9.5, width: 52.75 } as const;
