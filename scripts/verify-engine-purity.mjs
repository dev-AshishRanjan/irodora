#!/usr/bin/env node
/**
 * Irodora — the colour engine imports nothing.
 *
 * F-006 acceptance criterion 6 is "zero runtime dependencies; no node:*, DOM or process".
 * ESLint proves the second half: `no-restricted-imports` blocks `node:fs` and
 * `no-restricted-globals` blocks `window`, `document` and `process`, and
 * scripts/verify-guards.mjs has watched both fire.
 *
 * NOTHING proved the first half. `import chroma from 'chroma-js'` inside
 * packages/color-spaces/src passes every gate we have, and that is the failure the
 * constraint actually exists to prevent — it arrives as a devDependency promoted to a
 * dependency in a hurry, and it puts a third party's precision decisions inside our central
 * correctness claim (ADR-0004). NFR-3 — byte-identical output in Node, the browser and
 * React Native, and a port to WASM without a rewrite — cannot survive it.
 *
 * Two checks, both static:
 *
 *   1. No engine package declares a runtime `dependencies` entry outside `@irodora/*`.
 *   2. No file under an engine package's `src/` imports a specifier that is neither
 *      relative nor `@irodora/*`.
 *
 * **Both run over a COMPUTED zone, not a naming convention (F-073).** The zone is the
 * transitive closure of `@irodora/*` dependency edges from the declared engine roots, because
 * scoping by package name allowed an engine package to depend on a workspace package that
 * imports `node:fs` with every gate staying green. See `engineZone` below.
 *
 * Import extraction uses the TypeScript compiler's own preprocessor rather than a regular
 * expression, because a regex over source text disagrees with the compiler at exactly the
 * moments that matter — inside a comment, inside a template literal, across a line break.
 *
 * Run `node scripts/verify-engine-purity.mjs --prove` to watch both checks fail on planted
 * violations and pass on a clean tree. A guard nobody has watched fail is not a guard.
 */

import { readFileSync, readdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = resolve(ROOT, 'packages');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** The DECLARED engine — the packages the ESLint colour-engine override matches by name. */
const isEngineRoot = (name) => name.startsWith('color-') || name === 'cvd-engine';

/**
 * The engine zone is a GRAPH, not a naming convention (F-073).
 *
 * This check used to scope itself by package name and treat every `@irodora/*` specifier
 * inside those packages as allowed **without following the edge**. So an engine package could
 * depend on a workspace package that imports `node:fs`, or that declares a third-party runtime
 * dependency, and every gate stayed green while NFR-3 was broken — byte-identical output in
 * Node, the browser and React Native is the one guarantee that cannot bend, and a transitive
 * `node:fs` is exactly what breaks it.
 *
 * The hazard is not hypothetical. F-011 expected `color-naming` to import `@irodora/corpus`,
 * which is not a root, and handled it by giving `packages/corpus/src` a portability override
 * plus boundary guard #11. That is one package handled by hand. This is the rule.
 *
 * Returns the closure plus, for each non-root member, the edge that pulled it in — so a
 * package that is in the zone because something depends on it is visible without reading the
 * graph by hand.
 */
function engineZone(allPackages) {
  const manifestOf = (name) => {
    const p = join(PACKAGES, name, 'package.json');
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  };

  const roots = allPackages.filter(isEngineRoot);
  const zone = new Map(roots.map((r) => [r, null]));
  const queue = [...roots];

  while (queue.length > 0) {
    const name = queue.shift();
    const manifest = manifestOf(name);
    if (!manifest) continue;

    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      if (!dep.startsWith('@irodora/')) continue;
      const target = dep.slice('@irodora/'.length);
      if (zone.has(target) || !allPackages.includes(target)) continue;
      zone.set(target, name);
      queue.push(target);
    }
  }

  return zone;
}

/** Relative, or a workspace sibling. Everything else is a third party. */
const isAllowedSpecifier = (spec) =>
  spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@irodora/');

function tsFilesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFilesUnder(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/**
 * The whole check, as a pure function of the tree, so `--prove` can call it directly
 * instead of shelling out and reading exit codes through a pipeline.
 * [[a-pipe-discards-the-exit-status-a-gate-just-produced]]
 */
function check() {
  const problems = [];
  const allPackages = readdirSync(PACKAGES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const zone = engineZone(allPackages);
  const engines = [...zone.keys()];

  if (engines.length === 0)
    problems.push({
      where: 'packages/',
      what: 'no engine package found',
      why: 'This check silently passes over an empty set. Either the layout moved or the check is looking in the wrong place; both are failures.',
    });

  for (const name of engines) {
    const dir = join(PACKAGES, name);
    const pulledInBy = zone.get(name);

    // A package reached through a dependency edge is held to the SAME rules, and its message
    // names the edge — otherwise the failure reads as "why is corpus an engine package?"
    const via = pulledInBy ? ` (in the engine zone via @irodora/${pulledInBy})` : '';

    const manifestPath = join(dir, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      for (const dep of Object.keys(manifest.dependencies ?? {}))
        if (!dep.startsWith('@irodora/'))
          problems.push({
            where: `packages/${name}/package.json${via}`,
            what: `runtime dependency "${dep}"`,
            why: 'The engine ships with zero runtime dependencies (NFR-3, ADR-0004). A dev-only oracle belongs in devDependencies; anything else belongs outside the engine.',
          });
    }

    for (const file of tsFilesUnder(join(dir, 'src'))) {
      const source = readFileSync(file, 'utf8');
      const { importedFiles, ambientExternalModules = [] } = ts.preProcessFile(source, true, true);
      const specifiers = [...importedFiles.map((f) => f.fileName), ...ambientExternalModules];

      for (const spec of specifiers)
        if (!isAllowedSpecifier(spec))
          problems.push({
            where: relative(ROOT, file).replaceAll('\\', '/') + via,
            what: `imports "${spec}"`,
            why: 'The engine must produce byte-identical results in Node, the browser and React Native, and port to WASM without a rewrite. Every import here is either a platform API or a third party inside our correctness claim.',
          });
    }
  }

  return { engines, problems, zone };
}

function report({ engines, problems, zone }) {
  console.log(`\n${BOLD}Irodora — colour engine purity${OFF}\n`);

  if (problems.length === 0) {
    const roots = engines.filter((n) => zone.get(n) === null);
    const reached = engines.filter((n) => zone.get(n) !== null);

    console.log(
      `  ${GREEN}✓${OFF} purity        ${DIM}${String(roots.length)} declared engine package(s): ${roots.join(', ')}${OFF}`,
    );
    // Said either way. A bare count cannot distinguish "nothing transitive" from "did not look".
    if (reached.length === 0)
      console.log(
        `  ${GREEN}✓${OFF} closure       ${DIM}no package is pulled into the zone by a dependency edge — the graph closes over the declared engine${OFF}`,
      );
    else
      for (const n of reached)
        console.log(
          `  ${GREEN}✓${OFF} closure       ${DIM}${n} is held to engine rules, pulled in via @irodora/${zone.get(n)}${OFF}`,
        );

    console.log(`\n${GREEN}${BOLD}Engine purity verified.${OFF}\n`);
    return 0;
  }

  for (const p of problems) {
    console.log(`  ${RED}✗${OFF} ${p.where}`);
    console.log(`      ${p.what}`);
    console.log(`      ${DIM}${p.why}${OFF}\n`);
  }
  console.log(`${RED}${BOLD}${problems.length} purity violation(s).${OFF}\n`);
  return 1;
}

/**
 * Plant each violation at a real path, confirm the check catches it, remove it.
 * The clean baseline is asserted FIRST and LAST: a check that always fails would otherwise
 * pass every mutation and look like a working guard.
 * [[a-decoy-that-is-not-broken-proves-nothing]]
 */
function prove() {
  const fixtureSrc = join(PACKAGES, 'color-spaces', 'src', '__purity_fixture__.ts');
  const manifestPath = join(PACKAGES, 'color-spaces', 'package.json');
  const manifestBefore = readFileSync(manifestPath, 'utf8');
  const transitiveSrc = join(PACKAGES, 'recommendation', 'src', '__purity_transitive__.ts');

  const cases = [
    {
      name: 'a third-party import in engine src is caught',
      plant: () =>
        writeFileSync(fixtureSrc, `import { rgb } from 'culori';\nexport const x = rgb;\n`),
      clean: () => unlinkSync(fixtureSrc),
      expect: /imports "culori"/,
    },
    {
      name: 'a runtime dependency in an engine manifest is caught',
      plant: () => {
        const m = JSON.parse(manifestBefore);
        m.dependencies = { ...(m.dependencies ?? {}), culori: '^4.0.2' };
        writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);
      },
      clean: () => writeFileSync(manifestPath, manifestBefore),
      expect: /runtime dependency "culori"/,
    },
    {
      // F-073. THE CASE THE OLD CHECK COULD NOT SEE. `@irodora/*` was allowed unconditionally
      // inside an engine package and the edge was never followed, so an engine package could
      // depend on a workspace package that imports `node:fs` with every gate green. Plants
      // exactly that: color-spaces gains a dependency on @irodora/recommendation, which is not
      // an engine root, and that package's src gains a node:fs import.
      name: 'a TRANSITIVE violation is caught — a non-engine package pulled into the zone',
      plant: () => {
        const m = JSON.parse(manifestBefore);
        m.dependencies = {
          ...(m.dependencies ?? {}),
          '@irodora/recommendation': 'workspace:*',
        };
        writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);
        writeFileSync(
          transitiveSrc,
          `import { readFileSync } from 'node:fs';\nexport const y = readFileSync;\n`,
        );
      },
      clean: () => {
        writeFileSync(manifestPath, manifestBefore);
        unlinkSync(transitiveSrc);
      },
      expect: /imports "node:fs"/,
    },
  ];

  let failures = 0;
  const line = (ok, text) => console.log(`  ${ok ? `${GREEN}✓` : `${RED}✗`}${OFF} ${text}`);

  console.log(`\n${BOLD}Irodora — colour engine purity: mutation proof${OFF}\n`);

  const baselineBefore = check().problems.length === 0;
  line(baselineBefore, 'baseline is clean before any mutation');
  if (!baselineBefore) failures++;

  for (const c of cases) {
    c.plant();
    let caught = false;
    try {
      caught = check().problems.some((p) => c.expect.test(`${p.what}`));
    } finally {
      c.clean();
    }
    line(caught, c.name);
    if (!caught) failures++;
  }

  const baselineAfter = check().problems.length === 0;
  line(baselineAfter, 'baseline is clean again — every fixture was removed');
  if (!baselineAfter) failures++;

  console.log(
    failures === 0
      ? `\n${GREEN}${BOLD}All purity rules proven.${OFF}\n`
      : `\n${RED}${BOLD}${failures} rule(s) did not fire.${OFF}\n`,
  );
  return failures === 0 ? 0 : 1;
}

process.exit(process.argv.includes('--prove') ? prove() : report(check()));
