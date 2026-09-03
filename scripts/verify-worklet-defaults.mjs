/**
 * A worklet may reference a captured variable only from its BODY — never from a parameter
 * default.
 *
 * ## The defect this exists for, found on a device (F-138)
 *
 * The Lens showed *"the frame processor threw: Property `MAX_SAMPLES_PER_FRAME` doesn't exist"*
 * over a live preview, on every frame. The constant was captured correctly — it was in
 * `__closure` — but the plugin unpacks the closure as the **first statement of the body**:
 *
 * ```js
 * (function sampleStride(regionPixels, max = MAX_SAMPLES_PER_FRAME) {
 *   const { MAX_SAMPLES_PER_FRAME } = this.__closure;   // too late
 * ```
 *
 * A parameter default is evaluated **before** the body, in the parameter scope, which cannot
 * see a body-level `const`. The lookup falls through to the worklet runtime's global object,
 * where nothing of that name exists.
 *
 * ## Why the plugin's own output is the oracle
 *
 * The first hypothesis about this bug — that the plugin fails to CAPTURE identifiers in
 * parameter defaults — was wrong, and reading `getClosure` disproved it. So this check does not
 * re-derive what the plugin would do. **It runs the plugin and reads what it emitted**, which
 * is the one source that cannot disagree with what ships.
 *
 * The cost is that this needs `node_modules`, so it runs in `lint` rather than in gate 0.
 *
 * ## Why no gate could see it before
 *
 * It throws only when the default is USED. Every test calls `sampleStride` on the JS thread,
 * where the real module binding exists, so all of them passed. Jest has one runtime and no
 * worklet boundary — the same reason F-116 exists, one layer in: that feature made the
 * `'worklet'` DIRECTIVE checkable, this makes what a marked worklet may REFERENCE checkable.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(ROOT, 'apps', 'mobile', 'src');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/*
 * Resolved through the app's own dependency graph rather than by a path with a pnpm hash in it.
 * `@babel/core` is not a dependency of `apps/mobile`, but it IS one of the plugin's — so the
 * plugin's own resolver is where to ask. A hard-coded `.pnpm/...` path would break on the next
 * lockfile change, which is the failure mode that put a dead link in a plan file (F-118).
 */
const appRequire = createRequire(join(ROOT, 'apps', 'mobile', 'package.json'));
const pluginPath = appRequire.resolve('react-native-worklets/plugin');
const pluginRequire = createRequire(pluginPath);

const babel = pluginRequire('@babel/core');
const typescriptPreset = pluginRequire('@babel/preset-typescript');
const workletsPlugin = pluginRequire(pluginPath);

/** Every `.ts`/`.tsx` under the app's `src`. */
function sources(dir = SOURCE_ROOT, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, found);
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) found.push(path);
  }
  return found;
}

async function emitted(source, filename) {
  const result = await babel.transformAsync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [[typescriptPreset, { isTSX: filename.endsWith('.tsx'), allExtensions: true }]],
    plugins: [workletsPlugin],
  });
  return result?.code ?? '';
}

/** The names a worklet unpacks from `this.__closure`. */
function closureNames(code) {
  const m = /const\s*\{([^}]*)\}\s*=\s*this\.__closure/.exec(code);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((part) => part.trim().split(':')[0]?.trim() ?? '')
    .filter(Boolean);
}

/** The worklet's parameter list, as source text. */
function parameterText(code) {
  const open = code.indexOf('(', code.indexOf('function'));
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return '';
}

/** Every captured name this worklet reads from a parameter default. */
export function offendingNames(workletCode) {
  const parameters = parameterText(workletCode);
  if (!parameters.includes('=')) return [];
  return closureNames(workletCode).filter((name) =>
    new RegExp(`=\\s*[^,)]*\\b${name}\\b`).test(parameters),
  );
}

/** Each emitted worklet in a transformed module. */
export function workletsIn(transformed) {
  const found = [];
  for (const m of transformed.matchAll(/code:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const code = JSON.parse(`"${m[1]}"`);
    const name = /function\s+([A-Za-z0-9_$]+)/.exec(code)?.[1] ?? '(anonymous)';
    found.push({ name, code });
  }
  return found;
}

async function main() {
  console.log(`\n${BOLD}Irodora — what a worklet may reference${OFF}\n`);

  const files = sources().filter((file) => readFileSync(file, 'utf8').includes("'worklet'"));
  let checked = 0;
  const problems = [];

  for (const file of files) {
    const code = await emitted(readFileSync(file, 'utf8'), file);
    for (const worklet of workletsIn(code)) {
      checked += 1;
      const offending = offendingNames(worklet.code);
      if (offending.length > 0) problems.push({ file, worklet: worklet.name, names: offending });
    }
  }

  const shown = (file) => relative(ROOT, file).split('\\').join('/');

  if (problems.length > 0) {
    for (const p of problems) {
      console.error(`  ${RED}✗${OFF} ${shown(p.file)} — ${p.worklet}`);
      console.error(`      reads ${p.names.join(', ')} from a parameter default`);
    }
    console.error(
      `\n  A worklet unpacks its closure as the FIRST STATEMENT OF ITS BODY, and a parameter\n` +
        `  default is evaluated before the body runs. The name resolves against the worklet\n` +
        `  runtime's global object, where it does not exist, and the frame processor throws on\n` +
        `  every frame.\n\n  Read it in the body instead:  const cap = max ?? THE_CONSTANT;\n`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `  ${GREEN}✓${OFF} ${String(checked)} worklet(s) across ${String(files.length)} file(s)\n`,
  );
  console.log(
    `${GREEN}${BOLD}No worklet reads a captured variable from a parameter default.${OFF}\n` +
      `${DIM}  Read from the plugin's own emitted code, not from a rule re-derived here.${OFF}\n`,
  );
}

/**
 * The refusals, watched refusing — and a control that must stay green.
 *
 * A check that refused every worklet with any default parameter would pass the negative case
 * and be worse than the hole it fills [[a-decoy-that-is-not-broken-proves-nothing]].
 */
async function prove() {
  console.log(`\n${BOLD}Irodora — the worklet-default rule, mutated${OFF}\n`);

  let failures = 0;
  const check = (label, condition, detail) => {
    if (condition) console.log(`  ${GREEN}✓${OFF} ${label}`);
    else {
      failures += 1;
      console.log(`  ${RED}✗${OFF} ${label}`);
      if (detail !== undefined) console.log(`      ${detail}`);
    }
  };

  /*
   * A REAL path, because the plugin reads the file from disk for its source-map metadata even
   * though the source it transforms is the string passed in. The content below is the fixture;
   * the path only has to exist.
   */
  const FIXTURE = join(SOURCE_ROOT, 'lens', 'camera.ts');

  // 1. THE SUBJECT RUNS. Without this every case below could pass on a broken transform.
  const control = `
    export const CAP = 2000;
    export function ok(n: number, max?: number): number {
      'worklet';
      const cap = max ?? CAP;
      return n <= cap ? 1 : 2;
    }`;
  const controlWorklets = workletsIn(await emitted(control, FIXTURE));
  check(
    'the transform produces a worklet at all — the harness can evaluate its subject',
    controlWorklets.length === 1,
    `emitted ${String(controlWorklets.length)} worklet(s)`,
  );
  if (controlWorklets.length !== 1) {
    process.exitCode = 1;
    return;
  }

  // 2. The control must stay GREEN: the same captured name, read from the body.
  check(
    'a captured name read in the BODY is allowed',
    offendingNames(controlWorklets[0]?.code ?? '').length === 0,
    'the control was refused — the rule now rejects correct code',
  );

  // 3. The defect, reintroduced.
  const defect = `
    export const CAP = 2000;
    export function bad(n: number, max = CAP): number {
      'worklet';
      return n <= max ? 1 : 2;
    }`;
  const defectWorklets = workletsIn(await emitted(defect, FIXTURE));
  check(
    'a captured name read from a PARAMETER DEFAULT is refused',
    offendingNames(defectWorklets[0]?.code ?? '').includes('CAP'),
    `offending: [${offendingNames(defectWorklets[0]?.code ?? '').join(', ')}]`,
  );

  // 4. A default that captures nothing is fine — the rule is about the closure, not defaults.
  const literalDefault = `
    export function fine(n: number, max = 2000): number {
      'worklet';
      return n <= max ? 1 : 2;
    }`;
  const literalWorklets = workletsIn(await emitted(literalDefault, FIXTURE));
  check(
    'a LITERAL default is allowed — the rule is about capture, not about defaults',
    offendingNames(literalWorklets[0]?.code ?? '').length === 0,
    'a literal default was refused, so the rule is too broad',
  );

  // 5. The real app source, which is what the gate actually reads.
  const files = sources().filter((file) => readFileSync(file, 'utf8').includes("'worklet'"));
  let offenders = 0;
  for (const file of files)
    for (const worklet of workletsIn(await emitted(readFileSync(file, 'utf8'), file)))
      if (offendingNames(worklet.code).length > 0) offenders += 1;
  check('the app has none today', offenders === 0, `${String(offenders)} offending worklet(s)`);

  console.log(
    failures === 0
      ? `\n${GREEN}${BOLD}Proven.${OFF} ${DIM}The refusal was watched refusing, and correct code was watched being allowed.${OFF}\n`
      : `\n${RED}${BOLD}${String(failures)} case(s) did not behave as claimed.${OFF}\n`,
  );
  if (failures > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  await (process.argv.includes('--prove') ? prove() : main());
