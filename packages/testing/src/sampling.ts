/**
 * Deterministic sampling of the sRGB cube.
 *
 * A uniform sample of the cube is the wrong sample for this product. Uniform sampling puts
 * roughly 0.02% of its points below the sRGB transfer function's linear cutoff — so an
 * implementation using the pure power function throughout would pass a uniform round-trip
 * test with room to spare, while being visibly wrong on indigo, sumi and charcoal, which are
 * half the corpus. [[srgb-transfer-function-has-a-linear-segment]]
 *
 * So the sample is stratified, and the strata are named after what they are there to catch.
 * The composition is fixed by index rather than by a random draw, so the same seed and the
 * same count always produce not just the same numbers but the same *mix* of numbers.
 */

import { createPrng } from './prng.js';

/** A colour as three components, in whatever space the caller is sampling. */
export type Triple = readonly [number, number, number];

/** What a sample is there to stress. Carried through so a failure names its stratum. */
export type Stratum = 'uniform' | 'near-black' | 'near-neutral' | 'high-chroma';

export interface Sample {
  readonly index: number;
  readonly stratum: Stratum;
  readonly rgb: Triple;
}

/** How many samples of each stratum appear in every four. */
export const STRATA_CYCLE = 4;

/** Chosen by position rather than by lookup, so no index can be out of range. */
function stratumFor(index: number): Stratum {
  switch (index % STRATA_CYCLE) {
    case 0:
      return 'uniform';
    case 1:
      return 'near-black';
    case 2:
      return 'near-neutral';
    default:
      return 'high-chroma';
  }
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * `count` sRGB samples in `[0, 1]`, cycling through the four strata.
 *
 * `near-black` covers `[0, 0.05]`, which straddles the 0.04045 cutoff in both directions —
 * a stratum entirely below the cutoff would only exercise the linear branch and would miss a
 * discontinuity at the join, which is the other way this function is got wrong.
 */
export function sampleSrgb(seed: string, count: number): readonly Sample[] {
  const prng = createPrng(seed);
  const samples: Sample[] = [];

  for (let index = 0; index < count; index++) {
    const stratum = stratumFor(index);
    let rgb: Triple;

    switch (stratum) {
      case 'uniform':
        rgb = [prng.next(), prng.next(), prng.next()];
        break;
      case 'near-black':
        rgb = [prng.between(0, 0.05), prng.between(0, 0.05), prng.between(0, 0.05)];
        break;
      case 'near-neutral': {
        const base = prng.next();
        rgb = [
          clamp01(base + prng.between(-0.03, 0.03)),
          clamp01(base + prng.between(-0.03, 0.03)),
          clamp01(base + prng.between(-0.03, 0.03)),
        ];
        break;
      }
      case 'high-chroma': {
        const dominant = Math.floor(prng.between(0, 3));
        const high = prng.between(0.7, 1);
        const low = (): number => prng.between(0, 0.3);
        rgb =
          dominant === 0
            ? [high, low(), low()]
            : dominant === 1
              ? [low(), high, low()]
              : [low(), low(), high];
        break;
      }
    }

    samples.push({ index, stratum, rgb });
  }

  return samples;
}
