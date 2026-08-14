/**
 * Colour-vision-deficiency simulation and separation scoring.
 *
 * CVD is an engine concern, not a display filter (ADR-0009): the separation
 * score feeds recommendation ranking, and ONE definition serves the UI, the
 * recommendation engine and the design system's own token checks.
 */

export type Deficiency = 'protan' | 'deutan' | 'tritan';

/** [0,1]. Machado models anomalous trichromacy, which is the common case. */
export type Severity = number;

/** Implemented in F-008. */
export const CVD_VERSION = '0.0.0' as const;
