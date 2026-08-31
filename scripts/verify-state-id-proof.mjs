#!/usr/bin/env node
/**
 * Irodora — proof that gate 0's id-uniqueness table can fail (F-106).
 *
 * The check it proves lives in gate 0, section 4b. F-102 built it for `effects.json` alone;
 * tracing that feature's effects found the same hole in `feature_list.json` and `gates.json`
 * within the hour — a second feature numbered F-102 and two gates sharing an id both left
 * gate 0 GREEN. So the check became a table, and a table has two failure modes a single
 * check does not: an entry it does not cover, and an entry it thinks it covers and does not.
 *
 * `verify-effect-id-proof.mjs` proves the effects row and is not repeated here. This script
 * proves the rest, and the two things that are true of the table rather than of any one row.
 *
 * ## Seven cases: five red, two green
 *
 *   1. A duplicate FEATURE id. The worst of them — `blockedBy` resolves by id and
 *      `next-feature` selects by id, so a collision makes a BLOCKER ambiguous rather than a
 *      citation.
 *   2. A duplicate GATE id.
 *   3. A duplicate DISCHARGED-CLAIM name. That space is keyed on `name`, not `id`, so this
 *      is the case that proves the table's `key` field is honoured rather than assumed.
 *   4. FAILS CLOSED — the array is renamed. A check that skips a space it cannot locate
 *      reads exactly like a check that found nothing wrong, and a rename would disable it in
 *      silence. This is `a-gate-that-errors-is-failing-open` aimed at the table itself.
 *   5. FAILS CLOSED — a declared file is absent.
 *
 *   6. CONTROL — an entry added with a DERIVED fresh id stays GREEN. Derived, never a
 *      literal: F-102's equivalent control hard-coded an id, the repository allocated it
 *      hours later, and the control began planting a duplicate while asserting green.
 *   7. CONTROL — a file reformatted with no content change stays GREEN.
 *
 * Without the controls, a check that failed on any edit at all would pass every red case and
 * prove nothing. Cases 4 and 5 are the ones worth having: they are the difference between a
 * table that covers seven spaces and a table that merely lists them.
 *
 * Every write starts from the captured original, so cases never compound. All four files are
 * restored in a `finally` and the restore is BYTE-COMPARED. If this script is interrupted,
 * `git checkout .harness` is the recovery.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const FEATURES = '.harness/state/feature_list.json';
const GATES = '.harness/verification/gates.json';
const CLAIMS = '.harness/verification/discharged-claims.json';
const ADVISORIES = '.harness/verification/advisories.json';

const TOUCHED = [FEATURES, GATES, CLAIMS, ADVISORIES];
const originals = new Map(TOUCHED.map((p) => [p, readFileSync(p, 'utf8')]));

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Run gate 0 and return the findings raised by section 4b only.
 *
 * Cases 4 and 5 deliberately break a file several other checks read, so filtering matters
 * more here than usual: the schema, wip, workflow and traceability checks all go red on a
 * renamed `features` array, and none of that is evidence about the table. These four phrases
 * appear nowhere else in gate 0.
 */
const MARKERS = [
  'is used by two different',
  'is declared as an id space and is not there',
  'so its ids are unchecked',
  'has an entry with no',
];

function findings() {
  try {
    execFileSync('node', ['scripts/verify-state.mjs'], { encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    return out
      .split('\n')
      .filter((l) => MARKERS.some((m) => l.includes(m)))
      .join('\n');
  }
}

/** Rewrite one file through a mutator, asserting the mutation actually changed something. */
function withFile(path, mutate) {
  const before = originals.get(path);
  if (before === undefined) throw new Error(`${path} was not captured`);
  const data = JSON.parse(before);
  mutate(data);
  const after = `${JSON.stringify(data, null, 2)}\n`;
  if (after === before) throw new Error(`MUTATION DID NOT APPLY on ${path}`);
  writeFileSync(path, after, 'utf8');
}

/** The entry with this key value, or a loud failure — a plant against nothing proves nothing. */
function entry(list, key, value) {
  const found = list.find((e) => e[key] === value);
  if (found === undefined) throw new Error(`${key}=${value} not found — this proof is stale`);
  return found;
}

const CASES = [
  {
    name: 'a duplicate FEATURE id — the one that makes a BLOCKER ambiguous',
    plant: () =>
      withFile(FEATURES, (d) => {
        const clone = structuredClone(entry(d.features, 'id', 'F-103'));
        clone.id = 'F-102';
        d.features.push(clone);
      }),
    expect: (f) => f.includes('F-102 is used by two different features'),
  },
  {
    name: 'a duplicate GATE id',
    plant: () =>
      withFile(GATES, (d) => {
        const clone = structuredClone(d.gates[1]);
        clone.id = d.gates[0].id;
        d.gates.push(clone);
      }),
    expect: (f) => f.includes('is used by two different gates'),
  },
  {
    name: 'a duplicate DISCHARGED-CLAIM name — the table honours `key`, not just `id`',
    plant: () =>
      withFile(CLAIMS, (d) => {
        d.claims.push(structuredClone(d.claims[0]));
      }),
    expect: (f) => f.includes('is used by two different discharged claims'),
  },
  {
    name: 'FAILS CLOSED — the array is renamed, and the space is not silently skipped',
    plant: () =>
      withFile(FEATURES, (d) => {
        d.featureList = d.features;
        delete d.features;
      }),
    expect: (f) => f.includes('so its ids are unchecked'),
  },
  {
    name: 'FAILS CLOSED — a declared file is absent',
    plant: () => rmSync(ADVISORIES),
    expect: (f) => f.includes('is declared as an id space and is not there'),
  },
  {
    name: 'CONTROL — an entry with a DERIVED fresh id stays green',
    plant: () =>
      withFile(FEATURES, (d) => {
        const used = new Set(d.features.map((e) => e.id));
        const fresh = Array.from(
          { length: 999 },
          (_, i) => `F-${String(i + 1).padStart(3, '0')}`,
        ).find((id) => !used.has(id));
        if (fresh === undefined) throw new Error('no unallocated feature id remains');
        const clone = structuredClone(entry(d.features, 'id', 'F-103'));
        clone.id = fresh;
        d.features.push(clone);
      }),
    expect: (f) => f === '',
  },
  {
    name: 'CONTROL — a file reformatted with no content change stays green',
    plant: () => writeFileSync(GATES, JSON.stringify(JSON.parse(originals.get(GATES))), 'utf8'),
    expect: (f) => f === '',
  },
];

console.log(`\n${BOLD}Proof — id uniqueness across .harness${OFF}\n`);

const baseline = findings();
if (baseline !== '') {
  console.log(`  ${RED}✗ baseline: already reporting${OFF}\n${DIM}${baseline}${OFF}\n`);
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} baseline is green ${DIM}before the plants${OFF}`);

let correct = 0;
try {
  for (const c of CASES) {
    c.plant();
    const found = findings();
    const ok = c.expect(found);
    if (ok) correct += 1;
    console.log(`  ${ok ? `${GREEN}✓` : `${RED}✗`}${OFF} ${c.name}`);
    if (!ok) console.log(`${DIM}      got: ${found || '(nothing)'}${OFF}`);
    // Restore between cases so a plant never compounds with the next one.
    for (const p of TOUCHED) writeFileSync(p, originals.get(p), 'utf8');
  }
} finally {
  for (const p of TOUCHED) writeFileSync(p, originals.get(p), 'utf8');
}

/*
 * BYTE-COMPARED, not re-run. Re-running gate 0 would report green over a file a plant had
 * reformatted, leaving the tree dirty and calling it success.
 */
const notRestored = TOUCHED.filter(
  (p) => !existsSync(p) || readFileSync(p, 'utf8') !== originals.get(p),
);
if (notRestored.length > 0) {
  console.log(
    `\n${RED}${BOLD}Not restored byte-for-byte: ${notRestored.join(', ')}${OFF}\n` +
      `${DIM}Run: git checkout .harness${OFF}\n`,
  );
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} all four files byte-identical ${DIM}after the plants${OFF}`);

if (correct !== CASES.length) {
  console.log(
    `\n${RED}${BOLD}${String(CASES.length - correct)} of ${String(CASES.length)} case(s) went the wrong way.${OFF}\n`,
  );
  process.exit(1);
}
console.log(
  `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${String(correct)}/${String(CASES.length)} cases ` +
    `(5 red, 2 green controls), all files restored byte-for-byte.${OFF}\n`,
);
