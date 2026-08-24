/**
 * Regenerate every derived artefact from `docs/design/design-system.manifest.json`.
 *
 * Two jobs, in this order:
 *
 * 1. **Rewrite the `srgb` field of every token** from its own OKLCh (ADR-0043). Nobody types
 *    a hex; the 37-of-38 drift that made this rule necessary is only impossible once the
 *    second value stops being authored.
 * 2. **Emit the five targets.** CSS, Tailwind, TypeScript, React Native and HeroUI's
 *    global.css — from one source, so a token that exists on web and not on mobile cannot be
 *    constructed, and so HeroUI's theme cannot become a second place colour is decided
 *    (ADR-0062).
 *
 * It lives in scripts/ rather than in the package because it reads files: `src/` is bundled by
 * `apps/mobile`, where a node:fs import is a crash on a phone, and the package's own ESLint
 * project covers TypeScript only.
 *
 * `--check` emits nothing and exits 1 if anything would change. That is what CI runs; a
 * generator whose output is never compared is a generator nobody is checking.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = join(ROOT, 'packages', 'design-tokens');
const MANIFEST = join(ROOT, 'docs', 'design', 'design-system.manifest.json');

const {
  parseManifest,
  derivedSrgb,
  emitCss,
  emitTailwind,
  emitTypescript,
  emitReactNative,
  emitHeroui,
} = await import(pathToFileURL(join(PACKAGE, 'dist', 'index.js')).href);

const APP = join(ROOT, 'apps', 'mobile');

const checkOnly = process.argv.includes('--check');

const raw = readFileSync(MANIFEST, 'utf8');
const parsed = JSON.parse(raw);
const manifest = parseManifest(parsed);

// --- 1. the derived srgb field ------------------------------------------------------

const rewritten = [];
for (const theme of ['dark', 'light'])
  for (const [name, token] of Object.entries(manifest.color[theme])) {
    const expected = derivedSrgb(name, token);
    if (parsed.color[theme][name].srgb === expected) continue;
    rewritten.push(`${theme}.${name}: ${parsed.color[theme][name].srgb} -> ${expected}`);
    parsed.color[theme][name].srgb = expected;
  }

// --- 2. the five targets -------------------------------------------------------------

const outputs = [
  [join(PACKAGE, 'generated', 'tokens.css'), emitCss(manifest)],
  [join(PACKAGE, 'generated', 'tokens.tailwind.css'), emitTailwind(manifest)],
  [join(PACKAGE, 'src', 'generated', 'tokens.ts'), emitTypescript(manifest)],
  [join(PACKAGE, 'src', 'generated', 'native.ts'), emitReactNative(manifest)],
  // The app's own stylesheet. `emitHeroui` THROWS rather than returning a failing sheet —
  // a generator that writes bad output and reports the problem separately is a generator
  // whose output someone ships.
  [join(APP, 'global.css'), emitHeroui(manifest)],
];

const stale = [];
for (const [path, content] of outputs) {
  let current;
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    current = null;
  }
  if (current !== content) stale.push(path);
}

if (checkOnly) {
  if (rewritten.length === 0 && stale.length === 0) {
    console.log('design tokens: generated output is current.');
    process.exit(0);
  }
  console.error(
    'design tokens: generated output is STALE. Run `pnpm --filter @irodora/design-tokens generate`.',
  );
  for (const line of rewritten) console.error(`  srgb  ${line}`);
  for (const path of stale) console.error(`  file  ${path.replace(ROOT, '.')}`);
  process.exit(1);
}

// The manifest is rewritten by patching the parsed object and re-serialising only the srgb
// strings, so hand-authored formatting, comments-as-_note fields and key order survive. A
// full JSON.stringify would reformat 167 lines a designer maintains by hand.
let next = raw;
for (const theme of ['dark', 'light'])
  for (const [name, token] of Object.entries(manifest.color[theme])) {
    const expected = derivedSrgb(name, token);
    const current = JSON.parse(raw).color[theme][name].srgb;
    if (current === expected) continue;
    const needle = `"srgb": ${JSON.stringify(current)}`;
    const replacement = `"srgb": ${JSON.stringify(expected)}`;
    const occurrences = next.split(needle).length - 1;
    if (occurrences === 0) throw new Error(`could not locate ${needle} for ${theme}.${name}`);
    next = next.replace(needle, replacement);
  }
if (next !== raw) writeFileSync(MANIFEST, next, 'utf8');

for (const [path, content] of outputs) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

console.log(
  `design tokens: ${rewritten.length} srgb value(s) regenerated, ${outputs.length} target(s) written.`,
);
for (const line of rewritten) console.log(`  ${line}`);
