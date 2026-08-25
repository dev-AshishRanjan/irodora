/**
 * Prove the stale-rationale check discriminates (F-089).
 *
 * A check whose first run is green over 24 links has said nothing about whether it CAN fire.
 * Four plants, each restored, with the baseline asserted green either side.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const EFFECTS = '.harness/state/effects.json';
const original = readFileSync(EFFECTS, 'utf8');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Run gate 0; return its stale-rationale findings only. */
function findings() {
  try {
    execFileSync('node', ['scripts/verify-state.mjs'], { encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    return out
      .split('\n')
      .filter((l) => l.includes('asserts'))
      .join('\n');
  }
}

/** Rewrite one link's rationale, asserting the mutation actually applied. */
function withRationale(id, mutate) {
  const graph = JSON.parse(original);
  const link = graph.links.find((l) => l.id === id);
  if (link === undefined) throw new Error(`${id} not found`);
  const before = link.rationale;
  link.rationale = mutate(before);
  if (link.rationale === before) throw new Error(`MUTATION DID NOT APPLY on ${id}`);
  writeFileSync(EFFECTS, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
}

const CASES = [
  {
    name: 'a discharged claim on a WIRED guard is reported',
    // E-013's guard is gate:content, which is active.
    plant: () => withRationale('E-013', (r) => `${r} The guard is not yet blocking.`),
    expect: (f) => f.includes('E-013.rationale') && f.includes('not yet blocking'),
  },
  {
    name: 'the same claim with the marker passes',
    plant: () =>
      withRationale(
        'E-013',
        (r) => `${r} The guard is not yet blocking. past-state-ok: quoted from F-011.`,
      ),
    expect: (f) => !f.includes('E-013.rationale'),
  },
  {
    name: 'CONTROL — the honest guard:none link is never touched',
    // E-009 says its guard is none and must keep saying so. Plant the loudest phrase on it.
    plant: () => withRationale('E-009', (r) => `${r} The guard is not yet blocking.`),
    expect: (f) => !f.includes('E-009'),
  },
  {
    name: 'a second phrase fires as well, so the list is not one rule wearing four names',
    plant: () => withRationale('E-013', (r) => `${r} That check has yet to be built.`),
    expect: (f) => f.includes('E-013.rationale') && f.includes('yet to be built'),
  },
];

console.log(`\n${BOLD}Proof — stale-rationale${OFF}\n`);

const baseline = findings();
if (baseline !== '') {
  console.log(`  ${RED}✗ baseline: already reporting${OFF}\n${DIM}${baseline}${OFF}\n`);
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} baseline is green ${DIM}before the plants${OFF}`);

let caught = 0;
try {
  for (const c of CASES) {
    c.plant();
    const found = findings();
    const ok = c.expect(found);
    if (ok) caught += 1;
    console.log(`  ${ok ? `${GREEN}✓` : `${RED}✗`}${OFF} ${c.name}`);
    if (!ok) console.log(`${DIM}      got: ${found || '(nothing)'}${OFF}`);
  }
} finally {
  writeFileSync(EFFECTS, original, 'utf8');
}

if (findings() !== '') {
  console.log(`\n${RED}${BOLD}The graph was not restored.${OFF}\n`);
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} baseline is green ${DIM}after the plants were removed${OFF}`);

if (caught !== CASES.length) {
  console.log(
    `\n${RED}${BOLD}${String(CASES.length - caught)} of ${String(CASES.length)} case(s) went the wrong way.${OFF}\n`,
  );
  process.exit(1);
}
console.log(
  `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${String(caught)}/${String(CASES.length)} cases, baseline green either side.${OFF}\n`,
);
