/**
 * `09`'s Finder worked out without rendering (F-250, E-230): the search, its point, the sliders'
 * words and each result's lines, over every case the data allows (F-248's lesson).
 *
 * The invariants a person checks first:
 * 1. the sliders show the question's point — a hex's own, a phrase's or a name's set medoid, the
 *    corpus medoid at the start;
 * 2. one ranking — the results are the set ranked by ΔE00 from that point, through `nameColor`;
 * 3. every word agrees with the printed figure beside it (ADR-0159 D2), on the quantity that figure
 *    measures (F-249's lesson), with the counts pinned;
 * 4. every figure at its stated precision;
 * 5. the state machine does what ADR-0160 says each control does;
 * 6. nothing claims what is not computed.
 */

import { deltaE00 } from '@irodora/color-difference';
import { matchesRegion, type PhraseLexicon } from '@irodora/corpus';
import { oklchToXyz, xyzToLab, type Triple } from '@irodora/color-spaces';
import { allEntries, type PublishedEntry } from '../src/corpus';
import { byName, find, hexPoint, HEX_LIMIT, lexicon, nearestByOklch } from '../src/finder';
import {
  answerOf,
  AXES,
  AXIS_LABEL_KEYS,
  AXIS_NAME_KEYS,
  choose,
  cleared,
  clearedText,
  MODE_KEYS,
  moved,
  namingAxis,
  printedPoint,
  readingInEffect,
  resultLines,
  sliderReadings,
  start,
  termsHolding,
  typed,
  type FinderState,
} from '../src/finder-readout';
import type { MessageKey } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { medoid } from '../src/medoid';
import { oklchLine } from '../src/notation';

/** Ranking thousands of points through the corpus is heavy under a full run (F-249's `8d6a0b7`). */
const CORPUS_WIDE = 180_000;

const ENTRIES = allEntries();
const tEn = (key: MessageKey): string => en[key];
const tJa = (key: MessageKey): string => ja[key];
const slugs = (xs: readonly { entry: PublishedEntry }[]): string[] =>
  xs.map((x) => x.entry.entry.slug);
const pointLab = (p: Triple): Triple => xyzToLab(oklchToXyz(p));

/** Every term, and every ordered pair of two different terms, per language: the phrases tried. */
const PHRASES: readonly string[] = (['en', 'ja'] as const).flatMap((locale) => {
  const terms = lexicon()
    .terms.filter((t) => t.locale === locale)
    .map((t) => t.term);
  const join = (a: string, b: string): string => (locale === 'en' ? `${a} ${b}` : `${a}${b}`);
  return [...terms, ...terms.flatMap((a) => terms.filter((b) => b !== a).map((b) => join(a, b)))];
});
/** Every entry's five name forms. */
const NAMES: readonly string[] = ENTRIES.flatMap((e) => [
  e.entry.name.kanji,
  e.entry.name.kana,
  e.entry.name.romaji,
  e.entry.name.en,
  e.entry.slug,
]);

describe('1. the sliders show the question’s point (ADR-0158 D2)', () => {
  it('starts at the corpus medoid, hai-suna, and lists its nearest eight', () => {
    const s = start();
    expect(s).toStrictEqual({ text: '', chosen: null, point: medoid(ENTRIES).derived.oklch });
    expect(medoid(ENTRIES).entry.slug).toBe('hai-suna');
    // None of 09's figures (E1): 48 %, 0.045, 142°.
    expect(printedPoint(s.point)).toStrictEqual([0.61, 0.012, 72]);
    const a = answerOf(s);
    expect(a.reading).toBeNull();
    expect(slugs(a.results)).toStrictEqual(slugs(nearestByOklch(s.point, HEX_LIMIT)));
    expect(a.results).toHaveLength(HEX_LIMIT);
  });

  it(
    'puts a hex at its own point and lists exactly find()’s entries, at the same distances (E-210)',
    () => {
      for (const e of ENTRIES) {
        const hex = e.derived.hex;
        const s = typed(start(), hex);
        expect(s.point).toStrictEqual(hexPoint(hex));
        expect(readingInEffect(s)).toBe('hex');
        const a = answerOf(s);
        const f = find(hex);
        expect({ [hex]: slugs(a.results) }).toStrictEqual({
          [hex]: f.entries.map((x) => x.entry.slug),
        });
        a.results.forEach((r, i) => {
          expect(r.deltaE00).toBeCloseTo(f.distances?.[i] ?? NaN, 6);
        });
      }
    },
    CORPUS_WIDE,
  );

  it(
    'puts a phrase at its set’s medoid and lists the whole region, nearest first',
    () => {
      let tried = 0;
      for (const q of PHRASES) {
        const f = find(q);
        if (f.kind !== 'phrase') continue;
        tried += 1;
        const s = typed(start(), q);
        const a = answerOf(s);
        if (f.entries.length === 0) {
          // An empty region leaves the point where it was and says why (ADR-0158 D4).
          expect(s.point).toStrictEqual(start().point);
          expect(a.results).toHaveLength(0);
          expect(a.hint).toBe('finder.nonePhraseHint');
          continue;
        }
        const m = medoid(f.entries);
        expect(s.point).toStrictEqual(m.derived.oklch);
        expect(matchesRegion(f.region ?? {}, s.point)).toBe(true);
        expect(new Set(slugs(a.results))).toStrictEqual(
          new Set(f.entries.map((e) => e.entry.slug)),
        );
        expect(a.results[0]?.entry).toBe(m);
        expect(resultLines(a.results[0]!, 0, tEn).distance).toMatch(/ΔE00 0\.00$/u);
      }
      expect(tried).toBeGreaterThan(300);
    },
    CORPUS_WIDE,
  );

  it(
    'puts a name at its set’s medoid and lists every entry the name search finds',
    () => {
      for (const q of NAMES) {
        const set = byName(q);
        const s = typed(start(), q);
        if (find(q).kind !== 'name') continue;
        expect(set.length).toBeGreaterThan(0);
        expect(s.point).toStrictEqual(medoid(set).derived.oklch);
        const a = answerOf(s);
        expect(new Set(slugs(a.results))).toStrictEqual(new Set(set.map((e) => e.entry.slug)));
        expect(a.results[0]?.entry).toBe(medoid(set));
      }
    },
    CORPUS_WIDE,
  );

  it('DECOY — a name that matches nothing leaves the point and says why', () => {
    const s = typed(start(), 'zzqx');
    expect(s.point).toStrictEqual(start().point);
    expect(answerOf(s)).toStrictEqual({
      reading: 'name',
      results: [],
      hint: 'finder.noneNameHint',
    });
  });
});

describe('2. one ranking (E-003, E-015)', () => {
  const POINTS: readonly Triple[] = [
    ...ENTRIES.map((e) => e.derived.oklch),
    [0, 0, 0],
    [1, 0, 0],
    [0.5, 0.4, 0],
    [0.5, 0.4, 359],
    ...[0, 1].flatMap((l) => [0, 0.4].flatMap((c) => [0, 180].map((h) => [l, c, h] as Triple))),
  ];

  it(
    'ranks every point through nameColor, nearest first, each distance the ΔE00 it prints',
    () => {
      for (const p of POINTS) {
        const s: FinderState = { ...start(), point: p };
        const a = answerOf(s);
        expect(slugs(a.results)).toStrictEqual(slugs(nearestByOklch(p, HEX_LIMIT)));
        for (let i = 1; i < a.results.length; i += 1)
          expect(a.results[i]!.deltaE00).toBeGreaterThanOrEqual(a.results[i - 1]!.deltaE00);
        // An oracle that checks rather than ranks: the distance is the ΔE00 to the record's Lab.
        for (const r of a.results)
          expect(r.deltaE00).toBeCloseTo(deltaE00(pointLab(p), r.entry.derived.lab), 6);
      }
    },
    CORPUS_WIDE,
  );

  it('DECOY — the ranking is not the corpus’s slug order', () => {
    const a = answerOf(start());
    expect(slugs(a.results)).not.toStrictEqual(
      [...ENTRIES]
        .map((e) => e.entry.slug)
        .sort()
        .slice(0, HEX_LIMIT),
    );
  });
});

describe('3. every word agrees with the printed figure beside it (ADR-0159 D2)', () => {
  const readingsAt = (p: Triple, locale: 'en' | 'ja' = 'en') =>
    sliderReadings(p, locale, locale === 'en' ? tEn : tJa);

  it('reads every term on exactly one axis, and finds each at a point its region holds', () => {
    for (const term of lexicon().terms) {
      const axis = namingAxis(term);
      expect(AXES).toContain(axis);
      // The term's own medoid, where its region holds an entry; pink holds none, so a built point.
      const holders = ENTRIES.filter((e) => matchesRegion(term.constrains, e.derived.oklch));
      const p: Triple = holders.length > 0 ? medoid(holders).derived.oklch : [0.6, 0.1, 340];
      expect({
        [term.term]: termsHolding(axis, printedPoint(p), term.locale as 'en' | 'ja').map(
          (x) => x.term,
        ),
      }).toStrictEqual({
        [term.term]: expect.arrayContaining([term.term]) as unknown,
      });
    }
  });

  it(
    'names every term whose region holds the printed point, on its axis, and no other',
    () => {
      // Every disagreement is collected and asserted once: a million passing expects is the slow
      // way to say nothing, and one list names every point that failed.
      const wrong: string[] = [];
      for (const locale of ['en', 'ja'] as const)
        for (const l of [0.2, 0.5, 0.8])
          for (let c = 0; c <= 400; c += 7)
            for (let h = 0; h < 360; h += 15) {
              const p = printedPoint([l, c / 1000, h]);
              for (const axis of AXES) {
                const shown = new Set(termsHolding(axis, p, locale).map((t) => t.term));
                for (const term of lexicon().terms.filter((t) => t.locale === locale))
                  if (
                    shown.has(term.term) !==
                    (namingAxis(term) === axis && matchesRegion(term.constrains, p))
                  )
                    wrong.push(`${locale} ${axis} ${term.term} at ${p.join('/')}`);
              }
            }
      expect(wrong).toStrictEqual([]);
    },
    CORPUS_WIDE,
  );

  it('reads no hue below chroma 0.039, though the angle is in a hue’s arc', () => {
    for (let h = 0; h < 360; h += 1) expect(readingsAt([0.5, 0.038, h]).hue.terms).toHaveLength(0);
    expect(readingsAt([0.5, 0.039, 140]).hue.terms).toStrictEqual(['Green']);
  });

  it('reads pale only to chroma 0.06, and brown only to lightness 0.55', () => {
    expect(readingsAt([0.8, 0.06, 140]).lightness.terms).toStrictEqual(['Light', 'Pale']);
    expect(readingsAt([0.8, 0.061, 140]).lightness.terms).toStrictEqual(['Light']);
    expect(readingsAt([0.55, 0.1, 60]).hue.terms).toStrictEqual(['Orange', 'Brown']);
    expect(readingsAt([0.56, 0.1, 60]).hue.terms).toStrictEqual(['Orange']);
  });

  it('DECOY — the word describes the printed figure, not the exact one beside it', () => {
    // 0.0704 is outside muted (to 0.07); printed it is 0.070, which muted holds.
    const r = readingsAt([0.5, 0.0704, 140]);
    expect(r.chroma.figure).toBe('0.070');
    expect(r.chroma.terms).toStrictEqual(['Muted', 'Soft']);
  });

  it('DECOY — a lexicon without soft reads no Soft anywhere', () => {
    const without: PhraseLexicon = {
      ...lexicon(),
      terms: lexicon().terms.filter((t) => t.term !== 'soft'),
    };
    for (let c = 0; c <= 400; c += 1)
      expect(sliderReadings([0.5, c / 1000, 140], 'en', tEn, without).chroma.terms).not.toContain(
        'Soft',
      );
  });

  it('pins how often no term holds, per axis and language (F-356, F-353)', () => {
    const none = (
      locale: 'en' | 'ja',
      axis: (typeof AXES)[number],
      at: (i: number) => Triple,
      n: number,
    ) => {
      let count = 0;
      for (let i = 0; i < n; i += 1)
        if (termsHolding(axis, printedPoint(at(i)), locale).length === 0) count += 1;
      return count;
    };
    const counts = (locale: 'en' | 'ja') => [
      none(locale, 'lightness', (i) => [i / 100, 0.1, 140], 101),
      none(locale, 'chroma', (i) => [0.5, i / 1000, 140], 401),
      none(locale, 'hue', (i) => [0.5, 0.1, i], 360),
    ];
    expect(counts('en')).toStrictEqual([0, 29, 0]);
    expect(counts('ja')).toStrictEqual([33, 49, 132]);
  });

  it('draws the figure and its words in the script’s parentheses, and speaks them plainly', () => {
    const r = readingsAt([0.53, 0.05, 148]);
    expect(r.lightness.text).toBe('53% (Medium)');
    expect(r.chroma.text).toBe('0.050 (Muted / Soft)');
    expect(r.chroma.spoken).toBe('0.050, Muted, Soft');
    expect(r.hue.text).toBe('148° (Green)');
    const j = readingsAt([0.53, 0.05, 148], 'ja');
    expect(j.lightness.text).toBe(`53%（${ja['finder.noTerm']}）`);
    expect(j.chroma.text).toBe('0.050（くすんだ）');
    expect(j.hue.text).toBe('148°（緑）');
    // The start, in English: no hue term at chroma 0.012.
    expect(readingsAt(start().point).hue.text).toBe(`72° (${en['finder.noTerm']})`);
  });
});

describe('4. every figure at its stated precision (ADR-0159 D1, D3)', () => {
  it('prints L to whole percent, C to 3 dp and h to whole degrees, 359.6 as 0°', () => {
    expect(sliderReadings([0.614, 0.0125, 359.6], 'en', tEn).lightness.figure).toBe('61%');
    expect(sliderReadings([0.614, 0.0125, 359.6], 'en', tEn).chroma.figure).toBe('0.013');
    expect(sliderReadings([0.614, 0.0125, 359.6], 'en', tEn).hue.figure).toBe('0°');
    expect(sliderReadings([0.614, 0.0125, 359.4], 'en', tEn).hue.figure).toBe('359°');
  });

  it('prints each card’s name, English name, hex and ΔE00, and the nearest’s OKLCh line', () => {
    const s = typed(start(), 'muted green');
    const [first, second] = answerOf(s).results;
    const one = resultLines(first!, 0, tEn);
    const m = first!.entry;
    expect(m.entry.slug).toBe('yama-kage');
    expect(one.name).toBe(
      `${m.entry.name.kanji} ${m.entry.name.romaji.charAt(0).toUpperCase()}${m.entry.name.romaji.slice(1)}`,
    );
    expect(one.english).toBe(`(${m.entry.name.en})`);
    expect(one.distance).toBe(`${m.derived.hex} • ΔE00 0.00`);
    expect(one.oklch).toBe(oklchLine(m.derived.oklch, 'OKLCh'));
    const two = resultLines(second!, 1, tEn);
    expect(two.oklch).toBeUndefined();
    expect(two.distance).toBe(`${second!.entry.derived.hex} • ΔE00 ${second!.deltaE00.toFixed(2)}`);
    expect(two.spoken).toContain(en['finder.fromPoint']);
  });
});

describe('5. the controls (ADR-0160)', () => {
  it('moves one axis at a time, clamped to its range, the hue round its turn', () => {
    const s = start();
    const [l, c, h] = s.point;
    expect(moved(s, 'lightness', 0.3).point).toStrictEqual([0.3, c, h]);
    expect(moved(s, 'chroma', 0.5).point).toStrictEqual([l, 0.4, h]);
    expect(moved(s, 'lightness', -1).point).toStrictEqual([0, c, h]);
    expect(moved(s, 'hue', 365).point).toStrictEqual([l, c, 5]);
    // The set stays: a phrase's results re-rank, and are still its region.
    const p = typed(start(), 'muted green');
    const before = new Set(slugs(answerOf(p).results));
    const after = answerOf(moved(p, 'hue', 250));
    expect(new Set(slugs(after.results))).toStrictEqual(before);
    expect(slugs(after.results)).not.toStrictEqual(slugs(answerOf(p).results));
  });

  it('empties the words with the field’s clear, keeping the point and the choice', () => {
    const s = choose(typed(start(), 'muted green'), 'phrase');
    const c = clearedText(s);
    expect(c).toStrictEqual({ ...s, text: '' });
  });

  it('starts over with Clear', () => {
    expect(cleared()).toStrictEqual(start());
  });

  it('marks the kind the text was read as until a chip is chosen, then the choice', () => {
    expect(readingInEffect(typed(start(), 'muted green'))).toBe('phrase');
    expect(readingInEffect(typed(start(), '#526A6B'))).toBe('hex');
    expect(readingInEffect(typed(start(), 'ai'))).toBe('name');
    expect(readingInEffect(start())).toBeNull();
    // A choice persists across edits.
    const s = typed(choose(start(), 'name'), 'muted green');
    expect(readingInEffect(s)).toBe('name');
  });

  it('reads a six-letter word as a hex when # Hex Code is chosen', () => {
    for (const word of ['beaded', 'facade', 'decade', 'accede', 'ffffff']) {
      expect(find(word).kind).not.toBe('hex');
      const s = choose(typed(start(), word), 'hex');
      expect(s.point).toStrictEqual(hexPoint(word));
      expect(answerOf(s).results).toHaveLength(HEX_LIMIT);
    }
  });

  it('says why when a chosen reading cannot read the text', () => {
    expect(answerOf(choose(typed(start(), 'ai'), 'hex'))).toStrictEqual({
      reading: 'hex',
      results: [],
      hint: 'finder.notHex',
    });
    expect(answerOf(choose(typed(start(), 'dark sparkly green'), 'phrase'))).toStrictEqual({
      reading: 'phrase',
      results: [],
      hint: 'finder.notPhrase',
    });
  });
});

describe('6. nothing claims what is not computed', () => {
  const KEYS: readonly MessageKey[] = [
    ...Object.values(AXIS_LABEL_KEYS),
    ...Object.values(AXIS_NAME_KEYS),
    ...Object.values(MODE_KEYS),
    'finder.noTerm',
    'finder.fromPoint',
    'finder.notHex',
    'finder.notPhrase',
    'finder.nonePhraseHint',
    'finder.noneNameHint',
    'finder.none',
  ];
  const CLAIM = /\b(Match|Safe|Verified|Measured)\b|Japanese Kanji|一致/u;

  it('in English or Japanese', () => {
    for (const key of KEYS)
      for (const cat of [en, ja])
        expect({ [key]: CLAIM.test(cat[key]) }).toStrictEqual({ [key]: false });
  });

  it('DECOY — a planted Match is found', () => {
    expect(CLAIM.test('97% Match')).toBe(true); // claims-ok: the decoy's planted match, which the scan must find
  });
});
