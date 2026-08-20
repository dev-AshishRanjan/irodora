/**
 * What crosses the bridge, and what the platform's silence costs.
 *
 * ## Only numbers cross
 *
 * A frame processor runs on a worklet thread with the pixels; **a small numeric result** comes
 * back. `LensReading` is that result, and it is the *type* that enforces the rule — there is no
 * field a frame could be assigned to, so passing one does not compile. A comment saying "do not
 * send the frame" is not a mechanism (NFR-12, ADR-0026).
 *
 * ## The colour space is read, never assumed
 *
 * A P3 frame interpreted as sRGB is wrong in exactly the saturated colours this product cares
 * most about — the error grows with chroma, so it is smallest on the greys where you would
 * notice it and largest on the reds where you would not.
 *
 * When the platform will not say, the answer is **not** to guess sRGB. It is to record
 * `unknown` and cap the confidence, which is `apps/mobile/AGENTS.md`'s rule stated as code:
 *
 * ```ts
 * // No — an assumption about what "iOS" means, which ages badly.
 * if (Platform.OS === 'ios') { /* assume P3 *\/ }
 * ```
 */

import type { Triple } from '@irodora/color-spaces';
import type { CaptureQuality, Illumination } from '@irodora/color-sampling';

/**
 * Colour spaces a capture may arrive in.
 *
 * `unknown` is a first-class member, not an error state. It is what an honest platform layer
 * reports when the API declines to say, and the product is built to keep working on it.
 */
export const CAPTURE_SPACES = ['srgb', 'display-p3', 'unknown'] as const;
export type CaptureSpace = (typeof CAPTURE_SPACES)[number];

/**
 * What an unread colour space costs.
 *
 * **Not a rejection.** A reading taken in an unknown space is still useful — it is simply not
 * something we may sound certain about. ADR-0031: no claim the system cannot demonstrate.
 *
 * A convention, not a measurement (NFR-2). F-063 produces the rows and is R5.
 */
export const SPACE_CONFIDENCE_CEILING: Readonly<Record<CaptureSpace, number>> = {
  srgb: 1,
  'display-p3': 1,
  // Interpreting a P3 frame as sRGB shifts saturated colours by a visible amount. Not knowing
  // which one it is means not knowing whether that shift happened.
  unknown: 0.6,
};

/**
 * The whole of what crosses the bridge.
 *
 * Every field is a number, a small string, or an enum. **There is deliberately no field for
 * pixels, a buffer, a path, or a URI** — the frame stays on the worklet thread and is disposed
 * there.
 */
export interface LensReading {
  /** The sampled colour, in the space named by `space`. */
  readonly rgb: Triple;
  readonly space: CaptureSpace;
  /** How many pixels survived rejection. FR-15 wants at least 1000. */
  readonly usableSamples: number;
  /** Spread of the region, for the caller to show as "this area was not one colour". */
  readonly variance: number;
  readonly illumination: Illumination;
  readonly quality: CaptureQuality;
  /** In [0,1], already capped by every ceiling that applies. Never a probability. */
  readonly confidence: number;
  /** What to change, when anything needs changing. */
  readonly instruction: string;
}

/**
 * Combine every ceiling.
 *
 * **The minimum, never a product.** Three ceilings multiplied would produce a number lower than
 * any single assessment justified, which is a different lie from the one we are avoiding but
 * still a lie.
 */
export function cappedConfidence(
  space: CaptureSpace,
  illumination: number,
  quality: number,
): number {
  return Math.min(SPACE_CONFIDENCE_CEILING[space], illumination, quality);
}
