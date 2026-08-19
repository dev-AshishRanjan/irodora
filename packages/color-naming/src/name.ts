/**
 * The search: two-stage retrieval whose answer is provably the answer a full scan would give.
 *
 * ```
 * 1. lower-bound every occupied bucket against the query
 * 2. visit them in increasing bound, ranking each bucket's records exactly with deltaE00
 * 3. STOP when the next bucket's bound reaches the k-th best distance found so far
 * ```
 *
 * Step 3 is the whole guarantee. Every bucket not yet visited has a lower bound at least as large
 * as the k-th best, and `boxLowerBoundDeltaE00` never overestimates — so nothing out there can
 * beat what is already held. The shortlist is the union of the visited buckets: literally a
 * coarse Lab-bucket shortlist, and provably sufficient rather than usually sufficient.
 *
 * **Correctness does not depend on `bucketStep`.** A larger step means fewer, fatter buckets and
 * more records scored; a step larger than the corpus makes this exactly a full scan. The
 * equivalence suite asserts identical results at steps 1, 5, 25 and 10⁶, which is what makes that
 * claim checkable rather than asserted.
 *
 * ## What is measured rather than claimed
 *
 * `shortlistSize` is the number of records actually scored. The bound is loose by construction
 * (see `bound.ts`), so at small corpus sizes this will often be most of the corpus — which is
 * correct behaviour, since the worst case is brute force. Reporting it means the cost is a number
 * a reader can check instead of a claim in a comment.
 */

import type { Triple } from '@irodora/color-spaces';
import { boxLowerBoundDeltaE00 } from './bound.js';
import type { NamingIndex } from './buckets.js';
import { assertLimit, compareScored, MINIMUM_CANDIDATES, rankScored, scoreRecord } from './rank.js';
import type { NamingCandidate, ScoredRecord } from './rank.js';

export interface NameOptions {
  readonly limit?: number;
}

export interface NamingResult {
  readonly query: { readonly lab: Triple };
  /**
   * Ranked nearest references. **Never an identification** — see `rank.ts`. There is no `name`
   * field and no `isExactMatch` — claims-ok: records the deliberate absence of that field,
   * which is the ADR-0031 rule being kept, not broken. Joining an id to an entry's names is the API's projection, and
   * a boolean "this is it" is the claim ADR-0031 forbids.
   */
  readonly candidates: readonly NamingCandidate[];
  readonly corpusVersion: string | null;
  /** Records actually scored. Measured, not claimed — see the module comment. */
  readonly shortlistSize: number;
  readonly bucketsVisited: number;
  /** True when the search examined every record, which is the correct worst case. */
  readonly exhaustive: boolean;
}

/**
 * Rank the corpus against `queryLab`, examining as little of it as the bound allows.
 *
 * Returns the same candidates as `nameColorExhaustive`, always. That is the feature.
 */
export function nameColor(
  index: NamingIndex,
  queryLab: Triple,
  options: NameOptions = {},
): NamingResult {
  const limit = options.limit ?? MINIMUM_CANDIDATES;
  assertLimit(limit);

  // Ordering the buckets up front is O(B log B) and makes the stopping rule a single forward
  // pass. A priority queue would avoid bounding every bucket, which matters at NFR-7's 100k
  // entries and not at R1's; simplicity wins until a measurement says otherwise (F-038).
  const ordered = index.buckets
    .map((bucket) => ({ bucket, lowerBound: boxLowerBoundDeltaE00(queryLab, bucket.box) }))
    .sort((a, b) => a.lowerBound - b.lowerBound);

  const best: ScoredRecord[] = [];
  let shortlistSize = 0;
  let bucketsVisited = 0;

  /** The k-th best distance found so far, or `Infinity` while fewer than k are held. */
  const kthBest = (): number => {
    if (best.length < limit) return Number.POSITIVE_INFINITY;
    const last = best[limit - 1];
    return last === undefined ? Number.POSITIVE_INFINITY : last.deltaE00;
  };

  for (const { bucket, lowerBound } of ordered) {
    // The stopping rule. `>=` rather than `>`: a bucket whose bound EQUALS the k-th best cannot
    // improve on it, and a tie there would be broken by id in the comparator anyway — so
    // visiting it could only add candidates that lose.
    if (lowerBound >= kthBest()) break;

    bucketsVisited += 1;
    for (const record of bucket.records) {
      shortlistSize += 1;
      insertBest(best, scoreRecord(queryLab, record), limit);
    }
  }

  return {
    query: { lab: queryLab },
    candidates: rankScored(best, limit),
    corpusVersion: index.corpusVersion,
    shortlistSize,
    bucketsVisited,
    exhaustive: shortlistSize === index.records.length,
  };
}

/**
 * The reference path: score every record, rank, take `limit`.
 *
 * Exported rather than test-only. It is what `nameColor` is checked against, and a consumer with
 * a tiny corpus or a pathological query distribution is entitled to skip the machinery.
 */
export function nameColorExhaustive(
  index: NamingIndex,
  queryLab: Triple,
  options: NameOptions = {},
): NamingResult {
  const limit = options.limit ?? MINIMUM_CANDIDATES;
  assertLimit(limit);

  const scored = index.records.map((record) => scoreRecord(queryLab, record));

  return {
    query: { lab: queryLab },
    candidates: rankScored(scored, limit),
    corpusVersion: index.corpusVersion,
    shortlistSize: index.records.length,
    bucketsVisited: index.buckets.length,
    exhaustive: true,
  };
}

/**
 * Insert into a sorted best-of list, capped at `limit`.
 *
 * Kept sorted because the stopping rule needs the k-th best *during* the search, not after it.
 * Linear insertion is right for the k values FR-7 implies; a heap would be faster and would have
 * to be justified by a measurement.
 */
function insertBest(best: ScoredRecord[], candidate: ScoredRecord, limit: number): void {
  const worstHeld = best.length >= limit ? best[limit - 1] : undefined;
  if (worstHeld !== undefined && compareScored(candidate, worstHeld) >= 0) return;

  let at = best.length;
  for (;;) {
    if (at === 0) break;
    const previous = best[at - 1];
    if (previous === undefined || compareScored(candidate, previous) >= 0) break;
    at -= 1;
  }
  best.splice(at, 0, candidate);
  if (best.length > limit) best.length = limit;
}
