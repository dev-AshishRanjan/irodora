/**
 * Colour difference and contrast.
 *
 * DeltaE00 is the default for every user-facing claim. It is NOT a metric — it
 * violates the triangle inequality by design, so it must never sit behind a
 * spatial index (ADR-0008).
 */

export type DifferenceMetric = 'de76' | 'de94' | 'de00' | 'deok';

export const DEFAULT_METRIC: DifferenceMetric = 'de00';

/** Implemented in F-007. */
export const DIFFERENCE_VERSION = '0.0.0' as const;
