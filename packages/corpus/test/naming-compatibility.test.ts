/**
 * The published bundle stays readable by the naming engine.
 *
 * `@irodora/color-naming` describes what it needs from a bundle **structurally**
 * (`PublishedLabSource`) rather than importing anything from here. That keeps an engine package
 * free of a non-engine dependency — and it is not optional: `@irodora/color-core` is the facade
 * and already depends on `color-naming`, so `color-naming → corpus → color-core → color-naming`
 * is a cycle, which `pnpm typecheck` reports immediately.
 *
 * The cost of a structural contract is that nothing links the two shapes together, so this file
 * is the link. It lives **here** rather than in `color-naming` for two reasons: the dependency
 * direction only works this way, and the schema is this package's contract to keep — if
 * `derived.lab` is ever renamed or removed, the failure belongs to whoever changed it (E-013).
 */

import { buildNamingIndex, nameColor, namingRecordsFrom } from '@irodora/color-naming';
import type { PublishedLabSource } from '@irodora/color-naming';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  parseEntry,
  publishVersion,
  type CorpusEntry,
  type DigestFn,
  type VersionBundle,
} from '../src/index.js';

const sha256: DigestFn = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function entryJson(slug: string, xyz: { x: number; y: number; z: number }): unknown {
  return {
    slug,
    classification: 'japanese-inspired',
    name: { kanji: '静石', kana: 'しずいし', romaji: 'shizu-ishi', en: 'Fixture Slate' },
    color: { xyz, measuredUnder: 'D65', adaptation: null, sourceHex: null },
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
      description_en: 'A fixture colour for the naming-compatibility check.',
      description_ja: '命名エンジンとの整合を確認するための試験用の色。',
      historicalNote_en: null,
      contemporaryNote_en: null,
      fashionUse: null,
    },
    provenance: {
      source: 'Irodora editorial curation, fixture set',
      sourceId: 'FIX-ED-001',
      sourceType: 'editorial',
      publisher: null,
      publishedYear: null,
      rightsHolder: 'Irodora',
      sourceLicence: 'Proprietary — Irodora original work',
      sourceUrl: null,
      derivation:
        'Editorial: a fixture value, present to exercise a contract rather than to be a colour.',
      authoredBy: 'ed-001',
      authoredAt: '2026-08-11',
      verifiedBy: 'ed-002',
      verifiedAt: '2026-08-13',
      editorialNotes: 'A fixture. Not a colour claim.',
    },
    relations: { related: [], complementary: [], historicalVariants: [] },
    unknowns: {
      'color.adaptation': 'measured under D65',
      'color.sourceHex': 'derived, not transcribed',
      'taxonomy.era': 'a fixture',
      'taxonomy.material': 'a fixture',
      'taxonomy.season': 'not assigned',
      'editorial.historicalNote_en': 'no history is claimed',
      'editorial.contemporaryNote_en': 'not written',
      'editorial.fashionUse': 'not assigned',
      'provenance.publisher': 'our own work',
      'provenance.publishedYear': 'our own work',
      'provenance.sourceUrl': 'not published externally',
    },
    status: 'published',
    versionId: '2026.08.1',
  };
}

const entries: readonly CorpusEntry[] = [
  parseEntry(entryJson('fixture-alpha', { x: 0.1284, y: 0.1421, z: 0.1657 }), 'a.json'),
  parseEntry(entryJson('fixture-beta', { x: 0.2, y: 0.21, z: 0.19 }), 'b.json'),
  parseEntry(entryJson('fixture-gamma', { x: 0.4, y: 0.42, z: 0.45 }), 'c.json'),
];

const bundle: VersionBundle = publishVersion(
  '2026.08.1',
  entries,
  [],
  { engine: '0.1.0', corpusSchemaVersion: '1.0.0', publishedAt: '2026-08-18' },
  sha256,
);

describe('a VersionBundle satisfies PublishedLabSource', () => {
  it('is assignable, which is what makes the structural contract a contract', () => {
    // The assignment IS the assertion: if `derived.lab` were renamed, removed, or retyped, this
    // line stops compiling and `pnpm typecheck` fails in the package that made the change.
    const asSource: PublishedLabSource = bundle;
    expect(asSource.label).toBe('2026.08.1');
    expect(asSource.entries).toHaveLength(3);
  });

  it('the decoy — a bundle-shaped object WITHOUT derived.lab is not assignable', () => {
    // Without this, the assertion above could be passing because `PublishedLabSource` demands
    // nothing at all [[a-decoy-that-is-not-broken-proves-nothing]]. `tsc` errors on an unused
    // `@ts-expect-error`, so if the type ever stopped requiring `derived.lab` this line goes red.
    const missingLab = {
      label: '2026.08.1',
      entries: [{ entry: { slug: 'fixture-alpha' }, derived: {} }],
    };
    // @ts-expect-error -- `derived.lab` is required by PublishedLabSource
    const bad: PublishedLabSource = missingLab;
    expect(bad.entries).toHaveLength(1);
  });

  it('feeds a real bundle through the adapter into a working index', () => {
    const { records, corpusVersion } = namingRecordsFrom(bundle);
    expect(corpusVersion).toBe('2026.08.1');
    expect(records.map((r) => r.id)).toEqual(['fixture-alpha', 'fixture-beta', 'fixture-gamma']);

    const index = buildNamingIndex(records, { corpusVersion });
    const target = bundle.entries[0]?.derived.lab;
    expect(target).toBeDefined();

    const result = nameColor(index, target as [number, number, number]);
    expect(result.candidates[0]?.id).toBe('fixture-alpha');
    expect(result.candidates[0]?.deltaE00).toBe(0);
    expect(result.corpusVersion).toBe('2026.08.1');
  });

  it('carries the PUBLISHED lab through, not a re-derivation', () => {
    // FR-10: an old version must resolve to the values it held. The adapter reads
    // `derived.lab`; the content gate is what compares stored against current (E-001).
    const { records } = namingRecordsFrom(bundle);
    for (const [i, record] of records.entries())
      expect(record.lab).toEqual(bundle.entries[i]?.derived.lab);
  });
});
