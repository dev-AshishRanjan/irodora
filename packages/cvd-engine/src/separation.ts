/**
 * The separation score — **one definition, used identically by the UI and the recommendation
 * engine** ([E-005](../../../.harness/state/effects.json)).
 *
 * This is the deliverable of the whole package. A CVD "mode" that recolours the screen helps a
 * designer look at a problem; it does not help someone choose trousers
 * ([ADR-0009](../../../docs/adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md)). What the
 * product needs is one number saying whether two garments stay distinguishable — and it has to
 * be *one* number, because two definitions would eventually disagree and nobody would notice.
 *
 * ## Why lightness is in the formula
 *
 * Two colours a dichromat cannot separate by hue may be perfectly separable by **value**. A
 * navy jacket and a dark green one are a confusion pair by hue and obviously different by
 * lightness, and telling someone their outfit fails when it does not is its own accessibility
 * failure — it teaches them to distrust the tool.
 *
 * So the score combines post-simulation ΔE00 with the post-simulation lightness difference,
 * and the lightness term can carry a pairing on its own.
 *
 * ## The weights are not tuned
 *
 * They are named constants with a stated rationale, and **F-029 moves them into versioned
 * content**. Tuning a score before any consumer exists produces numbers fitted to nothing.
 * Nothing here should be read as a calibrated threshold.
 */

import { deltaE00 } from '@irodora/color-difference';
import { srgbToXyz, xyzToLab, type Rgb } from '@irodora/color-spaces';
import { simulateAnomalous, type Deficiency } from './machado.js';

/**
 * ΔE00 at which the difference term saturates.
 *
 * **Not calibrated.** Chosen as a round number well above the ~2.3 just-noticeable difference
 * and below the ~10 that reads as obviously different, so the score has useful resolution
 * across the range that actually matters. F-029 replaces it.
 */
export const SEPARATION_DELTA_E_CEILING = 20;

/**
 * CIELAB L* difference at which the lightness term saturates.
 *
 * **Not calibrated.** 20 L* is roughly the step between adjacent tones in a typical wardrobe
 * palette.
 */
export const SEPARATION_LIGHTNESS_CEILING = 20;

/**
 * How much of the score the lightness term can carry on its own.
 *
 * **Not calibrated.** Set so that a pairing which is hue-confusable but strongly
 * value-separable still scores as usable rather than as a failure — which is the entire
 * reason lightness is in the formula.
 */
export const SEPARATION_LIGHTNESS_WEIGHT = 0.4;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** What the score was computed from. Returned alongside it so a number can be explained. */
export interface SeparationDetail {
  /** [0,100]. Higher is more distinguishable. */
  readonly score: number;
  /** ΔE00 between the two colours AFTER simulation. */
  readonly deltaE00: number;
  /** CIELAB L* difference after simulation. */
  readonly lightnessDifference: number;
  readonly deficiency: Deficiency;
  readonly severity: number;
}

/**
 * How distinguishable two encoded sRGB colours remain under a given deficiency and severity.
 *
 * Returns `[0, 100]`. Symmetric: which colour is "first" does not change the answer, because
 * neither ΔE00 nor an absolute lightness difference is directional.
 */
export function separationDetail(
  a: Rgb,
  b: Rgb,
  deficiency: Deficiency,
  severity: number,
): SeparationDetail {
  const simulatedA = simulateAnomalous(a, deficiency, severity);
  const simulatedB = simulateAnomalous(b, deficiency, severity);

  const labA = xyzToLab(srgbToXyz(simulatedA));
  const labB = xyzToLab(srgbToXyz(simulatedB));

  const difference = deltaE00(labA, labB);
  const lightnessDifference = Math.abs(labA[0] - labB[0]);

  const differenceTerm = clamp01(difference / SEPARATION_DELTA_E_CEILING);
  const lightnessTerm = clamp01(lightnessDifference / SEPARATION_LIGHTNESS_CEILING);

  // The two terms combine so that either can carry the pairing, rather than averaging — an
  // average would let a strong lightness difference be dragged down by a hue collapse, which
  // is exactly the false negative this formula exists to avoid.
  const combined = Math.max(
    differenceTerm,
    lightnessTerm * SEPARATION_LIGHTNESS_WEIGHT +
      differenceTerm * (1 - SEPARATION_LIGHTNESS_WEIGHT),
  );

  return {
    score: clamp01(combined) * 100,
    deltaE00: difference,
    lightnessDifference,
    deficiency,
    severity,
  };
}

/** The score alone, for callers that do not need the decomposition. */
export function separationScore(a: Rgb, b: Rgb, deficiency: Deficiency, severity: number): number {
  return separationDetail(a, b, deficiency, severity).score;
}
