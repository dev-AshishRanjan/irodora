/**
 * A stored palette as an export subject (FR-51, FR-10, F-129).
 *
 * ## What earns this file
 *
 * This is the module that decides **what is in the file**. Every writer is a pure function of an
 * `ExportSubject`, and every one of them is tested — so a wrong subject produces six perfectly
 * correct files, all of them describing the wrong thing.
 *
 * The half that matters most is the envelope: FR-10 says an export carries the versions that
 * produced it, and a version assembled here would be a claim made by the layer least able to
 * know it.
 */

import {
  colourSubject,
  COLOURS_SEPARATOR,
  combinationSubject,
  curatedPaletteSubject,
  exportSubjectFor,
  pairSubject,
  paletteSubject,
} from '../src/export/subject';
import { deltaE00 } from '@irodora/color-difference';
import { allEntries, allPalettes, CORPUS_LABEL } from '../src/corpus';
import { storedPalette } from './stored-palettes';
import { ruleSet } from '../src/rules';
import { RESTING_WEAR, shownColours, wearCombination } from '../src/wear';
import { rankingContext } from '../src/wardrobe/coverage';
import { WRITERS } from '@irodora/export';
import { ENGINE_VERSION } from '@irodora/color-spaces';
import type { SavedColorRow, StoredPalette } from '@irodora/store';

function rowOf(slug: string): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id: `c-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

const SLUGS = allEntries()
  .slice(0, 3)
  .map((e) => e.entry.slug);

const PALETTE: StoredPalette = {
  id: 'p-1',
  nameEn: 'Evening walk',
  nameJa: '夕方の散歩',
  classification: 'editorial',
  category: 'contemporary',
  versionId: CORPUS_LABEL,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  members: SLUGS.map((slug, i) => ({
    colorId: `c-${slug}`,
    slug,
    role: i === 0 ? 'anchor' : 'accent',
    rank: i,
    weight: 1,
    color: rowOf(slug),
  })),
};

describe('the envelope is read, never composed', () => {
  it('carries the versions the app actually holds', () => {
    // Compared against the SAME constants the app reads, not against literals: a literal here
    // would go stale the day a version moved, and the failure would look like a bug in this
    // module rather than a test that was never updated.
    const subject = paletteSubject(PALETTE);

    expect(subject.envelope.engine).toBe(ENGINE_VERSION);
    expect(subject.envelope.corpus).toBe(CORPUS_LABEL);
    expect(subject.envelope.rules).toBe(ruleSet().versionId);
  });

  it('carries no version this app cannot name', () => {
    const subject = paletteSubject(PALETTE);

    for (const [field, value] of Object.entries(subject.envelope))
      expect(`${field}: ${String(typeof value === 'string' && value.length > 0)}`).toBe(
        `${field}: true`,
      );
  });
});

describe('the colours come from the stored row', () => {
  it('reads every coordinate rather than recomputing it', () => {
    // E-001. The row was written under a pinned engine version; deriving `lab` again here would
    // put TODAY's engine's answer in a file that names yesterday's in its envelope.
    const subject = paletteSubject(PALETTE);
    const first = subject.colours[0];
    const row = PALETTE.members[0]?.color;

    expect(first?.lab).toEqual([row?.lab_l, row?.lab_a, row?.lab_b]);
    expect(first?.oklch).toEqual([row?.oklch_l, row?.oklch_c, row?.oklch_h]);
    expect(first?.hex).toBe(row?.hex);
    expect(first?.source).toBe(row?.source);
  });

  it('derives CIELCh as the polar form of the stored CIELAB', () => {
    const subject = paletteSubject(PALETTE);
    const row = PALETTE.members[0]?.color;
    const [l, c, h] = subject.colours[0]?.lch ?? [0, 0, 0];

    expect(l).toBe(row?.lab_l);
    expect(c).toBeCloseTo(Math.hypot(row?.lab_a ?? 0, row?.lab_b ?? 0), 10);
    // The angle is normalised to [0, 360). `atan2` returns (-180, 180], and a negative hue is
    // the shape of the bug this pins.
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it('normalises a negative hue angle rather than passing it through', () => {
    // A colour with a negative b* and positive a* lands in the fourth quadrant, where `atan2`
    // is negative. Every corpus entry might happen to avoid it; this one cannot.
    const member = PALETTE.members[0];
    if (member === undefined) throw new Error('unreachable');
    const negative: StoredPalette = {
      ...PALETTE,
      members: [{ ...member, color: { ...member.color, lab_a: 10, lab_b: -10 } }],
    };

    expect(paletteSubject(negative).colours[0]?.lch[2]).toBeCloseTo(315, 6);
  });

  it('keeps the palette in rank order', () => {
    const subject = paletteSubject(PALETTE);

    expect(subject.colours.map((c) => c.id)).toEqual(SLUGS);
  });

  it('titles the subject with the English name, which a filename can be derived from', () => {
    const subject = paletteSubject(PALETTE);

    expect(subject.title).toBe(PALETTE.nameEn);
  });
});

/*
 * WHICH SUBJECT THE EXPORT ROUTE EXPORTS (F-247, E-215): 06's export glyph opens it with the
 * colour's slug, and that colour is the file; bare, it is the palette saved most recently, as it was.
 */
describe('the export route exports the colour it was opened for', () => {
  const [entry] = allEntries();

  it('a slug this corpus holds is that colour, whatever palettes are saved', () => {
    expect(exportSubjectFor(entry!.entry.slug, [PALETTE])).toStrictEqual(colourSubject(entry!));
    expect(exportSubjectFor(entry!.entry.slug, [])).toStrictEqual(colourSubject(entry!));
  });

  it('DECOY: bare, it is the palette saved most recently, and nothing when none is', () => {
    const later = { ...PALETTE, id: 'p-2', nameEn: 'Later' };
    expect(exportSubjectFor(undefined, [PALETTE, later])?.title).toBe('Later');
    expect(exportSubjectFor(undefined, [])).toBeNull();
  });

  it('DECOY: a slug this corpus does not hold falls back as a bare open does', () => {
    expect(exportSubjectFor('no-such-colour', [PALETTE])?.title).toBe(PALETTE.nameEn);
  });
});

/*
 * 07'S EXPORT (F-248, ADR-0152 D6, E-222): the combination `07` shows, in its order with the colour in
 * hand first; one naming any colour this corpus does not hold is not exported in part.
 */
describe('the export route exports the combination 07 asked for', () => {
  const four = allEntries().slice(0, 4);
  const param = four.map((x) => x.entry.slug).join(COLOURS_SEPARATOR);

  it('is every colour, in order, with the bundle’s derivation and the one envelope', () => {
    const subject = combinationSubject(four);
    expect(subject.colours).toStrictEqual(four.map((x) => colourSubject(x).colours[0]));
    expect(subject.envelope).toStrictEqual(colourSubject(four[0]!).envelope);
    expect(subject.title).toBe(four.map((x) => x.entry.name.en).join(' + '));
  });

  it('a colours parameter wins over the slug and the palettes', () => {
    expect(exportSubjectFor(four[0]!.entry.slug, [PALETTE], param)).toStrictEqual(
      combinationSubject(four),
    );
  });

  it('DECOY: a colour the corpus does not hold, or no colours at all, and it falls back', () => {
    expect(
      exportSubjectFor(four[0]!.entry.slug, [PALETTE], `${param},no-such-colour`),
    ).toStrictEqual(colourSubject(four[0]!));
    expect(exportSubjectFor(undefined, [PALETTE], '')?.title).toBe(PALETTE.nameEn);
    expect(exportSubjectFor(undefined, [PALETTE])?.title).toBe(PALETTE.nameEn);
  });
});

/*
 * WHAT 07 EXPORTS, THROUGH EVERY WRITER (F-248's review, S1; E-221). The writers refuse a colour twice
 * (`assertSubject`), and 07 once handed them its anchor and one colour three times — for every colour,
 * so its export never worked. The combination each colour shows, as the screen builds it, written in
 * every format.
 */
describe('the combination 07 shows exports in every format', () => {
  it('for every corpus colour, as the page builds its list', () => {
    const context = rankingContext(null);
    const failures: string[] = [];
    for (const e of allEntries()) {
      const shown = wearCombination(e.entry.slug, RESTING_WEAR, null, context)!;
      const subject = exportSubjectFor(undefined, [], shownColours(shown).join(COLOURS_SEPARATOR));
      if (subject?.colours.length !== 4) {
        failures.push(`${e.entry.slug}: ${String(subject?.colours.length ?? 0)} colours`);
        continue;
      }
      for (const writer of WRITERS)
        try {
          writer.write(subject);
        } catch (error) {
          failures.push(`${e.entry.slug} ${writer.format}: ${String(error)}`);
        }
    }
    expect(failures).toStrictEqual([]);
  });

  it('DECOY: a combination with a colour twice is refused, so the case above can fail', () => {
    const [a, b] = allEntries();
    const twice = combinationSubject([a!, b!, b!]);
    expect(() => WRITERS[0].write(twice)).toThrow(/duplicate/i);
  });
});

/*
 * 08'S PAIR (F-249, ADR-0156 D3/D4; E-227): the glyph and the PDF open the export with `pair`. Its two
 * colours and their ΔE00 row, in every format the PDF included, for every corpus colour beside a fixed
 * partner; and the parameter's place among the others.
 */
describe('the export route exports the pair 08 shows', () => {
  const [first, second, third] = allEntries();
  const pair = `${first!.entry.slug}${COLOURS_SEPARATOR}${second!.entry.slug}`;

  it('is the two colours, titled as a combination, with their ΔE00 row', () => {
    const subject = pairSubject(first!, second!);
    expect(subject.colours).toStrictEqual(combinationSubject([first!, second!]).colours);
    expect(subject.title).toBe(`${first!.entry.name.en} + ${second!.entry.name.en}`);
    expect(subject.deltas).toStrictEqual([
      {
        fromId: first!.entry.slug,
        toId: second!.entry.slug,
        deltaE00: deltaE00(first!.derived.lab, second!.derived.lab),
      },
    ]);
  });

  it('a pair wins over colours, a slug and the palettes', () => {
    const colours = `${third!.entry.slug}${COLOURS_SEPARATOR}${first!.entry.slug}`;
    expect(exportSubjectFor(third!.entry.slug, [PALETTE], colours, pair)).toStrictEqual(
      pairSubject(first!, second!),
    );
  });

  it('DECOY: a pair of one colour twice, of three, or naming no corpus colour, exports nothing (M2)', () => {
    const slug = third!.entry.slug;
    // Never another subject in its place — not the slug, not the latest palette: a guess the person
    // did not ask for is worse than Export saying there is nothing to write.
    for (const bad of [
      `${first!.entry.slug}${COLOURS_SEPARATOR}${first!.entry.slug}`,
      `${pair}${COLOURS_SEPARATOR}${slug}`,
      `${first!.entry.slug}${COLOURS_SEPARATOR}no-such-colour`,
    ])
      expect([bad, exportSubjectFor(slug, [PALETTE], undefined, bad)]).toStrictEqual([bad, null]);
    // An empty parameter is no parameter: the slug is the subject.
    expect(exportSubjectFor(slug, [PALETTE], undefined, '')).toStrictEqual(colourSubject(third!));
  });

  it('writes in every format, the PDF included, for every corpus colour beside a fixed partner', () => {
    const failures: string[] = [];
    for (const e of allEntries()) {
      const partner = e === first ? second! : first!;
      const subject = exportSubjectFor(
        undefined,
        [],
        undefined,
        `${e.entry.slug}${COLOURS_SEPARATOR}${partner.entry.slug}`,
      );
      if (subject?.colours.length !== 2 || subject.deltas?.length !== 1) {
        failures.push(`${e.entry.slug}: not a pair`);
        continue;
      }
      for (const writer of WRITERS)
        try {
          writer.write(subject);
        } catch (error) {
          failures.push(`${e.entry.slug} ${writer.format}: ${String(error)}`);
        }
    }
    expect(failures).toStrictEqual([]);
    expect(WRITERS.map((w) => w.format)).toContain('pdf');
  });
});

/*
 * 10'S PALETTES (F-251, ADR-0165 D2): *Export Tokens* opens the export with `palette` (a curated slug)
 * or `saved` (a stored id). Every corpus palette and every fixture stored palette, in every format;
 * a parameter that names nothing exports nothing; and the parameters' place among the others.
 */
describe('the export route exports the palette 10 shows', () => {
  const STORED = [
    PALETTE,
    storedPalette(
      'p-layers',
      'Morning layers',
      [
        [SLUGS[0]!, 'anchor'],
        [SLUGS[1]!, 'light'],
      ],
      'kasane',
    ),
  ];

  it('exports a curated palette’s members in rank order, titled with its English name', () => {
    for (const published of allPalettes()) {
      const subject = exportSubjectFor(
        undefined,
        STORED,
        undefined,
        undefined,
        published.palette.slug,
      );
      expect(subject).toStrictEqual(curatedPaletteSubject(published));
      expect(subject?.title).toBe(published.palette.name.en);
      expect(subject?.colours.map((c) => c.id)).toStrictEqual(
        [...published.palette.colors].sort((a, b) => a.rank - b.rank).map((m) => m.slug),
      );
    }
  });

  it('exports a saved palette by its id, not the latest one', () => {
    expect(
      exportSubjectFor(undefined, STORED, undefined, undefined, undefined, PALETTE.id),
    ).toStrictEqual(paletteSubject(PALETTE));
    // DECOY: with no parameter the latest is exported, which is the other one.
    expect(exportSubjectFor(undefined, STORED)?.title).toBe('Morning layers');
  });

  it('exports nothing for a palette or an id it does not hold, rather than another subject', () => {
    const [entry] = allEntries();
    expect(
      exportSubjectFor(entry!.entry.slug, STORED, undefined, undefined, 'no-such-palette'),
    ).toBeNull();
    expect(
      exportSubjectFor(entry!.entry.slug, STORED, undefined, undefined, undefined, 'no-such-id'),
    ).toBeNull();
    // An empty parameter is no parameter.
    expect(exportSubjectFor(entry!.entry.slug, STORED, undefined, undefined, '', '')).toStrictEqual(
      colourSubject(entry!),
    );
  });

  it('lets 08’s pair win, as it is read first', () => {
    const [a, b] = allEntries();
    const pair = `${a!.entry.slug}${COLOURS_SEPARATOR}${b!.entry.slug}`;
    expect(
      exportSubjectFor(undefined, STORED, undefined, pair, 'quiet-neutrals', PALETTE.id),
    ).toStrictEqual(pairSubject(a!, b!));
  });

  it('writes in every format, the PDF included, for every corpus palette and every stored one', () => {
    const subjects = [
      ...allPalettes().map((p) =>
        exportSubjectFor(undefined, [], undefined, undefined, p.palette.slug),
      ),
      ...STORED.map((p) =>
        exportSubjectFor(undefined, STORED, undefined, undefined, undefined, p.id),
      ),
    ];
    const failures: string[] = [];
    for (const subject of subjects) {
      if (subject === null) {
        failures.push('no subject');
        continue;
      }
      for (const writer of WRITERS)
        try {
          writer.write(subject);
        } catch (error) {
          failures.push(`${subject.title} ${writer.format}: ${String(error)}`);
        }
    }
    expect(failures).toStrictEqual([]);
    expect(subjects).toHaveLength(15);
  });
});
