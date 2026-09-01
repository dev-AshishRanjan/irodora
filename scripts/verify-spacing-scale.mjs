#!/usr/bin/env node
/**
 * Gate 8 — the spacing scale.
 *
 * Runs beside `verify-token-reach.mjs` and asks the other half of its question. That script
 * asks *did anything get emitted that nothing uses?*; this one asks **is anything used that was
 * never decided?** A design system fails in both directions and only one of them had a check.
 *
 * ## What it found the first time it ran (F-095)
 *
 * 102 padding, margin and gap declarations across `packages/ui/src` and `apps/mobile/src`, of
 * which **45 used a value the scale did not contain** — and, in the other direction, **five of
 * the scale's eight steps were used zero times**. Those are not the same defect. Together they
 * meant the manifest and the product were two unreconciled systems, both internally consistent,
 * for as long as nobody counted. ADR-0074 is where that was settled.
 *
 * ## The scale is READ, never repeated
 *
 * From `docs/design/design-system.manifest.json`. A checker carrying its own copy of the scale
 * agrees with the manifest on the day it is written and never again — the same argument that
 * made gate 11 load the built `@irodora/recommendation` rather than re-implement `parseRuleSet`
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
 *
 * ## Exemptions are declared, and checked in both directions
 *
 * `.harness/verification/off-scale-spacing.json`. An off-scale value that is not listed fails.
 * **And an entry that matches nothing fails too**, because a dead exemption is how a live one
 * gets waved through later. The list prints on every run rather than only on a failure.
 *
 * ## What it does not look at
 *
 * `borderWidth`, `top`/`left`/`right`/`bottom`, `width`, `height` and every other numeric style
 * property. They are not spacing, and a check that claimed them would be claiming more coverage
 * than it has. `Swatch.tsx` carries `borderWidth: 2`, which is a real decision this says
 * nothing about.
 *
 * Values that are not integer literals — `padding: someVariable`, `gap: cond ? 4 : 8` — are
 * **not read**, and the run prints how many it skipped. A count of zero is the honest way to say
 * "this saw everything"; a count above zero is a hole with a number on it.
 *
 * ```
 * node scripts/verify-spacing-scale.mjs
 * node scripts/verify-spacing-scale.mjs --prove
 * ```
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './corpus-io.mjs';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const MANIFEST = join(ROOT, 'docs/design/design-system.manifest.json');
const EXEMPTIONS = join(ROOT, '.harness/verification/off-scale-spacing.json');

/**
 * The zones a spacing value can appear in.
 *
 * `apps/mobile/app` holds zero declarations today and is scanned anyway. An unscanned directory
 * is how the next one stops being noticed — `scripts/` was exactly that for 23 files until
 * F-078.
 */
const ZONES = ['packages/ui/src', 'apps/mobile/src', 'apps/mobile/app'];

/** Every React Native style property that positions by whitespace. */
const PROPERTIES = [
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingEnd',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'gap',
  'rowGap',
  'columnGap',
];

/** `(?![\d.])` so `gap: 2` never matches inside `gap: 20` — the whole value, or nothing. */
const declaration = () =>
  new RegExp(`\\b(${PROPERTIES.join('|')})\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?![\\d.])`, 'g');

/** A property followed by something that is not a plain number: a variable, a ternary, a call. */
const nonLiteral = () =>
  new RegExp(`\\b(${PROPERTIES.join('|')})\\s*:\\s*(?![-\\d\\s]*[\\d])`, 'g');

function sourceFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(path) && !/\.(test|spec)\./.test(path)) found.push(path);
    }
  };
  for (const zone of ZONES) {
    try {
      walk(join(ROOT, zone));
    } catch {
      // A zone that does not exist is not silently skipped — the caller reports it.
      found.push(null);
    }
  }
  return found;
}

const posix = (path) => relative(ROOT, path).replace(/\\/g, '/');

/** Every spacing declaration in the scanned zones, with enough context to be actionable. */
export function findDeclarations(files) {
  const declarations = [];
  let skipped = 0;
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      // A line that is only a comment is prose, not code. The repository's styles are heavily
      // commented and the comments discuss these values by name.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const match of line.matchAll(declaration()))
        declarations.push({
          file: posix(file),
          line: index + 1,
          property: match[1],
          value: Number(match[2]),
        });
      skipped += [...line.matchAll(nonLiteral())].length;
    });
  }
  return { declarations, skipped };
}

// --- run -------------------------------------------------------------------------------------

if (process.argv.includes('--prove')) {
  await prove();
} else {
  run();
}

function run() {
  console.log(`\n${BOLD}Irodora — spacing scale${OFF}\n`);

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const base = manifest.spacing?.base;

  /*
   * NAMED SINCE F-103, and read as an object rather than an array. `_note` is skipped the same
   * way the emitters skip it, so the manifest's prose can never be mistaken for a step.
   *
   * FAILS CLOSED ON THE WRONG SHAPE. If `scale` came back as an array — a revert, or a
   * hand-edit — `Object.values` would silently yield the numbers and this check would pass
   * while every emitter produced `--space-0..8`. So the shape is asserted, not assumed.
   */
  const scaleRaw = manifest.spacing?.scale;
  if (scaleRaw === null || typeof scaleRaw !== 'object' || Array.isArray(scaleRaw)) {
    console.log(
      `${RED}${BOLD}The manifest's spacing scale is not a named object.${OFF} It was a positional array until F-103; a checker that accepted either shape would pass over the regression it exists to catch.\n`,
    );
    process.exit(1);
  }
  const scale = Object.entries(scaleRaw)
    .filter(([name]) => !name.startsWith('_'))
    .map(([, value]) => value);
  if (scale.length === 0) {
    console.log(
      `${RED}${BOLD}The manifest declares no spacing scale.${OFF} There is nothing to check against.\n`,
    );
    process.exit(1);
  }

  // The manifest's own rule, checked against the manifest. ADR-0074 removed the one step that
  // broke it; without this, it can come back and no test would notice.
  const offBase = typeof base === 'number' && base > 0 ? scale.filter((s) => s % base !== 0) : [];

  const files = sourceFiles();
  if (files.includes(null)) {
    console.log(
      `${RED}${BOLD}A scanned zone does not exist.${OFF} A checker that cannot see its own subject has not passed; it has not run.\n`,
    );
    process.exit(1);
  }
  if (files.length === 0) {
    console.log(
      `${RED}${BOLD}No source files found.${OFF} Zero files scanned is not zero violations.\n`,
    );
    process.exit(1);
  }

  const { declarations, skipped } = findDeclarations(files);
  if (declarations.length === 0) {
    console.log(
      `${RED}${BOLD}No spacing declarations found at all.${OFF} That is not a clean product; it is a broken scan.\n`,
    );
    process.exit(1);
  }

  const { exempt } = JSON.parse(readFileSync(EXEMPTIONS, 'utf8'));
  const matched = new Set();
  const problems = [];

  for (const d of declarations) {
    if (scale.includes(d.value)) continue;
    const index = exempt.findIndex(
      (e) => e.file === d.file && e.property === d.property && e.value === d.value,
    );
    if (index === -1) {
      problems.push(
        `${d.file}:${String(d.line)}  ${d.property}: ${String(d.value)} is not a step of the ` +
          `scale [${scale.join(', ')}]. Use a step, or declare it in ` +
          '.harness/verification/off-scale-spacing.json with a reason. A VALUE NOBODY DECIDED ' +
          'is a design decision made at a call site.',
      );
      continue;
    }
    matched.add(index);
  }

  // THE OTHER DIRECTION. Without it the list only ever grows, and an entry that stopped being
  // true keeps standing by for the next value that resembles it.
  exempt.forEach((e, index) => {
    if (matched.has(index)) return;
    problems.push(
      `${e.file}  ${e.property}: ${String(e.value)} is exempt and MATCHES NOTHING. Either the ` +
        'value moved onto the scale and the entry should go, or the file moved and the entry is ' +
        'now protecting something nobody can find.',
    );
  });

  const used = new Set(declarations.map((d) => d.value));
  const unusedSteps = scale.filter((s) => !used.has(s));

  console.log(
    `  ${DIM}scale [${scale.join(', ')}], base ${String(base)} — ` +
      `${String(declarations.length)} declaration(s) across ${String(files.length)} file(s)${OFF}`,
  );
  if (skipped > 0)
    console.log(
      `  ${YELLOW}!${OFF} ${DIM}${String(skipped)} declaration(s) NOT READ — the value is not an ` +
        `integer literal. This check says nothing about those.${OFF}`,
    );

  // Reported, never failed. Steps for layouts not yet built are legitimate (ADR-0074 keeps
  // 28 upward for exactly that reason); a step nobody uses is worth SEEING, not blocking on.
  if (unusedSteps.length > 0)
    console.log(
      `  ${YELLOW}!${OFF} ${DIM}${String(unusedSteps.length)} step(s) used nowhere: ` +
        `${unusedSteps.join(', ')}. Rhythm for layouts not built yet, per ADR-0074 — reported ` +
        `so it stays a decision rather than a habit.${OFF}`,
    );

  if (offBase.length > 0)
    problems.push(
      `the SCALE ITSELF breaks its declared base of ${String(base)}: ${offBase.join(', ')}. ` +
        'ADR-0074 removed the one step that did this; a base one step ignores is not a base.',
    );

  console.log(
    `\n  ${DIM}exemptions (${String(exempt.length)}), all of which must still match:${OFF}`,
  );
  for (const e of exempt)
    console.log(`    ${DIM}· ${e.file}  ${e.property}: ${String(e.value)}  — ${e.cites}${OFF}`);

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}\n`);
    process.exit(1);
  }

  console.log(
    `\n${GREEN}${BOLD}Every spacing value is on the scale.${OFF} ` +
      `${DIM}${String(declarations.length)} checked, ${String(exempt.length)} declared off-scale.${OFF}\n`,
  );
}

/**
 * The check, watched failing — and watched staying green.
 *
 * Plants into a real, scanned source file and restores it in a `finally`. F-100 is why that is
 * unconditional: a proof that writes into a tracked file and exits by a path that does not
 * restore it leaves a corrupted repository, and `git add -A` commits it.
 */
async function prove() {
  const TARGET = join(ROOT, 'apps/mobile/src/screens/Home.tsx');
  const runCheck = () => {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/verify-spacing-scale.mjs')], {
      encoding: 'utf8',
    });
    return { code: r.status ?? 1, output: `${r.stdout}${r.stderr}` };
  };

  const cases = [
    {
      name: 'an off-scale value in a screen',
      expect: 'red',
      matching: /Home\.tsx:\d+\s+gap: 7 is not a step/u,
      plant: (source) => source.replace('<View style={{ gap: 4', '<View style={{ gap: 7'),
    },
    {
      name: 'a value that was moved off the scale by ADR-0074',
      expect: 'red',
      matching: /gap: 14 is not a step/u,
      plant: (source) => source.replace('<View style={{ gap: 4', '<View style={{ gap: 14'),
    },
    {
      // The exemption cannot be widened by moving a value into a file that already has one.
      name: 'the hairline value in a file that is not the exempt one',
      expect: 'red',
      matching: /Home\.tsx:\d+\s+padding: 1 is not a step/u,
      plant: (source) =>
        source.replace('<View style={{ gap: 4', '<View style={{ padding: 1, gap: 4'),
    },
    {
      // MUST STAY GREEN. This repository's styles are heavily commented and the comments
      // discuss these numbers by name. A check that fired on prose would be removed within a
      // day, and the real protection would go with it.
      name: 'a comment discussing an off-scale value — must stay GREEN',
      expect: 'green',
      plant: (source) =>
        `${source}\n// The scale used to carry a 14, and a gap: 6 was written on every row.\n`,
    },
    {
      // MUST STAY GREEN. A step of the scale is a step of the scale.
      name: 'a newly added ON-scale value — must stay GREEN',
      expect: 'green',
      plant: (source) => source.replace('<View style={{ gap: 4', '<View style={{ gap: 28'),
    },
  ];

  console.log(`\n${BOLD}Irodora — spacing-scale discrimination proof${OFF}\n`);

  const original = readFileSync(TARGET, 'utf8');
  const originalExemptions = readFileSync(EXEMPTIONS, 'utf8');
  const problems = [];

  try {
    const baseline = runCheck();
    if (baseline.code !== 0) {
      console.log(
        `${RED}${BOLD}The baseline is not green.${OFF} Nothing below would prove anything.\n`,
      );
      console.log(baseline.output);
      process.exit(1);
    }
    console.log(`  ${GREEN}OK${OFF}  baseline: the check exits 0 before any mutation`);

    for (const testCase of cases) {
      const planted = testCase.plant(original);
      if (planted === original)
        throw new Error(`the proof's anchor is gone from Home.tsx: ${testCase.name}`);
      writeFileSync(TARGET, planted, 'utf8');
      const { code, output } = runCheck();
      writeFileSync(TARGET, original, 'utf8');

      if (testCase.expect === 'green') {
        if (code === 0) console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit 0)${OFF}`);
        else
          problems.push(
            `${testCase.name}: expected the check to STAY GREEN, got exit ${String(code)}.\n${output}`,
          );
        continue;
      }
      if (code === 0) {
        problems.push(`${testCase.name}: the check ACCEPTED a value it must reject.`);
        continue;
      }
      if (!testCase.matching.test(output)) {
        problems.push(
          `${testCase.name}: the check went red but did not name the file, line and value. ` +
            `Asserting only the exit code would let a case "pass" by breaking something else.\n${output}`,
        );
        continue;
      }
      console.log(`  ${GREEN}OK${OFF}  ${testCase.name} ${DIM}(exit ${String(code)}, named)${OFF}`);
    }

    // THE OTHER DIRECTION ON THE EXEMPTION LIST. An entry that matches nothing must fail, or the
    // list only ever grows and a stale row stands by for the next value that resembles it.
    const dead = JSON.parse(originalExemptions);
    dead.exempt.push({
      file: 'packages/ui/src/NoSuchComponent.tsx',
      property: 'padding',
      value: 3,
      cites: 'planted by --prove',
      why: 'Matches nothing. If this passes, the list is a wish rather than a record.',
    });
    writeFileSync(EXEMPTIONS, JSON.stringify(dead, null, 2), 'utf8');
    const deadResult = runCheck();
    writeFileSync(EXEMPTIONS, originalExemptions, 'utf8');
    if (deadResult.code === 0 || !/MATCHES NOTHING/u.test(deadResult.output))
      problems.push(
        'a dead exemption did not fail the check — the list can only grow, and a stale entry ' +
          'protects whatever comes to resemble it.',
      );
    else
      console.log(
        `  ${GREEN}OK${OFF}  an exemption that matches nothing ${DIM}(exit 1, named)${OFF}`,
      );

    // THE SCALE IS READ, NOT REPEATED. Perturb the manifest and the verdict must follow it; a
    // checker with its own copy would stay green here, which is exactly the failure to catch.
    const manifestText = readFileSync(MANIFEST, 'utf8');
    const perturbed = JSON.parse(manifestText);
    perturbed.spacing.scale = perturbed.spacing.scale.filter((s) => s !== 20);
    writeFileSync(MANIFEST, `${JSON.stringify(perturbed, null, 2)}\n`, 'utf8');
    const followed = runCheck();
    writeFileSync(MANIFEST, manifestText, 'utf8');
    if (followed.code === 0 || !/padding: 20 is not a step/u.test(followed.output))
      problems.push(
        'removing a step from the MANIFEST did not change the verdict — the check is reading a ' +
          'copy of the scale rather than the scale, and would agree with the manifest only on ' +
          'the day it was written.',
      );
    else
      console.log(
        `  ${GREEN}OK${OFF}  removing a step from the manifest fails the check ${DIM}(the scale is read, not repeated)${OFF}`,
      );

    const after = runCheck();
    if (after.code !== 0) problems.push('the baseline did not recover after the mutations');
  } finally {
    writeFileSync(TARGET, original, 'utf8');
    writeFileSync(EXEMPTIONS, originalExemptions, 'utf8');
    if (readFileSync(TARGET, 'utf8') !== original) {
      console.log(
        `\n${RED}${BOLD}Home.tsx was NOT restored. Run: git checkout ${posix(TARGET)}${OFF}\n`,
      );
      process.exit(1);
    }
  }

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}\n`);
    process.exit(1);
  }

  console.log(
    `\n${GREEN}${BOLD}The spacing check discriminates.${OFF} ${DIM}${String(cases.length)} planted ` +
      `case(s): ${String(cases.filter((c) => c.expect === 'red').length)} red, ` +
      `${String(cases.filter((c) => c.expect === 'green').length)} green, plus a dead exemption ` +
      `and a perturbed manifest.${OFF}\n`,
  );
}
