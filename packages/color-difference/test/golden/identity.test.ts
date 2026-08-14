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
import { float64Digest, runIdentityVectors } from '@irodora/testing';
import fixture from '../../golden/cross-platform-identity.fixture.json' with { type: 'json' };
import {
  computeDifferenceVector,
  IDENTITY_COUNT,
  IDENTITY_PROBE_INDICES,
  IDENTITY_SEED,
  IDENTITY_VALUES_PER_SAMPLE,
  REFERENCE_SRGB,
} from '../identity/vectors.js';
import { APCA_VERSION, DIFFERENCE_VERSION } from '../../src/index.js';
import type { Rgb } from '@irodora/color-spaces';

const run = runIdentityVectors({
  seed: IDENTITY_SEED,
  count: IDENTITY_COUNT,
  compute: computeDifferenceVector,
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
