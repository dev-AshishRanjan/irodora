/**
 * The numeric primitives every conversion is built from.
 *
 * Small, and deliberately so: the whole point of this module is that there is exactly one
 * matrix multiply in the engine, so a transcription error has one place to be found rather
 * than nine copies to be compared. Nothing here approximates anything.
 */

import type { Matrix3 } from './types.js';

/**
 * `m · v`, row-major, unrolled.
 *
 * Unrolled rather than looped because the order of the additions is then written down and
 * cannot change. Floating-point addition is not associative, so a loop that a future
 * optimiser reorders would change results in the last bits — which is the difference between
 * NFR-3 holding and NFR-3 being a hope.
 */
export function applyMatrix3(
  m: Matrix3,
  v: readonly [number, number, number],
): readonly [number, number, number] {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
  const [x, y, z] = v;

  return [m00 * x + m01 * y + m02 * z, m10 * x + m11 * y + m12 * z, m20 * x + m21 * y + m22 * z];
}

/** `a · b`, row-major. Used to compose adaptation transforms, never to invert one. */
export function multiplyMatrix3(a: Matrix3, b: Matrix3): Matrix3 {
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = a;
  const [b00, b01, b02, b10, b11, b12, b20, b21, b22] = b;

  return [
    a00 * b00 + a01 * b10 + a02 * b20,
    a00 * b01 + a01 * b11 + a02 * b21,
    a00 * b02 + a01 * b12 + a02 * b22,
    a10 * b00 + a11 * b10 + a12 * b20,
    a10 * b01 + a11 * b11 + a12 * b21,
    a10 * b02 + a11 * b12 + a12 * b22,
    a20 * b00 + a21 * b10 + a22 * b20,
    a20 * b01 + a21 * b11 + a22 * b21,
    a20 * b02 + a21 * b12 + a22 * b22,
  ];
}

/**
 * A hue angle folded into `[0, 360)`.
 *
 * Hue is an angle, and the errors that come from forgetting it are not subtle: the mean of
 * 350° and 10° is 0°, not 180°. `((h % 360) + 360) % 360` rather than a single `%` because
 * JavaScript's `%` keeps the sign of the dividend, so `-10 % 360` is `-10`.
 */
export function normalizeHue(degrees: number): number {
  const folded = ((degrees % 360) + 360) % 360;
  // `-1e-15 % 360` folds to 360 rather than 0 once the additions round. A hue of exactly 360
  // is the same angle as 0 but a different number, and it would show up as a difference in
  // the identity digest.
  return folded === 360 ? 0 : folded;
}

/** The shortest signed arc from `from` to `to`, in `(-180, 180]`. */
export function hueDelta(from: number, to: number): number {
  const raw = normalizeHue(to) - normalizeHue(from);
  if (raw > 180) return raw - 360;
  if (raw <= -180) return raw + 360;
  return raw;
}

const DEG_PER_RAD = 180 / Math.PI;

/** Radians → degrees, folded to `[0, 360)`. */
export const radiansToDegrees = (radians: number): number => normalizeHue(radians * DEG_PER_RAD);

/** Degrees → radians. */
export const degreesToRadians = (degrees: number): number => degrees / DEG_PER_RAD;
