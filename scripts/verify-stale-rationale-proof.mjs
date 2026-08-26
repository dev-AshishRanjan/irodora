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
  withLink(id, (link) => {
    const before = link.rationale;
    link.rationale = mutate(before);
    if (link.rationale === before) throw new Error(`MUTATION DID NOT APPLY on ${id}`);
  });
}

/**
 * Rewrite one link however the caller likes, asserting the mutation actually applied.
 *
 * Generalised in F-104 so the control below can set `guard` as well as `rationale` — see the
 * comment on that case. Every write still starts from `original`, so cases never compound.
 */
function withLink(id, mutate) {
  const graph = JSON.parse(original);
  const link = graph.links.find((l) => l.id === id);
  if (link === undefined) throw new Error(`${id} not found`);
  const before = JSON.stringify(link);
  mutate(link);
  if (JSON.stringify(link) === before) throw new Error(`MUTATION DID NOT APPLY on ${id}`);
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
    /*
     * THE CONTROL BUILDS ITS OWN SUBJECT, and F-104 is why.
     *
     * It used to name E-009, with the comment *"E-009 says its guard is none and must keep
     * saying so"*. That was true when it was written and stopped being true when **F-029 wired
     * E-009's guard to gate:content** — which is a success, not a regression. The control then
     * pointed at a link with a real guard, so the checker correctly reported the planted phrase
     * and the control expected silence. CI went red on a proof, for a reason that had nothing
     * to do with the proof.
     *
     * Re-pointing it at another guardless link would only have moved the fuse: F-099 and F-101
     * resolved the last two, and **the graph now contains none at all** — which is also a
     * success, and would have broken it a third time.
     *
     * So the control sets `guard: 'none'` on the link it plants into. It no longer depends on a
     * mutable property of production data holding still; it constructs the condition it is
     * controlling for. The subject is E-013 because the case above already proves this checker
     * DOES fire on E-013 when the guard is wired — so the two cases differ in exactly one
     * variable, which is what makes this a control rather than a second assertion.
     */
    plant: () =>
      withLink('E-013', (link) => {
        link.guard = 'none';
        link.rationale = `${link.rationale} The guard is not yet blocking.`;
      }),
    expect: (f) => !f.includes('E-013'),
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
