/**
 * Gate 8, proven.
 *
 * A gate nobody has watched fail is configuration that parses. This plants real accessibility
 * defects into **real components** — not into fixtures, which are already written to be
 * rejected and therefore prove only that the fixtures are broken — runs the gate, and asserts
 * it goes red for the stated reason.
 *
 * The baseline is asserted green **first and last**. A mutation table without its baseline
 * cannot distinguish "the check caught my change" from "the check was already failing"
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * ```
 * node scripts/verify-a11y-proof.mjs
 * ```
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const UI = join(ROOT, 'packages', 'ui', 'src');

/**
 * Each case names a file, an exact substring to replace, and the rule the gate must report.
 *
 * `find` is an exact string rather than a regex on purpose: if the source moves under it, the
 * replacement fails loudly and the case is reported as UNRUNNABLE rather than silently
 * mutating nothing and passing [[a-decoy-written-against-old-values-quietly-stops-discriminating]].
 */
const CASES = [
  {
    name: 'a button with no accessible name',
    file: join(UI, 'Button.tsx'),
    find: 'accessibilityLabel={label}',
    replace: '',
    expect: 'no-name',
  },
  {
    name: 'a pressable with no role',
    file: join(UI, 'Swatch.tsx'),
    find: 'accessibilityRole="button"',
    replace: '',
    expect: 'no-role',
  },
  {
    // BOTH the state and the `disabled` prop, and the reason is worth recording: React Native
    // DERIVES `accessibilityState.disabled` from `disabled` on a Pressable, so removing only
    // our explicit copy leaves the component still correct and the gate rightly stays green.
    // The first version of this case did exactly that and reported a false negative against
    // the gate. Our explicit `accessibilityState` is therefore belt-and-braces on a Pressable
    // — and load-bearing on anything that is not one, since a `View` with a responder handler
    // gets no derivation at all.
    name: 'a disabled control that does not announce it',
    file: join(UI, 'Button.tsx'),
    find: 'accessibilityState={{ disabled: inert, busy: loading }}\n      disabled={inert}',
    replace: 'accessibilityState={{ busy: loading }}',
    expect: 'state-not-announced',
  },
  {
    name: 'a hard-coded colour in a component',
    file: join(UI, 'Surface.tsx'),
    find: 'backgroundColor: colors[token],',
    replace: "backgroundColor: '#8A8A8A',",
    expect: 'colour-literal',
  },
  {
    name: 'font scaling disabled',
    file: join(UI, 'Text.tsx'),
    find: 'allowFontScaling\n      maxFontSizeMultiplier={2}',
    replace: 'allowFontScaling={false}\n      maxFontSizeMultiplier={2}',
    expect: 'font-scaling',
  },
  {
    name: 'a tap target below the platform minimum',
    file: join(UI, 'Button.tsx'),
    find: 'minWidth: nativeTapTarget,\n        minHeight: nativeTapTarget,',
    replace: 'minWidth: 20,\n        minHeight: 20,',
    expect: 'tap-target',
  },
];

/** Run gate 8 over packages/ui. Returns the combined output and whether it passed. */
function runGate() {
  try {
    // execSync with one command string rather than execFileSync + shell:true, which node
    // deprecates (DEP0190) because arguments are concatenated rather than escaped.
    const out = execSync('pnpm --filter @irodora/ui test:a11y', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { passed: true, out };
  } catch (error) {
    const e = /** @type {{ stdout?: string; stderr?: string }} */ (error);
    return { passed: false, out: `${e.stdout ?? ''}\n${e.stderr ?? ''}` };
  }
}

console.log(`\n${BOLD}Gate 8 — proving the a11y checks fire${OFF}\n`);

const baseline = runGate();
if (!baseline.passed) {
  console.log(
    `${RED}${BOLD}The baseline is already red.${OFF} Nothing below would mean anything —\n` +
      `${DIM}a mutation that "causes" a failure in an already-failing suite proves nothing.${OFF}\n`,
  );
  process.exit(1);
}
console.log(
  `  ${GREEN}✓${OFF} baseline green ${DIM}— the mutations below are measured against it${OFF}\n`,
);

const failures = [];

for (const c of CASES) {
  const original = readFileSync(c.file, 'utf8');
  if (!original.includes(c.find)) {
    failures.push(`${c.name}: the source to mutate is not there any more — case UNRUNNABLE`);
    console.log(`  ${RED}✗${OFF} ${c.name} ${DIM}(cannot plant: source moved)${OFF}`);
    continue;
  }

  writeFileSync(c.file, original.replace(c.find, c.replace));
  try {
    const result = runGate();
    if (result.passed) {
      failures.push(`${c.name}: gate 8 stayed GREEN with the defect planted`);
      console.log(`  ${RED}✗${OFF} ${c.name} ${DIM}— gate stayed green${OFF}`);
    } else if (!result.out.includes(c.expect)) {
      failures.push(`${c.name}: gate 8 went red, but not for "${c.expect}"`);
      console.log(`  ${RED}✗${OFF} ${c.name} ${DIM}— red, but not reporting ${c.expect}${OFF}`);
    } else {
      console.log(`  ${GREEN}✓${OFF} ${c.name} ${DIM}→ ${c.expect}${OFF}`);
    }
  } finally {
    // Always restore, even if the run threw for an unrelated reason. A proof script that can
    // leave the tree mutated is worse than no proof script.
    writeFileSync(c.file, original);
  }
}

const restored = runGate();
if (!restored.passed) {
  console.log(
    `\n${RED}${BOLD}The tree did not come back green.${OFF} A mutation was not restored.${OFF}\n`,
  );
  process.exit(1);
}
console.log(`\n  ${GREEN}✓${OFF} restored, green again ${DIM}— every mutation reverted${OFF}`);

if (failures.length > 0) {
  console.log(`\n${RED}${BOLD}${String(failures.length)} case(s) did not prove anything${OFF}`);
  for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Gate 8 proven.${OFF} ` +
    `${DIM}${String(CASES.length)} real defects planted in real components, each caught, ` +
    `each restored.${OFF}\n`,
);
