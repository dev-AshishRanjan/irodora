#!/usr/bin/env node
/**
 * Irodora — proof that the gates ↔ CI mirror check can fail.
 *
 * `verify-state.mjs` asserts every active gate has a step in `.github/workflows/ci.yml`.
 * That check is the thing standing between "a gate is declared" and "a gate actually runs",
 * so a version of it that silently passes is worse than not having it — everything
 * downstream is unverified while appearing verified.
 *
 * This script removes each active gate's step from the workflow, one at a time, and asserts
 * gate 0 fails AND names that gate. It is `verify-guards.mjs` applied to CI wiring instead
 * of to ESLint, for the same reason: a check nobody has watched fail is not a check.
 *
 * It found a real defect on its first run. The mirror comparison used to be
 * `ci.includes(gate.command)`, and `pnpm test` is a substring of `pnpm test:golden`,
 * `pnpm test:e2e`, `pnpm test:contrast` and five more — so deleting the real `pnpm test`
 * step left the check green. Gate `e2e` had the same hole via `pnpm test:e2e:full`.
 *
 * Each workflow is restored in a `finally` and the restore is verified byte-for-byte. If this
 * script is interrupted, `git diff .github/workflows/` is the recovery.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CI_WORKFLOW = '.github/workflows/ci.yml';
const GATES = resolve(ROOT, '.harness/verification/gates.json');

/**
 * A gate is mirrored in the workflow it declares, defaulting to `ci.yml` — the same rule
 * `verify-state.mjs` applies. Gate 16 lives in `release.yml` because there is no APK on a
 * pull request, and a proof that only ever mutated `ci.yml` would report that gate as
 * COULD NOT RUN forever, which reads like a broken proof rather than a covered gate.
 */
const workflowOf = (gate) => gate.workflow ?? CI_WORKFLOW;

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Run gate 0 and report whether it failed, plus what it said. */
function runStateGate() {
  try {
    execFileSync(process.execPath, [resolve(ROOT, 'scripts/verify-state.mjs')], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    return { failed: false, output: '' };
  } catch (error) {
    return { failed: true, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/**
 * Delete the workflow step that runs `command`.
 *
 * A step is the `- name:` block containing the matching `run:` line, so removing the run
 * line alone would leave a step with no command — which is a different (and invalid) file,
 * not the situation being tested. Returns null when no step matches.
 */
function removeStepRunning(yaml, command) {
  const lines = yaml.split('\n');

  const runIndex = lines.findIndex((line) => {
    const m = /^\s*-?\s*run:\s*(.*)$/.exec(line);
    if (!m) return false;
    const value = m[1].trim();
    if (!value.startsWith(command)) return false;
    const rest = value.slice(command.length);
    return rest === '' || /^[\s&|;]/.test(rest);
  });
  if (runIndex === -1) return null;

  // Walk back to the `- ` that opens this step, and forward to the next one.
  let start = runIndex;
  while (start > 0 && !/^\s*-\s/.test(lines[start])) start--;

  const openIndent = /^(\s*)/.exec(lines[start])[1].length;
  let end = runIndex + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() && /^\s*-\s/.test(line) && /^(\s*)/.exec(line)[1].length <= openIndent) break;
    end++;
  }

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n');
}

/**
 * Add `if: false` to the step that runs `command` (F-072).
 *
 * The step keeps its `run:`, so the mirror check's command comparison still matches it — which
 * is exactly the situation being tested. A check that only notices a DELETED step cannot tell
 * a running gate from one that is skipped on every push.
 *
 * Returns null when no step matches, or when the step already carries a condition.
 */
function conditionOutStepRunning(yaml, command) {
  const lines = yaml.split('\n');

  const runIndex = lines.findIndex((line) => {
    const m = /^\s*-?\s*run:\s*(.*)$/.exec(line);
    if (!m) return false;
    const value = m[1].trim();
    if (!value.startsWith(command)) return false;
    const rest = value.slice(command.length);
    return rest === '' || /^[\s&|;]/.test(rest);
  });
  if (runIndex === -1) return null;

  const indent = /^(\s*)/.exec(lines[runIndex])[1];
  return [
    ...lines.slice(0, runIndex),
    `${indent}if: false # planted by verify-gate-mirror.mjs`,
    ...lines.slice(runIndex),
  ].join('\n');
}

console.log(`\n${BOLD}Irodora — gate ↔ CI mirror proof${OFF}\n`);

const gates = JSON.parse(readFileSync(GATES, 'utf8'));
const active = gates.gates.filter((g) => g.status === 'active' && g.ciStep !== false);

/**
 * Every workflow this run will mutate, with its bytes as found.
 *
 * Read up front, so the `finally` can restore all of them whatever happens in between — a
 * proof that leaves a workflow half-mutated has broken the thing it was checking.
 */
const workflows = new Map(
  [...new Set(active.map(workflowOf))].map((w) => {
    const path = resolve(ROOT, w);
    return [w, { path, original: readFileSync(path, 'utf8') }];
  }),
);

const notEnforced = [];
const couldNotRun = [];

try {
  // The baseline matters: if gate 0 is already red, every removal below "fails" and the
  // whole run is meaningless. A guard that cannot distinguish its own broken setup from a
  // real finding is the failure mode this repository has hit before.
  const baseline = runStateGate();
  if (baseline.failed) {
    console.log(`  ${RED}✗ baseline: gate 0 is already failing${OFF}`);
    console.log(
      `    ${DIM}Fix gate 0 first — nothing below can mean anything until it is green.${OFF}\n`,
    );
    process.exit(1);
  }
  console.log(`  ${DIM}baseline: gate 0 green with the workflow intact${OFF}\n`);

  for (const gate of active) {
    const workflow = workflowOf(gate);
    const { path, original } = workflows.get(workflow);
    const mutated = removeStepRunning(original, gate.command);
    if (mutated === null) {
      couldNotRun.push({ gate, reason: `no step in ${workflow} runs "${gate.command}"` });
      continue;
    }

    writeFileSync(path, mutated, 'utf8');
    const result = runStateGate();
    writeFileSync(path, original, 'utf8');

    if (!result.failed) {
      notEnforced.push({ gate, reason: 'gate 0 stayed GREEN with the step removed' });
      continue;
    }
    if (!result.output.includes(`"${gate.id}"`)) {
      notEnforced.push({
        gate,
        reason: `gate 0 failed, but did not name "${gate.id}" — it may have failed for another reason`,
      });
      continue;
    }

    console.log(`  ${GREEN}✓${OFF} removing the "${gate.id}" step fails gate 0`);
    console.log(`    ${DIM}${gate.command}  —  ${workflow}${OFF}`);
  }

  // ---- F-072: the second way a gate stops running -------------------------------------
  //
  // Deleting a step is the loud failure. CONDITIONING IT OUT is the quiet one: the step is
  // still there, this proof's first half still passes, and the gate never executes. That is
  // how gate 11 nearly shipped skipped for the whole of R1 behind
  // `if: hashFiles('content/colors') != ''`.
  console.log('');
  for (const gate of active) {
    const { path, original } = workflows.get(workflowOf(gate));
    const mutated = conditionOutStepRunning(original, gate.command);
    if (mutated === null) {
      couldNotRun.push({ gate, reason: `could not add a condition to the "${gate.id}" step` });
      continue;
    }

    writeFileSync(path, mutated, 'utf8');
    const result = runStateGate();
    writeFileSync(path, original, 'utf8');

    if (!result.failed) {
      notEnforced.push({
        gate,
        reason:
          'gate 0 stayed GREEN with the step conditioned out — the gate can be silently skipped',
      });
      continue;
    }
    if (!result.output.includes(`"${gate.id}"`)) {
      notEnforced.push({
        gate,
        reason: `gate 0 failed on the condition, but did not name "${gate.id}"`,
      });
      continue;
    }

    console.log(`  ${GREEN}✓${OFF} conditioning out the "${gate.id}" step fails gate 0`);
  }
} finally {
  for (const [workflow, { path, original }] of workflows) {
    writeFileSync(path, original, 'utf8');
    if (readFileSync(path, 'utf8') !== original) {
      console.log(
        `\n${RED}${BOLD}${workflow} was NOT restored cleanly. Run: git checkout ${workflow}${OFF}\n`,
      );
      process.exit(1);
    }
  }
}

if (couldNotRun.length) {
  console.log(`\n${RED}${BOLD}${couldNotRun.length} gate(s) COULD NOT BE TESTED${OFF}\n`);
  for (const { gate, reason } of couldNotRun) {
    console.log(`  ${RED}✗ ${gate.id}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(
      `    ${DIM}fix:${OFF} an ACTIVE gate with no CI step is the condition gate 0 is meant to`,
    );
    console.log(`         report. If gate 0 is passing anyway, gate 0 is the bug.\n`);
  }
}

if (notEnforced.length) {
  console.log(`\n${RED}${BOLD}${notEnforced.length} gate(s) NOT actually mirrored${OFF}\n`);
  for (const { gate, reason } of notEnforced) {
    console.log(`  ${RED}✗ ${gate.id}${OFF}  ${DIM}${gate.command}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(
      `    ${DIM}why it matters:${OFF} this gate can be deleted from CI without anything noticing.\n`,
    );
  }
}

if (couldNotRun.length || notEnforced.length) {
  console.log(`${RED}${BOLD}Mirror proof FAILED.${OFF} A check that cannot fail is not a check.\n`);
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}All ${active.length} active gates proven mirrored.${OFF}\n`);
