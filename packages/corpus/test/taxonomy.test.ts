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
import { familyWord, parseTaxonomyVocabulary } from '../src/taxonomy.js';

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

const file = (families: readonly Record<string, unknown>[]): Record<string, unknown> => ({
  provenance,
  unknowns: {
    'provenance.publisher': 'our own editorial work, so there is no external publisher',
    'provenance.publishedYear': 'our own editorial work, so there is no publication date',
    'provenance.sourceUrl': 'not published outside this repository',
  },
  families,
});

const parse = (families: readonly Record<string, unknown>[]) =>
  parseTaxonomyVocabulary(file(families), 'test');

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
    expect(() => parse([])).toThrow(/not a vocabulary/u);
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
