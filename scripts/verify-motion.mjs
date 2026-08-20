#!/usr/bin/env node
/**
 * Motion may not animate a colour.
 *
 * ## Why this matters more than it sounds
 *
 * **The intermediate frames of a colour transition are plausible colours that never existed.**
 * A user watching a swatch cross-fade reads a value the engine never produced, and for a
 * product whose entire claim is "this is what colour that is", that is a correctness defect
 * rather than a polish one. The manifest has said so since F-003; nothing enforced it.
 *
 * ## Why this is a script and not a rendered check
 *
 * **The rendered tree cannot see it.** Probed rather than assumed — an `Animated.View` with an
 * interpolated `backgroundColor` renders to:
 *
 * ```json
 * { "type": "View", "props": { "style": { "backgroundColor": "rgba(0, 0, 0, 1)" } } }
 * ```
 *
 * A concrete resolved value, indistinguishable from a static colour. The conformance suite,
 * which sees everything else in this product, is structurally blind here.
 *
 * ## Why the allowlist comes from `animatable`, not `forbidden`
 *
 * `motion.forbidden` is prose — *"background-color on a swatch"*, *"cross-fade between
 * samples"* — and nothing mechanical can be derived from it. `motion.animatable` is a property
 * list, and it is the same rule stated positively: **only these may be animated.** So the list
 * is genuinely derived from the manifest rather than copied beside it.
 *
 * ## What it cannot see, printed on every run
 *
 * Source analysis. A style assembled at runtime, spread from a variable, or built by a helper
 * is invisible to it. Saying so is the difference between a check and a claim.
 *
 * ```
 * node scripts/verify-motion.mjs
 * node scripts/verify-motion.mjs --prove
 * ```
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Directories whose components may animate. */
const SCOPES = [
  join(ROOT, 'packages', 'ui', 'src'),
  join(ROOT, 'apps', 'mobile', 'src'),
  join(ROOT, 'apps', 'mobile', 'app'),
];

/**
 * The allowlist, read from the generated tokens — which are emitted from the manifest.
 *
 * Not a copy. If `motion.animatable` gains a property, this check permits it on the next
 * build with nothing to edit here; if it loses one, this check starts rejecting it.
 */
async function allowedProperties() {
  const dist = join(ROOT, 'packages', 'design-tokens', 'dist', 'index.js');
  if (!existsSync(dist))
    throw new Error(
      '@irodora/design-tokens is not built, so the allowlist cannot be read from the manifest. ' +
        'Run `pnpm build` first. Refusing to fall back to a hard-coded list: a copy of the ' +
        'manifest beside the manifest is what this check exists to avoid.',
    );
  const { nativeMotion } = await import(pathToFileURL(dist).href);
  return new Set(nativeMotion.animatable);
}

function sourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/u.test(entry) && !/__guard__/u.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Style properties given to an `Animated.*` element in this source.
 *
 * Deliberately crude and deliberately narrow: it looks for `<Animated.X ... style={{ ... }}>`
 * and reads the keys of that literal. It will miss a style built elsewhere, which is stated
 * rather than hidden — a checker that overstated its reach would be worse than this one.
 */
function animatedStyleKeys(source) {
  const findings = [];
  const element = /<Animated\.(\w+)[^>]*?style=\{\{([\s\S]*?)\}\}/gu;
  for (const m of source.matchAll(element)) {
    const component = m[1];
    const body = m[2] ?? '';
    for (const key of body.matchAll(/(?:^|[\s,{])([A-Za-z][\w]*)\s*:/gu)) {
      const property = key[1];
      if (property !== undefined) findings.push({ component, property });
    }
  }
  return findings;
}

function run(allowed) {
  const violations = [];
  let scanned = 0;
  let animatedElements = 0;

  for (const scope of SCOPES)
    for (const file of sourceFiles(scope)) {
      scanned += 1;
      const source = readFileSync(file, 'utf8');
      const keys = animatedStyleKeys(source);
      if (keys.length > 0) animatedElements += 1;
      for (const { component, property } of keys)
        if (!allowed.has(property))
          violations.push({ file: relative(ROOT, file), component, property });
    }

  return { violations, scanned, animatedElements };
}

const allowed = await allowedProperties();

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Motion — proving the check${OFF}\n`);
  const planted = join(ROOT, 'packages', 'ui', 'src', '__motion_probe__.tsx');
  const cases = [
    { name: 'an animated backgroundColor', style: 'backgroundColor: fade', shouldFail: true },
    { name: 'an animated width (a layout property)', style: 'width: grow', shouldFail: true },
    { name: 'an animated opacity', style: 'opacity: fade', shouldFail: false },
    { name: 'an animated transform', style: 'transform: shift', shouldFail: false },
  ];

  let bad = 0;
  const baseline = run(allowed).violations.length;
  if (baseline !== 0) {
    console.log(`  ${RED}✗${OFF} the repository is not clean before planting anything`);
    process.exit(1);
  }
  console.log(
    `  ${GREEN}✓${OFF} baseline clean ${DIM}(asserted first, or a plant proves nothing)${OFF}`,
  );

  for (const c of cases) {
    writeFileSync(
      planted,
      `import { Animated } from 'react-native';\n` +
        `export function Probe({ fade, grow, shift }: never): React.JSX.Element {\n` +
        `  return <Animated.View style={{ ${c.style} }} />;\n}\n`,
    );
    const found = run(allowed).violations.length > 0;
    unlinkSync(planted);
    const ok = found === c.shouldFail;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${c.name} ${DIM}${c.shouldFail ? 'rejected' : 'allowed'}${OFF}`,
    );
  }

  if (existsSync(planted)) unlinkSync(planted);
  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF}\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A forbidden property is rejected and an ` +
      `allowed one is not — the second half matters, because a check that flagged all ` +
      `animation would be switched off within a week.${OFF}\n`,
  );
  process.exit(0);
}

console.log(`\n${BOLD}Motion${OFF}\n`);
const { violations, scanned, animatedElements } = run(allowed);
console.log(
  `${DIM}  ${String(scanned)} source file(s) scanned; ${String(animatedElements)} with an ` +
    `Animated style literal. Allowed: ${[...allowed].join(', ')} ${DIM}(from the manifest, ` +
    `not a copy).${OFF}`,
);
console.log(
  `${DIM}  NOT CHECKED HERE: a style assembled at runtime, spread from a variable, or built ` +
    `by a helper. This is source analysis, and the rendered tree CANNOT see an animated ` +
    `colour — it resolves to a concrete value indistinguishable from a static one.${OFF}`,
);

if (violations.length > 0) {
  console.log(`\n${RED}${BOLD}${String(violations.length)} forbidden animation(s)${OFF}`);
  for (const v of violations)
    console.log(
      `  ${RED}✗${OFF} ${v.file}  ${BOLD}Animated.${v.component}${OFF} animates ` +
        `${BOLD}${v.property}${OFF}`,
    );
  console.log(
    `\n${DIM}  The intermediate frames of a colour transition are PLAUSIBLE colours that never\n` +
      `  existed, so a user reads a value the engine never produced. Animate opacity or\n` +
      `  transform instead, or change the value without a transition.${OFF}\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}No forbidden animation.${OFF}\n`);
