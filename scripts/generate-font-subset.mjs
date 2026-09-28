#!/usr/bin/env node
/**
 * Generate the bundled font subsets: the Japanese sans (F-076,
 * [ADR-0057](../docs/adr/0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md)),
 * and since F-226 the serif and the mincho, cut static from pinned sources
 * ([ADR-0112](../docs/adr/0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md)).
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
import { createHash } from 'node:crypto';
import subsetFont from 'subset-font';
import { tables } from './sfnt-read.mjs';

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

const RULES = join(ROOT, 'content', 'rules');
const PALETTES = join(ROOT, 'content', 'palettes');
const COMBINATIONS = join(ROOT, 'content', 'combinations');

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

  /*
   * The phrase lexicon's Japanese TERMS (F-021) — what a person types into the Finder and sees
   * echoed in the field. THIS BLOCK MUST STAY IN STEP WITH `verify-font-coverage.mjs`, which
   * keeps its own copy of this collection: if the check requires a codepoint this generator
   * does not add, gate 11 goes red and stays red until they agree. That direction is loud; the
   * other direction only adds a glyph nobody renders.
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
      for (const t of parsed.terms ?? []) add(String(t.term ?? ''));
    }

  // The taxonomy vocabulary (F-090). IN STEP WITH verify-font-coverage.mjs, which keeps its
  // own copy of this collection — see the note on the lexicon block above.
  const taxonomyFile = join(ROOT, 'content', 'taxonomy.json');
  if (existsSync(taxonomyFile)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(taxonomyFile, 'utf8'));
    } catch {
      parsed = null;
    }
    for (const f of parsed?.families ?? []) add(String(f.ja ?? ''));
    // The family chips' kanji (F-224). IN STEP WITH verify-font-coverage.mjs.
    for (const g of parsed?.groups ?? []) add(String(g.kanji ?? ''));
  }

  // Palette and combination names (F-224) — the colour detail screen, Palette Studio, the
  // profile and the combinations screen print them. IN STEP WITH verify-font-coverage.mjs; only
  // `name.ja`, never the prose.
  for (const dir of [PALETTES, COMBINATIONS])
    if (existsSync(dir))
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        let parsed;
        try {
          parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        } catch {
          continue;
        }
        add(String(parsed?.name?.ja ?? ''));
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

// ---------------------------------------------------------------------------------------
// F-226 (ADR-0112): the serif and the mincho. Each is CUT from a pinned variable source —
// `wght` pinned, so the committed file is static — and its name table is rebuilt so the file
// says what it is.
// ---------------------------------------------------------------------------------------

/** The pinned sources (google/fonts commit + sha256). A source that differs is refused. */
const SOURCES = JSON.parse(readFileSync(join(ROOT, 'scripts', 'font-sources.json'), 'utf8'));
const INVENTORY = join(ROOT, 'mockups', 'inventory');

async function pinnedSource(id) {
  const pin = SOURCES.faces.find((f) => f.id === id);
  if (pin === undefined) throw new Error(`scripts/font-sources.json pins no source "${id}"`);
  const path = join(ROOT, pin.cache, pin.file);
  let bytes;
  if (existsSync(path)) bytes = readFileSync(path);
  else {
    console.log(`${DIM}  ${pin.file} not cached; fetching it at the pinned commit...${OFF}`);
    const response = await fetch(pin.url);
    if (!response.ok)
      throw new Error(`could not fetch ${pin.file}: HTTP ${String(response.status)}`);
    bytes = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== pin.sha256)
    throw new Error(
      `${pin.file} is not the pinned source (sha256 ${sha}, pinned ${pin.sha256}). A font that ` +
        'changed upstream is a different font: re-measure it (ADR-0112) before re-pinning.',
    );
  return bytes;
}

/**
 * The Latin the serif is set in: printable ASCII, Latin-1 and the general punctuation English
 * copy uses (’ “ ” – — …). The serif never sets a figure (ADR-0112 d.5), but ASCII carries them
 * anyway: a subset that silently lacks a digit is a tofu box the day someone breaks that rule.
 * IN STEP WITH verify-font-coverage.mjs, which requires the same ranges.
 */
const SERIF_RANGES = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x2010, 0x2027],
  [0x2030, 0x203a],
];
function serifText() {
  const out = [];
  for (const [lo, hi] of SERIF_RANGES) for (let c = lo; c <= hi; c += 1) out.push(c);
  return out;
}

/**
 * The mincho's text, DERIVED FROM THE INVENTORIES: every element drawn in the mincho names what
 * it binds, and each binding maps to the content it reads. A mincho element binding anything
 * else is refused here, because a face subset to text nobody collected is tofu with every gate
 * green (E-145's failure, a third time). IN STEP WITH verify-font-coverage.mjs.
 */
const MINCHO_BINDINGS = {
  'corpus:entry.kanji': () => {
    const out = [];
    for (const file of readdirSync(CORPUS)) {
      if (!file.endsWith('.json')) continue;
      const kanji = JSON.parse(readFileSync(join(CORPUS, file), 'utf8'))?.name?.kanji;
      if (typeof kanji === 'string') for (const ch of kanji) out.push(ch.codePointAt(0));
    }
    return out;
  },
};
function minchoText() {
  const out = new Set();
  let elements = 0;
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const walk = (els) => {
      for (const e of els ?? []) {
        if (e.type?.face === 'mincho') {
          elements += 1;
          const collect = MINCHO_BINDINGS[e.binding];
          if (collect === undefined)
            throw new Error(
              `${e.id} is drawn in the mincho and binds "${String(e.binding)}", which this generator ` +
                'cannot read. Teach MINCHO_BINDINGS (and verify-font-coverage.mjs) where that text lives.',
            );
          for (const cp of collect()) out.add(cp);
        }
        walk(e.children);
      }
    };
    walk(JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')).elements);
  }
  if (elements === 0)
    throw new Error('no inventory element is drawn in the mincho; nothing to cut');
  return [...out];
}

// ---------------------------------------------------------------------------------------
// The name table, rebuilt. HarfBuzz's instancer keeps the DEFAULT instance's names — a Noto
// Serif JP pinned at 400 still calls itself "ExtraLight" — and drops the licence records (13,
// 14). So the records are rebuilt from the SOURCE: its copyright, version, designer, URLs and
// licence carried over, the four names that say what this file is written fresh, the
// typographic and variation names (16, 17, 25) dropped, and the instance names the cut still
// references (256+) kept from the cut.
// ---------------------------------------------------------------------------------------

function rawNameRecords(buf) {
  const t = tables(buf).get('name');
  if (t === undefined) throw new Error('no name table');
  const base = t.offset;
  const count = buf.readUInt16BE(base + 2);
  const strings = base + buf.readUInt16BE(base + 4);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const r = base + 6 + i * 12;
    const [platform, encoding, language, id, length, offset] = [0, 2, 4, 6, 8, 10].map((k) =>
      buf.readUInt16BE(r + k),
    );
    out.push({
      platform,
      encoding,
      language,
      id,
      bytes: buf.subarray(strings + offset, strings + offset + length),
    });
  }
  return out;
}

const utf16be = (s) => {
  const b = Buffer.alloc(s.length * 2);
  for (let i = 0; i < s.length; i += 1) b.writeUInt16BE(s.charCodeAt(i), i * 2);
  return b;
};

function nameTable(source, cut, names) {
  const english = (r) => r.platform === 3 && r.encoding === 1 && r.language === 0x409;
  const carried = rawNameRecords(source).filter(
    (r) => english(r) && [0, 5, 7, 8, 9, 10, 11, 12, 13, 14].includes(r.id),
  );
  const instances = rawNameRecords(cut).filter((r) => english(r) && r.id >= 256);
  const fresh = [
    [1, names.family],
    [2, names.subfamily],
    [3, `${names.postscript};Irodora static cut, wght ${String(names.weight)} (ADR-0112)`],
    [4, names.full],
    [6, names.postscript],
  ].map(([id, s]) => ({ platform: 3, encoding: 1, language: 0x409, id, bytes: utf16be(s) }));
  const records = [...carried, ...fresh, ...instances].sort((a, b) => a.id - b.id);
  const header = Buffer.alloc(6 + records.length * 12);
  header.writeUInt16BE(0, 0);
  header.writeUInt16BE(records.length, 2);
  header.writeUInt16BE(header.length, 4);
  let offset = 0;
  records.forEach((r, i) => {
    const at = 6 + i * 12;
    [r.platform, r.encoding, r.language, r.id, r.bytes.length, offset].forEach((v, k) =>
      header.writeUInt16BE(v, at + k * 2),
    );
    offset += r.bytes.length;
  });
  return Buffer.concat([header, ...records.map((r) => r.bytes)]);
}

/** The font with some tables replaced: directory, 4-byte padding and checksums recomputed. */
function withTables(buf, replace) {
  const dir = tables(buf);
  const tags = [...dir.keys()].sort();
  const data = tags.map((tag) => {
    const t = dir.get(tag);
    return replace.get(tag) ?? buf.subarray(t.offset, t.offset + t.length);
  });
  const padded = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
  const checksum = (b) => {
    const p = padded(b);
    let sum = 0;
    for (let i = 0; i < p.length; i += 4) sum = (sum + p.readUInt32BE(i)) >>> 0;
    return sum;
  };
  const headerLength = 12 + tags.length * 16;
  const out = [Buffer.from(buf.subarray(0, 12))];
  const directory = Buffer.alloc(tags.length * 16);
  let offset = headerLength;
  tags.forEach((tag, i) => {
    let body = data[i];
    if (tag === 'head') {
      body = Buffer.from(body);
      body.writeUInt32BE(0, 8); // checkSumAdjustment is zero while the checksums are taken
    }
    data[i] = body;
    directory.write(tag, i * 16, 'ascii');
    directory.writeUInt32BE(checksum(body), i * 16 + 4);
    directory.writeUInt32BE(offset, i * 16 + 8);
    directory.writeUInt32BE(body.length, i * 16 + 12);
    offset += padded(body).length;
  });
  out[0].writeUInt16BE(tags.length, 4);
  const font = Buffer.concat([out[0], directory, ...data.map(padded)]);
  const headAt =
    headerLength + data.slice(0, tags.indexOf('head')).reduce((n, b) => n + padded(b).length, 0);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headAt + 8);
  return font;
}

// ---------------------------------------------------------------------------------------

const FONTS = join(ROOT, 'apps', 'mobile', 'assets', 'fonts');

/** Every bundled face this generator owns. */
const FACES = [
  {
    // ADR-0057's face, generated exactly as before. Still variable — F-303 owns that.
    label: 'Noto Sans JP (subset)',
    out: OUT,
    build: async () => {
      const { required, entries, fromContent } = requiredCodepoints();
      console.log(
        `${DIM}  Noto Sans JP: ${String(required.size)} codepoint(s) required — ${String(fromContent)} from ` +
          `content (${String(entries)} authored corpus entr(ies) + the ja catalogue + the phrase lexicon + the taxonomy vocabulary and its chips + the palette and combination names), the rest ` +
          `from the always-included ranges.${OFF}`,
      );
      const source = await ensureSource();
      const text = [...required].map((cp) => String.fromCodePoint(cp)).join('');
      return subsetFont(source, text, { targetFormat: 'truetype' });
    },
  },
  {
    label: 'Gelasio Regular (the serif)',
    out: join(FONTS, 'Gelasio-Regular.ttf'),
    build: async () =>
      cut('gelasio', serifText(), {
        family: 'Gelasio',
        subfamily: 'Regular',
        full: 'Gelasio Regular',
        postscript: 'Gelasio-Regular',
        weight: 400,
      }),
  },
  {
    label: 'Noto Serif JP (the mincho, subset)',
    out: join(FONTS, 'NotoSerifJP-Subset.ttf'),
    build: async () =>
      cut('notoserifjp', minchoText(), {
        family: 'Noto Serif JP',
        subfamily: 'Regular',
        full: 'Noto Serif JP Regular',
        postscript: 'NotoSerifJP-Regular',
        weight: 400,
      }),
  },
];

async function cut(id, codepoints, names) {
  const source = await pinnedSource(id);
  const text = codepoints.map((cp) => String.fromCodePoint(cp)).join('');
  console.log(
    `${DIM}  ${names.full}: ${String(codepoints.length)} codepoint(s), wght pinned at ${String(names.weight)}.${OFF}`,
  );
  const pinned = await subsetFont(source, text, {
    targetFormat: 'truetype',
    variationAxes: { wght: names.weight },
  });
  return withTables(pinned, new Map([['name', nameTable(source, pinned, names)]]));
}

console.log(`\n${BOLD}Font subsets${OFF}\n`);

const check = process.argv.includes('--check');
let stale = 0;
for (const face of FACES) {
  const built = await face.build();
  const existing = existsSync(face.out) ? readFileSync(face.out) : null;
  if (check) {
    // Byte comparison. hb-subset is deterministic for the same input and codepoint set, so a
    // difference means the content changed and the face was not regenerated — which is the
    // failure that produces tofu on a device with every gate green.
    if (existing === null || !existing.equals(built)) {
      stale += 1;
      console.log(
        `  ${RED}✗${OFF} ${face.label} ${existing === null ? 'is not committed' : 'is stale'}`,
      );
    } else console.log(`  ${GREEN}✓${OFF} ${face.label} ${DIM}${String(built.length)} bytes${OFF}`);
    continue;
  }
  mkdirSync(dirname(face.out), { recursive: true });
  writeFileSync(face.out, built);
  console.log(`  ${GREEN}✓${OFF} ${face.label} written ${DIM}${String(built.length)} bytes${OFF}`);
}

if (check && stale > 0) {
  console.log(
    `\n${RED}${BOLD}${String(stale)} committed face(s) out of date.${OFF}\n` +
      `${DIM}  Content changed and the fonts were not regenerated. Run:\n` +
      `    node scripts/generate-font-subset.mjs${OFF}\n`,
  );
  process.exit(1);
}
console.log(`\n${GREEN}${BOLD}${check ? 'Every face is current.' : 'Faces written.'}${OFF}\n`);
