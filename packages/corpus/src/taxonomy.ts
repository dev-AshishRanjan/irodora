/**
 * The taxonomy vocabulary: the words a reader sees for a `taxonomy.family`.
 *
 * ## Why this is content and not a lookup table in the app
 *
 * F-018 saw the Atlas rendering `blue-grey` and `off-white` in the ja locale and deliberately
 * left it, for a reason worth restating. A table in the app would be **putting words in the
 * editor's mouth**, and it would be an *enumerated* table against a set the **corpus** controls
 * — so a family introduced by a future publish would render blank or fall back to English, and
 * [ADR-0028](../../../docs/adr/0028-i18n-en-ja-from-day-one.md) forbids fallback precisely because it
 * makes a gap invisible.
 *
 * The message catalogue cannot hold it either: ADR-0056 makes it a TypeScript record whose
 * completeness `tsc` checks, and **`tsc` cannot check a key set that comes from JSON data**.
 *
 * ## So completeness moves from the compiler to the gate
 *
 * That swap is the design, not a workaround:
 *
 * | | English catalogue | this file |
 * |---|---|---|
 * | key set comes from | source | corpus data |
 * | completeness checked by | `tsc` | **gate 11** |
 * | a missing entry is | a compile error | **a build failure naming the family** |
 *
 * The guarantee ADR-0028 wants — no fallback, no silent gap — is unchanged. What changed is
 * which mechanism keeps it, because the compiler cannot see this key set.
 *
 * ## A row is a judgement, not a translation
 *
 * `off-white` is not 「オフホワイト」 by obligation. Each row records what was chosen and why,
 * for the same reason every rule in `content/rules/` carries a rationale (ADR-0011 §4).
 */

import { CorpusError } from './errors.js';
import {
  checkUnknowns,
  parseUnknowns,
  rejectUnknownKeys,
  requireMatch,
  requireRecord,
  requireString,
  SLUG_PATTERN,
} from './primitives.js';
import { parseProvenance, type RecordProvenance } from './provenance.js';

export interface FamilyVocabulary {
  /** The authoring slug, exactly as `taxonomy.family` carries it. */
  readonly family: string;
  /** What an English reader sees. Often the slug spelled as words. */
  readonly en: string;
  /** What a Japanese reader sees. Never inferred from the slug. */
  readonly ja: string;
  readonly rationale: string;
}

export interface TaxonomyVocabulary {
  readonly provenance: RecordProvenance;
  readonly unknowns: Readonly<Record<string, string>>;
  readonly families: readonly FamilyVocabulary[];
}

const VOCABULARY_KEYS = ['provenance', 'unknowns', 'families'] as const;
const FAMILY_KEYS = ['family', 'en', 'ja', 'rationale'] as const;

/** Same floor as a corpus `derivation`: a word or two cannot carry a reason. */
const MIN_RATIONALE = 20;

function parseFamily(v: unknown, index: number, src: string): FamilyVocabulary {
  const path = `families[${String(index)}]`;
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, FAMILY_KEYS, path, src);

  const rationale = requireString(o['rationale'], `${path}.rationale`, src);
  if (rationale.trim().length < MIN_RATIONALE)
    throw new CorpusError(
      src,
      `${path}.rationale`,
      `is ${String(rationale.trim().length)} characters. A family name is the most VISIBLE ` +
        'editorial choice in the product — it is on the filter, the list row and the detail ' +
        'screen — and "why this word and not another" is the thing a reviewer needs.',
    );

  const ja = requireString(o['ja'], `${path}.ja`, src);
  const en = requireString(o['en'], `${path}.en`, src);

  /*
   * THE RULE THIS FILE EXISTS FOR. A `ja` equal to the slug is the failure in its purest form:
   * it satisfies "has a Japanese form" while rendering exactly what the reader sees today.
   * `en` may legitimately be the slug spelled as words; `ja` may not be the slug at all.
   */
  const family = requireMatch(
    o['family'],
    SLUG_PATTERN,
    `${path}.family`,
    src,
    'expected the authoring slug, lowercase kebab-case',
  );
  if (ja === family || ja === en)
    throw new CorpusError(
      src,
      `${path}.ja`,
      `is "${ja}", which is the ${ja === family ? 'slug' : 'English form'}. That satisfies ` +
        '"has a Japanese form" while showing a Japanese reader exactly what they see today, ' +
        'which is the entire defect this file exists to fix.',
    );

  return { family, en, ja, rationale };
}

/** Parse the vocabulary, or throw a `CorpusError` naming the field. */
export function parseTaxonomyVocabulary(value: unknown, source: string): TaxonomyVocabulary {
  const o = requireRecord(value, '', source);
  rejectUnknownKeys(o, VOCABULARY_KEYS, '', source);

  const families = o['families'];
  if (!Array.isArray(families))
    throw new CorpusError(source, 'families', 'expected an array of families');
  if (families.length === 0)
    throw new CorpusError(source, 'families', 'a vocabulary with no families is not a vocabulary');

  const parsed = families.map((f, i) => parseFamily(f, i, source));

  const seen = new Set<string>();
  for (const f of parsed) {
    if (seen.has(f.family))
      throw new CorpusError(
        source,
        'families',
        `"${f.family}" appears twice. Which word wins would depend on the order of the file.`,
      );
    seen.add(f.family);
  }

  const unknowns = parseUnknowns(o['unknowns'] ?? {}, source);
  const seenNulls = new Set<string>();

  const vocabulary: TaxonomyVocabulary = {
    // The same provenance block every content record carries, parsed by the same function —
    // one answer to "what does complete mean" (NFR-20).
    provenance: parseProvenance(o['provenance'], source, 'published', unknowns, seenNulls),
    unknowns,
    families: parsed,
  };

  checkUnknowns(unknowns, seenNulls, source);

  return vocabulary;
}

/**
 * The word for a family in a locale.
 *
 * **Total, or it throws.** There is no fallback to the slug: gate 11 guarantees every family a
 * published entry uses has a row, so an unknown family here means the shipped vocabulary
 * disagrees with the shipped corpus. That is the corpus loader's SEV1 posture, not a caption to
 * paper over — and returning the slug quietly is exactly the behaviour ADR-0028 forbids.
 */
export function familyWord(
  vocabulary: TaxonomyVocabulary,
  family: string,
  locale: 'en' | 'ja',
): string {
  const row = vocabulary.families.find((f) => f.family === family);
  if (row === undefined)
    throw new CorpusError(
      'taxonomy vocabulary',
      'families',
      `"${family}" has no row. The content gate guarantees every family a published entry uses ` +
        'is here, so seeing this means the shipped vocabulary and the shipped corpus came from ' +
        'different generations.',
    );
  return locale === 'ja' ? row.ja : row.en;
}
