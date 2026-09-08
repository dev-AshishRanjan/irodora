#!/usr/bin/env node
/**
 * A workspace package nothing in the workspace imports.
 *
 * ## The gap this fills
 *
 * `verify-reachability.mjs` asks *is this screen reachable* and found eight nobody could open.
 * This asks the same question one layer down, about packages, and the answer is **two**:
 *
 * | package | what is in it |
 * |---|---|
 * | `@irodora/color-harmony` | twelve harmony generators, gamut-mapped, golden-tested, gate 5 |
 * | `@irodora/contracts` | the Zod schemas that are the single source of runtime validation |
 *
 * Both build. Both test. Both pass every gate they have. **Neither appears in a single
 * `import` anywhere in this repository.**
 *
 * A package like that passes every test it has, because the tests check the package and
 * nothing checks that anything calls it
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 *
 * ## The question is about IMPORTS, not about manifests, and the first draft got that wrong
 *
 * This started as *"a workspace dependency of `apps/mobile` that `apps/mobile` never imports"*.
 * It reported `@irodora/color-harmony` as **not a dependency of the app at all** — which was
 * true, and which made the message nonsense.
 *
 * The real shape is worse than unused. `packages/color-core` **declares** `@irodora/color-harmony`
 * and never imports it, so the one dependency edge pointing at the harmony engine is a claim in
 * a manifest that no source backs. A manifest-based check would have called that edge a use.
 *
 * So the subject is the import graph, which is what actually runs. A manifest says what a
 * package is allowed to reach; only an import says what it does.
 *
 * ## Scope, and why it is not wider
 *
 * Every workspace package, checked against every zone's source **except its own**. A package
 * that only its own tests import is still dead — that is the case this exists for.
 *
 * `@irodora/testing` is imported by three engine packages and no application; that is not a
 * defect, and this check does not report it. The rule is *"nothing imports it"*, not *"the app
 * does not import it"* — the second would report every leaf of the engine and be switched off
 * within a week.
 *
 * ## Exceptions expire
 *
 * Same shape and reason as `unreached-tokens.json` and `unreachable-routes.json` (ADR-0088):
 * an entry names the feature that will consume the package and **fails once that feature is
 * done**. A dead exemption is caught rather than accumulating.
 *
 * ```
 * node scripts/verify-dead-exports.mjs
 * node scripts/verify-dead-exports.mjs --prove
 * ```
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATIONS = join(ROOT, '.harness/verification/unused-packages.json');

/** Where a workspace project can live. Matches `pnpm-workspace.yaml`'s own globs. */
const PROJECT_ROOTS = ['packages', 'apps'];

/**
 * Which of them this rule is ABOUT.
 *
 * An application is an entry point, not a library: nothing imports it, by definition, and that
 * is what it is for. The first run reported `@irodora/mobile` — a true statement and a
 * useless one, and exactly the kind of finding that gets a check switched off.
 *
 * Apps are still scanned as IMPORTERS, which is the half that matters: the app is how most of
 * this workspace becomes reachable at all.
 *
 * Whether an app's own screens are reachable is a different question with its own gate
 * (`verify-reachability.mjs`), and it is asked from the tab bar rather than from an import.
 */
const SUBJECT_ROOTS = ['packages'];

/** The source a project can import FROM. `test` counts: a package only its own tests use is dead. */
const SOURCE_DIRS = ['src', 'app', 'test'];

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Comments are source to a regex, and this file's own docblock names both dead packages. */
const BLOCK_COMMENT = new RegExp('/\\*[\\s\\S]*?\\*/', 'gu');
const LINE_COMMENT = new RegExp('(^|[^:\'"`\\\\])//[^\\n]*', 'gu');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/u.test(path)) out.push(path);
  }
  return out;
}

/** Every workspace project: its package name and its directory. */
export function projects(root = ROOT) {
  const found = [];
  for (const group of PROJECT_ROOTS) {
    const base = join(root, group);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      const manifest = join(base, entry, 'package.json');
      if (!existsSync(manifest)) continue;
      const name = JSON.parse(readFileSync(manifest, 'utf8')).name;
      if (typeof name === 'string')
        found.push({ name, dir: join(base, entry), subject: SUBJECT_ROOTS.includes(group) });
    }
  }
  return found;
}

/**
 * Which projects import each package.
 *
 * A project never counts as importing itself — a package's own internals reaching its own name
 * would make every package look used, which is the shape that turns this into a check that
 * reports nothing.
 */
export function importers(all = projects()) {
  const found = new Map(all.map((p) => [p.name, new Set()]));
  const patterns = new Map(
    all.map((p) => [
      p.name,
      new RegExp(
        `from\\s*['"]${p.name.replace(/[/\\^$*+?.()|[\]{}]/gu, '\\$&')}(?:/[^'"]*)?['"]`,
        'u',
      ),
    ]),
  );

  for (const project of all)
    for (const sub of SOURCE_DIRS)
      for (const file of walk(join(project.dir, sub))) {
        const source = readFileSync(file, 'utf8')
          .replace(BLOCK_COMMENT, ' ')
          .replace(LINE_COMMENT, '$1');
        for (const other of all) {
          if (other.name === project.name) continue;
          if (patterns.get(other.name).test(source)) found.get(other.name).add(project.name);
        }
      }
  return found;
}

export function run(root = ROOT) {
  const all = projects(root);
  const by = importers(all);
  return {
    all,
    // Subjects only. An app is scanned as an importer and never reported as unreached.
    dead: all.filter((p) => p.subject && by.get(p.name).size === 0).map((p) => p.name),
  };
}

function declarations() {
  const file = JSON.parse(readFileSync(DECLARATIONS, 'utf8'));
  const featureList = JSON.parse(
    readFileSync(join(ROOT, '.harness/state/feature_list.json'), 'utf8'),
  );
  return {
    file,
    ids: new Set(featureList.features.map((f) => f.id)),
    done: new Set(featureList.features.filter((f) => f.status === 'done').map((f) => f.id)),
  };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--prove')) prove();
  else main();
}

function main() {
  console.log(`\n${BOLD}Irodora — dead workspace packages${OFF}\n`);
  const { all, dead } = run();
  const { file, ids, done } = declarations();
  const byName = new Map(file.unused.map((e) => [e.package, e]));
  const problems = [];

  for (const name of dead)
    if (!byName.has(name))
      problems.push(
        `${name} is a workspace package and NOTHING in this repository imports it. It builds, ` +
          'it tests, and it passes every gate it has — because the tests check the package and ' +
          'nothing checks that anything calls it (NFR-26). Use it, or declare it with the ' +
          'feature that will.',
      );

  for (const [name, entry] of byName) {
    if (!all.some((p) => p.name === name))
      problems.push(`${name} is declared unused and is not a workspace package`);
    else if (!dead.includes(name))
      problems.push(
        `${name} is declared unused and IS imported. The declaration is dead — remove it. ` +
          'A list nobody prunes is a list nobody reads.',
      );
    if (!ids.has(entry.closedBy))
      problems.push(`${name} names ${entry.closedBy}, which is not a feature in feature_list.json`);
    else if (done.has(entry.closedBy))
      problems.push(
        `${name} names ${entry.closedBy}, which is DONE and did not consume it. Either the ` +
          'feature missed its own criterion, or the declaration should have moved with it.',
      );
  }

  console.log(
    `${DIM}  ${String(all.length)} workspace project(s); ${String(all.length - dead.length)} ` +
      `imported by something; ${String(dead.length)} by nothing, ${String(byName.size)} of them declared.${OFF}`,
  );
  console.log(
    `${DIM}  THE SUBJECT IS THE IMPORT GRAPH, NOT THE MANIFESTS. packages/color-core DECLARES ` +
      `@irodora/color-harmony and never imports it, so the one dependency edge pointing at the ` +
      `harmony engine is a claim no source backs — a manifest-based check would have called ` +
      `that edge a use. A manifest says what a package may reach; only an import says what it ` +
      `does.${OFF}`,
  );
  for (const [name, entry] of byName)
    console.log(
      `  ${YELLOW}•${OFF} ${BOLD}${name}${OFF} ${DIM}closedBy ${entry.closedBy} — ${entry.why}${OFF}`,
    );

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}`);
    console.log();
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}Every workspace package is imported by something.${OFF}\n`);
}

/** Over a synthetic workspace, so the cases stay readable as the real one changes. */
function prove() {
  console.log(`\n${BOLD}Dead packages — proof${OFF}\n`);
  const root = mkdtempSync(join(tmpdir(), 'irodora-dead-'));
  const make = (group, dir, name, files = {}) => {
    const base = join(root, group, dir);
    mkdirSync(join(base, 'src'), { recursive: true });
    writeFileSync(join(base, 'package.json'), JSON.stringify({ name }), 'utf8');
    for (const [rel, body] of Object.entries(files)) writeFileSync(join(base, rel), body, 'utf8');
  };

  make('packages', 'used', '@irodora/used', { 'src/index.ts': 'export const a = 1;\n' });
  make('packages', 'sub', '@irodora/sub', { 'src/index.ts': 'export const b = 2;\n' });
  make('packages', 'dead', '@irodora/dead', { 'src/index.ts': 'export const c = 3;\n' });
  make('packages', 'self', '@irodora/self', {
    // A package importing its OWN name must not count as a use.
    'src/index.ts': "export { x } from '@irodora/self/other';\n",
  });
  make('apps', 'app', '@irodora/app', {
    'src/screen.tsx': [
      "import { a } from '@irodora/used';",
      "import { b } from '@irodora/sub/testing';",
      "// import { c } from '@irodora/dead';",
      'export const z = [a, b];',
    ].join('\n'),
  });

  const { all, dead } = run(root);
  const cases = [
    ['it found the projects at all', all.length === 5],
    ['an imported package is not reported', !dead.includes('@irodora/used')],
    ['a package imported by SUBPATH is not reported', !dead.includes('@irodora/sub')],
    ['a package nothing imports IS reported', dead.includes('@irodora/dead')],
    ['DECOY — a mention in a comment is not a use', dead.includes('@irodora/dead')],
    ['DECOY — a package importing its OWN name is still dead', dead.includes('@irodora/self')],
    /*
      AN APP IS NEVER REPORTED. It is an entry point: nothing imports it, by definition. The
      first version of this check said so about `@irodora/mobile` — a true statement and a
      useless one, and exactly the finding that gets a check switched off.
    */
    ['DECOY — an application is not a subject, however unimported', !dead.includes('@irodora/app')],
  ];
  rmSync(root, { recursive: true, force: true });

  let ok = true;
  for (const [name, passed] of cases) {
    if (!passed) ok = false;
    console.log(`  ${passed ? `${GREEN}✓` : `${RED}✗`}${OFF} ${name}`);
  }
  console.log(
    ok
      ? `\n${GREEN}${BOLD}The check discriminates.${OFF} ${DIM}It finds the dead package and leaves the used one — including one used only through a subpath, and including one that imports its own name, which is the shape that would make every package look alive.${OFF}\n`
      : `\n${RED}${BOLD}The proof did not hold.${OFF}\n`,
  );
  if (!ok) process.exit(1);
}
