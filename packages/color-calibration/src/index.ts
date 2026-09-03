/**
 * `@irodora/color-calibration` — a correction solved from values somebody else published.
 *
 * **Engine zone.** Zero runtime dependencies, no `node:*`, no DOM, no `process` (NFR-3),
 * enforced by `verify-engine-purity.mjs`, which follows `@irodora/*` dependency edges.
 *
 * **No reference values ship here.** The card is an input
 * ([ADR-0085](../../../docs/adr/0085-the-reference-card-is-a-partner-card-and-its-values-are-cited-not-measured.md)):
 * its published values, illuminant, observer and licence are confirmed from the vendor's own
 * documentation by whoever supplies it, and this package never asserts what they are.
 */

export {
  assertCard,
  CardError,
  type ReferenceCard,
  type ReferencePatch,
  type ReferenceProvenance,
} from './card.js';

export { patchRegions, projection, type Corners, type PatchRegion, type Point } from './locate.js';

export {
  applyCorrection,
  applyMatrix,
  CorrectionError,
  MINIMUM_PATCHES,
  OBSERVED_SPACES,
  solveCorrection,
  type Correction,
  type DegreesOfFreedom,
  type Matrix3,
  type Observation,
  type ObservedSpace,
  type Residual,
} from './solve.js';

export {
  MAXIMUM_REQUIRED_CORRELATION,
  MINIMUM_VERIFIABLE_PATCHES,
  requiredCorrelation,
  spearman,
  verifyCard,
  type CardVerification,
} from './verify.js';
