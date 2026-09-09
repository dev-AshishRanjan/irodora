#!/usr/bin/env node
/**
 * A screen may not invent a layout primitive (F-203, NFR-25).
 *
 * ```
 * apps/mobile/src/screens/**   ← the subject
 *          ↓
 * flexDirection anywhere in it is a `Row` or a `Stack` somebody re-implemented
 * ```
 *
 * ## Why this gate exists rather than a one-off refactor
 *
 * F-203 found **12 `flexDirection` declarations across 7 screens**, every one a `Row` written by
 * hand. A refactor that nothing enforces has a half-life: the thirteenth arrives the next time
 * somebody needs a row and does not think to look for one.
 *
 * ## The finding underneath it, which is the more useful half
 *
 * Seven screens did not do this out of carelessness. **`Row` could not express what they
 * needed** — it had no `baseline` alignment and no vertical-only padding — so the workaround was
 * the only way to say the thing. Both values were added in the same feature, and only then was
 * this rule something the screens could actually satisfy.
 *
 * **A gate that forbids a workaround without supplying the missing capability is a gate that
 * makes people worse at their job.**
 *
 * ## Scope, and it is stated on every run
 *
 * - `packages/ui` is EXCLUDED. It is where a layout primitive is supposed to be written, and a
 *   rule that refused `flexDirection` there would refuse `Row` itself.
 * - `src/lens/` is EXCLUDED. The viewfinder positions a reticle against a camera preview in
 *   absolute coordinates; that is not a flow, and `Row` is not what it wants.
 * - Only `flexDirection` is checked. `position`, `zIndex` and the rest are not flow layout and a
 *   screen that needs one has a different argument to make.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The one directory this rule applies to. Narrow on purpose — see the header. */
export const SUBJECT = join('apps', 'mobile', 'src', 'screens');

/** The construction a screen may not write. */
const FORBIDDEN = /flexDirection/u;

function files(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path));
    else if (/\.tsx?$/u.test(path)) out.push(path);
  }
  return out;
}

/**
 * Every offence in a directory.
 *
 * Exported so the proof can point it at a planted fixture. A gate nobody has watched fail is
 * configuration that parses.
 */
export function offences(dir = join(ROOT, SUBJECT)) {
  const found = [];
  for (const file of files(dir)) {
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      if (FORBIDDEN.test(line))
        found.push({
          file: relative(ROOT, file).replaceAll('\\', '/'),
          line: index + 1,
          text: line.trim(),
        });
    });
  }
  return found;
}

export function run() {
  const scanned = files(join(ROOT, SUBJECT)).length;
  const found = offences();

  console.log(`\n${BOLD}Irodora — layout primitives${OFF}\n`);
  console.log(
    `${DIM}  ${String(scanned)} screen(s) scanned. A screen composes with Row and Stack; a ` +
      `\`flexDirection\` in one is a primitive it wrote for itself.${OFF}`,
  );
  console.log(
    `${DIM}  NOT CHECKED HERE: packages/ui, which is where a layout primitive is SUPPOSED to ` +
      `be written — a rule refusing it there would refuse Row itself; src/lens/, whose ` +
      `viewfinder positions a reticle in absolute coordinates against a camera preview, which ` +
      `is not a flow; and every property other than flexDirection, because position and zIndex ` +
      `are not flow layout and a screen needing one has a different argument to make.${OFF}\n`,
  );

  if (found.length === 0) {
    console.log(`${GREEN}${BOLD}No screen invents a layout primitive.${OFF}\n`);
    return 0;
  }

  console.log(`${RED}${BOLD}${String(found.length)} offence(s)${OFF}\n`);
  for (const o of found)
    console.log(
      `  ${RED}x${OFF} ${o.file}:${String(o.line)}  ${DIM}${o.text}${OFF}\n` +
        `      Use \`Row\` or \`Stack\`. If neither can say it, the primitive is missing a value ` +
        `and that is the change to make — F-203 added \`align="baseline"\` and \`padY\` for ` +
        `exactly that reason.`,
    );
  console.log();
  return 1;
}

/*
 * THE SAME GUARD `verify-route-targets` USES, and the same reason it uses that FORM.
 *
 * Comparing `import.meta.url` against a template-built `file://…` string silently never matches
 * on win32, where `argv[1]` is a backslash path. The gate then imports cleanly and runs nothing:
 * exit 0, no output, and a check that passes by never executing — which is the failing-open
 * shape every gate in this repository is written to refuse.
 *
 * Found the honest way: the first version printed nothing and exited 0, and a gate with no
 * output is the one thing this repository treats as more suspicious than a failure.
 */
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  process.exit(run());
