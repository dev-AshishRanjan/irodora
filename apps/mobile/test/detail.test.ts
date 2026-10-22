/**
 * What the colour page says (F-247; ADR-0146, ADR-0147, ADR-0148).
 *
 * - **The readout** is the record's own derivation and the engine's P3 of the record's XYZ — held to
 *   the engine's own conversion (the oracle) over all 120, every value naming its space, and the one
 *   entry outside sRGB saying its hex is the nearest rendering.
 * - **The pill** states an absent era or season in words, and prints an era a record holds (decoy).
 * - **The provenance card** leads with the classification, says the source, its type and licence, and
 *   the check the record holds — never *Verified* — with a planted *traditional* entry as the decoy.
 * - **The combinations** are the builder's own ranking, read back through `rankForSlot` (the oracle),
 *   at most three, and nothing for a wardrobe with nothing to pair.
 * - **A colour exported** carries the bundle's numbers and the same envelope as a palette.
 */

import { xyzToDisplayP3 } from '@irodora/color-spaces';
import type { PublishedEntry } from '@irodora/corpus';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import { figureText, valueText, type ReadoutValue } from '@irodora/ui';
import {
  combinationCaption,
  combinationName,
  nameLine,
  provenanceBody,
  provenanceLead,
  readoutRows,
  reviewLine,
  reviewRecorded,
  taxonomyLine,
  wearableCombinations,
} from '../src/detail';
import { displayP3Of } from '../src/engine';
import { allEntries, colorFor, groupOf } from '../src/corpus';
import { colourSubject, paletteSubject } from '../src/export/subject';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { t as message, type MessageKey } from '../src/i18n';
import { rankForSlot } from '../src/outfit/builder';
import { rankingContext } from '../src/wardrobe/coverage';
import { NO_EVIDENCE_PROFILE } from '../src/wear';

const ENTRIES = allEntries();
const t = (key: MessageKey): string => message('en', key);
const tJa = (key: MessageKey): string => message('ja', key);
const rows = (e: PublishedEntry) => readoutRows(e, t, displayP3Of(e.entry.color.xyz));
const row = (e: PublishedEntry, key: string) => {
  const found = rows(e).find((r) => r.key === key);
  if (found === undefined) throw new Error(`no ${key} row`);
  return found;
};
const figures = (v: ReadoutValue) => {
  if (v.kind !== 'figures') throw new Error('not figures');
  return v.parts.map((p) => p.figure);
};

describe('the readout is the record’s derivation, and P3 the engine’s conversion of its XYZ', () => {
  it('prints the hex, OKLCh, CIELAB and sRGB of every entry from its own derivation', () => {
    for (const e of ENTRIES) {
      const { derived } = e;
      const hex = row(e, 'hex').value;
      expect(hex.kind === 'code' && hex.text.startsWith(derived.hex)).toBe(true);
      expect(figures(row(e, 'oklch').value).map(figureText)).toStrictEqual([
        derived.oklch[0].toFixed(3),
        derived.oklch[1].toFixed(3),
        `${derived.oklch[2].toFixed(1)}°`,
      ]);
      expect(
        figures(row(e, 'cielab').value).map((f) => f.kind === 'measure' && f.value),
      ).toStrictEqual([derived.lab[0], derived.lab[1], derived.lab[2]]);
      const bytes = [1, 3, 5].map((i) => parseInt(derived.hex.slice(i, i + 2), 16));
      expect(figures(row(e, 'srgb').value).map(figureText)).toStrictEqual(bytes.map(String));
    }
  });

  it('prints Display P3 as the engine converts the record’s own XYZ (the oracle), over all 120', () => {
    for (const e of ENTRIES) {
      const also = row(e, 'srgb').also;
      expect(also).toBeDefined();
      const p3 = xyzToDisplayP3(e.entry.color.xyz);
      expect(figures(also!.value).map(figureText)).toStrictEqual(p3.map((c) => c.toFixed(3)));
    }
    // DECOY: 06's own "P3" is its sRGB bytes ÷ 255, which is not the conversion.
    const e = ENTRIES[0]!;
    const naive = [1, 3, 5].map((i) =>
      (parseInt(e.derived.hex.slice(i, i + 2), 16) / 255).toFixed(3),
    );
    expect(figures(row(e, 'srgb').also!.value).map(figureText)).not.toStrictEqual(naive);
  });

  it('names the space of every value (FR-61)', () => {
    for (const r of rows(ENTRIES[0]!)) {
      if (r.value.kind === 'figures')
        for (const f of figures(r.value)) expect(f.kind === 'measure' && f.space !== '').toBe(true);
      else expect(r.value.spoken).toMatch(/^hex /u);
    }
  });

  it('says the one entry outside sRGB is shown at its nearest rendering, and by how much', () => {
    const outside = ENTRIES.filter((e) => !e.derived.inSrgbGamut);
    expect(outside).toHaveLength(1);
    const text = valueText(row(outside[0]!, 'hex').value);
    expect(text).toContain(t('detail.nearestSrgb'));
    expect(text).toContain(outside[0]!.derived.renderDeltaE00.toFixed(2));
    // DECOY: an entry inside sRGB says nothing of the kind.
    expect(
      valueText(
        row(
          ENTRIES.find((e) => e.derived.inSrgbGamut)!,
          'hex',
        ).value,
      ),
    ).not.toContain(t('detail.nearestSrgb'));
  });
});

describe('the pill states an absent era or season in words (ADR-0146 D2)', () => {
  const withSeason = ENTRIES.find((e) => e.entry.taxonomy.season !== null)!;
  const without = ENTRIES.find((e) => e.entry.taxonomy.season === null)!;

  it('names the family group, Era: None, and the season or Not assigned', () => {
    const group = groupOf(withSeason.entry.taxonomy.family);
    const line = taxonomyLine(withSeason, t, 'latin');
    expect(line).toContain(`Family: ${group.romaji} (${group.en})`);
    expect(line).toContain('Era: None');
    expect(line).toContain(
      `Season: ${t(`season.${withSeason.entry.taxonomy.season![0]!}` as MessageKey)}`,
    );
    expect(taxonomyLine(without, t, 'latin')).toContain('Season: Not assigned');
    // DECOY: an absent season is never "None", which would read as "suits no season".
    expect(taxonomyLine(without, t, 'latin')).not.toContain('Season: None');
  });

  it('in Japanese, the group’s kanji and the full-width colon', () => {
    const group = groupOf(withSeason.entry.taxonomy.family);
    expect(taxonomyLine(withSeason, tJa, 'japanese')).toContain(`系統：${group.kanji}`);
    expect(taxonomyLine(without, tJa, 'japanese')).toContain('時代：なし');
  });

  it('DECOY — an era a record holds is printed, so None is the record’s, not a constant', () => {
    const planted = {
      ...withSeason,
      entry: { ...withSeason.entry, taxonomy: { ...withSeason.entry.taxonomy, era: 'edo' } },
    } as PublishedEntry;
    expect(taxonomyLine(planted, t, 'latin')).toContain('Era: edo');
  });
});

describe('the provenance card says the record’s classification, source and check (ADR-0146 D3)', () => {
  const e = ENTRIES[0]!;

  it('leads with the classification, and the body names source, type and licence (FR-23, FR-24)', () => {
    expect(provenanceLead(e, t)).toBe(t('classification.japanese-inspired'));
    const body = provenanceBody(e, t);
    for (const part of [
      e.entry.provenance.source,
      t('sourceType.editorial'),
      e.entry.provenance.sourceLicence,
    ])
      expect(body).toContain(part);
    // DECOY: a planted traditional entry leads as Traditional, so the binding is live.
    const planted = {
      ...e,
      entry: { ...e.entry, classification: 'traditional' },
    } as PublishedEntry;
    expect(provenanceLead(planted, t)).toBe('Traditional');
  });

  it('says the check the record holds, and draws the seal only where one is recorded (F-084)', () => {
    expect(reviewLine(e, t)).toBe(`${t('independence.self')}, ${e.entry.provenance.verifiedAt!}`);
    expect(reviewRecorded(e)).toBe(true);
    // DECOY: no independence recorded, no seal, and the line says so.
    const unrecorded = {
      ...e,
      entry: { ...e.entry, provenance: { ...e.entry.provenance, reviewIndependence: null } },
    } as PublishedEntry;
    expect(reviewRecorded(unrecorded)).toBe(false);
    expect(reviewLine(unrecorded, t)).toContain(t('detail.notRecorded'));
  });

  it('prints no word of 06’s or 26’s sample claims in the words this page adds', () => {
    const keys: MessageKey[] = [
      'detail.era',
      'detail.eraNone',
      'detail.seasonNone',
      'detail.nearestSrgb',
    ];
    const claims = /伝統|Traditional|Heritage|Historical|Verified|承認済み/u;
    for (const key of keys)
      for (const value of [en[key], ja[key]]) expect(value).not.toMatch(claims);
    // DECOY: the same check finds a planted 伝統.
    expect('伝統色の詳細').toMatch(claims);
  });

  it('names the colour as 06 does: Romaji • English', () => {
    expect(nameLine(e)).toBe(
      `${e.entry.name.romaji.charAt(0).toUpperCase()}${e.entry.name.romaji.slice(1)} • ${e.entry.name.en}`,
    );
  });
});

/* ------------------------------------------------------------------ the combinations */

function rowOf(e: PublishedEntry): SavedColorRow {
  return {
    id: `colour-${e.entry.slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: e.entry.name.en,
    xyz_x: e.entry.color.xyz[0],
    xyz_y: e.entry.color.xyz[1],
    xyz_z: e.entry.color.xyz[2],
    lab_l: e.derived.lab[0],
    lab_a: e.derived.lab[1],
    lab_b: e.derived.lab[2],
    oklch_l: e.derived.oklch[0],
    oklch_c: e.derived.oklch[1],
    oklch_h: e.derived.oklch[2],
    hex: e.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: e.entry.slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}
const garment = (
  id: string,
  type: string,
  e: PublishedEntry,
  name: string | null = null,
): StoredGarment => ({
  id,
  type,
  color: rowOf(e),
  name,
  pattern: null,
  material: null,
  formality: null,
  brand: null,
  size: null,
  purchaseDate: null,
  costMinor: null,
  currency: null,
  wearCount: 0,
  seasons: [],
  colors: [],
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
});

describe('Wearable Combinations are the builder’s ranking with this colour as a top (ADR-0148)', () => {
  const colour = ENTRIES[10]!;
  const wardrobe = [
    garment('g1', 'trousers', ENTRIES[1]!, 'Ecru Trousers'),
    garment('g2', 'shoes', ENTRIES[2]!),
    garment('g3', 'jeans', ENTRIES[3]!),
    garment('g4', 'boots', ENTRIES[4]!),
    garment('g5', 'shirt', ENTRIES[5]!),
  ];
  const context = rankingContext(null);

  it('is the builder’s own ranking over every other slot, best first, three at most (the oracle)', () => {
    const top = { slot: 'top' as const, color: colorFor(colour.entry) };
    const oracle = [
      ...rankForSlot('trouser', [top], wardrobe, context),
      ...rankForSlot('shoe', [top], wardrobe, context),
    ]
      .sort(
        (a, b) =>
          b.score.overall - a.score.overall ||
          (a.garment.id < b.garment.id ? -1 : a.garment.id > b.garment.id ? 1 : 0),
      )
      .slice(0, 3)
      .map((r) => r.garment.id);
    const combos = wearableCombinations(colour, wardrobe, context);
    expect(combos.map((c) => c.garment.id)).toStrictEqual(oracle);
    expect(combos.map((c) => c.rank)).toStrictEqual([1, 2, 3]);
    // The shirt fills the colour's own slot, so it is never offered beside it.
    expect(combos.some((c) => c.garment.id === 'g5')).toBe(false);
  });

  it('offers nothing for an empty wardrobe, or one holding only tops', () => {
    expect(wearableCombinations(colour, [], context)).toStrictEqual([]);
    expect(wearableCombinations(colour, [wardrobe[4]!], context)).toStrictEqual([]);
  });

  it('ranks against the no-evidence profile when none is stored, and prints no score', () => {
    expect(context.profile).toBe(NO_EVIDENCE_PROFILE);
    for (const c of wearableCombinations(colour, wardrobe, context))
      expect(Object.keys(c).sort()).toStrictEqual(['color', 'garment', 'hex', 'rank']);
  });

  it('captions and names each by what the person called it, or its type, and its hex', () => {
    const [first] = wearableCombinations(colour, [wardrobe[0]!], context);
    expect(combinationCaption(first!)).toBe(`Ecru Trousers\n${ENTRIES[1]!.derived.hex}`);
    expect(combinationName(first!)).toBe(
      `1. Ecru Trousers, hex ${ENTRIES[1]!.derived.hex.slice(1)}`,
    );
    // DECOY: an unnamed garment is called by its type.
    const [unnamed] = wearableCombinations(colour, [wardrobe[1]!], context);
    expect(combinationCaption(unnamed!)).toBe(`shoes\n${ENTRIES[2]!.derived.hex}`);
  });
});

describe('a colour, exported (ADR-0147, E-215)', () => {
  it('carries the bundle’s numbers, its English name as the title, and a palette’s envelope', () => {
    const e = ENTRIES[0]!;
    const subject = colourSubject(e);
    expect(subject.title).toBe(e.entry.name.en);
    expect(subject.colours).toHaveLength(1);
    const [c] = subject.colours;
    expect([c?.hex, c?.lab, c?.oklch]).toStrictEqual([
      e.derived.hex,
      [...e.derived.lab],
      [...e.derived.oklch],
    ]);
    const palette = paletteSubject({
      id: 'p',
      nameEn: 'P',
      members: [],
    } as unknown as Parameters<typeof paletteSubject>[0]);
    expect(subject.envelope).toStrictEqual(palette.envelope);
  });
});
