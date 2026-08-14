#!/usr/bin/env node
/**
 * Irodora — regenerate the cross-platform identity fixture (NFR-3).
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
const { runIdentityVectors } = testing;

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
