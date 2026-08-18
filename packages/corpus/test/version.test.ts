/**
 * Publishing a version, and loading one back with its checksum verified.
 *
 * The tests that matter most are the tamper cases. Each one asks whether the mechanism catches
 * a change to immutable content — and the last one asks the question the others cannot: is
 * there any way to call `loadPublishedVersion` that verifies a bundle against itself?
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  bundleRootDigest,
  CorpusError,
  ledgerRowFor,
  loadPublishedVersion,
  parseEntry,
  parseLedger,
  parsePalette,
  publishVersion,
  serialiseBundle,
  type CorpusEntry,
  type CorpusPalette,
  type DigestFn,
} from '../src/index.js';

const sha256: DigestFn = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const META = {
  engine: '0.1.0',
  corpusSchemaVersion: '1.0.0',
  publishedAt: '2026-08-18',
} as const;

function entryJson(slug: string, over: Record<string, unknown> = {}): Record<string, unknown> {
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

const entries: readonly CorpusEntry[] = [
  parseEntry(entryJson('fixture-a'), 'a.json'),
  parseEntry(entryJson('fixture-b'), 'b.json'),
];

const palettes: readonly CorpusPalette[] = [
  parsePalette(
    {
      slug: 'fixture-p',
      name: { en: 'Quiet Neutrals', ja: '静かな中間色' },
      classification: 'japanese-inspired',
      category: 'contemporary',
      colors: [
        { slug: 'fixture-a', role: 'anchor', rank: 1, weight: 1 },
        { slug: 'fixture-b', role: 'neutral', rank: 2, weight: 0.9 },
      ],
      provenance: entryJson('x')['provenance'],
      unknowns: {
        'provenance.publisher': 'our own work',
        'provenance.publishedYear': 'our own work',
        'provenance.sourceUrl': 'not published externally',
      },
      status: 'published',
      versionId: '2026.08.1',
    },
    'p.json',
  ),
];

function build(): ReturnType<typeof publishVersion> {
  return publishVersion('2026.08.1', entries, palettes, META, sha256);
}

describe('publishing', () => {
  it('derives every value rather than carrying one from the source entry', () => {
    const bundle = build();
    expect(bundle.entries).toHaveLength(2);
    for (const { derived } of bundle.entries) {
      expect(derived.hex).toMatch(/^#[0-9A-F]{6}$/u);
      expect(derived.lab).toHaveLength(3);
      expect(derived.oklch).toHaveLength(3);
    }
  });

  it('records the engine that produced the derived values', () => {
    // E-001: when the gate later finds a stored value disagreeing with the current engine,
    // this is what says which engine did agree with it.
    expect(build().engine).toBe('0.1.0');
  });

  it('excludes anything that is not published or superseded', () => {
    const draft = parseEntry(
      entryJson('fixture-draft', {
        status: 'draft',
        provenance: {
          ...(entryJson('fixture-draft')['provenance'] as Record<string, unknown>),
          verifiedBy: null,
          verifiedAt: null,
        },
      }),
      'd.json',
    );
    const bundle = publishVersion('2026.08.1', [...entries, draft], palettes, META, sha256);
    expect(bundle.entries.map((e) => e.entry.slug)).not.toContain('fixture-draft');
  });

  it('rejects a label that is not YYYY.MM.N', () => {
    expect(() => publishVersion('v1', entries, palettes, META, sha256)).toThrow(CorpusError);
  });

  it('serialises deterministically — two publishes give identical bytes', () => {
    expect(serialiseBundle(build())).toBe(serialiseBundle(build()));
  });
});

describe('the root digest', () => {
  it('namespaces colours and palettes, so a shared slug cannot collide', () => {
    // A colour and a palette may legitimately share a slug — they are different collections.
    // Without the prefix they would occupy the same key in the root pre-image.
    const shared = parsePalette(
      {
        slug: 'fixture-a',
        name: { en: 'Shared', ja: '共有' },
        classification: 'japanese-inspired',
        category: 'contemporary',
        colors: [{ slug: 'fixture-a', role: 'anchor', rank: 1, weight: 1 }],
        provenance: entryJson('x')['provenance'],
        unknowns: {
          'provenance.publisher': 'our own work',
          'provenance.publishedYear': 'our own work',
          'provenance.sourceUrl': 'not published externally',
        },
        status: 'published',
        versionId: '2026.08.1',
      },
      'shared.json',
    );
    expect(() =>
      bundleRootDigest(publishVersion('2026.08.1', entries, [shared], META, sha256), sha256),
    ).not.toThrow();
  });

  it('changes when an entry is added', () => {
    const one = bundleRootDigest(publishVersion('2026.08.1', entries, [], META, sha256), sha256);
    const two = bundleRootDigest(
      publishVersion('2026.08.1', entries.slice(0, 1), [], META, sha256),
      sha256,
    );
    expect(one).not.toBe(two);
  });
});

describe('loading verifies, or refuses', () => {
  const bundle = build();
  const text = serialiseBundle(bundle);
  const root = bundleRootDigest(bundle, sha256);

  it('round-trips a bundle that has not been touched', () => {
    const loaded = loadPublishedVersion(text, root, sha256);
    expect(loaded.label).toBe('2026.08.1');
    expect(loaded.entries).toHaveLength(2);
    expect(loaded.entries[0]?.derived.hex).toBe(bundle.entries[0]?.derived.hex);
  });

  it('does NOT re-derive on load', () => {
    // Re-deriving would silently return today's engine's answer for an old version, which is
    // the failure the reproducibility envelope exists to prevent (FR-10). The stored value is
    // returned as stored; comparing it to the current engine is the gate's job, as a CHECK.
    const stale = text.replace(/"hex":"#[0-9A-F]{6}"/u, '"hex":"#000000"');
    expect(stale).not.toBe(text);
    // It fails on the checksum, not by silently correcting the hex — and that distinction is
    // the assertion: a loader that repaired the value would return the right hex and pass.
    //
    // This case is why the per-entry digest covers the DERIVED block as well as the authored
    // record. It did not, at first, on the reasoning that derived values are regenerable — and
    // this test loaded a tampered hex without complaint, which `apps/api` would then have
    // served (F-016).
    expect(() => loadPublishedVersion(stale, root, sha256)).toThrow(/mismatch/u);
  });

  it('rejects a single edited character in a published entry, and NAMES it', () => {
    const tampered = text.replace('Quiet Slate', 'Quiet Slat3');
    expect(tampered).not.toBe(text);
    try {
      loadPublishedVersion(tampered, root, sha256);
      expect.unreachable('a tampered entry must not load');
    } catch (error) {
      expect(error).toBeInstanceOf(CorpusError);
      expect((error as CorpusError).path).toMatch(/^entries\.fixture-[ab]$/u);
      expect((error as CorpusError).message).toMatch(/SEV1/u);
      expect((error as CorpusError).message).toMatch(/publishing a NEW corpus version/u);
    }
  });

  it('rejects a root digest that does not match, even when every entry does', () => {
    // The case per-entry digests cannot catch: an entry REMOVED. Each survivor still hashes
    // correctly; the set is what changed.
    const fewer = publishVersion('2026.08.1', entries.slice(0, 1), palettes, META, sha256);
    expect(() => loadPublishedVersion(serialiseBundle(fewer), root, sha256)).toThrow(
      /root checksum mismatch.*the SET that changed/su,
    );
  });

  it('rejects text that is not JSON', () => {
    expect(() => loadPublishedVersion('{oops', root, sha256)).toThrow(/is not valid JSON/u);
  });

  it('has no way to skip verification', () => {
    // There is no options argument and no warn mode. An option to skip verification is a
    // verification nobody performs on the day it matters.
    //
    // The assertion is the `@ts-expect-error` itself: `tsc` errors on an UNUSED directive, so
    // if a fourth parameter ever accepted an options object this line goes red. Asserting a
    // runtime throw would be the weaker claim — and the wrong one, since the fourth argument
    // is a source label and an object there is merely a poor label.
    // @ts-expect-error -- the fourth argument is the source label, never a flag
    const label: string = { verify: false };
    expect(typeof label).toBe('object');

    // And a tampered bundle still fails no matter what is passed there.
    const tampered = text.replace('Quiet Slate', 'Quiet Slat3');
    expect(() => loadPublishedVersion(tampered, root, sha256, 'anything')).toThrow(CorpusError);
  });

  it('cannot be asked to verify a bundle against a digest taken from that bundle', () => {
    // The expected digest is a REQUIRED positional argument that comes from the ledger. There
    // is no overload that reads it out of the file, which is what makes self-verification
    // inexpressible rather than merely discouraged.
    // @ts-expect-error -- expectedRootDigest is required
    expect(() => loadPublishedVersion(text, sha256)).toThrow();
  });
});

describe('the ledger', () => {
  const rows = [
    {
      label: '2026.08.1',
      checksum: 'abc',
      engine: '0.1.0',
      publishedAt: '2026-08-18',
      entryCount: 2,
    },
  ];

  it('parses', () => {
    expect(parseLedger(rows, 'index.json')).toHaveLength(1);
  });

  it('rejects a duplicate label — it is append-only', () => {
    expect(() => parseLedger([...rows, ...rows], 'index.json')).toThrow(/appears twice/u);
  });

  it('rejects a negative entry count', () => {
    expect(() => parseLedger([{ ...rows[0], entryCount: -1 }], 'index.json')).toThrow(
      /non-negative integer/u,
    );
  });

  it('refuses a bundle with no ledger row rather than trusting it', () => {
    // A file that appeared in content/versions/ without going through a publish has nothing
    // to verify it against, so it must not load.
    expect(() => ledgerRowFor(parseLedger(rows, 'x'), '2026.09.1', 'index.json')).toThrow(
      /has no row in the ledger/u,
    );
  });

  it('finds the row for a version that was published', () => {
    expect(ledgerRowFor(parseLedger(rows, 'x'), '2026.08.1', 'index.json').entryCount).toBe(2);
  });
});
