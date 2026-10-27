/**
 * What `08` prints for a pair — checked over EVERY ordered pair the corpus allows (F-248's lesson: a
 * fixture that shares a defect cannot find it; state the invariant a person checks first and hold it
 * over every case the data allows).
 *
 * 1. Two colours, and the two named: the pair is never one colour twice.
 * 2. Every figure is the engine's, at the precision ADR-0155 D1 names — floored where a threshold
 *    rides on it.
 * 3. Every word agrees with the figure beside it: the band is the printed figure's, the direction the
 *    printed sign's, *towards* only where D2 allows it.
 * 4. Swapping A and B changes only what a direction should.
 * 5. Nothing the readout prints claims what the engine does not compute.
 */

import {
  apcaLc,
  axisReading,
  deltaE00Band,
  deltaE00Terms,
  deltaEok,
  printedDeltaE00,
  wcagContrast,
} from '@irodora/color-difference';
import { hueDelta, oklchToOklab } from '@irodora/color-spaces';
import { separationDetail } from '@irodora/cvd-engine';
import { matchesRegion } from '@irodora/corpus';
import { MINUS, valueText, type RuledRow } from '@irodora/ui';
import { compare } from '../src/compare';
import {
  choose,
  DEFICIENCY_LABEL_KEYS,
  flooredRatio,
  hueTerm,
  initialPair,
  MODEL_KEYS,
  nameLine,
  pairMeta,
  pairReadout,
  pairSampleSize,
  pickList,
  shownLc,
  THRESHOLDS,
  thresholdKey,
  towards,
  UNDER_THRESHOLD_KEY,
} from '../src/compare-readout';
import { allEntries, entryBySlug, type PublishedEntry } from '../src/corpus';
import { BAND_KEYS, CHROMA_KEYS, HUE_KEYS, LIGHTNESS_KEYS } from '../src/delta-readings';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import type { MessageKey } from '../src/i18n';
import { HARMONY_KEYS } from '../src/temperature';

/** A pass over every ordered pair runs the engine 14,280 times: seconds, not jest's default 5 under load. */
const CORPUS_WIDE = 120_000;

const ENTRIES = allEntries();
const PAIRS: readonly (readonly [PublishedEntry, PublishedEntry])[] = ENTRIES.flatMap((a) =>
  ENTRIES.filter((b) => b !== a).map((b) => [a, b] as const),
);
const tEn = (key: MessageKey): string => en[key];
const tJa = (key: MessageKey): string => ja[key];
/** Whether A’s hue angle lies in a term’s hue arc: where the pair’s hue did not move towards it (S2). */
const inArc = (
  term: { readonly constrains: Parameters<typeof matchesRegion>[0] },
  e: PublishedEntry,
) =>
  term.constrains.hue !== undefined && matchesRegion({ hue: term.constrains.hue }, e.derived.oklch);
const row = (rows: readonly RuledRow[], key: string): RuledRow => {
  const found = rows.find((r) => r.key === key);
  if (found === undefined) throw new Error(key);
  return found;
};
const printedOf = (r: RuledRow): string => valueText(r.value);
const at = (v: number, places: number): number => Number(v.toFixed(places));
const signedText = (v: number, places: number): string => {
  const p = Math.abs(v).toFixed(places);
  return Number(p) === 0 ? p : `${v < 0 ? MINUS : '+'}${p}`;
};

describe('the corpus this suite reasons over', () => {
  it('is 120 entries, 14,280 ordered pairs', () => {
    expect(ENTRIES).toHaveLength(120);
    expect(PAIRS).toHaveLength(14_280);
  });
});

describe('1. two colours, and the two named', () => {
  it('opens on two different colours for every colour, and for none', () => {
    const first = ENTRIES[0]?.entry.slug;
    const last = ENTRIES.at(-1)?.entry.slug;
    expect(initialPair()).toStrictEqual({ a: first, b: last });
    for (const e of ENTRIES) {
      const pair = initialPair(e.entry.slug);
      expect(pair?.a).toBe(e.entry.slug);
      expect(pair?.b).not.toBe(pair?.a);
    }
    // The last colour's partner is the first, not itself.
    expect(initialPair(last)).toStrictEqual({ a: last, b: first });
    // A colour this corpus does not hold is the absent state, not a guess.
    expect(initialPair('not-a-colour')).toBeNull();
  });

  it('never makes the two one colour, and never offers the other slot’s colour', () => {
    const state = { a: 'aka-tsuchi', b: 'ao-ta' };
    for (const e of ENTRIES) {
      const a = choose(state, 'a', e.entry.slug);
      const b = choose(state, 'b', e.entry.slug);
      expect(a.a).not.toBe(a.b);
      expect(b.a).not.toBe(b.b);
    }
    // DECOY: the other side's slug is refused, and the state is unchanged.
    expect(choose(state, 'a', 'ao-ta')).toBe(state);
    expect(choose(state, 'b', 'aka-tsuchi')).toBe(state);
    expect(choose(state, 'a', 'not-a-colour')).toBe(state);
    for (const query of ['', 'blue', '#5B6B78', 'ao', 'aka'])
      for (const side of ['a', 'b'] as const) {
        const other = side === 'a' ? state.b : state.a;
        expect(pickList(query, side, state).some((e) => e.entry.slug === other)).toBe(false);
      }
    // With the field empty, every entry but the other slot's.
    expect(pickList('', 'a', state)).toHaveLength(119);
  });

  it('names each sample by its kanji and romaji, and prints its hex, OKLCh L and h', () => {
    for (const e of ENTRIES) {
      expect(nameLine(e).startsWith(`${e.entry.name.kanji} `)).toBe(true);
      const [l, , h] = e.derived.oklch;
      expect(pairMeta(e)).toBe(`${e.derived.hex} • OKLCh ${l.toFixed(3)} • ${h.toFixed(1)}°`);
    }
  });
});

/*
 * aka-tsuchi → ao-ta, worked from the records' CIELCh (D65):
 *   L* 66.282 → 64.559: ΔL* −1.72, printed −1.7;  C* 29.658 → 40.663: ΔC* +11.005, printed +11.0;
 *   h 53.20° → 126.71°: the shortest arc +73.51°, printed +73.5°.
 * ΔE00 32.28, ΔEok 0.126, the ratio 1.05:1 (floored), separations 36 · 20 · 100 % (F-249's census).
 */
const PIN = [
  ['delta-e00', 'm', '32.28'],
  ['delta-eok', 'm', '0.126'],
  ['lightness', 'm', `${MINUS}1.7`],
  ['chroma', 'm', '+11.0'],
  ['hue', 'm', '+73.5°'],
  ['wcag', 'a', '1.05:1'],
  ['protan', 'a', '36%'],
  ['deutan', 'a', '20%'],
  ['tritan', 'a', '100%'],
] as const;

describe('2. every figure is the engine’s', () => {
  it(
    'prints each row from the engine, over every ordered pair',
    () => {
      for (const [a, b] of PAIRS) {
        const r = pairReadout(a, b, tEn, 'en', 'latin');
        const terms = deltaE00Terms(a.derived.lab, b.derived.lab);
        expect(printedOf(row(r.metrics, 'delta-e00'))).toBe(
          printedDeltaE00(terms.deltaE00).toFixed(2),
        );
        expect(printedOf(row(r.metrics, 'delta-eok'))).toBe(
          deltaEok(oklchToOklab(a.derived.oklch), oklchToOklab(b.derived.oklch)).toFixed(3),
        );
        expect(printedOf(row(r.metrics, 'lightness'))).toBe(
          signedText(b.derived.lch[0] - a.derived.lch[0], 1),
        );
        expect(printedOf(row(r.metrics, 'chroma'))).toBe(
          signedText(b.derived.lch[1] - a.derived.lch[1], 1),
        );
        const dh = hueDelta(a.derived.lch[2], b.derived.lch[2]);
        expect(Math.abs(dh)).toBeLessThanOrEqual(180);
        expect(printedOf(row(r.metrics, 'hue'))).toBe(`${signedText(dh, 1)}°`);
        const ratio = wcagContrast(a.derived.rgb, b.derived.rgb);
        expect(printedOf(row(r.access, 'wcag'))).toBe(
          `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`,
        );
        const lc = Math.min(
          Math.abs(apcaLc(a.derived.rgb, b.derived.rgb)),
          Math.abs(apcaLc(b.derived.rgb, a.derived.rgb)),
        );
        expect(row(r.access, 'wcag').note).toBe(
          `(APCA Lc: ${(Math.floor(lc * 10) / 10).toFixed(1)})`,
        );
        for (const d of ['protan', 'deutan', 'tritan'] as const)
          expect(printedOf(row(r.access, d))).toBe(
            `${String(Math.floor(separationDetail(a.derived.rgb, b.derived.rgb, d, 1).score))}%`,
          );
      }
    },
    CORPUS_WIDE,
  );

  /*
   * ONE PAIR WORKED BY HAND, from the bundle's own values (E-003's pattern), so a change that moves
   * every figure the same way still fails here:
   *   aka-tsuchi CIELCh (D65) and ao-ta CIELCh (D65) are the records' derived.lch; ΔL* = L*B − L*A
   *   and ΔC* = C*B − C*A, each to one place; ΔH is the shortest arc from h_A to h_B.
   */
  it('pins aka-tsuchi → ao-ta', () => {
    const a = entryBySlug('aka-tsuchi');
    const b = entryBySlug('ao-ta');
    if (a === null || b === null) throw new Error('fixture');
    const r = pairReadout(a, b, tEn, 'en', 'latin');
    expect(
      PIN.map(([k, list]) => printedOf(row(list === 'm' ? r.metrics : r.access, k))),
    ).toStrictEqual(PIN.map(([, , want]) => want));
    // The fixture shows none of 08's own figures (E1).
    for (const drawn of ['3.42', '0.038', '+4.8', '+5.2', '−14.2°', '1.48:1', '92%', '94%', '89%'])
      expect(PIN.map(([, , want]) => want)).not.toContain(drawn);
  });

  it(
    'floors the ratio and the Lc: rounding would claim a threshold the pair does not reach',
    () => {
      let crosses = 0;
      for (const [a, b] of PAIRS) {
        const ratio = wcagContrast(a.derived.rgb, b.derived.rgb);
        const rounded = Math.round(ratio * 100) / 100;
        if (THRESHOLDS.some((x) => rounded >= x.at && flooredRatio(ratio) < x.at)) crosses += 1;
      }
      // DECOY: the corpus holds pairs where rounding would cross 3:1 (F-249's census: 14).
      expect(crosses).toBeGreaterThan(0);
      expect(flooredRatio(2.996)).toBe(2.99);
      expect(shownLc({ wcagRatio: 1, apcaBOnA: -44.69, apcaAOnB: 45.3 })).toBe(44.6);
    },
    CORPUS_WIDE,
  );
});

describe('3. every word agrees with the figure beside it', () => {
  it(
    'bands, directions, thresholds and towards, over every ordered pair',
    () => {
      let level = 0;
      let withTowards = 0;
      let withoutTowards = 0;
      let componentAboveTotal = 0;
      const chroma = { strongUnder18: 0, strongUnder10: 0, slightUnder08: 0 };
      const rank = { veryClose: 0, slight: 1, perceptible: 2 } as const;
      for (const [a, b] of PAIRS) {
        const r = pairReadout(a, b, tEn, 'en', 'latin');
        const m = compare(a, b);
        const total = deltaE00Band(printedDeltaE00(m.deltaE00));
        expect(row(r.metrics, 'delta-e00').reading).toBe(en[BAND_KEYS[total]]);
        const dL = at(m.lch.l.delta, 1);
        const rl = axisReading(dL, m.terms.termL);
        const lightness = row(r.metrics, 'lightness').reading;
        if (dL === 0) {
          level += m.lch.l.delta === 0 ? 0 : 1;
          expect(lightness).toBe(en[LIGHTNESS_KEYS.level]);
        } else expect(lightness).toBe(en[LIGHTNESS_KEYS[dL > 0 ? 'more' : 'less'][rl.band]]);
        const dC = at(m.lch.c.delta, 1);
        const rc = axisReading(dC, m.terms.termC);
        if (dC !== 0 && rc.band === 'perceptible' && Math.abs(dC) < 1.8) chroma.strongUnder18 += 1;
        if (dC !== 0 && rc.band === 'perceptible' && Math.abs(dC) < 1.0) chroma.strongUnder10 += 1;
        if (dC !== 0 && rc.band === 'slight' && Math.abs(dC) < 0.8) chroma.slightUnder08 += 1;
        expect(row(r.metrics, 'chroma').reading).toBe(
          dC === 0 ? en[CHROMA_KEYS.level] : en[CHROMA_KEYS[dC > 0 ? 'more' : 'less'][rc.band]],
        );
        const rh = axisReading(at(m.lch.h.delta, 1), m.terms.termH);
        const hue = row(r.metrics, 'hue').reading ?? '';
        expect(hue.startsWith(en[HUE_KEYS[rh.band]])).toBe(true);
        const term = hueTerm(b, 'en');
        const owed = rh.band !== 'veryClose' && term !== null && !inArc(term, a);
        expect(hue.includes(` ${en['compare.towards']} `)).toBe(owed);
        if (owed) {
          withTowards += 1;
          // The term named is B's, and B lies in it.
          expect(hue.endsWith(` ${term.term}`)).toBe(true);
          expect(matchesRegion(term.constrains, b.derived.oklch)).toBe(true);
        } else withoutTowards += 1;
        const ratio = flooredRatio(m.contrast.wcagRatio);
        const want = THRESHOLDS.find((x) => ratio >= x.at)?.key ?? UNDER_THRESHOLD_KEY;
        expect(thresholdKey(ratio)).toBe(want);
        expect(row(r.access, 'wcag').reading).toBe(
          `• ${en[want]} / ${en[HARMONY_KEYS[m.temperature.direction]]}`,
        );
        if (Math.max(rank[rl.band], rank[rc.band], rank[rh.band]) > rank[total])
          componentAboveTotal += 1;
      }
      // DECOYS the data allows: a printed zero over a non-zero difference exists (16 pairs), and pairs
      // with and without *towards* both exist.
      expect(level).toBeGreaterThan(0);
      expect(withTowards).toBeGreaterThan(0);
      expect(withoutTowards).toBeGreaterThan(0);
      // ADR-0125's accepted case — a component band above the total's — needs a total under
      // perceptible, and every corpus pair prints a perceptible ΔE00 (F-249's census). Asserted absent
      // here so a corpus that adds one is noticed, not "corrected".
      expect(componentAboveTotal).toBe(0);
      /*
       * PINNED, so a lexicon or corpus change is seen here (review, M7; E-044's third reader): the pairs
       * whose hue reading names B's hue. Removing a term, or moving an arc, moves this number.
       */
      expect(withTowards).toBe(7_146);
      /*
       * ADR-0125'S LIMIT, ACCEPTED AND PINNED (review, S3; ADR-0155 D2): a chroma word is the band of
       * the weighted term ΔC′/S_C, where a′ is scaled by up to 1.5 near neutral, and the figure beside
       * it is ΔC*ab. So a word can be stronger than the figure — "+0.9 Noticeably Richer". The counts
       * are the corpus's; a change to either quantity moves them.
       */
      expect(chroma).toStrictEqual({ strongUnder18: 244, strongUnder10: 126, slightUnder08: 114 });
    },
    CORPUS_WIDE,
  );

  it(
    'in Japanese, the hue reading puts B’s term before 寄り, and only where the rule allows, over every pair',
    () => {
      let named = 0;
      for (const [a, b] of PAIRS) {
        const r = pairReadout(a, b, tJa, 'ja', 'japanese');
        const m = compare(a, b);
        const rh = axisReading(at(m.lch.h.delta, 1), m.terms.termH);
        const phrase = ja[HUE_KEYS[rh.band]];
        const term = towards(a, b, rh.band, 'ja');
        const want = term === null ? phrase : `${phrase}・${term}${ja['compare.towards']}`;
        expect(row(r.metrics, 'hue').reading).toBe(want);
        if (term !== null) {
          named += 1;
          expect(hueTerm(b, 'ja')?.term).toBe(term);
          expect(inArc(hueTerm(b, 'ja')!, a)).toBe(false);
        }
      }
      // Pinned, as the English count is: the Japanese lexicon names five hues to the English nine.
      expect(named).toBe(5_133);
    },
    CORPUS_WIDE,
  );

  it('DECOY — B in brown with A light but already at brown’s angle, or A a grey at blue’s angle: no towards (S2)', () => {
    const pair = (x: string, y: string) => [entryBySlug(x)!, entryBySlug(y)!] as const;
    const [a, b] = pair('aka-tsuchi', 'do-ma');
    expect(hueTerm(b, 'en')?.term).toBe('brown');
    // A lies outside brown only by lightness: the region says "not brown", the arc says "already there".
    expect(matchesRegion(hueTerm(b, 'en')!.constrains, a.derived.oklch)).toBe(false);
    expect(towards(a, b, 'perceptible', 'en')).toBeNull();
    const [grey, blue] = pair('ame-ishi', 'asa-kawa');
    expect(hueTerm(blue, 'en')?.term).toBe('blue');
    expect(hueTerm(grey, 'en')).toBeNull();
    expect(towards(grey, blue, 'slight', 'en')).toBeNull();
  });

  it(
    'names B’s hue in the locale’s own language, and only where A is not already in it',
    () => {
      for (const [a, b] of PAIRS.slice(0, 2000)) {
        const band = axisReading(at(compare(a, b).lch.h.delta, 1), compare(a, b).terms.termH).band;
        const term = towards(a, b, band, 'ja');
        if (term !== null) {
          expect(ja['compare.towards']).not.toBe('');
          expect(hueTerm(b, 'ja')?.term).toBe(term);
          expect(/^[぀-ヿ一-鿿]+$/u.test(term)).toBe(true);
        }
      }
      // DECOY: a pair inside one term gets no towards, in either language.
      const blues = ENTRIES.filter((e) => hueTerm(e, 'en')?.term === 'blue');
      const [x, y] = blues;
      if (x === undefined || y === undefined) throw new Error('two blues');
      expect(towards(x, y, 'perceptible', 'en')).toBeNull();
      expect(towards(x, y, 'perceptible', 'ja')).toBeNull();
      // And a very close hue never moves anywhere.
      const other = ENTRIES.find((e) => hueTerm(e, 'en')?.term === 'green');
      if (other === undefined) throw new Error('a green');
      expect(towards(x, other, 'veryClose', 'en')).toBeNull();
      expect(towards(x, other, 'slight', 'en')).toBe('green');
    },
    CORPUS_WIDE,
  );

  it('picks the term that constrains the most axes: a dark orange is brown', () => {
    const brown = ENTRIES.find((e) => {
      const [l, c, h] = e.derived.oklch;
      return l < 0.55 && c >= 0.039 && h >= 45 && h < 75;
    });
    if (brown === undefined) throw new Error('a dark orange');
    expect(hueTerm(brown, 'en')?.term).toBe('brown');
  });
});

describe('4. swapping A and B', () => {
  it(
    'keeps every magnitude and relation, and turns every direction',
    () => {
      for (const [a, b] of PAIRS) {
        if (a.entry.slug > b.entry.slug) continue;
        const ab = pairReadout(a, b, tEn, 'en', 'latin');
        const ba = pairReadout(b, a, tEn, 'en', 'latin');
        for (const k of ['delta-e00', 'delta-eok'])
          expect(printedOf(row(ba.metrics, k))).toBe(printedOf(row(ab.metrics, k)));
        for (const k of ['wcag', 'protan', 'deutan', 'tritan'])
          expect([k, printedOf(row(ba.access, k))]).toStrictEqual([
            k,
            printedOf(row(ab.access, k)),
          ]);
        expect(row(ba.access, 'wcag').note).toBe(row(ab.access, 'wcag').note);
        expect(row(ba.access, 'wcag').reading).toBe(row(ab.access, 'wcag').reading);
        for (const k of ['lightness', 'chroma']) {
          const one = printedOf(row(ab.metrics, k));
          const two = printedOf(row(ba.metrics, k));
          const flip = one.startsWith('+')
            ? `${MINUS}${one.slice(1)}`
            : one.startsWith(MINUS)
              ? `+${one.slice(1)}`
              : one;
          expect([k, two]).toStrictEqual([k, flip]);
        }
        const hue = printedOf(row(ab.metrics, 'hue'));
        if (!hue.endsWith('180.0°')) {
          const flip = hue.startsWith('+')
            ? `${MINUS}${hue.slice(1)}`
            : hue.startsWith(MINUS)
              ? `+${hue.slice(1)}`
              : hue;
          expect(printedOf(row(ba.metrics, 'hue'))).toBe(flip);
        }
      }
    },
    CORPUS_WIDE,
  );
});

describe('5. nothing the readout prints claims what the engine does not compute', () => {
  const READ: readonly MessageKey[] = [
    ...Object.values(BAND_KEYS),
    ...Object.values(HUE_KEYS),
    LIGHTNESS_KEYS.level,
    ...Object.values(LIGHTNESS_KEYS.more),
    ...Object.values(LIGHTNESS_KEYS.less),
    CHROMA_KEYS.level,
    ...Object.values(CHROMA_KEYS.more),
    ...Object.values(CHROMA_KEYS.less),
    ...THRESHOLDS.map((x) => x.key),
    UNDER_THRESHOLD_KEY,
    ...Object.values(HARMONY_KEYS),
    ...Object.values(DEFICIENCY_LABEL_KEYS),
    ...Object.values(MODEL_KEYS),
    'compare.towards',
    'compare.lightness',
    'compare.chroma',
    'compare.hue',
    'compare.wcag',
    'cvd.separation',
    'compare.hueAngle',
    'compare.ratio',
    'compare.apcaLc',
    'compare.apcaSmaller',
    'space.cielab',
    // The page's own words (review, M15).
    'compare.title',
    'compare.metrics',
    'compare.access',
    'compare.changeA',
    'compare.changeB',
    'compare.export',
    'compare.exportPdf',
    'compare.addToStudio',
    'compare.pickA',
    'compare.pickB',
    'compare.choose',
    'compare.noMatch',
  ];
  const BANNED =
    /\b(safe|harmonious|match|optimal|passed|verified|identical)\b|\bB is\b|一致|安全/iu;

  it('holds for every catalogue value it reads, in both languages', () => {
    for (const key of READ)
      for (const [locale, catalogue] of [
        ['en', en],
        ['ja', ja],
      ] as const)
        expect([locale, key, BANNED.test(catalogue[key])]).toStrictEqual([locale, key, false]);
  });

  it('DECOY — a planted verdict is found', () => {
    // claims-ok: a planted verdict, the construction this decoy proves the scan finds
    expect(BANNED.test('92% Separation (Safe)')).toBe(true); // claims-ok: the decoy's planted verdict
    expect(BANNED.test('B is lighter')).toBe(true);
    // Case does not hide one (M15).
    expect(BANNED.test('OPTIMAL')).toBe(true);
  });
});

describe('the samples’ size (ADR-0154 D2)', () => {
  it('is the half less its insets, and never under the judgeable floor on a supported width', () => {
    // The card reserves its 2 dp state edge inside its box (SELECTION_EDGE; review, S1).
    expect(pairSampleSize(384)).toBe(157.5);
    expect(pairSampleSize(320)).toBe(125.5);
    for (const width of [320, 360, 384, 430])
      expect(pairSampleSize(width)).toBeGreaterThanOrEqual(77);
  });
});
