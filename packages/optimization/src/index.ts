/**
 * `@irodora/optimization` — capsule and coverage solvers
 * ([`ARCHITECTURE.md`](../../../docs/architecture/ARCHITECTURE.md)).
 *
 * **What separates this from `@irodora/recommendation`:** that package holds rules, weights,
 * scoring and explanation objects — *"is this colour good on you"*. This one answers questions
 * about the **wardrobe as a set**: what it covers, what it repeats, what a capsule of it would
 * be. Both import the engine; neither does colour maths of its own (E-008).
 *
 * Like the rest of the engine: **no runtime dependencies, no `node:*`, no DOM** (NFR-3).
 */

export {
  applyChange,
  coverage,
  COVERAGE_THRESHOLD,
  type Coverage,
  type CoverageContext,
  type CoverageGarment,
  gaps,
  type Gap,
  type WardrobeChange,
} from './coverage.js';

export {
  DUPLICATE_DELTA_E,
  findDuplicates,
  type DuplicateCandidate,
  type DuplicatePair,
} from './duplicates.js';

export const OPTIMIZATION_VERSION = '0.1.0' as const;
