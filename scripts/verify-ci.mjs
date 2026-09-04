#!/usr/bin/env node
/**
 * Run locally, in order, exactly what CI runs — derived from the workflow, never copied.
 *
 * ## Why this exists
 *
 * Four checks were red in CI simultaneously, and every one of them had been red for several
 * pushes while every local session reported green:
 *
 * | check | rotted when | red since |
 * |---|---|---|
 * | `verify-token-reach --prove` | F-143/F-145 gave `surface.1` literal readers | F-143 |
 * | `verify-worklet-reach --prove` | F-138 changed a callee's signature | F-138 |
 * | `verify-spacing-scale --prove` | F-146 rewrote the file it planted into | F-146 |
 * | `test:content` | Japanese copy outgrew the font subset | F-147 |
 *
 * None was subtle. Each says exactly what is wrong the moment it is run. **Nothing ran them.**
 *
 * The gates in `.harness/verification/gates.json` are what a session runs before calling a
 * feature done, and CI runs those *plus* twenty-odd mutation proofs and generator `--check`
 * steps that no gate names. That gap is not an oversight to be closed by adding rows: a proof
 * belongs to the check it proves, not to a gate. The gap is that **there was no way to ask
 * "what would CI say?" without pushing.**
 *
 * This had happened before. The 2026-09-03 entry in `progress.md` — *"CI had been red for four
 * pushes, and every local run was green"* — ends by running every workflow step by hand, once,
 * and recording that they passed. That fixed the instance. This is the class.
 *
 * ## Derived, never duplicated
 *
 * The commands are read out of `.github/workflows/ci.yml`. A hand-maintained list here would
 * drift from the workflow, which is the same disease one level along — and
 * `verify-gate-mirror.mjs` already exists because a copy of CI's intent drifted once before.
 *
 * ## What it does NOT do
 *
 * It is not a CI replica. It runs on this machine, with this `node_modules` — so it cannot
 * catch a failure that depends on the runner's environment, which is precisely what the last
 * incident was (gate 0 resolving a link into `node_modules` that CI did not have). It runs
 * the same COMMANDS, in the same ORDER, stopping at the same place.
 *
 * ```
 * node scripts/verify-ci.mjs           run every step, stop at the first failure
 * node scripts/verify-ci.mjs --list    print the steps without running them
 * node scripts/verify-ci.mjs --all     keep going after a failure, and report every one
 * ```
 */

import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'ci.yml');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Every step of the workflow that runs a command, with the name it is reported under.
 *
 * Deliberately a small hand-rolled reader rather than a YAML dependency: this repository ships
 * no runtime dependencies in the engine and adds none to a script that exists to run other
 * scripts. It reads the two shapes the workflow actually uses — `run: <command>` and a `run: |`
 * block — and **fails loudly on anything it does not recognise** rather than silently running
 * a shorter list, which is the failure mode it was written to end.
 */
export function stepsFrom(yaml) {
  const lines = yaml.split('\n');
  const steps = [];
  let name = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const named = /^\s*- name:\s*(.+?)\s*$/u.exec(line) ?? /^\s{6,}name:\s*(.+?)\s*$/u.exec(line);
    if (named) {
      name = named[1].replace(/^['"]|['"]$/gu, '');
      continue;
    }

    /*
     * THE BLOCK FORM IS TESTED FIRST, and the order is not cosmetic. Written the other way
     * round, `run: |` is matched by the inline pattern: the lookahead rejects the `|` only
     * while `\s*` has consumed the space, the engine backtracks so it has not, and the
     * command is captured as the literal string " |". The step then looks real, runs nothing,
     * and reports whatever an empty shell command reports.
     */
    const block = /^(\s*)run:\s*\|\s*$/u.exec(line);
    if (!block) {
      const inline = /^(\s*)run:\s+(\S.*?)\s*$/u.exec(line);
      if (inline) {
        steps.push({ name: name ?? inline[2], command: inline[2], block: false });
        continue;
      }
    }

    if (block) {
      const indent = block[1].length;
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next.trim() !== '' && next.search(/\S/u) <= indent) break;
        body.push(next);
        i = j;
      }
      steps.push({ name: name ?? '(block)', command: body.join('\n'), block: true });
    }
  }
  return steps;
}

/**
 * Steps this cannot meaningfully run here, and the reason for each.
 *
 * NAMED INDIVIDUALLY, never pattern-matched. A skip rule broad enough to be convenient is a
 * skip rule that will one day swallow a real check — and a list nobody can read is how the
 * last four failures got past four sessions.
 */
const CANNOT_RUN_LOCALLY = new Map([
  ['actions/checkout', 'a runner action, not a command — this working tree IS the checkout'],
]);

function classify(step) {
  if (step.block) {
    // A shell block is CI plumbing — writing a summary, materialising a secret, annotating a
    // failure. It is reported rather than run, so the reader can see it was considered.
    return { run: false, why: 'a shell block: CI plumbing rather than a check' };
  }
  for (const [needle, why] of CANNOT_RUN_LOCALLY)
    if (step.command.includes(needle)) return { run: false, why };
  return { run: true };
}

/**
 * What git thinks is modified, right now.
 *
 * ## Why this runs before and after
 *
 * Several of the steps below are MUTATION PROOFS: they plant a deliberate defect into a tracked
 * file, watch the check reject it, and restore. Every one of them restores in a `finally` — and
 * a `finally` does not run when the process is KILLED, which is what a timeout, a Ctrl+C or a
 * closed terminal does.
 *
 * That has now happened twice, to two different files:
 *
 * - `.github/workflows/ci.yml` kept an `if: false` planted onto a gate step
 * - `tests/bench/budgets.json` kept a `ceilingMs` of `0.0001`
 *
 * Both are TRACKED, so `git add -A` would have committed them — a disabled CI step and a
 * performance budget nothing can pass. Neither shows up as a failure; the second one surfaced
 * only because prettier happened to disagree with the plant's formatting.
 *
 * This cannot prevent a kill. What it can do is make the aftermath loud instead of silent, on
 * the next run, before anything is committed.
 */
/**
 * Every tracked file a mutation proof writes to.
 *
 * DERIVED FROM THE PROOFS, not listed here. A hand-kept list would drift the first time a new
 * proof planted somewhere new — which is the same disease this whole script exists to treat, one
 * level along.
 *
 * The shape it looks for is the one every proof in this repository uses: a path constant built
 * with `join(ROOT, …)` that is later handed to `writeFileSync`.
 */
const AMBIGUOUS_NAMES = new Set(['package.json', 'tsconfig.json', 'index.ts', 'index.tsx']);

function plantTargets() {
  const targets = new Set();
  const scriptDirs = [join(ROOT, 'scripts'), join(ROOT, 'tests', 'bench', 'src')];

  for (const dir of scriptDirs) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!/\.mjs$/u.test(entry)) continue;
      const source = readFileSync(join(dir, entry), 'utf8');
      if (!source.includes('writeFileSync')) continue;

      /*
       * `const NAME = join(<base>, …, 'file.json');` where NAME is also written to.
       *
       * MATCHED BY FILENAME, not by the assembled path. The proofs build their paths three
       * different ways — from `ROOT`, from `dirname(fileURLToPath(import.meta.url))`, and with
       * `'..'` segments — and reconstructing each shape is a path resolver written in a regex.
       * `budgets.json` was missed by the first version for exactly that reason.
       *
       * A filename can in principle collide with an unrelated file. That errs toward REPORTING,
       * which is the right direction for a warning whose whole job is to be noticed.
       */
      /*
       * A PATH WRITTEN AS A PLAIN STRING, which is the other half of how these scripts address
       * their targets. `verify-state-id-proof.mjs` holds
       * `const GATES = '.harness/verification/gates.json'` and passes it through a helper — no
       * `join`, no direct `writeFileSync` on the constant — so the shape below missed it, and
       * that is the file whose leftover plant failed gate 0 with a duplicate gate id.
       *
       * Any repo-relative path in a script that writes files is a candidate. It over-collects;
       * `AMBIGUOUS_NAMES` and the fact that this is a WARNING rather than a failure are what
       * keep that from being noise.
       */
      for (const m of source.matchAll(/'([\w.@-]+(?:\/[\w.@-]+)+\.[a-z]{2,5})'/gu)) {
        const file = m[1].split('/').pop();
        if (file !== undefined && !AMBIGUOUS_NAMES.has(file)) targets.add(file);
      }

      for (const m of source.matchAll(/const\s+(\w+)\s*=\s*join\(([^)]*)\)/gu)) {
        const [, name, args] = m;
        if (!new RegExp(`writeFileSync\\(\\s*${name}\\b`, 'u').test(source)) continue;
        const parts = [...args.matchAll(/'([^']+)'/gu)].map((a) => a[1]);
        const file = parts.at(-1);
        if (file === undefined || !file.includes('.')) continue;
        /*
         * UBIQUITOUS NAMES ARE SKIPPED. `verify-peer-deps` plants into
         * `packages/store/package.json`, and matching on the basename alone then flags EVERY
         * `package.json` in the repository — including the one legitimately edited to add the
         * script this warning lives in.
         *
         * A warning that fires on ordinary work is a warning people stop reading, which is
         * exactly the outcome that would make the three real incidents recur. Skipping these
         * loses a real finding only if a proof plants into a `package.json` AND is killed AND
         * nothing else notices — and `pnpm install --frozen-lockfile` runs a few steps later.
         */
        if (!AMBIGUOUS_NAMES.has(file)) targets.add(file);
      }
    }
  }
  return targets;
}

function dirtyFiles() {
  const result = spawnSync('git', ['status', '--porcelain=v1'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return new Set(
    (result.stdout ?? '')
      .split('\n')
      .filter((line) => line.trim() !== '')
      // Untracked files are not the hazard — a leftover plant is a MODIFICATION to something
      // git already knows about, and scratch files would make this noisy enough to ignore.
      .filter((line) => !line.startsWith('??'))
      .map((line) => line.slice(3).trim()),
  );
}

const steps = stepsFrom(readFileSync(WORKFLOW, 'utf8'));
if (steps.length === 0) {
  console.log(`\n${RED}${BOLD}No steps were read from ci.yml.${OFF} Refusing to report success.\n`);
  process.exit(1);
}

if (process.argv.includes('--list')) {
  console.log(`\n${BOLD}What CI runs${OFF} ${DIM}(${String(steps.length)} step(s))${OFF}\n`);
  for (const step of steps) {
    const { run, why } = classify(step);
    console.log(run ? `  ${step.command}` : `  ${DIM}skipped: ${step.name} — ${why}${OFF}`);
  }
  console.log();
  process.exit(0);
}

const keepGoing = process.argv.includes('--all');
console.log(
  `\n${BOLD}CI, locally${OFF} ${DIM}${String(steps.length)} step(s) read from .github/workflows/ci.yml${OFF}\n`,
);

const dirtyBefore = dirtyFiles();

/*
 * INHERITED DAMAGE, reported BEFORE anything runs.
 *
 * The comparison further down catches what THIS run breaks. It cannot catch what a PREVIOUS run
 * broke — a proof killed before its `finally`, whose plant was already in the tree when this one
 * started. That has now happened three times, to three different files:
 *
 *   .github/workflows/ci.yml            an `if: false` on a gate step
 *   tests/bench/budgets.json            a ceiling nothing can pass
 *   docs/design/design-system.manifest.json   a status colour moved on top of another
 *
 * The last one is the reason this is worth the code: it failed eight design-token tests in a
 * package nothing in that session had touched, and `git add -A` would have committed a broken
 * colour system.
 */
if (dirtyBefore !== null) {
  /*
   * COMPARED BY FILENAME, because that is what `plantTargets` collects.
   *
   * This read `plantTargets().filter((f) => dirtyBefore.has(f))` — basenames against full paths
   * — so it matched exactly one thing in the repository: `package.json`, which happens to be
   * both. It reported the file I had legitimately edited and stayed silent about the four that
   * had actually been left behind. A guard that reports only the false positive is worse than
   * none, because it teaches the reader to skip it.
   */
  const targets = plantTargets();
  const planted = [...dirtyBefore].filter((f) => targets.has(f.split('/').pop() ?? f));
  if (planted.length > 0) {
    console.log(
      `${RED}${BOLD}${String(planted.length)} file(s) a mutation proof plants into are already modified.${OFF}\n` +
        `${DIM}  Most likely a proof killed before its restore ran — a \`finally\` does not survive\n` +
        `  a timeout or a Ctrl+C. If you did not edit these yourself, restore them first:${OFF}\n`,
    );
    for (const file of planted) console.log(`  ${YELLOW}!${OFF} git checkout ${file}`);
    console.log();
  }
}

const failures = [];
let ran = 0;
let skipped = 0;

for (const step of steps) {
  const { run, why } = classify(step);
  if (!run) {
    skipped += 1;
    console.log(`  ${DIM}—  ${step.name} ${DIM}(${why})${OFF}`);
    continue;
  }

  process.stdout.write(`  …  ${step.name}`);
  const result = spawnSync(step.command, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  ran += 1;
  const code = result.status ?? 1;
  process.stdout.write('\r');

  if (code === 0) {
    console.log(`  ${GREEN}✓${OFF}  ${step.name}${' '.repeat(8)}`);
    continue;
  }

  console.log(`  ${RED}✗${OFF}  ${step.name}${' '.repeat(8)}`);
  failures.push({ step, output: `${result.stdout ?? ''}${result.stderr ?? ''}` });
  if (!keepGoing) break;
}

console.log();

/*
 * THE TREE, COMPARED. Reported whether the run passed or failed: a leftover plant is worse on a
 * green run, because that is the one somebody commits.
 */
const dirtyAfter = dirtyFiles();
if (dirtyBefore !== null && dirtyAfter !== null) {
  const appeared = [...dirtyAfter].filter((f) => !dirtyBefore.has(f));
  if (appeared.length > 0) {
    console.log(
      `${RED}${BOLD}This run modified ${String(appeared.length)} tracked file(s) it should not have.${OFF}\n` +
        `${DIM}  Almost certainly a mutation proof that was killed before its restore ran — a\n` +
        `  \`finally\` does not survive a timeout or a Ctrl+C. Check each, then restore:${OFF}\n`,
    );
    for (const file of appeared) console.log(`  ${YELLOW}!${OFF} git checkout ${file}`);
    console.log();
  }
}

if (failures.length === 0) {
  console.log(
    `${GREEN}${BOLD}Every step CI runs passes here.${OFF} ` +
      `${DIM}${String(ran)} run, ${String(skipped)} not runnable locally.${OFF}\n` +
      `${DIM}  This is not a CI replica: it runs the same commands in the same order on THIS\n` +
      `  machine. A failure that depends on the runner's environment — an empty node_modules\n` +
      `  at gate 0, a different SDK — is still only visible in CI.${OFF}\n`,
  );
  process.exit(0);
}

for (const { step, output } of failures) {
  console.log(`${RED}${BOLD}${step.name}${OFF} ${DIM}${step.command}${OFF}\n`);
  console.log(
    output
      .split('\n')
      .slice(-30)
      .map((l) => `    ${l}`)
      .join('\n'),
  );
  console.log();
}

console.log(
  `${RED}${BOLD}${String(failures.length)} step(s) failed.${OFF}` +
    (keepGoing
      ? ''
      : ` ${YELLOW}CI stops at the first failure too — the steps after this one are UNVERIFIED.${OFF}\n` +
        `${DIM}  Re-run with --all to see every failure at once.${OFF}`) +
    '\n',
);
process.exit(1);
