/**
 * Proof that the wire-schema ↔ engine-type pin (ADR-0036) still has no holes.
 *
 * `packages/contracts/src/color.test.ts` asserts the two artefacts are one shape, and that
 * assertion is only worth what it CATCHES. It has been wrong twice:
 *
 * 1. Mutual assignability alone missed an extra OPTIONAL property — found during F-002 and
 *    fixed by adding `keyof` equality.
 * 2. `keyof` equality stopped working the moment F-010 made `Provenance` a discriminated
 *    union, because `keyof` on a union returns only the keys COMMON to every member. An
 *    optional field added to one member passed `pnpm typecheck` in silence. Verified by
 *    doing it.
 *
 * So the pin is now per-member, and this script is what says so. Each probe adds an optional
 * field to one part of the schema and asserts typecheck goes red — with the baseline
 * asserted green first, because a probe against an already-red tree proves nothing.
 * [[a-decoy-that-is-not-broken-proves-nothing]] [[mutual-assignability-does-not-catch-an-optional-field]]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const FILE = `${ROOT}/packages/contracts/src/color.ts`;

const typecheck = () => {
  try {
    // A shell on both platforms: `cmd` does not exist on Linux, and `pnpm` on Windows is a
    // `.cmd` shim Node 20+ will not spawn directly. See verify-contrast-proof.mjs, where the
    // same line left four mutation cases dead on Linux from the day they were written.
    execSync('pnpm --filter @irodora/contracts typecheck', {
      cwd: ROOT,
      stdio: 'pipe',
    });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
};

const probes = [
  ['optional field on the CAPTURED member', '  conditions: captureConditionsSchema,\n});'],
  [
    'optional field on the UNTRACKED member',
    "  source: z.enum(['reference', 'declared']),\n  ...provenanceCommon,\n});",
  ],
  ['optional field inside CaptureConditions', '  device: deviceProfileSchema.optional(),\n});'],
  ['optional field inside DeviceProfile', '  captureSpace: colorSpaceSchema.optional(),\n});'],
];

const original = readFileSync(FILE, 'utf8');
const baseline = typecheck();
console.log(`baseline typecheck exit ${baseline}${baseline === 0 ? '' : '  <-- must be 0'}\n`);

let allCaught = baseline === 0;
for (const [label, anchor] of probes) {
  if (!original.includes(anchor)) {
    console.log(`?? ${label}: anchor not found`);
    allCaught = false;
    continue;
  }
  const mutated = original.replace(
    anchor,
    anchor.replace('});', '  driftProbe: z.string().optional(),\n});'),
  );
  try {
    writeFileSync(FILE, mutated, 'utf8');
    const code = typecheck();
    const caught = code !== 0;
    if (!caught) allCaught = false;
    console.log(`${caught ? 'OK ' : 'HOLE'} ${label}: typecheck exit ${code}`);
  } finally {
    writeFileSync(FILE, original, 'utf8');
  }
}

console.log(allCaught ? '\nThe pin catches every probe.' : '\nAT LEAST ONE HOLE REMAINS.');
process.exit(allCaught ? 0 : 1);
