/**
 * The Lab bucket index.
 *
 * Buckets are a **retrieval** structure, never a ranking one. ΔE00 is not a metric and cannot be
 * indexed [[deltae00-is-not-a-metric-and-cannot-be-indexed]]; what is indexed is position in
 * CIELAB, and every candidate that survives retrieval is then ranked by the real thing.
 *
 * ## Each bucket stores the tight box of its members, not its nominal cell
 *
 * A nominal cell is `step` units on a side whether or not its contents fill it. The tight
 * axis-aligned box around the members it actually holds is never larger and usually much
 * smaller, so its lower bound is higher and the search skips it sooner. It costs one `extendBox`
 * per insert and it is always sound, because a bound over a *smaller* region containing the same
 * points is still a bound over those points.
 *
 * ## Validation happens at build, not at query
 *
 * A record with a non-finite Lab makes every ΔE00 involving it `NaN`, and `NaN` comparisons are
 * false — so it would silently never rank, on every query, forever. Rejecting it here means the
 * failure surfaces once, at the moment the corpus is loaded, with the id in the message.
 */

import type { Triple } from '@irodora/color-spaces';
import { boxOf, extendBox, labBucketKey, type LabBox } from './bound.js';
import { NamingError } from './errors.js';
import { MINIMUM_CANDIDATES } from './rank.js';
import type { NamingRecord } from './record.js';

/** Default cell size in CIELAB units. Affects speed only — never the answer. */
export const DEFAULT_BUCKET_STEP = 5;

export interface NamingBucket {
  /** Tight around its members. */
  readonly box: LabBox;
  readonly records: readonly NamingRecord[];
}

export interface NamingIndex {
  readonly records: readonly NamingRecord[];
  readonly buckets: readonly NamingBucket[];
  readonly bucketStep: number;
  /**
   * The corpus version these records came from, for the reproducibility envelope (FR-10, E-006).
   * `null` when the index was built from records with no published version behind them — a test
   * corpus, or a caller who did not say.
   */
  readonly corpusVersion: string | null;
}

export interface BuildOptions {
  readonly bucketStep?: number;
  readonly corpusVersion?: string;
}

/**
 * Build an index. O(n), pure, and safe to call at boot.
 *
 * Rejects a corpus that cannot support FR-7: fewer than three records cannot produce three
 * ranked candidates, so the failure belongs here rather than at every query.
 */
export function buildNamingIndex(
  records: readonly NamingRecord[],
  options: BuildOptions = {},
): NamingIndex {
  const bucketStep = options.bucketStep ?? DEFAULT_BUCKET_STEP;

  if (!Number.isFinite(bucketStep) || bucketStep <= 0)
    throw new NamingError(
      'buildNamingIndex',
      `bucketStep must be a positive finite number; got ${String(bucketStep)}`,
    );

  if (records.length < MINIMUM_CANDIDATES)
    throw new NamingError(
      'buildNamingIndex',
      `a corpus of ${String(records.length)} record(s) cannot answer with ` +
        `${String(MINIMUM_CANDIDATES)} ranked candidates, which FR-7 requires and ADR-0031 ` +
        'depends on: a corpus that can only offer one answer turns naming into identification.',
    );

  const seen = new Set<string>();
  const grouped = new Map<string, { box: LabBox; records: NamingRecord[] }>();

  for (const record of records) {
    if (record.id.length === 0)
      throw new NamingError('buildNamingIndex', 'a record has an empty id');
    if (seen.has(record.id))
      throw new NamingError(
        'buildNamingIndex',
        `"${record.id}" appears twice. Ids are the ranking tiebreak, so a duplicate makes the ` +
          'order between those two records depend on input order rather than on the data.',
      );
    seen.add(record.id);

    if (!isFiniteLab(record.lab))
      throw new NamingError(
        'buildNamingIndex',
        `"${record.id}" has a non-finite Lab [${record.lab.join(', ')}]. Every ΔE00 involving it ` +
          'would be NaN, and because NaN comparisons are false it would silently never rank — ' +
          'on every query, with no error. Caught at build so it surfaces once.',
      );

    const key = labBucketKey(record.lab, bucketStep).join(',');
    const bucket = grouped.get(key);
    if (bucket === undefined) grouped.set(key, { box: boxOf(record.lab), records: [record] });
    else {
      bucket.box = extendBox(bucket.box, record.lab);
      bucket.records.push(record);
    }
  }

  return {
    records: [...records],
    buckets: [...grouped.values()].map((b) => ({ box: b.box, records: b.records })),
    bucketStep,
    corpusVersion: options.corpusVersion ?? null,
  };
}

function isFiniteLab(lab: Triple): boolean {
  return Number.isFinite(lab[0]) && Number.isFinite(lab[1]) && Number.isFinite(lab[2]);
}
