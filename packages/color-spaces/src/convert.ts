/**
 * The conversion graph: any space to any space, through the canonical hub.
 *
 * Every conversion goes `from → XYZ (D65) → to`. Not because it is the shortest path — a
 * direct sRGB → linear-sRGB is one transfer function and this route is a transfer function
 * plus two matrices — but because a direct path is a second answer. Two routes between the
 * same pair of spaces disagree in the last bits, and the one that gets used depends on which
 * function the caller happened to reach for. The cost is a few nanoseconds and 1e-15; the
 * benefit is that "convert to Lab" has one meaning (ADR-0003).
 *
 * The two lookup tables are typed `Record<ConvertibleSpace, …>`, so **adding a space to the
 * union fails to compile until both directions exist**. That is what stops a new space from
 * being silently absent from the round-trip matrix, which is the way a conversion ends up
 * shipped untested.
 */

import { adapt } from './adaptation.js';
import { labToXyz, lchToXyz, xyzToLab, xyzToLch } from './lab.js';
import { oklabToXyz, oklchToXyz, xyzToOklab, xyzToOklch } from './oklab.js';
import {
  displayP3ToXyz,
  linearSrgbToXyz,
  srgbToXyz,
  xyzToDisplayP3,
  xyzToLinearSrgb,
  xyzToSrgb,
} from './rgb.js';
import type { ColorSpace, Triple, Xyz } from './types.js';

/**
 * Every space this package converts between, including the canonical hub.
 *
 * `ColorSpace` deliberately excludes XYZ — it is the set of spaces a colour can *arrive* in,
 * and a value whose origin was XYZ is a value whose real origin was lost. This type is the
 * other set: what the conversion graph can address.
 */
export type ConvertibleSpace = ColorSpace | 'xyz-d65';

const TO_XYZ: Record<ConvertibleSpace, (value: Triple) => Xyz> = {
  'xyz-d65': (v) => v,
  srgb: srgbToXyz,
  'display-p3': displayP3ToXyz,
  'linear-srgb': linearSrgbToXyz,
  lab: labToXyz,
  lch: lchToXyz,
  oklab: oklabToXyz,
  oklch: oklchToXyz,
};

const FROM_XYZ: Record<ConvertibleSpace, (xyz: Xyz) => Triple> = {
  'xyz-d65': (xyz) => xyz,
  srgb: xyzToSrgb,
  'display-p3': xyzToDisplayP3,
  'linear-srgb': xyzToLinearSrgb,
  lab: xyzToLab,
  lch: xyzToLch,
  oklab: xyzToOklab,
  oklch: xyzToOklch,
};

/** Every addressable space, in a fixed order so a test over all pairs is reproducible. */
export const CONVERTIBLE_SPACES: readonly ConvertibleSpace[] = [
  'xyz-d65',
  'srgb',
  'display-p3',
  'linear-srgb',
  'lab',
  'lch',
  'oklab',
  'oklch',
];

/** `value`, read as a colour in `space`, as canonical XYZ (D65). */
export function toXyz(value: Triple, space: ConvertibleSpace): Xyz {
  return TO_XYZ[space](value);
}

/** Canonical XYZ (D65) rendered into `space`. Unclamped. */
export function fromXyz(xyz: Xyz, space: ConvertibleSpace): Triple {
  return FROM_XYZ[space](xyz);
}

/**
 * Convert between any two spaces.
 *
 * Converting to the same space returns the input unchanged. Round-tripping through XYZ would
 * cost 1e-16 and produce a value that is not the one that was passed in — which is a strange
 * thing for an identity conversion to do, and shows up in the identity digest.
 */
export function convert(value: Triple, from: ConvertibleSpace, to: ConvertibleSpace): Triple {
  if (from === to) return value;
  return fromXyz(toXyz(value, from), to);
}

/**
 * Convert between spaces measured under different illuminants.
 *
 * Separate from `convert` because it takes two facts a caller has to actually know — what the
 * value was measured under, and what it is being compared against — and a default for either
 * would be a guess dressed as an API.
 */
export function convertAdapted(
  value: Triple,
  from: ConvertibleSpace,
  fromWhite: Xyz,
  to: ConvertibleSpace,
  toWhite: Xyz,
): Triple {
  return fromXyz(adapt(toXyz(value, from), fromWhite, toWhite), to);
}
