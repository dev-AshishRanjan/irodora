/**
 * Which pixels do not count, and why each rule exists.
 *
 * A sampling region is never all fabric. It contains the highlight where the light source
 * reflects off the weave, the fold that is in its own shadow, the background showing through a
 * gap, and — from a camera — pixels the sensor clipped. Averaging those in does not add noise
 * that cancels out; **each one biases the answer in a consistent direction**, which is what
 * makes the result plausible and wrong rather than obviously wrong.
 *
 * ## The test that makes a rejection rule real
 *
 * A rule that removes pixels which made no difference is untested, however green it looks. So
 * every rule here has a case proving the rejected pixel **would have changed the answer** —
 * the decoy is the pixel itself [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { srgbToLinear } from '@irodora/color-spaces';

/** One sample. `alpha` is 1 for an opaque pixel; a camera frame has no alpha and passes 1. */
export interface Sample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly alpha: number;
}

export type RejectionReason = 'specular' | 'shadow' | 'transparent' | 'background';

export interface RejectionThresholds {
  /**
   * Relative luminance above which a pixel is treated as a highlight rather than as fabric.
   *
   * A specular highlight is the light source, not the object: it carries the illuminant's
   * colour and almost none of the material's. Averaging it in pulls every reading toward the
   * lamp, which is why a photograph under warm light reads warmer than the garment is.
   */
  readonly specularLuminance: number;
  /**
   * The sensor's noise floor, where hue stops being recoverable at all.
   *
   * **Deliberately far lower than "looks dark", and that distinction is the whole rule.** A
   * shadow is not a darker version of the colour; it is a region where chroma information has
   * been lost. Set at roughly sRGB 0.02 — about 5 of 255 — below which 8-bit quantisation
   * dominates what is left of the hue.
   *
   * The first draft of this file used 0.02 **linear**, which is about sRGB 0.14, and its own
   * test caught it: `rgb(0.10, 0.10, 0.12)` — an ordinary navy — was rejected as shadow. This
   * corpus is full of very dark traditional colours (藍墨茶, 藍鼠), so a cut placed at
   * "looks dark" rejects the garment rather than the shadow. Relative darkness is the
   * background rule's job, not this one's.
   */
  readonly shadowLuminance: number;
  /** Anything not effectively opaque cannot be attributed to the material behind it. */
  readonly minAlpha: number;
  /**
   * How far a pixel may sit from the region's own centre, in linear luminance, before it is
   * treated as something else in frame rather than as part of the sample.
   */
  readonly backgroundLuminanceDistance: number;
}

/**
 * Defaults, and what they rest on.
 *
 * **These are conventions, not measurements** (NFR-2 — no number without a row behind it).
 * F-063, the device colour lab, is what produces rows; it is R5. Until then these are stated
 * cut points on a continuum, and a result that depends heavily on one of them has its
 * confidence reduced rather than its value asserted.
 *
 * Recorded as data rather than buried in code so that when the rows exist, what changes is a
 * value here and not a search through the source.
 */
export const DEFAULT_THRESHOLDS: RejectionThresholds = {
  // ~0.90 linear: the top of the range where a consumer sensor still separates hues.
  specularLuminance: 0.9,
  // ~sRGB 0.02 (about 5 of 255), which is 0.02/12.92 on the transfer function's LINEAR
  // segment. Below this, 8-bit quantisation dominates whatever hue is left.
  shadowLuminance: 0.0015,
  minAlpha: 0.99,
  backgroundLuminanceDistance: 0.35,
};

/**
 * Relative luminance, **computed in linear light**.
 *
 * Rec. 709 coefficients on linearised channels. Computing this on encoded values would make
 * every threshold above mean something different at every brightness, which is the same class
 * of error as averaging encoded values [[averaging-non-linear-srgb-reads-too-dark]].
 */
export function linearLuminance(sample: Sample): number {
  return (
    0.2126 * srgbToLinear(sample.r) +
    0.7152 * srgbToLinear(sample.g) +
    0.0722 * srgbToLinear(sample.b)
  );
}

export interface Rejection {
  readonly index: number;
  readonly reason: RejectionReason;
}

export interface Partitioned {
  readonly kept: readonly Sample[];
  readonly rejected: readonly Rejection[];
}

/**
 * Split a region into what counts and what does not.
 *
 * **Background is decided against the region's own median luminance**, not against an absolute
 * value: fabric can legitimately be very dark or very light, and an absolute cut would reject
 * the garment rather than the background whenever the garment was unusual. The median is used
 * rather than the mean precisely because the background is what would drag a mean.
 */
export function partition(
  samples: readonly Sample[],
  thresholds: RejectionThresholds = DEFAULT_THRESHOLDS,
): Partitioned {
  const luminances = samples.map(linearLuminance);
  const sorted = [...luminances].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const centre =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? (sorted[mid] ?? 0)
        : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

  const kept: Sample[] = [];
  const rejected: Rejection[] = [];

  samples.forEach((sample, index) => {
    const y = luminances[index] ?? 0;
    // Order matters for the REASON reported, not for the outcome: a transparent pixel that is
    // also dark should be reported as transparent, because that is the actionable fact.
    if (sample.alpha < thresholds.minAlpha) rejected.push({ index, reason: 'transparent' });
    else if (y >= thresholds.specularLuminance) rejected.push({ index, reason: 'specular' });
    else if (y <= thresholds.shadowLuminance) rejected.push({ index, reason: 'shadow' });
    else if (Math.abs(y - centre) > thresholds.backgroundLuminanceDistance)
      rejected.push({ index, reason: 'background' });
    else kept.push(sample);
  });

  return { kept, rejected };
}
