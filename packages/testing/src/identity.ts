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
  /**
   * One digest per output column, across every sample.
   *
   * The whole-run digest answers *"did anything change"*. This answers **which metric**, and
   * that turned out to be the question that matters: the first Linux CI run disagreed with
   * the committed difference digest while every recorded probe matched exactly, so a handful
   * of samples out of 10,000 diverge somewhere in eight metrics and the digest alone cannot
   * say where. A column digest costs one hash per metric and localises a transcendental
   * disagreement to the function that produced it.
   */
  readonly perValueDigests: readonly string[];
  /**
   * One digest per block of {@link CHUNK_SIZE} consecutive samples.
   *
   * Answers *how many* samples diverge, which is the question that separates two completely
   * different defects. One failing chunk means a single unlucky input — a last-ulp
   * disagreement in one transcendental. Ninety failing chunks means the divergence is
   * everywhere and the cause is structural.
   *
   * F-083 needs exactly that distinction: `linearR` disagrees on Linux while `X`, `Y` and `Z`
   * — which are linear combinations of it — do not, and all four ΔE columns disagree while
   * their only inputs (per-sample Lab, and a reference confirmed identical) do not. Those
   * cannot both be true of the same number of samples, so counting them is the way out.
   */
  readonly chunkDigests: readonly string[];
  readonly probes: readonly IdentityProbe[];
}

/** Samples per chunk digest. 100 gives 100 chunks over the standard 10,000-sample run. */
export const CHUNK_SIZE = 100;

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
  /** Column-major, for the per-metric digests. Built alongside rather than by transposing. */
  const columns: number[][] = [];
  let valuesPerSample = -1;

  for (const { index, rgb } of samples) {
    const output = compute(rgb);

    if (valuesPerSample === -1) valuesPerSample = output.length;
    else if (output.length !== valuesPerSample)
      throw new Error(
        `identity run: sample ${String(index)} produced ${String(output.length)} values, expected ${String(valuesPerSample)}`,
      );

    for (const [j, value] of output.entries()) {
      all.push(value);
      // `??=` rather than pre-allocating and indexing: the column count is only known after
      // the first sample, and a non-null assertion here would be a claim the type system
      // cannot check on a hot path that runs 80,000 times.
      (columns[j] ??= []).push(value);
    }

    if (probeSet.has(index))
      probes.push({
        index,
        rgb: rgb.map(float64ToHex),
        output: output.map(float64ToHex),
      });
  }

  const chunkDigests: string[] = [];
  const perChunk = CHUNK_SIZE * Math.max(valuesPerSample, 1);
  for (let start = 0; start < all.length; start += perChunk)
    chunkDigests.push(float64Digest(all.slice(start, start + perChunk)));

  return {
    seed,
    count,
    valuesPerSample,
    digest: float64Digest(all),
    perValueDigests: columns.map((column) => float64Digest(column)),
    chunkDigests,
    probes,
  };
}
