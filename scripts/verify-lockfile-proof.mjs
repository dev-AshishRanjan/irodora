#!/usr/bin/env node
/**
 * Irodora — proof that the lockfile ↔ manifests check can fail (F-098).
 *
 * The check it proves lives in gate 0, section 7b. Its first run was green over 19 workspace
 * projects and 136 dependencies, which says nothing whatsoever about whether it CAN fire —
 * a comparison with a bug in the parser reports exactly the same sentence.
 *
 * That matters more here than it usually does, because the check exists to catch a drift the
 * install step already catches. Its only value is catching it EARLIER and saying WHY. A
 * version that silently agrees with every lockfile has no value at all: it would move the
 * failure back to install, where it was, while reading green on the way past.
 *
 * Seven plants, each restored, with the baseline asserted green either side. Five must go
 * red AND name the right package. TWO MUST STAY GREEN:
 *
 *   - a manifest reformatted without touching a dependency, and
 *   - a workspace project that declares nothing, which is legal with no importer body
 *     (`tests/bench: {}` is exactly that shape and would be two false failures a day one).
 *
 * A proof where everything is red cannot tell a working check from one that fails on
 * everything, and the second control is the specific false positive this parser had to avoid.
 *
 * Every file is restored in a `finally` and the restore is verified. If this script is
 * interrupted, `git status` names what to check out.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const STORE = join(ROOT, 'packages/store/package.json');
const ROOT_PKG = join(ROOT, 'package.json');
const WORKSPACE = join(ROOT, 'pnpm-workspace.yaml');

/** Directories the plants create. Removed in the `finally`, whatever happened. */
const SCRATCH = [join(ROOT, 'tests/__proof-with-deps__'), join(ROOT, 'tests/__proof-no-deps__')];

const originals = new Map(
  [STORE, ROOT_PKG, WORKSPACE].map((path) => [path, readFileSync(path, 'utf8')]),
);

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Run gate 0 and return its lockfile findings only.
 *
 * Filtering on the file name is deliberate: every failure section 7b raises names
 * `pnpm-lock.yaml` in its `what`, and no other check in gate 0 mentions it. A plant that
 * happens to upset an unrelated check therefore cannot be mistaken for a catch.
 */
function findings() {
  try {
    execFileSync(process.execPath, [join(ROOT, 'scripts/verify-state.mjs')], {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return '';
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    return out
      .split('\n')
      .filter((line) => line.includes('pnpm-lock.yaml') && !line.includes('Run `pnpm install'))
      .join('\n');
  }
}

/** Rewrite a manifest through a mutator, asserting the mutation actually changed something. */
function withManifest(path, mutate) {
  const before = originals.get(path);
  if (before === undefined) throw new Error(`${path} was not captured`);
  const manifest = JSON.parse(before);
  mutate(manifest);
  const after = `${JSON.stringify(manifest, null, 2)}\n`;
  if (after === before) throw new Error(`MUTATION DID NOT APPLY on ${path}`);
  writeFileSync(path, after, 'utf8');
}

/** Write a throwaway workspace project under tests/, which pnpm-workspace.yaml globs. */
function plantProject(dir, dependencies) {
  mkdirSync(dir, { recursive: true });
  const manifest = {
    name: `@irodora/${dir.split(/[\\/]/).pop()}`,
    version: '0.0.0',
    private: true,
    type: 'module',
    ...(dependencies ? { devDependencies: dependencies } : {}),
  };
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

const CASES = [
  {
    name: 'the F-020 defect itself — a manifest declares what the lockfile does not resolve',
    plant: () =>
      withManifest(STORE, (m) => {
        m.devDependencies['@irodora/color-core'] = 'workspace:*';
      }),
    // The real drift was this exact shape — a workspace: dependency added to
    // packages/store with nothing regenerating the lockfile — and it cost three red pushes.
    expect: (f) => f.includes('@irodora/color-core') && f.includes('packages/store'),
  },
  {
    name: 'a CHANGED specifier is caught, not only a new name',
    plant: () =>
      withManifest(ROOT_PKG, (m) => {
        m.devDependencies.prettier = '^3.0.0';
      }),
    expect: (f) => f.includes('prettier') && f.includes('^3.0.0') && f.includes('^3.9.6'),
  },
  {
    name: 'a REMOVED dependency the lockfile still resolves is caught',
    plant: () =>
      withManifest(STORE, (m) => {
        delete m.devDependencies.vitest;
      }),
    expect: (f) => f.includes('vitest') && f.includes('packages/store'),
  },
  {
    name: 'an override that drifts from the lockfile is caught (ADR-0062)',
    plant: () =>
      writeFileSync(
        WORKSPACE,
        originals
          .get(WORKSPACE)
          .replace('react-native-worklets: 0.11.4', 'react-native-worklets: 0.12.1'),
        'utf8',
      ),
    expect: (f) => f.includes('react-native-worklets') && f.includes('0.12.1'),
  },
  {
    name: 'a new workspace project WITH dependencies and no importer is caught',
    plant: () => plantProject(SCRATCH[0], { vitest: '^4.1.10' }),
    expect: (f) => f.includes('tests/__proof-with-deps__') && f.includes('no importer'),
  },
  {
    name: 'CONTROL — a reformatted manifest that changes no dependency stays green',
    // Key order and whitespace both change; not one specifier does.
    plant: () =>
      writeFileSync(
        STORE,
        `${JSON.stringify(
          Object.fromEntries(Object.entries(JSON.parse(originals.get(STORE))).reverse()),
          null,
          4,
        )}\n`,
        'utf8',
      ),
    expect: (f) => !f.includes('packages/store'),
  },
  {
    name: 'CONTROL — a workspace project that declares NOTHING stays green',
    // tests/bench and tests/color-lab are this shape. Reading `{}` as absent would have made
    // the check fail on a correct lockfile from its very first run.
    plant: () => plantProject(SCRATCH[1], null),
    expect: (f) => !f.includes('tests/__proof-no-deps__'),
  },
];

console.log(`\n${BOLD}Proof — lockfile ↔ manifests${OFF}\n`);

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
    for (const [path, text] of originals) writeFileSync(path, text, 'utf8');
    for (const dir of SCRATCH) rmSync(dir, { recursive: true, force: true });
  }
} finally {
  for (const [path, text] of originals) writeFileSync(path, text, 'utf8');
  for (const dir of SCRATCH) rmSync(dir, { recursive: true, force: true });
}

for (const [path, text] of originals)
  if (readFileSync(path, 'utf8') !== text) {
    console.log(`\n${RED}${BOLD}${path} was not restored.${OFF}\n`);
    process.exit(1);
  }
for (const dir of SCRATCH)
  if (existsSync(dir)) {
    console.log(`\n${RED}${BOLD}${dir} was left behind.${OFF}\n`);
    process.exit(1);
  }

if (findings() !== '') {
  console.log(`\n${RED}${BOLD}The workspace was not restored.${OFF}\n`);
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
  `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${String(caught)}/${String(CASES.length)} cases (5 red, 2 green), baseline green either side.${OFF}\n`,
);
