/**
 * The phrase lexicon: the words a person may type, and the region each one means.
 *
 * FR-47 asks that *"a phrase query maps to a lightness/chroma/hue region deterministically"*.
 * Determinism here is not a promise about the implementation — it is the absence of anything
 * that could vary. **The lexicon is the entire vocabulary.** No fuzzy matching, no stemming,
 * no synonym inference at run time, and a term that is not in the file does not exist.
 *
 * ## Two things measurement decided, not taste
 *
 * **The boundaries agree with the corpus.** Across the 120 authored entries of 2026.08.1 the
 * editorial `lightnessBand` and `chromaBand` are perfectly separable in OKLCh — dark tops out
 * at 0.390 and mid starts at 0.400; low tops out at 0.038 and mid starts at 0.040 — with no
 * overlap and no nulls. So `dark` can have ONE meaning in this file and in the Atlas's filters
 * rather than two that drift, and the content gate asserts that agreement over every entry.
 *
 * **Hue below a chroma floor is noise, and the corpus proves it.** `charcoal` spans hue
 * 58°–268°, `off-white` 66°–246°, `pink` 10°–340°. Those are not hues; they are rounding on a
 * colour with almost no chroma. A hue term filtering on hue alone would answer *"green"* with
 * greys — so **every hue term carries a chroma floor**, and a term may constrain more than one
 * axis.
 *
 * That last property also disposes of the trap in the word *brown*: brown is not a hue, it is
 * dark low-chroma orange, and a lexicon that cannot say so has to either lie or omit the word.
 *
 * ## No colour maths
 *
 * A region is a comparison against values the engine already computed and the publish already
 * froze. Nothing here converts anything.
 */

import { CorpusError } from './errors.js';
import {
  checkUnknowns,
  ISO_DATE_PATTERN,
  parseUnknowns,
  rejectUnknownKeys,
  requireMatch,
  requireRecord,
  requireString,
  VERSION_ID_PATTERN,
} from './primitives.js';
import { parseProvenance, type RecordProvenance } from './provenance.js';

/** The axes a term may constrain. Hue is last because it is the one that needs company. */
export const LEXICON_AXES = ['lightness', 'chroma', 'hue'] as const;
export type LexiconAxis = (typeof LEXICON_AXES)[number];

/**
 * A closed interval on one axis.
 *
 * `hue` wraps: a range whose `min` exceeds its `max` is the arc **through 0°**, which is the
 * only way to express red. Every other axis rejects that shape, because a lightness range from
 * 0.8 to 0.2 is a typo rather than a wrap.
 */
export interface LexiconRange {
  readonly min: number;
  readonly max: number;
}

export interface LexiconTerm {
  /** The word, lower-cased for Latin scripts. Japanese is matched as written. */
  readonly term: string;
  /** `en` or `ja`. A term belongs to one language; the same region may have one of each. */
  readonly locale: string;
  /** At least one axis. A term constraining nothing would match everything. */
  readonly constrains: Readonly<Partial<Record<LexiconAxis, LexiconRange>>>;
  /**
   * Why this region, in the editor's words.
   *
   * ADR-0011 §4: a rule without a stated reason cannot be evaluated, defended or safely
   * changed by the next person. A boundary is exactly the kind of number that looks arbitrary
   * in six months.
   */
  readonly rationale: string;
}

export interface PhraseLexicon {
  readonly versionId: string;
  readonly publishedAt: string;
  readonly provenance: RecordProvenance;
  /** FR-21: a null in the provenance block states WHY, here. No silent blanks. */
  readonly unknowns: Readonly<Record<string, string>>;
  readonly terms: readonly LexiconTerm[];
}

const LEXICON_KEYS = ['versionId', 'publishedAt', 'provenance', 'unknowns', 'terms'] as const;
const TERM_KEYS = ['term', 'locale', 'constrains', 'rationale'] as const;
const LOCALES = ['en', 'ja'];

/** Same floor as a corpus `derivation`: a word or two cannot carry a reason. */
const MIN_RATIONALE = 20;

function parseRange(v: unknown, axis: LexiconAxis, path: string, src: string): LexiconRange {
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, ['min', 'max'], path, src);
  const min = o['min'];
  const max = o['max'];
  for (const [name, value] of [
    ['min', min],
    ['max', max],
  ] as const)
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new CorpusError(
        src,
        `${path}.${name}`,
        `expected a finite number; got ${String(value)}`,
      );

  if (axis === 'hue') {
    for (const [name, value] of [
      ['min', min as number],
      ['max', max as number],
    ] as const)
      if (value < 0 || value >= 360)
        throw new CorpusError(
          src,
          `${path}.${name}`,
          `expected a hue in [0, 360); got ${String(value)}`,
        );
  } else if ((min as number) > (max as number))
    throw new CorpusError(
      src,
      path,
      `min ${String(min)} exceeds max ${String(max)}. Only a HUE range may wrap — it is a ` +
        'circle, and the arc through 0° is the only way to write red. On a linear axis this ' +
        'is a typo, and accepting it would silently match nothing.',
    );

  return { min: min as number, max: max as number };
}

function parseTerm(v: unknown, index: number, src: string): LexiconTerm {
  const path = `terms[${String(index)}]`;
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, TERM_KEYS, path, src);

  const constrains = requireRecord(o['constrains'], `${path}.constrains`, src);
  rejectUnknownKeys(constrains, LEXICON_AXES, `${path}.constrains`, src);

  const parsed: Partial<Record<LexiconAxis, LexiconRange>> = {};
  for (const axis of LEXICON_AXES) {
    const range = constrains[axis];
    if (range === undefined) continue;
    parsed[axis] = parseRange(range, axis, `${path}.constrains.${axis}`, src);
  }

  if (Object.keys(parsed).length === 0)
    throw new CorpusError(
      src,
      `${path}.constrains`,
      'constrains nothing, so it would match every colour in the corpus. A term that narrows ' +
        'nothing is not a term.',
    );

  /*
   * THE RULE THE CORPUS ITSELF ARGUES FOR. `charcoal` spans hue 58°–268° because its chroma is
   * near zero — its hue is rounding, not colour. A hue term without a chroma floor answers
   * "green" with greys, and there is no way to spot that by reading the file.
   */
  if (parsed.hue !== undefined && parsed.chroma === undefined)
    throw new CorpusError(
      src,
      `${path}.constrains`,
      'constrains hue with no chroma floor. Below a chroma floor a hue is noise — charcoal in ' +
        'this corpus spans 58° to 268° — so a hue-only term would return greys for a colour ' +
        'word. Add a chroma range whose min is the floor at which the hue is perceptible.',
    );

  const rationale = requireString(o['rationale'], `${path}.rationale`, src);
  if (rationale.trim().length < MIN_RATIONALE)
    throw new CorpusError(
      src,
      `${path}.rationale`,
      `is ${String(rationale.trim().length)} characters. A boundary is exactly the kind of ` +
        'number that looks arbitrary in six months, and ADR-0011 §4 requires a reason that ' +
        'the next person can evaluate rather than only read.',
    );

  const locale = requireString(o['locale'], `${path}.locale`, src);
  if (!LOCALES.includes(locale))
    throw new CorpusError(src, `${path}.locale`, `expected one of ${LOCALES.join(', ')}`);

  const term = requireString(o['term'], `${path}.term`, src);
  if (locale === 'en' && term !== term.toLowerCase())
    throw new CorpusError(
      src,
      `${path}.term`,
      `"${term}" is not lower-case. Matching lower-cases the query, so a capitalised entry ` +
        'here would be a term nobody can ever type.',
    );

  return { term, locale, constrains: parsed, rationale };
}

/** Parse the lexicon, or throw a `CorpusError` naming the field. */
export function parsePhraseLexicon(value: unknown, source: string): PhraseLexicon {
  const o = requireRecord(value, '', source);
  rejectUnknownKeys(o, LEXICON_KEYS, '', source);

  const terms = o['terms'];
  if (!Array.isArray(terms)) throw new CorpusError(source, 'terms', 'expected an array of terms');
  if (terms.length === 0)
    throw new CorpusError(source, 'terms', 'a lexicon with no terms is not a lexicon');

  const parsed = terms.map((t, i) => parseTerm(t, i, source));

  // A term twice in one language is two answers to one word, and which one wins would depend
  // on file order — the exact shape "deterministic" is supposed to exclude.
  const seen = new Set<string>();
  for (const t of parsed) {
    const key = `${t.locale}:${t.term}`;
    if (seen.has(key))
      throw new CorpusError(
        source,
        'terms',
        `"${t.term}" appears twice for locale "${t.locale}". Which region wins would depend on ` +
          'the order of the file.',
      );
    seen.add(key);
  }

  const unknowns = parseUnknowns(o['unknowns'] ?? {}, source);
  const seenNulls = new Set<string>();

  const lexicon: PhraseLexicon = {
    versionId: requireMatch(
      o['versionId'],
      VERSION_ID_PATTERN,
      'versionId',
      source,
      'expected YYYY.MM.N',
    ),
    publishedAt: requireMatch(
      o['publishedAt'],
      ISO_DATE_PATTERN,
      'publishedAt',
      source,
      'expected YYYY-MM-DD',
    ),
    // The same provenance block every content record carries, parsed by the same function —
    // one answer to "what does complete mean" (NFR-20). `status` is fixed at published
    // because an unpublished lexicon has no business being loaded by anything.
    provenance: parseProvenance(o['provenance'], source, 'published', unknowns, seenNulls),
    unknowns,
    terms: parsed,
  };

  // Every stated reason must correspond to a real null, and every null to a reason. A stale
  // reason is how a field that USED to be empty keeps an explanation nobody re-read.
  checkUnknowns(unknowns, seenNulls, source);

  return lexicon;
}

/** Does `value` fall inside `range`? `hue` wraps; nothing else does. */
export function inRange(range: LexiconRange, value: number, axis: LexiconAxis): boolean {
  if (axis !== 'hue' || range.min <= range.max) return value >= range.min && value <= range.max;
  // The arc through 0°.
  return value >= range.min || value <= range.max;
}

/** A region is the intersection of every matched term's constraints. */
export type PhraseRegion = Readonly<Partial<Record<LexiconAxis, LexiconRange>>>;

/**
 * Narrow a region by one term.
 *
 * Two terms on the same **linear** axis intersect. Two terms on **hue** do not: the
 * intersection of two arcs can be two arcs, which this shape cannot express — so a second hue
 * term is refused rather than silently taking one of them. *"green blue"* is a query nobody
 * should get a confident answer to.
 */
export function narrow(region: PhraseRegion, term: LexiconTerm): PhraseRegion | null {
  const next: Partial<Record<LexiconAxis, LexiconRange>> = { ...region };
  for (const axis of LEXICON_AXES) {
    const add = term.constrains[axis];
    if (add === undefined) continue;
    const have = next[axis];
    if (have === undefined) {
      next[axis] = add;
      continue;
    }
    if (axis === 'hue') return null;
    const min = Math.max(have.min, add.min);
    const max = Math.min(have.max, add.max);
    if (min > max) return null;
    next[axis] = { min, max };
  }
  return next;
}

/** Is this colour inside the region? A region with no constraint on an axis ignores it. */
export function matchesRegion(region: PhraseRegion, oklch: readonly number[]): boolean {
  const value: Record<LexiconAxis, number> = {
    lightness: oklch[0] ?? 0,
    chroma: oklch[1] ?? 0,
    hue: oklch[2] ?? 0,
  };
  for (const axis of LEXICON_AXES) {
    const range = region[axis];
    if (range === undefined) continue;
    if (!inRange(range, value[axis], axis)) return false;
  }
  return true;
}

/**
 * Resolve a query into a region, or `null` if any part of it is not a term.
 *
 * **Matching scans for terms rather than splitting on whitespace**, longest term first. That is
 * not an optimisation: Japanese does not put spaces between words, and a resolver that split on
 * them would work in one language and not the other. Scanning treats both alike, and
 * longest-first stops a short term shadowing a longer one that contains it.
 *
 * Every part of the query must be consumed. A single unrecognised word means this was not a
 * phrase — the caller falls back to searching names, and *"dark muted green"* cannot half
 * succeed.
 */
export function resolvePhrase(
  lexicon: PhraseLexicon,
  query: string,
): { readonly region: PhraseRegion; readonly matched: readonly LexiconTerm[] } | null {
  const text = query.trim().toLowerCase();
  if (text === '') return null;

  const ordered = [...lexicon.terms].sort((a, b) => b.term.length - a.term.length);
  const matched: LexiconTerm[] = [];
  let region: PhraseRegion = {};
  let rest = text;

  let progress = true;
  while (progress) {
    progress = false;
    // Separators are consumed between terms, never inside one: a Japanese query has none and
    // an English one has spaces. `\s` already covers the ideographic space U+3000, so writing
    // that character literally adds nothing; the ideographic comma is listed separately
    // because it is punctuation rather than whitespace.
    rest = rest.replace(/^[\s,、]+/u, '').replace(/[\s,、]+$/u, '');
    if (rest === '') break;
    for (const term of ordered) {
      const at = rest.indexOf(term.term);
      if (at === -1) continue;
      // Only a term at the START is consumed, so the scan cannot skip over an unknown word
      // and quietly report a phrase built from the parts it happened to recognise.
      if (at !== 0) continue;
      const narrowed = narrow(region, term);
      if (narrowed === null) return null;
      region = narrowed;
      matched.push(term);
      rest = rest.slice(term.term.length);
      progress = true;
      break;
    }
  }

  if (rest !== '' || matched.length === 0) return null;
  return { region, matched };
}
