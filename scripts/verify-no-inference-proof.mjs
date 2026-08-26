#!/usr/bin/env node
/**
 * `verify-no-inference.mjs`, watched failing — and watched staying green.
 *
 * A check nobody has seen reject anything is configuration that parses
 * [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]]. This plants a violation in a
 * real, NON-exempt source file, asserts the scan goes red and names it, restores, and asserts it
 * goes green again.
 *
 * ## The two green cases are the ones that matter
 *
 * A proof where every case is red cannot tell a working check from one that fails on everything.
 * So two cases must stay GREEN:
 *
 * 1. **A doc comment discussing the vocabulary.** This repository talks about skin colour,
 *    ethnicity and age constantly — ADR-0010, the profile modules, the copy that says what the
 *    product refuses to do. A check that fired on prose would be switched off within a day.
 * 2. **The exempt files, untouched.** They are made of the vocabulary by necessity.
 *
 * ## And one case that guards the exemption itself
 *
 * A violation planted in a NON-exempt file must be caught **while the exempt files are present
 * and green**. That is what stops somebody silencing a real finding by widening the exemption:
 * the exemption cannot grow to cover an ordinary source file without this case going red.
 *
 * ```
 * node scripts/verify-no-inference-proof.mjs
 * ```
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './corpus-io.mjs';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The file mutations are planted in.
 *
 * An ordinary source file with no special standing — deliberately not one of the profile
 * modules, so nobody reads this proof as being about them. It is restored byte-for-byte in a
 * `finally`, which is the lesson F-100 paid for: a script that writes into the working tree and
 * exits by a path that does not clean up leaves a corrupted repository behind.
 */
const TARGET = join(ROOT, 'packages', 'recommendation', 'src', 'slots.ts');

const run = () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-no-inference.mjs')], {
    encoding: 'utf8',
  });
  return { code: r.status ?? 1, output: `${r.stdout}${r.stderr}` };
};

const CASES = [
  {
    name: 'a function that infers a protected characteristic',
    expect: 'red',
    matching: /ethnic/iu,
    plant: (source) => `${source}\nexport const inferEthnicity = (): string => 'unknown';\n`,
  },
  {
    name: 'a column-shaped identifier',
    expect: 'red',
    matching: /skin/iu,
    plant: (source) => `${source}\nexport interface Extra { readonly skinTone: number }\n`,
  },
  {
    name: 'an age field, which the widened vocabulary added',
    expect: 'red',
    matching: /age/iu,
    plant: (source) => `${source}\nexport interface Extra { readonly ageBand: number }\n`,
  },
  {
    // THE ONE THAT KEEPS THE RULE ALIVE. This repository discusses these concepts constantly.
    name: 'a doc comment discussing skin colour and ethnicity — must stay GREEN',
    expect: 'green',
    plant: (source) =>
      `${source}\n/**\n * There is no skin colour here and no ethnicity inference; ADR-0010\n * explains why the field cannot exist. Age is not recorded either.\n */\n`,
  },
  {
    // The other green: an ordinary word containing the letters of a rule.
    name: 'identifiers containing "age" and "race" — must stay GREEN',
    expect: 'green',
    plant: (source) =>
      `${source}\nexport const averageStorage = 1;\nexport const braceletCount = 2;\nexport const usagePercentage = 3;\n`,
  },
];

console.log(`\n${BOLD}Irodora — no-inference discrimination proof${OFF}\n`);

const original = readFileSync(TARGET, 'utf8');
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
  console.log(`  ${GREEN}OK${OFF}  baseline: the scan exits 0 before any mutation`);

  for (const testCase of CASES) {
    writeFileSync(TARGET, testCase.plant(original), 'utf8');
    const { code, output } = run();
    writeFileSync(TARGET, original, 'utf8');

    if (testCase.expect === 'green') {
      if (code === 0) console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit 0)${OFF}`);
      else
        problems.push(
          `${testCase.name}: expected the scan to STAY GREEN, got exit ${String(code)}. A check ` +
            'that fires on prose or on an ordinary word is one somebody switches off, and the ' +
            'real protection goes with it.',
        );
      continue;
    }

    if (code === 0) {
      problems.push(`${testCase.name}: the scan ACCEPTED a violation it must reject.`);
      continue;
    }
    if (testCase.matching !== undefined && !testCase.matching.test(output)) {
      problems.push(
        `${testCase.name}: the scan went red but did not name the identifier. Asserting only ` +
          'the exit code would let a case "pass" by breaking something unrelated.',
      );
      continue;
    }
    console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit ${String(code)}, named)${OFF}`);
  }

  const after = run();
  if (after.code !== 0)
    problems.push('the baseline did not recover after the mutations were restored');
} finally {
  // Unconditional. F-100: a proof that writes into a tracked file and exits by a path that does
  // not restore it leaves a corrupted repository, and `git add -A` commits it.
  writeFileSync(TARGET, original, 'utf8');
}

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
  for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}\n`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}The scan discriminates.${OFF} ${DIM}${String(CASES.length)} case(s): ` +
    `${String(CASES.filter((c) => c.expect === 'red').length)} red, ` +
    `${String(CASES.filter((c) => c.expect === 'green').length)} green.${OFF}\n`,
);
