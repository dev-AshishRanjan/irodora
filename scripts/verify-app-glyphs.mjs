#!/usr/bin/env node
/**
 * Irodora — no screen draws an icon of its own (F-228).
 *
 * ## Why this exists
 *
 * The icon set is one registry in `@irodora/ui` (`Glyph`), drawn at the line weight the mockups
 * measure and checked against every inventory. A screen that imports `react-native-svg` and draws
 * a path, or pulls a glyph from an icon font, puts a drawing on the screen that none of that ever
 * saw — at its own weight, under its own name, with its own accessibility. F-228's third criterion
 * is that no screen does, and a criterion nothing checks is a comment.
 *
 * ## The two ways in, and the one exception to each
 *
 * - **An import** of `react-native-svg` (any subpath), of an icon library, or of an `.svg` asset.
 * - **SVG markup in a string** — a screen can hand a hand-written `<svg>` to anything that renders
 *   one, and no import rule would see it.
 *
 * The share card is the exception to both, and it is one thing in two files: `card.ts` builds the
 * card as an SVG DOCUMENT and `ColourCard.tsx` displays it with `SvgXml` (ADR-0070). A card is a
 * document someone sends, not an icon. Each exemption names its rule, so the renderer is not
 * thereby free to write markup and the builder is not free to import a drawing library — and an
 * exemption that no longer matches anything fails, so the list cannot outlive the reason.
 *
 * ## What it does NOT check
 *
 * A drawing made of `View`s — borders and rotations, the way `Icon`'s alert triangle is made.
 * That is indistinguishable from layout by source analysis. `verify-surface-not-card` and review
 * are the defence there; this closes the two ways that need no ingenuity.
 *
 * Usage:
 *   node scripts/verify-app-glyphs.mjs
 *   node scripts/verify-app-glyphs.mjs --prove
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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ROOT, 'apps/mobile');
/** What ships. `test/` asserts on the card's markup and is not a screen. */
const SCANNED = ['app', 'src', 'plugins'];

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The declared exceptions, relative to the app root. One rule each.
 * @type {readonly { file: string, rule: 'import' | 'markup', reason: string }[]}
 */
export const EXEMPT = [
  {
    file: 'src/screens/ColourCard.tsx',
    rule: 'import',
    reason: 'displays the share card with SvgXml — a document, not an icon (ADR-0070)',
  },
  {
    file: 'src/card.ts',
    rule: 'markup',
    reason: 'builds the share card as an SVG document (ADR-0070)',
  },
];

/**
 * Icon libraries by name, and the words that name the rest. A list alone is only as complete as
 * its table; the words catch the library nobody has heard of yet (`*-icons`, `*-symbols`, `*svg*`).
 */
const ICON_PACKAGES = ['lucide-react-native', 'phosphor-react-native'];
/**
 * Judged per SEGMENT of the name (`@expo/vector-icons` → expo, vector, icons), so `lexicon` and
 * `designer-kit` are not icon packages and `ionicons`, `heroicons` and `svgr` are.
 */
const ICON_SEGMENT = /^svg|svg$|^icons?$|icons$|^symbols?$/i;
const namesIcons = (pkg) => pkg.split(/[@/-]/).some((s) => s !== '' && ICON_SEGMENT.test(s));

/** `from '…'`, `import '…'`, `import('…')`, `require('…')` — every specifier, bare or relative. */
const IMPORT_PATTERN = /(?:\bfrom\s+|\bimport\s+|\bimport\(\s*|\brequire\(\s*)(['"])([^'"\n]+)\1/g;
/** `<svg ` and `<svg>`, and the self-closing `<svg/>` the proof caught the first draft missing. */
const MARKUP_PATTERN = /<svg[\s/>]/g;

/** The package a specifier names — `@scope/name` or `name` — or null for a relative path. */
function packageOf(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Why a specifier draws an icon, or null if it does not. */
export function forbiddenImport(specifier) {
  if (/\.svg(?:\?.*)?$/i.test(specifier)) return 'an .svg asset';
  const pkg = packageOf(specifier);
  if (pkg === null) return null;
  if (pkg === 'react-native-svg') return 'react-native-svg';
  if (ICON_PACKAGES.includes(pkg)) return `the icon library ${pkg}`;
  if (namesIcons(pkg)) return `${pkg}, which names itself an icon or SVG package`;
  return null;
}

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(p);
    return /\.(tsx?|jsx?|mjs|cjs)$/.test(p) ? [p] : [];
  });
}

/** Line comments and block comments blanked, lengths kept, so a note about SVG is not SVG. */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

/**
 * Every drawing a screen makes for itself, and every exemption that no longer matches.
 * Data, so `--prove` can assert on it.
 */
export function appGlyphFindings(appRoot = APP, exempt = EXEMPT) {
  const violations = [];
  const used = new Set();
  let scanned = 0;

  for (const group of SCANNED)
    for (const file of sourceFiles(join(appRoot, group))) {
      scanned++;
      const rel = relative(appRoot, file).split('\\').join('/');
      const text = withoutComments(readFileSync(file, 'utf8'));
      const exemptFrom = (rule) => {
        const hit = exempt.find((e) => e.file === rel && e.rule === rule);
        if (hit) used.add(`${hit.file}#${hit.rule}`);
        return hit !== undefined;
      };
      const lineOf = (index) => text.slice(0, index).split('\n').length;

      for (const m of text.matchAll(IMPORT_PATTERN)) {
        const why = forbiddenImport(m[2]);
        if (why !== null && !exemptFrom('import'))
          violations.push({
            file: rel,
            line: lineOf(m.index),
            rule: 'import',
            detail: `imports ${why}`,
          });
      }
      for (const m of text.matchAll(MARKUP_PATTERN))
        if (!exemptFrom('markup'))
          violations.push({
            file: rel,
            line: lineOf(m.index),
            rule: 'markup',
            detail: 'writes SVG markup',
          });
    }

  const dead = exempt.filter((e) => !used.has(`${e.file}#${e.rule}`));
  return { violations, dead, scanned };
}

/* ===================================================================== --prove */

function prove() {
  console.log(`\n${BOLD}Irodora — app glyph proof${OFF}\n`);

  // Under the OS temp directory, never the tree: a killed run leaves nothing a check would read
  // (plant-proof.mjs lists this file for that reason).
  const work = mkdtempSync(join(tmpdir(), 'irodora-app-glyphs-'));
  const screen = join(work, 'src', 'screens', 'Probe.tsx');
  const renderer = join(work, 'src', 'screens', 'Card.tsx');
  const builder = join(work, 'src', 'card.ts');
  const exempt = [
    { file: 'src/screens/Card.tsx', rule: 'import', reason: 'proof' },
    { file: 'src/card.ts', rule: 'markup', reason: 'proof' },
  ];
  const RENDERER = "import { SvgXml } from 'react-native-svg';\nexport const R = SvgXml;\n";
  const BUILDER = 'export const doc = `<svg width="1"></svg>`;\n';

  /** Each case sets the probe screen, and optionally the two exempt files. */
  const cases = [
    {
      name: 'a screen drawing through the registry',
      probe: "import { Glyph } from '@irodora/ui';\n",
      fail: false,
    },
    {
      name: 'a screen importing react-native-svg',
      probe: "import { Path } from 'react-native-svg';\n",
      fail: true,
    },
    {
      name: 'a subpath of it',
      probe: "import Svg from 'react-native-svg/lib/module/elements/Svg';\n",
      fail: true,
    },
    { name: 'a require of it', probe: "const svg = require('react-native-svg');\n", fail: true },
    { name: 'a lazy import of it', probe: "const svg = import('react-native-svg');\n", fail: true },
    { name: 'an icon font', probe: "import { Ionicons } from '@expo/vector-icons';\n", fail: true },
    { name: 'platform symbols', probe: "import { SymbolView } from 'expo-symbols';\n", fail: true },
    {
      name: 'a named icon library with no telltale word',
      probe: "import { Star } from 'lucide-react-native';\n",
      fail: true,
    },
    { name: 'an .svg asset', probe: "import Star from '../../assets/star.svg';\n", fail: true },
    {
      name: 'SVG markup handed over as a string',
      probe: 'export const s = \'<svg viewBox="0 0 24 24"/>\';\n',
      fail: true,
    },
    {
      name: 'a comment that only mentions react-native-svg and <svg>',
      probe: "// react-native-svg draws <svg> here, from 'react-native-svg'\nexport const x = 1;\n",
      fail: false,
    },
    {
      name: 'a package that merely contains the letters',
      probe: "import { Design } from 'designer-kit';\nimport x from 'lexicon';\n",
      fail: false,
    },
    { name: 'the renderer, exempt from the import rule', probe: '', fail: false },
    {
      name: 'the renderer writing markup — exempt from imports only',
      probe: '',
      renderer: RENDERER + 'export const m = `<svg/>`;\n',
      fail: true,
    },
    {
      name: 'the builder importing a drawing library — exempt from markup only',
      probe: '',
      builder: BUILDER + "import { Path } from 'react-native-svg';\n",
      fail: true,
    },
    {
      name: 'an exemption that no longer matches anything',
      probe: '',
      renderer: 'export const R = 1;\n',
      fail: true,
    },
    { name: 'the baseline again', probe: "import { Glyph } from '@irodora/ui';\n", fail: false },
  ];

  const wrong = [];
  for (const c of cases) {
    rmSync(work, { recursive: true, force: true });
    mkdirSync(dirname(screen), { recursive: true });
    writeFileSync(screen, c.probe);
    writeFileSync(renderer, c.renderer ?? RENDERER);
    writeFileSync(builder, c.builder ?? BUILDER);
    const { violations, dead } = appGlyphFindings(work, exempt);
    const failed = violations.length + dead.length > 0;
    if (failed !== c.fail)
      wrong.push(
        `${c.name}: expected ${c.fail ? 'RED' : 'GREEN'}, got ${failed ? 'RED' : 'GREEN'}`,
      );
    else
      console.log(`  ${GREEN}✓${OFF} ${c.name} ${DIM}→ ${c.fail ? 'rejected' : 'accepted'}${OFF}`);
  }
  rmSync(work, { recursive: true, force: true });

  // AND THE REAL TREE, beside the planted ones: a proof whose cases all pass while the repository
  // itself fails would be proving a different check.
  const real = appGlyphFindings();
  if (real.violations.length + real.dead.length > 0 || real.scanned === 0)
    wrong.push(
      `the real tree: expected GREEN over a non-empty scan, got ${String(real.violations.length)} finding(s), ${String(real.dead.length)} dead exemption(s), ${String(real.scanned)} file(s)`,
    );
  else
    console.log(
      `  ${GREEN}✓${OFF} the real tree ${DIM}→ accepted over ${String(real.scanned)} files${OFF}`,
    );

  if (wrong.length) {
    console.log(`\n${RED}${BOLD}${String(wrong.length)} case(s) did not discriminate${OFF}\n`);
    for (const w of wrong) console.log(`  ${RED}✗${OFF} ${w}`);
    ciError('app glyph proof: cases did not discriminate', wrong.join('\n'));
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}All ${String(cases.length + 1)} cases discriminate.${OFF}\n`);
}

/* ======================================================================== main */

if (process.argv.includes('--prove')) {
  prove();
} else {
  const { violations, dead, scanned } = appGlyphFindings();
  console.log(`\n${BOLD}Irodora — no screen draws an icon of its own${OFF}\n`);
  console.log(
    `${DIM}  ${String(scanned)} file(s) scanned across ${SCANNED.join(', ')}; ${String(EXEMPT.length)} declared exemption(s)${OFF}`,
  );
  console.log(
    `  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: a drawing assembled from Views — borders and rotations — which source analysis cannot tell from layout.${OFF}`,
  );

  if (scanned === 0) {
    ciError('app glyphs: nothing scanned', `no source files under ${SCANNED.join(', ')}`);
    console.log(
      `\n${RED}${BOLD}Nothing was scanned — a check over no files is not a pass.${OFF}\n`,
    );
    process.exit(1);
  }
  if (violations.length + dead.length) {
    console.log(`\n${RED}${BOLD}App glyphs FAILED${OFF}\n`);
    for (const v of violations)
      console.log(
        `  ${RED}✗${OFF} apps/mobile/${v.file}:${String(v.line)} ${v.detail} — draw it with Glyph or IconButton from @irodora/ui`,
      );
    for (const d of dead)
      console.log(
        `  ${RED}✗${OFF} apps/mobile/${d.file} is exempt from the ${d.rule} rule and no longer needs to be — remove the exemption`,
      );
    ciError(
      `${String(violations.length + dead.length)} app glyph finding(s)`,
      [
        ...violations.map((v) => `${v.file}:${String(v.line)} ${v.detail}`),
        ...dead.map((d) => `dead exemption: ${d.file} (${d.rule})`),
      ].join('\n'),
    );
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}No screen draws an icon of its own.${OFF}\n`);
}
