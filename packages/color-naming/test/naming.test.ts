/**
 * The ranker, the index, the adapter, and criterion 4's structural half.
 *
 * The key-set assertions at the bottom are the ones that matter beyond this package: they are
 * what makes "the output cannot assert identity" a fact rather than a promise, and they are
 * written so that *adding* a field breaks them — shape-assignability would not notice.
 */

import type { Triple } from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import {
  buildNamingIndex,
  compareScored,
  MINIMUM_CANDIDATES,
  NamingError,
  nameColor,
  nameColorExhaustive,
  namingRecordsFrom,
  scoreRecord,
  type NamingRecord,
  type PublishedLabSource,
} from '../src/index.js';

const RECORDS: readonly NamingRecord[] = [
  { id: 'fixture-a', lab: [50, 10, 10] },
  { id: 'fixture-b', lab: [55, 12, 8] },
  { id: 'fixture-c', lab: [20, -30, 40] },
  { id: 'fixture-d', lab: [80, 5, -20] },
];

describe('the candidate floor is FR-7 and ADR-0031 as one mechanism', () => {
  it('is three', () => {
    expect(MINIMUM_CANDIDATES).toBe(3);
  });

  it('refuses a limit below three rather than clamping it', () => {
    // Clamping would hand a caller something other than what they asked for. A caller asking
    // for one answer has a misunderstanding worth surfacing: one answer is an identification.
    const index = buildNamingIndex(RECORDS);
    for (const limit of [0, 1, 2, -1]) {
      expect(() => nameColor(index, [50, 10, 10], { limit })).toThrow(NamingError);
      expect(() => nameColor(index, [50, 10, 10], { limit })).toThrow(
        /single answer is an identification/u,
      );
    }
  });

  it('refuses a non-integer limit', () => {
    const index = buildNamingIndex(RECORDS);
    expect(() => nameColor(index, [50, 10, 10], { limit: 3.5 })).toThrow(NamingError);
  });

  it('defaults to exactly three', () => {
    expect(nameColor(buildNamingIndex(RECORDS), [50, 10, 10]).candidates).toHaveLength(3);
  });

  it('refuses to index a corpus that cannot offer three', () => {
    // The same rule one level up: a corpus of two records turns naming into identification no
    // matter what limit a caller passes, so it fails at build rather than at every query.
    expect(() => buildNamingIndex(RECORDS.slice(0, 2))).toThrow(/cannot answer with 3 ranked/u);
    expect(() => buildNamingIndex([])).toThrow(NamingError);
  });
});

describe('the index refuses input that would fail silently', () => {
  it('rejects a non-finite Lab at BUILD, naming the record', () => {
    // NaN comparisons are false, so such a record would never rank — on every query, forever,
    // with no error anywhere. Caught once, at load, with the id in the message.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const records = [...RECORDS, { id: 'fixture-bad', lab: [bad, 0, 0] as Triple }];
      expect(() => buildNamingIndex(records)).toThrow(/fixture-bad/u);
      expect(() => buildNamingIndex(records)).toThrow(/silently never rank/u);
    }
  });

  it('rejects a duplicate id, because ids are the ranking tiebreak', () => {
    expect(() => buildNamingIndex([...RECORDS, RECORDS[0]!])).toThrow(/appears twice/u);
  });

  it('rejects an empty id and a non-positive bucketStep', () => {
    expect(() => buildNamingIndex([...RECORDS, { id: '', lab: [1, 2, 3] }])).toThrow(NamingError);
    expect(() => buildNamingIndex(RECORDS, { bucketStep: 0 })).toThrow(NamingError);
    expect(() => buildNamingIndex(RECORDS, { bucketStep: -1 })).toThrow(NamingError);
  });

  it('keeps each bucket box tight around its members, not the nominal cell', () => {
    // A huge step so these three share one cell. All coordinates are positive on purpose:
    // `floor(-30 / 1000)` is -1, so a negative coordinate lands in cell -1 rather than 0 — the
    // first version of this test assumed one bucket and got three, which is the bucketing
    // working correctly and the expectation being wrong.
    const clustered: readonly NamingRecord[] = [
      { id: 'fixture-p', lab: [50, 10, 10] },
      { id: 'fixture-q', lab: [55, 12, 8] },
      { id: 'fixture-r', lab: [20, 30, 40] },
    ];
    const index = buildNamingIndex(clustered, { bucketStep: 1000 });
    expect(index.buckets).toHaveLength(1);

    // The nominal cell is [0,1000) on every axis. The box is the hull of the members, which is
    // far smaller — and a smaller box gives a higher lower bound, so the search skips sooner.
    const box = index.buckets[0]!.box;
    expect([box.lMin, box.lMax]).toEqual([20, 55]);
    expect([box.aMin, box.aMax]).toEqual([10, 30]);
    expect([box.bMin, box.bMax]).toEqual([8, 40]);
  });

  it('places negative coordinates in the cell below zero', () => {
    // Documented rather than discovered: floor() is the bucketing rule, and it does not
    // fold negatives toward zero.
    const index = buildNamingIndex(RECORDS, { bucketStep: 1000 });
    expect(index.buckets.length).toBeGreaterThan(1);
  });
});

describe('the comparator is total', () => {
  it('orders by distance, then by id', () => {
    const a = scoreRecord([50, 10, 10], { id: 'fixture-a', lab: [50, 10, 10] });
    const b = scoreRecord([50, 10, 10], { id: 'fixture-b', lab: [50, 10, 10] });
    expect(a.deltaE00).toBe(b.deltaE00);
    expect(compareScored(a, b)).toBeLessThan(0);
    expect(compareScored(b, a)).toBeGreaterThan(0);
    expect(compareScored(a, a)).toBe(0);
  });
});

describe('the result reports what it did', () => {
  it('carries the corpus version through from the index', () => {
    const index = buildNamingIndex(RECORDS, { corpusVersion: '2026.08.1' });
    expect(nameColor(index, [50, 10, 10]).corpusVersion).toBe('2026.08.1');
  });

  it('is null when no version was given, rather than inventing one', () => {
    expect(nameColor(buildNamingIndex(RECORDS), [50, 10, 10]).corpusVersion).toBeNull();
  });

  it('marks the exhaustive path as exhaustive', () => {
    const result = nameColorExhaustive(buildNamingIndex(RECORDS), [50, 10, 10]);
    expect(result.exhaustive).toBe(true);
    expect(result.shortlistSize).toBe(RECORDS.length);
  });

  it('numbers ranks from one', () => {
    expect(
      nameColor(buildNamingIndex(RECORDS), [50, 10, 10]).candidates.map((c) => c.rank),
    ).toEqual([1, 2, 3]);
  });
});

describe('criterion 4, structural half — the output cannot assert identity', () => {
  const result = nameColor(buildNamingIndex(RECORDS, { corpusVersion: '2026.08.1' }), [50, 10, 10]);

  /** Exact key set. Assignability would not notice an ADDED key, which is the risk here. */
  function keysOf(value: object): readonly string[] {
    return Object.keys(value).sort();
  }

  it('a candidate exposes exactly these fields, and no name or match flag', () => {
    expect(keysOf(result.candidates[0]!)).toEqual([
      'deltaE00',
      'id',
      'lab',
      'rank',
      'similarityPercent',
    ]);
  });

  it('a result exposes exactly these fields', () => {
    expect(keysOf(result)).toEqual([
      'bucketsVisited',
      'candidates',
      'corpusVersion',
      'exhaustive',
      'query',
      'shortlistSize',
    ]);
  });

  it('the decoy — an object carrying exactMatch is rejected by the same helper', () => {
    // Without this the two assertions above could be passing because `keysOf` is broken rather
    // than because the shape is right [[a-decoy-that-is-not-broken-proves-nothing]].
    const withClaim = { ...result.candidates[0]!, exactMatch: true };
    expect(keysOf(withClaim)).not.toEqual(['deltaE00', 'id', 'lab', 'rank', 'similarityPercent']);
    expect(keysOf(withClaim)).toContain('exactMatch');
  });

  it('exposes an id rather than a name — joining it is the API projection', () => {
    expect(result.candidates[0]!.id).toBe('fixture-a');
    expect(Object.keys(result.candidates[0]!)).not.toContain('name');
  });
});

describe('the corpus adapter', () => {
  const bundle: PublishedLabSource = {
    label: '2026.08.1',
    entries: [
      { entry: { slug: 'fixture-one' }, derived: { lab: [50, 10, 10] } },
      { entry: { slug: 'fixture-two' }, derived: { lab: [55, 12, 8] } },
      { entry: { slug: 'fixture-three' }, derived: { lab: [20, -30, 40] } },
    ],
  };

  it('reads slugs as ids and the published lab as-is', () => {
    const { records, corpusVersion } = namingRecordsFrom(bundle);
    expect(corpusVersion).toBe('2026.08.1');
    expect(records.map((r) => r.id)).toEqual(['fixture-one', 'fixture-two', 'fixture-three']);
    expect(records[0]!.lab).toEqual([50, 10, 10]);
  });

  it('does NOT re-derive — the published value wins even when it disagrees with the engine', () => {
    // The decoy: a bundle whose derived.lab is deliberately wrong for its colour. A "helpful"
    // re-derivation would silently return today's engine's answer for an old version, which is
    // exactly what FR-10 forbids. Comparing stored against current is the CONTENT GATE's job,
    // and a read that corrected its input would make that check unfalsifiable.
    const tampered: PublishedLabSource = {
      label: '2026.08.1',
      entries: bundle.entries.map((e, i) =>
        i === 0 ? { ...e, derived: { lab: [1, 2, 3] as Triple } } : e,
      ),
    };
    expect(namingRecordsFrom(tampered).records[0]!.lab).toEqual([1, 2, 3]);
  });

  it('refuses a bundle with no label, which would leave the envelope unresolvable', () => {
    expect(() => namingRecordsFrom({ ...bundle, label: '' })).toThrow(NamingError);
  });

  it('feeds straight into an index', () => {
    const { records, corpusVersion } = namingRecordsFrom(bundle);
    const index = buildNamingIndex(records, { corpusVersion });
    expect(nameColor(index, [50, 10, 10]).candidates[0]!.id).toBe('fixture-one');
  });
});
