/**
 * Criterion 3 — the two-stage result is identical to a brute-force scan.
 *
 * This is the feature. Everything in `bound.ts`, `buckets.ts` and `name.ts` exists to make this
 * suite pass for a reason rather than by luck, and the two decoys at the bottom are what prove
 * the suite can fail at all [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * "The full corpus" is read as *the full set of records the index was built from*, because
 * `content/colors/` is empty until F-012. The count is printed on every run so nobody can read a
 * green suite as evidence that any real colour was ranked.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { Triple } from '@irodora/color-spaces';
import { differenceCiede2000 } from 'culori';
import { describe, expect, it } from 'vitest';
import {
  buildNamingIndex,
  nameColor,
  nameColorExhaustive,
  type NamingRecord,
} from '../src/index.js';
import { syntheticCorpus, syntheticQueries } from './synthetic.js';

const CORPORA = [
  syntheticCorpus('small', 20260901, 50),
  syntheticCorpus('medium', 20260902, 500),
  syntheticCorpus('large', 20260903, 5000),
] as const;

const QUERIES = syntheticQueries(20260904, 120);

/** The candidate list reduced to what must match: order, ids and distances. */
function shape(result: ReturnType<typeof nameColor>): string {
  return result.candidates.map((c) => `${c.id}@${c.deltaE00.toExponential(15)}`).join('|');
}

describe('the corpora this suite actually runs on', () => {
  it('is synthetic, and says so', () => {
    // Printed rather than merely asserted: a reader of CI output must not mistake this suite's
    // green for evidence that a real corpus entry was ranked.
    const total = CORPORA.reduce((n, c) => n + c.records.length, 0);
    console.log(
      `  equivalence suite: ${String(total)} SYNTHETIC records across ${String(CORPORA.length)} ` +
        'corpora, seeds ' +
        CORPORA.map((c) => c.seed).join(', ') +
        '. Real corpus entries available: 0 (F-012 is blocked on OQ-4/OQ-5).',
    );
    // The generator's strata do not sum to the requested size exactly — each takes a share and
    // the clusters and duplicates are computed from it. What matters is that the suite runs on
    // thousands of records, not on a number that happens to be round.
    expect(total).toBeGreaterThan(4000);
    for (const corpus of CORPORA) expect(corpus.records.length).toBeGreaterThanOrEqual(40);
  });

  it('contains exact duplicates, so the tiebreak has something to break', () => {
    for (const corpus of CORPORA) {
      const keys = corpus.records.map((r) => r.lab.join(','));
      expect(new Set(keys).size).toBeLessThan(keys.length);
    }
  });
});

describe('two-stage === brute force', () => {
  for (const corpus of CORPORA)
    it(`${corpus.name} (${String(corpus.records.length)} records)`, () => {
      const index = buildNamingIndex(corpus.records);
      for (const query of QUERIES)
        expect(shape(nameColor(index, query, { limit: 5 }))).toBe(
          shape(nameColorExhaustive(index, query, { limit: 5 })),
        );
    });

  it('holds at every limit from the minimum upward', () => {
    const index = buildNamingIndex(CORPORA[1].records);
    for (const limit of [3, 4, 7, 25])
      for (const query of QUERIES.slice(0, 30))
        expect(shape(nameColor(index, query, { limit }))).toBe(
          shape(nameColorExhaustive(index, query, { limit })),
        );
  });

  it('is independent of bucketStep — the claim that correctness is not tuned', () => {
    // One bucket (step 1e6) IS a full scan; step 1 is one cell per Lab unit. If any of these
    // disagreed, the stopping rule would be depending on the tuning parameter.
    const reference = buildNamingIndex(CORPORA[1].records, { bucketStep: 5 });
    for (const bucketStep of [1, 2, 25, 1e6]) {
      const index = buildNamingIndex(CORPORA[1].records, { bucketStep });
      for (const query of QUERIES.slice(0, 40))
        expect(shape(nameColor(index, query, { limit: 5 }))).toBe(
          shape(nameColorExhaustive(reference, query, { limit: 5 })),
        );
    }
  });

  it('agrees with culori, a third independent CIEDE2000 implementation', () => {
    // Guards against the whole suite agreeing with a defect in our own deltaE00: both paths
    // call it, so both would be wrong together.
    const diff = differenceCiede2000();
    const index = buildNamingIndex(CORPORA[0].records);
    // `lab65`, NOT `lab`: culori's `lab` mode is **D50** and ours is D65 (ADR-0003). Using the
    // wrong one made this comparison disagree by 0.81 ΔE00 — a real difference produced by a
    // real mistake in the test rather than in the engine, and a reminder that a cross-check
    // against a second implementation is only a check if both are asked the same question.
    // `packages/color-difference/test/golden/ciede2000.test.ts` makes the same call the same way.
    const toCulori = (lab: Triple): { mode: 'lab65'; l: number; a: number; b: number } => ({
      mode: 'lab65',
      l: lab[0],
      a: lab[1],
      b: lab[2],
    });

    for (const query of QUERIES.slice(0, 25)) {
      const ours = nameColor(index, query, { limit: 3 });
      const theirs = [...CORPORA[0].records]
        .map((r) => ({ id: r.id, d: diff(toCulori(query), toCulori(r.lab)) }))
        .sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id < b.id ? -1 : 1))
        .slice(0, 3);

      // Compared on distance rather than on id order: where two records are within culori's
      // rounding of each other the two implementations may order them differently, and that is
      // a property of the third-party library, not a defect here.
      for (const [i, candidate] of ours.candidates.entries())
        expect(candidate.deltaE00).toBeCloseTo(theirs[i]?.d ?? Number.NaN, 8);
    }
  });

  it('ranks a record at distance zero when the query is that record', () => {
    const index = buildNamingIndex(CORPORA[0].records);
    for (const record of CORPORA[0].records.slice(0, 20)) {
      const result = nameColor(index, record.lab, { limit: 3 });
      expect(result.candidates[0]?.deltaE00).toBe(0);
      expect(result.candidates[0]?.similarityPercent).toBe(100);
    }
  });
});

describe('how much of the corpus is actually examined', () => {
  it('is measured and reported, never claimed', () => {
    // The bound is loose by construction (RT_FLOOR ~ 0.134), so at small sizes the shortlist is
    // often most of the corpus. That is CORRECT — the worst case is brute force — and the
    // honest thing is to print the number rather than imply an optimisation.
    for (const corpus of CORPORA) {
      const index = buildNamingIndex(corpus.records);
      let total = 0;
      let worst = 0;
      for (const query of QUERIES) {
        const { shortlistSize } = nameColor(index, query, { limit: 3 });
        total += shortlistSize;
        worst = Math.max(worst, shortlistSize);
      }
      const mean = total / QUERIES.length / corpus.records.length;
      console.log(
        `  ${corpus.name.padEnd(6)} n=${String(corpus.records.length).padStart(5)}  ` +
          `mean examined ${(mean * 100).toFixed(1)}%  worst ${String(worst)}`,
      );
      expect(worst).toBeLessThanOrEqual(corpus.records.length);
    }
  });

  it('examines a strictly smaller fraction as the corpus grows', () => {
    // Asserted as a TREND rather than a threshold. A fixed threshold at R1 sizes would flake and
    // then get deleted; the mechanism earns its keep at NFR-7's 100k, and the direction is what
    // shows it is working.
    const fractions = CORPORA.map((corpus) => {
      const index = buildNamingIndex(corpus.records);
      const total = QUERIES.reduce(
        (n, q) => n + nameColor(index, q, { limit: 3 }).shortlistSize,
        0,
      );
      return total / QUERIES.length / corpus.records.length;
    });
    expect(fractions[2]).toBeLessThan(fractions[0]!);
  });
});

describe('the decoys — without these, the suite above is untested', () => {
  it('a fixed-radius shortlist FAILS, and the failure is located', () => {
    /** The wrong design: everything within R Lab units, then rank. No expansion, no bound. */
    function fixedRadius(
      records: readonly NamingRecord[],
      query: Triple,
      radius: number,
      limit: number,
    ): string {
      return records
        .filter(
          (r) =>
            Math.hypot(r.lab[0] - query[0], r.lab[1] - query[1], r.lab[2] - query[2]) <= radius,
        )
        .map((r) => ({ r, d: deltaE00(query, r.lab) }))
        .sort((a, b) => (a.d !== b.d ? a.d - b.d : a.r.id < b.r.id ? -1 : 1))
        .slice(0, limit)
        .map((s) => `${s.r.id}@${s.d.toExponential(15)}`)
        .join('|');
    }

    let firstFailure: string | null = null;
    let failures = 0;
    for (const corpus of CORPORA) {
      const index = buildNamingIndex(corpus.records);
      for (const query of QUERIES) {
        const truth = shape(nameColorExhaustive(index, query, { limit: 5 }));
        if (fixedRadius(corpus.records, query, 10, 5) !== truth) {
          failures += 1;
          firstFailure ??= `${corpus.name} (n=${String(corpus.records.length)})`;
        }
      }
    }

    // The decoy must actually be broken, or the equivalence suite proves nothing.
    expect(failures).toBeGreaterThan(0);
    console.log(
      `  fixed radius 10: wrong on ${String(failures)} of ` +
        `${String(CORPORA.length * QUERIES.length)} queries; first at ${String(firstFailure)}`,
    );
  });

  it('exact ties exist, and both paths agree on them only because the comparator is total', () => {
    // Ranking on distance alone inherits input order from a stable sort, and the two paths
    // enumerate in different orders — so exact duplicates would order differently, intermittently,
    // looking exactly like a shortlist bug. This asserts the corpus can actually produce that
    // situation, which is what makes `compareScored`'s id tiebreak load-bearing rather than
    // decorative.
    const corpus = CORPORA[0];
    const index = buildNamingIndex(corpus.records);

    const duplicated = corpus.records.filter(
      (r, i) => corpus.records.findIndex((o) => o.lab.join() === r.lab.join()) !== i,
    );
    expect(duplicated.length).toBeGreaterThan(0);

    for (const record of duplicated) {
      // A query sitting exactly on a duplicated point: at least two records at ΔE00 = 0.
      const tied = corpus.records.filter((r) => deltaE00(record.lab, r.lab) === 0);
      expect(tied.length).toBeGreaterThanOrEqual(2);

      expect(shape(nameColor(index, record.lab, { limit: 5 }))).toBe(
        shape(nameColorExhaustive(index, record.lab, { limit: 5 })),
      );
    }
  });
});
