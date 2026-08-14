/**
 * Colour difference and contrast.
 *
 * ΔE00 is the default for every user-facing claim, and it is the ranking authority for the
 * whole product ([E-003](../../../.harness/state/effects.json)) — naming, duplicate detection,
 * CVD separation, recommendation order. Its known failure modes produce *plausible* results,
 * which is why all 34 Sharma–Wu–Dalal pairs are asserted to four decimal places rather than a
 * handful of convenient ones.
 *
 * It is NOT a metric — it violates the triangle inequality by design, so it must never sit
 * behind a spatial index (ADR-0008). [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
 */

export {
  APCA_GAMMA,
  APCA_LUMINANCE_COEFFICIENTS,
  apcaLuminance,
  WCAG_GAMMA,
  WCAG_LINEAR_SLOPE,
  WCAG_LUMINANCE_COEFFICIENTS,
  WCAG_OFFSET,
  WCAG_TRANSFER_CUTOFF,
  wcagLuminance,
  type LuminanceCoefficients,
} from './luminance.js';

export {
  CIEDE2000_CHROMA_PIVOT_POW7,
  CIEDE2000_COMPENSATION,
  CIEDE2000_DEFAULT_WEIGHTS,
  CIEDE2000_ROTATION,
  CIEDE2000_T_COEFFICIENTS,
  CIEDE2000_T_PHASES,
  deltaE00,
  type Ciede2000Weights,
} from './ciede2000.js';

/** Which difference metric a caller asked for. */
export type DifferenceMetric = 'de76' | 'de94' | 'de00' | 'deok';

/** ΔE00 for every stated result. The others exist for interoperability and speed. */
export const DEFAULT_METRIC: DifferenceMetric = 'de00';

/** Semver of this package. Recorded alongside the engine in a reproducibility envelope. */
export const DIFFERENCE_VERSION = '0.1.0' as const;
