#!/usr/bin/env node
/**
 * NFR-22, out of the database and into the source.
 *
 * > *No code path infers a protected characteristic.* — F-037, criterion 2
 *
 * `packages/store/src/prohibited.ts` already refuses a **column**. It reads migration SQL and
 * `sqlite_master`, and that is the right place for a schema rule — but it cannot see a function
 * called `inferEthnicity` that never touches the database, and *"no code path"* is a claim about
 * code.
 *
 * So this scans shipped TypeScript for identifiers in the prohibited vocabulary.
 *
 * ## It reuses the store's list rather than keeping a second one
 *
 * `PROHIBITED_IDENTIFIERS` is imported from the built package. A copy here would agree on the
 * day it was written — the shape [E-013](../.harness/state/effects.json) exists to keep to one
 * place — and the copy that drifts is always the one nobody is looking at.
 *
 * ## The exemption list is the part that decides whether this rule survives
 *
 * Three files in this repository are **made of** the banned vocabulary: the rule itself, its
 * test, and this script. A check that fired on them would be switched off within a day, and the
 * real protection would go with it.
 *
 * So the exemption is **by exact path**, each with a reason, exactly as `verify-claims.mjs`
 * exempts `claims.json` — and `verify-no-inference-proof.mjs` plants a violation in a
 * NON-exempt file and asserts it is caught, so widening the exemption to silence a real finding
 * fails the proof.
 *
 * ## What it cannot see, and says so on every run
 *
 * A characteristic inferred without ever naming it — a model that predicts an age band from a
 * column called `x7`. Source analysis cannot reach that, and no check in this repository can.
 * What it removes is the version somebody would actually write.
 *
 * ```
 * node scripts/verify-no-inference.mjs
 * ```
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadStorePackage, ROOT } from './corpus-io.mjs';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const { PROHIBITED_IDENTIFIERS } = await loadStorePackage();

if (!Array.isArray(PROHIBITED_IDENTIFIERS) || PROHIBITED_IDENTIFIERS.length === 0) {
  console.error(
    `${RED}no-inference: the prohibited vocabulary is empty. That is not a passing state — ` +
      `this check has nothing to look for.${OFF}`,
  );
  process.exit(1);
}

/** Where shipped source lives. Generated output and third-party code are not ours to police. */
const ZONES = [join(ROOT, 'packages'), join(ROOT, 'apps'), join(ROOT, 'scripts')];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.turbo',
  '.git',
  '.expo',
  'coverage',
  'generated',
  'fixtures',
  'android',
  'ios',
]);

/**
 * Files exempt by exact path, each because it is MADE of the vocabulary.
 *
 * Kept to three, and every addition should be argued for: an exemption is a hole shaped exactly
 * like the thing this check exists to find.
 */
const EXEMPT = new Map([
  ['packages/store/src/prohibited.ts', 'the rule itself — it has to name what it refuses'],
  [
    'packages/store/test/prohibited.test.ts',
    'the rule’s proof — every family is planted here as a decoy',
  ],
  ['scripts/verify-no-inference.mjs', 'this file, which describes the vocabulary it scans for'],
  [
    'scripts/verify-no-inference-proof.mjs',
    'the proof, which plants a violation on purpose and must not be one',
  ],
]);

const SCAN = /\.(ts|tsx|mjs)$/;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && SCAN.test(entry.name)) acc.push(full);
  }
  return acc;
}

const posix = (p) => p.split(sep).join('/');

/**
 * Strip comments and string literals before matching.
 *
 * The same decision `sqlCode` makes, for the same reason: this repository discusses these
 * concepts constantly in prose — ADR-0010, the profile modules, the copy that says what the
 * product refuses to do — and a check that fired on a doc comment would be deleted for crying
 * wolf. What is scanned is **identifiers**.
 */
/**
 * Split an identifier into words: `inferEthnicity` → `infer`, `ethnicity`.
 *
 * **This is what makes prefix matching safe.** The SQL rule matches `\bages?\b` between word
 * boundaries, which works for `age_band` and fails on `ageBand` — and matching a bare substring
 * instead would flag `average`, `percentage`, `storage`, `language` and `usage`. Tokenising
 * first gives both: `ageBand` becomes `age` + `band`, while `percentage` stays one word that
 * does not begin with "age".
 *
 * The proof found this. The first version reused the SQL patterns and silently accepted both
 * `inferEthnicity` and `ageBand`.
 */
export function words(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

export function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

const files = ZONES.flatMap((zone) => walk(zone));
const violations = [];
let scanned = 0;

for (const file of files) {
  const rel = posix(relative(ROOT, file));
  if (EXEMPT.has(rel)) continue;
  scanned += 1;
  const code = codeOnly(readFileSync(file, 'utf8'));
  // Identifiers, not the raw text: the vocabulary is about what a FIELD or a FUNCTION is called.
  // One finding per file per family — a file with forty offending identifiers is one problem to
  // fix, and forty lines of output is a report nobody reads to the end.
  const seen = new Set();
  for (const identifier of code.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []) {
    const tokens = words(identifier);
    const phrase = tokens.join(' ');
    for (const rule of PROHIBITED_IDENTIFIERS) {
      if (seen.has(rule.id)) continue;
      const hit = rule.stems.some((stem) =>
        // A single-word stem matches a token by prefix; a multi-word stem has to appear as a
        // SEQUENCE of tokens, which is how `bodyShape` is caught while `body` is not.
        stem.includes(' ') ? phrase.includes(stem) : tokens.some((t) => t.startsWith(stem)),
      );
      if (!hit) continue;
      seen.add(rule.id);
      violations.push({ rel, id: rule.id, match: identifier, why: rule.why });
    }
  }
}

console.log(`\n${BOLD}Irodora — no protected-characteristic inference${OFF}\n`);
console.log(
  `${DIM}  ${String(scanned)} source file(s) scanned against ` +
    `${String(PROHIBITED_IDENTIFIERS.length)} prohibited famil(ies); ` +
    `${String(EXEMPT.size)} file(s) exempt by path${OFF}`,
);
console.log(
  `${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: a characteristic inferred without ever naming it — ` +
    `a model that predicts an age band from a column called \`x7\`. No source analysis reaches ` +
    `that. What this removes is the version somebody would actually write.${OFF}`,
);

if (scanned === 0) {
  console.log(
    `\n${RED}${BOLD}No source files were scanned.${OFF} A check that looked at nothing has ` +
      `either lost its inputs or is pointed at the wrong place, and both are failures.\n`,
  );
  process.exit(1);
}

if (violations.length > 0) {
  console.log(
    `\n${RED}${BOLD}${String(violations.length)} prohibited identifier(s) in source${OFF}\n`,
  );
  for (const v of violations)
    console.log(`  ${RED}✗${OFF} ${v.rel}: "${v.match}" (${v.id})\n    ${DIM}${v.why}${OFF}\n`);
  console.log(
    `${RED}NFR-22 is not a lint rule to satisfy — the characteristic is outside the product ` +
      `(ADR-0010). If a dimension needs somewhere to live, it is a RANGE with a confidence on ` +
      `personal_color_profile.${OFF}\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}No code path names a protected characteristic.${OFF}\n`);
