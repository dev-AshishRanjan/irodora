#!/usr/bin/env node
/**
 * Irodora — every relative import in `apps/mobile` resolves the way METRO resolves.
 *
 * ## Why this exists
 *
 * `apps/mobile/app/index.tsx` imported `'../src/screens/Home.js'`. The file is `Home.tsx`.
 * The bundle failed — **fifteen minutes into a Gradle build, on the first occasion anything
 * had ever bundled this app.**
 *
 * The convention was not ambiguous. `apps/mobile/tsconfig.json` sets
 * `moduleResolution: "bundler"` and its own comment reads *"extensionless relative imports …
 * no `.js` suffix required on a `.tsx` sibling"*. The source used the other convention anyway
 * — the NodeNext style that `packages/*` correctly uses, because those resolve through Node.
 *
 * **Three checks accommodated it rather than catching it:**
 *
 * | check | why it passed |
 * |---|---|
 * | `typecheck` | `bundler` resolution permits BOTH extensionless and the `.js`→`.ts` rewrite |
 * | `test` | `jest.config.mjs` carried `moduleNameMapper` stripping `.js` — a documented workaround |
 * | `lint` | no import-extension rule |
 *
 * Metro resolves literally and was the only consumer that would ever object. The jest mapper
 * is the sharpest part: somebody noticed the mismatch, wrote a workaround, and documented it,
 * which removed the last signal that would have surfaced this before a device build.
 *
 * So this checks the app's imports against Metro's own algorithm, in a second, in gate 2 —
 * rather than in a twenty-minute build nobody runs locally because it needs a JDK and an
 * Android SDK.
 *
 * ## What it does NOT check
 *
 * **Bare specifiers.** `@irodora/ui` resolves through `node_modules` and its `main` points at
 * `dist/`, which only exists after `pnpm build` — so a static check would report a false
 * failure on a fresh clone. That gap has its own scar: the lane bundled before it built, and
 * Metro reported it as *"invalid package.json configuration"* in a workspace package. The
 * fix there was a build step, not a resolver rule.
 *
 * Usage:
 *   node scripts/verify-app-imports.mjs
 *   node scripts/verify-app-imports.mjs --prove
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ROOT, 'apps/mobile');
const SCANNED = ['app', 'src', 'test', 'plugins'];

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Metro's source extensions, and the platform variants it tries first.
 *
 * Taken from the resolver's own error output rather than from memory — it prints the exact
 * list it tried, and copying that is the only way this stays true across an Expo upgrade.
 */
const SOURCE_EXTS = ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'cjs'];
const PLATFORMS = ['android', 'ios', 'native', ''];

/** Assets resolve by exact filename; there is no extension search to do. */
const ASSET_EXTS = /\.(ttf|otf|woff2?|png|jpe?g|gif|webp|avif|svg|mp4|wav|mp3|db|sqlite)$/i;

const candidates = (base) => {
  const out = [base];
  for (const ext of SOURCE_EXTS)
    for (const platform of PLATFORMS) out.push(`${base}.${platform ? `${platform}.` : ''}${ext}`);
  for (const ext of SOURCE_EXTS)
    for (const platform of PLATFORMS)
      out.push(join(base, `index.${platform ? `${platform}.` : ''}${ext}`));
  return out;
};

/** `from '…'`, `import('…')`, `require('…')` — relative specifiers only. */
const IMPORT_PATTERN = /(?:from\s+|import\(\s*|require\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(tsx?|jsx?|mjs)$/.test(p) ? [p] : [];
  });
}

/** Every unresolved relative import under `apps/mobile`. Data, so `--prove` can assert on it. */
export function unresolvedImports(appRoot = APP) {
  const problems = [];
  let checked = 0;

  for (const group of SCANNED)
    for (const file of sourceFiles(join(appRoot, group))) {
      const text = readFileSync(file, 'utf8');
      for (const [, , specifier] of text.matchAll(IMPORT_PATTERN)) {
        checked++;
        const base = resolve(dirname(file), specifier);
        if (ASSET_EXTS.test(specifier)) {
          if (!existsSync(base))
            problems.push({ file: relative(ROOT, file), specifier, tried: [base] });
          continue;
        }
        const tried = candidates(base);
        if (!tried.some((p) => existsSync(p) && statSync(p).isFile()))
          problems.push({ file: relative(ROOT, file), specifier, tried });
      }
    }

  return { problems, checked };
}

/* ===================================================================== --prove */

function prove() {
  console.log(`\n${BOLD}Irodora — app import proof${OFF}\n`);

  const work = join(ROOT, '.cache/app-imports-proof');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, 'src'), { recursive: true });
  mkdirSync(join(work, 'app'), { recursive: true });
  writeFileSync(join(work, 'src', 'thing.tsx'), 'export const thing = 1;\n');

  const cases = [
    {
      name: 'extensionless, which is what this app declares',
      source: "import { thing } from '../src/thing';\n",
      mustFail: false,
    },
    {
      // THE ACTUAL DEFECT. TypeScript accepts it under `bundler` resolution and Metro does not.
      name: 'a `.js` suffix on a `.tsx` sibling — the NodeNext style, wrong here',
      source: "import { thing } from '../src/thing.js';\n",
      mustFail: true,
    },
    {
      name: 'a file that simply is not there',
      source: "import { nope } from '../src/nope';\n",
      mustFail: true,
    },
    {
      name: 'a bare specifier, which this deliberately does not judge',
      source: "import { View } from 'react-native';\n",
      mustFail: false,
    },
    {
      name: 'extensionless again (the baseline either side)',
      source: "import { thing } from '../src/thing';\n",
      mustFail: false,
    },
  ];

  const wrong = [];
  for (const c of cases) {
    writeFileSync(join(work, 'app', 'index.tsx'), c.source);
    const { problems } = unresolvedImports(work);
    const failed = problems.length > 0;
    if (failed !== c.mustFail)
      wrong.push(
        `${c.name}: expected ${c.mustFail ? 'RED' : 'GREEN'}, got ${failed ? 'RED' : 'GREEN'}`,
      );
    else
      console.log(
        `  ${GREEN}✓${OFF} ${c.name} ${DIM}→ ${c.mustFail ? 'rejected' : 'accepted'}${OFF}`,
      );
  }

  rmSync(work, { recursive: true, force: true });

  if (wrong.length) {
    console.log(`\n${RED}${BOLD}${String(wrong.length)} case(s) did not discriminate${OFF}\n`);
    for (const w of wrong) console.log(`  ${RED}✗${OFF} ${w}`);
    ciError('app import proof: cases did not discriminate', wrong.join('\n'));
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}All ${String(cases.length)} cases discriminate.${OFF}\n`);
}

/* ======================================================================== main */

if (process.argv.includes('--prove')) {
  prove();
} else {
  const { problems, checked } = unresolvedImports();

  console.log(`\n${BOLD}Irodora — app imports resolve under Metro${OFF}\n`);
  console.log(
    `${DIM}  ${String(checked)} relative import(s) checked across ${SCANNED.join(', ')}${OFF}`,
  );
  console.log(
    `  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: bare specifiers. \`@irodora/ui\` resolves through ` +
      `node_modules to a \`dist/\` that only exists after \`pnpm build\`, so judging them statically ` +
      `would fail on a fresh clone. That gap cost a separate CI round and its fix was a build ` +
      `step, not a resolver rule.${OFF}`,
  );

  if (problems.length) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} import(s) will not resolve${OFF}\n`);
    for (const p of problems) {
      console.log(`  ${RED}✗ ${p.file}${OFF}`);
      console.log(`    ${DIM}${p.specifier}${OFF}`);
      if (p.specifier.endsWith('.js'))
        console.log(
          `    ${DIM}This app resolves through Metro: tsconfig sets moduleResolution "bundler",` +
            ` so drop the .js. The .js form is correct in packages/*, which resolve through` +
            ` Node under NodeNext — that is why it looks right and is not.${OFF}`,
        );
    }
    ciError(
      `${String(problems.length)} app import(s) will not resolve under Metro`,
      problems.map((p) => `${p.file}: ${p.specifier}`).join('\n'),
    );
    console.log(`\n${RED}${BOLD}App imports FAILED.${OFF}\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}Every relative import resolves.${OFF}\n`);
}
