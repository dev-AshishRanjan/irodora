/**
 * How good was this capture, and what should the person do about it (FR-18).
 *
 * ## Poor quality blocks a claim; it does not decorate one
 *
 * FR-18: *"poor quality blocks a confident claim and returns a specific, actionable
 * instruction"*. Both halves matter. A quality score shown beside a confident-looking answer
 * is read as a footnote, and the answer is what the person acts on — so `poor` caps confidence
 * hard, and it comes with an instruction naming what to change rather than "quality: poor".
 *
 * ## The region has dimensions, and that is not incidental
 *
 * Blur and illumination uniformity are **spatial** properties. They cannot be computed from an
 * unordered list of pixels, and a function that claimed to would be returning a number derived
 * from nothing. So the input is a `Region` with `width` and `height`, and blur is measured from
 * the actual gradient between neighbours.
 *
 * The alternative — taking `blur` as a parameter someone else computed — is the self-declared
 * metric shape: a caller that computes it wrongly, or forgets, is invisible to every check.
 */

import { aggregate } from './statistics.js';
import { linearLuminance, partition, type Sample } from './reject.js';

export type CaptureQuality = 'excellent' | 'good' | 'fair' | 'poor';

/** A sampling region with its shape. `samples` is row-major, `width * height` long. */
export interface Region {
  readonly samples: readonly Sample[];
  readonly width: number;
  readonly height: number;
}

export interface QualityAssessment {
  readonly quality: CaptureQuality;
  readonly confidenceCeiling: number;
  /** What to change. Empty when nothing needs changing. */
  readonly instruction: string;
  /**
   * Every check the capture failed, in the order a person should fix them ({@link QUALITY_CHECKS}).
   * `quality` is how many there are, and `instruction` is the first one's (F-236): a surface that
   * refuses a capture names the check, its threshold and what to do, from here.
   */
  readonly failures: readonly QualityCheck[];
  readonly metrics: QualityMetrics;
}

export interface QualityMetrics {
  /** Fraction of pixels clipped at either end of the range. */
  readonly clipped: number;
  /** Mean gradient magnitude in linear luminance. Low means soft or out of focus. */
  readonly sharpness: number;
  /** Large-scale luminance falloff across the region, 0 is even. */
  readonly unevenness: number;
  /** How many samples survived rejection. */
  readonly usableSamples: number;
  /** Variance of linear luminance among usable samples. High means more than one colour. */
  readonly colourVariance: number;
}

/**
 * Thresholds. **Conventions, not measurements** (NFR-2 — no number without a row behind it).
 *
 * F-063 produces rows and is R5. Declared as data, so the swap is a value change.
 */
export const QUALITY_THRESHOLDS = {
  /** FR-15 asks for at least 1000 samples. Below it, confidence is capped rather than faked. */
  minSamples: 1000,
  maxClipped: 0.02,
  minSharpness: 0.002,
  maxUnevenness: 0.25,
  maxColourVariance: 0.02,
} as const;

/**
 * The checks a capture is held to, in the order a person should FIX them — not by the severity of
 * the number. An instruction that names the second-most-important problem gets followed and does
 * not help. The order is FR-18's and predates the names; F-236 named the checks so a surface can say
 * which one failed.
 */
export const QUALITY_CHECKS = [
  'samples',
  'clipping',
  'evenness',
  'sharpness',
  'singleColour',
] as const;
export type QualityCheck = (typeof QUALITY_CHECKS)[number];

/** One check: the metric it reads, which side of its threshold fails, and which threshold. */
export interface QualityCheckRule {
  readonly metric: keyof QualityMetrics;
  readonly fails: 'below' | 'above';
  readonly threshold: keyof typeof QUALITY_THRESHOLDS;
}

/**
 * What each check reads and against what — DATA, so the one comparison `assessQuality` makes is
 * the one a refusal can describe, and neither retypes a threshold.
 */
export const QUALITY_CHECK_RULES: Readonly<Record<QualityCheck, QualityCheckRule>> = {
  samples: { metric: 'usableSamples', fails: 'below', threshold: 'minSamples' },
  clipping: { metric: 'clipped', fails: 'above', threshold: 'maxClipped' },
  evenness: { metric: 'unevenness', fails: 'above', threshold: 'maxUnevenness' },
  sharpness: { metric: 'sharpness', fails: 'below', threshold: 'minSharpness' },
  singleColour: { metric: 'colourVariance', fails: 'above', threshold: 'maxColourVariance' },
};

/** What to change, per check: the engine's own words. */
export const QUALITY_INSTRUCTIONS: Readonly<Record<QualityCheck, string>> = {
  samples: 'move closer, or select a larger area of the fabric',
  clipping: 'the exposure is clipping — move out of direct light, or reduce exposure',
  evenness: 'the light falls unevenly across the fabric — avoid mixed lighting',
  sharpness: 'hold steadier, or let the camera focus',
  singleColour: 'more than one colour is in the area — select a single region of fabric',
};

/** The checks a set of metrics fails, in fix-first order. */
export function failedChecks(metrics: QualityMetrics): QualityCheck[] {
  return QUALITY_CHECKS.filter((check) => {
    const rule = QUALITY_CHECK_RULES[check];
    const value = metrics[rule.metric];
    const limit = QUALITY_THRESHOLDS[rule.threshold];
    return rule.fails === 'below' ? value < limit : value > limit;
  });
}

export const QUALITY_CEILING: Readonly<Record<CaptureQuality, number>> = {
  excellent: 1,
  good: 0.9,
  fair: 0.7,
  // Not zero: the reading may still be roughly right. But it may not be presented as confident.
  poor: 0.3,
};

/**
 * Mean gradient magnitude between horizontal and vertical neighbours, in linear luminance.
 *
 * A sharp capture of a textured fabric has real gradient energy; a blurred one does not. It is
 * deliberately measured on *linear* luminance — computing it on encoded values would make the
 * same physical blur measure differently at different brightnesses, which is the same class of
 * error as averaging encoded values.
 */
function sharpness(region: Region): number {
  const { width, height, samples } = region;
  if (width < 2 || height < 2) return 0;
  const y = samples.map(linearLuminance);
  let total = 0;
  let n = 0;
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const here = y[row * width + col] ?? 0;
      if (col + 1 < width) {
        total += Math.abs((y[row * width + col + 1] ?? 0) - here);
        n += 1;
      }
      if (row + 1 < height) {
        total += Math.abs((y[(row + 1) * width + col] ?? 0) - here);
        n += 1;
      }
    }
  return n === 0 ? 0 : total / n;
}

/**
 * Large-scale luminance falloff: the difference between the brightest and darkest quadrant
 * means, over the region mean.
 *
 * Quadrants rather than per-pixel variance on purpose — per-pixel variance cannot tell a
 * *shadow across the frame* from a *patterned fabric*, and only the first is an illumination
 * problem. A gradient across quadrants is a lighting gradient; texture averages out inside one.
 */
function unevenness(region: Region): number {
  const { width, height, samples } = region;
  if (width < 2 || height < 2) return 0;
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  const sums = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const q = (row < halfH ? 0 : 2) + (col < halfW ? 0 : 1);
      const s = samples[row * width + col];
      if (s === undefined) continue;
      sums[q] = (sums[q] ?? 0) + linearLuminance(s);
      counts[q] = (counts[q] ?? 0) + 1;
    }
  const means = sums.map((s, i) => ((counts[i] ?? 0) === 0 ? 0 : s / (counts[i] ?? 1)));
  const overall = means.reduce((a, b) => a + b, 0) / 4;
  return overall < 1e-6 ? 0 : (Math.max(...means) - Math.min(...means)) / overall;
}

/** Assess a capture, and say what to do about it. */
export function assessQuality(region: Region): QualityAssessment {
  const { kept } = partition(region.samples);
  const stats = aggregate(kept);

  const clipped =
    region.samples.length === 0
      ? 1
      : region.samples.filter((s) => {
          const y = linearLuminance(s);
          return y >= 0.99 || y <= 0.001;
        }).length / region.samples.length;

  const metrics: QualityMetrics = {
    clipped,
    sharpness: sharpness(region),
    unevenness: unevenness(region),
    usableSamples: kept.length,
    colourVariance: stats.variance,
  };

  // In fix-first order (QUALITY_CHECKS), each compared as QUALITY_CHECK_RULES says.
  const failures = failedChecks(metrics);
  const quality: CaptureQuality =
    failures.length === 0
      ? 'excellent'
      : failures.length === 1
        ? 'good'
        : failures.length === 2
          ? 'fair'
          : 'poor';

  const first = failures[0];
  return {
    quality,
    confidenceCeiling: QUALITY_CEILING[quality],
    instruction: first === undefined ? '' : QUALITY_INSTRUCTIONS[first],
    failures,
    metrics,
  };
}

/**
 * The confidence a result may carry, given both assessments.
 *
 * **The minimum, never a product or an average.** A ceiling is a ceiling: a capture that is
 * excellent under mixed light is still under mixed light, and multiplying the two would
 * produce a number lower than either — which is not what either assessment said.
 */
export function confidenceCeiling(illumination: number, quality: number): number {
  return Math.min(illumination, quality);
}
