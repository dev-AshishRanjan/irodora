/**
 * F-226 — which WEIGHT of Gelasio, and what tracking, each serif role is drawn at (ADR-0106 d.2).
 *
 * ## The quantity
 *
 * `stem.ps1` reads, off a crop of a mockup, the total width of ink a horizontal band crosses,
 * divided by the word's ink height: a number blur and JPEG bloom leave alone (a blur keeps a stem's
 * integral), and one that grows with weight. This tool computes the SAME number EXACTLY from the
 * font's outlines — shaped by HarfBuzz, flattened, and cut by the same bands — at every `wght` from
 * 400 to 700, and finds the weight whose number the drawing matches. No rasteriser is involved on the
 * font side, so nothing about a renderer is assumed there.
 *
 * The word's aspect (ink width over ink height) then gives the tracking at that weight.
 *
 * ## The calibration, which is this tool's decoy
 *
 * `--calibrate` cuts static instances at 400, 500, 600 and 700, sets each crop's word in them at the
 * crop's own pixel height through GDI+, saves a JPEG, and measures it with `stem.ps1` exactly as the
 * mockup was measured. The instrument must recover the known weights, in order. Where it cannot at a
 * crop's size, that crop's reading is reported as unresolved rather than used.
 *
 * ```
 * node mockups/tools/serif-weight.mjs                 # every crop, solved
 * node mockups/tools/serif-weight.mjs --calibrate     # the known-answer run
 * node mockups/tools/serif-weight.mjs --json          # the same, machine-readable
 * ```
 *
 * An authoring tool: no gate runs it. Its output is recorded in ADR-0112.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const FONT = join(ROOT, '.cache', 'fonts', 'gelasio', 'Gelasio[wght].ttf');
/** The Japanese serif 20's card is scored against (mincho-candidates.json), measured the same way. */
const MINCHO = join(ROOT, '.cache', 'fonts', 'mincho', 'notoserifjp', 'NotoSerifJP[wght].ttf');
const CALIB = join(ROOT, '.cache', 'fonts', 'gelasio', 'calibration');

/*
 * harfbuzzjs is a dependency of `subset-font`, which the root declares — resolved from there rather
 * than declared twice. `mockups/` is not a workspace package, so the resolution starts at the root.
 */
const rootRequire = createRequire(join(ROOT, 'package.json'));
const fromSubset = createRequire(rootRequire.resolve('subset-font'));
const hb = await fromSubset('harfbuzzjs');
const subsetFont = rootRequire('subset-font');

/** The same bands `stem.ps1` reads by default: fractions of the ink height, from the bottom. */
const FRACTIONS = [0.25, 0.35, 0.45, 0.55];
const BAND = 0.04;
const WEIGHTS = Array.from({ length: 13 }, (_, i) => 400 + i * 25);
/** Noto Serif JP's axis runs 200-900. */
const MINCHO_WEIGHTS = Array.from({ length: 29 }, (_, i) => 200 + i * 25);

/*
 * The crops ADR-0106 measured (mockups/tools/README.md), by role. `25` is measured and reported but
 * not governing (P2: it governs the light palette only; C4 does not use its lockup).
 */
const CROPS = [
  {
    id: '00-wordmark',
    role: 'wordmark',
    img: '00_component_design_system.jpg',
    box: [189, 109, 222, 56],
    word: 'Irodora',
    polarity: 'light',
  },
  {
    id: '01-wordmark',
    role: 'wordmark',
    img: '01_home_screen.jpg',
    box: [170, 93, 212, 51],
    word: 'Irodora',
    polarity: 'light',
  },
  {
    id: '14-wordmark',
    role: 'wordmark',
    img: '14_app_icon_and_splash.jpg',
    box: [485, 665, 147, 35],
    word: 'Irodora',
    polarity: 'light',
  },
  {
    id: '25-wordmark',
    role: 'reported',
    img: '25_home_light_mode.jpg',
    box: [182, 197, 229, 38],
    word: 'IRODORA',
    polarity: 'dark',
  },
  {
    id: '00-display1',
    role: 'display1',
    img: '00_component_design_system.jpg',
    box: [52, 276, 206, 60],
    word: 'Display 1',
    polarity: 'light',
  },
  {
    id: '00-title',
    role: 'title',
    img: '00_component_design_system.jpg',
    box: [52, 345, 66, 32],
    word: 'Title',
    polarity: 'light',
  },
  {
    id: '01-tagline-1',
    role: 'tagline',
    img: '01_home_screen.jpg',
    box: [70, 198, 275, 30],
    word: 'What colour is this.',
    polarity: 'light',
  },
  {
    id: '01-tagline-2',
    role: 'tagline',
    img: '01_home_screen.jpg',
    box: [70, 241, 275, 36],
    word: 'What goes with it.',
    polarity: 'light',
  },
  {
    id: '01-tagline-3',
    role: 'tagline',
    img: '01_home_screen.jpg',
    box: [70, 284, 275, 30],
    word: 'Does it suit me.',
    polarity: 'light',
  },
  // 20's card: the kanji 藍鼠 (C6), in the mincho — the check on the inventory's recorded 400.
  {
    id: '20-kanji',
    role: 'mincho',
    img: '20_colour_card_shareable.jpg',
    box: [143, 697, 116, 58],
    word: '藍鼠',
    polarity: 'light',
    font: MINCHO,
    weights: MINCHO_WEIGHTS,
  },
];

// ------------------------------------------------------------------------------ the font side

/** An SVG path string (M L Q C Z, absolute) → closed polylines, curves flattened. */
function polylines(d, ox) {
  const out = [];
  let cur = [];
  let px = 0;
  let py = 0;
  const re = /([MLQCZ])([^MLQCZ]*)/gu;
  for (const [, cmd, args] of d.matchAll(re)) {
    const n = args
      .split(/[ ,]+/u)
      .filter((s) => s !== '')
      .map(Number);
    if (cmd === 'M') {
      if (cur.length > 1) out.push(cur);
      cur = [[n[0] + ox, n[1]]];
      [px, py] = [n[0], n[1]];
    } else if (cmd === 'L') {
      cur.push([n[0] + ox, n[1]]);
      [px, py] = [n[0], n[1]];
    } else if (cmd === 'Q') {
      for (let k = 1; k <= 16; k += 1) {
        const t = k / 16;
        const u = 1 - t;
        cur.push([
          u * u * px + 2 * u * t * n[0] + t * t * n[2] + ox,
          u * u * py + 2 * u * t * n[1] + t * t * n[3],
        ]);
      }
      [px, py] = [n[2], n[3]];
    } else if (cmd === 'C') {
      for (let k = 1; k <= 16; k += 1) {
        const t = k / 16;
        const u = 1 - t;
        const x = u * u * u * px + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4];
        const y = u * u * u * py + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5];
        cur.push([x + ox, y]);
      }
      [px, py] = [n[4], n[5]];
    } else if (cmd === 'Z') {
      if (cur.length > 1) out.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** Ink width a horizontal line at `y` crosses in ONE glyph, by the non-zero winding rule. */
function inkAt(contours, y) {
  const hits = [];
  for (const poly of contours)
    for (let i = 0; i < poly.length; i += 1) {
      const [x0, y0] = poly[i];
      const [x1, y1] = poly[(i + 1) % poly.length];
      if (y0 === y1) continue;
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0))
        hits.push({ x: x0 + ((y - y0) * (x1 - x0)) / (y1 - y0), dir: y1 > y0 ? 1 : -1 });
    }
  hits.sort((a, b) => a.x - b.x);
  let wind = 0;
  let total = 0;
  for (let i = 0; i < hits.length - 1; i += 1) {
    wind += hits[i].dir;
    if (wind !== 0) total += hits[i + 1].x - hits[i].x;
  }
  return total;
}

/** The word set in `fontBytes` at `wght`: its ink box and the band readings stem.ps1 takes. */
function measureFont(fontBytes, word, wght) {
  const blob = hb.createBlob(fontBytes);
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  font.setVariations({ wght });
  const buffer = hb.createBuffer();
  buffer.addText(word);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const glyphs = buffer.json();
  let pen = 0;
  const shaped = [];
  for (const g of glyphs) {
    shaped.push(polylines(font.glyphToPath(g.g), pen + g.dx));
    pen += g.ax;
  }
  const upem = face.upem;
  buffer.destroy();
  font.destroy();
  face.destroy();
  blob.destroy();

  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const contours of shaped)
    for (const poly of contours)
      for (const [x, y] of poly) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const H = y1 - y0;
  const bands = FRACTIONS.map((f) => {
    let sum = 0;
    for (let s = -4; s <= 4; s += 1) {
      const y = y0 + (f + (BAND * s) / 4) * H;
      for (const contours of shaped) sum += inkAt(contours, y);
    }
    return { f, r: sum / 9 / H };
  });
  return { upem, height: H, width: x1 - x0, aspect: (x1 - x0) / H, gaps: glyphs.length - 1, bands };
}

// ------------------------------------------------------------------------------ the drawn side

function stem(args) {
  const out = execFileSync('powershell', ['-NoProfile', '-File', join(HERE, 'stem.ps1'), ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 24,
  });
  const line = out.trim().split(/\r?\n/u).pop() ?? '';
  return JSON.parse(line);
}

const drawnOf = (crop) =>
  stem([
    '-img',
    join(ROOT, 'mockups', crop.img),
    '-x',
    String(crop.box[0]),
    '-y',
    String(crop.box[1]),
    '-w',
    String(crop.box[2]),
    '-h',
    String(crop.box[3]),
    '-polarity',
    crop.polarity,
    '-fractions',
    FRACTIONS.join(','),
    '-band',
    String(BAND),
  ]);

// ------------------------------------------------------------------------------ solving

/**
 * The weight at which the font's band reading equals `r`, by linear interpolation on the grid.
 *
 * Past either end of the axis the line through the two end points is EXTRAPOLATED and flagged: the
 * drawing may be lighter than the lightest instance the face has, and "lighter than 400 by this much"
 * is information a bare "< 400" throws away. An extrapolated reading can only ever select the end
 * instance; it is never a weight the face can be cut at.
 */
function solve(table, bandIndex, r, WEIGHTS) {
  const rs = table.map((t) => t.m.bands[bandIndex].r);
  const last = rs.length - 1;
  if (r < rs[0])
    return {
      w: WEIGHTS[0] + ((r - rs[0]) / (rs[1] - rs[0])) * (WEIGHTS[1] - WEIGHTS[0]),
      note: 'extrapolated',
    };
  if (r > rs[last])
    return {
      w:
        WEIGHTS[last] +
        ((r - rs[last]) / (rs[last] - rs[last - 1])) * (WEIGHTS[last] - WEIGHTS[last - 1]),
      note: 'extrapolated',
    };
  for (let i = 0; i < rs.length - 1; i += 1)
    if (r >= rs[i] && r <= rs[i + 1]) {
      const t = rs[i + 1] === rs[i] ? 0 : (r - rs[i]) / (rs[i + 1] - rs[i]);
      return { w: WEIGHTS[i] + t * (WEIGHTS[i + 1] - WEIGHTS[i]), note: '' };
    }
  return { w: null, note: 'non-monotone' };
}

function reading(fontBytes, word, drawn, weights = WEIGHTS) {
  const table = weights.map((w) => ({ w, m: measureFont(fontBytes, word, w) }));
  const spaces = {};
  for (const space of ['encoded', 'linear']) {
    const d = drawn.spaces[space];
    const per = d.bands.map((b, i) => solve(table, i, b.r, weights));
    const ws = per.map((p) => p.w).filter((w) => w !== null);
    const mean = ws.length === per.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
    // Tracking at the solved weight: the extra ink width the drawing has, spread over the gaps.
    let tracking = null;
    if (mean !== null) {
      const m = measureFont(fontBytes, word, Math.round(mean));
      const drawnWidthUnits = d.aspect * m.height;
      tracking = m.gaps > 0 ? (drawnWidthUnits - m.width) / (m.upem * m.gaps) : 0;
    }
    spaces[space] = {
      perBand: per.map((p) =>
        p.w === null
          ? p.note
          : p.note === 'extrapolated'
            ? `~${String(Math.round(p.w))}`
            : Math.round(p.w),
      ),
      extrapolated: per.some((p) => p.note === 'extrapolated'),
      mean: mean === null ? null : Math.round(mean),
      spread: ws.length > 0 ? [Math.round(Math.min(...ws)), Math.round(Math.max(...ws))] : null,
      trackingEm: tracking === null ? null : Number(tracking.toFixed(4)),
      aspect: d.aspect,
    };
  }
  return spaces;
}

// ------------------------------------------------------------------------------ main

if (!existsSync(FONT)) {
  console.error(
    `No source at ${FONT}. Fetch Gelasio[wght].ttf at the commit serif-candidates.json pins, ` +
      'and check its sha256 before measuring.',
  );
  process.exit(2);
}
const fontBytes = readFileSync(FONT);
const bytesOf = (crop) => (crop.font === undefined ? fontBytes : readFileSync(crop.font));
const json = process.argv.includes('--json');

if (process.argv.includes('--calibrate')) {
  mkdirSync(CALIB, { recursive: true });
  const rows = [];
  for (const crop of CROPS.filter((c) => c.role !== 'reported')) {
    const drawn = drawnOf(crop);
    const bytes = bytesOf(crop);
    const m400 = measureFont(bytes, crop.word, 400);
    // The em that puts the word's ink height at the height the mockup drew it.
    const emPx = (drawn.spaces.encoded.height * m400.upem) / m400.height;
    for (const known of [400, 500, 600, 700]) {
      const file = join(
        CALIB,
        `${crop.font === undefined ? 'Gelasio' : 'Mincho'}-${String(known)}.ttf`,
      );
      if (!existsSync(file)) {
        const text = CROPS.filter((c) => c.font === crop.font)
          .map((c) => c.word)
          .join('');
        writeFileSync(
          file,
          await subsetFont(bytes, text, {
            targetFormat: 'truetype',
            variationAxes: { wght: known },
          }),
        );
      }
      const jpg = join(CALIB, `${crop.id}-${String(known)}.jpg`);
      const rendered = stem([
        '-render',
        '-fontFile',
        file,
        '-codepoints',
        [...crop.word].map((ch) => (ch.codePointAt(0) ?? 0).toString(16)).join(','),
        '-emPx',
        emPx.toFixed(3),
        '-out',
        jpg,
        '-quality',
        '85',
        '-polarity',
        crop.polarity,
        '-fractions',
        FRACTIONS.join(','),
        '-band',
        String(BAND),
      ]);
      const r = reading(bytes, crop.word, rendered, crop.weights ?? WEIGHTS);
      rows.push({
        crop: crop.id,
        emPx: Number(emPx.toFixed(2)),
        known,
        encoded: r.encoded.mean,
        linear: r.linear.mean,
        spreadEncoded: r.encoded.spread,
      });
    }
  }
  if (json) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log(
      'Calibration: known weight -> recovered (encoded, linear), per crop at its drawn size\n',
    );
    for (const row of rows)
      console.log(
        `${row.crop.padEnd(14)} em ${String(row.emPx).padStart(6)}px  ${String(row.known)} -> ` +
          `${String(row.encoded ?? 'out of range').padStart(4)} / ${String(row.linear ?? 'out of range').padStart(4)}` +
          `  (encoded band spread ${JSON.stringify(row.spreadEncoded)})`,
      );
  }
  process.exit(0);
}

const results = [];
for (const crop of CROPS) {
  const drawn = drawnOf(crop);
  results.push({
    crop: crop.id,
    role: crop.role,
    word: crop.word,
    heightPx: drawn.spaces.encoded.height,
    ...reading(bytesOf(crop), crop.word, drawn, crop.weights ?? WEIGHTS),
  });
}
if (json) console.log(JSON.stringify(results, null, 2));
else {
  console.log('Drawn weight of Gelasio per crop (wght; per band | mean [spread]; tracking em)\n');
  for (const r of results)
    for (const space of ['encoded', 'linear'])
      console.log(
        `${r.crop.padEnd(14)} ${space.padEnd(7)} h ${r.heightPx.toFixed(1).padStart(5)}px  ` +
          `${JSON.stringify(r[space].perBand).padEnd(26)} | ${String(r[space].mean).padStart(4)} ` +
          `${JSON.stringify(r[space].spread).padEnd(11)} tracking ${String(r[space].trackingEm)}`,
      );
}
