/**
 * `apps/mobile`'s `test:e2e`: check the flows, then run them — or refuse, saying what is missing.
 *
 * ## Why this refuses instead of passing
 *
 * `scripts/e2e-scope.mjs` exists because `pnpm test:e2e` was once `turbo run test:e2e` with
 * nothing in the workspace declaring that task: a green gate over zero suites. This file is the
 * surface that finally answers it, and the one thing it must not do is reintroduce the same
 * shape one layer down — **a task that exits 0 having run no journey.**
 *
 * So when the Maestro CLI is not on `PATH`, this exits non-zero and says so. That is why gate 7
 * is still `pending` with `ciStep: false`: F-091's criterion 4 moves it, and that criterion is
 * `attested` because it needs a CI run
 * ([ADR-0038](../docs/adr/0038-every-acceptance-criterion-names-its-check.md)).
 *
 * **It does not check for a device.** With Maestro installed and nothing attached, the banner
 * below never prints and Maestro's own non-zero exit stops the task — still fail-closed, and a
 * better answer than a probe here would give. A device check would mean shelling out to `adb`
 * or `xcrun` and deciding which platform is meant; the tool that is about to connect already
 * knows. Written down because the first draft of the ADR claimed the check existed.
 *
 * ## What DOES run everywhere
 *
 * The flow check. Every selector is resolved against the app's own catalogue, corpus and route
 * table before Maestro is looked for, so a renamed key fails here — on this workstation, with
 * no JDK and no emulator — rather than waiting for a run that may be months away
 * ([ADR-0086](../docs/adr/0086-the-journey-is-a-maestro-flow-generated-from-a-spec.md)).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { delimiter, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLOW_DIR = join(ROOT, 'apps', 'mobile', 'e2e');

/**
 * Find an executable on `PATH`.
 *
 * Written out rather than shelling out. `spawnSync('maestro')` reports `ENOENT` on Windows even
 * when `maestro.cmd` is sitting on the path, because Node does not consult `PATHEXT` — and this
 * script's whole job is to say accurately what is missing. Reporting "not installed" for a tool
 * that is installed would be the least useful lie it could tell.
 */
function onPath(command) {
  const extensions =
    process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];

  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (directory === '') continue;
    for (const extension of extensions) {
      const candidate = join(directory, command + extension);
      try {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
      } catch {
        // An unreadable PATH entry is not this script's problem. Keep looking.
      }
    }
  }
  return null;
}

/** Run a command with our stdio, and return its exit status. */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.error !== undefined && result.error !== null) throw result.error;
  return result.status ?? 1;
}

// 1. The flows must match their specs before anything else happens. `process.execPath` rather
//    than a bare `node`: a shim resolved through the shell is how a runner silently fails to
//    start [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
const checked = run(process.execPath, [join(ROOT, 'scripts', 'generate-e2e-flows.mjs'), '--check']);
if (checked !== 0) process.exit(checked);

const proven = run(process.execPath, [join(ROOT, 'scripts', 'e2e-flows-proof.mjs')]);
if (proven !== 0) process.exit(proven);

const flows = existsSync(FLOW_DIR)
  ? readdirSync(FLOW_DIR)
      .filter((name) => name.endsWith('.yaml'))
      .sort()
  : [];

if (flows.length === 0) {
  console.error('\n  No generated flow under apps/mobile/e2e. Nothing to run.\n');
  process.exit(1);
}

// 2. The run itself.
const maestro = onPath('maestro');
if (maestro === null) {
  console.error(
    '\nE2E — REFUSING TO REPORT A PASS\n\n' +
      `  ${String(flows.length)} flow(s) are generated and their selectors resolve against the\n` +
      '  catalogue, the published corpus and the route table. That is checked above and it\n' +
      '  passed. What has NOT happened is a run.\n\n' +
      '  The Maestro CLI is not on PATH, so no journey was executed against a device. Exiting\n' +
      '  non-zero, because a task that exits 0 having run nothing is the failing-open shape\n' +
      '  scripts/e2e-scope.mjs exists to refuse — and it would be a poor joke coming from the\n' +
      '  file that answers it.\n\n' +
      '  This is expected here: F-091 criteria 2 to 4 are ATTESTED (ADR-0038) because this\n' +
      '  workstation has no JDK and no emulator, and gate 7 is `pending` with ciStep:false\n' +
      '  until a CI run can execute one.\n',
  );
  process.exit(1);
}

let failed = 0;
for (const flow of flows) {
  const path = relative(ROOT, join(FLOW_DIR, flow)).split('\\').join('/');
  console.log(`\n  maestro test ${path}\n`);
  if (run(maestro, ['test', path]) !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\n  ${String(failed)} of ${String(flows.length)} journey(s) failed.\n`);
  process.exit(1);
}

console.log(`\n  ${String(flows.length)} journey(s) passed against a device.\n`);
