#!/usr/bin/env node
/**
 * Irodora — boundary guard proof.
 *
 * The architectural boundaries in ADR-0001 and ADR-0004 are enforced by ESLint rules.
 * A rule nobody has watched fail is not a boundary — it is a configuration file that
 * happens to parse. This script writes a deliberately violating file at the exact path
 * each rule targets, runs ESLint on it, and asserts the expected rule fires.
 *
 * It is the negative-test-needs-a-decoy discipline applied to lint: an empty fixture
 * would pass whether or not the rule works.
 *
 * Fixtures are written and deleted in the same run — nothing violating is ever committed.
 * Run after `pnpm install`; it needs ESLint on disk.
 */

import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
    source: `export const x = typeof window;\n`,
  },
  {
    name: 'colour engine keeps deep-import protection',
    path: 'packages/cvd-engine/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must:
      'A later ESLint config object REPLACES no-restricted-imports rather than merging. ' +
      'Without the patterns repeated in the engine override, deep imports become legal in ' +
      'exactly the packages that need protecting most.',
    source: `import { Xyz } from '@irodora/color-spaces/src/index.js';\nexport type A = Xyz;\n`,
  },
  {
    name: 'packages may not be deep-imported',
    path: 'packages/contracts/src/__guard__.ts',
    rule: 'no-restricted-imports',
    must: 'A package entry point is a contract; an internal path is not',
    source: `import { CORE_VERSION } from '@irodora/color-core/src/index.js';\nexport const v = CORE_VERSION;\n`,
  },
  {
    name: 'a floating promise is an error',
    path: 'packages/config/src/__guard__.ts',
    rule: '@typescript-eslint/no-floating-promises',
    must: 'A dropped await on an async port is a bug the compiler cannot see',
    source: `async function work(): Promise<void> {}\nexport function go(): void {\n  work();\n}\n`,
  },
];

const GREEN = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', BOLD = '\x1b[1m', OFF = '\x1b[0m';

function lintOne(absPath) {
  try {
    const out = execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', absPath],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(out);
  } catch (error) {
    // ESLint exits non-zero when it reports errors — which is the expected case here.
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`ESLint could not run: ${error.stderr || error.message}`);
  }
}

console.log(`\n${BOLD}Irodora — boundary guards${OFF}\n`);

const failures = [];

for (const guard of GUARDS) {
  const abs = resolve(ROOT, guard.path);
  mkdirSync(dirname(abs), { recursive: true });
  let results;

  try {
    writeFileSync(abs, guard.source, 'utf8');
    results = lintOne(abs);
  } catch (error) {
    failures.push({ guard, reason: error.message });
    continue;
  } finally {
    // Always remove the fixture, even if ESLint threw.
    if (existsSync(abs)) unlinkSync(abs);
  }

  const reported = new Set(
    (results ?? []).flatMap((r) => (r.messages ?? []).map((m) => m.ruleId).filter(Boolean)),
  );

  if (reported.has(guard.rule)) {
    console.log(`  ${GREEN}✓${OFF} ${guard.name}`);
    console.log(`    ${DIM}${guard.rule} fired at ${relative(ROOT, abs)}${OFF}`);
  } else {
    failures.push({
      guard,
      reason: `expected "${guard.rule}"; ESLint reported ${
        reported.size ? [...reported].map((r) => `"${r}"`).join(', ') : 'nothing'
      }`,
    });
  }
}

if (failures.length) {
  console.log(`\n${RED}${BOLD}${failures.length} guard(s) NOT enforced${OFF}\n`);
  for (const { guard, reason } of failures) {
    console.log(`  ${RED}✗ ${guard.name}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(`    ${DIM}why it matters:${OFF} ${guard.must}`);
    console.log(`    ${DIM}fix:${OFF} restore the rule in eslint.config.mjs — do NOT delete this guard\n`);
  }
  console.log(
    `${RED}${BOLD}Boundary guards FAILED.${OFF} A boundary that cannot fail is not a boundary.\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}All ${GUARDS.length} boundaries enforced.${OFF}\n`);
