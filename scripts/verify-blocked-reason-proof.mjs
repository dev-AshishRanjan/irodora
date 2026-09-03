/**
 * Prove that gate 0 refuses a `blocked` feature with no checkable reason.
 *
 * F-137 exists because the old blockers check fired in one direction only, and F-126 sat at
 * `blocked` with a `blockedBy` naming a feature that was already `done` — while its own note
 * said the real blocker was something else. Nothing noticed, because nothing looked.
 *
 * A check written for that is a claim about REFUSALS, and a refusal nobody has watched is a
 * hope. So each class is mutated and required to be caught, and the decoys run in **both**
 * directions: a check that refuses everything would pass every negative case here and be worse
 * than the hole it filled.
 *
 * ## The real feature list, mutated in memory
 *
 * The subject is `.harness/state/feature_list.json` as committed — not a fixture, because a
 * fixture proves the rule against a document nobody has to keep true. Nothing is written to
 * disk: the checks are re-implemented against a parsed copy, which is the same arrangement
 * `e2e-flows-proof.mjs` uses and means there is no plant an interrupted run can leave behind
 * [[a-plant-that-outlives-its-run-is-a-disabled-gate]].
 *
 * ## And the REAL gate is watched refusing, not just a copy of its rule
 *
 * `verify-state.mjs` is one long script that reads files and exits; it exports nothing this
 * could import, so the predicate below is a SECOND copy of the rule. A copy is not the gate —
 * delete the check from `verify-state.mjs` and every case against the copy stays green, which
 * is the same defect this feature exists to close, one level up
 * [[a-fix-made-in-review-is-the-one-most-likely-to-ship-untested]].
 *
 * So the last two cases spawn the real script with `--features`, pointed at a mutated list
 * written to the system temp directory. Read-only: nothing is planted at the real path, so
 * there is no restore to miss and no interrupted run that leaves a broken state file behind
 * (which is what F-134 is the account of).
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = join(ROOT, '.harness', 'state', 'feature_list.json');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** The rule, as gate 0 states it. Returns the problems it finds. */
function problems(features) {
  const byId = new Map(features.map((f) => [f.id, f]));
  const found = [];

  for (const f of features) {
    for (const owed of f.blockedByAttestation ?? []) {
      const owes = byId.get(owed);
      if (!owes) found.push(`${f.id} waits on an attestation from ${owed}, which does not exist`);
      else if (!(owes.attested ?? []).some((a) => a.status === 'outstanding'))
        found.push(`${f.id} waits on an attestation from ${owed}, which owes none`);
    }

    if (f.status === 'blocked') {
      const unmet = (f.blockedBy ?? []).filter((id) => byId.get(id)?.status !== 'done');
      const reasons =
        unmet.length + (f.openQuestions ?? []).length + (f.blockedByAttestation ?? []).length;
      if (reasons === 0) found.push(`${f.id} is blocked and no field says why`);
    }
  }
  return found;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

const doc = JSON.parse(readFileSync(STATE, 'utf8'));

console.log(`\n${BOLD}Irodora — a blocked feature has to say why${OFF}\n`);

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ${GREEN}✓${OFF} ${label}`);
  else {
    failures += 1;
    console.log(`  ${RED}✗${OFF} ${label}`);
    if (detail !== undefined) console.log(`    ${detail}`);
  }
};

// 1. THE SUBJECT. Everything below is meaningless if the real list does not already pass.
const clean = problems(doc.features);
check(
  'the committed feature list has no unexplained blocked feature',
  clean.length === 0,
  clean.join('; '),
);
if (clean.length > 0) {
  console.log(
    `\n  ${RED}The unmutated list already fails. No mutation below means anything.${OFF}\n`,
  );
  process.exitCode = 1;
} else {
  const refuses = (label, mutate, expect) => {
    const features = clone(doc.features);
    mutate(features, new Map(features.map((f) => [f.id, f])));
    const found = problems(features);
    check(
      label,
      found.some((problem) => problem.includes(expect)),
      found.length === 0 ? 'ACCEPTED ANYWAY — the mutation was not caught' : found.join('; '),
    );
  };

  const allows = (label, mutate) => {
    const features = clone(doc.features);
    mutate(features, new Map(features.map((f) => [f.id, f])));
    const found = problems(features);
    check(label, found.length === 0, found.join('; '));
  };

  // A blocked feature stripped of every reason. This is F-126's exact shape.
  refuses(
    'a blocked feature with no reason in any field',
    (features, byId) => {
      const f = byId.get('F-126');
      f.blockedBy = [];
      f.openQuestions = [];
      delete f.blockedByAttestation;
    },
    'is blocked and no field says why',
  );

  // The self-cleaning half: the debt was paid and the reference did not notice.
  refuses(
    'a blockedByAttestation pointing at a feature that owes none',
    (features, byId) => {
      for (const a of byId.get('F-040').attested ?? []) a.status = 'verified';
    },
    'which owes none',
  );

  refuses(
    'a blockedByAttestation pointing at a feature that does not exist',
    (features, byId) => {
      byId.get('F-126').blockedByAttestation = ['F-999'];
    },
    'which does not exist',
  );

  // A blocked feature whose ONLY reason was a blocker that has since been finished — the
  // original F-126 defect, stated as the transition that produced it.
  refuses(
    'a blocked feature whose last unfinished blocker just became done',
    (features, byId) => {
      const f = byId.get('F-126');
      f.blockedBy = ['F-054'];
      f.openQuestions = [];
      delete f.blockedByAttestation;
    },
    'is blocked and no field says why',
  );

  /*
   * AND THE DECOYS, IN THE OTHER DIRECTION. Every case above would also pass against a check
   * that refused unconditionally, which would be a worse defect than the hole it filled. These
   * three are the shapes that MUST still be accepted.
   */
  // No mutation at all: the committed list must be accepted, and F-081 is why the rule needs
  // its openQuestions branch — it is blocked on OQ-6 with every blocker done.
  allows(
    'the real list, untouched — an open question is a reason (F-081 on OQ-6)',
    (features) => features,
  );

  allows('a blocked feature whose blocker is genuinely unfinished', (features, byId) => {
    const f = byId.get('F-126');
    f.blockedBy = ['F-135'];
    f.openQuestions = [];
    delete f.blockedByAttestation;
  });

  allows(
    'a NON-blocked feature with no reason at all — the rule is about `blocked`',
    (features, byId) => {
      const f = byId.get('F-126');
      f.status = 'backlog';
      f.blockedBy = [];
      f.openQuestions = [];
      delete f.blockedByAttestation;
    },
  );
}

/*
 * THE REAL GATE, WATCHED. Everything above tests a copy of the rule; these two test the script
 * that actually runs in CI. `--features` is read-only and the mutated list lives in the system
 * temp directory, so nothing is planted where a failed restore could matter.
 */
const gate = (path) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-state.mjs'), '--features', path], {
    cwd: ROOT,
    encoding: 'utf8',
  });

const scratch = mkdtempSync(join(tmpdir(), 'irodora-blocked-reason-'));
try {
  const cleanPath = join(scratch, 'clean.json');
  writeFileSync(cleanPath, JSON.stringify(doc, null, 2));
  const passing = gate(cleanPath);
  check(
    'the REAL gate passes the committed list — the decoy for the case below',
    passing.status === 0,
    `exited ${String(passing.status)}: ${(passing.stdout ?? '')
      .split('\n')
      .filter((l) => l.includes('✗'))
      .join(' | ')}`,
  );

  const broken = clone(doc);
  const f126 = broken.features.find((f) => f.id === 'F-126');
  f126.blockedBy = [];
  f126.openQuestions = [];
  delete f126.blockedByAttestation;

  const brokenPath = join(scratch, 'broken.json');
  writeFileSync(brokenPath, JSON.stringify(broken, null, 2));
  const refused = gate(brokenPath);
  check(
    'the REAL gate REFUSES a blocked feature with no reason — the check is in the gate, not only here',
    refused.status !== 0 && (refused.stdout ?? '').includes('is blocked and no field says why'),
    `exited ${String(refused.status)} without the expected failure`,
  );
  /*
   * The other two checks, through the real gate as well. The first draft ran only the case
   * above, and mutating the gate found these two SURVIVED — the copy of the rule at the top of
   * this file caught them and the gate's own version was unguarded, which is the exact shape
   * this file exists to refuse.
   */
  const throughGate = (label, mutate, expected) => {
    const mutated = clone(doc);
    mutate(new Map(mutated.features.map((f) => [f.id, f])));
    const path = join(scratch, `${label.replaceAll(/[^a-z]+/gu, '-')}.json`);
    writeFileSync(path, JSON.stringify(mutated, null, 2));
    const result = gate(path);
    check(
      label,
      result.status !== 0 && (result.stdout ?? '').includes(expected),
      `exited ${String(result.status)} without "${expected}"`,
    );
  };

  throughGate(
    'the REAL gate refuses an attestation reference whose debt was paid',
    (byId) => {
      for (const a of byId.get('F-040').attested ?? []) a.status = 'verified';
    },
    'which owes none',
  );

  throughGate(
    'the REAL gate refuses an attestation reference to a feature that does not exist',
    (byId) => {
      byId.get('F-126').blockedByAttestation = ['F-999'];
    },
    'which does not exist',
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}Each refusal was watched refusing, and the accepted shapes were watched being accepted.${OFF}\n`
    : `\n${RED}${BOLD}${String(failures)} case(s) did not behave as claimed.${OFF}\n`,
);
if (failures > 0) process.exitCode = 1;
