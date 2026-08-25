/**
 * The Finder: one field, three kinds of question, and the app saying which it answered.
 *
 * ```
 * 1. looks like a hex          →  nearest corpus entries by ΔE00
 * 2. every part is a term      →  a lightness / chroma / hue region
 * 3. otherwise                 →  names: kanji, kana, romaji, English, slug
 * ```
 *
 * ## The routing is a decision, and it is stated
 *
 * A phrase query requires **every part of the query** to be a known term. One unrecognised word
 * and the whole thing falls to name search. That is what keeps the branch deterministic: the
 * lexicon is the entire vocabulary, and *"dark muted green"* cannot half-succeed by matching
 * the two words it recognises and quietly ignoring the third.
 *
 * The result carries `kind`, so the screen can say which question it answered rather than
 * leaving a person to infer it from results that look wrong.
 *
 * ## Nothing here ranks colours
 *
 * The hex branch is `nameColor` from `@irodora/color-naming` (F-013), whose two-stage search is
 * **provably** the ranking a full scan would produce — that is E-015 and that package's own
 * equivalence suite. A second nearest-match implementation would be a defect by definition.
 *
 * The phrase branch does not rank at all. A region is a filter: an entry is inside it or it is
 * not, and ordering inside the region would be inventing a preference the lexicon does not
 * express. Results come back in the Atlas's order, which is slug order.
 */

import {
  buildNamingIndex,
  nameColor,
  namingRecordsFrom,
  type NamingIndex,
} from '@irodora/color-naming';
import {
  canonicalize,
  hexToXyz,
  matchesRegion,
  parsePhraseLexicon,
  resolvePhrase,
  type LexiconTerm,
  type PhraseLexicon,
  type PhraseRegion,
} from '@irodora/corpus';
import { xyzToLab, type Triple } from '@irodora/color-spaces';
import { allEntries, corpus, sha256, type PublishedEntry } from './corpus';
import {
  LEXICON_DIGEST,
  LEXICON_LABEL,
  LEXICON_TERM_COUNT,
  LEXICON_TEXT,
} from './rules/generated/lexicon';

/**
 * A hex a person could actually type: with or without the hash, three or six digits.
 *
 * ## The unprefixed form must contain a digit, and a decoy is why
 *
 * `beaded` is six characters, every one of them a hex digit — `#BEADED` is a real colour. So
 * are `decade`, `facade` and `accede`. A rule that read any six hex characters as a colour
 * would answer a word with a colour chart, and no amount of anchoring fixes that: the string
 * genuinely IS a hex.
 *
 * So an unprefixed hex must contain a digit — a run of six letters is a word far more often
 * than a colour — and **`#` is how a person says they meant the colour**, which removes the
 * ambiguity entirely. `#beaded` is a hex; `beaded` is a name query.
 *
 * The cost, stated: `ffffff` without a hash searches names and finds nothing. `#ffffff` works.
 */
const HEX_ANY = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/iu;
const HAS_DIGIT = /[0-9]/u;

function looksLikeHex(text: string): boolean {
  if (!HEX_ANY.test(text)) return false;
  return text.startsWith('#') || HAS_DIGIT.test(text);
}

export type FinderKind = 'hex' | 'phrase' | 'name' | 'empty';

export interface FinderResult {
  readonly kind: FinderKind;
  readonly entries: readonly PublishedEntry[];
  /** Present for a hex query: the distance of each result, in the order they are returned. */
  readonly distances?: readonly number[];
  /** Present for a phrase query: what the words resolved to, so the screen can show it. */
  readonly region?: PhraseRegion;
  readonly matched?: readonly LexiconTerm[];
  /**
   * The lexicon version a phrase answer came from.
   *
   * FR-10's habit applied to search: an answer that cannot say which vocabulary produced it
   * cannot be replayed when the vocabulary moves.
   */
  readonly lexiconVersion?: string;
}

let cachedLexicon: PhraseLexicon | null = null;

/**
 * The verified lexicon.
 *
 * The same shape as the corpus loader: the **text** comes from the generated module and the
 * **expected digest** comes from the ledger — two exports that came from two files, which is
 * the only arrangement in which comparing them means anything (ADR-0046, ADR-0066). A record
 * checked against a checksum it carries verifies itself.
 *
 * A mismatch throws and caches nothing, so a later call retries rather than handing back
 * something nobody checked.
 */
export function lexicon(): PhraseLexicon {
  if (cachedLexicon !== null) return cachedLexicon;

  const actual = sha256(canonicalLexiconText());
  if (actual !== LEXICON_DIGEST)
    throw new Error(
      `lexicon: digest ${actual} does not match the ledger's ${LEXICON_DIGEST}. Published rule ` +
        'content is immutable, so there is no benign explanation for this.',
    );

  const parsed = parsePhraseLexicon(JSON.parse(LEXICON_TEXT), `${LEXICON_LABEL}.json`);
  if (parsed.terms.length !== LEXICON_TERM_COUNT)
    throw new Error(
      `lexicon: the generated module records ${String(LEXICON_TERM_COUNT)} terms and the file ` +
        `carries ${String(parsed.terms.length)}. The two came from different generations — run ` +
        '`node scripts/generate-rules-bundle.mjs`.',
    );

  cachedLexicon = parsed;
  return parsed;
}

/**
 * The lexicon in the canonical form its digest was taken over.
 *
 * The ledger's checksum is `entryDigest(record)` — a digest of the CANONICAL serialisation,
 * not of the file's bytes, so whitespace in the committed JSON cannot change it. Re-deriving
 * that form here would be a second implementation of `canonicalize`, so the module's text is
 * parsed and handed back through the package's own function.
 */
function canonicalLexiconText(): string {
  return canonicalize(JSON.parse(LEXICON_TEXT));
}

let cachedIndex: NamingIndex | null = null;

/** The naming index over the verified corpus, built once. */
function index(): NamingIndex {
  if (cachedIndex !== null) return cachedIndex;
  const { records, corpusVersion } = namingRecordsFrom(corpus());
  cachedIndex = buildNamingIndex(records, { corpusVersion });
  return cachedIndex;
}

/** Expand `#0AF` to `#00AAFF`; leave a six-digit value alone. */
function normaliseHex(query: string): string {
  const digits = query.trim().replace(/^#/u, '');
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => `${d}${d}`)
          .join('')
      : digits;
  return `#${full.toUpperCase()}`;
}

/** How many entries a hex query returns. Enough to compare, few enough to read. */
export const HEX_LIMIT = 8;

/**
 * Answer a query.
 *
 * Deterministic in the sense the requirement asks for: the same string, the same corpus and the
 * same lexicon produce the same entries in the same order, and nothing consults a clock, a
 * locale or a random source.
 */
export function find(query: string): FinderResult {
  const text = query.trim();
  if (text === '') return { kind: 'empty', entries: [] };

  if (looksLikeHex(text)) {
    const hex = normaliseHex(text);
    // Through the engine, never re-implemented: hex → sRGB → XYZ → OKLCh is three published
    // conversions, and the ranking below needs Lab from the same source the corpus used.
    const lab = labOfHex(hex);
    const result = nameColor(index(), lab, { limit: HEX_LIMIT });
    const bySlug = new Map(allEntries().map((e) => [e.entry.slug, e]));
    const entries: PublishedEntry[] = [];
    const distances: number[] = [];
    for (const candidate of result.candidates) {
      const entry = bySlug.get(candidate.id);
      if (entry === undefined) continue;
      entries.push(entry);
      distances.push(candidate.deltaE00);
    }
    return { kind: 'hex', entries, distances };
  }

  const phrase = resolvePhrase(lexicon(), text);
  if (phrase !== null) {
    const entries = allEntries().filter((e) => matchesRegion(phrase.region, e.derived.oklch));
    return {
      kind: 'phrase',
      entries,
      region: phrase.region,
      matched: phrase.matched,
      lexiconVersion: lexicon().versionId,
    };
  }

  return { kind: 'name', entries: byName(text) };
}

/**
 * A typed hex, as Lab, through the engine.
 *
 * `hexToXyz` is the `from` end of E-001 — the same call every derived corpus value traces back
 * through — and `xyzToLab` is what the naming index was built in. Converting here by any other
 * route would rank the query against a corpus measured on a different ruler.
 */
function labOfHex(hex: string): Triple {
  return xyzToLab(hexToXyz(hex));
}

/**
 * Name search across every form a person might have in mind.
 *
 * Substring rather than prefix, because a person who remembers the second half of a name has
 * the same claim on finding it. Case-folded for Latin; Japanese needs no folding.
 */
export function byName(query: string): readonly PublishedEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  return allEntries().filter((e) =>
    [
      e.entry.name.kanji,
      e.entry.name.kana,
      e.entry.name.romaji,
      e.entry.name.en,
      e.entry.slug,
    ].some((form) => form.toLowerCase().includes(q)),
  );
}
