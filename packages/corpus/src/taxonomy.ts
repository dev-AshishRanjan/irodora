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

/**
 * The colour-family chips, in the order the Atlas draws them (ADR-0108, F-224).
 *
 * The first six are what mockup `05` draws, in its order; the last three sit past the edge the
 * mockup cuts at, where the row scrolls. The order is a CONSTANT rather than whatever order the
 * file happens to list, so the surface that draws the row imports it instead of retyping it —
 * and a file that reorders the groups is refused rather than silently reordering a drawing.
 */
export const FAMILY_GROUPS = [
  'ao',
  'aka',
  'midori',
  'murasaki',
  'cha',
  'kuro',
  'ki',
  'shiro',
  'nezumi',
] as const;
export type FamilyGroupId = (typeof FAMILY_GROUPS)[number];

/** One chip: the words it shows, and the families it holds. */
export interface FamilyGroup {
  readonly group: FamilyGroupId;
  /** What the chip prints first: `Ao`. */
  readonly romaji: string;
  /** What it prints beside it: `青`. */
  readonly kanji: string;
  /** An English gloss, for an accessible name — the chip does not print it. */
  readonly en: string;
  readonly families: readonly string[];
  readonly rationale: string;
}

export interface TaxonomyVocabulary {
  readonly provenance: RecordProvenance;
  readonly unknowns: Readonly<Record<string, string>>;
  readonly families: readonly FamilyVocabulary[];
  /** How a family is placed in a group, as a sentence a reviewer can argue with. */
  readonly groupRule: string;
  /** Exactly `FAMILY_GROUPS`, in that order, partitioning `families`. */
  readonly groups: readonly FamilyGroup[];
}

const VOCABULARY_KEYS = ['provenance', 'unknowns', 'families', 'groupRule', 'groups'] as const;
const FAMILY_KEYS = ['family', 'en', 'ja', 'rationale'] as const;
const GROUP_KEYS = ['group', 'romaji', 'kanji', 'en', 'families', 'rationale'] as const;

/** A rule has to be long enough to be a rule. */
const MIN_GROUP_RULE = 80;

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

function parseGroup(v: unknown, index: number, src: string): FamilyGroup {
  const path = `groups[${String(index)}]`;
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, GROUP_KEYS, path, src);

  const expected = FAMILY_GROUPS[index];
  const group = requireString(o['group'], `${path}.group`, src);
  if (group !== expected)
    throw new CorpusError(
      src,
      `${path}.group`,
      `is "${group}" where "${String(expected)}" belongs. The groups are exactly ` +
        `${FAMILY_GROUPS.join(', ')}, in that order: the first six are the chips mockup 05 ` +
        'draws, in its order, and a file that reorders them would reorder a drawing (ADR-0108).',
    );

  // THE WORDS ARE BOUND TO THE ID. The id is the romaji, lower-cased, so a file whose `ao` group
  // prints "Aka" — ids in order, labels swapped — is refused rather than parsed; without this,
  // "a file that reorders the groups is refused" would be true of the ids and false of the chips.
  const romaji = requireString(o['romaji'], `${path}.romaji`, src);
  if (romaji.toLowerCase() !== group)
    throw new CorpusError(
      src,
      `${path}.romaji`,
      `is "${romaji}" on the "${group}" chip. The id is the romaji; a chip that prints another ` +
        "group's word shows a person one chip's name over another chip's colours.",
    );
  // One ideograph: the chips print a single character each (青 … 鼠). Latin letters, a digit or a
  // phrase satisfies "has a kanji" while printing something else.
  const kanji = requireString(o['kanji'], `${path}.kanji`, src);
  if (!/^\p{Script=Han}$/u.test(kanji))
    throw new CorpusError(
      src,
      `${path}.kanji`,
      `is "${kanji}". A chip prints one kanji beside its romaji (ADR-0108), and this is not one.`,
    );

  const families = o['families'];
  if (!Array.isArray(families))
    throw new CorpusError(src, `${path}.families`, 'expected an array of family slugs');

  const rationale = requireString(o['rationale'], `${path}.rationale`, src);
  if (rationale.trim().length < MIN_RATIONALE)
    throw new CorpusError(
      src,
      `${path}.rationale`,
      `is ${String(rationale.trim().length)} characters. Which families a chip holds is a ` +
        'judgement the filter shows every reader, and "why these" is what a reviewer needs.',
    );

  return {
    group: expected,
    romaji,
    kanji,
    en: requireString(o['en'], `${path}.en`, src),
    families: families.map((f, i) =>
      requireMatch(
        f,
        SLUG_PATTERN,
        `${path}.families[${String(i)}]`,
        src,
        'expected a family slug, lowercase kebab-case',
      ),
    ),
    rationale,
  };
}

/**
 * The groups PARTITION the families: every family in exactly one, and nothing else.
 *
 * "Every entry lands in exactly one group" (F-224) follows from this and from the content gate's
 * existing check that every published entry's family has a row here. Whether a group is EMPTY is
 * not decided here: that is a fact about the published corpus, not about this file, and the
 * content gate checks it against the entries.
 */
function parseGroups(v: unknown, families: readonly FamilyVocabulary[], src: string) {
  if (!Array.isArray(v)) throw new CorpusError(src, 'groups', 'expected an array of groups');
  if (v.length !== FAMILY_GROUPS.length)
    throw new CorpusError(
      src,
      'groups',
      `has ${String(v.length)} groups; there are exactly ${String(FAMILY_GROUPS.length)} — ` +
        `${FAMILY_GROUPS.join(', ')} (ADR-0108).`,
    );
  const groups = v.map((g, i) => parseGroup(g, i, src));

  const known = new Set(families.map((f) => f.family));
  const placed = new Map<string, FamilyGroupId>();
  for (const g of groups)
    for (const family of g.families) {
      if (!known.has(family))
        throw new CorpusError(
          src,
          `groups.${g.group}`,
          `names "${family}", which is not a family in this vocabulary.`,
        );
      const already = placed.get(family);
      if (already !== undefined)
        throw new CorpusError(
          src,
          `groups.${g.group}`,
          `places "${family}", which "${already}" already holds. A family in two groups shows ` +
            'one colour under two chips, and "exactly one group" is the rule (F-224).',
        );
      placed.set(family, g.group);
    }
  const missing = families.filter((f) => !placed.has(f.family)).map((f) => f.family);
  if (missing.length > 0)
    throw new CorpusError(
      src,
      'groups',
      `place no group for ${missing.map((m) => `"${m}"`).join(', ')}. Every entry of that ` +
        'family would be reachable by no chip.',
    );
  return groups;
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

  const groupRule = requireString(o['groupRule'], 'groupRule', source);
  if (groupRule.trim().length < MIN_GROUP_RULE)
    throw new CorpusError(
      source,
      'groupRule',
      `is ${String(groupRule.trim().length)} characters. The rule that places every family ` +
        'under a chip is the one a reader of the filter cannot see, so it is written down.',
    );

  const unknowns = parseUnknowns(o['unknowns'] ?? {}, source);
  const seenNulls = new Set<string>();

  const vocabulary: TaxonomyVocabulary = {
    // The same provenance block every content record carries, parsed by the same function —
    // one answer to "what does complete mean" (NFR-20).
    provenance: parseProvenance(o['provenance'], source, 'published', unknowns, seenNulls),
    unknowns,
    families: parsed,
    groupRule,
    groups: parseGroups(o['groups'], parsed, source),
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

/**
 * How many entries each chip holds, in chip order — given the family of every entry.
 *
 * The parser proves the groups partition the FAMILIES; whether a chip finds anything is a fact
 * about the corpus, so the content gate calls this with the authored entries and refuses a zero.
 * A chip that filters to nothing is a broken control, not an empty state. Throws, through
 * `familyGroup`, for a family the vocabulary does not know.
 */
export function entriesPerGroup(
  vocabulary: TaxonomyVocabulary,
  entryFamilies: readonly string[],
): readonly { readonly group: FamilyGroup; readonly entries: number }[] {
  const counts = new Map<FamilyGroupId, number>(FAMILY_GROUPS.map((id) => [id, 0]));
  for (const family of entryFamilies) {
    const id = familyGroup(vocabulary, family).group;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return vocabulary.groups.map((group) => ({ group, entries: counts.get(group.group) ?? 0 }));
}

/**
 * The chip a family sits under.
 *
 * **Total, or it throws**, for the reason `familyWord` is: the parser guarantees every family in
 * the vocabulary is in exactly one group, so an unknown family here means the vocabulary and the
 * corpus came from different generations.
 */
export function familyGroup(vocabulary: TaxonomyVocabulary, family: string): FamilyGroup {
  const group = vocabulary.groups.find((g) => g.families.includes(family));
  if (group === undefined)
    throw new CorpusError(
      'taxonomy vocabulary',
      'groups',
      `"${family}" is in no group. The parser places every family it knows, so seeing this means ` +
        'the shipped vocabulary and the shipped corpus came from different generations.',
    );
  return group;
}
