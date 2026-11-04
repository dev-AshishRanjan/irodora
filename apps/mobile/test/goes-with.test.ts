/**
 * What goes with a colour (`19`, F-252, ADR-0168 to ADR-0170) — held over EVERY anchor the corpus
 * allows (F-248's lesson: a fixture that shares a defect cannot find it).
 *
 * 1. Every geometric row's relationship holds, by a hand-written table of angles.
 * 2. Each companion takes the nearest eligible colour in its window, by an oracle that does not use the
 *    index `nearestByOklch` reads.
 * 3. Each colour once, in ADR-0168's order; the census's counts at ±9° and ±15°.
 * 4. An anchor under the lexicon's floor has no geometric row; every other one has.
 * 5. The figure is floored to one place and never exceeds the computed one.
 * 6. The gamut note is the record's own, and only the record outside sRGB has one.
 * 7. The words are total, claim nothing, and join as each script joins.
 * 8. The filter never empties the list.
 */

import { deltaE00 } from '@irodora/color-difference';
import { generateHarmony, hueDistance } from '@irodora/color-harmony';
import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import { compare } from '../src/compare';
import { allEntries, combinationsContaining, type PublishedEntry } from '../src/corpus';
import { renderNote } from '../src/detail';
import { lexicon, nearestByLab } from '../src/finder';
import {
  anchorName,
  anchorSlotLine,
  buildHref,
  distanceFigure,
  EMPTY_KEYS,
  FILTER_KEYS,
  filterOptions,
  filterRows,
  goesWith,
  goesWithAt,
  HUE_ONLY_KINDS,
  HUE_RELATIONSHIPS,
  HUE_TOLERANCE,
  hueFloor,
  INTENT_KEYS,
  RELATIONSHIP_KEYS,
  relationshipWords,
  wearHref,
  wearName,
  type GeometricRow,
  type GoesWithRow,
  type HueRelationship,
} from '../src/goes-with';
import { en, ja, type MessageKey } from '../src/i18n';

jest.setTimeout(120_000);

const ANCHORS = allEntries();
const tEn = (key: MessageKey): string => en[key];
const tJa = (key: MessageKey): string => ja[key];
const slugOf = (e: PublishedEntry): string => e.entry.slug;

/** ADR-0168's angles, written out here rather than read from the generator. */
const ANGLES: Readonly<Record<HueRelationship, readonly number[]>> = {
  complementary: [180],
  analogous: [330, 30],
  split: [150, 210],
  triadic: [120, 240],
  tetradic: [90, 270],
};
const ORDER = HUE_RELATIONSHIPS.flatMap((kind) => ANGLES[kind].map((angle) => ({ kind, angle })));
const angleFrom = (a: number, b: number): number => (((b - a) % 360) + 360) % 360;
const apart = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const geometric = (rows: readonly GoesWithRow[]): GeometricRow[] =>
  rows.filter((r): r is GeometricRow => r.source === 'geometric');
const histogram = (counts: readonly number[]): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const n of counts) out[n] = (out[n] ?? 0) + 1;
  return out;
};

describe('the rule (ADR-0168)', () => {
  it('orders a permutation of the kinds the engine defines by hue alone, less warm–cool', () => {
    expect([...HUE_RELATIONSHIPS].sort()).toStrictEqual([...HUE_ONLY_KINDS].sort());
    expect(HUE_ONLY_KINDS).not.toContain('warm-cool');
    expect(HUE_TOLERANCE).toBe(9);
  });

  it('reads the floor from the published lexicon: 0.039 for 2026.08.1', () => {
    expect(hueFloor()).toBe(0.039);
    const hueTerms = lexicon().terms.filter((t) => t.constrains.hue !== undefined);
    expect(hueTerms.length).toBeGreaterThan(0);
    for (const term of hueTerms) expect(term.constrains.chroma?.min).toBe(hueFloor());
  });

  it('1 — every geometric row stands in its relationship, within ±9° (a table written here)', () => {
    const floor = hueFloor();
    for (const anchor of ANCHORS)
      for (const row of geometric(goesWith(anchor).rows)) {
        const angle = angleFrom(anchor.derived.oklch[2], row.entry.derived.oklch[2]);
        expect(ANGLES[row.kind]).toContain(row.angle);
        expect(apart(angle, row.angle)).toBeLessThanOrEqual(9);
        expect(anchor.derived.oklch[1]).toBeGreaterThanOrEqual(floor);
        expect(row.entry.derived.oklch[1]).toBeGreaterThanOrEqual(floor);
      }
    // DECOY: 189.5° is not complementary by the table.
    expect(apart(189.5, ANGLES.complementary[0] ?? NaN)).toBeGreaterThan(9);
  });

  it('2 — each companion takes the nearest eligible colour in its window (an oracle off the index)', () => {
    const floor = hueFloor();
    let realised = 0;
    let empty = 0;
    for (const anchor of ANCHORS) {
      const { rows, chromatic } = goesWith(anchor);
      if (!chromatic) continue;
      const source = anchor.derived.oklch;
      const taken = new Set<string>([slugOf(anchor)]);
      for (const row of rows) if (row.source === 'curated') taken.add(slugOf(row.entry));
      for (const { kind, angle } of ORDER) {
        const companion = generateHarmony(source, kind).colors.find(
          (c) => apart(angleFrom(source[2], c.requested[2]), angle) < 1e-6,
        );
        if (companion === undefined) throw new Error(`${kind} ${String(angle)}: no companion`);
        const lab = xyzToLab(oklchToXyz(companion.requested));
        const eligible = ANCHORS.filter(
          (e) =>
            !taken.has(slugOf(e)) &&
            e.derived.oklch[1] >= floor &&
            hueDistance(e.derived.oklch[2], companion.requested[2]) <= 9,
        )
          .map((e) => ({ e, d: deltaE00(lab, e.derived.lab) }))
          .sort((a, b) => a.d - b.d || (slugOf(a.e) < slugOf(b.e) ? -1 : 1));
        const row = geometric(rows).find((r) => r.angle === angle);
        if (eligible.length === 0) {
          expect(row).toBeUndefined();
          empty += 1;
          continue;
        }
        expect(row).toBeDefined();
        expect(row?.kind).toBe(kind);
        expect(slugOf(row!.entry)).toBe(slugOf(eligible[0]!.e));
        // No tie at the pick, so the index's own tie order never decides a row (ADR-0168).
        if (eligible[1] !== undefined) expect(eligible[1].d - eligible[0]!.d).toBeGreaterThan(1e-9);
        taken.add(slugOf(row!.entry));
        realised += 1;
      }
    }
    // Both branches ran: windows realised, and windows the corpus leaves empty.
    expect(realised).toBeGreaterThan(0);
    expect(empty).toBeGreaterThan(0);
  });

  it('3 — each colour once, curated first, then the relationships in their order', () => {
    for (const anchor of ANCHORS) {
      const { rows } = goesWith(anchor);
      const slugs = rows.map((r) => slugOf(r.entry));
      expect(slugs).not.toContain(slugOf(anchor));
      expect(new Set(slugs).size).toBe(slugs.length);
      const firstGeometric = rows.findIndex((r) => r.source === 'geometric');
      if (firstGeometric >= 0)
        expect(rows.slice(firstGeometric).every((r) => r.source === 'geometric')).toBe(true);
      // The curated rows: each combination by slug, each member by rank, the anchor left out.
      const expected = [...combinationsContaining(slugOf(anchor))]
        .sort((a, b) => (a.combination.slug < b.combination.slug ? -1 : 1))
        .flatMap(({ combination }) =>
          [...combination.colors]
            .filter((m) => m.slug !== slugOf(anchor))
            .sort((a, b) => a.rank - b.rank)
            .map((m) => m.slug),
        )
        .filter((s, i, all) => all.indexOf(s) === i);
      expect(rows.filter((r) => r.source === 'curated').map((r) => slugOf(r.entry))).toStrictEqual(
        expected,
      );
      const order = geometric(rows).map((r) => ORDER.findIndex((o) => o.angle === r.angle));
      expect(order).toStrictEqual([...order].sort((a, b) => a - b));
      // Tetradic's 180° is complementary's, realised once.
      expect(geometric(rows).filter((r) => r.angle === 180)).not.toHaveLength(2);
    }
  });

  it('3 — the census: rows per anchor at ±9°, and at ±15° (the tolerance is live)', () => {
    const at9 = histogram(ANCHORS.map((a) => geometric(goesWith(a).rows).length));
    expect(at9).toStrictEqual({ 0: 45, 5: 3, 6: 30, 7: 42 });
    const at15 = histogram(ANCHORS.map((a) => geometric(goesWithAt(a, 15).rows).length));
    expect(at15).toStrictEqual({ 0: 45, 6: 16, 7: 46, 8: 13 });
    // DECOY: the two tolerances give different rows.
    expect(at15).not.toStrictEqual(at9);
    expect(ANCHORS.filter((a) => combinationsContaining(slugOf(a)).length > 0)).toHaveLength(11);
  });

  it('3 — the fixture and capture anchor opens as 19 draws: complementary, analogous ×2, split ×2', () => {
    const anchor = ANCHORS.find((a) => slugOf(a) === 'aki-batake')!;
    const rows = goesWith(anchor).rows;
    expect(rows.map((r) => (r.source === 'geometric' ? r.kind : r.source))).toStrictEqual([
      'complementary',
      'analogous',
      'analogous',
      'split',
      'split',
      'triadic',
      'tetradic',
    ]);
    expect(rows.map((r) => slugOf(r.entry))).toStrictEqual([
      'fuyu-umi',
      'tsuchi-gawara',
      'ko-more-bi',
      'oki-nagi',
      'fuyu-kage',
      'sabi-do',
      'ja-mon',
    ]);
  });

  it('4 — an anchor under the floor has no geometric row; every other one has', () => {
    const floor = hueFloor();
    const grey = ANCHORS.filter((a) => a.derived.oklch[1] < floor);
    expect(grey).toHaveLength(45);
    for (const anchor of ANCHORS) {
      const { rows, chromatic } = goesWith(anchor);
      expect(chromatic).toBe(anchor.derived.oklch[1] >= floor);
      if (chromatic) expect(geometric(rows).length).toBeGreaterThan(0);
      else expect(geometric(rows)).toHaveLength(0);
    }
    // DECOY: the least chromatic anchor at or above the floor has rows.
    const edge = [...ANCHORS]
      .filter((a) => a.derived.oklch[1] >= floor)
      .sort((a, b) => a.derived.oklch[1] - b.derived.oklch[1])[0]!;
    expect(geometric(goesWith(edge).rows).length).toBeGreaterThan(0);
  });
});

describe('the figure and the note (ADR-0169, ADR-0170)', () => {
  it('5 — ΔE00 is floored to one place, never above the computed one, by two paths', () => {
    for (const anchor of ANCHORS) {
      const ranked = new Map(
        nearestByLab(anchor.derived.lab, ANCHORS.length).map((n) => [slugOf(n.entry), n.deltaE00]),
      );
      for (const row of goesWith(anchor).rows) {
        const exact = compare(anchor, row.entry).deltaE00;
        expect(row.deltaE00).toBe(exact);
        expect(Math.abs((ranked.get(slugOf(row.entry)) ?? NaN) - exact)).toBeLessThan(1e-9);
        const printed = distanceFigure(row);
        expect(printed).toBeLessThanOrEqual(exact + 1e-9);
        expect(exact - printed).toBeLessThan(0.1);
        expect(Number(printed.toFixed(1))).toBe(printed);
      }
    }
    // DECOY: 48.29 prints 48.2, never the rounded 48.3.
    const planted = { ...goesWith(ANCHORS[0]!).rows[0]!, deltaE00: 48.29 } as GoesWithRow;
    expect(distanceFigure(planted)).toBe(48.2);
  });

  it('6 — only the record outside sRGB carries a note, with its own cost', () => {
    const outside = ANCHORS.filter((a) => !a.derived.inSrgbGamut);
    expect(outside.map(slugOf)).toStrictEqual(['fuka-mizu']);
    for (const entry of ANCHORS) {
      const note = renderNote(entry, tEn);
      if (entry.derived.inSrgbGamut) expect(note).toBeNull();
      else
        expect(note).toBe(
          `nearest sRGB rendering, ΔE00 ${entry.derived.renderDeltaE00.toFixed(2)}`,
        );
    }
    const holding = ANCHORS.filter((a) =>
      goesWith(a).rows.some((r) => !r.entry.derived.inSrgbGamut),
    );
    expect(holding).toHaveLength(12);
    // DECOY: an in-gamut row has none.
    expect(
      renderNote(goesWith(holding[0]!).rows.find((r) => r.entry.derived.inSrgbGamut)!.entry, tEn),
    ).toBeNull();
  });
});

describe('the words (ADR-0170)', () => {
  it('7 — every relationship has its words in both catalogues', () => {
    expect(Object.keys(RELATIONSHIP_KEYS).sort()).toStrictEqual([...HUE_RELATIONSHIPS].sort());
    expect(HUE_RELATIONSHIPS.map((k) => en[RELATIONSHIP_KEYS[k]])).toStrictEqual([
      'Complementary',
      'Analogous',
      'Split-Complementary',
      'Triadic',
      'Tetradic',
    ]);
    expect(HUE_RELATIONSHIPS.map((k) => ja[RELATIONSHIP_KEYS[k]])).toStrictEqual([
      '補色',
      '類似色',
      '分割補色',
      'トライアド',
      'テトラード',
    ]);
  });

  it('7 — a curated row says Curated and its intent, joined as each script joins', () => {
    const curatedAnchor = ANCHORS.find((a) =>
      goesWith(a).rows.some((r) => r.source === 'curated'),
    )!;
    const row = goesWith(curatedAnchor).rows.find((r) => r.source === 'curated')!;
    expect(relationshipWords(row, tEn, 'latin')).toBe(`Curated ${en[INTENT_KEYS[row.intent]]}`);
    expect(relationshipWords(row, tJa, 'japanese')).toBe(`選定・${ja[INTENT_KEYS[row.intent]]}`);
  });

  it('7 — the anchor’s name and slot line', () => {
    const anchor = ANCHORS.find((a) => slugOf(a) === 'aki-batake')!;
    expect(anchorName(anchor)).toBe(
      `${anchor.entry.name.kanji} Aki-batake (${anchor.entry.name.en})`,
    );
    expect(anchorSlotLine(tEn, 'latin')).toBe('Anchor Garment: Top');
    expect(anchorSlotLine(tJa, 'japanese')).toBe('基準の衣服：トップス');
  });

  it('7 — no with.* word claims what the engine does not compute', () => {
    const BANNED = /\b(match|safe|exact|perfect|should)\b|一致|伝統|べき/iu;
    for (const catalogue of [en, ja] as const) {
      const keys = (Object.keys(catalogue) as MessageKey[]).filter((k) => k.startsWith('with.'));
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((k) => BANNED.test(catalogue[k]))).toStrictEqual([]);
    }
    // DECOY: a planted word is found.
    expect(BANNED.test('Exact companion')).toBe(true);
  });

  it('the empty states and the filter read keys each catalogue holds', () => {
    for (const key of [...Object.values(EMPTY_KEYS), ...Object.values(FILTER_KEYS)]) {
      expect(en[key]).toBeTruthy();
      expect(ja[key]).toBeTruthy();
    }
  });
});

describe('the filter and the hand-offs (ADR-0171)', () => {
  it('8 — All, then each relationship the list holds, in order; no choice empties the list', () => {
    for (const anchor of ANCHORS) {
      const { rows } = goesWith(anchor);
      const options = filterOptions(rows);
      expect(options[0]).toBe('all');
      expect(filterRows(rows, 'all')).toBe(rows);
      for (const choice of options.slice(1)) {
        const shown = filterRows(rows, choice);
        // Narrows, never empties.
        expect(shown.length).toBeGreaterThan(0);
        expect(shown.length).toBeLessThan(rows.length);
        expect(shown.every((r) => (r.source === 'curated' ? 'curated' : r.kind) === choice)).toBe(
          true,
        );
      }
      const kinds = rows.map((r) => (r.source === 'curated' ? 'curated' : r.kind));
      const distinct = kinds.filter((k, i) => kinds.indexOf(k) === i);
      expect(options.slice(1)).toStrictEqual(distinct.length > 1 ? distinct : []);
    }
  });

  it('8 — a list of one kind offers All alone: no choice that would not narrow it (review, L4)', () => {
    const analogous = goesWith(ANCHORS.find((a) => slugOf(a) === 'aki-batake')!).rows.filter(
      (r) => r.source === 'geometric' && r.kind === 'analogous',
    );
    expect(analogous.length).toBeGreaterThan(1);
    expect(filterOptions(analogous)).toStrictEqual(['all']);
    expect(filterOptions([])).toStrictEqual(['all']);
    // DECOY: two kinds offer both.
    const two = goesWith(ANCHORS.find((a) => slugOf(a) === 'aki-batake')!).rows.slice(0, 2);
    expect(filterOptions(two)).toStrictEqual(['all', 'complementary', 'analogous']);
  });

  it('Wear’s name, in each language, as ADR-0170 words it (review, L3)', () => {
    const anchor = ANCHORS.find((a) => slugOf(a) === 'aki-batake')!;
    const row = goesWith(anchor).rows[0]!.entry;
    expect(wearName(row, anchor, tEn, 'latin')).toBe(
      `Wear ${row.entry.name.en} with ${anchor.entry.name.en}`,
    );
    expect(wearName(row, anchor, tJa, 'japanese')).toBe(
      `${row.entry.name.kanji}を${anchor.entry.name.kanji}と合わせて着る`,
    );
    // Each name holds the word drawn on the control (WCAG 2.5.3).
    expect(wearName(row, anchor, tEn, 'latin')).toContain(en['with.wear']);
    expect(wearName(row, anchor, tJa, 'japanese')).toContain(ja['with.wear']);
  });

  it('Wear carries the anchor first and the row as `with`; Build the anchor alone', () => {
    expect(wearHref('aki-batake', 'fuyu-umi')).toBe('/atlas/wear/aki-batake?with=fuyu-umi');
    expect(buildHref('aki-batake')).toBe('/atlas/wear/aki-batake');
    // DECOY: the slugs are not interchangeable.
    expect(wearHref('fuyu-umi', 'aki-batake')).not.toBe(wearHref('aki-batake', 'fuyu-umi'));
  });
});
