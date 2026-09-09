/**
 * The plant journal, proven by a run that is actually killed.
 *
 * ## Why this file has to spawn a child
 *
 * **Every mutation proof in this repository is verified by letting it finish**, which is the one
 * path where a `finally` works. That is why seven incidents got past them: the failure only
 * happens when the process ends in a way the code never sees.
 *
 * So this proof ends the way the incidents did. It starts a child that plants a defect and then
 * blocks forever, `SIGKILL`s it — no signal handler, no `finally`, no exit hook — and then asks
 * the three questions that matter:
 *
 * 1. is the file **still broken**, so the kill genuinely skipped the cleanup?
 * 2. does the journal **name** it?
 * 3. does recovery put it back **byte for byte**?
 *
 * And the decoy in the other direction: a child allowed to finish leaves no journal at all.
 * Without that, a journal that was never written would pass every case above by being absent.
 *
 * ## What it plants into
 *
 * A scratch file of its own, under `tests/`. This proof is about the journal rather than about
 * any particular check, and planting into something real would mean the proof of the safety net
 * was itself the eighth incident.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { describeLeftovers, JOURNAL, recover } from './plant.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '[32m';
const RED = '[31m';
const BOLD = '[1m';
const DIM = '[2m';
const OFF = '[0m';

const SUBJECT = join(ROOT, 'tests', '__plant_proof__', 'subject.txt');
const CHILD = join(ROOT, 'tests', '__plant_proof__', 'child.mjs');
const ORIGINAL = 'the original bytes\n';
const PLANTED = 'BROKEN\n';

let failures = 0;
const say = (ok, name, detail) => {
  console.log(
    `${ok ? `${GREEN}OK ` : `${RED}BAD`}${OFF} ${name}${detail === undefined ? '' : `: ${DIM}${detail}${OFF}`}`,
  );
  if (!ok) failures += 1;
};

/**
 * A child that journals, plants, and then never returns.
 *
 * `setInterval` rather than a long `setTimeout`: it keeps the event loop alive with no chance of
 * firing during the test, so the only thing that can end this process is the signal.
 */
const CHILD_SOURCE = `import { writeFileSync } from 'node:fs';
import { plantJournal } from ${JSON.stringify(pathToFileURL(join(ROOT, 'scripts', 'plant.mjs')).href)};

const SUBJECT = ${JSON.stringify(SUBJECT.replace(/\\/gu, '/'))};
const journal = plantJournal('plant-proof child');

try {
  journal.record(SUBJECT, ${JSON.stringify(ORIGINAL)});
  writeFileSync(SUBJECT, ${JSON.stringify(PLANTED)}, 'utf8');
  console.log('planted');

  if (process.argv.includes('--finish')) {
    writeFileSync(SUBJECT, ${JSON.stringify(ORIGINAL)}, 'utf8');
    journal.close();
    console.log('restored');
    process.exit(0);
  }

  // Blocks forever. The whole point is that nothing below this line ever runs.
  setInterval(() => undefined, 1000);
} catch (error) {
  console.error(String(error));
  process.exit(2);
}
`;

/** Run the child, and resolve once it says it has planted. */
function startChild(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [CHILD, ...args], { cwd: ROOT });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
      if (out.includes('planted')) resolvePromise({ child, out: () => out });
    });
    // Captured, because a child that dies before it plants is the case this proof is least able
    // to diagnose without it — and the first draft spent a cycle on exactly that.
    child.stderr.on('data', (chunk) => {
      err += String(chunk);
    });
    child.on('exit', (code) => {
      if (!out.includes('planted'))
        rejectPromise(new Error(`child exited ${String(code)}\n${out}${err}`));
      else resolvePromise({ child, out: () => out });
    });
    child.on('error', rejectPromise);
  });
}

const settled = (child) =>
  new Promise((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) resolvePromise();
    else child.on('exit', () => resolvePromise());
  });

function reset() {
  rmSync(JOURNAL, { force: true });
  mkdirSync(dirname(SUBJECT), { recursive: true });
  writeFileSync(SUBJECT, ORIGINAL, 'utf8');
  writeFileSync(CHILD, CHILD_SOURCE, 'utf8');
}

console.log(`\n${BOLD}Irodora — the plant journal, proven by a killed run${OFF}\n`);

try {
  /* ---------------------------------------------------- the baseline, asserted first */
  reset();
  say(
    describeLeftovers() === null,
    'baseline: no plant is outstanding',
    'a leftover from a real proof would make every case below meaningless',
  );

  /* ------------------------------------------------------------------ a killed child */
  {
    const { child } = await startChild([]);
    child.kill('SIGKILL');
    await settled(child);

    // 1. The kill genuinely skipped the cleanup. Without this the rest could pass on a child
    //    that tidied up after itself, which is the case that has never been in doubt.
    say(
      readFileSync(SUBJECT, 'utf8') === PLANTED,
      'a SIGKILL leaves the file BROKEN',
      'no finally, no signal handler, no exit hook',
    );

    // 2. The journal knows.
    const leftovers = describeLeftovers();
    const named = leftovers !== null && leftovers.paths.some((p) => p.endsWith('subject.txt'));
    say(named, 'the journal names the file that was left broken', leftovers?.paths.join(', '));

    // 3. Recovery is byte for byte.
    recover();
    say(
      readFileSync(SUBJECT, 'utf8') === ORIGINAL,
      'recovery restores it byte for byte',
      'from the journal, not from git',
    );
    say(describeLeftovers() === null, 'and the journal is empty afterwards');
  }

  /* ------------------------------------------------------------ THE DECOY: it finishes */
  {
    /*
     * Without this, a journal that was never written at all would pass every case above by
     * being absent — "no leftovers" is exactly what a broken journal looks like
     * [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    reset();
    const { child } = await startChild(['--finish']);
    await settled(child);

    say(
      readFileSync(SUBJECT, 'utf8') === ORIGINAL,
      'DECOY — a child allowed to finish restores the file itself',
    );
    say(
      describeLeftovers() === null && !existsSync(JOURNAL),
      'DECOY — and leaves no journal, so the check above is about the KILL',
    );
  }

  /* ----------------------------------------------- and a second run refuses to start */
  {
    reset();
    const { child } = await startChild([]);
    child.kill('SIGKILL');
    await settled(child);

    // A proof opening a journal over somebody else's leftovers must stop rather than add to
    // them: two runs' entries interleaved is a recovery nobody can reason about.
    const second = spawn(process.execPath, [CHILD, '--finish'], { cwd: ROOT });
    let err = '';
    second.stderr.on('data', (chunk) => {
      err += String(chunk);
    });
    const code = await new Promise((r) => second.on('exit', r));

    say(
      code === 1 && err.includes('did not finish'),
      'the NEXT run refuses to start, and says which files',
      `exit ${String(code)}`,
    );

    recover();
  }
} finally {
  rmSync(dirname(SUBJECT), { recursive: true, force: true });
  rmSync(JOURNAL, { force: true });
}

/* -------------------------------------------------- and the coverage the mechanism needs */

/**
 * EVERY PROOF THAT RESTORES SOMETHING USES THE JOURNAL.
 *
 * The mechanism above is worth exactly as much as its coverage, and the incident that started
 * this feature happened twice inside the feature itself: my first migration of the content
 * proof journalled the fixture corpus and missed the OKLab matrix beside it, so
 * `node scripts/plant.mjs` reported *"no plant is outstanding"* over a perturbed colour engine.
 *
 * **A journal covering some of what a proof breaks is a journal that reports clean over the
 * rest** — which is the shape of every blind spot in this repository's memory, arrived at from
 * inside the fix for one. So this asks the question of the source rather than trusting that
 * whoever writes the next proof will remember.
 *
 * It over-collects on purpose. Being wrong in that direction costs an entry in the list below,
 * with a reason; being wrong in the other costs the guarantee.
 */
const RESTORES = /writeFileSync|cpSync|copyFileSync|unlinkSync|rmSync/u;

/**
 * Scripts that write files and legitimately do not need the journal, each with the reason.
 *
 * A list, in source, next to the check — not a pattern in the check's own scope. An exemption
 * that can be counted and read is one somebody can remove; a carve-out inside a condition is
 * one nobody finds.
 */
const NO_JOURNAL_NEEDED = {
  'plant.mjs': 'is the journal',
  'plant-proof.mjs': 'is this file',
  'annotate.mjs': 'writes GitHub annotations to the step summary, not into the tree',
  'corpus-io.mjs': 'a shared reader/writer used BY the generators, which own their own writes',
  'verify-blocked-reason-proof.mjs':
    'plants only inside a scratch directory it makes and removes — nothing it touches is in ' +
    'the tree, so there is nothing a killed run could leave behind',
  'verify-apk.mjs': 'writes into a build output directory, never into source',
  'verify-motion.mjs': 'plants into a temporary file under the OS temp directory',
  'verify-app-imports.mjs': 'plants into a temporary file under the OS temp directory',
  'verify-engine-purity.mjs': 'plants into a temporary file under the OS temp directory',
  'verify-cache-scope.mjs':
    'plants one file under tests/ and removes it; it is the check that would REPORT such a ' +
    'leftover, so journalling it would be circular',
  /*
   * FOUR ADDED BY F-216, ALL FOR THE SAME REASON AS THE THREE ABOVE — and the fact that they
   * arrived one per feature over four features is the thing worth reading here. Until F-216 this
   * proof was the only one in `scripts/` that no local command ran, so it said "BAD" in CI and
   * nowhere else. Every author since F-179 got a green local run and was right about it.
   */
  'verify-reachability.mjs': 'plants a whole route tree under the OS temp directory (F-179)',
  'verify-dead-exports.mjs': 'plants a workspace under the OS temp directory (F-183)',
  'verify-layout-primitives-proof.mjs':
    'plants a fixture component under the OS temp directory (F-203)',
  'verify-surface-not-card-proof.mjs': 'plants fixture screens under the OS temp directory (F-210)',
};

{
  const generators = /^(generate-|build-)/u;
  const missing = [];

  for (const dir of ['scripts', 'tests/bench/src']) {
    let entries;
    try {
      entries = readdirSync(join(ROOT, dir));
    } catch {
      continue;
    }
    for (const entry of entries.filter((e) => e.endsWith('.mjs'))) {
      if (generators.test(entry)) continue;
      const source = readFileSync(join(ROOT, dir, entry), 'utf8');
      if (!RESTORES.test(source)) continue;
      if (source.includes("plant.mjs'")) continue;
      if (entry in NO_JOURNAL_NEEDED) continue;
      missing.push(`${dir}/${entry}`);
    }
  }

  say(
    missing.length === 0,
    'every proof that writes into the tree uses the journal',
    missing.length === 0
      ? 'or is declared, with a reason, in NO_JOURNAL_NEEDED'
      : missing.join(', '),
  );

  // The other direction: an exemption for a file that has since been journalled, or removed,
  // is an exemption nobody will take out. A stale list makes the count meaningless.
  const stale = Object.keys(NO_JOURNAL_NEEDED).filter((name) => {
    for (const dir of ['scripts', 'tests/bench/src']) {
      try {
        const source = readFileSync(join(ROOT, dir, name), 'utf8');
        return source.includes("plant.mjs'") && name !== 'plant.mjs' && name !== 'plant-proof.mjs';
      } catch {
        /* not in this directory */
      }
    }
    return true;
  });
  say(stale.length === 0, 'and no exemption outlived the file it exempted', stale.join(', '));
}

if (failures > 0) {
  console.log(`\n${RED}${BOLD}${String(failures)} case(s) did not hold.${OFF}\n`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Proven against an actual kill.${OFF} ` +
    `${DIM}The plant survives, the journal records it, recovery undoes it, and a run that ` +
    `finishes leaves nothing behind.${OFF}\n`,
);
