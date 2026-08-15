/**
 * Colour-vision-deficiency simulation and separation scoring.
 *
 * CVD is an engine concern, not a display filter (ADR-0009): the separation score feeds
 * recommendation ranking, and ONE definition serves the UI, the recommendation engine and the
 * design system's own token checks ([E-005](../../../.harness/state/effects.json)).
 *
 * Two models, because they answer different questions:
 *
 * - **`simulateAnomalous`** (Machado 2009) — anomalous trichromacy at any severity. The common
 *   case, and the one a severity slider is for.
 * - **`simulateDichromacy`** (Brettel–Viénot–Mollon) — the total absence of a cone class.
 *   Protan and deutan only; tritan throws rather than returning a plausible wrong answer.
 */

export {
  machadoMatrix,
  MACHADO_DEUTAN,
  MACHADO_PROTAN,
  MACHADO_STEP,
  MACHADO_STEPS,
  MACHADO_TABLES,
  MACHADO_TRITAN,
  simulateAnomalous,
  type Deficiency,
} from './machado.js';

export {
  COPUNCTAL_POINTS,
  hasDichromacySupport,
  LMS_TO_XYZ_HPE,
  simulateDichromacy,
  VIENOT_1999,
  XYZ_TO_LMS_HPE,
} from './brettel.js';

export {
  separationDetail,
  separationScore,
  SEPARATION_DELTA_E_CEILING,
  SEPARATION_LIGHTNESS_CEILING,
  SEPARATION_LIGHTNESS_WEIGHT,
  type SeparationDetail,
} from './separation.js';

/** [0,1]. Machado models anomalous trichromacy, which is the common case. */
export type Severity = number;

/** Semver of this package. Recorded alongside the engine in a reproducibility envelope. */
export const CVD_VERSION = '0.1.0' as const;
