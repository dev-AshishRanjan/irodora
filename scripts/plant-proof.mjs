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
 *
 * ## It never deletes a journal it did not write (F-296)
 *
 * It used to begin every case with `rmSync(JOURNAL)`, and end with it. It runs in `pnpm lint`
 * and in `ci.yml`, after other proofs — so in F-291 it deleted the record of two real plants,
 * and the plants stayed with nothing saying why. Now:
 *
 * - it REFUSES to start while a journal FILE exists, readable or not. That is stricter than every
 *   other proof, which refuses only another run's readable entries: `plant.mjs` reads a journal it
 *   cannot parse as empty, and a proof killed while rewriting one can leave it truncated with a
 *   plant still in place;
 * - it clears only entries its own children wrote, through `recover()`;
 * - cases run it again over a journal it did not write and over one it cannot read, and each must
 *   survive byte for byte; a third case has its own clean-up meet another owner's entry;
 * - and no other script may import `JOURNAL` or `recover`, run `plant.mjs --recover`, or name the
 *   file — checked over the scripts, `package.json` and the workflows, within the limits written
 *   beside the check.
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

/*
 * WHO WROTE AN ENTRY (F-296). The child journals as `CHILD_OWNER`, or as the owner `--owner=`
 * names. `FOREIGN_OWNER` stands in for a proof killed before this run, and `THIRD_OWNER` for one
 * whose entry arrives while this run is cleaning up. `OWN` is what the clean-up may clear: its own
 * child's entries, and the foreign one if the refusal case fails part-way. The third is outside it
 * on purpose — it is what the clean-up must leave alone.
 */
const CHILD_OWNER = 'plant-proof child';
const FOREIGN_OWNER = 'a proof killed before this run';
const THIRD_OWNER = 'a proof running beside this one';
const OWN = new Set([CHILD_OWNER, FOREIGN_OWNER]);

/** `--nested`: this run was started by a refusal case, which must not start again inside it. */
const NESTED = process.argv.includes('--nested');

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
const journal = plantJournal(
  process.argv.find((arg) => arg.startsWith('--owner='))?.slice('--owner='.length) ??
    ${JSON.stringify(CHILD_OWNER)},
);

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

/**
 * The scratch file and the child, written fresh. NOT the journal (F-296): between cases it is
 * already empty — the killed cases end in `recover()`, and the decoy leaves none.
 */
function reset() {
  mkdirSync(dirname(SUBJECT), { recursive: true });
  writeFileSync(SUBJECT, ORIGINAL, 'utf8');
  writeFileSync(CHILD, CHILD_SOURCE, 'utf8');
}

/**
 * ONLY ITS OWN (F-296), what the `finally` runs. A case that failed part-way can leave its own
 * child's entry, and `recover()` clears it by restoring the scratch file about to be removed. If
 * any entry has an owner outside `OWN`, nothing is cleared — not even this run's own — and the
 * owners are returned for the run to report. Returns `null` when nothing is left.
 */
function cleanUp() {
  const left = describeLeftovers();
  if (left === null) return null;
  if (left.owners.every((owner) => OWN.has(owner))) {
    recover();
    return null;
  }
  return left.owners;
}

/** This file's colours, removed, so a line can be read for what it says. */
const plain = (text) =>
  [GREEN, RED, BOLD, DIM, OFF].reduce((t, code) => t.replaceAll(code, ''), text);

/** Run this proof again, nested, and collect everything it says. */
async function runNested() {
  const again = spawn(process.execPath, [fileURLToPath(import.meta.url), '--nested'], {
    cwd: ROOT,
  });
  let said = '';
  again.stdout.on('data', (chunk) => {
    said += String(chunk);
  });
  again.stderr.on('data', (chunk) => {
    said += String(chunk);
  });
  const code = await new Promise((r) => again.on('exit', r));
  return { code, said: plain(said) };
}

console.log(`\n${BOLD}Irodora — the plant journal, proven by a killed run${OFF}\n`);

/*
 * A JOURNAL THIS RUN DID NOT WRITE IS REFUSED, NEVER CLEARED (F-296), and before anything is
 * written. This replaces a baseline that asserted "no plant is outstanding" AFTER `reset()` had
 * deleted the journal, so it could not fail. A leftover is the record of a plant somebody still has
 * to undo; every case below would also be meaningless beside it.
 *
 * ANY JOURNAL FILE, READABLE OR NOT. `describeLeftovers()` reads one it cannot parse as empty, and
 * this proof's first child would then overwrite it and `recover()` delete it. A proof that records
 * as it goes, killed while rewriting the journal, can leave exactly that with a plant in place. This
 * run always ends with the file removed, so any file present now is somebody else's.
 */
if (existsSync(JOURNAL)) {
  const inherited = describeLeftovers();
  console.error(
    `${RED}${BOLD}A plant journal is already in place, and this proof did not write it.${OFF}\n`,
  );
  if (inherited !== null) {
    console.error(
      `${DIM}  ${String(inherited.paths.length)} file(s) still hold a planted defect, left by: ` +
        `${inherited.owners.join(', ')}.${OFF}\n`,
    );
    for (const path of inherited.paths) console.error(`  ${RED}!${OFF} ${path}`);
    console.error(`\n${DIM}  Put them back:${OFF}  node scripts/plant.mjs --recover`);
  } else {
    console.error(
      `${DIM}  It cannot be read, so it names no file, and \`plant.mjs --recover\` cannot use it. A\n` +
        `  proof may have died while rewriting it with a plant still in place: compare the tree\n` +
        `  with git, then remove it by hand —${OFF} .harness/state/.plant-journal.json`,
    );
  }
  console.error(
    `${DIM}  Refusing to run: this proof clears only what its own children plant.${OFF}\n`,
  );
  process.exit(1);
}

/** Bytes this run wrote into the journal itself, for the unreadable case: its own, to remove. */
let unreadableWritten = null;

try {
  reset();

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

  /*
   * THE F-296 CASES. `--nested` keeps a run started by one of them from starting them again. A
   * plant-proof that refuses never gets here; one that does not would otherwise recurse. A run
   * given `--nested` by hand says it skipped them, rather than passing on fewer cases.
   */
  if (NESTED) {
    console.log(
      `${DIM}—   the refusal cases: skipped, because this run is nested inside one${OFF}`,
    );
  } else {
    /* ------------------------- THIS proof refuses a journal it did not write */
    {
      /*
       * In F-291 this proof deleted the real journal of two real plants: it runs in `lint` and in
       * `ci.yml`, after other proofs, and `reset()` began with `rmSync(JOURNAL)`. So: a killed
       * child leaves a journal under another owner, plant-proof is run AGAIN, and the second run
       * must refuse — in its own words, running none of its cases — and leave the journal and the
       * planted file exactly as they were. Exit 1 alone is not enough: a second run that started
       * and then crashed exits 1 too, after doing the damage (F-296's review, S1).
       */
      reset();
      const { child } = await startChild([`--owner=${FOREIGN_OWNER}`]);
      child.kill('SIGKILL');
      await settled(child);
      const before = readFileSync(JOURNAL, 'utf8');

      const { code, said } = await runNested();
      const after = existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : null;

      say(
        code === 1 && said.includes('this proof did not write it') && said.includes('subject.txt'),
        'a second plant-proof REFUSES over a journal it did not write, and names the file',
        `exit ${String(code)}`,
      );
      say(
        !/^(OK |BAD)/mu.test(said) && readFileSync(SUBJECT, 'utf8') === PLANTED,
        'and runs none of its cases: the planted file is still as the journal says',
      );
      say(
        after === before,
        'and leaves that journal byte for byte',
        after === null ? 'it was deleted' : after === before ? undefined : 'it was rewritten',
      );

      recover();
    }

    /* ------------------------------ and a journal it cannot read (F-296's review, B1) */
    {
      /*
       * A journal cut off part-way: what a proof killed while rewriting it leaves. `plant.mjs`
       * reads it as empty, so a check that asks `describeLeftovers()` sees nothing to refuse.
       */
      reset();
      unreadableWritten =
        '{\n  "entries": {\n    "tests/__plant_proof__/subject.txt": {\n      "owner": "a proof k';
      writeFileSync(JOURNAL, unreadableWritten, 'utf8');
      say(
        existsSync(JOURNAL) && describeLeftovers() === null,
        'the unreadable journal reads as empty, so the check below is about the FILE',
      );

      const { code, said } = await runNested();
      const after = existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : null;

      say(
        code === 1 &&
          said.includes('this proof did not write it') &&
          said.includes('cannot be read'),
        'a second plant-proof REFUSES over a journal it cannot read, and says so',
        `exit ${String(code)}`,
      );
      say(!/^(OK |BAD)/mu.test(said), 'and runs none of its cases');
      say(
        after === unreadableWritten,
        'and leaves those bytes as they were',
        after === null ? 'it was deleted' : after === unreadableWritten ? undefined : 'rewritten',
      );

      // This run wrote these bytes, so it removes them — and only if they are still its own.
      if (after === unreadableWritten) rmSync(JOURNAL, { force: true });
      unreadableWritten = null;
    }

    /* --------------- and its own clean-up leaves another owner's entry (F-296's review, M1) */
    {
      /*
       * What each case starts with (`reset()`) and what the `finally` runs (`cleanUp()`), met by
       * an entry this proof may not clear. Either one deleting or recovering the journal again is
       * the F-291 deletion back; neither case above would notice, because no other owner's entry
       * is ever present when they run.
       */
      reset();
      const { child } = await startChild([`--owner=${THIRD_OWNER}`]);
      child.kill('SIGKILL');
      await settled(child);
      const before = readFileSync(JOURNAL, 'utf8');

      reset();
      const kept = cleanUp();
      const after = existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : null;

      say(
        after === before && kept !== null && kept.includes(THIRD_OWNER),
        "its own reset and clean-up leave another owner's entry byte for byte, and report it",
        after === null ? 'it was deleted' : after === before ? undefined : 'it was rewritten',
      );

      // This case's child planted it, so this case puts it back.
      recover();
    }
  }
} finally {
  const kept = cleanUp();
  if (kept !== null)
    say(
      false,
      'the journal holds entries this proof did not write; left in place',
      kept.join(', '),
    );
  // The unreadable case's own bytes, if it failed before removing them, and only those.
  if (
    unreadableWritten !== null &&
    existsSync(JOURNAL) &&
    readFileSync(JOURNAL, 'utf8') === unreadableWritten
  )
    rmSync(JOURNAL, { force: true });
  rmSync(dirname(SUBJECT), { recursive: true, force: true });
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
  'verify-app-glyphs.mjs': 'plants fixture screens under the OS temp directory (F-228)',
  'verify-native-assets.mjs':
    'synthesises native projects under the OS temp directory for its proof (F-231)',
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

/**
 * NO OTHER SCRIPT ACTS ON THE JOURNAL (F-296).
 *
 * A leftover journal must survive every proof in `lint` and in `ci.yml` until a person runs
 * `node scripts/plant.mjs --recover`. Every proof reads the journal through `plantJournal` and
 * `describeLeftovers`, which only ever add or drop that proof's own entries. To delete a leftover, a
 * script needs the path (`JOURNAL`, or the file's name), `recover`, or the recovery command. Only
 * `plant.mjs` and this file may have any of them.
 *
 * WHAT IT READS: every `.mjs` directly in `scripts/` and `tests/bench/src/`, every script in the
 * root `package.json`, and every workflow in `.github/workflows/`.
 *
 * WHAT IT CANNOT SEE, and does not claim to (F-296's review, M2): a path assembled from parts, an
 * import through a variable or a `new URL(…)`, an `rmSync` of `.harness/state` or a `git clean -X`,
 * an import whose braces hold a `}` inside a comment, and `--recover` run from a command built
 * elsewhere and passed in a variable. None exists today, and each would be a deliberate act
 * rather than the accident this check is for.
 *
 * @returns {string[]} how a source reaches the journal; empty when it does not.
 */
function reachesJournal(source, { command = false } = {}) {
  const from = String.raw`\s*from\s*['"][^'"]*plant\.mjs['"]`;
  /*
   * RUNNING THE RECOVERY, NOT NAMING IT. Proofs print `node scripts/plant.mjs --recover` as the
   * instruction to a person, which is the point of a refusal. In a script, only a call that runs it
   * counts: an exec or spawn naming `plant.mjs` and then `--recover`. In a `package.json` script or
   * a workflow, the text is itself a command (`command: true`).
   */
  const runsRecover = command
    ? /plant\.mjs\s+--recover/u
    : /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\([^;]*plant\.mjs[^;]*--recover/u;
  return [
    ...[...source.matchAll(new RegExp(String.raw`import\s*\{([^}]*)\}` + from, 'gu'))]
      .flatMap((m) => m[1].split(','))
      .map((name) => name.trim().split(/\s+as\s+/u)[0])
      .filter((name) => name === 'JOURNAL' || name === 'recover'),
    ...(new RegExp(String.raw`import\s*\*\s*as\s+\w+` + from, 'u').test(source)
      ? ['import * as']
      : []),
    ...(new RegExp(String.raw`export\s*(?:\*|\{[^}]*\})` + from, 'u').test(source)
      ? ['re-export']
      : []),
    ...(/(?:import|require)\(\s*['"`][^'"`]*plant\.mjs['"`]\s*\)/u.test(source)
      ? ['import() or require()']
      : []),
    ...(runsRecover.test(source) ? ['runs --recover'] : []),
    ...(source.includes('.plant-journal') ? ['.plant-journal'] : []),
  ];
}

/*
 * ITS OWN DECOYS, IN THE FILE (F-296's review, M3), so a typo in a pattern cannot leave the check
 * green for good: each shape must be caught, and each control — what a proof legitimately imports
 * — must not.
 */
{
  const caught = [
    "import { JOURNAL } from './plant.mjs';",
    "import { describeLeftovers, recover as undo } from './plant.mjs';",
    'import {\n  plantJournal,\n  recover,\n} from "./plant.mjs";',
    "import * as plant from './plant.mjs';",
    "export { recover } from './plant.mjs';",
    "export * from './plant.mjs';",
    "const plant = await import('./plant.mjs');",
    "const plant = require('./plant.mjs');",
    "execSync('node scripts/plant.mjs --recover');",
    "spawnSync(process.execPath, ['scripts/plant.mjs', '--recover'], { cwd: ROOT });",
    "rmSync('.harness/state/.plant-journal.json');",
  ];
  const caughtAsCommand = ['node scripts/plant.mjs --recover && pnpm lint'];
  const clean = [
    "import { describeLeftovers } from './plant.mjs';",
    "import { guardPlants, plantJournal } from './plant.mjs';",
    '// the journal is written before the mutation',
    // A refusal telling the person what to run is the point of a refusal, not a recovery.
    'console.error(`  Put them back:  node scripts/plant.mjs --recover`);',
  ];
  const missed = [
    ...caught.filter((source) => reachesJournal(source).length === 0),
    ...caughtAsCommand.filter((source) => reachesJournal(source, { command: true }).length === 0),
  ];
  const flagged = clean.filter((source) => reachesJournal(source).length > 0);
  say(
    missed.length === 0 && flagged.length === 0,
    'the journal check catches each shape it looks for, and passes what a proof may import',
    `${String(caught.length + caughtAsCommand.length)} decoys, ${String(clean.length)} controls` +
      (missed.length + flagged.length === 0
        ? ''
        : `; missed ${missed.join(' | ')}; flagged ${flagged.join(' | ')}`),
  );
}

{
  const acting = [];
  let read = 0;
  for (const dir of ['scripts', 'tests/bench/src']) {
    let entries;
    try {
      entries = readdirSync(join(ROOT, dir));
    } catch {
      continue;
    }
    for (const entry of entries.filter((e) => e.endsWith('.mjs'))) {
      if (dir === 'scripts' && (entry === 'plant.mjs' || entry === 'plant-proof.mjs')) continue;
      read += 1;
      const reaches = reachesJournal(readFileSync(join(ROOT, dir, entry), 'utf8'));
      if (reaches.length > 0) acting.push(`${dir}/${entry} (${reaches.join(', ')})`);
    }
  }
  const { scripts = {} } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const [name, command] of Object.entries(scripts)) {
    read += 1;
    const reaches = reachesJournal(command, { command: true });
    if (reaches.length > 0) acting.push(`package.json "${name}" (${reaches.join(', ')})`);
  }
  const workflows = join(ROOT, '.github', 'workflows');
  for (const entry of readdirSync(workflows).filter((e) => /\.ya?ml$/u.test(e))) {
    read += 1;
    const reaches = reachesJournal(readFileSync(join(workflows, entry), 'utf8'), { command: true });
    if (reaches.length > 0) acting.push(`.github/workflows/${entry} (${reaches.join(', ')})`);
  }
  say(
    acting.length === 0,
    'no other script can delete the journal: none imports JOURNAL or recover, runs --recover, or names the file',
    acting.length === 0
      ? `${String(read)} read: the scripts, package.json's scripts and the workflows`
      : acting.join('; '),
  );
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
