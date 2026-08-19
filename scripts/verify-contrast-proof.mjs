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

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const gate9 = () => run(process.execPath, ['scripts/verify-contrast.mjs']);
const gate10 = () => run('cmd', ['/c', 'corepack pnpm --filter @irodora/design-tokens test:cvd']);
const typecheck = () =>
  run('cmd', ['/c', 'corepack pnpm --filter @irodora/design-tokens typecheck']);
const emitTest = () => run('cmd', ['/c', 'corepack pnpm --filter @irodora/design-tokens test']);
const rebuild = () => run('cmd', ['/c', 'corepack pnpm --filter @irodora/design-tokens build']);

const cases = [
  {
    // F-067. Without this the `salience` block is documentation: `checkSalience` returning []
    // unconditionally would look exactly like a passing check, which is the shape this
    // repository has shipped twice. Swapping two entries in the RECORDED rank must go red.
    name: 'gate 9 — the recorded salience rank swapped (F-067)',
    file: MANIFEST,
    mutate: (s) =>
      s.replace(
        '"rank": ["status.bad", "status.warn", "status.ok"]',
        '"rank": ["status.warn", "status.bad", "status.ok"]',
      ),
    check: gate9,
  },
  {
    name: 'gate 9 — a token nudged below AA',
    file: MANIFEST,
    mutate: (s) =>
      s.replace(
        '"status.warn":   { "oklch": { "l": 0.540, "c": 0.110, "h": 70 }',
        '"status.warn":   { "oklch": { "l": 0.640, "c": 0.110, "h": 70 }',
      ),
    check: gate9,
  },
  {
    name: 'gate 9 — a hand-edited srgb hex (ADR-0043)',
    file: MANIFEST,
    mutate: (s) => s.replace('"srgb": "#090807"', '"srgb": "#141312"'),
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
    name: 'gate 10 — success rotated 84 degrees toward caution (70.7 -> 3.6)',
    file: MANIFEST,
    mutate: (s) =>
      s.replace(
        '"status.ok":     { "oklch": { "l": 0.670, "c": 0.120, "h": 158 }',
        '"status.ok":     { "oklch": { "l": 0.700, "c": 0.140, "h": 74 }',
      ),
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
    mutate: (s) =>
      s
        .replace('"status": "approved",', '"status": "placeholder",')
        .replace(
          '"status.warn":   { "oklch": { "l": 0.540, "c": 0.110, "h": 70 }',
          '"status.warn":   { "oklch": { "l": 0.640, "c": 0.110, "h": 70 }',
        ),
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
for (const c of cases) {
  const original = readFileSync(c.file, 'utf8');
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
    if (!ok) allGood = false;
    console.log(
      `${ok ? 'OK ' : 'BAD'} ${c.name}: baseline exit ${baseline}, mutated exit ${after} ` +
        `(expected ${wantGreen ? '0' : 'non-zero'})`,
    );
  } finally {
    writeFileSync(c.file, original, 'utf8');
    if (c.rebuild) rebuild();
    const restored = readFileSync(c.file, 'utf8');
    if (restored !== original) {
      console.log(`!! ${c.file} DID NOT RESTORE`);
      allGood = false;
    }
  }
}

console.log(allGood ? '\nAll mutation proofs held.' : '\nAT LEAST ONE PROOF FAILED.');
process.exit(allGood ? 0 : 1);
