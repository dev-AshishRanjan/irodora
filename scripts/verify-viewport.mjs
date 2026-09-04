#!/usr/bin/env node
/**
 * Two ways a layout stops fitting the device it runs on.
 *
 * ## Why this exists
 *
 * Both halves were reported from a build, and both had been true for weeks with every gate green.
 *
 * **Nothing consumed safe-area insets.** Not a screen, not a layout primitive, not either
 * `_layout`. It worked until F-145 only because the root stack showed a HEADER, and
 * react-navigation insets a header for you; turning the header off removed the only thing holding
 * content off the status bar, and nothing in our source claimed the job.
 *
 * **Two fixed pixel widths overflowed most phones.** `HERO = 320` on the colour page and
 * `CELL_PHOTO = 160` in the wardrobe grid — two of the latter plus a 12pt gap is 332, which does
 * not fit the 304 a 360pt Android leaves after padding. Chosen against one imagined screen.
 *
 * ## What it checks
 *
 * 1. **Insets are read in exactly one place.** A per-screen inset is a per-screen decision, and
 *    the next screen forgets. `Screen` owns it; anywhere else is a finding.
 * 2. **No layout constant exceeds what the narrowest supported viewport can hold.**
 *
 * ## What it does NOT check
 *
 * Actual layout. Nothing here runs a layout engine, so a composition that overflows through
 * accumulated padding, a long unbroken word, or a flex child that refuses to shrink is invisible
 * to it. It catches the shape that was actually shipped twice — a number larger than the screen —
 * and says so rather than implying more.
 *
 * ```
 * node scripts/verify-viewport.mjs
 * node scripts/verify-viewport.mjs --prove
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
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The narrowest screen this product supports, in points.
 *
 * 320 is the iPhone SE, and it is the smallest thing worth supporting — below it the corpus
 * cannot show a colour at a size anybody could judge, which is the whole product. Declared once,
 * here, because a number like this repeated in three files is three numbers.
 */
const NARROWEST_WIDTH = 320;

/**
 * The most a screen can inset its content and still be reasonable.
 *
 * `xl2` is 28 and is the `Screen` default, so a full-bleed element has at least
 * `NARROWEST_WIDTH − 2 × 28` to live in. A constant larger than that cannot fit on the narrowest
 * phone in ANY layout, which is what makes this checkable without a layout engine.
 */
const MAX_PADDING = 28;
const CEILING = NARROWEST_WIDTH - MAX_PADDING * 2;

/** Where insets may be read. One file, and the reason is in its own docblock. */
const INSET_OWNERS = ['packages/ui/src/layout.tsx', 'apps/mobile/app/(tabs)/_layout.tsx'];

const INSET_READ = /useSafeAreaInsets\s*\(|SafeAreaInsetsContext|<SafeAreaView/u;

/** A numeric size that decides how wide something is drawn. */
const SIZE_LITERAL = /(?:^|[^\w.])(width|height|size)\s*[:=]\s*\{?\s*(\d{2,4})\b/gu;

const SCOPES = [
  join(ROOT, 'apps', 'mobile', 'src'),
  join(ROOT, 'apps', 'mobile', 'app'),
  join(ROOT, 'packages', 'ui', 'src'),
];

function sourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/u.test(entry) && !/\.(test|spec)\./u.test(entry)) out.push(full);
  }
  return out;
}

const posix = (path) => relative(ROOT, path).replace(/\\/gu, '/');

/**
 * The source with its comments removed.
 *
 * THIS REPOSITORY DISCUSSES ITS OWN NUMBERS BY NAME. The docblocks explaining why `HERO` used to
 * be 320 contain the string `width: 320`, and the first version of this check flagged them — so
 * documenting a fix would have reintroduced the failure. The `--prove` case for it is not a
 * formality: a check that fires on prose is removed within a day, and the real protection goes
 * with it.
 *
 * Crude and deliberately so. It does not understand a comment marker inside a string literal,
 * which would make this a tokeniser; the failure mode there is a MISSED finding rather than a
 * false one, and that is the safe direction for a rule about prose.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '');
}

export function findProblems() {
  const problems = [];
  let scanned = 0;

  for (const scope of SCOPES)
    for (const file of sourceFiles(scope)) {
      scanned += 1;
      const rel = posix(file);
      const source = stripComments(readFileSync(file, 'utf8'));

      if (INSET_READ.test(source) && !INSET_OWNERS.includes(rel))
        problems.push({
          file: rel,
          what: 'reads safe-area insets',
          detail:
            'Insets are read in one place so that every screen gets the same treatment without ' +
            `every screen deciding. The owners are ${INSET_OWNERS.join(' and ')}.`,
        });

      for (const match of source.matchAll(SIZE_LITERAL)) {
        const value = Number(match[2]);
        if (value <= CEILING) continue;
        problems.push({
          file: rel,
          what: `${match[1]}: ${String(value)} cannot fit the narrowest supported screen`,
          detail:
            `${String(NARROWEST_WIDTH)}pt minus ${String(MAX_PADDING)}pt of padding either side ` +
            `leaves ${String(CEILING)}pt. Derive it from \`useWindowDimensions()\` instead — a ` +
            'size chosen against one imagined screen is wrong on every other one.',
        });
      }
    }

  return { problems, scanned };
}

/* ===================================================================== --prove */

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Viewport — proving the check${OFF}\n`);
  const planted = join(ROOT, 'apps', 'mobile', 'src', '__viewport_probe__.tsx');
  let bad = 0;

  const baseline = findProblems().problems.length;
  if (baseline !== 0) {
    console.log(`  ${RED}✗${OFF} the repository is not clean before planting anything`);
    process.exit(1);
  }
  console.log(
    `  ${GREEN}✓${OFF} baseline clean ${DIM}(asserted first, or a plant proves nothing)${OFF}`,
  );

  const cases = [
    {
      name: 'a screen reading insets for itself',
      body: "import { useSafeAreaInsets } from 'react-native-safe-area-context';\nexport const x = () => useSafeAreaInsets();\n",
      shouldFail: true,
    },
    {
      name: 'a SafeAreaView in a screen',
      body: "import { SafeAreaView } from 'react-native-safe-area-context';\nexport const x = <SafeAreaView />;\n",
      shouldFail: true,
    },
    {
      name: 'a width wider than the narrowest phone',
      body: 'export const s = { width: 320 };\n',
      shouldFail: true,
    },
    {
      name: 'a size prop wider than the narrowest phone',
      body: 'export const V = () => <Swatch size={400} />;\n',
      shouldFail: true,
    },
    {
      // MUST STAY GREEN. A check that flagged every number would ban the spacing scale itself
      // and be switched off within a week.
      name: 'an ordinary size that fits — must stay GREEN',
      body: 'export const s = { width: 56, height: 44 };\n',
      shouldFail: false,
    },
    {
      name: 'a size derived from the window — must stay GREEN',
      body: "import { useWindowDimensions } from 'react-native';\nexport const useW = () => useWindowDimensions().width - 8;\n",
      shouldFail: false,
    },
    {
      // MUST STAY GREEN. Prose discusses these numbers by name all over this repository.
      name: 'a comment mentioning a large width — must stay GREEN',
      body: '// The hero used to be width: 320, which did not fit.\nexport const x = 1;\n',
      shouldFail: false,
    },
  ];

  for (const c of cases) {
    writeFileSync(planted, c.body, 'utf8');
    const found = findProblems().problems.length > 0;
    unlinkSync(planted);
    const ok = found === c.shouldFail;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${c.name} ${DIM}${c.shouldFail ? 'rejected' : 'allowed'}${OFF}`,
    );
  }

  if (existsSync(planted)) unlinkSync(planted);
  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF} ${String(bad)} case(s).\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A stray inset read and an oversized constant are ` +
      `both rejected, and an ordinary size, a derived one and a comment are not.${OFF}\n`,
  );
  process.exit(0);
}

console.log(`\n${BOLD}Viewport${OFF}\n`);
const { problems, scanned } = findProblems();
console.log(
  `${DIM}  ${String(scanned)} file(s) scanned. Narrowest supported screen ${String(NARROWEST_WIDTH)}pt, ` +
    `so a layout constant may not exceed ${String(CEILING)}pt. Insets are read in ` +
    `${INSET_OWNERS.join(' and ')} and nowhere else.${OFF}`,
);
console.log(
  `${DIM}  NOT CHECKED HERE: actual layout. Nothing runs a layout engine, so overflow through ` +
    `accumulated padding, an unbreakable word or a flex child that refuses to shrink is invisible ` +
    `to this. It catches the shape that shipped twice — a number larger than the screen.${OFF}`,
);

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s)${OFF}`);
  for (const p of problems)
    console.log(`  ${RED}✗${OFF} ${p.file}  ${BOLD}${p.what}${OFF}\n    ${DIM}${p.detail}${OFF}`);
  console.log();
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Every layout constant fits, and insets are read in one place.${OFF}\n`,
);
