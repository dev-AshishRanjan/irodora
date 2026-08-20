#!/usr/bin/env node
/**
 * Irodora — boundary guard proof.
 *
 * The architectural boundaries in ADR-0001 and ADR-0004 are enforced by ESLint rules.
 * A rule nobody has watched fail is not a boundary — it is a configuration file that
 * happens to parse. This script writes a deliberately violating file at the exact path
 * each rule targets, lints it, and asserts the expected rule fires.
 *
 * It is the negative-test-needs-a-decoy discipline applied to lint: an empty fixture
 * would pass whether or not the rule works.
 *
 * Fixtures are written and deleted in the same run — nothing violating is ever committed.
 * Uses ESLint's Node API rather than shelling out: spawning `npx.cmd` throws EINVAL on
 * Windows under Node 20+, and a guard that cannot run is a guard that is failing open.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Each guard places a violation at a REAL path so the rule's `files` glob matches.
 * `rule` is the id ESLint must report. `must` is what the boundary protects.
 */
const GUARDS = [
  {
    name: 'colour engine may not import a Node API',
    path: 'packages/color-spaces/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must: 'NFR-3 — the engine must run identically in Node, the browser and React Native',
    source: `import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n`,
  },
  {
    name: 'colour engine may not touch a platform global',
    path: 'packages/color-spaces/src/__guard__.ts',
    rule: 'no-restricted-globals',
    must: 'NFR-3 — no DOM, no process, no platform branch inside the engine',
    source: `export const x = window.innerWidth;\n`,
  },
  {
    name: 'colour engine keeps deep-import protection',
    path: 'packages/cvd-engine/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      'A later ESLint config object REPLACES no-restricted-imports rather than merging. ' +
      'Without the patterns repeated in the engine override, deep imports become legal in ' +
      'exactly the packages that need protecting most.',
    source: `import type { Xyz } from '@irodora/color-spaces/src/index.js';\nexport type A = Xyz;\n`,
  },
  {
    name: 'packages may not be deep-imported',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must: 'A package entry point is a contract; an internal path is not',
    source: `import { CORE_VERSION } from '@irodora/color-core/src/index.js';\nexport const v = CORE_VERSION;\n`,
  },
  {
    name: 'the contract layer may not hand-write a type',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'A Zod schema in @irodora/contracts is the single source of validation, types and ' +
      'OpenAPI (ADR-0012). An interface beside a schema compiles, looks correct, and ' +
      'diverges the first time only one of the two is edited — invisibly, because nothing ' +
      'compares them.',
    source: `export interface WireColor {\n  space: string;\n  hex: string;\n}\n`,
  },
  {
    name: 'the contract layer may not hand-write a union',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'This is the form that actually threatens this package. The two engine types it ' +
      'duplicates — ColorSpace and MeasurementSource — are string unions, and a union is ' +
      'not a type literal, so a selector written only for `type X = { … }` never sees one.',
    source: `export type Space = 'srgb' | 'display-p3' | 'oklch';\n`,
  },
  {
    name: 'the contract layer may not hide a type literal inside a wrapper',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'A `>` child selector is defeated by any wrapping — Readonly<{…}>, {…}[], {…} & {…}. ' +
      'Readonly<{…}> is the natural thing to write in a repository whose engine types are ' +
      'all readonly, so it is the one that would have slipped through.',
    source: `export type Wire = Readonly<{ code: string }>;\n`,
  },
  {
    name: 'the contract layer may not declare a TypeScript enum',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'An enum is neither an interface nor a type alias, so every selector written for ' +
      'those misses it — and it looks more like a contract than either, while validating ' +
      'nothing at the boundary.',
    source: `export enum Space {\n  Srgb = 'srgb',\n}\n`,
  },
  {
    name: 'the contract layer may not import a Node API',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      '@irodora/contracts is imported by apps/mobile (React Native) and by the engine packages. ' +
      'A node:* import in its src is a crash on a phone, found by a user.',
    source: `import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n`,
  },
  {
    name: 'the corpus schema may not import a Node API',
    path: 'packages/corpus/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      '@irodora/corpus is imported by packages/color-naming (F-013), which is inside the ' +
      'colour-engine zone and must produce byte-identical output in Node, the browser and ' +
      'React Native (NFR-3). verify-engine-purity.mjs does not follow @irodora/* edges out ' +
      'of an engine package, so this rule is the only thing standing between a node:fs in ' +
      'corpus and a node:fs in the engine.',
    source: `import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n`,
  },
  {
    name: 'a floating promise is an error',
    path: 'packages/recommendation/src/__guard__.ts',
    rule: '@typescript-eslint/no-floating-promises',
    must:
      'A dropped await is a bug the compiler cannot see. The rule is workspace-wide; this ' +
      'guard plants its violation in a package that survives, since packages/config went with ' +
      'the server tier (ADR-0051) and a guard at a path that does not exist proves nothing.',
    source: `async function work(): Promise<void> {}\nexport function go(): void {\n  work();\n}\n`,
  },
  {
    name: 'a screen may not hard-code user-facing text',
    // Must live under a path the rule's `files` glob actually covers, or the guard proves
    // that the rule is off rather than that it is on.
    path: 'apps/mobile/src/screens/__guard__.tsx',
    rule: 'no-restricted-syntax',
    must:
      'NFR-11 requires English and Japanese from the first release with no hard-coded ' +
      'user-facing string, and ADR-0028 forbids falling back to English — so a literal in a ' +
      'screen can never be Japanese, and the failure is a Japanese user reading English ' +
      'rather than a build error. ADR-0056 makes the catalogue total by type; this rule is ' +
      'what stops a screen going around it.',
    source: `export function Guard(): React.JSX.Element {\n  return <>Hard-coded copy</>;\n}\n`,
  },
  {
    name: 'a component may not hard-code a hex colour',
    path: 'packages/ui/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'The contrast and cvd gates read design-system.manifest.json. A hex typed into a ' +
      'component is checked by neither, and looks exactly like a value that passed — which ' +
      'is why ADR-0043 made the srgb field derived rather than authored. F-039 found the ' +
      'mirror image of this: a generated target nobody could import.',
    source: `export const brand = '#526A6B';\n`,
  },
  {
    name: 'the Lens may not write a frame to a file',
    path: 'apps/mobile/src/lens/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      'NFR-12 and ADR-0026: ordinary colour detection never transmits or stores imagery. The ' +
      'frame is disposed on the worklet thread and only a small numeric result crosses the ' +
      'bridge. A debug write during development is how that stops being true, and it would ' +
      'survive review as a one-line change.',
    source: `import * as FileSystem from 'expo-file-system';
export const x = FileSystem;
`,
  },
  {
    name: 'the Lens may not compute colour itself',
    path: 'apps/mobile/src/lens/__guard__.ts',
    rule: 'no-restricted-properties',
    must:
      'apps/mobile/AGENTS.md: "The engine is imported, never ported." E-008 records why no ' +
      'test can catch this — a mobile-only re-implementation makes the same fabric measure ' +
      'differently on two surfaces, both pass their own tests, and nothing runs both. The ' +
      'temptation is specific: a worklet cannot call arbitrary JavaScript, so when the engine ' +
      'will not run there the easy fix is to inline the arithmetic.',
    source: `export const linear = (v: number): number => Math.pow((v + 0.055) / 1.055, 2.4);
`,
  },
  {
    name: 'the store may not reach a Node API from its shipped entry',
    path: 'packages/store/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      'apps/mobile BUNDLES @irodora/store. A node:sqlite or node:fs import reachable from ' +
      'src/index.ts is a CRASH ON A PHONE, and it is invisible to every gate here — the ' +
      'tests run in Node, where it resolves perfectly. The Node driver is deliberately behind ' +
      'its own export (@irodora/store/node) which the app never imports; src/drivers/node.ts ' +
      'is exempted by explicit path in eslint.config.mjs, never by glob. This is the one ' +
      'place this package can produce a runtime failure that a green CI run would not see.',
    source: `import { DatabaseSync } from 'node:sqlite';\nexport const x = DatabaseSync;\n`,
  },
  {
    name: 'a component may not hard-code a functional colour notation',
    path: 'packages/ui/src/__guard__.ts',
    rule: 'no-restricted-syntax',
    must:
      'The hex form is the obvious one to ban and the easy one to route around. rgba() is ' +
      'what a translucent value is actually written as, and the manifest already emits both ' +
      'the rgba() form and the pre-composited hex precisely so a component never has to.',
    source: `export const veil = 'rgba(0, 0, 0, 0.14)';\n`,
  },
  {
    // F-078. `scripts/` is in no package, so `turbo run lint` never walked it — 23 files,
    // including every gate script, linted by nothing. A blind spot is worst exactly where
    // the checkers live, because every other gate’s green depends on code nothing checked.
    // The zone exists now; this is what keeps it existing.
    name: 'the gate scripts are linted at all',
    path: 'scripts/__guard__.mjs',
    rule: 'no-undef',
    must:
      'F-078 — scripts/ holds verify-state, verify-guards, verify-engine-purity, verify-claims ' +
      'and the rest: the code that decides whether everything else is allowed to ship.',
    source: `export const x = window.innerWidth;
`,
  },
];

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

console.log(`\n${BOLD}Irodora — boundary guards${OFF}\n`);

const eslint = new ESLint({ cwd: ROOT, errorOnUnmatchedPattern: false });
const notEnforced = [];
const couldNotRun = [];

for (const guard of GUARDS) {
  const abs = resolve(ROOT, guard.path);
  mkdirSync(dirname(abs), { recursive: true });

  let results;
  try {
    writeFileSync(abs, guard.source, 'utf8');
    results = await eslint.lintFiles([abs]);
  } catch (error) {
    couldNotRun.push({ guard, reason: error.message });
    continue;
  } finally {
    // Always remove the fixture, even if linting threw.
    if (existsSync(abs)) unlinkSync(abs);
  }

  const reported = new Set(results.flatMap((r) => r.messages.map((m) => m.ruleId).filter(Boolean)));

  // A fatal parse error means the file never reached the rules — that is a tooling
  // failure, not a boundary failure, and conflating them would send the next person
  // to fix the wrong thing.
  const fatal = results.flatMap((r) => r.messages.filter((m) => m.fatal));
  if (fatal.length) {
    couldNotRun.push({ guard, reason: `parse error: ${fatal[0].message}` });
    continue;
  }

  if (reported.has(guard.rule)) {
    console.log(`  ${GREEN}✓${OFF} ${guard.name}`);
    console.log(`    ${DIM}${guard.rule} fired at ${relative(ROOT, abs)}${OFF}`);
  } else {
    notEnforced.push({
      guard,
      reason: `expected "${guard.rule}"; ESLint reported ${
        reported.size ? [...reported].map((r) => `"${r}"`).join(', ') : 'nothing'
      }`,
    });
  }
}

/**
 * The guards above prove the RULES fire. None of them proves anything RUNS them.
 *
 * `pnpm lint` is the only thing that walks `scripts/`, and the ci-mirror check compares gate
 * COMMANDS — it sees `pnpm lint` and never reads what that script contains. Deleting
 * `eslint scripts` from the root package.json would reopen F-078 in full, 23 files at once,
 * with every gate still green. So the wiring is asserted rather than assumed.
 */
const lintScript =
  JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts?.lint ?? '';
if (lintScript.includes('eslint scripts')) {
  console.log(`  ${GREEN}✓${OFF} something actually runs those rules over scripts/`);
  console.log(`    ${DIM}the root "lint" script invokes eslint over scripts/${OFF}`);
} else {
  notEnforced.push({
    guard: {
      name: 'something actually runs those rules over scripts/',
      rule: 'package.json -> scripts.lint',
      must:
        'F-078 — the zone in eslint.config.mjs is inert unless a command walks the directory. ' +
        'turbo run lint walks PACKAGES, and scripts/ is not one.',
    },
    reason: `the root lint script is "${lintScript}", which never walks scripts/`,
  });
}

if (couldNotRun.length) {
  console.log(`\n${RED}${BOLD}${couldNotRun.length} guard(s) COULD NOT RUN${OFF}\n`);
  for (const { guard, reason } of couldNotRun) {
    console.log(`  ${RED}✗ ${guard.name}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(
      `    ${DIM}fix:${OFF} this is a TOOLING failure, not a boundary failure — repair the`,
    );
    console.log(`         guard runner before concluding anything about the rule\n`);
  }
}

if (notEnforced.length) {
  console.log(`\n${RED}${BOLD}${notEnforced.length} boundary(ies) NOT enforced${OFF}\n`);
  for (const { guard, reason } of notEnforced) {
    console.log(`  ${RED}✗ ${guard.name}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(`    ${DIM}why it matters:${OFF} ${guard.must}`);
    console.log(
      `    ${DIM}fix:${OFF} restore the rule in eslint.config.mjs — do NOT delete this guard\n`,
    );
  }
}

if (couldNotRun.length || notEnforced.length) {
  console.log(
    `${RED}${BOLD}Boundary guards FAILED.${OFF} A boundary that cannot fail is not a boundary.\n`,
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}All ${GUARDS.length} boundaries enforced, and the wiring that runs them.${OFF}\n`,
);
