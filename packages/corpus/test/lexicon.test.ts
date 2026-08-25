/**
 * The phrase lexicon, and the two rules the corpus itself argued for.
 *
 * The interesting assertions here are not "a valid file parses". They are the shapes that look
 * reasonable in a JSON file and answer the wrong question at run time: a hue term with no
 * chroma floor, two hue terms in one query, and a phrase that half-matches.
 */

import { describe, expect, it } from 'vitest';
import { CorpusError } from '../src/errors.js';
import {
  matchesRegion,
  narrow,
  parsePhraseLexicon,
  resolvePhrase,
  type PhraseLexicon,
} from '../src/lexicon.js';

const provenance = {
  source: 'Irodora editorial curation — phrase lexicon, 2026',
  sourceId: 'IRO-ED-002',
  sourceType: 'editorial',
  publisher: null,
  publishedYear: null,
  rightsHolder: 'Irodora',
  sourceLicence: 'Proprietary — Irodora original work',
  sourceUrl: null,
  derivation:
    'Editorial: boundaries chosen as round numbers and verified against the authored bands ' +
    'of every entry in 2026.08.1.',
  authoredBy: 'ed-001',
  authoredAt: '2026-08-25',
  verifiedBy: 'ed-001',
  verifiedAt: '2026-08-25',
  reviewIndependence: 'self',
  editorialNotes: 'Seed vocabulary.',
};

const term = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  term: 'dark',
  locale: 'en',
  constrains: { lightness: { min: 0, max: 0.4 } },
  rationale: 'Below 0.40 in OKLCh lightness, which is where the authored dark band ends.',
  ...over,
});

const file = (terms: readonly Record<string, unknown>[]): Record<string, unknown> => ({
  versionId: '2026.08.1',
  publishedAt: '2026-08-25',
  provenance,
  unknowns: {
    'provenance.publisher': 'our own editorial work, so there is no external publisher',
    'provenance.publishedYear': 'our own editorial work, so there is no publication date',
    'provenance.sourceUrl': 'not published outside this repository',
  },
  terms,
});

const parse = (terms: readonly Record<string, unknown>[]): PhraseLexicon =>
  parsePhraseLexicon(file(terms), 'test');

describe('the lexicon schema', () => {
  it('DECOY — a well-formed lexicon parses', () => {
    // Without this every "throws" below is equally true of a parser that always throws.
    const lexicon = parse([term()]);
    expect(lexicon.terms).toHaveLength(1);
    expect(lexicon.versionId).toBe('2026.08.1');
    expect(lexicon.terms[0]?.constrains.lightness).toEqual({ min: 0, max: 0.4 });
  });

  /*
   * THE RULE THE CORPUS ARGUED FOR. `charcoal` in 2026.08.1 spans hue 58°–268° because its
   * chroma is near zero: its hue is rounding, not colour. A hue term with no chroma floor
   * answers "green" with greys, and nothing about the file would look wrong.
   */
  it('refuses a hue term with no chroma floor', () => {
    const bad = term({ term: 'green', constrains: { hue: { min: 105, max: 175 } } });
    expect(() => parse([bad])).toThrow(CorpusError);
    expect(() => parse([bad])).toThrow(/chroma floor/u);
  });

  it('accepts a hue term that carries one', () => {
    const good = term({
      term: 'green',
      constrains: { hue: { min: 105, max: 175 }, chroma: { min: 0.04, max: 0.4 } },
      rationale: 'The green arc, above the chroma floor at which a hue is perceptible at all.',
    });
    expect(() => parse([good])).not.toThrow();
  });

  it('refuses a term that constrains nothing', () => {
    expect(() => parse([term({ constrains: {} })])).toThrow(/constrains nothing/u);
  });

  it('refuses the same term twice in one language', () => {
    expect(() => parse([term(), term()])).toThrow(/appears twice/u);
  });

  it('allows the same region in both languages', () => {
    expect(() => parse([term(), term({ term: '暗い', locale: 'ja' })])).not.toThrow();
  });

  it('refuses a capitalised English term, which nobody could ever type', () => {
    // Matching lower-cases the query, so this would be a term with no reachable input.
    expect(() => parse([term({ term: 'Dark' })])).toThrow(/lower-case/u);
  });

  it('refuses a rationale too short to carry a reason', () => {
    expect(() => parse([term({ rationale: 'dark' })])).toThrow(/rationale/u);
  });

  /*
   * A reversed LINEAR range is a typo that would match nothing, silently. A reversed HUE range
   * is the arc through 0°, which is the only way to write red — so the same shape has to be
   * accepted on one axis and refused on the others.
   */
  it('refuses a reversed range on a linear axis and accepts it on hue', () => {
    expect(() => parse([term({ constrains: { lightness: { min: 0.8, max: 0.2 } } })])).toThrow(
      /Only a HUE range may wrap/u,
    );
    expect(() =>
      parse([
        term({
          term: 'red',
          constrains: { hue: { min: 340, max: 25 }, chroma: { min: 0.04, max: 0.4 } },
          rationale: 'The red arc through 0°, above the floor at which hue is perceptible.',
        }),
      ]),
    ).not.toThrow();
  });

  it('refuses a hue outside [0, 360)', () => {
    expect(() =>
      parse([
        term({
          term: 'green',
          constrains: { hue: { min: 105, max: 400 }, chroma: { min: 0.04, max: 0.4 } },
          rationale: 'The green arc, above the chroma floor at which hue is perceptible.',
        }),
      ]),
    ).toThrow(/hue in \[0, 360\)/u);
  });
});

describe('resolving a phrase', () => {
  const LEXICON = parse([
    term(),
    term({
      term: 'muted',
      constrains: { chroma: { min: 0.02, max: 0.07 } },
      rationale: 'Low-to-mid chroma. It OVERLAPS the hue floor deliberately — see the test.',
    }),
    term({
      term: 'grey',
      constrains: { chroma: { min: 0, max: 0.04 } },
      rationale: 'At or below 0.04 chroma, which is where the authored low band ends.',
    }),
    term({
      term: 'vivid',
      constrains: { chroma: { min: 0.08, max: 0.4 } },
      rationale: 'Above the authored mid band, where a colour reads as saturated rather than soft.',
    }),
    term({
      term: 'green',
      constrains: { hue: { min: 105, max: 175 }, chroma: { min: 0.04, max: 0.4 } },
      rationale: 'The green arc, above the chroma floor at which a hue is perceptible at all.',
    }),
    term({
      term: 'blue',
      constrains: { hue: { min: 220, max: 275 }, chroma: { min: 0.04, max: 0.4 } },
      rationale: 'The blue arc, above the chroma floor at which a hue is perceptible at all.',
    }),
    term({ term: '暗い', locale: 'ja' }),
    term({
      term: '緑',
      locale: 'ja',
      constrains: { hue: { min: 105, max: 175 }, chroma: { min: 0.04, max: 0.4 } },
      rationale: 'The green arc, above the chroma floor at which a hue is perceptible at all.',
    }),
  ]);

  it('resolves a two-word phrase to the intersection', () => {
    const found = resolvePhrase(LEXICON, 'dark green');
    expect(found).not.toBeNull();
    expect(found?.matched.map((t) => t.term)).toEqual(['dark', 'green']);
    expect(found?.region.lightness).toEqual({ min: 0, max: 0.4 });
    expect(found?.region.hue).toEqual({ min: 105, max: 175 });
    // The hue term's floor survives, which is what stops greys answering "green".
    expect(found?.region.chroma?.min).toBe(0.04);
  });

  it('is order-independent', () => {
    expect(resolvePhrase(LEXICON, 'green dark')?.region).toEqual(
      resolvePhrase(LEXICON, 'dark green')?.region,
    );
  });

  /*
   * Japanese has no spaces, so a resolver that split on whitespace would work in one language
   * and not the other. Scanning for terms treats both alike.
   */
  it('resolves Japanese, which has no spaces to split on', () => {
    const found = resolvePhrase(LEXICON, '暗い緑');
    expect(found?.matched.map((t) => t.term)).toEqual(['暗い', '緑']);
    expect(found?.region.hue).toEqual({ min: 105, max: 175 });
  });

  it('narrows rather than replaces on a linear axis', () => {
    const found = resolvePhrase(LEXICON, 'grey dark');
    expect(found?.region.chroma).toEqual({ min: 0, max: 0.04 });
    expect(found?.region.lightness).toEqual({ min: 0, max: 0.4 });
  });

  /*
   * FR-47'S OWN EXAMPLE, and the test that corrected the vocabulary.
   *
   * The first draft gave 'muted' the range [0, 0.04] — which is GREY, not muted — so it and
   * the green term's chroma floor of 0.04 intersected at a single point and the requirement's
   * own example phrase resolved to a region matching almost nothing. The mechanism was right
   * and the words were wrong: muted is low-to-MID chroma, and it has to overlap the floor at
   * which a hue becomes perceptible or no hue can ever be muted.
   */
  it('resolves "dark muted green", which is the phrase FR-47 names', () => {
    const found = resolvePhrase(LEXICON, 'dark muted green');
    expect(found).not.toBeNull();
    expect(found?.matched.map((t) => t.term)).toEqual(['dark', 'muted', 'green']);
    expect(found?.region.lightness).toEqual({ min: 0, max: 0.4 });
    expect(found?.region.hue).toEqual({ min: 105, max: 175 });
    // The floor and the muted ceiling, intersected — a real band, not a single point.
    expect(found?.region.chroma).toEqual({ min: 0.04, max: 0.07 });
    expect(found?.region.chroma?.min).toBeLessThan(found?.region.chroma?.max ?? 0);
  });

  /*
   * "muted green" asks for chroma at most 0.04 AND at least 0.04 — an empty region rather than
   * a contradiction to paper over. Returning null sends it to name search, which is the honest
   * answer to a query that describes nothing.
   */
  it('returns null when two terms leave no room on an axis', () => {
    expect(resolvePhrase(LEXICON, 'grey vivid')).toBeNull();
  });

  /*
   * Two hue arcs can intersect in two arcs, which the region shape cannot express. Refusing is
   * better than silently keeping one of them: nobody should get a confident answer to
   * "green blue".
   */
  it('refuses two hue terms rather than picking one', () => {
    expect(resolvePhrase(LEXICON, 'green blue')).toBeNull();
    // Looked up by NAME rather than by index: adding a term to the fixture above must not
    // silently point this assertion at a different word.
    const blue = LEXICON.terms.find((t) => t.term === 'blue')!;
    expect(narrow({ hue: { min: 105, max: 175 } }, blue)).toBeNull();
  });

  it('returns null when any part of the query is unknown', () => {
    // A single unrecognised word means this was not a phrase. It must not half-succeed.
    expect(resolvePhrase(LEXICON, 'dark sparkly green')).toBeNull();
    expect(resolvePhrase(LEXICON, 'sparkly')).toBeNull();
    expect(resolvePhrase(LEXICON, 'ai-nezumi')).toBeNull();
  });

  it('returns null for an empty query rather than the unconstrained region', () => {
    // An empty region matches every colour, which is the worst possible answer to "".
    expect(resolvePhrase(LEXICON, '   ')).toBeNull();
  });

  it('lower-cases the query, so typing matters less than spelling', () => {
    expect(resolvePhrase(LEXICON, 'DARK GREEN')?.matched).toHaveLength(2);
  });
});

describe('matching a colour against a region', () => {
  const green = { min: 105, max: 175 };

  it('ignores an axis the region does not constrain', () => {
    expect(matchesRegion({ lightness: { min: 0, max: 0.4 } }, [0.3, 0.9, 200])).toBe(true);
  });

  it('excludes a colour outside any constrained axis', () => {
    expect(matchesRegion({ lightness: { min: 0, max: 0.4 } }, [0.5, 0.01, 200])).toBe(false);
  });

  /*
   * THE DECOY THAT EARNS THE CHROMA FLOOR, with a real value from the corpus. `sumi-iro`-like
   * charcoals sit at hue 128°–158° — squarely inside the green arc — with chroma near zero.
   * Without the floor this returns true and the Finder answers "green" with a grey.
   */
  it('excludes a near-neutral whose hue happens to lie in the green arc', () => {
    const region = { hue: green, chroma: { min: 0.04, max: 0.4 } };
    expect(matchesRegion(region, [0.28, 0.006, 140])).toBe(false);
    // And the same hue WITH chroma is included, so the exclusion is the floor and not the arc.
    expect(matchesRegion(region, [0.28, 0.08, 140])).toBe(true);
  });

  it('wraps a hue arc through 0 degrees', () => {
    const red = { hue: { min: 340, max: 25 }, chroma: { min: 0.04, max: 0.4 } };
    expect(matchesRegion(red, [0.5, 0.1, 350])).toBe(true);
    expect(matchesRegion(red, [0.5, 0.1, 10])).toBe(true);
    expect(matchesRegion(red, [0.5, 0.1, 180])).toBe(false);
  });
});
