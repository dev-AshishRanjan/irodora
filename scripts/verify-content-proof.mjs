/**
 * Gate 11 — the discrimination proof.
 *
 * A gate nobody has watched fail is not a gate. Gate 11 is worse-placed than most: F-011 ships
 * it and F-012 ships the entries, so on the day it activates `content/colors/` is empty and it
 * would go green over nothing at all.
 *
 * This mutates the **valid fixture corpus** — one that genuinely passes before each mutation —
 * and asserts gate 11 exits non-zero *and names the right thing*. The baseline is asserted
 * green **before and after every mutation** [[a-decoy-that-is-not-broken-proves-nothing]], so a
 * mutation cannot appear to work because the corpus was already broken.
 *
 * One case must stay **GREEN**: reordering and reformatting an entry. A proof where every
 * mutation is red cannot tell a working gate from one that fails on everything.
 *
 * ```bash
 * node scripts/verify-content-proof.mjs
 * ```
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './corpus-io.mjs';
import { ciError } from './annotate.mjs';

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

const GATE = join(ROOT, 'scripts', 'verify-content.mjs');
const FIXTURES = join(ROOT, 'packages', 'corpus', 'test', 'fixtures');
const VALID = join(FIXTURES, 'valid');
const BACKUP = join(FIXTURES, '.valid-backup');
const ENTRY_A = join(VALID, 'colors', 'fixture-a.json');
const PALETTE = join(VALID, 'palettes', 'fixture-quiet.json');
const EDITORS = join(VALID, 'editors.json');

/** Run gate 11. Note the exit status is read directly — never through a pipe. */
function runGate() {
  const result = spawnSync(process.execPath, [GATE], { encoding: 'utf8' });
  return { code: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
}

function readEntry() {
  return JSON.parse(readFileSync(ENTRY_A, 'utf8'));
}

function writeEntry(entry) {
  writeFileSync(ENTRY_A, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
}

function editEntry(change) {
  return () => {
    const entry = readEntry();
    change(entry);
    writeEntry(entry);
  };
}

// --- the published bundle ---------------------------------------------------------------

const BUNDLE = join(VALID, 'versions', '2026.08.1.json');
const LEDGER = join(VALID, 'versions', 'index.json');
const MATRICES = join(ROOT, 'packages', 'color-spaces', 'src', 'matrices.ts');

const readBundle = () => JSON.parse(readFileSync(BUNDLE, 'utf8'));
const writeBundle = (b) => writeFileSync(BUNDLE, `${JSON.stringify(b)}\n`, 'utf8');
const readLedger = () => JSON.parse(readFileSync(LEDGER, 'utf8'));
const writeLedger = (l) => writeFileSync(LEDGER, `${JSON.stringify(l, null, 2)}\n`, 'utf8');

/** Rebuild the two packages the gate imports. Used by the engine-perturbation case. */
function rebuild() {
  for (const pkg of ['@irodora/color-spaces', '@irodora/corpus']) {
    // One command string rather than an args array: with `shell: true` Node concatenates
    // rather than escapes, and passing args that way is deprecated for exactly that reason.
    // The shell is needed at all because `pnpm` is a `.cmd` shim on Windows.
    const r = spawnSync(`pnpm --filter ${pkg} build`, { encoding: 'utf8', shell: true });
    if (r.status !== 0) throw new Error(`rebuild of ${pkg} failed:\n${r.stdout}${r.stderr}`);
  }
}

/**
 * The mutations.
 *
 * `expect: 'red'` — the gate must exit non-zero AND its output must match `matching`. Asserting
 * only the exit code would let a mutation "pass" by breaking something unrelated, which is how
 * the duplicate-slug FIXTURE quietly stopped discriminating twice while this was being built.
 */
const CASES = [
  {
    name: 'a required provenance field deleted',
    expect: 'red',
    matching: /provenance\.derivation/u,
    apply: editEntry((e) => {
      delete e.provenance.derivation;
    }),
  },
  {
    name: 'the source licence deleted (NFR-20)',
    expect: 'red',
    matching: /provenance\.sourceLicence/u,
    apply: editEntry((e) => {
      delete e.provenance.sourceLicence;
    }),
  },
  {
    name: 'a published entry with no reviewer',
    expect: 'red',
    matching: /without a recorded reviewer/u,
    apply: editEntry((e) => {
      e.provenance.verifiedBy = null;
    }),
  },
  {
    name: 'author and reviewer the same id',
    expect: 'red',
    matching: /author and reviewer are the same identity/u,
    apply: editEntry((e) => {
      e.provenance.verifiedBy = e.provenance.authoredBy;
    }),
  },
  {
    name: 'author and reviewer the same PERSON under two ids',
    expect: 'red',
    matching: /different ids for the same person/u,
    apply: editEntry((e) => {
      e.provenance.verifiedBy = 'ed-003';
    }),
  },
  {
    name: 'our own curation marked historical (criterion 2)',
    expect: 'red',
    matching: /OUR OWN CURATION and cannot be classified "historical"/u,
    apply: editEntry((e) => {
      e.classification = 'historical';
    }),
  },
  {
    name: 'a historical claim with no dated source',
    expect: 'red',
    matching: /DATED primary source/u,
    apply: editEntry((e) => {
      e.classification = 'historical';
      e.provenance.sourceType = 'publication';
    }),
  },
  {
    name: 'a derived value typed into a source entry',
    expect: 'red',
    matching: /is a DERIVED value and cannot be authored/u,
    apply: editEntry((e) => {
      e.color.hex = '#526A6B';
    }),
  },
  {
    name: 'the palette anchor removed',
    expect: 'red',
    matching: /without an anchor is a colour list/u,
    apply: () => {
      const p = JSON.parse(readFileSync(PALETTE, 'utf8'));
      p.colors[0].role = 'accent';
      writeFileSync(PALETTE, `${JSON.stringify(p, null, 2)}\n`, 'utf8');
    },
  },
  {
    name: 'a relation pointing at a missing slug',
    expect: 'red',
    matching: /is not a colour in this corpus/u,
    apply: editEntry((e) => {
      e.relations.related = ['fixture-gone'];
    }),
  },
  {
    name: 'a duplicate slug across two files',
    expect: 'red',
    matching: /is already used by/u,
    apply: () => {
      const e = readEntry();
      e.slug = 'fixture-b';
      writeEntry(e);
    },
  },
  {
    name: 'a source that is not in the register (licensing §5)',
    expect: 'red',
    matching: /is not in the source register/u,
    apply: editEntry((e) => {
      e.provenance.sourceId = 'FIX-ED-999';
    }),
  },
  {
    name: 'a source id whose register row names a different source',
    expect: 'red',
    matching: /would display one provenance and be licensed under another/u,
    apply: editEntry((e) => {
      e.provenance.source = 'Something else entirely';
    }),
  },
  {
    name: 'a null with no stated reason (FR-21)',
    expect: 'red',
    matching: /is null with no reason/u,
    apply: editEntry((e) => {
      delete e.unknowns['taxonomy.material'];
    }),
  },
  {
    name: 'a reason whose field is not null (FR-21, the stale half)',
    expect: 'red',
    matching: /but that field is not null/u,
    apply: editEntry((e) => {
      e.unknowns['taxonomy.family'] = 'we never looked';
    }),
  },
  {
    name: 'an unknown reviewer id',
    expect: 'red',
    matching: /is not in content\/editors\.json/u,
    apply: editEntry((e) => {
      e.provenance.verifiedBy = 'ed-404';
    }),
  },
  {
    name: 'the roster deleted — the identity check cannot run',
    expect: 'red',
    matching: /cannot run|missing/u,
    apply: () => {
      rmSync(EDITORS);
    },
  },
  {
    name: 'a fixture slug placed under content/',
    expect: 'red',
    matching: /fixture slug and must not appear under content/u,
    apply: () => {
      copyFileSync(ENTRY_A, join(ROOT, 'content', 'colors', 'fixture-a.json'));
    },
    cleanup: () => {
      rmSync(join(ROOT, 'content', 'colors', 'fixture-a.json'), { force: true });
    },
  },
  // --- the published bundle -------------------------------------------------------------
  //
  // These five exist because the evaluation found gate 11's entire bundle block UNREACHABLE:
  // there are no real bundles until F-012, no fixture carried one, and not one proof case
  // touched a checksum. `gates.json` claimed the gate enforced checksums and the E-001
  // destination re-check, and the code that did so never ran. Correct code that never executes
  // is indistinguishable from absent code.
  {
    name: 'a published entry edited in the bundle',
    expect: 'red',
    matching: /checksum mismatch.*SEV1/su,
    apply: () => {
      const b = readBundle();
      b.entries[0].entry.name.en = 'Tampered Slate';
      writeBundle(b);
    },
  },
  {
    name: 'a derived value edited in the bundle',
    expect: 'red',
    matching: /checksum mismatch/u,
    apply: () => {
      // Proves the digest covers the DERIVED block, not only the authored record — the hole a
      // test found mid-build, where a tampered hex loaded clean and would have been served.
      const b = readBundle();
      b.entries[0].derived.hex = '#000000';
      writeBundle(b);
    },
  },
  {
    name: 'the ledger checksum altered',
    expect: 'red',
    matching: /root checksum mismatch|checksum mismatch/u,
    apply: () => {
      const l = readLedger();
      l[0].checksum = 'deadbeef';
      writeLedger(l);
    },
  },
  {
    name: 'the ledger row removed — a bundle with nothing vouching for it',
    expect: 'red',
    matching: /has no row in the ledger/u,
    apply: () => {
      writeLedger([]);
    },
  },
  {
    name: 'an entry removed from the bundle — every survivor still hashes correctly',
    expect: 'red',
    matching: /root checksum mismatch.*the SET that changed/su,
    apply: () => {
      // The case per-entry digests CANNOT catch, which is why there are two levels.
      const b = readBundle();
      b.entries = b.entries.slice(0, 1);
      writeBundle(b);
    },
  },
  {
    // THE E-001 DESTINATION CHECK, as its effect-link rationale describes it. This case did
    // not exist when that rationale was written — the claim was false, and the evaluation
    // caught it by running exactly this experiment and watching the gate stay green.
    //
    // It is the slowest case by far (two package rebuilds), and it is the only one that
    // exercises what E-001 is actually about: the engine moving underneath stored values.
    name: 'an OKLab matrix element perturbed, engine rebuilt (E-001 destination)',
    expect: 'red',
    matching: /the CURRENT engine derives.*publish a NEW corpus version/su,
    apply: () => {
      const src = readFileSync(MATRICES, 'utf8');
      const m = /(export const XYZ_TO_LMS_OKLAB[^=]*=\s*\[\s*)(-?[\d.]+)/u.exec(src);
      if (m === null) throw new Error('XYZ_TO_LMS_OKLAB first element not found in matrices.ts');
      // +0.01 on the first coefficient: far above any tolerance, far below anything that would
      // make a conversion throw. The point is a plausible edit, not a broken engine.
      const perturbed = (Number(m[2]) + 0.01).toString();
      writeFileSync(MATRICES, src.replace(m[0], `${m[1]}${perturbed}`), 'utf8');
      rebuild();
    },
    cleanup: () => {
      // Restore happens through git, then rebuild so later cases see the real engine again.
      spawnSync('git', ['checkout', '--', MATRICES], { encoding: 'utf8' });
      rebuild();
    },
  },
  {
    // The one that must stay GREEN. A proof where every mutation is red cannot distinguish a
    // working gate from a gate that fails on everything.
    name: 'an entry reordered and reformatted — must stay GREEN',
    expect: 'green',
    apply: () => {
      const e = readEntry();
      const reversed = Object.fromEntries(Object.entries(e).reverse());
      writeFileSync(ENTRY_A, JSON.stringify(reversed, null, 8), 'utf8');
    },
  },
];

// --- run -------------------------------------------------------------------------------

console.log(`\n${BOLD}Irodora — gate 11 discrimination proof${OFF}\n`);

rmSync(BACKUP, { recursive: true, force: true });
cpSync(VALID, BACKUP, { recursive: true });

const restore = () => {
  rmSync(VALID, { recursive: true, force: true });
  cpSync(BACKUP, VALID, { recursive: true });
};

const problems = [];

try {
  const first = runGate();
  if (first.code !== 0) {
    console.log(
      `${RED}${BOLD}The baseline is not green.${OFF} Nothing below would prove anything.\n`,
    );
    console.log(first.output);
    process.exit(1);
  }
  console.log(`  ${GREEN}OK${OFF}  baseline: gate 11 exits 0 before any mutation`);

  /*
   * REFUSE BEFORE MUTATING, rather than discovering it halfway through.
   *
   * The E-001 case needs `rebuild()`, which shells out to pnpm — and pnpm refuses outright on a
   * toolchain below `engines` (Node 22.16.0 against >=24.19.0). The `finally` below guarantees
   * the engine source is put back, but a proof that perturbs a colour matrix and then reports
   * an unrelated failure is a proof nobody can read. This runs the same rebuild first, on an
   * UNMODIFIED tree, so the only thing it can prove is whether the rebuild works at all.
   */
  try {
    rebuild();
  } catch (error) {
    // The backup was taken before the baseline ran, so the refuse path has to clear it too.
    // It is a copy of a tracked fixture directory: left behind, `git add -A` commits it, which
    // is how it reached a commit the first time this refusal fired.
    rmSync(BACKUP, { recursive: true, force: true });
    console.log(
      `\n${RED}${BOLD}This proof cannot run on this toolchain.${OFF}\n` +
        `  The E-001 case rebuilds the engine, and the rebuild failed BEFORE anything was\n` +
        `  mutated — which is the point: it refuses rather than leaving a perturbed matrix\n` +
        `  behind. Run it on the pinned toolchain (Node 24.19.0, pnpm 11.21.0).\n\n` +
        `  ${String(error instanceof Error ? error.message : error).split('\n')[0]}\n`,
    );
    process.exit(1);
  }

  for (const testCase of CASES) {
    restore();
    /*
     * `apply` AND `cleanup` in a try/finally, and this is not defensive tidiness.
     *
     * The E-001 case WRITES A PERTURBED MATRIX INTO packages/color-spaces/src/matrices.ts and
     * then calls `rebuild()`, which shells out to pnpm. On a workstation that cannot run pnpm —
     * Node 22.16.0 against `engines: >=24.19.0`, which is the state this repository has been in
     * for weeks — `rebuild()` throws, the throw escapes before `cleanup` runs, and the proof
     * exits leaving **a corrupted colour engine in a tracked source file**.
     *
     * That is not a proof failing. That is a proof that edits the engine and does not put it
     * back: 374 gate-11 failures afterwards, and a one-digit diff that a hurried `git add -A`
     * would commit. It was found exactly that way — the gate went red immediately after this
     * script ran, and the cause was a `0.819022437996703` that had become `0.829022437996703`.
     *
     * `finally` makes the restore unconditional. `runGate` is inside it too, so a throw there
     * cannot skip the cleanup either.
     */
    let code = 1;
    let output = '';
    try {
      testCase.apply();
      ({ code, output } = runGate());
    } finally {
      testCase.cleanup?.();
    }
    restore();

    const after = runGate();
    if (after.code !== 0) {
      problems.push(`${testCase.name}: the baseline did not recover after restoring`);
      continue;
    }

    if (testCase.expect === 'green') {
      if (code === 0) console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit 0)${OFF}`);
      else
        problems.push(
          `${testCase.name}: expected the gate to STAY GREEN, got exit ${String(code)}. ` +
            'Canonicalisation is what makes a reformat indistinguishable from no change; if ' +
            'this goes red, a formatting run now reads as tampering.',
        );
      continue;
    }

    if (code === 0) {
      problems.push(`${testCase.name}: gate 11 exited 0 — the mutation was ACCEPTED`);
      continue;
    }
    if (!testCase.matching.test(output)) {
      problems.push(
        `${testCase.name}: gate 11 failed, but not for this reason. Expected ` +
          `${String(testCase.matching)}. A mutation that goes red for the wrong reason proves ` +
          'nothing about the rule it was written for.',
      );
      continue;
    }
    console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit ${String(code)})${OFF}`);
  }
} finally {
  restore();
  rmSync(BACKUP, { recursive: true, force: true });
}

const final = runGate();
if (final.code !== 0) {
  console.log(`\n${RED}${BOLD}The fixture corpus did not survive the proof.${OFF}\n`);
  console.log(final.output);
  process.exit(1);
}

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} case(s) did not discriminate.${OFF}\n`);
  for (const problem of problems) console.log(`  ${RED}x${OFF} ${problem}\n`);
  // One annotation carrying every case: a job's log needs authentication to read and its
  // annotations do not, and GitHub caps annotations at ten per run.
  ciError(
    `gate 11 content mutation proof: ${String(problems.length)} case(s) did not discriminate`,
    problems.join('\n'),
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}All ${String(CASES.length)} cases discriminate.${OFF} ` +
    `${DIM}Baseline green before and after each one.${OFF}\n`,
);
