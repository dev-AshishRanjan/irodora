#!/usr/bin/env node
/**
 * Gate 12 — performance against **absolute committed budgets** (NFR-4, F-038).
 *
 * ## Absolute, never a delta
 *
 * The gate's own description says why: *"a delta gate flakes until someone disables it"*.
 * Hardware varies, CI runners vary within themselves, and a threshold that moves with the last
 * run measures the last run rather than the product. Every ceiling lives in `budgets.json`,
 * committed, with the reasoning beside it.
 *
 * ## What it measures, and what it refuses to pretend it measures
 *
 * NFR-4's budgets are **on-device**, *"measured on the slowest device in the support matrix
 * rather than the fastest"*. A CI runner is neither. So every budget carries a `scope`:
 *
 * - `node-reference` — the ENGINE's own cost, measurable here, and failed on a miss.
 * - `device` — NFR-4's actual claim. **Printed as NOT RUN**, never counted as passing.
 *
 * A green run of this gate says the engine is not the problem. It says nothing about a phone,
 * and the output says so every time [[a-gate-that-errors-is-failing-open]].
 *
 * **The node-reference ceilings are not derived from the device ones.** Nobody has measured the
 * ratio between this hardware and a four-year-old Android. They are chosen ceilings on the
 * engine's contribution, and `budgets.json` says that in each rationale.
 *
 * ## It self-tests its own arithmetic every run
 *
 * Criterion 4. A p95 computed wrongly produces a plausible number and a green gate for ever —
 * there is no downstream symptom. So the percentile function is checked against a known array
 * with a known answer **and** against a deliberately wrong expectation that must fail, before
 * anything is measured. If the self-tests did not run, the gate refuses to report.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromXyz } from '@irodora/color-core';
import {
  applyChange,
  coverage,
  outfitWeights,
  parseWeightContent,
  recommendOutfit,
  ruleSetFor,
  scoreColor,
  scoreOutfit,
} from '@irodora/recommendation';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The p95 of a sample, by nearest-rank on the sorted values.
 *
 * Nearest-rank rather than an interpolated percentile: an interpolated p95 of 20 samples is a
 * number that appears in no run, and a budget should be exceeded by an observation somebody
 * could point at.
 */
export function percentile(values, p) {
  if (values.length === 0) throw new Error('percentile: empty sample');
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

/**
 * The arithmetic self-test. Runs before anything is measured, every time.
 *
 * Both directions, deliberately: a self-test that only asserts the right answer passes on a
 * function that returns its input, and one that only asserts a wrong answer fails passes on a
 * function that returns a constant [[a-decoy-that-is-not-broken-proves-nothing]].
 */
function selfTest() {
  const problems = [];
  let ran = 0;

  const check = (name, actual, expected) => {
    ran += 1;
    if (actual !== expected)
      problems.push(`${name}: got ${String(actual)}, expected ${String(expected)}`);
  };

  // 1..100: the 95th value by nearest rank is 95, and the median is 50.
  const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
  check('p95 of 1..100', percentile(hundred, 95), 95);
  check('p50 of 1..100', percentile(hundred, 50), 50);
  check('p100 of 1..100', percentile(hundred, 100), 100);
  // A sample of one is its own every percentile.
  check('p95 of [7]', percentile([7], 95), 7);
  // Order must not matter — the function sorts, and a bench feeds it in arrival order.
  check('p95 is order-independent', percentile([...hundred].reverse(), 95), 95);

  // THE OTHER DIRECTION. If this does NOT differ, the function is returning a constant and
  // every check above passed for the wrong reason.
  ran += 1;
  if (percentile(hundred, 95) === percentile(hundred, 5))
    problems.push('p95 and p5 of 1..100 are equal — the percentile is not reading its argument');

  if (ran === 0) problems.push('the self-test did not run at all');
  return { problems, ran };
}

/**
 * Run `fn` `runs` times — `callsPerRun` calls per timed run — and return the durations in ms.
 *
 * `callsPerRun` exists because `performance.now()` cannot resolve a call that costs less than
 * its own tick. Timed one at a time, `scoreColor` reports 0.00 ms, and a ceiling nothing can
 * exceed is a check that passes because it does nothing. Batching moves the measurement above
 * the timer's floor; the ceiling is then on the batch, and the budget says so.
 */
function measure(fn, runs, callsPerRun) {
  const durations = [];
  for (let i = 0; i < runs; i += 1) {
    const started = performance.now();
    for (let call = 0; call < callsPerRun; call += 1) fn();
    durations.push(performance.now() - started);
  }
  return durations;
}

// --- the fixtures: the real published content, not a synthetic set -------------------------

const weights = parseWeightContent(
  JSON.parse(readFileSync(join(ROOT, 'content', 'rules', 'weights.2026.08.2.json'), 'utf8')),
  'weights.2026.08.2.json',
);
const rules = ruleSetFor(weights, 'default');
const outfitBudgetWeights = outfitWeights(weights);

const bundle = JSON.parse(
  readFileSync(join(ROOT, 'content', 'versions', '2026.08.1.json'), 'utf8'),
);
const pool = bundle.entries.map((e) => ({
  id: e.entry.slug,
  color: fromXyz([e.entry.color.xyz.x, e.entry.color.xyz.y, e.entry.color.xyz.z], {
    source: 'reference',
    confidence: 1,
    originSpace: 'oklch',
  }),
}));

const profile = {
  lightness: { min: 0.45, max: 0.75 },
  temperatureBias: 0.5,
  chroma: { min: 0, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75 },
};

const garment = pool.find((c) => c.id === 'yoru-kawa');
const input = { slot: 'top', color: garment.color };
const outfit = [
  { slot: 'top', color: pool.find((c) => c.id === 'aka-tsuchi').color },
  { slot: 'trouser', color: pool.find((c) => c.id === 'furu-kawa').color },
  { slot: 'shoe', color: pool.find((c) => c.id === 'kuro-tsuchi').color },
];

/**
 * What each `node-reference` budget measures. Keyed by the budget id, so a budget with no
 * measurement is a failure rather than a silent skip.
 *
 * The sample sizes are NOT here — they are in `budgets.json` beside the ceiling, because a
 * ceiling and the sample it is a ceiling on are one decision and drift apart when they live in
 * two files.
 */

/*
 * A wardrobe of thirty — ten per slot, a thousand combinations (F-048).
 *
 * The SIZE is the point. The budget below exists to catch `applyChange` degenerating into a
 * full recompute, and the two are only distinguishable when there is enough to recompute: at
 * three garments both are instant and the gate would pass over a rewritten increment.
 */
const coverageWardrobe = ['top', 'trouser', 'shoe'].flatMap((slot, s) =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `${slot}-${String(i)}`,
    slot,
    color: fromXyz([0.2 + i * 0.07 + s * 0.01, 0.22 + i * 0.07, 0.25 + i * 0.07], {
      source: 'reference',
      confidence: 1,
      originSpace: 'oklch',
    }),
  })),
);

const coverageContext = {
  reference: pool,
  profile,
  rules,
  weights: outfitBudgetWeights,
  threshold: 0,
};
const coverageBase = coverage(coverageWardrobe, coverageContext);
const coverageAdded = {
  id: 'incoming-top',
  slot: 'top',
  color: fromXyz([0.55, 0.57, 0.6], { source: 'reference', confidence: 1, originSpace: 'oklch' }),
};

const MEASUREMENTS = {
  'coverage-apply-change-p95': () => {
    applyChange(
      coverageBase,
      [...coverageWardrobe, coverageAdded],
      { kind: 'added', garment: coverageAdded },
      coverageContext,
    );
  },
  'recommend-outfit-p95': () => {
    recommendOutfit(input, pool, profile, rules);
  },
  'score-outfit-p95': () => {
    scoreOutfit(outfit, pool, profile, rules, outfitBudgetWeights);
  },
  'score-color-batch-p95': () => {
    scoreColor(profile, garment.color, rules);
  },
};

// --- run -----------------------------------------------------------------------------------

console.log(`\n${BOLD}Irodora — gate 12: performance${OFF}\n`);

const { problems: selfTestProblems, ran: selfTests } = selfTest();
if (selfTestProblems.length > 0) {
  console.log(
    `${RED}${BOLD}The bench's own arithmetic is wrong.${OFF} Nothing below would mean anything.\n`,
  );
  for (const p of selfTestProblems) console.log(`  ${RED}✗${OFF} ${p}`);
  process.exit(1);
}
if (selfTests === 0) {
  console.log(
    `${RED}${BOLD}The self-test did not run.${OFF} A bench that has not checked its own percentile is reporting a number nobody has verified.\n`,
  );
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} ${DIM}arithmetic self-test: ${String(selfTests)} check(s)${OFF}\n`);

const { budgets } = JSON.parse(readFileSync(join(HERE, '..', 'budgets.json'), 'utf8'));
if (!Array.isArray(budgets) || budgets.length === 0) {
  console.log(`${RED}${BOLD}No budgets.${OFF} A gate with nothing to check is not passing.\n`);
  process.exit(1);
}

const failures = [];
const notRun = [];
let measured = 0;

const positiveInteger = (value) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

for (const budget of budgets) {
  const missing = ['id', 'scope', 'ceilingMs', 'rationale', 'measures'].filter(
    (field) => budget[field] === undefined,
  );
  if (missing.length > 0) {
    failures.push(`${String(budget.id ?? '(unnamed)')}: missing ${missing.join(', ')}`);
    continue;
  }
  if (typeof budget.ceilingMs !== 'number' || !(budget.ceilingMs > 0)) {
    failures.push(`${budget.id}: ceilingMs must be a positive number`);
    continue;
  }

  if (budget.scope === 'device') {
    notRun.push(budget);
    continue;
  }
  if (budget.scope !== 'node-reference') {
    failures.push(`${budget.id}: unknown scope "${String(budget.scope)}"`);
    continue;
  }

  const run = MEASUREMENTS[budget.id];
  if (run === undefined) {
    // A budget nobody measures is a ceiling that can never be exceeded — the shape of a check
    // that passes because it does nothing.
    failures.push(`${budget.id}: scope is node-reference and nothing measures it`);
    continue;
  }
  if (!positiveInteger(budget.runs) || !positiveInteger(budget.callsPerRun)) {
    failures.push(
      `${budget.id}: a node-reference budget needs runs and callsPerRun as positive integers. ` +
        'They live beside the ceiling because a ceiling and the sample it is a ceiling on are ' +
        'one decision.',
    );
    continue;
  }

  const durations = measure(run, budget.runs, budget.callsPerRun);
  measured += 1;
  const p95 = percentile(durations, 95);
  const median = percentile(durations, 50);

  // A p95 that rounds to zero is not a fast measurement, it is an absent one: the work costs
  // less than `performance.now()` can resolve, and the ceiling could never be exceeded no
  // matter how much slower the code got. Raise `callsPerRun` and put the ceiling on the batch.
  if (p95 === 0) {
    console.log(`  ${RED}✗${OFF} ${budget.id.padEnd(24)} ${DIM}p95 measured as exactly 0${OFF}`);
    failures.push(
      `${budget.id}: p95 is exactly 0 ms — below the timer's resolution, so this budget cannot ` +
        'be exceeded by any regression and is not checking anything. Raise callsPerRun and set ' +
        'the ceiling on the batch.',
    );
    continue;
  }

  const per = budget.callsPerRun > 1 ? ` (${String(budget.callsPerRun)} calls/run)` : '';
  const verdict = p95 <= budget.ceilingMs;
  console.log(
    `  ${verdict ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ${budget.id.padEnd(24)} ` +
      `${DIM}p95 ${p95.toFixed(2)} ms, median ${median.toFixed(2)} ms, ` +
      `ceiling ${String(budget.ceilingMs)} ms, ${String(durations.length)} runs${per}${OFF}`,
  );
  if (!verdict)
    failures.push(
      `${budget.id}: p95 ${p95.toFixed(2)} ms exceeds the committed ceiling of ` +
        `${String(budget.ceilingMs)} ms. A MISS IS A TRACKED WORK ITEM, NEVER AN EDITED ` +
        `THRESHOLD — the budget is the decision and the measurement is the observation.`,
    );
}

if (measured === 0) {
  console.log(
    `\n${RED}${BOLD}Nothing was measured.${OFF} A performance gate that ran no measurement ` +
      `reports the same green as one that met every budget.\n`,
  );
  process.exit(1);
}

console.log(
  `\n${YELLOW}!${OFF} ${DIM}NOT RUN — ${String(notRun.length)} device budget(s). NFR-4 is ` +
    `measured "on the slowest device in the support matrix", and a CI runner is neither the ` +
    `slowest nor a device. A green run here says the ENGINE is not the problem; it says ` +
    `nothing about a phone.${OFF}`,
);
for (const budget of notRun)
  console.log(`  ${DIM}· ${budget.id.padEnd(24)} ceiling ${String(budget.ceilingMs)} ms${OFF}`);

if (failures.length > 0) {
  console.log(`\n${RED}${BOLD}${String(failures.length)} budget failure(s).${OFF}\n`);
  for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}\n`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Gate 12 passed.${OFF} ${DIM}${String(measured)} budget(s) measured, ` +
    `${String(notRun.length)} not run, ${String(selfTests)} self-test(s).${OFF}\n`,
);
