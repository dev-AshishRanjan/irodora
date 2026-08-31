#!/usr/bin/env node
/**
 * Irodora — proof that gate 0's duplicate effect-id check can fail (F-102).
 *
 * The check it proves lives in gate 0, section 4. It was watched failing against the REAL
 * defect — `E-032` held by both F-098's `pnpm-workspace.yaml` → lockfile link and F-028's
 * `score.ts#hueBias` link, allocated twenty-four minutes apart on 2026-08-26 — and that is
 * the strongest evidence a check can have. It is also evidence that expired the moment the
 * renumber landed: the repository now contains no duplicate, so from here on the only thing
 * attesting the check works would be a paragraph in `progress.md`, and a paragraph is not a
 * check (`prose-in-a-state-file-rots-and-no-schema-can-see-it`).
 *
 * So case 1 RECONSTRUCTS the historical collision exactly. It is the regression test for the
 * defect this feature existed to fix, and it will still be here when nobody remembers it.
 *
 * ## Why four cases and not one
 *
 * A single red case cannot tell a working check from one that fails on everything, and the
 * two decoys here are aimed at specific WRONG implementations rather than at the margin:
 *
 *   2. A different pair collides — so the check is not hard-coded to the id it was born on.
 *
 *   3. Two links share an id AND the same `from.ref`. This is the case a plausible wrong
 *      implementation misses: deduplicating on the (id, from) pair, or on `from.ref` alone,
 *      looks correct against cases 1 and 2 and reports nothing here. The graph's primary key
 *      is the id by itself.
 *
 *   4. CONTROL, and it MUST STAY GREEN — a link added with a FRESH id. Without it, a check
 *      that failed on any added link would pass this proof completely.
 *
 * Every write starts from the original text, so cases never compound. The graph is restored
 * in a `finally` and the restore is BYTE-COMPARED, not merely re-run: a restore that produced
 * a semantically equal file with different formatting would leave the tree dirty and be
 * reported as success. If this script is interrupted, `git checkout .harness/state/effects.json`
 * is the recovery.
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

/**
 * Run gate 0 and return its duplicate-id findings only.
 *
 * Filtering on the sentence is deliberate: no other check in gate 0 emits it, so a plant
 * that happens to upset an unrelated check cannot be mistaken for a catch — and the control
 * is not failed by a finding that has nothing to do with it.
 */
function findings() {
  try {
    execFileSync('node', ['scripts/verify-state.mjs'], { encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    return out
      .split('\n')
      .filter((l) => l.includes('is used by two different links'))
      .join('\n');
  }
}

/** Rewrite the graph through a mutator, asserting the mutation actually changed something. */
function withGraph(mutate) {
  const graph = JSON.parse(original);
  mutate(graph);
  const after = `${JSON.stringify(graph, null, 2)}\n`;
  if (after === original) throw new Error('MUTATION DID NOT APPLY');
  writeFileSync(EFFECTS, after, 'utf8');
}

/** The link with this id, or a loud failure — a plant against a missing link proves nothing. */
function link(graph, id) {
  const found = graph.links.find((l) => l.id === id);
  if (found === undefined) throw new Error(`${id} not found — this proof is out of date`);
  return found;
}

const CASES = [
  {
    name: 'THE HISTORICAL COLLISION — E-038 takes E-032 back, as it was until F-102',
    plant: () =>
      withGraph((g) => {
        link(g, 'E-038').id = 'E-032';
      }),
    expect: (f) =>
      f.includes('E-032 is used by two different links') &&
      f.includes('pnpm-workspace.yaml') &&
      f.includes('packages/recommendation/src/score.ts#hueBias'),
  },
  {
    name: 'a DIFFERENT pair collides, so the check is not hard-coded to E-032',
    plant: () =>
      withGraph((g) => {
        link(g, 'E-002').id = 'E-001';
      }),
    expect: (f) => f.includes('E-001 is used by two different links') && !f.includes('E-032'),
  },
  {
    name: 'two links share an id AND the same from.ref — the key is the id alone',
    /*
     * The decoy for the wrong implementation. Deduplicating on `from.ref`, or on the
     * (id, from) pair, passes cases 1 and 2 and reports nothing at all here.
     */
    plant: () =>
      withGraph((g) => {
        g.links.push(structuredClone(link(g, 'E-013')));
      }),
    expect: (f) => f.includes('E-013 is used by two different links'),
  },
  {
    name: 'CONTROL — a link added with a FRESH id stays green',
    /*
     * THE FRESH ID IS DERIVED, NOT WRITTEN DOWN, and this case is why.
     *
     * It was first written with a literal `E-039` and passed. Within the same session F-102
     * recorded E-039 for the id-uniqueness property itself, and the control began planting a
     * DUPLICATE while asserting green — reporting the check as broken when the check was the
     * only thing working. That is `a-decoy-written-against-old-values-quietly-stops-
     * discriminating`, and it took under an hour rather than a release.
     *
     * A control that hard-codes a value the repository is free to allocate has a shelf life.
     * This one asks the graph.
     */
    plant: () =>
      withGraph((g) => {
        const used = new Set(g.links.map((l) => l.id));
        const fresh = Array.from(
          { length: 999 },
          (_, i) => `E-${String(i + 1).padStart(3, '0')}`,
        ).find((id) => !used.has(id));
        if (fresh === undefined) throw new Error('no unallocated effect id remains');
        const clone = structuredClone(link(g, 'E-013'));
        clone.id = fresh;
        g.links.push(clone);
      }),
    expect: (f) => f === '',
  },
];

console.log(`\n${BOLD}Proof — duplicate effect ids${OFF}\n`);

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
  }
} finally {
  writeFileSync(EFFECTS, original, 'utf8');
}

/*
 * BYTE-COMPARED, not re-run. Re-running gate 0 would report green over a file that had been
 * reformatted or reordered by a plant, leaving the tree dirty and calling it success.
 */
if (readFileSync(EFFECTS, 'utf8') !== original) {
  console.log(
    `\n${RED}${BOLD}The graph was not restored byte-for-byte.${OFF}\n` +
      `${DIM}Run: git checkout ${EFFECTS}${OFF}\n`,
  );
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} the graph is byte-identical ${DIM}after the plants${OFF}`);

if (correct !== CASES.length) {
  console.log(
    `\n${RED}${BOLD}${String(CASES.length - correct)} of ${String(CASES.length)} case(s) went the wrong way.${OFF}\n`,
  );
  process.exit(1);
}
console.log(
  `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${String(correct)}/${String(CASES.length)} cases ` +
    `(3 red, 1 green control), graph restored byte-for-byte.${OFF}\n`,
);
