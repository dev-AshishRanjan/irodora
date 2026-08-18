/**
 * Nearest-match colour naming.
 *
 * Output is always "closest digital reference", never an assertion of identity
 * ([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md)). A rendered hex is a modern
 * approximation of a colour historically produced by a dye on a fibre under daylight.
 *
 * ## What this package guarantees
 *
 * The ranking is **exactly** the ranking a full scan of the index would have produced. The
 * two-stage search is an optimisation over the order candidates are examined in, never over
 * which answer comes out — see `bound.ts`, which carries the argument.
 *
 * ## What it does not do
 *
 * **No colour maths is implemented here.** Ranking is `deltaE00` from
 * `@irodora/color-difference` (E-003) and the query's Lab comes from `@irodora/color-spaces`. A
 * second implementation of either would be a defect by definition (`AGENTS.md` §7).
 *
 * **No filesystem, no platform APIs.** This package is inside the colour-engine zone and must
 * produce byte-identical output in Node, the browser and React Native (NFR-3). It takes records
 * that someone else loaded; `namingRecordsFrom` adapts a published corpus bundle by *shape*, so
 * there is no dependency on `@irodora/corpus` at all.
 */

export { NamingError } from './errors.js';

export type { NamingRecord, PublishedLabSource } from './record.js';

export {
  boxLowerBoundDeltaE00,
  boxOf,
  extendBox,
  G_MAX,
  labBucketKey,
  RT_FLOOR,
  T_MAX,
  type LabBox,
} from './bound.js';

/**
 * Semver of the naming engine.
 *
 * Moves when the ranking or the similarity scale changes — both are user-visible answers, and a
 * recommendation replayed under a different one is not the same recommendation (FR-10).
 */
export const NAMING_VERSION = '0.1.0' as const;
