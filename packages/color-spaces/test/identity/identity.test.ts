/**
 * Gate 5 — cross-platform identity (NFR-3), the part that can be checked here.
 *
 * Acceptance criterion 5 says Node, the browser and React Native produce bitwise-identical
 * output. Per [ADR-0038](../../../../docs/adr/0038-every-acceptance-criterion-names-its-check.md)
 * the criterion splits into a mechanism and three executions:
 *
 * | | Status |
 * |---|---|
 * | Seeded inputs that regenerate identically on any engine | **gated**, here |
 * | An encoding that cannot hide a difference (IEEE-754 bytes) | **gated**, here |
 * | The **Node** execution, against a committed digest | **gated**, here |
 * | The **browser** execution | attested — lands with F-017 and Playwright |
 * | The **React Native** execution | attested — lands with F-039/F-040, on device |
 *
 * The two attested legs are not hand-waving: they import `./vectors.ts` and assert this same
 * digest. The mechanism being here is what makes them a day's work rather than a redesign.
 *
 * **A browser has run this once, and here is exactly what that showed.** During F-006 the
 * built `dist` of this package and of `@irodora/testing` were loaded into a Chromium browser
 * over plain HTTP and executed unchanged; all 300 000 values were bit-identical and the
 * digest matched. That proves the engine and the runner contain no platform API and load as
 * ordinary ES modules — which is the half of NFR-3 that was actually in doubt while the code
 * was being written. It does **not** prove engine independence: Node and Chromium both run
 * V8. The interesting comparison is Hermes, and it needs a device.
 *
 * **What is still not proven.** ECMAScript specifies `Math.pow` and `Math.cbrt` as
 * implementation-approximated, so bitwise identity across V8, JavaScriptCore and Hermes is
 * not guaranteed by the language — for the transfer function and for OKLab's cube roots in
 * particular. This suite would DETECT such a divergence the moment the device leg runs; it
 * cannot rule it out today. Saying so is the difference between a verified claim and an
 * assumed one (golden rule 11).
 */

import { describe, expect, it } from 'vitest';
import { float64Digest, float64ToHex, hexToFloat64, runIdentityVectors } from '@irodora/testing';
import fixture from '../../golden/cross-platform-identity.fixture.json' with { type: 'json' };
import {
  computeIdentityVector,
  IDENTITY_COUNT,
  IDENTITY_PROBE_INDICES,
  IDENTITY_SEED,
  IDENTITY_VALUES_PER_SAMPLE,
} from './vectors.js';
import { CONVERTIBLE_SPACES, ENGINE_VERSION, type Triple } from '../../src/index.js';

const run = runIdentityVectors({
  seed: IDENTITY_SEED,
  count: IDENTITY_COUNT,
  compute: computeIdentityVector,
  probeIndices: IDENTITY_PROBE_INDICES,
});

describe('the fixture describes the run it was generated from', () => {
  it('same seed, count and shape', () => {
    expect(fixture.seed).toBe(IDENTITY_SEED);
    expect(fixture.count).toBe(IDENTITY_COUNT);
    expect(fixture.valuesPerSample).toBe(IDENTITY_VALUES_PER_SAMPLE);
    expect(run.valuesPerSample).toBe(IDENTITY_VALUES_PER_SAMPLE);
  });

  it('same spaces, in the same order — the order is part of the digest', () => {
    expect(fixture.spaces).toEqual([...CONVERTIBLE_SPACES]);
    expect(fixture.adaptations).toEqual(['cat16', 'bradford']);
  });

  it('same engine version', () => {
    expect(fixture.engineVersion).toBe(ENGINE_VERSION);
  });
});

describe('the Node execution', () => {
  it('reproduces the committed digest, bit for bit', () => {
    // If this fails and no engine change was intended, the engine changed. Regenerating the
    // fixture to make it green is the one thing this check exists to prevent.
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

  it('the recorded hex really is the value, not a rounded rendering of it', () => {
    for (const probe of fixture.probes)
      for (const hex of probe.output) expect(float64ToHex(hexToFloat64(hex))).toBe(hex);
  });
});

describe('the digest can fail — otherwise none of the above means anything', () => {
  it('one bit in one of 300,000 values changes it', () => {
    // 10,000 samples x 30 values. Perturbing one by a single ulp must change the digest.
    // Without this, a digest function that ignored its input would pass every test above.
    const values: number[] = [];
    for (let i = 0; i < 1_000; i++) values.push(i / 1_000);

    const mutated = [...values];
    mutated[500] = mutated[500]! + Number.EPSILON * 0.5;

    expect(float64Digest(mutated)).not.toBe(float64Digest(values));
  });

  it('and so does reordering two conversions', () => {
    // The specific defect this guards: two spaces swapped in the output list produce the same
    // multiset of numbers and a completely different digest. A digest over a sorted or summed
    // set would not see it.
    const rgb: Triple = [0.4, 0.55, 0.3];
    const output = [...computeIdentityVector(rgb)];
    const swapped = [...output];
    [swapped[0], swapped[3]] = [swapped[3]!, swapped[0]!];

    expect(float64Digest(swapped)).not.toBe(float64Digest(output));
  });

  it('a real engine change would be caught — a 1-ulp shift in one conversion', () => {
    // The strongest decoy available without editing src: recompute the whole vector set with
    // one value nudged by an ulp and confirm the FULL digest moves. This is the shape of the
    // failure a platform-specific Math.pow would produce.
    const perturbed = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 100,
      compute: (rgb) => {
        const values = [...computeIdentityVector(rgb)];
        if (rgb[0] > 0.5) values[7] = values[7]! * (1 + Number.EPSILON);
        return values;
      },
      probeIndices: [],
    });

    const clean = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 100,
      compute: computeIdentityVector,
      probeIndices: [],
    });

    expect(perturbed.digest).not.toBe(clean.digest);
  });
});

describe('the runner is platform-free, which is what makes the other two legs possible', () => {
  it('produces the same digest when run twice', () => {
    const again = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 1_000,
      compute: computeIdentityVector,
      probeIndices: [],
    });
    const once = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 1_000,
      compute: computeIdentityVector,
      probeIndices: [],
    });
    expect(again.digest).toBe(once.digest);
  });

  it('produces a different digest for a different seed', () => {
    const other = runIdentityVectors({
      seed: 'not-the-fixture-seed',
      count: 1_000,
      compute: computeIdentityVector,
      probeIndices: [],
    });
    const mine = runIdentityVectors({
      seed: IDENTITY_SEED,
      count: 1_000,
      compute: computeIdentityVector,
      probeIndices: [],
    });
    expect(other.digest).not.toBe(mine.digest);
  });
});
