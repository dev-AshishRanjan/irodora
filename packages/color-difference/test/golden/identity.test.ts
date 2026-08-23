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

/**
 * ONE assertion, carrying the whole comparison (F-083, round 5).
 *
 * ## Why this is one test and not thirty-nine
 *
 * It used to be thirty-nine: a digest, eight metrics, twelve stages, sixteen constants and
 * two chunk counts, each its own `it`. **GitHub Actions publishes at most ten failure
 * annotations per check run**, and the public API returns only those ten. Three consecutive
 * diagnoses were drawn from that truncated list — "only `linearR` diverges", "every constant
 * reproduces", "the chunk counts are clean" — and each was an artefact of the cap rather than
 * a finding. The apparent contradiction they produced (a divergent `linearR` with clean
 * `X`/`Y`/`Z`, ΔE moving with identical inputs) most likely never existed.
 *
 * A report split across more assertions than the reporting channel can carry is a report that
 * silently lies about what passed. So everything is compared here and reported in a single
 * failure message, which the annotation carries whole.
 *
 * The individual comparisons are unchanged — only how they are surfaced.
 */
describe('the Node execution', () => {
  it('reproduces the committed fixture on this platform', () => {
    const findings: string[] = [];

    // The headline. Regenerating the fixture to make this green is the one thing it exists
    // to prevent.
    if (run.digest !== fixture.digest)
      findings.push(`whole-run digest: got ${run.digest}, committed ${fixture.digest}`);

    const differing = (
      label: string,
      names: readonly string[],
      actual: readonly (string | undefined)[],
      committed: readonly string[],
    ): void => {
      const bad = names.flatMap((name, i) => (actual[i] === committed[i] ? [] : [name]));
      if (bad.length)
        findings.push(`${label}: ${String(bad.length)}/${String(names.length)} differ — ${bad.join(', ')}`);
    };

    // Which METRIC. deltaE00 alone would point at atan2/sin/cos/exp; apcaLc at pow;
    // deltaE76 at nothing transcendental, which puts the fault upstream.
    differing('metrics', fixture.metrics, run.perValueDigests, fixture.metricDigests);

    // Which STAGE, so the fault names an operation rather than a metric.
    differing('stages', STAGE_NAMES, stageRun.perValueDigests, fixture.stageDigests);

    // Exact doubles, so a constant that moved prints both values rather than a hash.
    const constants = computeConstants().map(float64ToHex);
    for (const [i, name] of CONSTANT_NAMES.entries())
      if (constants[i] !== fixture.constants[i])
        findings.push(`constant ${name}: got ${String(constants[i])}, committed ${String(fixture.constants[i])}`);

    // HOW MANY samples, which separates one unlucky input from a structural difference.
    const chunks = (
      label: string,
      actual: readonly string[],
      committed: readonly string[],
    ): void => {
      const bad = committed.flatMap((d, i) => (actual[i] === d ? [] : [i]));
      if (bad.length)
        findings.push(
          `${label} chunks: ${String(bad.length)}/${String(committed.length)} differ — samples ` +
            bad
              .slice(0, 6)
              .map(
                (c) =>
                  `${String(c * fixture.chunkSize)}..${String((c + 1) * fixture.chunkSize - 1)}`,
              )
              .join(', ') +
            (bad.length > 6 ? ', …' : ''),
        );
    };
    chunks('metric', run.chunkDigests, fixture.metricChunkDigests);
    chunks('stage', stageRun.chunkDigests, fixture.stageChunkDigests);

    // The recorded samples, in full hex, so a mismatch names a colour.
    for (const [i, probe] of run.probes.entries()) {
      const expected = fixture.probes[i];
      if (!expected) continue;
      if (probe.rgb.join(',') !== expected.rgb.join(','))
        findings.push(`probe ${String(probe.index)} input differs — the SAMPLES are not identical`);
      else if (probe.output.join(',') !== expected.output.join(','))
        findings.push(`probe ${String(probe.index)} output differs: ${probe.output.join(' ')}`);
    }

    expect(
      findings,
      `NFR-3: this platform does not reproduce the committed fixture (F-083).\n  ` +
        findings.join('\n  '),
    ).toEqual([]);
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
