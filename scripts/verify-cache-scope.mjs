#!/usr/bin/env node
/**
 * Irodora — a cached task's key covers everything its tests actually read.
 *
 * ## The failure
 *
 * `pnpm test` printed **31 successful, 31 total — 26 cached** while `--force` was **red in
 * four tests**. Turbo keys a task on the inputs of the package it runs in, and two sets of
 * tests read further than that:
 *
 * - eight files in `packages/design-tokens/test/` read
 *   `docs/design/design-system.manifest.json` — so a manifest change that fails seven of them
 *   was reported as *"5 successful, 5 total"*, cache hit, no execution;
 * - `packages/store/test/key.test.ts` read `apps/mobile/src` for FR-56, and had been red since
 *   F-018 generated a bundle carrying 126 SHA-256 digests.
 *
 * Both were fixed. **Neither fix stops the next one**, which is what this script is for.
 *
 * ## Two rules
 *
 * 1. **A test may not read past its own package** unless the target is in
 *    `globalDependencies`. A path this script cannot resolve statically counts as
 *    unaccounted — failing closed, because *"I could not tell"* and *"it is fine"* are
 *    opposite facts [[a-gate-that-errors-is-failing-open]].
 * 2. **Every CACHED turbo task is invoked through `scripts/gate.mjs`** from the root scripts.
 *    The wrapper is what puts the running toolchain in the key; a task invoked around it is
 *    keyed as though the runtime did not matter, which is the second half of the same defect.
 *
 * ## What it cannot see, and says so on every run
 *
 * A path assembled at run time, read through a helper, or built from a variable this scan
 * cannot follow. That is the honest limit of source analysis, and it is the same one
 * `verify-motion.mjs` prints. It is mitigated by rule 1's polarity — an unresolvable ascent is
 * a failure, not a pass — but a read with no `..` in it at all is invisible.
 *
 * Usage:
 *   node scripts/verify-cache-scope.mjs
 *   node scripts/verify-cache-scope.mjs --prove
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const prove = process.argv.includes('--prove');

/**
 * Reads that escape a package and are accounted for another way.
 *
 * Explicit `package :: path` pairs with a reason, never a glob and never a bare package name —
 * an entry that exempted a whole package would put the next such read back in the dark.
 * Empty, and it should stay that way: the two real cases were repaired rather than listed.
 */
const ALLOWED = new Map([]);

/** Where tests live. A zone with no files is a wrong path, not a clean zone. */
const ZONES = [join(ROOT, 'packages'), join(ROOT, 'apps')];

function testFiles(packageDir) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        walk(full);
        continue;
      }
      if (/\.(test|spec)\.tsx?$/u.test(e.name)) out.push(full);
    }
  };
  walk(join(packageDir, 'test'));
  walk(join(packageDir, 'src'));
  return out;
}

/**
 * What a `join(…)` is anchored to.
 *
 * **A fixed count of `'..'` is the wrong model**, and the first draft used one: two levels up
 * escapes a package from `test/`, and lands *on the package root* from `test/golden/`. It
 * reported ten in-package golden fixtures as escapes. So the ascent is resolved against the
 * file's real position instead, and the base has to be identified to do that.
 *
 * A base this cannot classify makes the read **unresolvable**, which fails — see rule 1.
 */
function declarationOf(source, identifier) {
  // Textual rather than a built regex. An identifier interpolated into a pattern has to be
  // escaped, and the first attempt escaped it wrongly enough to throw at import time — which
  // is a lot of ceremony for "find the line that assigns this name".
  for (const keyword of ['const ', 'let ', 'var ']) {
    const at = source.indexOf(`${keyword}${identifier} =`);
    if (at === -1) continue;
    const end = source.indexOf(';', at);
    return source.slice(at, end === -1 ? at + 200 : end);
  }
  return null;
}

function baseOf(source, identifier, file, packageDir, depth = 0) {
  if (identifier === undefined) return null;
  // A literal first argument is a relative path, which resolves from the file.
  if (identifier.startsWith("'") || identifier.startsWith('"')) return dirname(file);
  const rhs = declarationOf(source, identifier) ?? identifier;
  if (rhs.includes('import.meta.url') || rhs.includes('__dirname')) return dirname(file);
  // Under vitest and jest the working directory is the package root.
  if (rhs.includes('process.cwd()')) return packageDir;

  /*
   * ONE BASE DERIVED FROM ANOTHER — `const PACKAGE = join(HERE, '..')`, which is how the
   * real case in design-tokens is written. Bounded, because a chain that refers to itself
   * would otherwise recurse until the stack ends and the gate would fail for the wrong
   * reason. Beyond the bound it returns null, which fails closed.
   */
  if (depth >= 4) return null;
  const inner = /join\(\s*([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")([^)]*)\)/u.exec(rhs);
  if (inner === null) return null;
  const anchor = baseOf(source, inner[1], file, packageDir, depth + 1);
  if (anchor === null) return null;
  const parts = [...(inner[2] ?? '').matchAll(/'([^']*)'|"([^"]*)"/gu)].map(
    (a) => a[1] ?? a[2] ?? '',
  );
  return resolve(anchor, ...parts);
}

/**
 * Every read this file makes that lands outside its own package.
 *
 * Both spellings are covered: `join(BASE, '..', '..', 'docs', 'y')` and a literal `'../../y'`.
 * A relative literal is resolved from the file's directory, which is where a module specifier
 * resolves from — the overwhelming majority of them — and that is stated as a limit rather
 * than as a guarantee.
 */
function escapingReads(source, file, packageDir) {
  const found = [];

  for (const m of source.matchAll(/join\(\s*([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")([^)]*)\)/gu)) {
    const rest = [...(m[2] ?? '').matchAll(/'([^']*)'|"([^"]*)"/gu)].map((a) => a[1] ?? a[2] ?? '');
    if (!rest.includes('..')) continue;
    const anchor = baseOf(source, m[1], file, packageDir);
    if (anchor === null) {
      found.push({ raw: m[0].slice(0, 80), path: null });
      continue;
    }
    const target = resolve(anchor, ...rest);
    if (!relative(packageDir, target).startsWith('..')) continue;
    found.push({ raw: m[0].slice(0, 80), path: relative(ROOT, target).replace(/\\/gu, '/') });
  }

  for (const m of source.matchAll(/['"`]((?:\.\.\/)+[^'"`]*)['"`]/gu)) {
    const target = resolve(dirname(file), m[1] ?? '');
    if (!relative(packageDir, target).startsWith('..')) continue;
    found.push({ raw: m[0], path: relative(ROOT, target).replace(/\\/gu, '/') });
  }

  return found;
}

/** Does `globalDependencies` cover this path? */
function covered(segments, globs) {
  const path = segments.join('/');
  return globs.some((g) => {
    if (g === path) return true;
    const star = g.indexOf('**');
    if (star === -1) return false;
    return path.startsWith(g.slice(0, star));
  });
}

const turbo = JSON.parse(readFileSync(join(ROOT, 'turbo.json'), 'utf8'));
const globs = turbo.globalDependencies ?? [];
const rootScripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {};

console.log(`\n${BOLD}Irodora — cache scope${OFF}\n`);

const failures = [];
let scanned = 0;
let ascentCount = 0;

for (const zone of ZONES) {
  let packages;
  try {
    packages = readdirSync(zone, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    packages = [];
  }
  for (const pkg of packages) {
    const packageDir = join(zone, pkg.name);
    for (const file of testFiles(packageDir)) {
      scanned += 1;
      const rel = relative(ROOT, file).replace(/\\/gu, '/');
      const source = readFileSync(file, 'utf8');
      for (const read of escapingReads(source, file, packageDir)) {
        ascentCount += 1;
        if (read.path === null) {
          failures.push(
            `${rel}: reads past its package by a path this scan cannot resolve — ${read.raw}. ` +
              'Unresolvable counts as unaccounted: "I could not tell" and "it is fine" are ' +
              'opposite facts.',
          );
          continue;
        }
        if (ALLOWED.get(`${pkg.name} :: ${read.path}`) !== undefined) continue;
        if (covered(read.path.split('/'), globs)) continue;
        failures.push(
          `${rel}: reads "${read.path}", which is outside its package and not in turbo.json's ` +
            'globalDependencies. A change to it will not invalidate this package’s cached ' +
            'test result, so the suite can be green about a file it never re-read.',
        );
      }
    }
  }
}

/**
 * Rule 2 — a cached task must be started by the wrapper.
 *
 * `cache: false` tasks are exempt because there is nothing to key; `clean` is one of them, and
 * routing it through the wrapper would print a toolchain warning on a tidy-up.
 */
for (const [name, task] of Object.entries(turbo.tasks ?? {})) {
  if (task.cache === false) continue;
  // The task name is data, not a pattern: `test:golden` contains a colon, which `u`-mode
  // regex treats as an invalid escape once naively backslashed. Escape every metacharacter.
  const literal = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const invocations = Object.entries(rootScripts).filter(([, body]) =>
    new RegExp(`(^|&&\\s*)(npx\\s+)?turbo run ${literal}(\\s|$)`, 'u').test(body),
  );
  for (const [script] of invocations)
    failures.push(
      `package.json scripts.${script} runs \`turbo run ${name}\` directly. A cached task must ` +
        'go through `node scripts/gate.mjs`, which is what puts the running Node and package ' +
        'manager into the cache key — without it a result made on one runtime is replayed on ' +
        'another.',
    );
}

console.log(
  `${DIM}  ${String(scanned)} test file(s) scanned, ${String(ascentCount)} read(s) past a ` +
    `package boundary, ${String(globs.length)} global dependenc(ies) declared${OFF}`,
);
console.log(
  `  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: a path assembled at run time, or read through a ` +
    `helper this scan cannot follow. An unresolvable ASCENT fails closed, but a read with no ` +
    `".." in it is invisible to source analysis.${OFF}`,
);

if (scanned === 0) {
  console.log(
    `\n${RED}${BOLD}Cannot run.${OFF} No test files found under packages/ or apps/.\n` +
      'A scan over an empty set has not passed; it has not run.\n',
  );
  process.exit(1);
}

if (!prove) {
  if (failures.length) {
    console.log(`\n${RED}${BOLD}${String(failures.length)} unaccounted read(s)${OFF}\n`);
    for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}\n`);
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}Every cached task's key covers what its tests read.${OFF}\n`);
  process.exit(0);
}

/* --------------------------------------------------------------------------------------- */
/* --prove: watch it fail, with the baseline asserted green either side                      */
/* --------------------------------------------------------------------------------------- */

console.log(`\n${BOLD}Proof${OFF}\n`);

if (failures.length) {
  console.log(
    `  ${RED}✗ baseline: already failing${OFF}\n` +
      `${DIM}    Nothing below can mean anything until the repository is clean.${OFF}\n`,
  );
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} baseline is green ${DIM}before the plant${OFF}`);

/*
 * The plant sits DIRECTLY in `test/`, not in a subdirectory, and that detail is the whole
 * fixture: the first draft put it one level deeper, so every planted ascent landed back inside
 * `packages/store` and three cases reported "nothing" while looking like the scan was broken.
 * A decoy at the wrong depth proves nothing [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * From `packages/store/test`: two levels up is `packages/`, three is the repository root.
 */
const plantDir = join(ROOT, 'packages', 'store', 'test');
const plantFile = join(plantDir, '__cache_scope_proof__.test.ts');
const HERE_DECL =
  "import { dirname, join } from 'node:path';\n" +
  "import { fileURLToPath } from 'node:url';\n" +
  'const HERE = dirname(fileURLToPath(import.meta.url));\n';
let planted = 0;
let caught = 0;

const rerun = () => {
  const out = [];
  for (const zone of ZONES) {
    let packages;
    try {
      packages = readdirSync(zone, { withFileTypes: true }).filter((e) => e.isDirectory());
    } catch {
      packages = [];
    }
    for (const pkg of packages) {
      const packageDir = join(zone, pkg.name);
      for (const file of testFiles(packageDir)) {
        const source = readFileSync(file, 'utf8');
        for (const read of escapingReads(source, file, packageDir)) {
          if (read.path === null) {
            out.push('unresolvable');
            continue;
          }
          if (!covered(read.path.split('/'), globs)) out.push(read.path);
        }
      }
    }
  }
  return out;
};

const CASES = [
  {
    name: 'a test reading a directory nobody declared',
    source: `${HERE_DECL}const P = join(HERE, '..', '..', 'ops', 'x.json');\n`,
    expect: (found) => found.includes('packages/ops/x.json'),
  },
  {
    name: 'the same read spelled as a literal path',
    source: "const P = '../../ops/x.json';\n",
    expect: (found) => found.includes('packages/ops/x.json'),
  },
  {
    name: 'a base this scan cannot classify',
    source: `import { join } from 'node:path';\nconst P = join(SOMEWHERE, '..', '..', 'x.json');\n`,
    expect: (found) => found.includes('unresolvable'),
  },
  {
    name: 'a base derived from another base still resolves',
    source: `${HERE_DECL}const PKG = join(HERE, '..');\nconst P = join(PKG, '..', 'ops', 'x.json');\n`,
    expect: (found) => found.includes('packages/ops/x.json'),
  },
  {
    name: 'CONTROL — one level up is the package root, not an escape',
    source: `${HERE_DECL}const P = join(HERE, '..', 'golden', 'x.json');\n`,
    expect: (found) => found.length === 0,
  },
  {
    name: 'CONTROL — a declared global dependency is accounted for',
    source: `${HERE_DECL}const P = join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json');\n`,
    expect: (found) => found.length === 0,
  },
];

try {
  mkdirSync(plantDir, { recursive: true });
  for (const c of CASES) {
    planted += 1;
    writeFileSync(plantFile, c.source, 'utf8');
    const found = rerun();
    const ok = c.expect(found);
    if (ok) caught += 1;
    console.log(
      `  ${ok ? `${GREEN}✓` : `${RED}✗`}${OFF} ${c.name}` +
        `${DIM}  found: [${found.join(', ') || 'nothing'}]${OFF}`,
    );
  }
} finally {
  rmSync(plantFile, { force: true });
}

const after = rerun();
if (after.length > 0) {
  console.log(`\n${RED}${BOLD}The plant was not cleaned up.${OFF}\n`);
  process.exit(1);
}
console.log(`  ${GREEN}✓${OFF} baseline is green ${DIM}after the plant was removed${OFF}`);

if (caught !== planted) {
  console.log(
    `\n${RED}${BOLD}${String(planted - caught)} of ${String(planted)} case(s) went the wrong way.${OFF}\n`,
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}${String(caught)}/${String(planted)} cases, and the ` +
    `baseline green either side.${OFF}\n`,
);
