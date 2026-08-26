#!/usr/bin/env node
/**
 * Gate 12, watched failing — and watched staying green.
 *
 * A performance gate is the easiest kind to ship broken, because the broken version looks
 * exactly like the healthy one: green, fast, and reporting numbers. Nothing downstream ever
 * contradicts a p95 that is computed wrongly or a ceiling nothing can reach. So every way this
 * gate could pass while checking nothing is planted here and watched going red.
 *
 * ## The two green cases are the ones that matter
 *
 * A proof where every case is red cannot tell a working check from one that fails on everything
 * [[a-decoy-that-is-not-broken-proves-nothing]]. Two cases must stay GREEN:
 *
 * 1. **The baseline**, asserted before and after the mutations.
 * 2. **A `device`-scope budget with an impossible ceiling.** This is the load-bearing one. If
 *    the gate were quietly measuring device budgets against desktop numbers — the single way
 *    this gate could tell a lie about NFR-4 — a 0.001 ms device ceiling would fail. It must
 *    stay green, because a device budget is reported, never measured here.
 *
 * ## Two mutations are synthetic on purpose
 *
 * The constant-percentile and zero-duration cases are not bugs anybody would write by hand.
 * They exist to isolate one check each, so that "the self-test passed" is distinguishable from
 * "the self-test cannot fail", and so the zero-p95 guard is proven on every machine rather than
 * only on one whose timer happens to be coarse.
 *
 * ```
 * node tests/bench/src/bench-proof.mjs
 * ```
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH = join(HERE, 'bench.mjs');
const BUDGETS = join(HERE, '..', 'budgets.json');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const run = () => {
  const r = spawnSync(process.execPath, [BENCH], { encoding: 'utf8' });
  return { code: r.status ?? 1, output: `${r.stdout}${r.stderr}` };
};

/** Parse, hand to `mutate`, write back. The original bytes are restored by the caller. */
const editBudgets = (original, mutate) => {
  const parsed = JSON.parse(original);
  mutate(parsed);
  writeFileSync(BUDGETS, JSON.stringify(parsed, null, 2), 'utf8');
};

/** Replace one exact substring in the bench's own source, refusing a mutation that no-ops. */
const editBench = (original, from, to) => {
  if (!original.includes(from))
    throw new Error(`the proof's anchor is gone from bench.mjs: ${from}`);
  writeFileSync(BENCH, original.replace(from, to), 'utf8');
};

const find = (parsed, id) => {
  const budget = parsed.budgets.find((b) => b.id === id);
  if (budget === undefined) throw new Error(`the proof expects a budget named ${id}`);
  return budget;
};

const CASES = [
  // --- the regression the gate exists to catch ---------------------------------------------
  {
    name: 'a measurement over its ceiling',
    expect: 'red',
    matching: /recommend-outfit-p95[\s\S]*exceeds the committed ceiling/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        find(p, 'recommend-outfit-p95').ceilingMs = 0.0001;
      }),
  },

  // --- the ways a budget could be present and check nothing --------------------------------
  {
    name: 'a node-reference budget nothing measures',
    expect: 'red',
    matching: /nothing measures it/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        find(p, 'score-outfit-p95').id = 'a-budget-with-no-measurement';
      }),
  },
  {
    name: 'a budget with an unknown scope',
    expect: 'red',
    matching: /unknown scope/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        find(p, 'score-outfit-p95').scope = 'staging';
      }),
  },
  {
    name: 'a budget with no ceiling',
    expect: 'red',
    matching: /missing ceilingMs/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        delete find(p, 'score-outfit-p95').ceilingMs;
      }),
  },
  {
    name: 'a node-reference budget with no sample size',
    expect: 'red',
    matching: /runs and callsPerRun/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        delete find(p, 'score-outfit-p95').runs;
      }),
  },
  {
    name: 'no budgets at all',
    expect: 'red',
    matching: /No budgets/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        p.budgets = [];
      }),
  },

  // --- the arithmetic, both directions ------------------------------------------------------
  {
    name: 'a percentile that always returns the maximum',
    expect: 'red',
    matching: /arithmetic is wrong[\s\S]*p95 of 1\.\.100/u,
    plantBench: (source) =>
      editBench(
        source,
        'const rank = Math.ceil((p / 100) * sorted.length);',
        'const rank = sorted.length;',
      ),
  },
  {
    // SYNTHETIC, AND THE POINT OF IT IS THE OTHER DIRECTION. This percentile is hardcoded to
    // return the right answer for every value the known-answer checks ask for, and a constant
    // for everything else. Those checks all pass. Only the p95-vs-p5 comparison — the half that
    // asserts the function is READING its argument — can see it.
    name: 'a percentile hardcoded to satisfy the known answers',
    expect: 'red',
    matching: /not reading its argument/u,
    plantBench: (source) =>
      editBench(
        source,
        'const sorted = [...values].sort((a, b) => a - b);',
        'if (values.length === 1) return values[0];\n  if (p === 50) return 50;\n  if (p === 100) return 100;\n  return 95;\n  // eslint-disable-next-line no-unreachable\n  const sorted = [...values].sort((a, b) => a - b);',
      ),
  },
  {
    // SYNTHETIC for portability. The real trigger is a per-call budget on work cheaper than the
    // timer's tick — which reproduces on a coarse timer and not on a fine one. Forcing every
    // duration to zero proves the guard on every machine instead of on one.
    name: 'measurements that all come back as zero',
    expect: 'red',
    matching: /below the timer's resolution/u,
    plantBench: (source) =>
      editBench(source, 'durations.push(performance.now() - started);', 'durations.push(0);'),
  },

  // --- the control that keeps the NOT RUN claim honest --------------------------------------
  {
    // THE CASE THAT PROVES THE GATE IS NOT LYING ABOUT NFR-4. A device budget of 0.001 ms is
    // unreachable by anything. It must stay GREEN, because device budgets are printed, not
    // measured. Were this gate ever changed to satisfy them with a desktop number, this is the
    // case that would go red.
    name: 'a device budget with an impossible ceiling — must stay GREEN',
    expect: 'green',
    matching: /NOT RUN — 5 device budget/u,
    plant: (budgets) =>
      editBudgets(budgets, (p) => {
        p.budgets.push({
          id: 'planted-device-budget',
          scope: 'device',
          measures: 'planted by bench-proof.mjs',
          ceilingMs: 0.001,
          rationale: 'Unreachable on purpose. If this is ever measured here, the gate is lying.',
        });
      }),
  },
];

console.log(`\n${BOLD}Irodora — gate 12 discrimination proof${OFF}\n`);

const originalBudgets = readFileSync(BUDGETS, 'utf8');
const originalBench = readFileSync(BENCH, 'utf8');
const problems = [];

try {
  const baseline = run();
  if (baseline.code !== 0) {
    console.log(
      `${RED}${BOLD}The baseline is not green.${OFF} Nothing below would prove anything.\n`,
    );
    console.log(baseline.output);
    process.exit(1);
  }
  console.log(`  ${GREEN}OK${OFF}  baseline: the bench exits 0 before any mutation`);

  for (const testCase of CASES) {
    if (testCase.plant !== undefined) testCase.plant(originalBudgets);
    if (testCase.plantBench !== undefined) testCase.plantBench(originalBench);
    const { code, output } = run();
    writeFileSync(BUDGETS, originalBudgets, 'utf8');
    writeFileSync(BENCH, originalBench, 'utf8');

    if (testCase.expect === 'green') {
      if (code !== 0) {
        problems.push(
          `${testCase.name}: expected the gate to STAY GREEN, got exit ${String(code)}.\n${output}`,
        );
        continue;
      }
      if (testCase.matching !== undefined && !testCase.matching.test(output)) {
        problems.push(
          `${testCase.name}: the gate stayed green but did not report what it skipped. ` +
            'Green with the budget silently dropped is the failure this case is looking for.',
        );
        continue;
      }
      console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit 0, reported)${OFF}`);
      continue;
    }

    if (code === 0) {
      problems.push(`${testCase.name}: the gate ACCEPTED a state it must reject.`);
      continue;
    }
    if (!testCase.matching.test(output)) {
      problems.push(
        `${testCase.name}: the gate went red but did not say why. Asserting only the exit code ` +
          `would let a case "pass" by breaking something unrelated.\n${output}`,
      );
      continue;
    }
    console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit ${String(code)}, named)${OFF}`);
  }

  const after = run();
  if (after.code !== 0) problems.push('the baseline did not recover after the mutations');
} finally {
  // Unconditional, and byte-for-byte. F-100 was a script that wrote into a tracked file and
  // exited by a path that did not restore it; the corrupted matrix it left behind failed 374
  // checks in a gate nobody had touched.
  writeFileSync(BUDGETS, originalBudgets, 'utf8');
  writeFileSync(BENCH, originalBench, 'utf8');
  for (const [path, original] of [
    [BUDGETS, originalBudgets],
    [BENCH, originalBench],
  ])
    if (readFileSync(path, 'utf8') !== original) {
      console.log(`\n${RED}${BOLD}${path} was NOT restored. Run: git checkout ${path}${OFF}\n`);
      process.exit(1);
    }
}

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
  for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}\n`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Gate 12 discriminates.${OFF} ${DIM}${String(CASES.length)} case(s): ` +
    `${String(CASES.filter((c) => c.expect === 'red').length)} red, ` +
    `${String(CASES.filter((c) => c.expect === 'green').length)} green.${OFF}\n`,
);
