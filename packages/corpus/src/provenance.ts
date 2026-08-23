/**
 * The provenance block, which is the same for a colour and for a palette.
 *
 * It is one definition on purpose. ADR-0007 §1 and NFR-20 set the required list, and a second
 * copy of that list for palettes would be a second answer to "what does complete mean" — which
 * is the one question the `content` gate exists to answer identically everywhere.
 *
 * ## What is required, and where the three documents disagreed
 *
 * `color-corpus-spec.md` §1 lists `source · sourceType · derivation · verifiedBy · verifiedAt`.
 * ADR-0007 §1 adds `publisher · publishedYear · rightsHolder · sourceLicence · editorialNotes`.
 * NFR-20 names the **licence** explicitly. The accepted decision and the requirement win: the
 * spec's shorter list was the outlier and F-011 corrects it.
 *
 * Fields genuinely inapplicable to a `sourceType` — `publishedYear` on a measurement — are
 * `null` **with a stated reason**, never absent and never `"n/a"`. That is FR-21's "no silent
 * blanks", and it is what stops "required" from being satisfied by a placeholder.
 */

import { isSourceType, type SourceType } from './classification.js';
import { CorpusError } from './errors.js';
import {
  ISO_DATE_PATTERN,
  nullable,
  rejectUnknownKeys,
  requireMatch,
  requireRecord,
  requireString,
} from './primitives.js';
import { requiresReviewer, type EntryStatus } from './workflow.js';

export interface RecordProvenance {
  readonly source: string;
  /** The `ID` column in `licensing-and-provenance.md` §5. Cross-checked by the gate. */
  readonly sourceId: string;
  readonly sourceType: SourceType;
  readonly publisher: string | null;
  readonly publishedYear: number | null;
  readonly rightsHolder: string | null;
  /** NFR-20 names the licence explicitly; ADR-0007 §1 requires it. */
  readonly sourceLicence: string;
  readonly sourceUrl: string | null;
  /** How this value was obtained. Not a formality — see the content rules. */
  readonly derivation: string;
  readonly authoredBy: string;
  readonly authoredAt: string;
  readonly verifiedBy: string | null;
  readonly verifiedAt: string | null;
  /**
   * Whether the reviewer was somebody other than the author (F-084, ADR-0060).
   *
   * **Not optional, and not defaulted.** A field that meant `independent` when absent would
   * let every entry claim an independent review by saying nothing — which is precisely the
   * silence this exists to break. `null` before review completes, one of the two values
   * after.
   *
   * `self` is what a single-editor project can honestly claim. It is a weaker statement than
   * `independent`, it is publishable, and it says so. Nothing here makes author-review
   * *equivalent* to independent review; it makes it *visible*.
   */
  readonly reviewIndependence: ReviewIndependence | null;
  readonly editorialNotes: string;
}

const PROVENANCE_KEYS = [
  'source',
  'sourceId',
  'sourceType',
  'publisher',
  'publishedYear',
  'rightsHolder',
  'sourceLicence',
  'sourceUrl',
  'derivation',
  'authoredBy',
  'authoredAt',
  'verifiedBy',
  'verifiedAt',
  'reviewIndependence',
  'editorialNotes',
] as const;

/** Who checked the entry, relative to who wrote it. See `RecordProvenance`. */
export const REVIEW_INDEPENDENCE = ['independent', 'self'] as const;

export type ReviewIndependence = (typeof REVIEW_INDEPENDENCE)[number];

export function isReviewIndependence(v: unknown): v is ReviewIndependence {
  return typeof v === 'string' && (REVIEW_INDEPENDENCE as readonly string[]).includes(v);
}

/**
 * The shortest `derivation` that can carry an epistemic claim.
 *
 * A length check cannot tell a real derivation from a plausible-looking one — nothing
 * automatic can. What it does catch is the empty gesture: `"measured"`, `"source"`, `"ok"`.
 * The rest is the reviewer's job, which is why the reviewer must be a different person.
 */
const MIN_DERIVATION = 20;

/**
 * `verifiedBy` / `verifiedAt`: null before review completes, required after.
 *
 * This does NOT go through `unknowns`. The status already states why the field is empty, and
 * asking an editor to write "not reviewed yet" beside `status: "draft"` would make the reasons
 * mechanical — at which point nobody reads any of them.
 */
function requireReviewField<T>(
  v: unknown,
  path: string,
  src: string,
  status: EntryStatus,
  parse: (value: unknown) => T,
): T | null {
  if (requiresReviewer(status)) {
    if (v === null || v === undefined)
      throw new CorpusError(
        src,
        path,
        `is null at status "${status}". A record cannot reach "${status}" without a recorded ` +
          'reviewer and complete provenance (FR-68, NFR-20).',
      );
    return parse(v);
  }
  if (v !== null)
    throw new CorpusError(
      src,
      path,
      `is set at status "${status}", which is before review completes. Recording a reviewer on ` +
        'an unreviewed record is the claim this workflow exists to prevent.',
    );
  return null;
}

function parseSourceType(v: unknown, src: string): SourceType {
  if (!isSourceType(v))
    throw new CorpusError(
      src,
      'provenance.sourceType',
      'expected one of measurement, publication, museum-record, editorial, standard; got ' +
        JSON.stringify(v),
    );
  return v;
}

export function parseProvenance(
  v: unknown,
  src: string,
  status: EntryStatus,
  unknowns: Readonly<Record<string, string>>,
  seenNulls: Set<string>,
): RecordProvenance {
  const o = requireRecord(v, 'provenance', src);
  rejectUnknownKeys(o, PROVENANCE_KEYS, 'provenance', src);

  const derivation = requireString(o['derivation'], 'provenance.derivation', src);
  if (derivation.trim().length < MIN_DERIVATION)
    throw new CorpusError(
      src,
      'provenance.derivation',
      `is ${String(derivation.trim().length)} characters. "Measured from dyed silk under D65, ` +
        'colorimeter, mean of five readings" and "taken from the hex printed on page 47" are ' +
        'different epistemic claims about the same field, and a future editor correcting an ' +
        'error needs to know which one they are looking at. A word or two cannot carry that.',
    );

  return {
    source: requireString(o['source'], 'provenance.source', src),
    sourceId: requireString(o['sourceId'], 'provenance.sourceId', src),
    sourceType: parseSourceType(o['sourceType'], src),
    publisher: nullable(o['publisher'], 'provenance.publisher', src, unknowns, seenNulls, (value) =>
      requireString(value, 'provenance.publisher', src),
    ),
    publishedYear: nullable(
      o['publishedYear'],
      'provenance.publishedYear',
      src,
      unknowns,
      seenNulls,
      (value) => {
        if (typeof value !== 'number' || !Number.isInteger(value))
          throw new CorpusError(src, 'provenance.publishedYear', 'expected an integer year');
        return value;
      },
    ),
    rightsHolder: nullable(
      o['rightsHolder'],
      'provenance.rightsHolder',
      src,
      unknowns,
      seenNulls,
      (value) => requireString(value, 'provenance.rightsHolder', src),
    ),
    sourceLicence: requireString(o['sourceLicence'], 'provenance.sourceLicence', src),
    sourceUrl: nullable(o['sourceUrl'], 'provenance.sourceUrl', src, unknowns, seenNulls, (value) =>
      requireString(value, 'provenance.sourceUrl', src),
    ),
    derivation,
    authoredBy: requireString(o['authoredBy'], 'provenance.authoredBy', src),
    authoredAt: requireMatch(
      o['authoredAt'],
      ISO_DATE_PATTERN,
      'provenance.authoredAt',
      src,
      'expected YYYY-MM-DD',
    ),
    verifiedBy: requireReviewField(o['verifiedBy'], 'provenance.verifiedBy', src, status, (value) =>
      requireString(value, 'provenance.verifiedBy', src),
    ),
    verifiedAt: requireReviewField(o['verifiedAt'], 'provenance.verifiedAt', src, status, (value) =>
      requireMatch(value, ISO_DATE_PATTERN, 'provenance.verifiedAt', src, 'expected YYYY-MM-DD'),
    ),
    // Same null-before-review rule as the two fields above, deliberately: whether the review
    // was independent is part of the review, so it appears and disappears with it.
    reviewIndependence: requireReviewField(
      o['reviewIndependence'],
      'provenance.reviewIndependence',
      src,
      status,
      (value) => {
        if (!isReviewIndependence(value))
          throw new CorpusError(
            src,
            'provenance.reviewIndependence',
            `is ${JSON.stringify(value)}; expected ${REVIEW_INDEPENDENCE.map((r) => `"${r}"`).join(' or ')}. ` +
              'It is required rather than defaulted, because a field that meant "independent" ' +
              'when absent would let an entry claim a review nobody performed (ADR-0060).',
          );
        return value;
      },
    ),
    editorialNotes: requireString(o['editorialNotes'], 'provenance.editorialNotes', src),
  };
}
