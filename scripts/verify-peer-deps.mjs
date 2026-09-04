#!/usr/bin/env node
/**
 * Peer dependencies are satisfied, or the mismatch is a recorded decision.
 *
 * ## Why this shells out instead of walking the store
 *
 * The first version of this script read `node_modules/.pnpm` itself and decided what "satisfied"
 * meant. It found nine problems, and **two of its three headline findings were wrong**:
 * `tailwind-merge` looked undeclared because it was resolved from `packages/ui`, which does not
 * declare it, while `apps/mobile` — the package that actually bundles — does; and `expo-blur` and
 * `@gorhom/bottom-sheet` looked missing when both are declared **optional** by `heroui-native`.
 *
 * `pnpm peers check` already answers this question, understands optionality, version ranges and
 * the workspace layout, and is maintained by the people who wrote the resolver. A checker that
 * reimplements its subject agrees with it on the day it is written and never again
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]] — and this one did not even
 * manage day one.
 *
 * So this parses pnpm's output and adds the thing pnpm does not have: **a register of accepted
 * mismatches, each with a reason and an owner**, checked in both directions.
 *
 * ## What it found when it first ran (F-143)
 *
 * `react-native-gesture-handler` **3.2.1** installed against `heroui-native`'s `^2.28.0` — a
 * major version apart, under every gesture-driven overlay in the library. Expo SDK 57 ships v3;
 * HeroUI 1.0.8 has not caught up. Nothing in the repository had noticed, because nothing asked.
 *
 * ```
 * node scripts/verify-peer-deps.mjs
 * node scripts/verify-peer-deps.mjs --prove
 * ```
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATIONS = join(ROOT, '.harness/verification/unsatisfied-peers.json');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Ask pnpm, and read its answer.
 *
 * `peers check` exits non-zero when it finds anything, so the status is not the signal — the
 * output is. A non-zero exit with EMPTY output would mean pnpm itself failed to run, and that is
 * reported rather than read as "clean", because a checker that cannot see its subject has not
 * passed [[a-gate-that-errors-is-failing-open]].
 */
export function askPnpm() {
  let out;
  try {
    // One command string rather than an arg array: passing args alongside a shell is deprecated
    // in Node 24, and there is nothing here to interpolate anyway.
    out = execSync('pnpm peers check', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (out.trim() === '')
      throw new Error(
        '`pnpm peers check` produced no output and failed. The gate could not see its subject, ' +
          'which is not the same as finding nothing.',
        // The original is attached rather than swallowed: when this fires, the useful detail is
        // whatever pnpm actually did — a missing binary, a workspace it could not resolve — and
        // this message alone would send the reader looking in the wrong place.
        { cause: error },
      );
  }
  return out;
}

/** `✕ unmet peer <name>` / `✕ missing peer <name>` — the two shapes pnpm reports. */
export function parse(output) {
  return [...output.matchAll(/✕\s+(unmet|missing) peer\s+(\S+)/gu)].map((m) => ({
    kind: m[1],
    peer: m[2],
  }));
}

export function run(output, declaredOverride = null) {
  const found = parse(output);
  const file = declaredOverride ?? JSON.parse(readFileSync(DECLARATIONS, 'utf8'));
  const exempt = new Map(file.unsatisfied.map((e) => [e.peer, e]));

  const matched = new Set();
  const gaps = [];
  for (const f of found) {
    if (exempt.has(f.peer)) matched.add(f.peer);
    else gaps.push(f);
  }
  // The other direction: an exemption that matches nothing is how a live gap hides behind a dead
  // one — the rule the token ledger and the source register already carry.
  const stale = [...exempt.keys()].filter((k) => !matched.has(k));
  return { found, gaps, stale, exempt: file.unsatisfied };
}

if (process.argv.includes('--prove')) prove();
else main();

function main() {
  console.log(`\n${BOLD}Irodora — peer dependencies${OFF}  ${DIM}via \`pnpm peers check\`${OFF}\n`);
  const { found, gaps, stale, exempt } = run(askPnpm());

  console.log(`  ${DIM}${String(found.length)} peer issue(s) reported by pnpm${OFF}`);
  if (exempt.length > 0) {
    console.log(
      `\n  ${DIM}accepted (${String(exempt.length)}), all of which must still apply:${OFF}`,
    );
    for (const e of exempt) {
      console.log(`    ${YELLOW}·${OFF} ${DIM}${e.peer} — ${e.cites}${OFF}`);
      console.log(`      ${DIM}${e.why}${OFF}`);
    }
  }

  const problems = [
    ...gaps.map(
      (g) =>
        `${g.kind} peer ${g.peer}. It may resolve today through a hoist or a near-enough ` +
        'version — that is resolution by luck, and the failure when it stops is a runtime one ' +
        'with no source change here to bisect to. Declare it, or record why the mismatch is ' +
        `accepted in ${'.harness/verification/unsatisfied-peers.json'}.`,
    ),
    ...stale.map(
      (peer) =>
        `the acceptance for "${peer}" matches nothing pnpm reports. Either it was resolved and ` +
        'the entry should go, or the package was removed and the entry protects nothing.',
    ),
  ];

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}\n`);
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}Every peer issue is declared.${OFF}\n`);
}

/** Watch it fail. Mutations are in memory against a fixed sample; nothing is written. */
function prove() {
  console.log(`\n${BOLD}Irodora — peer dependency proof${OFF}\n`);
  const problems = [];
  const say = (ok, name, detail) => {
    if (!ok) problems.push(name);
    console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${detail}${OFF}`);
  };

  const real = JSON.parse(readFileSync(DECLARATIONS, 'utf8'));
  const live = askPnpm();
  say(
    run(live, real).gaps.length === 0 && run(live, real).stale.length === 0,
    'baseline clean',
    '(asserted first, or a plant proves nothing)',
  );

  const SAMPLE = [
    'Issues with peer dependencies found',
    '',
    '✕ unmet peer some-package',
    '  Installed: 3.2.1',
    '  Wanted:',
    '    ^2.28.0:',
    '      heroui-native@1.0.8',
    '',
    '✕ missing peer another-package',
  ].join('\n');

  say(parse(SAMPLE).length === 2, 'both shapes are read', 'pnpm reports "unmet" and "missing"');
  say(
    parse(SAMPLE).some((p) => p.peer === 'some-package' && p.kind === 'unmet'),
    'a version mismatch is read as unmet',
    'the shape that found gesture-handler 3.2.1 against ^2.28.0',
  );
  say(
    run(SAMPLE, { unsatisfied: [] }).gaps.length === 2,
    'an undeclared issue is reported',
    'with no acceptances, both surface',
  );
  say(
    run(SAMPLE, {
      unsatisfied: [
        { peer: 'some-package', why: 'planted', cites: 'F-143' },
        { peer: 'another-package', why: 'planted', cites: 'F-143' },
      ],
    }).gaps.length === 0,
    'a declared issue is NOT reported',
    'the decoy — without it the check could be refusing everything',
  );
  say(
    run(SAMPLE, { unsatisfied: [{ peer: 'not-a-real-peer', why: 'planted', cites: 'F-143' }] })
      .stale.length === 1,
    'a dead acceptance is reported',
    'the entry covers nothing pnpm reports',
  );

  let threw = false;
  try {
    run('', real);
  } catch {
    threw = true;
  }
  say(!threw, 'empty output parses to zero issues', 'the "pnpm said nothing" case is not a crash');

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} case(s) did not discriminate.${OFF}\n`);
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}The peer check discriminates.${OFF}\n`);
}
