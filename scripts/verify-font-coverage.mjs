/**
 * Font coverage — every codepoint the app can render must exist in the face that renders it.
 *
 * ## The failure this exists to catch
 *
 * A missing glyph renders as **tofu**: an empty box. In this product the Japanese text most
 * likely to contain a rare character is the *colour name itself* — 蘇芳, 纁, 苅安 — so the
 * failure lands on the corpus entries that are the reason the product exists, in front of the
 * audience whose judgement matters most, with every other gate green.
 *
 * ## Why it is checkable at all
 *
 * The corpus is an immutable signed bundle at a pinned version (ADR-0046, ADR-0051 §4), so the
 * set of codepoints the app **can** render is knowable at build time. That property is what
 * made ADR-0057 choose a bundled subset over the platform font: with the platform font, the
 * same claim is verifiable only on a device, on every OS version, forever.
 *
 * ## What it refuses to do
 *
 * **Report a green run over nothing as coverage.** `content/colors/` currently holds one file
 * and it is `.gitkeep` — F-012 is blocked on OQ-5. So the count of authored corpus entries is
 * printed beside the codepoint count on every run, and "no font asset yet" exits non-zero
 * rather than passing [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]].
 *
 * ```
 * node scripts/verify-font-coverage.mjs           check the real asset
 * node scripts/verify-font-coverage.mjs --prove   build a synthetic font and watch it fail
 * ```
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmapCodepoints } from './sfnt-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Where the bundled Japanese face lives once ADR-0057's asset lands. */
const FONT = join(ROOT, 'apps', 'mobile', 'assets', 'fonts', 'NotoSansJP-Subset.ttf');
const CORPUS = join(ROOT, 'content', 'colors');
const JA_CATALOGUE = join(ROOT, 'apps', 'mobile', 'src', 'i18n', 'ja.ts');

// The `cmap` reader is shared with the subset generator and the measuring tools
// (scripts/sfnt-read.mjs), so the three cannot disagree about what a font maps.

// ---------------------------------------------------------------------------------------
// What must be covered.
// ---------------------------------------------------------------------------------------

const codepointsOf = (s) => [...s].map((ch) => ch.codePointAt(0));

/** Japanese script ranges. Latin and punctuation come from the platform face. */
const isJapanese = (cp) =>
  (cp >= 0x3040 && cp <= 0x30ff) ||
  (cp >= 0x4e00 && cp <= 0x9fff) ||
  (cp >= 0x3400 && cp <= 0x4dbf);

const RULES = join(ROOT, 'content', 'rules');
const PALETTES = join(ROOT, 'content', 'palettes');
const COMBINATIONS = join(ROOT, 'content', 'combinations');

function requiredCodepoints() {
  const required = new Map(); // codepoint -> where it came from

  // The ja catalogue. Read as text rather than imported: this script must run before any
  // build, and it must not depend on the app's module graph resolving.
  if (existsSync(JA_CATALOGUE))
    for (const cp of codepointsOf(readFileSync(JA_CATALOGUE, 'utf8')))
      if (isJapanese(cp)) required.set(cp, 'ja catalogue');

  // The published corpus. Every Japanese character in every entry.
  let entries = 0;
  if (existsSync(CORPUS))
    for (const file of readdirSync(CORPUS)) {
      if (!file.endsWith('.json')) continue;
      entries += 1;
      for (const cp of codepointsOf(readFileSync(join(CORPUS, file), 'utf8')))
        if (isJapanese(cp)) required.set(cp, `corpus/${file}`);
    }

  /*
   * The phrase lexicon (F-021). Its Japanese TERMS are what a person types into the Finder and
   * sees echoed in the field, so they render in the app's own face exactly as a colour name
   * does. A vocabulary the app cannot draw is a query nobody can see themselves entering.
   *
   * Only `term` and the two name-ish fields are read: a rationale is editorial prose that never
   * reaches a screen, and requiring the whole subset to carry it would bloat the face for text
   * nobody renders.
   */
  if (existsSync(RULES))
    for (const file of readdirSync(RULES)) {
      if (!file.startsWith('phrase-lexicon.') || !file.endsWith('.json')) continue;
      let parsed;
      try {
        parsed = JSON.parse(readFileSync(join(RULES, file), 'utf8'));
      } catch {
        continue;
      }
      for (const t of parsed.terms ?? [])
        for (const cp of codepointsOf(String(t.term ?? '')))
          if (isJapanese(cp)) required.set(cp, `rules/${file}`);
    }

  /*
   * The taxonomy vocabulary (F-090). Its Japanese FAMILY WORDS render on the Atlas filter,
   * every Atlas row and the colour detail screen — the same reach as a colour name, and the
   * same reason the phrase lexicon is read above. Only the `ja` field: a rationale is
   * editorial prose that never reaches a screen.
   */
  const taxonomyFile = join(ROOT, 'content', 'taxonomy.json');
  if (existsSync(taxonomyFile)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(taxonomyFile, 'utf8'));
    } catch {
      parsed = null;
    }
    for (const f of parsed?.families ?? [])
      for (const cp of codepointsOf(String(f.ja ?? '')))
        if (isJapanese(cp)) required.set(cp, 'content/taxonomy.json');
    // The family CHIPS (F-224, ADR-0108): each prints its kanji beside its romaji on the Atlas
    // filter. Only `kanji` — the rationale never reaches a screen.
    for (const g of parsed?.groups ?? [])
      for (const cp of codepointsOf(String(g.kanji ?? '')))
        if (isJapanese(cp)) required.set(cp, 'content/taxonomy.json groups');
  }

  /*
   * Palette and combination NAMES (F-224). The colour detail screen prints each palette's
   * Japanese name (ColourDetail, "In these palettes"), Palette Studio prints it beside the
   * English one (mockup 10: "Autumn Dew • 秋の露"), the profile prints kasane names (23), and the
   * combinations screen prints each curated combination's. None of the four was read here until
   * F-224, and three palette names were drawing tofu (森, 鉱, 藍). Only `name.ja`: a derivation
   * is editorial prose that never reaches a screen. IN STEP WITH generate-font-subset.mjs.
   */
  for (const [dir, label] of [
    [PALETTES, 'palettes'],
    [COMBINATIONS, 'combinations'],
  ])
    if (existsSync(dir))
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        let parsed;
        try {
          parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        } catch {
          continue;
        }
        for (const cp of codepointsOf(String(parsed?.name?.ja ?? '')))
          if (isJapanese(cp)) required.set(cp, `${label}/${file}`);
      }
  return { required, entries };
}

// ---------------------------------------------------------------------------------------
// --prove: a synthetic font, so the checker is provable before the real asset exists.
//
// Building a minimal TTF is a few dozen bytes of header plus one cmap format-4 subtable. It
// means this check can be watched CATCHING a missing glyph today rather than being trusted
// until the day it matters — which is the day a corpus entry ships with a rare kanji.
// ---------------------------------------------------------------------------------------

function syntheticFont(codepoints) {
  const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
  const segments = sorted.map((c) => ({ start: c, end: c }));
  segments.push({ start: 0xffff, end: 0xffff });
  const segX2 = segments.length * 2;

  const sub = Buffer.alloc(16 + segX2 * 4);
  sub.writeUInt16BE(4, 0); // format
  sub.writeUInt16BE(sub.length, 2); // length
  sub.writeUInt16BE(0, 4); // language
  sub.writeUInt16BE(segX2, 6);
  const ends = 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  segments.forEach((s, i) => {
    sub.writeUInt16BE(s.end, ends + i * 2);
    sub.writeUInt16BE(s.start, starts + i * 2);
    // idDelta maps the codepoint to a non-zero glyph id. `1 - start` gives glyph 1.
    sub.writeUInt16BE(s.start === 0xffff ? 1 : (1 - s.start) & 0xffff, deltas + i * 2);
    sub.writeUInt16BE(0, ranges + i * 2);
  });

  const cmap = Buffer.concat([Buffer.alloc(12), sub]);
  cmap.writeUInt16BE(0, 0); // version
  cmap.writeUInt16BE(1, 2); // numTables
  cmap.writeUInt16BE(3, 4); // platform: Windows
  cmap.writeUInt16BE(1, 6); // encoding: BMP
  cmap.writeUInt32BE(12, 8); // offset to subtable

  const dir = Buffer.alloc(12 + 16);
  dir.writeUInt32BE(0x00010000, 0);
  dir.writeUInt16BE(1, 4); // numTables
  dir.write('cmap', 12, 'ascii');
  dir.writeUInt32BE(0, 16); // checksum — not validated by this checker
  dir.writeUInt32BE(dir.length, 20); // offset
  dir.writeUInt32BE(cmap.length, 24); // length

  return Buffer.concat([dir, cmap]);
}

function prove() {
  console.log(`\n${BOLD}Font coverage — proving the check${OFF}\n`);
  const present = [0x85cd, 0x9f20]; // 藍 鼠
  // 纁 (sohi) — a real traditional colour name, outside JIS X 0208 Level 1+2, and exactly
  // the kind of character a subset drops. Verified as U+7E81 rather than assumed: the first
  // draft used U+7E41, which is 繁 — a common kanji, and a decoy that is not the thing it
  // claims to be is a decoy nobody will re-examine.
  const absent = 0x7e81;
  const font = syntheticFont(present);
  const covered = cmapCodepoints(font);

  const failures = [];
  for (const cp of present)
    if (!covered.has(cp))
      failures.push(`baseline: U+${cp.toString(16).toUpperCase()} should be covered and is not`);
  if (covered.has(absent))
    failures.push(
      `decoy: U+${absent.toString(16).toUpperCase()} is NOT in the synthetic font and the ` +
        'parser claims it is — the check cannot detect a missing glyph',
    );

  for (const cp of present)
    console.log(
      `  ${GREEN}✓${OFF} covered   U+${cp.toString(16).toUpperCase()} ${String.fromCodePoint(cp)}`,
    );
  console.log(
    `  ${GREEN}✓${OFF} detected  U+${absent.toString(16).toUpperCase()} ` +
      `${String.fromCodePoint(absent)} ${DIM}absent, and reported absent${OFF}`,
  );

  if (failures.length > 0) {
    for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF}`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A present glyph reads as covered and an ` +
      `absent one reads as missing, on a font built for this run.${OFF}\n`,
  );
}

// ---------------------------------------------------------------------------------------

if (process.argv.includes('--prove')) {
  prove();
  process.exit(0);
}

console.log(`\n${BOLD}Font coverage${OFF}\n`);

const { required, entries } = requiredCodepoints();

// The count is printed BESIDE the corpus entry count, always. A reader must be able to tell
// "every codepoint is covered" from "there were no codepoints".
console.log(
  `${DIM}  ${String(required.size)} Japanese codepoint(s) required, from ${String(entries)} ` +
    `authored corpus entr(ies), the ja catalogue, the phrase lexicon, the taxonomy vocabulary and its chips, and the palette and combination names.${OFF}`,
);

if (!existsSync(FONT)) {
  console.log(
    `\n${YELLOW}No bundled font asset at ${FONT.replace(ROOT, '.')}${OFF}\n` +
      `${DIM}  ADR-0057 chose a bundled Noto Sans JP subset generated from the corpus, and\n` +
      '  the asset has not landed yet. This is NOT a pass: the app currently falls back to\n' +
      '  the platform face, so "every kanji renders" is unverified rather than verified.\n' +
      `  Run with --prove to check that this checker itself discriminates.${OFF}`,
  );
  process.exit(1);
}

const covered = cmapCodepoints(readFileSync(FONT));
const missing = [...required.entries()].filter(([cp]) => !covered.has(cp));

if (missing.length > 0) {
  console.log(`\n${RED}${BOLD}${String(missing.length)} codepoint(s) not in the font${OFF}`);
  for (const [cp, from] of missing.slice(0, 20))
    console.log(
      `  ${RED}✗${OFF} U+${cp.toString(16).toUpperCase().padStart(4, '0')} ` +
        `${String.fromCodePoint(cp)}  ${DIM}${from}${OFF}`,
    );
  console.log(
    `\n${DIM}  Regenerate the subset. Never relax the check: a codepoint the app can render\n` +
      `  and the font cannot is a tofu box on the product's most important content.${OFF}`,
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Font coverage verified.${OFF} ` +
    `${DIM}${String(required.size)} required, ${String(covered.size)} in the face.${OFF}\n`,
);
