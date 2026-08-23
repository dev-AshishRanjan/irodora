/**
 * Gate 5 — cross-platform identity for the difference and contrast metrics (NFR-3).
 *
 * Same split as `@irodora/color-spaces`: the mechanism, the fixture and the Node execution are
 * gated here; the browser and React Native executions are attested (ADR-0038) and land with
 * F-017 and F-039/F-040, importing `../identity/vectors.ts` and asserting this same digest.
 *
 * **This fixture matters more than the conversions' one.** CIEDE2000 alone calls `atan2`,
 * `exp`, `sin`, `cos` and `pow`, and ECMAScript specifies every one as
 * implementation-approximated. If engines ever disagree, it shows up here first.
 */

import { describe, expect, it } from 'vitest';
import { float64Digest, float64ToHex, runIdentityVectors } from '@irodora/testing';
import fixture from '../../golden/cross-platform-identity.fixture.json' with { type: 'json' };
import {
  computeDifferenceVector,
  computeConstants,
  computeStageVector,
  IDENTITY_COUNT,
  IDENTITY_PROBE_INDICES,
  IDENTITY_SEED,
  IDENTITY_VALUES_PER_SAMPLE,
  REFERENCE_SRGB,
  CONSTANT_NAMES,
  STAGE_NAMES,
} from '../identity/vectors.js';
import { APCA_VERSION, DIFFERENCE_VERSION } from '../../src/index.js';
import type { Rgb } from '@irodora/color-spaces';

const run = runIdentityVectors({
  seed: IDENTITY_SEED,
  count: IDENTITY_COUNT,
  compute: computeDifferenceVector,
  probeIndices: IDENTITY_PROBE_INDICES,
});

/** The same samples, digested one conversion stage at a time. See `computeStageVector`. */
const stageRun = runIdentityVectors({
  seed: IDENTITY_SEED,
  count: IDENTITY_COUNT,
  compute: computeStageVector,
  probeIndices: IDENTITY_PROBE_INDICES,
});

describe('the fixture describes the run it was generated from', () => {
  it('same seed, count and shape', () => {
    expect(fixture.seed).toBe(IDENTITY_SEED);
    expect(fixture.count).toBe(IDENTITY_COUNT);
    expect(fixture.valuesPerSample).toBe(IDENTITY_VALUES_PER_SAMPLE);
    expect(run.valuesPerSample).toBe(IDENTITY_VALUES_PER_SAMPLE);
  });

  it('same reference colour — it is part of the digest, not a detail', () => {
    expect(fixture.referenceSrgb).toEqual([...REFERENCE_SRGB]);
  });

  it('same versions, including APCA’s revision', () => {
    expect(fixture.differenceVersion).toBe(DIFFERENCE_VERSION);
    expect(fixture.apcaVersion).toBe(APCA_VERSION);
  });

  it('the metric list matches the output length', () => {
    expect(fixture.metrics).toHaveLength(IDENTITY_VALUES_PER_SAMPLE);
  });
});

describe('the Node execution', () => {
  it('reproduces the committed digest, bit for bit', () => {
    // If this fails and no change was intended, something changed. Regenerating the fixture
    // to make it green is the one thing it exists to prevent.
    expect(run.digest).toBe(fixture.digest);
  });

  /*
   * Per metric, because the whole-run digest cannot say WHERE.
   *
   * The first Linux CI run (2026-08-23) disagreed with `digest` while every recorded probe
   * matched exactly — so a handful of samples out of 10,000 diverge, somewhere in eight
   * metrics, and a single hash names none of them. These assertions name one.
   *
   * Which metric it is, is the whole diagnosis: `deltaE00` alone would point at `atan2`,
   * `sin`, `cos` and `exp`; `apcaLc` at `pow`; `deltaE76` at nothing transcendental at all,
   * which would mean the divergence is upstream in the conversions and something much worse
   * than a last-ulp disagreement.
   */
  it.each(fixture.metrics.map((metric, index) => ({ metric, index })))(
    'reproduces the committed digest for $metric',
    ({ metric, index }) => {
      expect(run.perValueDigests[index], `metric "${metric}" (column ${String(index)})`).toBe(
        fixture.metricDigests[index],
      );
    },
  );

  it('and the probes match, so a mismatch names a colour rather than a hash', () => {
    expect(run.probes).toHaveLength(fixture.probes.length);
    for (const [i, probe] of run.probes.entries()) {
      const expected = fixture.probes[i]!;
      expect(probe.index).toBe(expected.index);
      expect(probe.rgb).toEqual(expected.rgb);
      expect(probe.output).toEqual(expected.output);
    }
  });
});

/**
 * The stage digests, which locate a divergence rather than merely detecting one (F-083).
 *
 * All eight metric digests disagreed on Linux — including `deltaE76`, which is a Euclidean
 * distance and contains no implementation-approximated operation. A metric that cannot
 * diverge, diverging, means its INPUTS did, and these assertions say at which stage.
 *
 * Read them in order and stop at the first failure: it names the operation.
 */
describe('the stages every metric is built on', () => {
  it.each(STAGE_NAMES.map((stage, index) => ({ stage, index })))(
    'reproduces the committed digest for $stage',
    ({ stage, index }) => {
      expect(stageRun.perValueDigests[index], `stage "${stage}" (column ${String(index)})`).toBe(
        fixture.stageDigests[index],
      );
    },
  );
});

/**
 * Exact doubles, so a failure names the value rather than a hash (F-083, round 3).
 *
 * A digest says *something* differs. These say *what*, in IEEE-754 hex, which reduces the
 * whole investigation to a line anybody can paste into a REPL on either platform.
 */
describe('the constants every measurement is taken against', () => {
  const actual = computeConstants().map(float64ToHex);

  it.each(CONSTANT_NAMES.map((name, index) => ({ name, index })))(
    'reproduces $name exactly',
    ({ name, index }) => {
      expect(actual[index], `constant "${name}"`).toBe(fixture.constants[index]);
    },
  );
});

/**
 * How MANY samples diverge — the question that separates two different defects (F-083).
 *
 * Round 3 left a contradiction. `linearR` disagrees on Linux while `X`, `Y` and `Z` — linear
 * combinations of it — do not. All four ΔE columns disagree while their only inputs, the
 * per-sample Lab and a reference now confirmed byte-identical, do not. Both cannot be true of
 * the same set of samples.
 *
 * Counting is the way out. **One** failing chunk in the stage run and **many** in the metric
 * run would mean two unrelated causes. The same handful in both would mean one cause and a
 * mistake in the reasoning above. Reported as counts rather than as a hundred assertions,
 * because the number is the finding.
 */
describe('how much of the run diverges', () => {
  const mismatched = (actual: readonly string[], expected: readonly string[]): number[] =>
    expected.flatMap((d, i) => (actual[i] === d ? [] : [i]));

  it('the metric run reproduces in every 100-sample chunk', () => {
    const bad = mismatched(run.chunkDigests, fixture.metricChunkDigests);
    expect(
      bad.length,
      `metric chunks that differ: ${String(bad.length)} of ${String(fixture.metricChunkDigests.length)} — first few at sample indices ${bad
        .slice(0, 8)
        .map((c) => `${String(c * fixture.chunkSize)}..${String((c + 1) * fixture.chunkSize - 1)}`)
        .join(', ')}`,
    ).toBe(0);
  });

  it('the stage run reproduces in every 100-sample chunk', () => {
    const bad = mismatched(stageRun.chunkDigests, fixture.stageChunkDigests);
    expect(
      bad.length,
      `stage chunks that differ: ${String(bad.length)} of ${String(fixture.stageChunkDigests.length)} — first few at sample indices ${bad
        .slice(0, 8)
        .map((c) => `${String(c * fixture.chunkSize)}..${String((c + 1) * fixture.chunkSize - 1)}`)
        .join(', ')}`,
    ).toBe(0);
  });
});

describe('the digest can fail', () => {
  it('a one-ulp change in any of 80,000 values moves it', () => {
    const perturbed = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 200,
      compute: (rgb: Rgb) => {
        const values = [...computeDifferenceVector(rgb)];
        if (rgb[1] > 0.5) values[2] = values[2]! * (1 + Number.EPSILON);
        return values;
      },
      probeIndices: [],
    });

    const clean = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 200,
      compute: computeDifferenceVector,
      probeIndices: [],
    });

    expect(perturbed.digest).not.toBe(clean.digest);
  });

  it('and reordering two metrics moves it — the order is part of the fixture', () => {
    const output = [...computeDifferenceVector([0.4, 0.55, 0.3])];
    const swapped = [...output];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(float64Digest(swapped)).not.toBe(float64Digest(output));
  });
});
