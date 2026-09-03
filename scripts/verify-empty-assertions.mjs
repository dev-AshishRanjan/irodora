/**
 * `toEqual([])` is banned, because it accepts an array that is not empty (F-133).
 *
 * ## The finding
 *
 * ```
 * const a = []; a.push(undefined);
 * expect(a).toEqual([]);   // PASSES
 * ```
 *
 * `toEqual` ignores `undefined`, and that extends to array elements and to the length difference
 * they create. It is documented for object *properties*; nothing warns you about the array case,
 * and it did not seem plausible until it was run.
 *
 * F-129 found it the expensive way. Its export screen recorded what it handed a sink and asserted
 * `toEqual([])` for *"nothing was written"*. A mutation removed a `return` after a format refuses,
 * so the screen handed the sink an `undefined` file — and the assertion stayed green. TypeScript
 * would have caught the use-before-assignment; jest runs through babel, which strips the types.
 *
 * ## Why a ban rather than a survey
 *
 * The feature was filed to survey eighty-five call sites and record why each was sound. Most
 * were: a `filter` or `map` result cannot contain `undefined`, so the hole cannot open there.
 *
 * **But "most were sound" is a fact about today's code, not a rule.** Every one of those
 * assertions says *this collection is empty*, which is a claim about **length** — and there is a
 * matcher that measures one. `toStrictEqual([])` closes the hole too, and is right where the
 * value rather than the emptiness is the point.
 *
 * So there is no allowlist here and no judgement to keep current: the banned form is never the
 * better choice, and the two replacements are both stronger.
 *
 * Both replacements were **watched rejecting `[undefined]`** before this script was written.
 * Neither is assumed.
 *
 * Runs inside `pnpm lint`, beside the other source scans.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import ts from 'typescript';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** The banned call, assembled — this file is not scanned, but the habit is the point (F-132). */
const BANNED = `toEqual(${'['}${']'})`;

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', '.next', 'coverage', '.expo']);

/**
 * Where tests live. `scripts/` is absent because nothing under it is a test.
 *
 * The scan **parses** rather than matching text, so a comment naming the banned form is not an
 * offence — which it was, on the first run of this very check: F-129's test carries a note saying
 * why it uses `toHaveLength(0)`, and the note was reported as the thing it warns against.
 *
 * **Fifth instance of that class in one session**, in the feature written to close the fourth.
 * F-132's answer applies unchanged: a comment is not in the syntax tree, so the whole shape
 * disappears rather than being worked around
 * [[a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it]].
 */
const SEARCH_ROOTS = ['apps', 'packages', 'tests'];

function* testFiles(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* testFiles(full);
    else if (/\.(?:test|spec)\.(?:ts|tsx)$/u.test(name)) yield full;
  }
}

/**
 * Every `.toEqual([])` in a source file, by line.
 *
 * A `CallExpression` whose callee is a property access named `toEqual`, with exactly one
 * argument that is an **empty array literal**. `.not.toEqual([])` matches too — the negation is
 * a different property in the chain, and the matcher at the end is the same one.
 *
 * `toEqual(['a'])` and `toEqual({})` are not offences: the hole is specific to an empty array,
 * where an element that is `undefined` is ignored and the length difference with it.
 */
function offencesIn(text, file) {
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const found = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name =
        ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)
          ? callee.name.text
          : null;
      const [only] = node.arguments;
      if (
        name === 'toEqual' &&
        node.arguments.length === 1 &&
        only !== undefined &&
        ts.isArrayLiteralExpression(only) &&
        only.elements.length === 0
      ) {
        const { line } = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
        found.push({ line: line + 1, text: node.getText(parsed).slice(0, 90) });
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(parsed, visit);
  return found;
}

const scanned = [];
const offenders = [];
for (const root of SEARCH_ROOTS)
  for (const file of testFiles(join(ROOT, root))) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    scanned.push(rel);
    const text = readFileSync(file, 'utf8');
    // The cheap filter first: a file without the characters cannot contain the call, and parsing
    // every test in the repository to learn that would be wasteful.
    if (!text.includes(BANNED)) continue;
    for (const at of offencesIn(text, file))
      offenders.push({ file: rel, line: at.line, text: at.text });
  }

const failures = [];

// The walk's own decoys: a broken walk reports zero offenders and passes for ever.
if (scanned.length < 40) failures.push(`the walk found only ${scanned.length} test file(s)`);
if (!scanned.some((f) => f.startsWith('packages/')))
  failures.push('the walk reached no package test — it is not working');
if (!scanned.some((f) => f.startsWith('apps/')))
  failures.push('the walk reached no app test — it is not working');

for (const o of offenders)
  failures.push(
    `${o.file}:${String(o.line)}  ${o.text}\n` +
      `      ${BANNED} accepts an array holding \`undefined\`, so it does not assert that a\n` +
      '      collection is empty. Use `toHaveLength(0)`, or `toStrictEqual([])` where the value\n' +
      '      rather than the emptiness is the point. Both were watched rejecting it (F-133).',
  );

/* ============================================================ the proof, before the verdict */

/**
 * The rule, applied to strings, on every run.
 *
 * A matcher check that never sees an offender is indistinguishable from one that cannot find
 * any [[a-decoy-that-is-not-broken-proves-nothing]]. The REJECT case is what says this can fail;
 * the ACCEPT cases are what say it has not been widened into a ban on everything.
 */
const PROOF = [
  { name: 'the banned form is found', line: `expect(x).${BANNED};`, offends: true },
  {
    name: 'and its negation, which is the same matcher',
    line: `expect(x).not.${BANNED};`,
    offends: true,
  },
  { name: 'ACCEPT — toHaveLength(0)', line: 'expect(x).toHaveLength(0);', offends: false },
  { name: 'ACCEPT — toStrictEqual([])', line: 'expect(x).toStrictEqual([]);', offends: false },
  {
    name: 'ACCEPT — toEqual with something in it',
    line: "expect(x).toEqual(['a']);",
    offends: false,
  },
  { name: 'ACCEPT — toEqual on an object', line: 'expect(x).toEqual({});', offends: false },
  {
    /*
     * THE CASE THIS CHECK FAILED ON ITS OWN FIRST RUN. A note explaining why the banned form is
     * not used names the banned form, and a substring scan reported the note. Fifth instance of
     * that class in one session, in the feature written to close the fourth.
     */
    name: 'ACCEPT — a comment naming the banned form',
    line: `// use toHaveLength(0), never ${BANNED}\nexpect(x).toHaveLength(0);`,
    offends: false,
  },
  {
    name: 'ACCEPT — the banned form inside a string',
    line: `const advice = 'do not write ${BANNED}';`,
    offends: false,
  },
];

for (const c of PROOF) {
  const found = offencesIn(c.line, 'proof.ts').length > 0;
  if (found !== c.offends)
    failures.push(
      `PROOF CASE FAILED — "${c.name}": expected ${c.offends ? 'an offence' : 'no offence'}, ` +
        `got ${found ? 'an offence' : 'no offence'}. Fix the rule rather than the case.`,
    );
}

console.log(`${BOLD}Irodora — empty-collection assertions${OFF}`);
console.log(
  `${DIM}  ${scanned.length} test file(s) scanned · ${offenders.length} offence(s) · ` +
    `${PROOF.length} proof case(s)${OFF}`,
);
console.log(
  `${DIM}  NOT CHECKED HERE: an emptiness claim written some other way — a length compared by\n` +
    `      hand, a custom matcher, or the banned call assembled from parts. This is a source\n` +
    `      scan, and it catches the form people actually write.${OFF}`,
);

if (failures.length === 0) {
  console.log(`\n${GREEN}${BOLD}Every emptiness assertion measures emptiness.${OFF}`);
  process.exit(0);
}

console.log(`\n${RED}${BOLD}${failures.length} problem(s)${OFF}`);
for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
process.exit(1);
