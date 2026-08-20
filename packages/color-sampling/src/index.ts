/**
 * `@irodora/color-sampling` — pixels to one colour, with an honest confidence.
 *
 * **Engine zone.** Zero runtime dependencies, no `node:*`, no DOM, no `process` (NFR-3),
 * enforced by `verify-engine-purity.mjs`, which follows `@irodora/*` dependency edges since
 * F-073. That is what makes the same fabric measure the same on every surface, which is what
 * [E-008](../../../.harness/state/effects.json) exists to protect: a mobile-only
 * "optimisation" of this maths is a defect **no single-platform test can see**.
 */

export {
  DEFAULT_THRESHOLDS,
  linearLuminance,
  partition,
  type Partitioned,
  type Rejection,
  type RejectionReason,
  type RejectionThresholds,
  type Sample,
} from './reject.js';

export {
  aggregate,
  averageEncoded,
  arithmeticMean,
  channelMedian,
  channelTrimmedMean,
  type Aggregate,
} from './statistics.js';

export {
  assessIllumination,
  ILLUMINATION_CEILING,
  type Illumination,
  type IlluminationAssessment,
} from './illumination.js';

export {
  assessQuality,
  confidenceCeiling,
  QUALITY_CEILING,
  QUALITY_THRESHOLDS,
  type CaptureQuality,
  type QualityAssessment,
  type QualityMetrics,
  type Region,
} from './quality.js';
