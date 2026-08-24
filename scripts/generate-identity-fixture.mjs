#!/usr/bin/env node
/**
 * Irodora — regenerate the cross-platform identity fixtures (NFR-3).
 *
 * One fixture per engine package. `@irodora/color-difference` gets its own rather than being
 * folded into the colour-spaces one, because the dependency runs difference → spaces and a
 * shared fixture would have to live in whichever package could import both — which is
 * neither of them.
 *
 * The fixture pins the exact IEEE-754 output of the colour engine over 10 000 seeded samples.
 * Gate 5 recomputes the digest on every run, so a change of a single bit anywhere in any
 * conversion fails the build.
 *
 * **This lives in `scripts/` rather than in the test suite for a reason worth keeping.** The
 * colour-engine ESLint zone forbids `node:*` in `packages/color-*` — tests included — and
 * writing a file needs `node:fs`. That is the rule working: a fixture the test suite can
 * rewrite is a fixture that gets rewritten to make a red test green, which is precisely the
 * failure the fixture exists to prevent. Regenerating is a deliberate act, at a keyboard.
 *
 * **A changed digest with no intended engine change is a defect, not a stale fixture.**
 *
 * Usage:
 *   pnpm build && node scripts/generate-identity-fixture.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = resolve(ROOT, 'packages/color-spaces');
const OUT = resolve(PACKAGE, 'golden/cross-platform-identity.fixture.json');

const engine = await import(pathToFileURL(resolve(PACKAGE, 'dist/index.js')).href);
const testing = await import(pathToFileURL(resolve(ROOT, 'packages/testing/dist/index.js')).href);

const { adapt, convert, CONVERTIBLE_SPACES, D50, D65, srgbToXyz, ENGINE_VERSION } = engine;
const { runIdentityVectors, float64ToHex } = testing;

const ADAPTATIONS = ['cat16', 'bradford'];

/**
 * MUST stay identical to `computeIdentityVector` in
 * packages/color-spaces/test/identity/vectors.ts. The test asserts that the two agree by
 * recomputing the digest through the test-side function, so a divergence fails gate 5 rather
 * than producing a fixture nothing checks.
 */
const compute = (rgb) => {
  const xyz = srgbToXyz(rgb);
  const values = [];

  for (const space of CONVERTIBLE_SPACES) {
    const converted = convert(xyz, 'xyz-d65', space);
    values.push(converted[0], converted[1], converted[2]);
  }
  for (const method of ADAPTATIONS) {
    const adapted = adapt(xyz, D65, D50, method);
    values.push(adapted[0], adapted[1], adapted[2]);
  }

  return values;
};

const run = runIdentityVectors({
  seed: 'irodora/f-006/identity',
  count: 10_000,
  compute,
  probeIndices: [0, 1, 2, 3, 5_000, 9_999],
});

const fixture = {
  id: 'cross-platform-identity',
  description:
    'A determinism fixture, NOT a claim about physical reality. It pins the exact IEEE-754 output of the engine over 10,000 seeded samples so that any change of a single bit — in any conversion, on any platform — fails gate 5. A changed digest with no intended engine change is a defect.',
  regenerate: 'pnpm build && node scripts/generate-identity-fixture.mjs',
  attested:
    'The Node execution is gated. The browser and React Native executions are attested obligations (ADR-0038) and land with F-017 and F-039/F-040, which import test/identity/vectors.ts and assert THIS digest.',
  engineVersion: ENGINE_VERSION,
  spaces: [...CONVERTIBLE_SPACES],
  adaptations: ADAPTATIONS,
  seed: run.seed,
  count: run.count,
  valuesPerSample: run.valuesPerSample,
  digest: run.digest,
  probes: run.probes,
};

writeFileSync(OUT, `${JSON.stringify(fixture, null, 2)}\n`);

console.log(`\nIdentity fixture written to ${OUT.replace(ROOT, '.')}`);
console.log(
  `  engine ${ENGINE_VERSION} · ${String(run.count)} samples × ${String(run.valuesPerSample)} values`,
);
console.log(`  digest ${run.digest}\n`);

/* ------------------------------------------------ @irodora/color-difference */

const DIFFERENCE = resolve(ROOT, 'packages/color-difference');
const DIFFERENCE_OUT = resolve(DIFFERENCE, 'golden/cross-platform-identity.fixture.json');

const difference = await import(pathToFileURL(resolve(DIFFERENCE, 'dist/index.js')).href);
const spaces = engine;

const {
  deltaE00,
  deltaE76,
  deltaE94,
  deltaEok,
  wcagContrast,
  apcaLc,
  DIFFERENCE_VERSION,
  APCA_VERSION,
} = difference;
const { xyzToLab, xyzToOklab, srgbToLinear } = spaces;

/** A fixed reference every sample is measured against. Mid grey, so it is not a special case. */
const REFERENCE_SRGB = [0.5, 0.5, 0.5];
const REFERENCE_LAB = xyzToLab(srgbToXyz(REFERENCE_SRGB));
const REFERENCE_OKLAB = xyzToOklab(srgbToXyz(REFERENCE_SRGB));
const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];

/**
 * MUST stay identical to `computeDifferenceVector` in
 * packages/color-difference/test/identity/vectors.ts. The test recomputes the digest through
 * the test-side function, so a divergence fails gate 5 rather than producing a fixture that
 * nothing checks.
 */
const computeDifference = (rgb) => {
  const xyz = srgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const oklab = xyzToOklab(xyz);

  return [
    deltaE76(lab, REFERENCE_LAB),
    deltaE94(lab, REFERENCE_LAB),
    deltaE00(lab, REFERENCE_LAB),
    deltaEok(oklab, REFERENCE_OKLAB),
    wcagContrast(rgb, WHITE),
    wcagContrast(rgb, BLACK),
    apcaLc(WHITE, rgb),
    apcaLc(BLACK, rgb),
  ];
};

const differenceRun = runIdentityVectors({
  seed: 'irodora/f-007/identity',
  count: 10_000,
  compute: computeDifference,
  // Widened from six to five hundred in F-083. Probes are RECORDED, never digested, so this
  // cannot move `digest` — asserted byte-identical across the regeneration, as every round.
  probeIndices: Array.from({ length: 500 }, (_, i) => i * 20),
});

/** MUST stay identical to `computeStageVector` in the test-side vectors module (F-083). */
const computeStages = (rgb) => {
  const xyz = srgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const oklab = xyzToOklab(xyz);

  return [
    srgbToLinear(rgb[0]),
    srgbToLinear(rgb[1]),
    srgbToLinear(rgb[2]),
    xyz[0],
    xyz[1],
    xyz[2],
    lab[0],
    lab[1],
    lab[2],
    oklab[0],
    oklab[1],
    oklab[2],
  ];
};

const PROBE_INDICES = Array.from({ length: 500 }, (_, i) => i * 20);

const stageRun = runIdentityVectors({
  seed: 'irodora/f-007/identity',
  count: 10_000,
  compute: computeStages,
  probeIndices: PROBE_INDICES,
});

const differenceFixture = {
  id: 'cross-platform-identity',
  description:
    'A determinism fixture for the difference and contrast metrics, NOT a claim about physical reality. These functions use more transcendentals than the conversions do — pow, atan2, exp, sin, cos — and ECMAScript specifies all of them as implementation-approximated, so this is where a cross-engine divergence is most likely to appear first.',
  regenerate: 'pnpm build && node scripts/generate-identity-fixture.mjs',
  attested:
    'The Node execution is gated. The browser and React Native executions are attested obligations (ADR-0038), landing with F-017 and F-039/F-040.',
  differenceVersion: DIFFERENCE_VERSION,
  apcaVersion: APCA_VERSION,
  metrics: [
    'deltaE76',
    'deltaE94',
    'deltaE00',
    'deltaEok',
    'wcagContrast(c, white)',
    'wcagContrast(c, black)',
    'apcaLc(white, c)',
    'apcaLc(black, c)',
  ],
  referenceSrgb: REFERENCE_SRGB,
  seed: differenceRun.seed,
  count: differenceRun.count,
  valuesPerSample: differenceRun.valuesPerSample,
  digest: differenceRun.digest,
  /*
   * One digest per metric, in `metrics` order. The whole-run digest says "something changed";
   * this says WHICH metric, which is the question the first Linux CI run raised and could not
   * answer — it disagreed with `digest` while every recorded probe matched exactly, so the
   * divergence is a handful of samples out of 10,000 somewhere in eight metrics.
   *
   * Adding these does NOT change `digest`. If it ever appears to, the fixture was regenerated
   * against a changed engine and that is the defect the fixture exists to catch.
   */
  metricDigests: differenceRun.perValueDigests,
  /*
   * F-083. The intermediate values every metric is built on, digested one stage at a time,
   * over the SAME samples. All eight metric digests disagreed on Linux — including deltaE76,
   * which is a Euclidean distance and contains no implementation-approximated operation — so
   * the inputs diverged and these say where. MUST stay identical to STAGE_NAMES and
   * computeStageVector in packages/color-difference/test/identity/vectors.ts.
   */
  stages: ['linearR', 'linearG', 'linearB', 'X', 'Y', 'Z', 'L*', 'a*', 'b*', 'okL', 'oka', 'okb'],
  stageDigests: stageRun.perValueDigests,
  /* F-083 round 4: how MANY samples diverge. One failing chunk is one unlucky input; ninety is structural. */
  chunkSize: 100,
  metricChunkDigests: differenceRun.chunkDigests,
  stageChunkDigests: stageRun.chunkDigests,
  /*
   * F-083 round 3. Exact doubles rather than digests, because a digest says something
   * differs and these say WHAT. Round 2 narrowed the divergence to `linearR` and only
   * `linearR`, which does not reconcile with X/Y/Z reproducing — unless very few samples
   * diverge and it is the REFERENCE, computed once from mid grey, that moves every ΔE.
   * MUST stay identical to CONSTANT_NAMES / computeConstants in the test-side vectors module.
   */
  constantNames: [
    'srgbToLinear(0)',
    'srgbToLinear(0.0031308)',
    'srgbToLinear(0.04045)',
    'srgbToLinear(0.05)',
    'srgbToLinear(0.1)',
    'srgbToLinear(1/3)',
    'srgbToLinear(0.5)',
    'srgbToLinear(0.8)',
    'srgbToLinear(0.999)',
    'srgbToLinear(1)',
    'REFERENCE_LAB.L',
    'REFERENCE_LAB.a',
    'REFERENCE_LAB.b',
    'REFERENCE_OKLAB.L',
    'REFERENCE_OKLAB.a',
    'REFERENCE_OKLAB.b',
  ],
  constants: [
    srgbToLinear(0),
    srgbToLinear(0.003_130_8),
    srgbToLinear(0.040_45),
    srgbToLinear(0.05),
    srgbToLinear(0.1),
    srgbToLinear(1 / 3),
    srgbToLinear(0.5),
    srgbToLinear(0.8),
    srgbToLinear(0.999),
    srgbToLinear(1),
    REFERENCE_LAB[0],
    REFERENCE_LAB[1],
    REFERENCE_LAB[2],
    REFERENCE_OKLAB[0],
    REFERENCE_OKLAB[1],
    REFERENCE_OKLAB[2],
  ].map(float64ToHex),
  probes: differenceRun.probes,
  /*
   * The same samples through the conversion stages, in exact hex. The metric probes say which
   * OUTPUT moved; these say which STAGE it moved at, for the same colour, which is the pair
   * that turns "something diverges" into a diagnosis.
   */
  stageProbes: stageRun.probes,
};

writeFileSync(DIFFERENCE_OUT, `${JSON.stringify(differenceFixture, null, 2)}\n`);

console.log(`Difference fixture written to ${DIFFERENCE_OUT.replace(ROOT, '.')}`);
console.log(
  `  difference ${DIFFERENCE_VERSION} · APCA ${APCA_VERSION} · ${String(differenceRun.count)} samples × ${String(differenceRun.valuesPerSample)} values`,
);
console.log(`  digest ${differenceRun.digest}\n`);
