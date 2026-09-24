/**
 * The taxonomy vocabulary.
 *
 * The assertion that earns this file is the one about a `ja` equal to the slug: it satisfies
 * *"has a Japanese form"* while rendering a Japanese reader exactly what they see today, which
 * is the entire defect F-090 exists to fix. A schema that accepted it would be a check that
 * makes the gap invisible — the thing ADR-0028 forbids, arriving through the back door.
 */

import { describe, expect, it } from 'vitest';
import { CorpusError } from '../src/errors.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  entriesPerGroup,
  FAMILY_GROUPS,
  familyGroup,
  familyWord,
  parseTaxonomyVocabulary,
} from '../src/taxonomy.js';

const provenance = {
  source: 'Irodora editorial curation — taxonomy vocabulary, 2026',
  sourceId: 'IRO-ED-003',
  sourceType: 'editorial',
  publisher: null,
  publishedYear: null,
  rightsHolder: 'Irodora',
  sourceLicence: 'Proprietary — Irodora original work',
  sourceUrl: null,
  derivation: 'Editorial: each Japanese form is a choice, never a translation of the slug.',
  authoredBy: 'ed-001',
  authoredAt: '2026-08-25',
  verifiedBy: 'ed-001',
  verifiedAt: '2026-08-25',
  reviewIndependence: 'self',
  editorialNotes: 'Seed vocabulary.',
};

const row = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  family: 'blue-grey',
  en: 'Blue-grey',
  ja: '青鼠',
  rationale: 'The traditional grey word, kept across every grey family in this vocabulary.',
  ...over,
});

const GROUP_RULE =
  'A family goes under exactly one chip, read from its own Japanese name — a rule long enough to be one.';

const group = (id: string, families: readonly string[]): Record<string, unknown> => ({
  group: id,
  romaji: id.charAt(0).toUpperCase() + id.slice(1),
  kanji: '色',
  en: 'Gloss',
  families,
  rationale: 'Why these families sit under this chip, long enough to be a reason.',
});

/** Every family under the first chip, the other eight empty — the smallest valid partition. */
const groupsFor = (families: readonly Record<string, unknown>[]): Record<string, unknown>[] =>
  FAMILY_GROUPS.map((id, i) => group(id, i === 0 ? families.map((f) => String(f['family'])) : []));

const file = (
  families: readonly Record<string, unknown>[],
  groups: readonly Record<string, unknown>[] = groupsFor(families),
): Record<string, unknown> => ({
  provenance,
  unknowns: {
    'provenance.publisher': 'our own editorial work, so there is no external publisher',
    'provenance.publishedYear': 'our own editorial work, so there is no publication date',
    'provenance.sourceUrl': 'not published outside this repository',
  },
  families,
  groupRule: GROUP_RULE,
  groups,
});

const parse = (
  families: readonly Record<string, unknown>[],
  groups?: readonly Record<string, unknown>[],
) => parseTaxonomyVocabulary(file(families, groups), 'test');

describe('the vocabulary schema', () => {
  it('DECOY — a well-formed vocabulary parses', () => {
    // Without this every "throws" below is equally true of a parser that always throws.
    const v = parse([row()]);
    expect(v.families).toHaveLength(1);
    expect(v.families[0]?.ja).toBe('青鼠');
  });

  /*
   * THE ASSERTION THIS FILE IS FOR. A `ja` equal to the slug passes any "is it present?" check
   * and shows a Japanese reader the English authoring slug — which is the state F-090 found.
   */
  it('refuses a Japanese form that is the slug', () => {
    const bad = row({ ja: 'blue-grey' });
    expect(() => parse([bad])).toThrow(CorpusError);
    expect(() => parse([bad])).toThrow(/is the slug/u);
  });

  it('refuses a Japanese form that is the English form', () => {
    expect(() => parse([row({ ja: 'Blue-grey' })])).toThrow(/is the English form/u);
  });

  it('refuses a rationale too short to carry a reason', () => {
    // A family name is the most visible editorial choice in the product.
    expect(() => parse([row({ rationale: 'grey' })])).toThrow(/rationale/u);
  });

  it('refuses the same family twice', () => {
    expect(() => parse([row(), row()])).toThrow(/appears twice/u);
  });

  it('refuses an empty vocabulary', () => {
    expect(() => parse([], groupsFor([row()]))).toThrow(/not a vocabulary/u);
  });

  it('refuses a family that is not an authoring slug', () => {
    expect(() => parse([row({ family: 'Blue Grey' })])).toThrow(/kebab-case/u);
  });

  it('requires the same provenance block every content record carries', () => {
    // One answer to "what does complete mean" (NFR-20): this file is parsed by the same
    // `parseProvenance` a colour entry is, so a vocabulary cannot ship with thinner paperwork
    // than the colours it names.
    const withoutProvenance = { ...file([row()]), provenance: undefined };
    expect(() => parseTaxonomyVocabulary(withoutProvenance, 'test')).toThrow(CorpusError);
  });
});

describe('looking a family up', () => {
  const v = parse([row(), row({ family: 'off-white', en: 'Off-white', ja: '生成り' })]);

  it('returns the form for the locale asked for', () => {
    expect(familyWord(v, 'off-white', 'ja')).toBe('生成り');
    expect(familyWord(v, 'off-white', 'en')).toBe('Off-white');
  });

  /*
   * NO FALLBACK. Returning the slug for an unknown family is precisely the behaviour ADR-0028
   * forbids — it makes the gap invisible. Gate 11 guarantees this cannot happen, so if it does
   * the shipped vocabulary and the shipped corpus came from different generations.
   */
  it('throws on an unknown family rather than falling back to the slug', () => {
    expect(() => familyWord(v, 'no-such-family', 'ja')).toThrow(CorpusError);
    expect(() => familyWord(v, 'no-such-family', 'ja')).toThrow(/different generations/u);
  });

  it('DECOY — a known family does not throw', () => {
    expect(() => familyWord(v, 'blue-grey', 'ja')).not.toThrow();
  });
});

/*
 * THE GROUPS (F-224, ADR-0108). The nine chips PARTITION the families: every family in exactly
 * one, the order fixed, and nothing the vocabulary does not know. Each refusal below is paired
 * with the DECOY at the top of the block, so a parser that refused everything would fail it.
 */
describe('the family groups', () => {
  const two = [row(), row({ family: 'off-white', en: 'Off-white', ja: '生成り' })];
  const grouped = (ao: readonly string[], shiro: readonly string[]) =>
    FAMILY_GROUPS.map((id) => group(id, id === 'ao' ? ao : id === 'shiro' ? shiro : []));

  it('DECOY — two families under two chips parse, and each is found under its own', () => {
    const v = parse(two, grouped(['blue-grey'], ['off-white']));
    expect(v.groups.map((g) => g.group)).toEqual([...FAMILY_GROUPS]);
    expect(familyGroup(v, 'blue-grey').group).toBe('ao');
    expect(familyGroup(v, 'off-white').group).toBe('shiro');
  });

  it('refuses a family in no group', () => {
    expect(() => parse(two, grouped(['blue-grey'], []))).toThrow(/"off-white"/u);
  });

  it('refuses a family in two groups', () => {
    expect(() => parse(two, grouped(['blue-grey', 'off-white'], ['off-white']))).toThrow(
      /already holds/u,
    );
  });

  it('refuses a group naming a family the vocabulary does not have', () => {
    expect(() => parse(two, grouped(['blue-grey', 'no-such'], ['off-white']))).toThrow(
      /not a family in this vocabulary/u,
    );
  });

  it('refuses the groups out of the drawn order', () => {
    const nine = grouped(['blue-grey'], ['off-white']);
    const [a, b, ...rest] = nine;
    if (a === undefined || b === undefined) throw new Error('fixture');
    expect(() => parse(two, [b, a, ...rest])).toThrow(/reorder a drawing/u);
  });

  it('refuses a missing group and an extra one', () => {
    const nine = grouped(['blue-grey'], ['off-white']);
    expect(() => parse(two, nine.slice(0, 8))).toThrow(/exactly 9/u);
    expect(() => parse(two, [...nine, group('hai', [])])).toThrow(/exactly 9/u);
  });

  it('refuses a kanji written in Latin letters', () => {
    const nine = grouped(['blue-grey'], ['off-white']);
    nine[0] = { ...nine[0], kanji: 'Ao' };
    expect(() => parse(two, nine)).toThrow(/Latin letters/u);
  });

  it('refuses a group rationale too short to be a reason', () => {
    const nine = grouped(['blue-grey'], ['off-white']);
    nine[0] = { ...nine[0], rationale: 'blues' };
    expect(() => parse(two, nine)).toThrow(/rationale/u);
  });

  it('refuses a group rule too short to be a rule, and a file with none', () => {
    const base = file(two, grouped(['blue-grey'], ['off-white']));
    expect(() => parseTaxonomyVocabulary({ ...base, groupRule: 'by hue' }, 'test')).toThrow(
      /groupRule/u,
    );
    expect(() => parseTaxonomyVocabulary({ ...base, groupRule: undefined }, 'test')).toThrow(
      CorpusError,
    );
  });

  it('counts the entries under each chip, and shows an empty one as zero', () => {
    const v = parse(two, grouped(['blue-grey'], ['off-white']));
    const counts = entriesPerGroup(v, ['blue-grey', 'blue-grey', 'off-white']);
    expect(counts.map((c) => [c.group.group, c.entries])).toEqual(
      FAMILY_GROUPS.map((id) => [id, id === 'ao' ? 2 : id === 'shiro' ? 1 : 0]),
    );
    // The zero is what the content gate refuses; the counter must not hide it.
    expect(entriesPerGroup(v, ['blue-grey']).find((c) => c.group.group === 'shiro')?.entries).toBe(
      0,
    );
    expect(() => entriesPerGroup(v, ['no-such-family'])).toThrow(/different generations/u);
  });

  it('throws for a family in no group rather than guessing one', () => {
    const v = parse(two, grouped(['blue-grey'], ['off-white']));
    expect(() => familyGroup(v, 'no-such-family')).toThrow(/different generations/u);
  });
});

/*
 * THE SHIPPED FILE. The rule is stated in groupRule; these are its consequences, family by
 * family, so a change to either the rule or the placement shows up here as a named disagreement.
 */
describe('content/taxonomy.json as shipped', () => {
  const shipped = parseTaxonomyVocabulary(
    JSON.parse(
      readFileSync(join(import.meta.dirname, '../../../content/taxonomy.json'), 'utf8'),
    ) as unknown,
    'content/taxonomy.json',
  );

  const expected: Readonly<Record<string, string>> = {
    'deep-blue': 'ao',
    'mid-blue': 'ao',
    'pale-blue': 'ao',
    'blue-grey': 'ao',
    red: 'aka',
    pink: 'aka',
    green: 'midori',
    'pale-green': 'midori',
    'yellow-green': 'midori',
    'blue-green': 'midori',
    'mineral-green': 'midori',
    'green-grey': 'midori',
    'violet-grey': 'murasaki',
    brown: 'cha',
    gold: 'cha',
    clay: 'cha',
    rust: 'cha',
    charcoal: 'kuro',
    'pale-yellow': 'ki',
    ochre: 'ki',
    'off-white': 'shiro',
    stone: 'nezumi',
    'warm-grey': 'nezumi',
    'cool-grey': 'nezumi',
    'mineral-grey': 'nezumi',
  };

  it('places each of the 25 families where the rule says', () => {
    expect(shipped.families).toHaveLength(25);
    const placed = Object.fromEntries(
      shipped.families.map((f) => [f.family, familyGroup(shipped, f.family).group]),
    );
    expect(placed).toEqual(expected);
  });

  it('prints the chips 05 draws, in its order, then the three past its edge (ADR-0108)', () => {
    expect(shipped.groups.map((g) => `${g.romaji} ${g.kanji}`)).toEqual([
      'Ao 青',
      'Aka 赤',
      'Midori 緑',
      'Murasaki 紫',
      'Cha 茶',
      'Kuro 黒',
      'Ki 黄',
      'Shiro 白',
      'Nezumi 鼠',
    ]);
  });
});
