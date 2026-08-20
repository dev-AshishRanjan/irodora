/**
 * Gate 8 — scope.
 *
 * Runs **before** the a11y suite and answers a question the suite cannot: *did anything get
 * left out?* A conformance run that passes tells you the components it looked at conform. It
 * says nothing at all about a component nobody registered, and that component looks identical
 * to a passing one from the outside.
 *
 * ## The rule, from ADR-0054
 *
 * > Every component is either consumed by a real screen or registered in the conformance
 * > registry, and the scope reporter prints any that are neither and fails.
 *
 * "Consumed" is transitive: `Status` renders `Icon`, so a registry entry for `Status` puts
 * `Icon` under test too. What this computes is the **closure** from the registry roots, and
 * anything outside it is unreached.
 *
 * ## Why it fails on an empty set
 *
 * `pnpm test:a11y` exited 0 over **zero test files** before this existed — passing vacuously,
 * for as long as nobody looked. "There are no components" and "I could not find the
 * components" are opposite facts and only one of them may proceed
 * [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]. This is the same shape as
 * `scripts/e2e-scope.mjs`, deliberately.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Each zone is a directory of components and the file that registers them.
 *
 * `apps/mobile/app/` is deliberately absent: a route there sets navigation options and
 * delegates, and `Stack.Screen` cannot render outside a navigator — the CONTENT lives in
 * `src/screens/` precisely so it can be rendered and therefore checked.
 */
const ZONES = [
  {
    name: '@irodora/ui',
    dir: join(ROOT, 'packages', 'ui', 'src'),
    registry: join(ROOT, 'packages', 'ui', 'test', 'conformance.test.tsx'),
  },
  {
    name: 'apps/mobile screens',
    dir: join(ROOT, 'apps', 'mobile', 'src', 'screens'),
    registry: join(ROOT, 'apps', 'mobile', 'test', 'screens.test.tsx'),
  },
];

/** Component modules in a directory. A module is a component if it exports a PascalCase fn. */
function components(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue;
    if (file.startsWith('__')) continue; // guard fixtures — planted, never shipped
    const source = readFileSync(join(dir, file), 'utf8');
    // `[<(]` — a GENERIC component declares `export function Text<S extends ...>(`, and a
    // scanner that only accepted `(` would skip every generic component while reporting full
    // coverage on the rest. `Text` was missed exactly that way on this script's first run,
    // which is a good argument for running a new checker before trusting its output.
    const names = [...source.matchAll(/export function ([A-Z]\w*)\s*[<(]/gu)].map((m) => m[1]);
    if (names.length > 0) out.push({ file, module: basename(file, '.tsx'), names, source });
  }
  return out;
}

console.log(`\n${BOLD}Gate 8 — a11y scope${OFF}\n`);

let unreached = 0;
let checked = 0;

for (const zone of ZONES) {
  const found = components(zone.dir);
  if (found.length === 0) {
    console.log(`  ${RED}✗${OFF} ${zone.name}: no component modules found in ${zone.dir}`);
    console.log(
      `${DIM}      A zone that contains nothing is a zone whose path is wrong, not a zone` +
        ` that conforms.${OFF}`,
    );
    unreached += 1;
    continue;
  }
  if (!existsSync(zone.registry)) {
    console.log(`  ${RED}✗${OFF} ${zone.name}: no registry at ${zone.registry}`);
    unreached += 1;
    continue;
  }

  const registry = readFileSync(zone.registry, 'utf8');

  // Roots: every component named in the registry file.
  const reached = new Set();
  for (const c of found) for (const n of c.names) if (registry.includes(n)) reached.add(n);

  // Closure: a component imported by a reached module is itself reached, transitively.
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of found) {
      if (!c.names.some((n) => reached.has(n))) continue;
      for (const other of found) {
        if (other === c) continue;
        // Imported by module specifier, and actually referenced by name.
        if (!c.source.includes(`./${other.module}.js`)) continue;
        for (const n of other.names)
          if (c.source.includes(n) && !reached.has(n)) {
            reached.add(n);
            grew = true;
          }
      }
    }
  }

  for (const c of found)
    for (const n of c.names) {
      checked += 1;
      if (reached.has(n)) continue;
      unreached += 1;
      console.log(`  ${RED}✗${OFF} ${zone.name}: ${BOLD}${n}${OFF} ${DIM}(${c.file})${OFF}`);
      console.log(
        `${DIM}      Not in the conformance registry and not reachable from anything that is.` +
          ` A component nobody renders is a component nobody checks.${OFF}`,
      );
    }

  const names = found.flatMap((c) => c.names);
  console.log(
    `  ${unreached === 0 ? GREEN + '✓' : ' '}${OFF} ${zone.name}` +
      `${DIM}  ${String(reached.size)}/${String(names.length)} reached — ` +
      `${[...reached].sort().join(', ')}${OFF}`,
  );
}

if (checked === 0) {
  console.log(
    `\n${RED}${BOLD}Gate 8 scope FAILED.${OFF} No components anywhere. A suite over an empty` +
      ' set has not passed; it has not run.\n',
  );
  process.exit(1);
}

if (unreached > 0) {
  console.log(
    `\n${RED}${BOLD}Gate 8 scope FAILED.${OFF} ${String(unreached)} component(s) unreached.\n` +
      `${DIM}  Register it in the conformance registry, or render it from something that is.\n` +
      `  Deleting it is also an answer — an unrendered component is not shipping anyway.${OFF}\n`,
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Gate 8 scope passed.${OFF} ` +
    `${DIM}${String(checked)} component(s), all reachable from a conformance registry.${OFF}\n`,
);
