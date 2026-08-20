/**
 * Many pixels to one colour, **in linear light**.
 *
 * ## The rule this file exists to obey
 *
 * > Averaging happens in linear light. Convert, average, convert back.
 * > [[averaging-non-linear-srgb-reads-too-dark]] · `AGENTS.md` §7
 *
 * sRGB is gamma-encoded: the stored value is roughly the 1/2.2 power of the light. Averaging
 * encoded values is not averaging light, and **the error is one-directional — the result is
 * always too dark.** That is what makes it dangerous: it does not look like a bug, it looks
 * like the photograph was taken in slightly worse light.
 *
 * `averageEncoded` is exported *because* it is wrong. It is the implementation almost everyone
 * writes first, and the golden test compares against it to show the difference as a number
 * rather than asserting the right answer against itself.
 */

import { linearToSrgb, srgbToLinear } from '@irodora/color-spaces';
import type { Sample } from './reject.js';

export interface Aggregate {
  /** Mean in linear light, returned encoded. The value to show. */
  readonly mean: Sample;
  /** Per-channel median, returned encoded. Resists an outlier the rejection rules missed. */
  readonly median: Sample;
  /** Mean of the middle fraction. The compromise between the two above. */
  readonly trimmedMean: Sample;
  /** Variance of linear luminance. High variance means the region was not one colour. */
  readonly variance: number;
  readonly count: number;
}

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

/** Mean of the middle `1 - 2*fraction`. Symmetric, so it stays an estimate of the centre. */
function trimmedMean(xs: readonly number[], fraction: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const cut = Math.floor(s.length * fraction);
  // Never trim everything away: at small counts `cut` can reach half the array, and a mean of
  // an empty slice would silently return 0 — a black colour, reported confidently.
  const slice = s.length - 2 * cut > 0 ? s.slice(cut, s.length - cut) : s;
  return mean(slice);
}

/**
 * Aggregate a region.
 *
 * Every channel is linearised first, aggregated, then re-encoded exactly once. The round trip
 * uses `@irodora/color-spaces`' transfer functions rather than a local `** 2.2`, because the
 * sRGB curve has a **linear segment below 0.04045** and half this corpus lives there
 * [[srgb-transfer-function-has-a-linear-segment]] — a pure power function is wrong precisely
 * in the dark colours a garment photograph is full of.
 */
export function aggregate(samples: readonly Sample[], trimFraction = 0.2): Aggregate {
  const linear = {
    r: samples.map((s) => srgbToLinear(s.r)),
    g: samples.map((s) => srgbToLinear(s.g)),
    b: samples.map((s) => srgbToLinear(s.b)),
  };

  const encode = (pick: (xs: readonly number[]) => number): Sample => ({
    r: linearToSrgb(pick(linear.r)),
    g: linearToSrgb(pick(linear.g)),
    b: linearToSrgb(pick(linear.b)),
    alpha: 1,
  });

  const luminance = samples.map(
    (_, i) =>
      0.2126 * (linear.r[i] ?? 0) + 0.7152 * (linear.g[i] ?? 0) + 0.0722 * (linear.b[i] ?? 0),
  );
  const yBar = mean(luminance);

  return {
    mean: encode(mean),
    median: encode(median),
    trimmedMean: encode((xs) => trimmedMean(xs, trimFraction)),
    variance: luminance.length === 0 ? 0 : mean(luminance.map((y) => (y - yBar) * (y - yBar))),
    count: samples.length,
  };
}

/**
 * The WRONG way, kept deliberately.
 *
 * Averages the encoded values directly. Exported so the golden test can measure the error
 * rather than assert the correct answer against itself — a decoy that is not actually broken
 * proves nothing, and this one is broken in the exact way the real risk is.
 */
export function averageEncoded(samples: readonly Sample[]): Sample {
  return {
    r: mean(samples.map((s) => s.r)),
    g: mean(samples.map((s) => s.g)),
    b: mean(samples.map((s) => s.b)),
    alpha: 1,
  };
}

export { mean as arithmeticMean, median as channelMedian, trimmedMean as channelTrimmedMean };
