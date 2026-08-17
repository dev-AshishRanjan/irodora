/**
 * "Every `unsafeFromHex` call site is reviewed" — made countable.
 *
 * ADR-0005 and `packages/color-core/AGENTS.md` both say the name is unpleasant on purpose
 * and that every call site is reviewed. That is a sentence about people, and a sentence
 * about people is not a check. This is the check: the call sites are enumerated below, and a
 * new one fails the build until someone adds it to the list — which is the moment the review
 * actually happens.
 *
 * ## Why this is a script and not a test in `packages/color-core`
 *
 * It was one, briefly. The colour-engine ESLint zone forbids `node:` imports across every
 * TypeScript file under `packages/color-…` — tests included — because the engine must run
 * identically in Node, the browser and React Native (NFR-3). A directory walk needs
 * `node:fs`, so the
 * choice was to weaken the strictest guard in the repository or to move the census out of
 * the engine. It is a REPOSITORY-wide question anyway: the call sites it must find are in
 * `apps/` and `packages/` alike, not in `color-core`.
 *
 * Runs inside `pnpm lint`, beside `verify-guards.mjs` and `verify-engine-purity.mjs`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/**
 * The reviewed call sites, by repository-relative path.
 *
 * Empty is the correct state today: nothing in the product calls it yet. Adding a path here
 * is the review — do it deliberately, having confirmed the origin genuinely has no
 * provenance to record.
 */
const REVIEWED = [];

/** Where the function is defined, exported and tested. None of these is a *use* of it. */
const NOT_CALL_SITES = new Set([
  'packages/color-core/src/color.ts',
  'packages/color-core/src/index.ts',
  'packages/color-core/test/color.test.ts',
]);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', '.next', 'coverage', '.expo']);
const SEARCH_ROOTS = ['packages', 'apps', 'content', 'tests'];

function* sourceFiles(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    // A directory walk that enters node_modules is checking someone else's repository.
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.(?:ts|tsx|mts|mjs|js)$/u.test(name)) yield full;
  }
}

const scanned = [];
const found = [];
for (const root of SEARCH_ROOTS)
  for (const file of sourceFiles(join(ROOT, root))) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    scanned.push(rel);
    if (!readFileSync(file, 'utf8').includes('unsafeFromHex')) continue;
    if (NOT_CALL_SITES.has(rel)) continue;
    found.push(rel);
  }

const failures = [];

// The decoy: without this, a broken walk reports zero call sites and passes forever.
if (!scanned.includes('packages/color-core/src/color.ts'))
  failures.push('the walk never reached packages/color-core/src/color.ts — it is not working');
if (scanned.length < 50) failures.push(`the walk found only ${scanned.length} source files`);
if (scanned.some((f) => f.includes('node_modules'))) failures.push('the walk entered node_modules');

for (const site of found)
  if (!REVIEWED.includes(site))
    failures.push(
      `UNREVIEWED call site: ${site}\n` +
        `      \`unsafeFromHex\` is the ONE untracked construction path in the product\n` +
        `      (ADR-0005). Confirm the origin genuinely has no provenance to record, then\n` +
        `      add the path to REVIEWED in this file. Do not delete the check.`,
    );

for (const site of REVIEWED)
  if (!found.includes(site))
    failures.push(
      `STALE review entry: ${site} no longer calls unsafeFromHex. Remove it — a stale ` +
        'entry silently re-authorises the next call added at the same path.',
    );

console.log(`${BOLD}Irodora — unsafeFromHex call-site census${OFF}`);
console.log(
  `${DIM}  ${scanned.length} source files scanned · ${found.length} call site(s) · ${REVIEWED.length} reviewed${OFF}`,
);

if (failures.length === 0) {
  console.log(`\n${GREEN}${BOLD}Every call site is accounted for.${OFF}`);
  process.exit(0);
}

console.log(`\n${RED}${BOLD}${failures.length} problem(s)${OFF}`);
for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
process.exit(1);
