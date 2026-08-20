/**
 * What light was this taken under, and how much that costs the confidence (FR-17).
 *
 * ## The problem, stated before the solution
 *
 * **You cannot separate the illuminant from the material by looking at one coloured patch.**
 * A blue garment under white light and a white garment under blue light produce the same
 * pixels. Any classifier that claims otherwise from a flat region is guessing, and this one
 * says `unknown` instead.
 *
 * ## What can be estimated, and it is a nice inversion
 *
 * **The pixels rejected for the material are the ones that describe the light.** A specular
 * highlight is the light source reflected off the surface: it carries the illuminant's colour
 * and almost none of the material's, which is exactly why
 * [`partition`](./reject.ts) throws it out of the colour estimate. Here it is the signal.
 *
 * So classification runs on the **specular** pixels, and where there are too few of them it
 * returns `unknown` rather than inventing an answer from the fabric.
 *
 * ## And it caps confidence rather than asserting accuracy
 *
 * ADR-0031 and NFR-21: no claim the system cannot demonstrate. Mixed and low light do not make
 * a reading wrong, they make it **less trustworthy**, and the honest expression of that is a
 * ceiling on confidence — not a warning string beside a number that still says 0.95.
 */

import { linearLuminance, type Sample } from './reject.js';
import { srgbToLinear } from '@irodora/color-spaces';

export type Illumination =
  'daylight' | 'warm-indoor' | 'cool-indoor' | 'mixed' | 'low-light' | 'unknown';

export interface IlluminationAssessment {
  readonly kind: Illumination;
  /** The ceiling this places on any confidence derived from the sample, in [0,1]. */
  readonly confidenceCeiling: number;
  /** Why, in terms a person could act on. */
  readonly reason: string;
}

/**
 * Confidence ceilings. **Conventions, not measurements** (NFR-2 — no number without a row).
 *
 * F-063, the device colour lab, is what produces rows and it is R5. Declared as data so that
 * when the rows exist the change is a value here rather than a search through the source.
 */
export const ILLUMINATION_CEILING: Readonly<Record<Illumination, number>> = {
  daylight: 1,
  'warm-indoor': 0.85,
  'cool-indoor': 0.85,
  // Two illuminants means no single white point applies, so no single correction can be right.
  mixed: 0.5,
  // The sensor is in its noise floor; hue is what degrades first.
  'low-light': 0.4,
  // We could not tell. That is not the same as "it was fine", and it must not read as 1.
  unknown: 0.6,
};

/** Below this mean linear luminance the frame is under-exposed enough to lose hue. */
const LOW_LIGHT_LUMINANCE = 0.02;
/** Fewer highlights than this and there is nothing to read the illuminant from. */
const MIN_HIGHLIGHTS = 8;
/** The brightest fraction of the region, taken as the illuminant estimate. */
const HIGHLIGHT_QUANTILE = 0.05;
/**
 * How much brighter than the region's median a bright pixel must be before it counts as a
 * highlight rather than as pale fabric.
 *
 * Without this, the top 5% of a plain light-grey jumper is "the illuminant", and the
 * classifier confidently describes the material as the light — which is the exact failure this
 * module's header says it refuses to commit.
 */
const HIGHLIGHT_BRIGHTNESS_RATIO = 2.5;
/**
 * How far two highlights may differ in blue/red ratio before the scene is treated as lit by
 * more than one source. A single illuminant reflects consistently; two do not.
 */
const MIXED_RATIO_SPREAD = 0.35;

/** Blue over red, in linear light. The axis correlated colour temperature moves along. */
function blueRedRatio(s: Sample): number {
  const r = srgbToLinear(s.r);
  const b = srgbToLinear(s.b);
  // Guard the black case rather than returning Infinity, which would poison every statistic
  // downstream and do it silently.
  return r < 1e-6 ? 1 : b / r;
}

const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

/**
 * Classify the light.
 *
 * Takes the whole region. It finds its own highlights rather than being handed the material
 * rule's rejections, because the two rules answer different questions — see below.
 */
export function assessIllumination(samples: readonly Sample[]): IlluminationAssessment {
  const at = (kind: Illumination, reason: string): IlluminationAssessment => ({
    kind,
    confidenceCeiling: ILLUMINATION_CEILING[kind],
    reason,
  });

  if (samples.length === 0) return at('unknown', 'there were no samples to assess');

  const meanLuminance = samples.reduce((sum, s) => sum + linearLuminance(s), 0) / samples.length;

  // Low light first: it dominates everything else, and a hue read from noise is not a hue.
  if (meanLuminance < LOW_LIGHT_LUMINANCE)
    return at('low-light', 'the scene is too dark to read colour reliably — add light');

  // THE BRIGHTEST QUANTILE OF THE REGION — deliberately NOT the pixels `partition` rejected
  // as specular.
  //
  // Those two are different jobs and the first draft conflated them, which made the classifier
  // structurally blind to the light it most needs to detect. The material rule rejects above
  // 0.9 linear luminance; a WARM highlight is red-weighted, and green carries 0.7152 of
  // luminance, so a tungsten highlight tops out around 0.87 and is never rejected as specular.
  // Reading illumination from that set meant warm light could not be classified at all — the
  // classifier only ever saw highlights that were already near-white.
  const ordered = samples.map((s) => ({ s, y: linearLuminance(s) })).sort((a, b) => b.y - a.y);
  const take = Math.max(MIN_HIGHLIGHTS, Math.floor(samples.length * HIGHLIGHT_QUANTILE));
  const brightest = ordered.slice(0, take);
  const regionMedian = median(ordered.map((o) => o.y));

  // Bright is not the same as a highlight. Pale fabric has a brightest 5% too, and reading the
  // illuminant off it describes the material as the light.
  const isHighlight =
    brightest.length >= MIN_HIGHLIGHTS &&
    regionMedian > 0 &&
    median(brightest.map((o) => o.y)) > regionMedian * HIGHLIGHT_BRIGHTNESS_RATIO;

  const highlights = isHighlight ? brightest.map((o) => o.s) : [];

  if (highlights.length < MIN_HIGHLIGHTS)
    return at(
      'unknown',
      'there were too few highlights to read the light from. The illuminant cannot be ' +
        'separated from the material by looking at the material — a blue garment under white ' +
        'light and a white garment under blue light are the same pixels',
    );

  const ratios = highlights.map(blueRedRatio);
  const spread = Math.max(...ratios) - Math.min(...ratios);
  if (spread > MIXED_RATIO_SPREAD)
    return at(
      'mixed',
      'more than one light source is in play, so no single white point applies — ' +
        'move away from the window, or turn one source off',
    );

  const centre = median(ratios);
  // Blue-over-red on a neutral highlight rises with colour temperature. Tungsten is strongly
  // red-weighted; daylight is near-balanced to blue-weighted.
  // Cut points calibrated to the ratios a REAL highlight produces, measured rather than
  // guessed: a tungsten highlight sits near 0.64, a neutral one near 1.07, and a cool/daylight
  // one above 1.15. The first draft used 0.6/0.9, which no reachable highlight straddled.
  if (centre < 0.8) return at('warm-indoor', 'warm indoor light, around tungsten');
  if (centre < 1.1) return at('cool-indoor', 'cool indoor light, around fluorescent or LED');
  return at('daylight', 'daylight, or a source close to it');
}
