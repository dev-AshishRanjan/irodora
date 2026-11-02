/**
 * What `10`'s catalogue and `16`'s builder print (F-251, ADR-0164, ADR-0165), checked over every case
 * the data allows (F-248's lesson): every corpus palette, stored palettes of both forms, and every
 * pair of corpus colours where a figure could round the wrong way.
 *
 * The figures are checked against ORACLES that do not call the function under test: the separation
 * by its own loop over `separationScore` (F-250's lesson — an equivalence test against a delegate
 * compares the delegate with itself), the contrast pair by a hand-written table.
 */

import { apcaLc, wcagContrast } from '@irodora/color-difference';
import { separationScore, type Deficiency } from '@irodora/cvd-engine';
import { xyzToSrgb } from '@irodora/color-spaces';
import { PALETTE_CATEGORIES, PALETTE_ROLES } from '@irodora/corpus';
import { tategakiReady } from '@irodora/ui';
import { compare } from '../src/compare';
import { thresholdKey } from '../src/compare-readout';
import { allEntries, allPalettes, colorFor, entryBySlug } from '../src/corpus';
import { CLASSIFICATION_KEYS } from '../src/detail';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import type { MessageKey } from '../src/i18n';
import { DEFICIENCIES, SEVERITY } from '../src/outfit/cvd';
import { draftOf, EMPTY_DRAFT, SLOT_ROLES, type PaletteDraft } from '../src/palette';
import {
  cardForm,
  CATEGORY_KEYS,
  columnLines,
  COLUMN_ROLE_KEYS,
  contrastBadge,
  contrastPair,
  curatedOrder,
  curatedShown,
  descriptionLine,
  exportHref,
  kindLabel,
  labHandOff,
  matrixRows,
  pageOf,
  paletteSeparation,
  personalShown,
  printedRatio,
  PROBLEM_KEYS,
  provenanceLine,
  provenanceTag,
  ROLE_KEYS,
  separationBadge,
  SLOT_HEADING_KEYS,
  titleLine,
  trayPages,
  TRAY_PAGE,
  TYPE_KEYS,
  type ShownPalette,
} from '../src/palette-readout';
import { HARMONY_KEYS } from '../src/temperature';
import { ruleSet } from '../src/rules';
import { warmCoolRelation } from '@irodora/recommendation';
import { contrastLine, separationLine } from '../src/wear';
import { storedPalette } from './stored-palettes';

/** A pass over every pair of the 120 colours runs the engine 21,420 times: seconds under load. */
const CORPUS_WIDE = 120_000;

const tEn = (key: MessageKey): string => en[key];
const tJa = (key: MessageKey): string => ja[key];

const CURATED = curatedOrder().map(curatedShown);
const SLUGS = allEntries().map((e) => e.entry.slug);

/** Two stored palettes, one of each form, as a person builds them in 16. */
const STORED = [
  storedPalette('p-band', 'Evening walk', [
    [SLUGS[0]!, 'anchor'],
    [SLUGS[1]!, 'light'],
    [SLUGS[2]!, 'neutral'],
    [SLUGS[3]!, 'accent'],
  ]),
  storedPalette(
    'p-layers',
    'Morning layers',
    [
      [SLUGS[4]!, 'anchor'],
      [SLUGS[5]!, 'light'],
    ],
    'kasane',
  ),
].map(personalShown);
const ALL: readonly ShownPalette[] = [...CURATED, ...STORED];

/** The ORACLE for a set's separation: its own loop, never `worstSeparation` or `paletteSeparation`. */
function separationOracle(slugsOrHexes: readonly ShownPalette['members'][number][]): {
  exact: number;
  worst: Deficiency;
} | null {
  if (slugsOrHexes.length < 2) return null;
  let exact = Infinity;
  let worst: Deficiency = 'protan';
  for (let i = 0; i < slugsOrHexes.length; i += 1)
    for (let j = i + 1; j < slugsOrHexes.length; j += 1)
      for (const d of DEFICIENCIES) {
        const score = separationScore(
          xyzToSrgb(slugsOrHexes[i]!.color.xyz),
          xyzToSrgb(slugsOrHexes[j]!.color.xyz),
          d,
          SEVERITY,
        );
        if (score < exact) {
          exact = score;
          worst = d;
        }
      }
  return { exact, worst };
}

describe('the catalogue’s order and forms (ADR-0164 D1)', () => {
  it('lists the 13 curated palettes by category, then slug', () => {
    expect(CURATED).toHaveLength(13);
    const keys = CURATED.map((p) => [PALETTE_CATEGORIES.indexOf(p.category), p.id] as const);
    expect(keys).toStrictEqual([...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])));
    // So the first card is Earth and Clay; 10's Quiet Neutrals first is sample content (E1).
    expect(CURATED[0]!.id).toBe('earth-and-clay');
  });

  it('draws a kasane’s layers apart and every other palette as a band, curated or personal', () => {
    for (const p of ALL)
      expect(cardForm(p.category)).toBe(p.category === 'kasane' ? 'layers' : 'band');
    expect(STORED.map((p) => cardForm(p.category))).toStrictEqual(['band', 'layers']);
  });
});

describe('each card says what its palette holds', () => {
  it('holds the members in rank order at the record’s weights', () => {
    for (const shown of CURATED) {
      const record = allPalettes().find((p) => p.palette.slug === shown.id)!.palette;
      const ranked = [...record.colors].sort((a, b) => a.rank - b.rank);
      expect(shown.members.map((m) => [m.slug, m.role, m.weight])).toStrictEqual(
        ranked.map((m) => [m.slug, m.role, m.weight]),
      );
    }
  });

  it('prints every column’s hex, kanji, romaji and English as the record holds them', () => {
    for (const shown of ALL)
      for (const member of shown.members) {
        const entry = entryBySlug(member.slug)!;
        const lines = columnLines(member, tEn);
        expect(lines.hex).toBe(entry.derived.hex);
        expect(lines.name).toContain(entry.entry.name.kanji);
        expect(lines.name.toLowerCase()).toContain(entry.entry.name.romaji.toLowerCase());
        expect(lines.english).toBe(`(${entry.entry.name.en})`);
        expect(lines.role).toBe(en[COLUMN_ROLE_KEYS[member.role]]);
      }
  });

  it('shows a curated palette’s classification and category, and never calls a personal one ours', () => {
    for (const shown of CURATED) {
      const label = en[CLASSIFICATION_KEYS[shown.classification!]];
      expect(descriptionLine(shown, tEn, 'latin')).toBe(
        `${en[CATEGORY_KEYS[shown.category]]}. ${label}.`,
      );
      expect(provenanceTag(shown, tEn)).toBe(label);
      expect(kindLabel(shown, tEn)).toBe(en['palettes.kind.curated']);
      expect(titleLine(shown)).toBe(`${shown.name.en} • ${shown.name.ja}`);
    }
    for (const shown of STORED)
      for (const [t, lang] of [
        [tEn, en],
        [tJa, ja],
      ] as const) {
        const words = [
          descriptionLine(shown, t, 'latin'),
          provenanceLine(shown, t, 'latin'),
          provenanceTag(shown, t),
          kindLabel(shown, t),
        ].join(' | ');
        // ADR-0067: a palette built here is never presented as Irodora's own work.
        expect(words).not.toContain(lang['classification.editorial']);
        expect(words).toContain(lang['studio.origin']);
        expect(titleLine(shown)).toBe(shown.name.en);
      }
  });

  it('DECOY — a curated palette passed off as personal is caught: its classification is gone', () => {
    const passedOff: ShownPalette = { ...CURATED[0]!, origin: 'personal', classification: null };
    expect(provenanceTag(passedOff, tEn)).not.toBe(provenanceTag(CURATED[0]!, tEn));
  });

  it('names the source type and the review the record holds, never “verified”', () => {
    for (const shown of CURATED) {
      const line = provenanceLine(shown, tEn, 'latin');
      expect(line.startsWith(`${en['palettes.provenance']} `)).toBe(true);
      expect(line).not.toMatch(/verified/iu);
    }
    expect(provenanceLine(STORED[0]!, tEn, 'latin')).toBe(
      `Provenance: built on this device from corpus ${STORED[0]!.versionId}`,
    );
  });
});

/** The contrast pair, by hand: the anchor and the first `light` member by rank (content/palettes). */
const CONTRAST_PAIRS: Readonly<Record<string, readonly [string, string] | null>> = {
  'earth-and-clay': ['kuro-tsuchi', 'suna-kabe'],
  'forest-and-mineral': ['kuro-midori', 'shimo-ba'],
  'indigo-studies': ['fuka-yoi', 'ame-zora'],
  'kasane-aki-no-tsuyu': ['ame-iwa', 'asa-nuno'],
  'kasane-fuyu-bare': ['samu-zora', 'yuki-ge'],
  'kasane-hana-nioi': ['usu-gami', 'hana-gasumi'],
  'kasane-kinshu': null,
  'kasane-mebuki': null,
  'kasane-natsu-no': ['ao-ta', 'ko-more-bi'],
  'kasane-shimo-sugi': null,
  'kasane-suzu-kage': ['sabi-do', 'iwa-shimizu'],
  'quiet-neutrals': ['soko-zumi', 'usu-gami'],
  seasonal: ['shimo-yo', 'hana-gasumi'],
};

describe('the badges are the engine’s, for the pair and the set their words name', () => {
  it('measures the anchor against the first light member by rank, every palette', () => {
    expect(Object.keys(CONTRAST_PAIRS).sort()).toStrictEqual(CURATED.map((p) => p.id).sort());
    for (const shown of CURATED) {
      const pair = contrastPair(shown.members);
      expect(pair === null ? null : [pair[0].slug, pair[1].slug]).toStrictEqual(
        CONTRAST_PAIRS[shown.id],
      );
    }
  });

  it('prints the ratio floored to one place, never above the exact one, and the threshold the PRINTED ratio reaches', () => {
    for (const shown of CURATED) {
      const pair = CONTRAST_PAIRS[shown.id];
      const badge = contrastBadge(shown.members, tEn);
      if (pair === null || pair === undefined) {
        // DECOY: no light member, no badge — not a figure for some other pair.
        expect(badge).toBeNull();
        continue;
      }
      const exact = compare(entryBySlug(pair[0])!, entryBySlug(pair[1])!).contrast.wcagRatio;
      const printed = Math.floor(exact * 10) / 10;
      expect(printed).toBeLessThanOrEqual(exact);
      expect(badge).toBe(`WCAG ${en[thresholdKey(printed)]} ${printed.toFixed(1)}:1`);
    }
  });

  it('DECOY — floors where rounding would claim a threshold: 4.46 prints 4.4, under AA', () => {
    expect(printedRatio(4.46)).toBe(4.4);
    expect(thresholdKey(printedRatio(4.46))).not.toBe('compare.threshold.textAA');
  });

  it('prints the floor of the worst pair over three deficiencies, approximate only when tritan', () => {
    for (const shown of ALL) {
      const oracle = separationOracle(shown.members);
      const badge = separationBadge(shown.members, tEn, 'latin');
      if (oracle === null) {
        expect(badge).toBeNull();
        continue;
      }
      const n = Math.floor(oracle.exact);
      const model = oracle.worst === 'tritan' ? 'Machado 2009, approximate' : 'Machado 2009';
      expect(badge).toBe(`CVD ${String(n)}% Separation (${model})`);
      expect(paletteSeparation(shown.members.map((m) => m.color))?.exact).toBeCloseTo(
        oracle.exact,
        9,
      );
    }
  });

  it(
    'prints 100 only when it is 100: a corpus pair in [99.5, 100) prints 99',
    () => {
      const entries = allEntries();
      let found: readonly [number, number] | null = null;
      for (let i = 0; i < entries.length && found === null; i += 1)
        for (let j = i + 1; j < entries.length && found === null; j += 1) {
          const shown = [entries[i]!, entries[j]!].map((e) => ({
            color: colorFor(e.entry),
          })) as unknown as ShownPalette['members'];
          const oracle = separationOracle(shown);
          if (oracle !== null && oracle.exact >= 99.5 && oracle.exact < 100) found = [i, j];
        }
      // The census found 16 such pairs (ADR-0164); one is enough to hold the rule.
      expect(found).not.toBeNull();
      const [i, j] = found!;
      const pair = paletteSeparation([colorFor(entries[i]!.entry), colorFor(entries[j]!.entry)])!;
      expect(pair.exact).toBeLessThan(100);
      expect(pair.score).toBe(99);
      // DECOY: rounding, as 07 does (F-357), would have printed 100.
      expect(Math.round(pair.exact)).toBe(100);
    },
    CORPUS_WIDE,
  );
});

describe('the Lab gets the palette (ADR-0165 D2)', () => {
  it('puts the anchor on top, never one colour twice, an accent on the shoes where there is one', () => {
    for (const shown of ALL) {
      const handOff = labHandOff(shown.members);
      const slugs = [handOff.top, handOff.trouser, handOff.shoe].filter((s) => s !== null);
      expect(handOff.top).toBe(shown.members.find((m) => m.role === 'anchor')!.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(shown.members.map((m) => m.slug)).toContain(slug);
      if (shown.members.some((m) => m.role === 'accent' && m.slug !== handOff.trouser))
        expect(shown.members.find((m) => m.slug === handOff.shoe)?.role).toBe('accent');
      if (handOff.trouser !== null)
        expect(shown.members.find((m) => m.slug === handOff.trouser)?.role).not.toBe('accent');
    }
  });

  it('DECOY — a palette whose second colour is an accent still dresses the trousers in a non-accent', () => {
    const shown = personalShown(
      storedPalette('p-accent', 'Accent second', [
        [SLUGS[0]!, 'anchor'],
        [SLUGS[1]!, 'accent'],
        [SLUGS[2]!, 'neutral'],
      ]),
    );
    expect(labHandOff(shown.members)).toStrictEqual({
      top: SLUGS[0],
      trouser: SLUGS[2],
      shoe: SLUGS[1],
    });
  });
});

describe('what leaves for the export screen', () => {
  it('names a curated palette by its slug and a saved one by its id', () => {
    expect(exportHref(CURATED[0]!, 'tokens')).toBe(
      `/profile/export?palette=${CURATED[0]!.id}&format=tokens`,
    );
    expect(exportHref(STORED[0]!)).toBe('/profile/export?saved=p-band');
  });
});

describe('16’s tray', () => {
  const pages = trayPages(allEntries());

  it('shows every colour once, in the order given, seven a page', () => {
    expect(pages.flat().map((e) => e.entry.slug)).toStrictEqual(SLUGS);
    expect(pages.slice(0, -1).every((p) => p.length === TRAY_PAGE)).toBe(true);
    expect(pages.at(-1)!.length).toBeLessThanOrEqual(TRAY_PAGE);
    expect(pages).toHaveLength(Math.ceil(SLUGS.length / TRAY_PAGE));
  });

  it('finds the page that holds a colour, and none for a colour it does not hold', () => {
    for (const slug of SLUGS)
      expect(pages[pageOf(pages, slug)!]!.map((e) => e.entry.slug)).toContain(slug);
    expect(pageOf(pages, 'no-such-colour')).toBeNull();
  });

  it('sets every corpus name upright: none holds a character whose vertical form differs', () => {
    for (const entry of allEntries()) expect(tategakiReady(entry.entry.name.kanji)).toBe(true);
  });
});

describe('16’s matrix (ADR-0164 D6)', () => {
  const four = draftOf(SLUGS.slice(0, 1))!;
  const full: PaletteDraft = {
    ...four,
    members: SLOT_ROLES.map((role, i) => ({ role, slug: SLUGS[i]! })),
  };

  it('measures slot 1 against slot 2, the set’s warm–cool relation and its worst separation', () => {
    const rows = matrixRows(full, tEn, 'latin');
    const [one, two] = [entryBySlug(SLUGS[0]!)!, entryBySlug(SLUGS[1]!)!];
    expect(rows.map((r) => r.key)).toStrictEqual(['contrast', 'harmony', 'separation']);
    expect(rows[0]!.value).toBe(
      contrastLine({
        ratio: wcagContrast(one.derived.rgb, two.derived.rgb),
        lc: Math.min(
          Math.abs(apcaLc(one.derived.rgb, two.derived.rgb)),
          Math.abs(apcaLc(two.derived.rgb, one.derived.rgb)),
        ),
      }),
    );
    expect(Object.values(HARMONY_KEYS).map((k) => en[k])).toContain(rows[1]!.value);
    const oracle = separationOracle(
      SLUGS.slice(0, 4).map((s) => ({ color: colorFor(entryBySlug(s)!.entry) })) as never,
    )!;
    expect(rows[2]!.value).toBe(separationLine(Math.floor(oracle.exact), tEn, 'latin'));
    expect(rows[0]!.pair).toBe('(Slot 1 vs 2)');
  });

  it('says “Choose two colours” rather than print a figure for a pair that is not there', () => {
    for (const draft of [EMPTY_DRAFT, four])
      expect(matrixRows(draft, tEn, 'latin').map((r) => r.value)).toStrictEqual([
        'Choose two colours',
        'Choose two colours',
        'Choose two colours',
      ]);
    // Slot 2 empty: no contrast for slot 1 vs 2, though two colours give the rest.
    const gap: PaletteDraft = {
      ...four,
      members: [
        { role: 'anchor', slug: SLUGS[0]! },
        { role: 'neutral', slug: SLUGS[2]! },
      ],
    };
    const rows = matrixRows(gap, tEn, 'latin');
    expect(rows[0]!.value).toBe('Choose two colours');
    expect(rows[2]!.value).not.toBe('Choose two colours');
  });
});

describe('the words', () => {
  it('maps every schema role, category and problem to a key both catalogues hold', () => {
    for (const map of [COLUMN_ROLE_KEYS, SLOT_HEADING_KEYS, ROLE_KEYS])
      expect(Object.keys(map).sort()).toStrictEqual([...PALETTE_ROLES].sort());
    expect(Object.keys(CATEGORY_KEYS).sort()).toStrictEqual([...PALETTE_CATEGORIES].sort());
    for (const key of [
      ...Object.values(COLUMN_ROLE_KEYS),
      ...Object.values(SLOT_HEADING_KEYS),
      ...Object.values(ROLE_KEYS),
      ...Object.values(TYPE_KEYS),
      ...Object.values(PROBLEM_KEYS),
      ...Object.values(CATEGORY_KEYS),
    ]) {
      expect(en[key].length).toBeGreaterThan(0);
      expect(ja[key].length).toBeGreaterThan(0);
    }
  });

  /**
   * The keys F-251 writes for its own words. The category and classification maps are left out
   * with reason: they print the RECORD's own field (FR-23), and a traditional palette is called so.
   */
  const OWN = (Object.keys(en) as MessageKey[]).filter(
    (k) =>
      (k.startsWith('palettes.') && !k.startsWith('palettes.category.')) ||
      k === 'studio.problem.tooFewLayers' ||
      k.startsWith('role.'),
  );
  const BANNED =
    /\bMatch\b|\bSafe\b|Verified|Heian|Traditional|Distinguishable|APCA Passed|一致|伝統|平安/u;

  it('claims nothing the engine does not compute, in English or Japanese', () => {
    expect(OWN.length).toBeGreaterThan(20);
    for (const key of OWN) {
      expect(en[key]).not.toMatch(BANNED);
      expect(ja[key]).not.toMatch(BANNED);
    }
  });

  it('DECOY — a planted “Verified” is found', () => {
    expect('Heian Verified').toMatch(BANNED);
  });
});

describe('16’s harmony row reads warmCoolRelation (E-226)', () => {
  it('prints the set’s relation in 07’s words, for a draft of every curated palette’s first four', () => {
    for (const published of allPalettes()) {
      const slugs = [...published.palette.colors]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, SLOT_ROLES.length)
        .map((m) => m.slug);
      const draft: PaletteDraft = {
        name: 'x',
        members: slugs.map((slug, i) => ({ slug, role: SLOT_ROLES[i]! })),
      };
      const colours = slugs.map((s) => colorFor(entryBySlug(s)!.entry));
      const direction = warmCoolRelation(colours, ruleSet()).direction;
      expect(matrixRows(draft, tEn, 'latin')[1]!.value).toBe(en[HARMONY_KEYS[direction]]);
    }
  });
});
