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
import {
  float64Digest,
  float64ToHex,
  hexToFloat64,
  runIdentityVectors,
  ulpDistance,
} from '@irodora/testing';
import fixture from '../../golden/cross-platform-identity.fixture.json' with { type: 'json' };
import {
  computeDifferenceVector,
  computeConstants,
  computeCanonicalVector,
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

/** The same samples at the product's display precision. See `computeCanonicalVector`. */
const canonicalRun = runIdentityVectors({
  seed: IDENTITY_SEED,
  count: IDENTITY_COUNT,
  compute: computeCanonicalVector,
  probeIndices: [],
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
    /** What fails the build. */
    const findings: string[] = [];
    /**
     * What is reported and never asserted (ADR-0061).
     *
     * Raw-double differences across platforms go here. They are worth SEEING — a change is
     * interesting even when it is not a defect — and asserting them meant a permanently red
     * gate, which is the same outcome as deleting it and takes longer.
     */
    const notes: string[] = [];

    /*
     * THE GUARANTEE (ADR-0061). Every metric rounded to the product's display precision, then
     * digested. This is what NFR-3 promises now — what a person can observe is identical on
     * every platform — and it is asserted exactly. Regenerating the fixture to make THIS one
     * green is the single thing it exists to prevent.
     */
    if (canonicalRun.digest !== fixture.canonicalDigest)
      findings.push(
        `canonical digest (${String(fixture.canonicalSignificantDigits)} sig digits): got ${canonicalRun.digest}, ` +
          `committed ${fixture.canonicalDigest} — a value the product SHOWS differs, which is a ` +
          'real engine change and not platform noise',
      );

    /*
     * The RAW double digest is recorded and NOT asserted, and that is the whole of ADR-0061.
     *
     * It does not reproduce across platforms and no engine built on `Math.pow` can make it:
     * ECMAScript specifies the transcendentals as implementation-approximated, and Node ships
     * Windows builds from MSVC and Linux from GCC/Clang. Measured at 2–4 ULP on ~0.2 % of
     * inputs. Asserting it meant a permanently red gate, which is the same outcome as deleting
     * the gate and takes longer.
     *
     * What stops this being a shrug: the canonical digest above catches anything a person
     * could observe, and the probe ULP bound below catches the magnitude growing.
     */
    if (run.digest !== fixture.digest)
      notes.push(
        `raw double digest differs: got ${run.digest}, committed ${fixture.digest}. NOT a ` +
          'failure — see ADR-0061.',
      );

    const differing = (
      label: string,
      names: readonly string[],
      actual: readonly (string | undefined)[],
      committed: readonly string[],
    ): void => {
      const bad = names.flatMap((name, i) => (actual[i] === committed[i] ? [] : [name]));
      if (bad.length)
        // A note, not a finding: these are digests over RAW doubles, and raw doubles are not
        // identical across platforms (ADR-0061). They say WHERE; the ULP bound says whether
        // it matters.
        notes.push(`${label}: ${String(bad.length)}/${String(names.length)} differ — ${bad.join(', ')}`);
    };

    // Which METRIC. deltaE00 alone would point at atan2/sin/cos/exp; apcaLc at pow;
    // deltaE76 at nothing transcendental, which puts the fault upstream.
    differing('metrics', fixture.metrics, run.perValueDigests, fixture.metricDigests);

    // Which STAGE, so the fault names an operation rather than a metric.
    differing('stages', STAGE_NAMES, stageRun.perValueDigests, fixture.stageDigests);

    /*
     * The references and the transfer function at fixed inputs, in exact hex — judged by the
     * SAME ULP bound as everything else, because they are raw doubles too. They reproduce on
     * every platform measured so far, and that is luck rather than a property: nothing makes
     * srgbToLinear(0.5) more portable than srgbToLinear(x) for any other x.
     */
    const constants = computeConstants().map(float64ToHex);
    for (const [i, name] of CONSTANT_NAMES.entries()) {
      const got = constants[i];
      const want = fixture.constants[i];
      if (got === undefined || want === undefined || got === want) continue;
      const distance = ulpDistance(hexToFloat64(got), hexToFloat64(want));
      (distance > fixture.maxProbeUlp ? findings : notes).push(
        `constant ${name}: got ${got}, committed ${want} (${String(distance)} ulp)` +
          (distance > fixture.maxProbeUlp
            ? ` — EXCEEDS the ${String(fixture.maxProbeUlp)} ulp bound (ADR-0061).`
            : ''),
      );
    }

    // HOW MANY samples, which separates one unlucky input from a structural difference.
    const chunks = (
      label: string,
      actual: readonly string[],
      committed: readonly string[],
    ): void => {
      const bad = committed.flatMap((d, i) => (actual[i] === d ? [] : [i]));
      if (bad.length)
        notes.push(
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

    /*
     * BY HOW MUCH (F-083). Every round so far has answered "where" and none has answered
     * "how far", and those are the same red gate for completely different products: a
     * last-ulp disagreement between two libm implementations is a labelling problem, and a
     * visible colour difference is a broken engine.
     *
     * ULP rather than a relative epsilon, because a relative measure flatters values near
     * zero and punishes values near a binade edge. "1 ulp" says exactly what happened: two
     * runtimes rounded the same real number to adjacent representable neighbours.
     *
     * Aggregated per column rather than per probe — there are 500 probes, and 500 findings
     * in one message is the unreadable wall the annotation cap already taught us about.
     */
    const magnitude = (
      label: string,
      names: readonly string[],
      actual: readonly { index: number; rgb: readonly string[]; output: readonly string[] }[],
      committed: readonly { index: number; rgb: readonly string[]; output: readonly string[] }[],
    ): void => {
      const worst = names.map(() => ({ n: 0, ulp: 0, at: -1, got: '', want: '', rgb: '' }));
      let inputsDiffer = 0;

      for (const [i, probe] of actual.entries()) {
        const want = committed[i];
        if (!want) continue;

        // If the INPUTS differ, the sample sets are not the same and nothing below means
        // anything. Nothing has shown this yet, and it would be far bigger news than a
        // divergent engine — it would be a divergent PRNG.
        if (probe.rgb.join(',') !== want.rgb.join(',')) {
          inputsDiffer++;
          continue;
        }

        for (const [j] of names.entries()) {
          const got = probe.output[j];
          const committedHex = want.output[j];
          if (got === undefined || committedHex === undefined || got === committedHex) continue;

          const distance = ulpDistance(hexToFloat64(got), hexToFloat64(committedHex));
          const w = worst[j];
          if (!w) continue;
          w.n++;
          if (distance > w.ulp) {
            w.ulp = distance;
            w.at = probe.index;
            w.got = got;
            w.want = committedHex;
            w.rgb = want.rgb.join(' ');
          }
        }
      }

      if (inputsDiffer)
        findings.push(
          `${label}: ${String(inputsDiffer)} probe INPUTS differ — the sample sets are not ` +
            'identical, which would be a divergent PRNG rather than a divergent engine',
        );

      for (const [j, w] of worst.entries())
        if (w.n)
          // Under the bound this is platform noise and belongs in the log. Over it, something
          // changed that measurement does not explain, and that stops the build.
          (w.ulp > fixture.maxProbeUlp ? findings : notes).push(
            `${label} ${String(names[j])}: ${String(w.n)}/${String(actual.length)} probes differ, ` +
              `worst ${String(w.ulp)} ulp at sample ${String(w.at)} (rgb ${w.rgb}) — ` +
              `got ${w.got}, committed ${w.want}` +
              (w.ulp > fixture.maxProbeUlp
                ? ` — EXCEEDS the ${String(fixture.maxProbeUlp)} ulp bound. Platform noise is ` +
                  'measured at 2-4 ulp; this is larger and needs explaining before it is ' +
                  'accepted (ADR-0061).'
                : ''),
          );
    };

    magnitude('metric', fixture.metrics, run.probes, fixture.probes);
    magnitude('stage', STAGE_NAMES, stageRun.probes, fixture.stageProbes);

    if (notes.length)
      console.info(
        '  raw-double differences, reported and NOT asserted (ADR-0061):\n    ' +
          notes.join('\n    '),
      );

    expect(
      findings,
      `NFR-3: this platform does not reproduce the committed fixture (F-083).\n  ` +
        findings.join('\n  '),
    ).toHaveLength(0);
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
