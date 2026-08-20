#!/usr/bin/env node
/**
 * Generate the bundled Japanese font subset (F-076,
 * [ADR-0057](../docs/adr/0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md)).
 *
 * ```
 * content/colors/**  +  apps/mobile/src/i18n/ja.ts  +  kana, punctuation, Latin
 *          ↓ union of codepoints
 *   hb-subset over Noto Sans JP Variable
 *          ↓
 * apps/mobile/assets/fonts/NotoSansJP-Subset.ttf     ← committed
 * ```
 *
 * ## The subset is generated from OUR content, not from a standard character set
 *
 * ADR-0057's central point. Subsetting to JIS X 0208 Level 1+2 would be the conventional
 * choice and would be a **guess about our own content**: 纁 (sohi) is not in it, and a corpus
 * of traditional colour names is exactly where such characters live. The corpus is an
 * immutable signed bundle at a pinned version, so the set of codepoints the app can render is
 * knowable at build time — which is the property that makes this exact rather than hopeful.
 *
 * ## What is committed and what is not
 *
 * The **subset** is committed; the 9.6 MB source is not. It is a downloaded build input, and
 * `verify-font-coverage.mjs` checks the committed subset against the required set on every
 * `content` gate run — so CI never needs the source, and a corpus publish that introduces an
 * uncovered character fails there rather than here.
 *
 * ```
 * node scripts/generate-font-subset.mjs           regenerate the subset
 * node scripts/generate-font-subset.mjs --check   verify it is current, write nothing
 * ```
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The source face. SIL Open Font License 1.1, recorded in NOTICE.md.
 *
 * The Google Fonts canonical distribution rather than a CDN URL: it is versioned in git,
 * it carries its licence alongside, and a CDN can serve a differently-hinted binary for the
 * same name.
 */
const SOURCE_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf';
const SOURCE = join(ROOT, '.cache', 'fonts', 'NotoSansJP-Variable.ttf');
const OUT = join(ROOT, 'apps', 'mobile', 'assets', 'fonts', 'NotoSansJP-Subset.ttf');
const CORPUS = join(ROOT, 'content', 'colors');
const JA = join(ROOT, 'apps', 'mobile', 'src', 'i18n', 'ja.ts');

/** Ranges the interface needs regardless of content. */
const ALWAYS = [
  [0x0020, 0x007e], // Latin and digits — a colour name is shown beside its hex
  [0x3000, 0x303f], // Japanese punctuation, including the ones kinsoku is about
  [0x3040, 0x309f], // hiragana
  [0x30a0, 0x30ff], // katakana
  [0xff00, 0xff5e], // fullwidth forms
];

const isJapanese = (cp) =>
  (cp >= 0x3040 && cp <= 0x30ff) ||
  (cp >= 0x4e00 && cp <= 0x9fff) ||
  (cp >= 0x3400 && cp <= 0x4dbf);

function requiredCodepoints() {
  const required = new Set();
  for (const [lo, hi] of ALWAYS) for (let c = lo; c <= hi; c += 1) required.add(c);

  let entries = 0;
  let fromContent = 0;
  const add = (text) => {
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined && isJapanese(cp) && !required.has(cp)) {
        required.add(cp);
        fromContent += 1;
      }
    }
  };

  if (existsSync(JA)) add(readFileSync(JA, 'utf8'));
  if (existsSync(CORPUS))
    for (const file of readdirSync(CORPUS)) {
      if (!file.endsWith('.json')) continue;
      entries += 1;
      add(readFileSync(join(CORPUS, file), 'utf8'));
    }

  return { required, entries, fromContent };
}

async function ensureSource() {
  if (existsSync(SOURCE)) return readFileSync(SOURCE);
  console.log(`${DIM}  source not cached; fetching Noto Sans JP Variable...${OFF}`);
  mkdirSync(dirname(SOURCE), { recursive: true });
  const response = await fetch(SOURCE_URL);
  if (!response.ok)
    throw new Error(`could not fetch the source font: HTTP ${String(response.status)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(SOURCE, bytes);
  console.log(`${DIM}  cached ${String(bytes.length)} bytes at .cache/fonts/${OFF}`);
  return bytes;
}

console.log(`\n${BOLD}Font subset${OFF}\n`);

const { required, entries, fromContent } = requiredCodepoints();
console.log(
  `${DIM}  ${String(required.size)} codepoint(s) required — ${String(fromContent)} from ` +
    `content (${String(entries)} authored corpus entr(ies) + the ja catalogue), the rest ` +
    `from the always-included ranges.${OFF}`,
);

const source = await ensureSource();
const text = [...required].map((cp) => String.fromCodePoint(cp)).join('');
const subset = await subsetFont(source, text, { targetFormat: 'truetype' });

const check = process.argv.includes('--check');
const existing = existsSync(OUT) ? readFileSync(OUT) : null;

if (check) {
  if (existing === null) {
    console.log(`\n${RED}${BOLD}No subset committed.${OFF} Run without --check.\n`);
    process.exit(1);
  }
  // Byte comparison. hb-subset is deterministic for the same input and codepoint set, so a
  // difference means the content changed and the subset was not regenerated — which is the
  // failure that produces tofu on a device with every gate green.
  if (!existing.equals(subset)) {
    console.log(
      `\n${RED}${BOLD}The committed subset is stale.${OFF}\n` +
        `${DIM}  Content changed and the font was not regenerated. Run:\n` +
        `    node scripts/generate-font-subset.mjs${OFF}\n`,
    );
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Subset is current.${OFF} ${DIM}${String(subset.length)} bytes.${OFF}\n`,
  );
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, subset);
console.log(
  `\n${GREEN}${BOLD}Subset written.${OFF} ${DIM}${String(subset.length)} bytes, from a ` +
    `${String(source.length)}-byte source — ${(100 - (subset.length / source.length) * 100).toFixed(1)}% smaller.${OFF}\n`,
);
