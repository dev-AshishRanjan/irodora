/**
 * Whole-corpus checks, the roster, and the source register.
 *
 * The register tests carry the most weight, because `licensing-and-provenance.md` §5 asserts
 * this cross-check exists. Every one of them is really asking the same question: when the
 * register cannot be read, does the gate fail or does it wave the entry through?
 */

import { describe, expect, it } from 'vitest';
import {
  checkCorpus,
  checkSourceRegistered,
  CorpusError,
  parseEntry,
  parsePalette,
  parseRegister,
  parseRoster,
  type CorpusEntry,
  type CorpusPalette,
  type Roster,
  type SourceRegister,
  type Sourced,
} from '../src/index.js';

// --- fixtures -----------------------------------------------------------------------

const editors = [
  { id: 'ed-001', displayName: 'Ashish Ranjan', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-002', displayName: 'Mori Keiko', roles: ['author', 'reviewer'], active: true },
];

const roster: Roster = parseRoster(editors, 'editors.json');

const REGISTER_DOC = [
  '# Colour Content — Licensing and Provenance',
  '',
  '## 4. Other categories',
  '',
  'Nothing here.',
  '',
  '## 5. Source register',
  '',
  'Every source used by any published entry appears here before the version ships.',
  '',
  '| ID | Source | Type | Rights holder | Licence | Cleared | Notes |',
  '|---|---|---|---|---|---|---|',
  '| IRO-ED-001 | Irodora editorial curation, R1 seed set | editorial | Irodora | Proprietary | 2026-08-01 | Our own work |',
  '| PUB-001 | Some Dated Publication, 1908 | publication | Public domain | PD | 2026-08-02 | — |',
  '',
  '**A source not in this table cannot appear in a published entry.**',
  '',
  '## 6. If we get it wrong',
  '',
  'Nothing here.',
  '',
].join('\n');

const register: SourceRegister = parseRegister(REGISTER_DOC, 'licensing-and-provenance.md');

function entryJson(slug: string, over: Record<string, unknown> = {}): unknown {
  return {
    slug,
    classification: 'japanese-inspired',
    name: { kanji: '静石', kana: 'しずいし', romaji: 'shizu-ishi', en: 'Quiet Slate' },
    color: {
      xyz: { x: 0.1284, y: 0.1421, z: 0.1657 },
      measuredUnder: 'D65',
      adaptation: null,
      sourceHex: null,
    },
    taxonomy: {
      family: 'blue-grey',
      temperature: 'cool',
      lightnessBand: 'mid',
      chromaBand: 'low',
      era: null,
      material: null,
      season: null,
    },
    editorial: {
      description_en: 'A low-chroma blue-grey curated for outerwear.',
      description_ja: '彩度の低い青みの灰色。',
      historicalNote_en: null,
      contemporaryNote_en: null,
      fashionUse: null,
    },
    provenance: {
      source: 'Irodora editorial curation, R1 seed set',
      sourceId: 'IRO-ED-001',
      sourceType: 'editorial',
      publisher: null,
      publishedYear: null,
      rightsHolder: 'Irodora',
      sourceLicence: 'Proprietary — Irodora original work',
      sourceUrl: null,
      derivation: 'Editorial: interpolated between two attested blue-greys in the same family.',
      authoredBy: 'ed-001',
      authoredAt: '2026-08-11',
      verifiedBy: 'ed-002',
      reviewIndependence: 'independent',
      verifiedAt: '2026-08-13',
      editorialNotes: 'The English name is a judgement about what communicates.',
    },
    relations: { related: [], complementary: [], historicalVariants: [] },
    unknowns: {
      'color.adaptation': 'measured under D65',
      'color.sourceHex': 'derived, not transcribed',
      'taxonomy.era': 'a contemporary curation',
      'taxonomy.material': 'not tied to a fibre',
      'taxonomy.season': 'not yet assigned',
      'editorial.historicalNote_en': 'no history is claimed',
      'editorial.contemporaryNote_en': 'not yet written',
      'editorial.fashionUse': 'not yet assigned',
      'provenance.publisher': 'our own work',
      'provenance.publishedYear': 'our own work',
      'provenance.sourceUrl': 'not published externally',
    },
    status: 'published',
    versionId: '2026.08.1',
    ...over,
  };
}

function entry(slug: string, over: Record<string, unknown> = {}): Sourced<CorpusEntry> {
  return { file: `${slug}.json`, record: parseEntry(entryJson(slug, over), `${slug}.json`) };
}

function palette(slug: string, members: readonly string[]): Sourced<CorpusPalette> {
  const record = parsePalette(
    {
      slug,
      name: { en: 'Quiet Neutrals', ja: '静かな中間色' },
      classification: 'japanese-inspired',
      category: 'contemporary',
      colors: members.map((m, i) => ({
        slug: m,
        role: i === 0 ? 'anchor' : 'neutral',
        rank: i + 1,
        weight: 1,
      })),
      provenance: (entryJson('x') as { provenance: unknown }).provenance,
      unknowns: {
        'provenance.publisher': 'our own work',
        'provenance.publishedYear': 'our own work',
        'provenance.sourceUrl': 'not published externally',
      },
      status: 'published',
      versionId: '2026.08.1',
    },
    `${slug}.json`,
  );
  return { file: `${slug}.json`, record };
}

const base = { roster, register };

// --- the register -------------------------------------------------------------------

describe('the source register (licensing §5)', () => {
  it('reads the rows', () => {
    expect(register.size).toBe(2);
    expect(register.get('IRO-ED-001')?.source).toBe('Irodora editorial curation, R1 seed set');
    expect(register.get('PUB-001')?.licence).toBe('PD');
  });

  it('skips the placeholder row, so an entry cannot cite an em dash', () => {
    const withPlaceholder = REGISTER_DOC.replace(
      '| IRO-ED-001 |',
      '| — | *No sources registered yet.* | — | — | — | — | — |\n| IRO-ED-001 |',
    );
    const parsed = parseRegister(withPlaceholder, 'x.md');
    expect(parsed.has('—')).toBe(false);
    expect(parsed.size).toBe(2);
  });

  it('FAILS when the section is missing, rather than returning an empty register', () => {
    // The distinction this test defends: "I could not read the register" and "the register is
    // empty" are opposite facts, and only one of them means an entry may proceed.
    expect(() => parseRegister('# Doc\n\nNo section here.\n', 'x.md')).toThrow(
      /heading is missing.*must fail rather than pass/su,
    );
  });

  it('FAILS when the table is missing under the heading', () => {
    expect(() => parseRegister('## 5. Source register\n\nComing soon.\n', 'x.md')).toThrow(
      /no table under/u,
    );
  });

  it('FAILS when a column is renamed or reordered', () => {
    const reordered = REGISTER_DOC.replace(
      '| ID | Source | Type | Rights holder | Licence | Cleared | Notes |',
      '| ID | Source | Type | Rights holder | Cleared | Licence | Notes |',
    );
    expect(() => parseRegister(reordered, 'x.md')).toThrow(/stops rather than guessing/u);
  });

  it('FAILS on a row with the wrong number of cells', () => {
    const short = REGISTER_DOC.replace(
      '| PUB-001 | Some Dated Publication, 1908 | publication | Public domain | PD | 2026-08-02 | — |',
      '| PUB-001 | Some Dated Publication, 1908 |',
    );
    expect(() => parseRegister(short, 'x.md')).toThrow(/cells; the register has 7 columns/u);
  });

  it('FAILS on a duplicate source id', () => {
    const dupe = REGISTER_DOC.replace(
      '| PUB-001 |',
      '| IRO-ED-001 | Another thing | editorial | Irodora | Proprietary | 2026-08-02 | — |\n| PUB-001 |',
    );
    expect(() => parseRegister(dupe, 'x.md')).toThrow(/appears twice in the register/u);
  });

  it('accepts an entry whose sourceId and source both match a row', () => {
    expect(() => {
      checkSourceRegistered(
        { sourceId: 'IRO-ED-001', source: 'Irodora editorial curation, R1 seed set' },
        register,
        'x.json',
      );
    }).not.toThrow();
  });

  it('rejects an unregistered sourceId', () => {
    expect(() => {
      checkSourceRegistered({ sourceId: 'IRO-ED-999', source: 'Something' }, register, 'x.json');
    }).toThrow(/is not in the source register/u);
  });

  it('rejects an id whose row names a different source', () => {
    // The failure that matters: the entry would DISPLAY one provenance and be LICENSED under
    // another. An id-only check would pass this.
    expect(() => {
      checkSourceRegistered(
        { sourceId: 'IRO-ED-001', source: 'A completely different publication' },
        register,
        'x.json',
      );
    }).toThrow(/would display one provenance and be licensed under another/u);
  });

  it('registers nothing from the real document today, so any cited source fails', () => {
    // The repository's own register currently holds only the placeholder row. This asserts
    // the failing-CLOSED direction: with no sources cleared, no entry citing one can ship.
    const realShape = [
      '## 5. Source register',
      '',
      '| ID | Source | Type | Rights holder | Licence | Cleared | Notes |',
      '|---|---|---|---|---|---|---|',
      '| — | *No sources registered yet. Corpus entries begin at F-012.* | — | — | — | — | — |',
      '',
    ].join('\n');
    const empty = parseRegister(realShape, 'x.md');
    expect(empty.size).toBe(0);
    expect(() => {
      checkSourceRegistered({ sourceId: 'IRO-ED-001', source: 'anything' }, empty, 'x.json');
    }).toThrow(CorpusError);
  });
});

// --- the roster ---------------------------------------------------------------------

describe('the editor roster', () => {
  it('reads it', () => {
    expect(roster.get('ed-001')?.displayName).toBe('Ashish Ranjan');
  });

  it('rejects an id that is not ed-NNN', () => {
    expect(() => parseRoster([{ ...editors[0], id: 'ashish' }], 'x.json')).toThrow(/ed-001/u);
  });

  it('rejects a role outside the two', () => {
    expect(() => parseRoster([{ ...editors[0], roles: ['admin'] }], 'x.json')).toThrow(
      /expected roles from author, reviewer/u,
    );
  });

  it('rejects an empty role list', () => {
    expect(() => parseRoster([{ ...editors[0], roles: [] }], 'x.json')).toThrow(/non-empty array/u);
  });

  it('rejects a duplicate id', () => {
    expect(() => parseRoster([editors[0], editors[0]], 'x.json')).toThrow(/appears twice/u);
  });

  it('ACCEPTS two ids for one person, which is a real state', () => {
    // Rejecting it here would be the wrong place. The question that matters is whether THIS
    // author and THIS reviewer are the same human, and that is asked per record.
    const twin = [
      editors[0],
      { id: 'ed-009', displayName: 'Ashish Ranjan', roles: ['reviewer'], active: true },
    ];
    expect(() => parseRoster(twin, 'x.json')).not.toThrow();
  });
});

// --- whole-corpus ---------------------------------------------------------------------

describe('a corpus with nothing wrong', () => {
  it('reports no failures', () => {
    const input = {
      ...base,
      entries: [entry('fixture-a'), entry('fixture-b')],
      palettes: [palette('fixture-p', ['fixture-a', 'fixture-b'])],
    };
    expect(checkCorpus(input, { allowFixtureSlugs: true })).toHaveLength(0);
  });
});

describe('duplicate slugs', () => {
  it('names both files', () => {
    const input = { ...base, entries: [entry('fixture-a'), entry('fixture-a')], palettes: [] };
    const failures = checkCorpus(input, { allowFixtureSlugs: true });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).toMatch(/already used by fixture-a\.json/u);
  });
});

describe('relations must resolve', () => {
  it('reports a dangling relation with its index', () => {
    const input = {
      ...base,
      entries: [
        entry('fixture-a', {
          relations: { related: ['fixture-missing'], complementary: [], historicalVariants: [] },
        }),
      ],
      palettes: [],
    };
    const failures = checkCorpus(input, { allowFixtureSlugs: true });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.path).toBe('relations.related[0]');
  });

  it('accepts one that resolves', () => {
    const input = {
      ...base,
      entries: [
        entry('fixture-a', {
          relations: { related: ['fixture-b'], complementary: [], historicalVariants: [] },
        }),
        entry('fixture-b'),
      ],
      palettes: [],
    };
    expect(checkCorpus(input, { allowFixtureSlugs: true })).toHaveLength(0);
  });
});

describe('palette members must resolve', () => {
  it('reports a member that is not a colour in this corpus', () => {
    const input = {
      ...base,
      entries: [entry('fixture-a')],
      palettes: [palette('fixture-p', ['fixture-a', 'fixture-gone'])],
    };
    const failures = checkCorpus(input, { allowFixtureSlugs: true });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.path).toBe('colors[1].slug');
  });
});

describe('fixture slugs cannot become content', () => {
  it('fails when a fixture- slug appears in the real corpus', () => {
    const input = { ...base, entries: [entry('fixture-a')], palettes: [] };
    const failures = checkCorpus(input);
    expect(failures.some((f) => f.message.includes('reserved for the gate'))).toBe(true);
  });

  it('allows them when the gate is deliberately running its own fixtures', () => {
    const input = { ...base, entries: [entry('fixture-a')], palettes: [] };
    expect(checkCorpus(input, { allowFixtureSlugs: true })).toHaveLength(0);
  });
});

describe('editorial identity across the corpus', () => {
  it('reports an author who reviewed their own entry', () => {
    const input = {
      ...base,
      entries: [
        entry('fixture-a', {
          provenance: {
            ...(entryJson('fixture-a') as { provenance: Record<string, unknown> }).provenance,
            verifiedBy: 'ed-001',
            reviewIndependence: 'independent',
          },
        }),
      ],
      palettes: [],
    };
    const failures = checkCorpus(input, { allowFixtureSlugs: true });
    expect(failures[0]?.message).toMatch(/author and reviewer are the same identity/u);
  });

  it('does not ask the question of a draft, which has no reviewer yet', () => {
    const draftProvenance = {
      ...(entryJson('fixture-a') as { provenance: Record<string, unknown> }).provenance,
      verifiedBy: null,
      reviewIndependence: null,
      verifiedAt: null,
    };
    const input = {
      ...base,
      entries: [entry('fixture-a', { status: 'draft', provenance: draftProvenance })],
      palettes: [],
    };
    expect(checkCorpus(input, { allowFixtureSlugs: true })).toHaveLength(0);
  });
});

describe('the report collects rather than stopping at the first failure', () => {
  it('returns every problem in one run', () => {
    // An editor fixing a batch needs all of them, not the first one ten times over.
    const input = {
      ...base,
      entries: [
        entry('fixture-a', {
          relations: { related: ['nope-one'], complementary: ['nope-two'], historicalVariants: [] },
        }),
        entry('fixture-a'),
      ],
      palettes: [],
    };
    const failures = checkCorpus(input, { allowFixtureSlugs: true });
    expect(failures.length).toBeGreaterThanOrEqual(3);
  });
});
