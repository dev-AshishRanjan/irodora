/**
 * What the cross-platform identity check computes (NFR-3).
 *
 * This module is the *definition* of the vector set: the inputs, the order of the outputs,
 * and how many numbers each sample produces. It is separate from the test that asserts the
 * digest so that the browser and React Native legs — F-017 and F-039/F-040, both currently
 * attested (ADR-0038) — can import exactly this and run the identical computation, rather
 * than reimplementing it and comparing two things that were never the same.
 *
 * It is also why it contains no `expect`, no `node:*`, and no platform global.
 *
 * **The output order is part of the fixture.** Adding a conversion, removing one, or moving
 * one changes the digest for a reason that is not a defect — and the fixture's
 * `valuesPerSample` field is what makes that distinguishable from a real change.
 */

import {
  adapt,
  convert,
  CONVERTIBLE_SPACES,
  D50,
  D65,
  srgbToXyz,
  type Triple,
} from '../../src/index.js';

/** The seed and size the committed fixture was produced with. */
export const IDENTITY_SEED = 'irodora/f-006/identity';
export const IDENTITY_COUNT = 10_000;

/** Samples recorded in full, in exact hex, so a digest mismatch names a colour. */
export const IDENTITY_PROBE_INDICES: readonly number[] = [0, 1, 2, 3, 5_000, 9_999];

/**
 * Every number the engine produces for one sRGB input.
 *
 * Eight spaces × 3 components, then both adaptation transforms × 3 — 30 values. The
 * adaptations are included because they are the only part of the engine that composes a
 * matrix at runtime, which is the part most likely to differ between engines.
 */
export function computeIdentityVector(rgb: Triple): readonly number[] {
  const xyz = srgbToXyz(rgb);
  const values: number[] = [];

  for (const space of CONVERTIBLE_SPACES) {
    const converted = convert(xyz, 'xyz-d65', space);
    values.push(converted[0], converted[1], converted[2]);
  }

  for (const method of ['cat16', 'bradford'] as const) {
    const adapted = adapt(xyz, D65, D50, method);
    values.push(adapted[0], adapted[1], adapted[2]);
  }

  return values;
}

/** How many numbers `computeIdentityVector` returns. Pinned, so a silent change is loud. */
export const IDENTITY_VALUES_PER_SAMPLE = 30;
