/**
 * Mutation proof for gate 9 (contrast) and the design-system half of gate 10 (cvd).
 *
 * Each case asserts BOTH directions: the baseline must be green and the mutation must be
 * red. A decoy that was already failing proves nothing.
 * [[a-decoy-that-is-not-broken-proves-nothing]]
 *
 * Every command is run with execFileSync and its exit code read directly — never through a
 * pipe. [[a-pipe-discards-the-exit-status-a-gate-just-produced]]
 */

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardPlants } from './plant.mjs';
import { ciError } from './annotate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const MANIFEST = `${ROOT}/docs/design/design-system.manifest.json`;
const STATUS_SRC = `${ROOT}/packages/design-tokens/src/status.ts`;

const run = (cmd, args) => {
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
};

/**
 * A pnpm script, on whichever platform this is.
 *
 * **This replaced `execFileSync('cmd', ['/c', …])`, and the four cases that used it had been
 * dead on Linux since they were written.** `cmd` does not exist there, `run` caught the
 * ENOENT, returned 1, and every baseline that depended on it was red before a mutation was
 * applied — so the proof reported "did not discriminate", which was true and for entirely the
 * wrong reason. The six cases invoking `process.execPath` were unaffected, which is why the
 * failure looked like a subset rather than a platform problem.
 *
 * A shell is required on BOTH platforms, not just Windows: `pnpm` there is a `.cmd` shim that
 * Node 20+ refuses to spawn directly, and `execSync` picks `cmd.exe` or `/bin/sh` for us.
 */
const runShell = (command) => {
  try {
    execSync(command, { cwd: ROOT, stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
};

const gate9 = () => run(process.execPath, ['scripts/verify-contrast.mjs']);
const gate10 = () => runShell('pnpm --filter @irodora/design-tokens test:cvd');
const typecheck = () => runShell('pnpm --filter @irodora/design-tokens typecheck');
const emitTest = () => runShell('pnpm --filter @irodora/design-tokens test');
const rebuild = () => runShell('pnpm --filter @irodora/design-tokens build');

/**
 * A manifest mutation stated as a PATH and an EXPECTED value, not as source text.
 *
 * The four cases that use this used to match the manifest's text. F-068 and F-070 reformatted
 * that file from compact to expanded JSON and the anchors stopped matching. Three said so
 * loudly — "MUTATION DID NOT APPLY" is the right behaviour and it worked. **The fourth was the
 * dangerous one:** its first replace (approved -> placeholder) still applied, so the case never
 * reported a miss, while the half that plants the REAL FAILURE quietly did nothing. It spent
 * that time proving "a placeholder status is report-only" with nothing to report.
 * [[a-decoy-that-is-not-broken-proves-nothing]]
 *
 * Asserting the CURRENT value is the part that matters. A path that still resolves after the
 * token behind it was retuned would otherwise plant a different change than the one the case
 * name describes — drifting from loud breakage to a silent lie. The manifest round-trips
 * byte-identically through `JSON.stringify(_, null, 2)`, so the runner's own
 * "did the mutation apply" comparison keeps working unchanged.
 */
const jsonEdit = (source, path, expected, next) => {
  const root = JSON.parse(source);
  let node = root;
  for (const key of path.slice(0, -1)) {
    node = node?.[key];
    if (node === undefined || node === null)
      throw new Error(
        `verify-contrast-proof: path ${path.join('.')} does not exist in the manifest`,
      );
  }
  const last = path.at(-1);
  if (JSON.stringify(node[last]) !== JSON.stringify(expected))
    throw new Error(
      `verify-contrast-proof: ${path.join('.')} holds ${JSON.stringify(node[last])}, ` +
        `expected ${JSON.stringify(expected)} — the manifest was retuned and this mutation is no ` +
        `longer the change its name describes. Re-derive it rather than deleting the case.`,
    );
  node[last] = next;
  return JSON.stringify(root, null, 2) + '\n';
};

const RANK = ['salience', 'rank'];
const RANK_NOW = ['status.bad', 'status.warn', 'status.ok'];
/** Light theme: the one whose warn sits closest to the AA floor against a pale ground. */
const WARN = ['color', 'light', 'status.warn', 'oklch'];
const WARN_NOW = { l: 0.518, c: 0.11, h: 70 };
/**
 * The value this token HELD until ADR-0098, and the reason the case is now that value.
 *
 * It was L 0.64 — a nudge that fails against every ground at once, which is a fine test of the
 * arithmetic and a weak test of the gate's SCOPE. L 0.54 is sharper: it clears the floor on
 * `background` (5.04), on `surface.1` (5.18) and on `surface.2` (4.78), and fails only on
 * `swatch.well` (4.32). That is exactly the defect F-174 fixed, and it went unseen for four
 * features because the well was not in `pairsWith` — gate scope is driven by what the manifest
 * declares, so an undeclared ground is a ground nobody measures.
 *
 * So this case now proves the two things together: the ratio, and the fact that the well is
 * being looked at. Remove `swatch.well` from the status `pairsWith` lists and this goes green
 * with the mutation applied, which is the failure it exists to catch.
 */
const WARN_TOO_LIGHT = { l: 0.54, c: 0.11, h: 70 };
/** Dark theme: where success and caution are furthest apart, so a rotation is a real move. */
const OK_DARK = ['color', 'dark', 'status.ok', 'oklch'];
const OK_DARK_NOW = { l: 0.67, c: 0.12, h: 158 };
const OK_DARK_ROTATED = { l: 0.7, c: 0.14, h: 74 };
/**
 * The accent (F-175), and the ground the decoy is aimed at.
 *
 * L 0.640 is chosen rather than "obviously too dark": it still clears AA on `background`
 * (5.64), `surface.1` (5.27), `surface.2` (4.89) **and** `surface.3` (4.55), and fails on
 * exactly one ground — `accent.muted`, at 4.47.
 *
 * That is the sharpest available test of gate SCOPE rather than of arithmetic. A gate that
 * measures the accent against the four page grounds and stops would call this value fine, and
 * the product would ship an accent that is illegible on the one surface built to hold it.
 * Drop `accent.muted` from the accent's `pairsWith` and this case goes green with the
 * mutation applied — which is the failure it exists to catch, and the same failure F-174 found
 * four features late when `swatch.well` was in nobody's `pairsWith`.
 */
const ACCENT_DARK = ['color', 'dark', 'accent', 'oklch'];
const ACCENT_DARK_NOW = { l: 0.92, c: 0.11, h: 92 };
const ACCENT_DARK_DIM = { l: 0.64, c: 0.11, h: 92 };

const cases = [
  {
    // F-067. Without this the `salience` block is documentation: `checkSalience` returning []
    // unconditionally would look exactly like a passing check, which is the shape this
    // repository has shipped twice. Swapping two entries in the RECORDED rank must go red.
    name: 'gate 9 — the recorded salience rank swapped (F-067)',
    file: MANIFEST,
    mutate: (s) => jsonEdit(s, RANK, RANK_NOW, ['status.warn', 'status.bad', 'status.ok']),
    check: gate9,
  },
  {
    name: 'gate 9 — a token below AA on ONE declared ground (the pre-ADR-0098 warn)',
    file: MANIFEST,
    mutate: (s) => jsonEdit(s, WARN, WARN_NOW, WARN_TOO_LIGHT),
    check: gate9,
  },
  {
    name: 'gate 9 — a hand-edited srgb hex (ADR-0043)',
    file: MANIFEST,
    /*
     * THE ANCHOR IS THE DARK GROUND, AND IT MOVED IN F-175 — from #090807 to #12100F when the
     * ramp lifted off near-black. This harness reported it as "MUTATION DID NOT APPLY" rather
     * than passing, which is the whole reason the no-op guard exists: a mutation that silently
     * stops applying is a proof that silently stops proving.
     */
    mutate: (s) => s.replace('"srgb": "#12100F"', '"srgb": "#141312"'),
    check: gate9,
  },
  {
    name: 'gate 9 — a chroma-ceiling exception removed',
    file: MANIFEST,
    mutate: (s) =>
      s.replace(
        '      "token": "status.bad",\n      "reason": "As status.ok. Error carries',
        '      "token": "status.notatoken",\n      "reason": "As status.ok. Error carries',
      ),
    check: gate9,
  },
  {
    // F-175. The accent is the first chromatic token in the persistent chrome since `ring`,
    // and the first one that pairs with a ground of its own.
    name: 'gate 9 — the accent below AA on its OWN ground only (F-175)',
    file: MANIFEST,
    mutate: (s) => jsonEdit(s, ACCENT_DARK, ACCENT_DARK_NOW, ACCENT_DARK_DIM),
    check: gate9,
  },
  {
    name: 'gate 10 — success rotated 84 degrees toward caution (70.7 -> 3.6)',
    file: MANIFEST,
    mutate: (s) => jsonEdit(s, OK_DARK, OK_DARK_NOW, OK_DARK_ROTATED),
    check: gate10,
  },
  {
    name: 'typecheck — the status icon channel made optional (NFR-9)',
    file: STATUS_SRC,
    mutate: (s) => s.replace('  readonly iconToken: string;', '  readonly iconToken?: string;'),
    check: typecheck,
  },
  {
    // The inverse of every case above, and the only one whose expected result is GREEN.
    // `blockingWhenStatus` is the switch between a blocking gate and a report-only one, and
    // an untested switch is a coin toss: if the comparison were wrong in the other
    // direction, the gate would be report-only while the manifest says `approved` — which
    // looks exactly like a passing build.
    name: 'gate 9 — report-only under a placeholder status, WITH a real failure present',
    file: MANIFEST,
    // BOTH halves must land. This case asserts that a placeholder status is REPORT-ONLY, and
    // it only means that if a real failure is present to be report-only ABOUT. When the second
    // half silently stopped applying, the case went on passing while asserting nothing.
    mutate: (s) =>
      jsonEdit(jsonEdit(s, ['status'], 'approved', 'placeholder'), WARN, WARN_NOW, WARN_TOO_LIGHT),
    check: gate9,
    expect: 'green',
  },
  {
    // Coverage: gate scope is driven by `pairsWith`, so a token nobody names is checked by
    // nothing — and says nothing, which reads as a pass. `uncheckedReason` turns that
    // absence into a declaration; removing one must be loud.
    name: 'gate 9 — a token left covered by nothing, with no reason given',
    file: MANIFEST,
    mutate: (s) =>
      s.replace(
        ' "uncheckedReason": "A data series is separated from its neighbours',
        ' "wasUncheckedReason": "A data series is separated from its neighbours',
      ),
    check: gate9,
  },
  {
    // The gap the F-003 evaluation found. Case 1 changes a token's `oklch`, which ALSO
    // breaks the ADR-0043 derived-hex check — so gate 9 went red either way, and a
    // `checkContrast` that returned `passes: true` unconditionally would have left every
    // gate and every other mutation green. This isolates the comparison itself.
    //
    // Note the check is the package test, NOT gate 9: with the comparison neutered gate 9
    // still exits 0, which is the whole point of recording this one.
    name: 'test — checkContrast neutered to always pass (gate 9 alone does NOT catch this)',
    file: `${ROOT}/packages/design-tokens/src/check.ts`,
    mutate: (s) =>
      s.replace('          passes: worst.wcag >= requirement.required,', '          passes: true,'),
    check: emitTest,
    rebuild: true,
  },
  {
    name: 'test — an emitter changed without regenerating',
    file: `${ROOT}/packages/design-tokens/src/emit/css.ts`,
    mutate: (s) =>
      s.replace("export const CSS_NAMESPACE = 'irodora';", "export const CSS_NAMESPACE = 'iro';"),
    check: emitTest,
  },
];

let allGood = true;
/** Every case that did not discriminate, for one annotation at the end. */
const failures = [];
for (const c of cases) {
  const original = readFileSync(c.file, 'utf8');

  /*
   * THE PLANT JOURNAL (F-173). This is the proof that left a status colour moved in the design
   * manifest — eight design-token tests red in a package that session had not touched, and a
   * one-digit diff `git add -A` would have committed.
   *
   * Recorded per case rather than up front, because each case names its own file and the loop
   * restores at the end of each iteration.
   */
  const journal = guardPlants('verify-contrast-proof', [c.file]);
  const mutated = c.mutate(original);
  if (mutated === original) {
    console.log(`?? ${c.name}: MUTATION DID NOT APPLY — the anchor text has moved.`);
    allGood = false;
    continue;
  }

  const baseline = c.check();
  try {
    writeFileSync(c.file, mutated, 'utf8');
    // A mutation to package SOURCE only reaches the checks through dist, so it has to be
    // rebuilt. Without this the mutation is written, nothing recompiles, and the case passes
    // by measuring the unmutated build.
    if (c.rebuild) rebuild();
    const after = c.check();
    // The baseline must be green in EVERY case. A decoy proves nothing if the gate was
    // already failing before it was applied. [[a-decoy-that-is-not-broken-proves-nothing]]
    const wantGreen = c.expect === 'green';
    const ok = baseline === 0 && (wantGreen ? after === 0 : after !== 0);
    if (!ok) {
      allGood = false;
      failures.push(
        `${c.name}: baseline exit ${baseline}, mutated exit ${after}, expected ` +
          `${wantGreen ? '0' : 'non-zero'}` +
          (baseline !== 0
            ? ' — THE BASELINE WAS ALREADY RED, so this case proved nothing about the boundary. ' +
              'Fix the checker, not the rule.'
            : ''),
      );
    }
    console.log(
      `${ok ? 'OK ' : 'BAD'} ${c.name}: baseline exit ${baseline}, mutated exit ${after} ` +
        `(expected ${wantGreen ? '0' : 'non-zero'})`,
    );
  } finally {
    writeFileSync(c.file, original, 'utf8');
    // Cleared only after the restore has returned.
    journal.close();
    if (c.rebuild) rebuild();
    const restored = readFileSync(c.file, 'utf8');
    if (restored !== original) {
      console.log(`!! ${c.file} DID NOT RESTORE`);
      allGood = false;
    }
  }
}

console.log(allGood ? '\nAll mutation proofs held.' : '\nAT LEAST ONE PROOF FAILED.');

// ONE annotation carrying every case, because a job's log needs authentication to read and
// its annotations do not — and because GitHub caps annotations at ten per run, so one per
// case would lose the eleventh silently.
if (!allGood)
  ciError(
    `gate 9 contrast mutation proof: ${String(failures.length)} case(s) did not discriminate`,
    failures.join('\n'),
  );

process.exit(allGood ? 0 : 1);
