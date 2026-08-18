/**
 * The OKLCh operations every generator is built from.
 *
 * **Why OKLCh and not HSL.** Rotating hue in HSL produces perceptually inconsistent steps: a
 * 30° rotation from yellow and a 30° rotation from blue are not the same perceptual distance,
 * and people notice even when they cannot say why (`color-engine.md` §9).
 *
 * That is an assertion this whole package rests on, so `test/harmony.test.ts` **measures it**
 * rather than repeating it. A claim the repository makes and never checks is the class of
 * defect the last two features each shipped one of.
 *
 * Nothing here converts between spaces — `@irodora/color-spaces` does that. These are arithmetic
 * on an OKLCh triple, plus the wrapping and clamping that arithmetic needs to stay meaningful.
 */

import type { Triple } from '@irodora/color-spaces';
import { HarmonyError } from './errors.js';

/** OKLCh as this package handles it: `[L, C, h]`, `L` in [0,1], `C` >= 0, `h` in degrees. */
export type Oklch = Triple;

/**
 * The largest chroma a `near-neutral` result may carry.
 *
 * A stated ceiling, not a measurement. It is the same order as the design system's own chroma
 * ceiling for surfaces (0.01), chosen so a near-neutral reads as a tinted grey rather than as a
 * desaturated colour. Uncalibrated, and labelled as such.
 */
export const NEAR_NEUTRAL_CHROMA = 0.02;

/**
 * Wrap a hue into [0, 360).
 *
 * `((x % 360) + 360) % 360` rather than a bare `%`: JavaScript's remainder keeps the sign of the
 * dividend, so `-30 % 360` is `-30`, and a negative hue is not a hue. Every rotation goes
 * through here for that reason.
 */
export function wrapHue(degrees: number): number {
  if (!Number.isFinite(degrees))
    throw new HarmonyError('wrapHue', `expected a finite angle; got ${String(degrees)}`);
  return ((degrees % 360) + 360) % 360;
}

/** The shortest angular distance between two hues, in [0, 180]. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(wrapHue(a) - wrapHue(b));
  return d > 180 ? 360 - d : d;
}

export function assertOklch(oklch: Oklch, what: string): void {
  const [l, c, h] = oklch;
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h))
    throw new HarmonyError(what, `OKLCh must be finite; got [${oklch.join(', ')}]`);
  if (l < 0 || l > 1) throw new HarmonyError(what, `OKLCh L is [0, 1]; got ${String(l)}`);
  if (c < 0) throw new HarmonyError(what, `chroma cannot be negative; got ${String(c)}`);
}

/** Rotate hue, holding L and C. */
export function rotateHue(oklch: Oklch, degrees: number): Oklch {
  return [oklch[0], oklch[1], wrapHue(oklch[2] + degrees)];
}

/**
 * Set lightness, clamped to [0, 1].
 *
 * Clamping rather than throwing: a lightness ramp that walks off the end is a legitimate
 * request for "as light as it goes", and refusing it would make `monochromatic` unusable near
 * the extremes. The clamp is why two steps of a ramp can coincide at the ends, which the tests
 * assert rather than treat as a surprise.
 */
export function withLightness(oklch: Oklch, l: number): Oklch {
  return [Math.min(1, Math.max(0, l)), oklch[1], oklch[2]];
}

/** Set chroma, clamped at zero below. */
export function withChroma(oklch: Oklch, c: number): Oklch {
  return [oklch[0], Math.max(0, c), oklch[2]];
}

/** Scale chroma by a factor. */
export function scaleChroma(oklch: Oklch, factor: number): Oklch {
  if (!Number.isFinite(factor) || factor < 0)
    throw new HarmonyError('scaleChroma', `expected a non-negative factor; got ${String(factor)}`);
  return withChroma(oklch, oklch[1] * factor);
}

/**
 * A lightness ramp of `count` steps spanning `[min, max]`.
 *
 * Endpoints included, so a 5-step ramp over [0.2, 0.8] gives 0.2 and 0.8 rather than stopping
 * short of both. `count === 1` returns the midpoint, which is the only non-arbitrary answer.
 */
export function lightnessRamp(count: number, min: number, max: number): readonly number[] {
  if (!Number.isInteger(count) || count < 1)
    throw new HarmonyError(
      'lightnessRamp',
      `expected a positive integer count; got ${String(count)}`,
    );
  if (count === 1) return [(min + max) / 2];
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
}
