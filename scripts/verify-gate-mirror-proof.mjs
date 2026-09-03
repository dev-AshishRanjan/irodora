/**
 * The gate-mirror proof's own proof: it is watched being interrupted (F-134).
 *
 * ## Why this exists
 *
 * `verify-gate-mirror.mjs` plants `if: false` onto a CI step, runs gate 0, and restores in a
 * `finally`. **A `finally` does not run when the process is killed**, and a timeout kills — so an
 * interrupted run leaves a workflow with a blocking gate conditioned out, and the next
 * `git add -A` commits it.
 *
 * That is not hypothetical. It happened, it left a plant in the working tree, and it produced a
 * failure recorded in F-127 as *"not reproduced, not explained"*: a leftover plant makes gate 0
 * fail inside gate-mirror's child process while a direct run afterwards passes.
 *
 * ## A handler nobody has watched fire might only be capable of being read
 *
 * So this **actually kills a run**. It spawns the script, waits until the plant is genuinely on
 * disk, sends `SIGTERM`, and compares the workflow byte for byte with what it was.
 *
 * And it covers what a handler cannot — `SIGKILL`, a crash inside the handler, a machine losing
 * power — by planting a marker **by hand** and requiring the script to refuse to start.
 *
 * ## Windows cannot catch a termination signal, and this says so
 *
 * `child.kill('SIGTERM')` on Windows is `TerminateProcess`: there is no signal and no handler
 * runs, exactly as with `SIGKILL`. **The handler was written, run here, and found to do nothing
 * on this platform** — which is the whole reason criterion 3 says *proven by a run that is
 * actually interrupted, not by reading the handler*.
 *
 * CI is `ubuntu-latest`, so the handler is real protection where the gate actually runs. On
 * Windows the **startup refusal** is the only mechanism, and this proof requires it there rather
 * than reporting a pass it has not earned.
 *
 * ## Polling, never sleeping
 *
 * The wait is a poll for the marker on disk. A fixed delay is a race: long enough on this
 * machine, too short on a slower one, and the failure would look like a broken handler rather
 * than a test that fired early.
 */

import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'verify-gate-mirror.mjs');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'ci.yml');
const MARKER = 'planted by verify-gate-mirror.mjs';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const failures = [];
const pass = (name) => {
  console.log(`  ${GREEN}✓${OFF} ${name}`);
};
const fail = (name, detail) => {
  failures.push(`${name}\n      ${detail}`);
  console.log(`  ${RED}✗${OFF} ${name}`);
};

const original = readFileSync(WORKFLOW, 'utf8');

/** The tree must be clean before anything below means anything. */
if (original.includes(MARKER)) {
  console.log(
    `\n${RED}${BOLD}${WORKFLOW} already contains a plant.${OFF}\n` +
      `  ${DIM}Run: git checkout .github/workflows/ci.yml${OFF}\n`,
  );
  process.exit(1);
}

const sleep = (ms) =>
  new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });

/** Wait until the marker is genuinely on disk, or give up. Polled, never slept through. */
async function waitForPlant(limitMs) {
  const started = Date.now();
  while (Date.now() - started < limitMs) {
    if (readFileSync(WORKFLOW, 'utf8').includes(MARKER)) return true;
    await sleep(25);
  }
  return false;
}

console.log(`\n${BOLD}Irodora — the gate-mirror proof, interrupted${OFF}\n`);

/* ---------------------------------------------------------------- 1. an actual interruption */

const child = spawn(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'ignore' });
const planted = await waitForPlant(120_000);

if (!planted) {
  child.kill('SIGKILL');
  fail(
    'the run plants something to interrupt',
    'No marker appeared within two minutes, so nothing below could be tested. That is a ' +
      'failure of this proof rather than a clean result.',
  );
} else {
  pass('the run plants a marker, which is what makes an interruption meaningful');

  const exited = new Promise((resolveExit) => {
    child.on('exit', (code, signal) => {
      resolveExit({ code, signal });
    });
  });
  child.kill('SIGTERM');
  await exited;

  const after = readFileSync(WORKFLOW, 'utf8');
  const restored = after === original;

  if (process.platform === 'win32') {
    /*
     * NOT A SKIP, AND NOT A PASS. There is no signal to catch here, so the handler cannot have
     * run — reporting either outcome as a success would be a claim about a mechanism this
     * platform does not have. What IS required on Windows is that the leftover plant below is
     * refused, which is the case immediately after this one.
     */
    console.log(
      `  ${DIM}— SIGTERM is uncatchable on win32 (TerminateProcess), so the handler cannot ` +
        `run here.\n    The plant IS left behind, and the refusal below is what covers it. CI ` +
        `is ubuntu-latest,\n    where the handler is real protection.${OFF}`,
    );
    if (restored)
      fail(
        'the win32 expectation holds',
        'The workflow was restored on a platform with no signal to catch, which means this ' +
          'proof is measuring something other than what it claims.',
      );
    else pass('win32 leaves the plant, exactly as this platform must — the refusal covers it');
  } else if (restored) {
    pass('SIGTERM restores the workflow byte for byte');
  } else {
    fail(
      'SIGTERM restores the workflow byte for byte',
      'The workflow was left modified. This is the defect F-134 exists to fix, still present.',
    );
  }

  // Leave the tree as we found it whatever happened — this proof must not become the thing it
  // is checking for.
  if (!restored) writeFileSync(WORKFLOW, original, 'utf8');
}

/* ------------------------------------------- 2. what a handler cannot reach: a leftover plant */

writeFileSync(WORKFLOW, original.replace(/\n/u, `\n# ${MARKER}\n`), 'utf8');
let refused = false;
try {
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' });
} catch {
  refused = true;
}
const changedWhileRefusing =
  readFileSync(WORKFLOW, 'utf8') !== original.replace(/\n/u, `\n# ${MARKER}\n`);
writeFileSync(WORKFLOW, original, 'utf8');

if (refused)
  pass('a leftover plant is refused before another is written — the SIGKILL case, covered');
else
  fail(
    'a leftover plant is refused before another is written',
    'The script ran anyway. It would save the plant as the "original" and restore it faithfully ' +
      '— a disabled CI step, reported as a clean run.',
  );

if (changedWhileRefusing)
  fail(
    'refusing changes nothing',
    'The script modified the workflow while refusing to run, which is worse than not refusing.',
  );
else pass('refusing changes nothing');

/* ------------------------------------------------------------------------------ 3. the decoy */

/*
 * Without this, "it refused" is equally true of a script that refuses everything, and the two
 * cases above would be measuring that `execFileSync` throws
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 */
let cleanRunPassed;
try {
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' });
  cleanRunPassed = true;
} catch {
  cleanRunPassed = false;
}
if (cleanRunPassed) pass('DECOY — an uninterrupted run on a clean tree still passes');
else
  fail(
    'DECOY — an uninterrupted run on a clean tree still passes',
    'The script now refuses a tree it should accept, which is worse than the false negative it ' +
      'replaced.',
  );

const finalState = readFileSync(WORKFLOW, 'utf8');
if (finalState === original) pass('and the working tree is as it was found');
else {
  writeFileSync(WORKFLOW, original, 'utf8');
  fail('and the working tree is as it was found', 'It was not; it has been restored.');
}

if (failures.length === 0) {
  // WHAT WAS ACTUALLY WATCHED, not what was written. On win32 there is no signal to catch,
  // so claiming the handler fired would be the kind of sentence this repository lints for.
  const watched =
    process.platform === 'win32'
      ? 'The refusal was watched refusing. The handler could not be watched here — win32 has no signal.'
      : 'The handler was watched firing, and the refusal was watched refusing.';
  console.log(`\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${watched}${OFF}\n`);
  process.exit(0);
}

console.log(`\n${RED}${BOLD}${failures.length} problem(s)${OFF}`);
for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
process.exit(1);
