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

import { readFileSync } from 'node:fs';
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
