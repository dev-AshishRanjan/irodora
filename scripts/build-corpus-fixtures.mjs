/**
 * Build the gate-11 fixture corpora.
 *
 * `packages/corpus/test/fixtures/` holds one **valid** corpus that genuinely passes, and one
 * directory per rule holding a corpus broken in exactly that way. Gate 11 runs all of them on
 * every invocation, so the number of rules it exercises is never zero even while
 * `content/colors/` is empty (F-012 fills it).
 *
 * They are generated rather than hand-written for one reason: each invalid corpus must differ
 * from the valid one in **exactly one** way. Eighteen hand-maintained copies drift, and a
 * fixture that is broken in two ways passes for the wrong rule without anyone noticing
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * The output is committed. This script is how it is regenerated and the record of what each
 * mutation is; it is not run by the gate.
 *
 * ```
 * node scripts/build-corpus-fixtures.mjs
 * ```
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCorpusPackage, ROOT, sha256 } from './corpus-io.mjs';

const OUT = join(ROOT, 'packages', 'corpus', 'test', 'fixtures');

// --- the base records -----------------------------------------------------------------

const PROVENANCE = {
  source: 'Irodora editorial curation, fixture set',
  sourceId: 'FIX-ED-001',
  sourceType: 'editorial',
  publisher: null,
  publishedYear: null,
  rightsHolder: 'Irodora',
  sourceLicence: 'Proprietary — Irodora original work',
  sourceUrl: null,
  derivation: 'Editorial: a fixture value, chosen to exercise the gate rather than to be a colour.',
  authoredBy: 'ed-001',
  authoredAt: '2026-08-11',
  verifiedBy: 'ed-002',
  verifiedAt: '2026-08-13',
  editorialNotes: 'A fixture. Not a colour claim, and never published.',
};

const UNKNOWNS = {
  'color.adaptation': 'measured under D65, so no adaptation was applied',
  'color.sourceHex': 'a fixture value, not transcribed from a source',
  'taxonomy.era': 'a fixture, so it belongs to no era',
  'taxonomy.material': 'a fixture, tied to no material',
  'taxonomy.season': 'not assigned for a fixture',
  'editorial.historicalNote_en': 'no history is claimed for a fixture',
  'editorial.contemporaryNote_en': 'not written for a fixture',
  'editorial.fashionUse': 'not assigned for a fixture',
  'provenance.publisher': 'our own work, so there is no external publisher',
  'provenance.publishedYear': 'our own work, so there is no publication date',
  'provenance.sourceUrl': 'not published externally',
};

function entry(slug, over = {}) {
  return {
    slug,
    classification: 'japanese-inspired',
    name: { kanji: '静石', kana: 'しずいし', romaji: 'shizu-ishi', en: 'Fixture Slate' },
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
      description_en: 'A fixture colour, present so the content gate has something to check.',
      description_ja: 'ゲートを検証するための試験用の色。',
      historicalNote_en: null,
      contemporaryNote_en: null,
      fashionUse: null,
    },
    provenance: { ...PROVENANCE },
    relations: { related: [], complementary: [], historicalVariants: [] },
    unknowns: { ...UNKNOWNS },
    status: 'published',
    versionId: '2026.08.1',
    ...over,
  };
}

const PALETTE = {
  slug: 'fixture-quiet',
  name: { en: 'Fixture Quiet', ja: '試験用の静かな色' },
  classification: 'japanese-inspired',
  category: 'contemporary',
  colors: [
    { slug: 'fixture-a', role: 'anchor', rank: 1, weight: 1 },
    { slug: 'fixture-b', role: 'neutral', rank: 2, weight: 0.9 },
  ],
  provenance: { ...PROVENANCE },
  unknowns: {
    'provenance.publisher': 'our own work, so there is no external publisher',
    'provenance.publishedYear': 'our own work, so there is no publication date',
    'provenance.sourceUrl': 'not published externally',
  },
  status: 'published',
  versionId: '2026.08.1',
};

const EDITORS = [
  { id: 'ed-001', displayName: 'Fixture Author', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-002', displayName: 'Fixture Reviewer', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-003', displayName: 'Fixture Author', roles: ['reviewer'], active: true },
  { id: 'ed-004', displayName: 'Fixture Draftsman', roles: ['author'], active: true },
];

const REGISTER = [
  '# Fixture source register',
  '',
  'Not the real register. Shaped exactly like `licensing-and-provenance.md` §5 so the same',
  'parser reads it, and holding one fixture source so a fixture entry can cite something.',
  '',
  '## 5. Source register',
  '',
  '| ID | Source | Type | Rights holder | Licence | Cleared | Notes |',
  '|---|---|---|---|---|---|---|',
  '| FIX-ED-001 | Irodora editorial curation, fixture set | editorial | Irodora | Proprietary | 2026-08-11 | Fixture only |',
  '',
].join('\n');

// --- the mutations ---------------------------------------------------------------------

/** Each: a directory name, the regex the gate must fail with, and what it changes. */
const MUTATIONS = [
  {
    dir: 'missing-derivation',
    expect: 'provenance\\.derivation',
    apply: (c) => {
      delete c.entries[0].provenance.derivation;
    },
  },
  {
    dir: 'missing-licence',
    expect: 'provenance\\.sourceLicence',
    apply: (c) => {
      delete c.entries[0].provenance.sourceLicence;
    },
  },
  {
    dir: 'published-without-reviewer',
    expect: 'cannot reach "published" without a recorded reviewer',
    apply: (c) => {
      c.entries[0].provenance.verifiedBy = null;
    },
  },
  {
    dir: 'author-is-reviewer',
    expect: 'author and reviewer are the same identity',
    apply: (c) => {
      c.entries[0].provenance.verifiedBy = 'ed-001';
    },
  },
  {
    dir: 'reviewer-is-the-same-person',
    expect: 'different ids for the same person',
    apply: (c) => {
      // ed-003 is a different id and the same displayName as ed-001. This is the case a
      // free-text name comparison would have passed, and the reason identity is a roster id.
      c.entries[0].provenance.verifiedBy = 'ed-003';
    },
  },
  {
    dir: 'our-curation-marked-historical',
    expect: 'OUR OWN CURATION and cannot be classified "historical"',
    apply: (c) => {
      c.entries[0].classification = 'historical';
    },
  },
  {
    dir: 'historical-without-a-date',
    expect: 'DATED primary source',
    apply: (c) => {
      c.entries[0].classification = 'historical';
      c.entries[0].provenance.sourceType = 'publication';
    },
  },
  {
    dir: 'authored-derived-value',
    expect: 'is a DERIVED value and cannot be authored',
    apply: (c) => {
      c.entries[0].color.hex = '#526A6B';
    },
  },
  {
    dir: 'palette-without-an-anchor',
    expect: 'A palette without an anchor is a colour list',
    apply: (c) => {
      c.palettes[0].colors[0].role = 'accent';
    },
  },
  {
    dir: 'dangling-relation',
    expect: 'is not a colour in this corpus',
    apply: (c) => {
      c.entries[0].relations.related = ['fixture-does-not-exist'];
    },
  },
  {
    dir: 'duplicate-slug',
    expect: 'is already used by',
    apply: (c) => {
      c.entries[1].slug = 'fixture-a';
      // The palette must go too. Renaming fixture-b leaves the palette pointing at a slug that
      // no longer exists, so the corpus would be broken in TWO ways and fail on the dangling
      // relation instead — passing for a rule this fixture is not about. The gate caught this
      // on the first run, which is the fixture set doing its job to itself.
      c.palettes = [];
    },
  },
  {
    dir: 'unregistered-source',
    expect: 'is not in the source register',
    apply: (c) => {
      c.entries[0].provenance.sourceId = 'FIX-ED-999';
    },
  },
  {
    dir: 'source-text-disagrees-with-the-register',
    expect: 'would display one provenance and be licensed under another',
    apply: (c) => {
      c.entries[0].provenance.source = 'A completely different publication';
    },
  },
  {
    dir: 'null-with-no-reason',
    expect: 'is null with no reason',
    apply: (c) => {
      delete c.entries[0].unknowns['taxonomy.material'];
    },
  },
  {
    dir: 'reason-for-a-field-that-is-not-null',
    expect: 'but that field is not null',
    apply: (c) => {
      c.entries[0].unknowns['taxonomy.family'] = 'we never looked';
    },
  },
  {
    dir: 'unknown-field',
    expect: 'unknown field',
    apply: (c) => {
      c.entries[0].taxonomy.temprature = 'cool';
    },
  },
  {
    dir: 'classification-outside-the-five',
    expect: 'required and displayed \\(FR-23\\)',
    apply: (c) => {
      c.entries[0].classification = 'inspired';
    },
  },
  {
    dir: 'negative-tristimulus',
    expect: 'XYZ cannot be negative',
    apply: (c) => {
      c.entries[0].color.xyz.x = -0.1;
    },
  },
];

// --- write ------------------------------------------------------------------------------

function baseCorpus() {
  return {
    entries: [entry('fixture-a'), entry('fixture-b')],
    palettes: [structuredClone(PALETTE)],
    editors: structuredClone(EDITORS),
  };
}

function writeCorpus(dir, corpus) {
  mkdirSync(join(dir, 'colors'), { recursive: true });
  mkdirSync(join(dir, 'palettes'), { recursive: true });

  // Filenames are de-duplicated rather than taken straight from the slug. The duplicate-slug
  // fixture needs TWO FILES carrying the SAME slug, which is the only way that rule can be
  // violated on disk — naming by slug alone silently wrote one file and the fixture stopped
  // being invalid at all. The gate caught that too, on the run after it caught the first one.
  const used = new Set();
  for (const e of corpus.entries) {
    let name = `${e.slug}.json`;
    for (let n = 2; used.has(name); n += 1) name = `${e.slug}-${String(n)}.json`;
    used.add(name);
    writeFileSync(join(dir, 'colors', name), `${JSON.stringify(e, null, 2)}\n`, 'utf8');
  }
  for (const p of corpus.palettes)
    writeFileSync(
      join(dir, 'palettes', `${p.slug}.json`),
      `${JSON.stringify(p, null, 2)}\n`,
      'utf8',
    );
  writeFileSync(join(dir, 'editors.json'), `${JSON.stringify(corpus.editors, null, 2)}\n`, 'utf8');
}

rmSync(join(OUT, 'valid'), { recursive: true, force: true });
rmSync(join(OUT, 'invalid'), { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const valid = baseCorpus();
writeCorpus(join(OUT, 'valid'), valid);

// --- the valid corpus gets a PUBLISHED VERSION ------------------------------------------
//
// Without this, gate 11's entire published-bundle half — checksum verification, the ledger,
// and the E-001 destination re-check against the current engine — is unreachable code. There
// are no real bundles until F-012, so a fixture is the only thing that can execute those
// rules, and the mutation proof is the only thing that can attack them.
{
  const {
    publishVersion,
    bundleRootDigest,
    serialiseBundle,
    parseEntry,
    parsePalette,
    CORPUS_SCHEMA_VERSION,
  } = await loadCorpusPackage();
  const { ENGINE_VERSION } = await import(
    (await import('node:url')).pathToFileURL(
      join(ROOT, 'packages', 'color-spaces', 'dist', 'index.js'),
    ).href
  );

  const label = '2026.08.1';
  const bundle = publishVersion(
    label,
    valid.entries.map((e) => parseEntry(e, `${e.slug}.json`)),
    valid.palettes.map((p) => parsePalette(p, `${p.slug}.json`)),
    {
      engine: ENGINE_VERSION,
      corpusSchemaVersion: CORPUS_SCHEMA_VERSION,
      // Fixed, never `new Date()`: a generated fixture whose bytes change every run would make
      // its own checksum meaningless and every diff noise.
      publishedAt: '2026-08-18',
    },
    sha256,
  );

  const versions = join(OUT, 'valid', 'versions');
  mkdirSync(versions, { recursive: true });
  writeFileSync(join(versions, `${label}.json`), serialiseBundle(bundle), 'utf8');
  writeFileSync(
    join(versions, 'index.json'),
    `${JSON.stringify(
      [
        {
          label,
          checksum: bundleRootDigest(bundle, sha256),
          engine: ENGINE_VERSION,
          publishedAt: '2026-08-18',
          entryCount: bundle.entries.length,
        },
      ],
      null,
      2,
    )}\n`,
    'utf8',
  );
}

const expected = {};
for (const { dir, expect, apply } of MUTATIONS) {
  const corpus = baseCorpus();
  apply(corpus);
  writeCorpus(join(OUT, 'invalid', dir), corpus);
  expected[dir] = expect;
}

writeFileSync(
  join(OUT, 'invalid', 'expected.json'),
  `${JSON.stringify(expected, null, 2)}\n`,
  'utf8',
);
writeFileSync(join(OUT, 'register.md'), REGISTER, 'utf8');

writeFileSync(
  join(OUT, 'README.md'),
  [
    '# Corpus gate fixtures',
    '',
    '**Nothing in this directory is corpus content.** These are test corpora for gate 11',
    '(`scripts/verify-content.mjs`), and no value here is a colour claim about anything.',
    '',
    'Three separate things keep them from being mistaken for content: they live under',
    "`packages/`, the gate's corpus scan globs `content/` only, and every slug begins",
    '`fixture-` — with the gate failing if a `fixture-` slug ever appears under `content/`.',
    'A convention plus a check, rather than a convention.',
    '',
    '## Layout',
    '',
    '```',
    'valid/            a corpus that genuinely PASSES — the baseline every mutation starts from',
    'invalid/<rule>/   the same corpus, broken in exactly one way',
    'invalid/expected.json   rule directory -> the message the gate must produce',
    'register.md       a source register shaped like licensing-and-provenance.md section 5',
    '```',
    '',
    '## Why they exist',
    '',
    'F-011 ships the gate; F-012 ships the entries. A gate that passes because there is nothing',
    'to check is failing open. Running these on every invocation means the number of rules the',
    'gate exercises is never zero, and `scripts/verify-content-proof.mjs` mutates the *valid*',
    'corpus to prove the gate still discriminates.',
    '',
    '## Regenerating',
    '',
    'Generated by [`scripts/build-corpus-fixtures.mjs`](../../../../scripts/build-corpus-fixtures.mjs),',
    'which is also the record of what each mutation changes. Each invalid corpus differs from',
    '`valid/` in exactly one way — hand-maintained copies drift, and a fixture broken in two',
    'ways passes for the wrong rule without anyone noticing.',
    '',
    '```bash',
    'node scripts/build-corpus-fixtures.mjs',
    '```',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Wrote valid/ and ${String(MUTATIONS.length)} invalid corpora to ${OUT}`);
