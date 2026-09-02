/**
 * "Every `unsafeFromHex` call site is reviewed" — made countable.
 *
 * ADR-0005 and `packages/color-core/AGENTS.md` both say the name is unpleasant on purpose
 * and that every call site is reviewed. That is a sentence about people, and a sentence
 * about people is not a check. This is the check: the call sites are enumerated below, and a
 * new one fails the build until someone adds it to the list — which is the moment the review
 * actually happens.
 *
 * ## A reference, not a mention (F-127)
 *
 * This decided a file was a call site with `readFileSync(file).includes('unsafeFromHex')` — a
 * substring match over the whole file, comments included. So `apps/mobile/src/measure.ts` was
 * reported as an **unreviewed call site for a doc comment that said the opposite**: that a typed
 * measurement is `reference` while the unchecked hex path stays `declared` and is not taken.
 *
 * **The wrong fix was available and was not taken.** Adding the file to `REVIEWED` would have
 * made lint green by declaring a call site that does not exist — and worse, pre-approved a real
 * call at that path, which is the one thing this census exists to prevent. The sentence was
 * reworded instead, and the reword deleted the explanation.
 *
 * That cost is worse than a false positive. This census's whole argument is that prose is not a
 * check; **a check that cannot tell a call from a sentence teaches people to stop writing the
 * sentences**, and the prose it suppresses is exactly the kind that says which boundary is being
 * preserved and why.
 *
 * So a file is a call site when its **syntax tree** contains an import naming the function or a
 * call of it. A comment, a string and a longer identifier that merely contains the name are
 * none of those. `typescript` is already a devDependency and resolves from here — F-116
 * established both the technique and the reason.
 *
 * **Failing closed is unchanged and is not what was wrong.** A file that will not parse is
 * reported, never skipped.
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
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** The function whose every use is reviewed. */
const NAME = 'unsafeFromHex';

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

/**
 * Whether this source **uses** the function, as against mentioning it.
 *
 * Two shapes count, and they are the two ways a name can reach running code:
 *
 * - an **import** that binds it — including `as` renames, because the local name is then the
 *   function and a call through it is a call;
 * - a **call** of it, whether as a bare identifier or as a property (`core.unsafeFromHex(…)`).
 *
 * Everything else is a mention. A comment is not in the tree at all; a string literal is a
 * `StringLiteral` rather than an `Identifier`; and `notUnsafeFromHexReally` is a different
 * identifier, which is precisely what a substring match could not tell.
 *
 * Returns `{ uses, why }` so a finding can name what it found rather than only that it did.
 */
function usage(text, path) {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  let why = null;

  const visit = (node) => {
    if (why !== null) return;

    // An import that binds the name. `propertyName` is the exported name when renamed.
    if (ts.isImportSpecifier(node)) {
      const exported = node.propertyName?.text ?? node.name.text;
      if (exported === NAME) {
        why = `imported as \`${node.name.text}\``;
        return;
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === NAME) why = 'called directly';
      else if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.name) &&
        callee.name.text === NAME
      )
        why = `called as \`${callee.getText(file)}\``;
      if (why !== null) return;
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(file, visit);
  return { uses: why !== null, why };
}

const scanned = [];
const found = [];
const mentions = [];
for (const root of SEARCH_ROOTS)
  for (const file of sourceFiles(join(ROOT, root))) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    scanned.push(rel);
    const text = readFileSync(file, 'utf8');
    // The cheap filter first: a file that does not contain the string cannot use the function,
    // and parsing every source file in the repository to learn that would be wasteful.
    if (!text.includes(NAME)) continue;
    if (NOT_CALL_SITES.has(rel)) continue;
    const { uses, why } = usage(text, file);
    if (uses) found.push({ path: rel, why });
    else mentions.push(rel);
  }

const failures = [];

// The decoy: without this, a broken walk reports zero call sites and passes forever.
if (!scanned.includes('packages/color-core/src/color.ts'))
  failures.push('the walk never reached packages/color-core/src/color.ts — it is not working');
if (scanned.length < 50) failures.push(`the walk found only ${scanned.length} source files`);
if (scanned.some((f) => f.includes('node_modules'))) failures.push('the walk entered node_modules');

for (const site of found)
  if (!REVIEWED.includes(site.path))
    failures.push(
      `UNREVIEWED call site: ${site.path} (${site.why})\n` +
        `      \`${NAME}\` is the ONE untracked construction path in the product\n` +
        `      (ADR-0005). Confirm the origin genuinely has no provenance to record, then\n` +
        `      add the path to REVIEWED in this file. Do not delete the check.`,
    );

const foundPaths = found.map((f) => f.path);
for (const site of REVIEWED)
  if (!foundPaths.includes(site))
    failures.push(
      `STALE review entry: ${site} no longer calls ${NAME}. Remove it — a stale ` +
        'entry silently re-authorises the next call added at the same path.',
    );

/* ============================================================ the proof, before the verdict */

/**
 * Cases this census must judge correctly, run on every invocation.
 *
 * A narrowed matcher can stop matching, and a check that accepts everything is worse than the
 * false positive it replaced because nobody ever sees it fail. So the REJECT cases and the
 * ACCEPT cases are equally load-bearing
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * These are parsed in memory rather than planted on disk: `usage` takes source text, so there
 * is nothing to clean up and no window in which a stray file could be committed.
 */
const PROOF = [
  { name: 'a direct call', uses: true, source: `const c = ${NAME}('#abc');\n` },
  {
    name: 'a call through a namespace',
    uses: true,
    source: `import * as core from '@irodora/color-core';\nconst c = core.${NAME}('#abc');\n`,
  },
  {
    name: 'an import that renames it',
    uses: true,
    source: `import { ${NAME} as fromHex } from '@irodora/color-core';\nconst c = fromHex('#abc');\n`,
  },
  {
    name: 'an import that binds it and does not call it yet',
    uses: true,
    source: `import { ${NAME} } from '@irodora/color-core';\n`,
  },
  // The four the substring match got wrong. Each is a MENTION.
  { name: 'ACCEPT — a line comment naming it', uses: false, source: `// never call ${NAME}\n` },
  {
    name: 'ACCEPT — a block comment naming it',
    uses: false,
    source: `/**\n * The unchecked path, \`${NAME}\`, is not taken here.\n */\nexport const x = 1;\n`,
  },
  {
    name: 'ACCEPT — the name inside a string literal',
    uses: false,
    source: `const message = 'do not use ${NAME}';\n`,
  },
  {
    name: 'ACCEPT — a longer identifier that contains the name',
    uses: false,
    source: `const not${NAME}Really = 1;\nconsole.log(not${NAME}Really);\n`,
  },
  {
    /*
     * AND THE SAME IDENTIFIER CALLED. The case above binds it; a mutation loosening the CALL
     * matcher to `.includes(NAME)` left that green, because nothing there is a call. An exact
     * comparison is the claim, so a call is what has to test it.
     */
    name: 'ACCEPT — a longer identifier that is CALLED',
    uses: false,
    source: `const x = not${NAME}Really('#abc');\n`,
  },
];

for (const c of PROOF) {
  const { uses } = usage(c.source, 'proof.ts');
  if (uses !== c.uses)
    failures.push(
      `PROOF CASE FAILED — "${c.name}": expected ${c.uses ? 'a call site' : 'a mention'}, ` +
        `got ${uses ? 'a call site' : 'a mention'}. The matcher is wrong; fix it rather than ` +
        'the case.',
    );
}

console.log(`${BOLD}Irodora — unsafeFromHex call-site census${OFF}`);
console.log(
  `${DIM}  ${scanned.length} source files scanned · ${found.length} call site(s) · ` +
    `${REVIEWED.length} reviewed · ${PROOF.length} proof case(s)${OFF}`,
);
if (mentions.length > 0)
  console.log(
    `${DIM}  ${mentions.length} file(s) NAME it without using it, and are correctly not call ` +
      `sites: ${mentions.join(', ')}${OFF}`,
  );
console.log(
  `${DIM}  NOT CHECKED HERE: a call reached through a variable, a callback or a dynamic ` +
    `property. That is the limit of source analysis, and it is stated rather than assumed away.${OFF}`,
);

if (failures.length === 0) {
  console.log(`\n${GREEN}${BOLD}Every call site is accounted for.${OFF}`);
  process.exit(0);
}

console.log(`\n${RED}${BOLD}${failures.length} problem(s)${OFF}`);
for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
process.exit(1);
