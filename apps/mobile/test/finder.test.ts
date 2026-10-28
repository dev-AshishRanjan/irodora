/**
 * The Finder, at the module rather than the screen.
 *
 * > *Search by English name, Japanese name, kanji, romaji, hex, or natural phrase.* — FR-47
 *
 * Every one of those is a routing decision, and a routing decision is exactly the kind of thing
 * that is easy to assert about and impossible to see. The assertions that earn this file are
 * the ones about what the router does with an input that could plausibly be two things.
 */

import { allEntries, entryBySlug } from '../src/corpus';
import { matchesRegion, resolvePhrase } from '@irodora/corpus';
import {
  byName,
  find,
  findAs,
  hexNearest,
  hexPoint,
  HEX_LIMIT,
  lexicon,
  rankedFrom,
  type FinderResult,
} from '../src/finder';

/** A loop over every corpus entry's forms and the lexicon is heavy under a full run (F-348, F-350). */
const CORPUS_WIDE = 120_000;

const slugOf = (r: { entries: readonly { entry: { slug: string } }[] }): string[] =>
  r.entries.map((e) => e.entry.slug);

describe('the lexicon is verified before it is used', () => {
  it('loads, and reports the version an answer came from', () => {
    // The digest comes from the LEDGER and the text from the generated module. Reaching this
    // line at all means the two agreed.
    const lex = lexicon();
    expect(lex.versionId).toBe('2026.08.1');
    expect(lex.terms.length).toBeGreaterThan(0);
  });

  it('carries a chroma floor on every hue term', () => {
    // The schema enforces it; this asserts the SHIPPED lexicon actually exercises the rule,
    // rather than the rule being true of a file with no hue terms in it.
    const hueTerms = lexicon().terms.filter((t) => t.constrains.hue !== undefined);
    expect(hueTerms.length).toBeGreaterThan(0);
    for (const t of hueTerms) expect(t.constrains.chroma?.min).toBeGreaterThan(0);
  });
});

describe('routing a query (FR-47)', () => {
  it('reads a hex as a hex, with or without the hash and at either length', () => {
    for (const q of ['#526A6B', '526A6B', '#0af', '0AF']) expect(find(q).kind).toBe('hex');
  });

  /*
   * THE DECOY, AND IT FOUND A REAL AMBIGUITY RATHER THAN CONFIRMING A GUESS.
   *
   * `beaded` is six characters and every one is a hex digit — `#BEADED` is a real colour, as
   * are `decade` and `facade`. The first draft read it as a hex and answered an English word
   * with a colour chart. No amount of anchoring fixes that: the string genuinely IS a hex.
   *
   * The rule is now that an unprefixed hex must contain a DIGIT, and that `#` says you meant
   * the colour.
   */
  it('DECOY — a six-letter word is a name, and the same word with a hash is a hex', () => {
    expect(find('beaded').kind).toBe('name');
    expect(find('#beaded').kind).toBe('hex');
    expect(find('ai-nezumi').kind).toBe('name');
    expect(find('#52 6A6B').kind).toBe('name');
  });

  it('states the cost of that rule rather than hiding it', () => {
    // An all-letter hex without a hash searches names and finds nothing. With the hash it is
    // unambiguous. This is asserted so the trade-off is visible rather than discovered.
    expect(find('ffffff').kind).toBe('name');
    expect(find('ffffff').entries).toHaveLength(0);
    expect(find('#ffffff').kind).toBe('hex');
  });

  it('reads a known phrase as a phrase', () => {
    expect(find('dark muted green').kind).toBe('phrase');
    expect(find('pale blue').kind).toBe('phrase');
    expect(find('brown').kind).toBe('phrase');
  });

  it('falls to name search when any part of a phrase is unknown', () => {
    // One unrecognised word and the whole thing is a name query. A phrase must not
    // half-succeed by quietly ignoring the part it did not understand.
    expect(find('dark sparkly green').kind).toBe('name');
  });

  it('answers an empty query with nothing rather than everything', () => {
    expect(find('   ').kind).toBe('empty');
    expect(find('   ').entries).toHaveLength(0);
  });
});

describe('a hex query returns its nearest entries by ΔE00 (FR-47)', () => {
  const entry = allEntries()[0]!;

  it('puts the exact corpus colour first, at distance zero', () => {
    // The strongest available check on the ranking's wiring: querying an entry's own hex must
    // return that entry, and nothing can be nearer to it than itself.
    const result = find(entry.derived.hex);
    expect(result.kind).toBe('hex');
    expect(slugOf(result)[0]).toBe(entry.entry.slug);
    expect(result.distances?.[0]).toBeLessThan(0.5);
  });

  it('returns distances in ascending order, one per entry', () => {
    const result = find('#526A6B');
    expect(result.entries.length).toBe(result.distances?.length);
    expect(result.entries.length).toBeLessThanOrEqual(HEX_LIMIT);
    const d = result.distances ?? [];
    for (let i = 1; i < d.length; i += 1) expect(d[i]!).toBeGreaterThanOrEqual(d[i - 1]!);
  });

  it('treats the three-digit form as the six-digit one it expands to', () => {
    expect(slugOf(find('#0af'))).toEqual(slugOf(find('#00AAFF')));
  });

  /*
   * No ranking is implemented in the app, so this asserts the SEAM rather than the maths:
   * that the ranking came from @irodora/color-naming over the corpus the app verified.
   * The maths itself is that package's golden set (E-003, E-015).
   */
  it('ranks against the whole corpus, not a subset', () => {
    const result = find('#808080');
    expect(result.entries.length).toBe(HEX_LIMIT);
    for (const e of result.entries) expect(entryBySlug(e.entry.slug)).not.toBeNull();
  });
});

describe('a phrase query maps to a region (FR-47)', () => {
  it('reports the region and the terms it came from', () => {
    const result = find('dark muted green');
    expect(result.region?.lightness).toEqual({ min: 0, max: 0.395 });
    expect(result.region?.hue).toEqual({ min: 105, max: 175 });
    expect(result.matched?.map((t) => t.term)).toEqual(['dark', 'muted', 'green']);
  });

  it('names the lexicon version, so an answer can be replayed', () => {
    // The same habit FR-10 imposes on a recommendation: an answer that cannot say which
    // vocabulary produced it is one nobody can reproduce after the vocabulary moves.
    expect(find('dark green').lexiconVersion).toBe('2026.08.1');
    // And it is reported only where it MEANS something: a hex or a name answer did not come
    // from the vocabulary, so claiming a vocabulary version for it would be noise.
    expect(find('#526A6B').lexiconVersion).toBeUndefined();
    expect(find('ai-nezumi').lexiconVersion).toBeUndefined();
  });

  it('returns only entries inside the region', () => {
    const result = find('light');
    expect(result.entries.length).toBeGreaterThan(0);
    for (const e of result.entries) expect(e.derived.oklch[0]).toBeGreaterThanOrEqual(0.725);
  });

  /*
   * THE DECOY THE WHOLE CHROMA FLOOR EXISTS FOR.
   *
   * `charcoal` entries in this corpus sit at hue 58°–268° with chroma near zero — several of
   * them squarely inside the green arc. Without the floor, "green" answers with greys, and
   * every other assertion in this file would still pass.
   */
  it('DECOY — a near-neutral in the green arc is not green', () => {
    const greenish = allEntries().filter(
      (e) => e.derived.oklch[2] >= 105 && e.derived.oklch[2] <= 175 && e.derived.oklch[1] < 0.039,
    );
    expect(greenish.length).toBeGreaterThan(0);

    const returned = new Set(slugOf(find('green')));
    for (const e of greenish) expect(returned.has(e.entry.slug)).toBe(false);
    // And the floor excludes them rather than the arc: something IS returned for green.
    expect(returned.size).toBeGreaterThan(0);
  });

  it('agrees with the authored taxonomy it was measured against', () => {
    // The content gate asserts this over the files; this asserts it over what the APP loads,
    // which is a different artefact reached by a different path.
    const dark = new Set(slugOf(find('dark')));
    for (const e of allEntries())
      if (e.entry.taxonomy.lightnessBand === 'dark')
        expect(`${e.entry.slug} in dark: ${String(dark.has(e.entry.slug))}`).toBe(
          `${e.entry.slug} in dark: true`,
        );
  });

  it('is deterministic — the same query gives the same order', () => {
    expect(slugOf(find('dark muted green'))).toEqual(slugOf(find('dark muted green')));
    expect(slugOf(find('green dark muted'))).toEqual(slugOf(find('dark muted green')));
  });
});

describe('name search covers every form (FR-47)', () => {
  const entry = allEntries().find((e) => e.entry.name.kanji.length > 0)!;

  it.each([
    ['kanji', (e: typeof entry) => e.entry.name.kanji],
    ['kana', (e: typeof entry) => e.entry.name.kana],
    ['romaji', (e: typeof entry) => e.entry.name.romaji],
    ['English', (e: typeof entry) => e.entry.name.en],
    ['slug', (e: typeof entry) => e.entry.slug],
  ])('finds an entry by its %s', (_form, pick) => {
    expect(byName(pick(entry)).map((e) => e.entry.slug)).toContain(entry.entry.slug);
  });

  it('matches a substring, not only a prefix', () => {
    // Somebody who remembers the second half of a name has the same claim on finding it.
    const en = entry.entry.name.en;
    const tail = en.slice(Math.max(1, en.length - 4));
    expect(byName(tail).map((e) => e.entry.slug)).toContain(entry.entry.slug);
  });

  it('is case-insensitive for Latin forms', () => {
    expect(byName(entry.entry.slug.toUpperCase()).map((e) => e.entry.slug)).toContain(
      entry.entry.slug,
    );
  });

  it('returns nothing for a query that matches nothing, rather than everything', () => {
    expect(byName('zzzzzznotacolour')).toHaveLength(0);
  });
});

describe('a chosen reading (F-250, ADR-0158 D1)', () => {
  const QUERIES: readonly string[] = [
    ...allEntries().flatMap((e) => [
      e.derived.hex,
      e.entry.name.kanji,
      e.entry.name.kana,
      e.entry.name.romaji,
      e.entry.name.en,
      e.entry.slug,
    ]),
    ...lexicon().terms.map((t) => t.term),
    'dark muted green',
    'muted green',
    '#0af',
    'zzqx',
  ];

  /*
   * THE ORACLE IS find() AS IT WAS BEFORE F-250 (review, M1), written out here so it is independent of
   * the code it checks: find() now delegates to findAs, so comparing the two would compare a function
   * with itself. A change to either that changes what the Atlas (E-210) or Compare's chooser (E-229)
   * reads fails here.
   */
  const before = (query: string): FinderResult => {
    const text = query.trim();
    if (text === '') return { kind: 'empty', entries: [] };
    const nearest = hexNearest(text, HEX_LIMIT);
    if (nearest !== null)
      return {
        kind: 'hex',
        entries: nearest.map((n) => n.entry),
        distances: nearest.map((n) => n.deltaE00),
      };
    const phrase = resolvePhrase(lexicon(), text);
    if (phrase !== null)
      return {
        kind: 'phrase',
        entries: allEntries().filter((e) => matchesRegion(phrase.region, e.derived.oklch)),
        region: phrase.region,
        matched: phrase.matched,
        lexiconVersion: lexicon().versionId,
      };
    return { kind: 'name', entries: byName(text) };
  };

  it(
    'answers every query tried as find() answered it before F-250, and findAs agrees on its kind',
    () => {
      for (const q of QUERIES) {
        const was = before(q);
        expect({ [q]: find(q) }).toStrictEqual({ [q]: was });
        if (was.kind !== 'empty') expect({ [q]: findAs(q, was.kind) }).toStrictEqual({ [q]: was });
      }
    },
    CORPUS_WIDE,
  );

  it('DECOY — the oracle tells a hex from a word, so agreeing with it is not agreeing with anything', () => {
    expect(before('#526A6B').kind).toBe('hex');
    expect(before('beaded').kind).toBe('name');
    expect(before('dark').kind).toBe('phrase');
  });

  it('reads a six-letter word as a hex when the hex is chosen, closing the stated cost', () => {
    for (const word of ['beaded', 'facade', 'decade', 'accede', 'ffffff']) {
      expect(find(word).kind).toBe('name');
      const r = findAs(word, 'hex');
      expect(r.kind).toBe('hex');
      expect(r.entries).toHaveLength(HEX_LIMIT);
      expect(r.unreadable).toBeUndefined();
    }
  });

  it('says it cannot read a phrase with a word the vocabulary lacks, or a hex that is none', () => {
    expect(findAs('dark sparkly green', 'phrase')).toStrictEqual({
      kind: 'phrase',
      entries: [],
      unreadable: true,
    });
    expect(findAs('ai', 'hex')).toStrictEqual({ kind: 'hex', entries: [], unreadable: true });
    // DECOY — find() never says so: it reads each text the way it can.
    expect(find('dark sparkly green').unreadable).toBeUndefined();
  });

  it('puts a typed hex at its own OKLCh, through the engine, and a word at none', () => {
    const p = hexPoint('#87817A');
    expect(p).not.toBeNull();
    expect(hexPoint('87817a')).toStrictEqual(p);
    expect(hexPoint('ai')).toBeNull();
  });

  it('ranks a named set whole and the corpus to its limit, through one route', () => {
    const point = allEntries()[0]!.derived.oklch as [number, number, number];
    const all = rankedFrom(point, 'corpus');
    expect(all).toHaveLength(allEntries().length);
    expect(rankedFrom(point, 'corpus', HEX_LIMIT)).toStrictEqual(all.slice(0, HEX_LIMIT));
    const greens = find('green').entries;
    const ranked = rankedFrom(point, greens);
    expect(ranked.map((r) => r.entry)).toHaveLength(greens.length);
    expect(ranked.map((r) => r.entry.entry.slug)).toStrictEqual(
      all.filter((r) => greens.includes(r.entry)).map((r) => r.entry.entry.slug),
    );
  });
});
