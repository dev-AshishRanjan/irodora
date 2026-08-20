/**
 * The four capture modes.
 *
 * **Every number here comes from `@irodora/color-sampling`.** Not one line of colour
 * arithmetic lives in this file, and a boundary guard enforces that rather than a reviewer
 * remembering — `apps/mobile/AGENTS.md`: *"The engine is imported, never ported. Sampling
 * logic, rejection rules and averaging live there."*
 *
 * The reason is [E-008](../../../../.harness/state/effects.json): a mobile-only
 * re-implementation makes the same fabric measure differently on two surfaces, and **no
 * single-platform test can see it**. Both surfaces pass their own tests; only a comparison
 * between them would show the difference, and there is nothing that runs both.
 *
 * The temptation is real and specific: a worklet cannot call arbitrary JavaScript, so the
 * easy fix when the engine will not run there is to inline the arithmetic. The honest fixes
 * are to move the call off the worklet thread or compile the engine for it.
 */

import {
  aggregate,
  assessIllumination,
  assessQuality,
  partition,
  type Region,
  type Sample,
} from '@irodora/color-sampling';
import { cappedConfidence, type CaptureSpace, type LensReading } from './reading.js';
import { ILLUMINATION_CEILING } from '@irodora/color-sampling';

/**
 * The four modes (FR-13, FR-14, FR-15).
 *
 * They differ in **which pixels** they hand the engine and how much certainty the interaction
 * justifies — never in how the colour is computed.
 */
export const CAPTURE_MODES = ['live', 'garment-scan', 'precision', 'manual'] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];

/**
 * How much confidence each mode's *interaction* can support, before any measurement.
 *
 * `live` is a continuous readout under a moving crosshair: the person has not chosen a region
 * and the camera has not settled, so it cannot be as trustworthy as a deliberate capture even
 * when the pixels happen to be good. `manual` is a typed value — nothing was measured, so
 * there is nothing to be uncertain about.
 *
 * Conventions, not measurements (NFR-2).
 */
export const MODE_CEILING: Readonly<Record<CaptureMode, number>> = {
  live: 0.7,
  'garment-scan': 0.9,
  precision: 1,
  manual: 1,
};

export interface CaptureInput {
  readonly region: Region;
  readonly space: CaptureSpace;
}

/**
 * Read a colour.
 *
 * One function for every mode, because the modes differ in their inputs and their ceiling —
 * not in their maths. Four separate implementations would be four places for the arithmetic
 * to drift.
 */
export function read(mode: CaptureMode, input: CaptureInput): LensReading {
  const { kept } = partition(input.region.samples);
  const stats = aggregate(kept);
  const illumination = assessIllumination(input.region.samples);
  const quality = assessQuality(input.region);

  return {
    rgb: [stats.trimmedMean.r, stats.trimmedMean.g, stats.trimmedMean.b],
    space: input.space,
    usableSamples: stats.count,
    variance: stats.variance,
    illumination: illumination.kind,
    quality: quality.quality,
    confidence: Math.min(
      MODE_CEILING[mode],
      cappedConfidence(input.space, illumination.confidenceCeiling, quality.confidenceCeiling),
    ),
    instruction: quality.instruction,
  };
}

/**
 * A manually entered colour.
 *
 * Kept in this file because it is one of the four modes and hiding it elsewhere would make
 * "all four capture modes" true of the feature list and false of the code. It measures
 * nothing, so it reports full confidence and an `unknown` illumination — **not** `daylight`,
 * which would be a claim about a room nobody looked at.
 */
export function readManual(rgb: readonly [number, number, number]): LensReading {
  const sample: Sample = { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 };
  void sample;
  return {
    rgb: [rgb[0], rgb[1], rgb[2]],
    space: 'srgb',
    usableSamples: 0,
    variance: 0,
    illumination: 'unknown',
    quality: 'excellent',
    // A typed value is exactly what the person said it was. There is no measurement to doubt —
    // which is a different thing from a measurement we are sure about, and the provenance
    // recorded alongside it (`declared`, not `estimated`) is what carries that distinction.
    confidence: 1,
    instruction: '',
  };
}

/** Exported for the test that proves an unknown illumination is not silently treated as fine. */
export { ILLUMINATION_CEILING };
