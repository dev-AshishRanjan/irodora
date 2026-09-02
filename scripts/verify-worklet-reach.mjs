#!/usr/bin/env node
/**
 * Irodora — every function a worklet reaches must say so itself (F-116).
 *
 * ## The defect this exists for
 *
 * `sampleFrame` carried `'worklet'` and called `sampleStride`, which did not. **The Lens crashed
 * on its first frame** (F-115, E-050). The Worklets babel plugin captures an unmarked import as
 * an ordinary JS-thread function, and invoking it from the frame thread throws the moment a frame
 * arrives — which is the moment the Lens opens.
 *
 * **Nothing else in this repository can see that.** Jest has one runtime and no worklet boundary,
 * typecheck sees an ordinary call, lint sees an import that resolves, and the directive changes
 * no JS-thread behaviour — so every test passes identically either side of the bug. That symmetry
 * is what makes it invisible, and it is why this is a static check rather than a test.
 *
 * ## The compiler API, not a regular expression
 *
 * A regex can find `'worklet'` and it can find `name(`. It cannot tell a call from a property
 * access, an imported function from a local variable, or a shadowed name from the real one — and
 * each of those is a way to be quietly wrong about a boundary whose failure mode is a crash on a
 * device. `typescript` is already a devDependency; using it is cheaper than being approximately
 * right.
 *
 * ## WHAT THIS CANNOT SEE, and it prints the count on every run
 *
 * Source analysis cannot follow a function reached through a **variable**, one **passed in as a
 * callback** and invoked, or one looked up on a **dynamic property**. Those calls are counted and
 * named as unresolved rather than assumed safe. A check that let anybody believe it covered them
 * would be worse than none — the honest version narrows the reading rather than replacing it.
 *
 * It also proves only that **the source says so**, not that Babel emitted it. F-121 established
 * the transform is intact by running the real pipeline by hand; that stays evidence rather than a
 * gate, and this closes the half that can regress silently.
 *
 * Usage:
 *   node scripts/verify-worklet-reach.mjs
 *   node scripts/verify-worklet-reach.mjs --prove
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const require = createRequire(import.meta.url);
/** @type {import('typescript')} */
const ts = require('typescript');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ZONE = join(ROOT, 'apps', 'mobile', 'src');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const DIRECTIVE = 'worklet';

const rel = (p) => relative(ROOT, p).replaceAll('\\', '/');

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'generated' || name === 'node_modules') continue;
      sources(full, out);
    } else if (/\.tsx?$/u.test(name)) out.push(full);
  }
  return out;
}

/** A function-like node whose body opens with the `'worklet'` prologue. */
function isWorklet(node) {
  const body = node.body;
  if (body === undefined || !ts.isBlock(body)) return false;
  for (const statement of body.statements) {
    if (!ts.isExpressionStatement(statement)) break;
    const e = statement.expression;
    if (!ts.isStringLiteral(e)) break;
    if (e.text === DIRECTIVE) return true;
  }
  return false;
}

const isFunctionLike = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

/**
 * A name for a function node, for the report.
 *
 * An arrow assigned to a property — `onFrame: (frame) => {…}` — has no name of its own, so the
 * property it is assigned to is the name a person would use for it.
 */
function nameOf(node) {
  if (node.name !== undefined && ts.isIdentifier(node.name)) return node.name.text;
  const parent = node.parent;
  if (parent !== undefined) {
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  }
  return '(anonymous)';
}

const positionOf = (file, node) => {
  const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
  return `${rel(file.fileName)}:${String(line + 1)}`;
};

/**
 * Build the model: every file's top-level function declarations, its relative imports, and every
 * function-like node in it.
 */
function model(files) {
  const byPath = new Map();

  for (const [path, text] of files) {
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    /** name → function node, for anything callable declared at the top level of this file. */
    const declared = new Map();
    /** local name → absolute path of the module it came from, for RELATIVE imports only. */
    const imported = new Map();

    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name !== undefined)
        declared.set(node.name.text, node);
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        isFunctionLike(node.initializer)
      )
        declared.set(node.name.text, node.initializer);

      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        // RELATIVE ONLY. A library import is somebody else's package: this check reports it as
        // out of reach rather than demanding a directive it cannot add.
        if (spec.startsWith('.')) {
          const target = resolveModule(dirname(path), spec, files);
          const clause = node.importClause;
          if (
            target !== null &&
            clause?.namedBindings !== undefined &&
            ts.isNamedImports(clause.namedBindings)
          )
            for (const element of clause.namedBindings.elements)
              imported.set(element.name.text, target);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);

    byPath.set(path, { file, declared, imported });
  }

  return byPath;
}

/** `./camera` → the absolute path of a file that exists in the set. */
function resolveModule(fromDir, spec, files) {
  const base = resolve(fromDir, spec);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ])
    if (files.has(candidate)) return candidate;
  return null;
}

/**
 * Walk from every worklet root and report the callees that are not worklets themselves.
 *
 * The visited set is keyed by path and node position: the graph may cycle, and a check that
 * recursed forever would be reported as a hung CI job rather than as a bug here.
 */
export function analyse(files) {
  const byPath = model(files);
  const problems = [];
  const unresolved = [];
  const roots = [];
  const seen = new Set();

  const callsIn = (file, node) => {
    const out = [];
    const visit = (n) => {
      if (ts.isCallExpression(n)) out.push(n);
      // A nested function-like node is walked too: an arrow INSIDE a worklet runs on the same
      // thread, so what it calls is reachable from the worklet just the same.
      ts.forEachChild(n, visit);
    };
    ts.forEachChild(node.body ?? node, visit);
    return out;
  };

  const walk = (path, node, from) => {
    const key = `${path}#${String(node.pos)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const entry = byPath.get(path);
    if (entry === undefined) return;

    for (const call of callsIn(entry.file, node)) {
      const callee = call.expression;

      // A method or namespace call — `frame.getPixelBuffer()`, `Math.max()`. Not a bare name,
      // so nothing here can say which function it is.
      if (!ts.isIdentifier(callee)) {
        unresolved.push({
          where: positionOf(entry.file, call),
          text: call.expression.getText(entry.file).slice(0, 60),
          why: 'a property or dynamic call — this check cannot say which function it reaches',
        });
        continue;
      }

      const name = callee.text;
      const localTarget = entry.declared.get(name);
      const importedFrom = entry.imported.get(name);

      let targetPath = null;
      let target = null;
      if (localTarget !== undefined) {
        targetPath = path;
        target = localTarget;
      } else if (importedFrom !== undefined) {
        targetPath = importedFrom;
        target = byPath.get(importedFrom)?.declared.get(name) ?? null;
      }

      if (target === null || targetPath === null) {
        unresolved.push({
          where: positionOf(entry.file, call),
          text: name,
          why:
            importedFrom === undefined
              ? 'a library import, a global, or a value this file does not declare'
              : 'imported from a relative module that declares no such function at its top level',
        });
        continue;
      }

      if (!isWorklet(target)) {
        problems.push({
          name,
          where: positionOf(byPath.get(targetPath).file, target),
          calledFrom: positionOf(entry.file, call),
          from,
        });
        continue;
      }

      walk(targetPath, target, `${from} → ${name}`);
    }
  };

  for (const [path, { file }] of byPath) {
    const visit = (node) => {
      if (isFunctionLike(node) && isWorklet(node)) {
        roots.push({ name: nameOf(node), where: positionOf(file, node) });
        walk(path, node, nameOf(node));
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }

  return { problems, unresolved, roots };
}

const readZone = () => new Map(sources(ZONE).map((p) => [p, readFileSync(p, 'utf8')]));

function report(files) {
  const { problems, unresolved, roots } = analyse(files);

  console.log(`\n${BOLD}Worklet reachability${OFF}\n`);
  console.log(
    `${DIM}  ${String(roots.length)} worklet root(s) in ${rel(ZONE)}: ${roots.map((r) => r.name).join(', ')}${OFF}`,
  );

  // PRINTED ON EVERY RUN, green included. A limit nobody reads is a limit nobody weighs.
  console.log(
    `\n  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE — ${String(unresolved.length)} call(s) this cannot resolve:${OFF}`,
  );
  for (const u of unresolved.slice(0, 8))
    console.log(`${DIM}      ${u.where}  ${u.text} — ${u.why}${OFF}`);
  if (unresolved.length > 8)
    console.log(`${DIM}      … and ${String(unresolved.length - 8)} more${OFF}`);
  console.log(
    `${DIM}      A function reached through a variable, passed in as a callback, or looked up on\n` +
      `      an object is invisible to source analysis. This proves the SOURCE says so, not that\n` +
      `      Babel emitted it — F-121 established the transform by hand and that stays evidence.${OFF}`,
  );

  if (problems.length > 0) {
    console.log('');
    for (const p of problems) {
      console.log(
        `  ${RED}✗${OFF} ${BOLD}${p.name}${OFF} ${DIM}is reached from a worklet and carries no directive${OFF}`,
      );
      console.log(`${DIM}      declared at ${p.where}${OFF}`);
      console.log(`${DIM}      called at   ${p.calledFrom}   via ${p.from}${OFF}`);
      ciError(
        `worklet: ${p.name} carries no 'worklet' directive`,
        `Reached from a worklet via ${p.from}. Declared at ${p.where}, called at ${p.calledFrom}. ` +
          'A worklet may only call other worklets: the Worklets babel plugin captures an ' +
          'unmarked function as an ordinary JS-thread one, and invoking it from the frame ' +
          'thread throws the moment a frame arrives (F-115, E-050).',
      );
    }
    console.log(
      `\n${RED}${BOLD}Worklet reachability FAILED.${OFF} ${String(problems.length)} finding(s).\n`,
    );
    return 1;
  }

  console.log(`\n${GREEN}${BOLD}Every function a worklet reaches declares itself one.${OFF}\n`);
  return 0;
}

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Proving the worklet check discriminates${OFF}\n`);

  const real = readZone();
  const CAMERA = join(ZONE, 'lens', 'camera.ts');
  const VIEWFINDER = join(ZONE, 'lens', 'viewfinder.tsx');

  /** A copy of the tree with one directive removed from one function. */
  const without = (path, marker) => {
    const copy = new Map(real);
    const text = copy.get(path);
    if (text === undefined) throw new Error(`${rel(path)} is not in the zone`);
    const at = text.indexOf(marker);
    if (at < 0)
      throw new Error(`the plant is stale: ${rel(path)} has no ${JSON.stringify(marker)}`);
    copy.set(path, text.replace(marker, marker.replace(/'worklet';\s*/u, '')));
    return copy;
  };

  let bad = 0;
  const say = (ok, name, detail) => {
    if (!ok) bad += 1;
    console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${detail}${OFF}`);
  };

  const base = analyse(real);
  say(
    base.problems.length === 0,
    'the real tree is green',
    '(asserted first, or a plant proves nothing)',
  );
  say(
    base.unresolved.length > 0,
    'it reports calls it cannot resolve',
    `${String(base.unresolved.length)} — a check claiming to see everything is the one claim it must not make`,
  );
  say(
    base.roots.length >= 3,
    'it finds the worklet roots',
    base.roots.map((r) => r.name).join(', '),
  );

  /*
   * CRITERION 1, AND IT IS F-115's EXACT DEFECT. `sampleStride` is in camera.ts and its caller
   * is in viewfinder.tsx, so this is ALSO criterion 2: a same-file check passes here.
   */
  const crossModule = analyse(
    without(
      CAMERA,
      "export function sampleStride(regionPixels: number, max = MAX_SAMPLES_PER_FRAME): number {\n  'worklet';\n",
    ),
  );
  say(
    crossModule.problems.some((p) => p.name === 'sampleStride'),
    "F-115's defect fires — a callee in ANOTHER module loses its directive",
    'sampleStride, called from viewfinder.tsx',
  );

  // The same-file half, so "it follows imports" is not carried by a case that never needed to.
  const sameFile = analyse(
    without(
      VIEWFINDER,
      "function sampleFrame(frame: Frame, space: CaptureSpace): FrameOutcome {\n  'worklet';\n",
    ),
  );
  say(
    sameFile.problems.some((p) => p.name === 'sampleFrame'),
    'a callee in the SAME file fires too',
    'sampleFrame, called from onFrame',
  );

  /*
   * THE DECOY, and it is the half that decides whether this check survives. `readCaptureSpace`
   * is imported into viewfinder.tsx from camera.ts — the same module `sampleStride` lives in —
   * carries no directive, and is called on the JS thread from `onSessionConfigSelected`. A check
   * that flagged every import of a worklet-adjacent module would fire here, and a check with a
   * false positive gets switched off.
   */
  say(
    // ASSERTED AGAINST `crossModule`, NOT `base`. On the real tree there are no problems at
    // all, so "readCaptureSpace is not among them" is true of an empty list and proves nothing.
    // Under the plant the check IS producing findings from that very module — camera.ts — so
    // this is the state in which a check that flagged every non-worklet neighbour would fire.
    crossModule.problems.length > 0 &&
      !crossModule.problems.some((p) => p.name === 'readCaptureSpace'),
    'a JS-thread function in the SAME module is NOT flagged',
    'readCaptureSpace — asserted while camera.ts IS producing a finding',
  );

  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF} ${String(bad)} case(s).\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A callee that loses its directive is named in ` +
      `either module, and a JS-thread neighbour is not.${OFF}\n`,
  );
  process.exit(0);
}

process.exit(report(readZone()));
