/**
 * Ranking candidates, and the two rules that make an answer honest.
 *
 * ## The comparator is total, and that is not tidiness
 *
 * The two-stage search and the exhaustive scan enumerate candidates in **different orders**.
 * `Array.prototype.sort` is stable, so a comparator that ranked only on `deltaE00` would inherit
 * input order — and the two paths would then legitimately disagree on any tie, intermittently,
 * looking exactly like a shortlist bug.
 *
 * So ties break on `id`, by code unit. Both paths call this one function, and the **only**
 * difference between `nameColor` and `nameColorExhaustive` is which records reach it. That
 * reduces the equivalence test to precisely the claim it is about: *does the shortlist contain
 * the true top k*.
 *
 * Exact ties are not hypothetical — two corpus entries may share a Lab. The synthetic corpora
 * contain exact duplicates deliberately, or the tiebreak has no decoy
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * ## Three is a floor, not a default
 *
 * FR-7 says "≥ 3 ranked candidates", and ADR-0031 says the product never asserts identity. Those
 * are the same requirement: **a single answer is an identification.** Returning one nearest
 * colour, however it is labelled in the UI, is the claim "this is 藍鼠" — and the honest form of
 * the answer is a ranked shortlist the reader can disagree with.
 *
 * So `limit < 3` throws rather than being clamped. Clamping would silently give a caller
 * something other than what they asked for, and a caller who asked for one answer has a
 * misunderstanding worth surfacing.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { Triple } from '@irodora/color-spaces';
import { NamingError } from './errors.js';
import type { NamingRecord } from './record.js';
import { similarityPercent } from './similarity.js';

/**
 * The fewest candidates an answer may contain (FR-7, ADR-0031).
 *
 * The structural half of "never asserts identity": there is no code path that returns fewer,
 * so no consumer can render a single match even by accident.
 */
export const MINIMUM_CANDIDATES = 3;

export interface NamingCandidate {
  readonly id: string;
  readonly lab: Triple;
  /** The ranking authority (E-003). Never a cheaper approximation, never the percentage. */
  readonly deltaE00: number;
  /** ADR-0048. Presentation only — see `similarity.ts` for why it cannot be the sort key. */
  readonly similarityPercent: number;
  /** 1-based position. */
  readonly rank: number;
}

/** A record paired with its exact distance to the query. */
export interface ScoredRecord {
  readonly record: NamingRecord;
  readonly deltaE00: number;
}

/**
 * A **total** order: distance ascending, then id by code unit.
 *
 * Exported so a test can assert both paths use it rather than trusting that they do.
 */
export function compareScored(a: ScoredRecord, b: ScoredRecord): number {
  if (a.deltaE00 !== b.deltaE00) return a.deltaE00 - b.deltaE00;
  if (a.record.id === b.record.id) return 0;
  return a.record.id < b.record.id ? -1 : 1;
}

export function scoreRecord(query: Triple, record: NamingRecord): ScoredRecord {
  return { record, deltaE00: deltaE00(query, record.lab) };
}

/**
 * Sort scored records and take the best `limit`.
 *
 * The single ranking path. `nameColor` feeds it a shortlist and `nameColorExhaustive` feeds it
 * everything; nothing else differs, which is what makes the equivalence claim testable at all.
 */
export function rankScored(scored: readonly ScoredRecord[], limit: number): NamingCandidate[] {
  assertLimit(limit);
  return [...scored]
    .sort(compareScored)
    .slice(0, limit)
    .map((s, i) => ({
      id: s.record.id,
      lab: s.record.lab,
      deltaE00: s.deltaE00,
      similarityPercent: similarityPercent(s.deltaE00),
      rank: i + 1,
    }));
}

export function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < MINIMUM_CANDIDATES)
    throw new NamingError(
      'nameColor',
      `limit must be an integer of at least ${String(MINIMUM_CANDIDATES)}; got ${String(limit)}. ` +
        'A single answer is an identification, and this product does not assert that a colour ' +
        'IS a corpus entry (FR-7, ADR-0031) — it offers the closest digital references and ' +
        'lets the reader judge. The floor is not clamped because a caller asking for one ' +
        'answer has a misunderstanding worth surfacing.',
    );
}
