/**
 * The cross-platform identity runner (NFR-3).
 *
 * The claim is that the engine produces **bitwise identical** output in Node, the browser and
 * React Native. Three things are needed to check that, and only the third is platform-bound:
 *
 *   1. inputs that regenerate identically everywhere — the seeded PRNG;
 *   2. an output encoding that cannot hide a difference — IEEE-754 bytes, not decimals;
 *   3. an execution on each platform.
 *
 * (1) and (2) live here, and this module is deliberately free of `node:*`, the DOM and
 * `process`, so the same file runs unchanged inside a `<script type="module">` and on a
 * device. A runner that could only execute in Node would make the other two legs unrunnable
 * and turn NFR-3 into something nobody could ever check.
 *
 * The engine itself is passed in rather than imported: this package must not depend on
 * `@irodora/color-spaces`, or the Turborepo graph closes a cycle the moment F-010 lands.
 */

import { float64Digest, float64ToHex } from './bits.js';
import { sampleSrgb, type Triple } from './sampling.js';

/** One sample's full output, in exact hex. Stored for a handful of indices so a digest mismatch is diagnosable. */
export interface IdentityProbe {
  readonly index: number;
  readonly rgb: readonly string[];
  readonly output: readonly string[];
}

export interface IdentityRun {
  readonly seed: string;
  readonly count: number;
  /** Numbers produced per sample. Part of the fixture: a change here changes the digest for a reason that is not a defect. */
  readonly valuesPerSample: number;
  readonly digest: string;
  readonly probes: readonly IdentityProbe[];
}

export interface IdentityOptions {
  readonly seed: string;
  readonly count: number;
  /** Every number the engine produces for one input. Order matters and is part of the fixture. */
  readonly compute: (rgb: Triple) => readonly number[];
  /** Sample indices to record in full, for diagnosis. A digest alone says "something changed". */
  readonly probeIndices: readonly number[];
}

/**
 * Run the whole vector set and return its digest.
 *
 * Values are fed to the digest in sample order and then in output order, so a permutation is
 * a different digest. That matters: two conversions swapped in the output list is a real
 * defect that produces the same multiset of numbers.
 */
export function runIdentityVectors(options: IdentityOptions): IdentityRun {
  const { seed, count, compute, probeIndices } = options;
  const samples = sampleSrgb(seed, count);
  const probeSet = new Set(probeIndices);

  const probes: IdentityProbe[] = [];
  const all: number[] = [];
  let valuesPerSample = -1;

  for (const { index, rgb } of samples) {
    const output = compute(rgb);

    if (valuesPerSample === -1) valuesPerSample = output.length;
    else if (output.length !== valuesPerSample)
      throw new Error(
        `identity run: sample ${String(index)} produced ${String(output.length)} values, expected ${String(valuesPerSample)}`,
      );

    for (const value of output) all.push(value);

    if (probeSet.has(index))
      probes.push({
        index,
        rgb: rgb.map(float64ToHex),
        output: output.map(float64ToHex),
      });
  }

  return { seed, count, valuesPerSample, digest: float64Digest(all), probes };
}
