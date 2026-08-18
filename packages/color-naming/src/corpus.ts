/**
 * Adapting a published corpus bundle into indexable records.
 *
 * ## It reads the published Lab. It does not re-derive it.
 *
 * `derived.lab` was computed by the engine that published the bundle, and that is the value this
 * returns. Re-deriving from `entry.color.xyz` would silently return *today's* engine's answer
 * for an old version — which is exactly the failure the reproducibility envelope exists to
 * prevent (FR-10). `@irodora/corpus`'s loader makes the same choice for the same reason.
 *
 * The corpus `content` gate is where a stored derived value is compared against the current
 * engine (E-001's destination half). That is a **check**, deliberately separate from this, which
 * is a **read**. A read that quietly corrected its input would make the check unfalsifiable.
 *
 * ## No dependency on `@irodora/corpus`
 *
 * `PublishedLabSource` describes the bundle structurally, so nothing here imports the corpus
 * package — not at runtime, not in the emitted `.d.ts`. Two reasons, and the second is the one
 * that decided it:
 *
 * 1. `@irodora/color-core` is the facade and already depends on this package, and
 *    `@irodora/corpus` depends on `color-core`. A dependency the other way is a **cycle**, which
 *    `pnpm typecheck` reported the moment it was tried.
 * 2. `verify-engine-purity.mjs` does not follow `@irodora/*` edges out of an engine package
 *    (F-073), so an engine package importing a non-engine one is unguarded. The safest version
 *    of an unguarded edge is one that does not exist.
 *
 * The compatibility guard lives in `packages/corpus`, which may depend on this package without a
 * cycle — and which is the right home anyway, since the schema is its contract to keep.
 */

import { NamingError } from './errors.js';
import type { NamingRecord, PublishedLabSource } from './record.js';

export interface CorpusRecords {
  readonly records: readonly NamingRecord[];
  /** The bundle label, for `NamingIndex.corpusVersion` and the envelope (FR-10, E-006). */
  readonly corpusVersion: string;
}

/**
 * Turn a published bundle into naming records.
 *
 * The entry slug becomes the record id, which is what makes ids stable across a republish and
 * what the ranking tiebreak sorts on.
 */
export function namingRecordsFrom(bundle: PublishedLabSource): CorpusRecords {
  if (bundle.label.length === 0)
    throw new NamingError('namingRecordsFrom', 'the bundle has no version label');

  return {
    corpusVersion: bundle.label,
    records: bundle.entries.map(({ entry, derived }) => {
      if (entry.slug.length === 0)
        throw new NamingError('namingRecordsFrom', `${bundle.label}: an entry has an empty slug`);
      return { id: entry.slug, lab: derived.lab };
    }),
  };
}
