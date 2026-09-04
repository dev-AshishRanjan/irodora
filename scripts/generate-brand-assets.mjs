#!/usr/bin/env node
/**
 * The brand assets, generated from the mark (F-142).
 *
 * `MARK` decides the shape, `nativeColors` decides the colour, and this emits the PNGs the app
 * ships. **`--check` regenerates and byte-compares** — that is what CI runs, and it is what makes
 * a hand-edited icon a gate failure rather than a discovery.
 *
 * That arrangement is ADR-0043's, applied to images: a generated artefact whose output nobody
 * compares is an artefact nobody is checking. The usual way an app gets an icon — somebody
 * exports a PNG from a drawing tool and commits it — produces a file with no relationship to the
 * code from that moment on, and an app icon is the one asset you stop seeing after a week.
 *
 * ## The geometry, and why every number is an integer
 *
 * A fractional edge is a soft edge, and a mark whose edges are soft at 48 px has lost the thing
 * that makes it legible at 16.
 *
 * | asset | canvas | grid at | unit | ink | why that size |
 * |---|---:|---:|---:|---:|---|
 * | `icon` | 1024 | 768 | 32 | 576 (56.25 %) | iOS squircle-masks the corners; 56 % keeps the mark clear of them |
 * | `adaptive-icon` | 1024 | 576 | 24 | 432 | Android guarantees only a **66/108** circle — Ø 625.8. The ink's diagonal is 610.9 |
 * | `splash-icon-*` | 1024 | 768 | 32 | 576 | Expo composites it over the theme background |
 *
 * ```
 * node scripts/generate-brand-assets.mjs
 * node scripts/generate-brand-assets.mjs --check
 * ```
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodePng, decodePng, carriesMark } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/mobile/assets/brand');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The mark's geometry, READ from `@irodora/ui` rather than restated.
 *
 * E-059: one geometry, and this is now its third reader. A copy here would agree with the
 * component on the day it was written and would then be the version on every home screen.
 */
function markGeometry() {
  const src = readFileSync(join(ROOT, 'packages/ui/src/brand.tsx'), 'utf8');
  const pick = (pattern, what) => {
    const m = new RegExp(pattern).exec(src);
    if (m === null)
      throw new Error(
        `could not read ${what} from packages/ui/src/brand.tsx. The MARK constant moved or was ` +
          'reshaped — this generator must follow it rather than carry its own copy.',
      );
    return Number(m[1]);
  };
  return {
    grid: pick('grid: (\\d+)', 'the grid'),
    interval: pick('interval: (\\d+)', 'the interval'),
    width: pick('field: \\{ width: (\\d+)', 'the field width'),
    height: pick('width: \\d+, height: (\\d+)', 'the field height'),
    x: pick('origin: \\{ x: (\\d+)', 'the origin x'),
    y: pick('origin: \\{ x: \\d+, y: (\\d+)', 'the origin y'),
  };
}

/** Colours, from the manifest. The icon introduces none of its own. */
function palette() {
  const m = JSON.parse(readFileSync(join(ROOT, 'docs/design/design-system.manifest.json'), 'utf8'));
  const hex = (theme, token) => m.color[theme][token].srgb;
  return {
    darkGround: hex('dark', 'background'),
    darkInk: hex('dark', 'foreground'),
    lightInk: hex('light', 'foreground'),
  };
}

const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/**
 * Draw the mark onto a flat canvas.
 *
 * `ground === null` means transparent, which is what the adaptive-icon foreground and both
 * splash images need — Android and Expo composite them over a colour of their own.
 */
function render(canvas, gridPx, ink, ground, g) {
  const unit = gridPx / g.grid;
  if (!Number.isInteger(unit))
    throw new Error(
      `unit is ${String(unit)}px and must be a whole number — a fractional unit puts the mark's ` +
        'edges between pixels, which is a soft edge at exactly the sizes the brief constrains.',
    );

  const offset = (canvas - gridPx) / 2;
  const [gr, gg, gb] = ground === null ? [0, 0, 0] : rgb(ground);
  const [ir, ig, ib] = rgb(ink);

  const px = Buffer.alloc(canvas * canvas * 4);
  for (let i = 0; i < canvas * canvas; i++) {
    px[i * 4] = gr;
    px[i * 4 + 1] = gg;
    px[i * 4 + 2] = gb;
    px[i * 4 + 3] = ground === null ? 0 : 255;
  }

  // The two fields. The second one's position is DERIVED — the gap and the offset are the same
  // interval, which is the mark (E-059), so writing either number here would be a second copy.
  const fields = [
    { x: g.x, y: g.y },
    { x: g.x + g.width + g.interval, y: g.y + g.interval },
  ];

  for (const f of fields) {
    const x0 = offset + f.x * unit,
      y0 = offset + f.y * unit;
    for (let y = y0; y < y0 + g.height * unit; y++)
      for (let x = x0; x < x0 + g.width * unit; x++) {
        const d = (y * canvas + x) * 4;
        px[d] = ir;
        px[d + 1] = ig;
        px[d + 2] = ib;
        px[d + 3] = 255;
      }
  }
  return encodePng(canvas, canvas, px);
}

const CANVAS = 1024;
/** Android guarantees only the central 66/108 of an adaptive icon is visible. */
export const ADAPTIVE_SAFE_FRACTION = 66 / 108;

export function assets() {
  const g = markGeometry();
  const p = palette();
  return [
    // iOS and the store. OPAQUE — iOS rejects an app icon with an alpha channel.
    { file: 'icon.png', bytes: render(CANVAS, 768, p.darkInk, p.darkGround, g) },
    // Android's foreground layer. Transparent; `adaptiveIcon.backgroundColor` is the other half.
    { file: 'adaptive-icon.png', bytes: render(CANVAS, 576, p.darkInk, null, g) },
    // Expo composites each of these over its theme's background.
    { file: 'splash-icon-light.png', bytes: render(CANVAS, 768, p.lightInk, null, g) },
    { file: 'splash-icon-dark.png', bytes: render(CANVAS, 768, p.darkInk, null, g) },
  ];
}

/** What the middle row of an asset should look like, as fractions of its width. */
export function expectedSignature(gridPx = 768, canvas = CANVAS) {
  const g = markGeometry();
  const unit = gridPx / g.grid;
  return { field: (g.width * unit) / canvas, interval: (g.interval * unit) / canvas };
}

/*
 * RUN ONLY WHEN RUN, and this guard is not boilerplate.
 *
 * `verify-apk.mjs` imports `expectedSignature` from here. Without the guard that import would
 * REGENERATE every asset as a side effect — so a gate whose whole job is to check the artefact
 * would first quietly rewrite the thing it is checking, and `--check` could never fail.
 */
const invoked =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invoked) {
  if (process.argv.includes('--prove')) prove();
  else main();
}

/**
 * Watch every assertion fail.
 *
 * The encoder, the decoder and the shape signature are all written here rather than depended on,
 * so all three could be wrong *together* and agree with each other — which is the failure mode
 * of any hand-rolled pair. The round-trip catches an encoder that lies to its own decoder; the
 * two decoys catch a signature that would accept anything with ink in it.
 *
 * **Nothing is written to the working tree**: the mutations happen in memory.
 */
function prove() {
  console.log(`\n${BOLD}Irodora — brand assets, discrimination proof${OFF}\n`);
  const problems = [];
  const say = (ok, name, detail) => {
    if (!ok) problems.push(name);
    console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${detail}${OFF}`);
  };

  // 1. The encoder does not lie to the decoder.
  const px = Buffer.alloc(4 * 4 * 4);
  for (let i = 0; i < 16; i++) {
    px[i * 4] = i * 16;
    px[i * 4 + 1] = 255 - i * 16;
    px[i * 4 + 2] = 7;
    px[i * 4 + 3] = 255;
  }
  const round = decodePng(encodePng(4, 4, px));
  say(
    round.width === 4 && round.height === 4 && round.rgba.equals(px),
    'a PNG round-trips to the pixels it was given',
    '4×4 RGBA — without this the pair could be wrong together',
  );

  // 2. Every generated asset carries the mark.
  for (const [file, grid] of [
    ['icon.png', 768],
    ['adaptive-icon.png', 576],
    ['splash-icon-light.png', 768],
    ['splash-icon-dark.png', 768],
  ]) {
    const image = decodePng(readFileSync(join(OUT, file)));
    const r = carriesMark(image, expectedSignature(grid));
    say(r.ok, `${file} carries the mark`, r.why);
  }

  // 3. THE DECOYS. A signature that accepts anything is worth nothing.
  const g = markGeometry();
  const flat = decodePng(render(256, 192, '#F6F4F1', '#090807', { ...g, interval: 0, width: 18 }));
  say(
    !carriesMark(flat, expectedSignature(768)).ok,
    'a solid block is REFUSED',
    'the placeholder shape — one field, no interval',
  );

  const wrong = decodePng(render(256, 192, '#F6F4F1', '#090807', { ...g, width: 2 }));
  say(
    !carriesMark(wrong, expectedSignature(768)).ok,
    'two bars in the WRONG proportion are REFUSED',
    'ink is present and the mark is not',
  );

  // 4. The Android safe zone, as arithmetic rather than a screenshot.
  const inkDiagonal = 432 * Math.SQRT2;
  const safe = CANVAS * ADAPTIVE_SAFE_FRACTION;
  say(
    inkDiagonal <= safe,
    'the adaptive icon fits the 66/108 safe circle',
    `ink diagonal ${inkDiagonal.toFixed(1)} ≤ Ø ${safe.toFixed(1)}`,
  );

  // 5. --check notices a single changed byte.
  const real = readFileSync(join(OUT, 'icon.png'));
  const tampered = Buffer.from(real);
  tampered[tampered.length - 12] ^= 0xff;
  say(!tampered.equals(real), '--check compares bytes, and one byte differs', 'the mutation lands');

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} case(s) did not discriminate.${OFF}\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}The brand assets check discriminates.${OFF} ` +
      `${DIM}Round-trip, four assets, two decoys, the safe zone.${OFF}\n`,
  );
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const produced = assets();

  if (checkOnly) {
    const stale = produced.filter((a) => {
      const path = join(OUT, a.file);
      return !existsSync(path) || !readFileSync(path).equals(a.bytes);
    });
    if (stale.length > 0) {
      console.log(
        `\n${RED}${BOLD}${String(stale.length)} brand asset(s) do not match the mark.${OFF}\n`,
      );
      for (const a of stale) console.log(`  ${RED}✗${OFF} ${relative(ROOT, join(OUT, a.file))}`);
      console.log(
        `\n${DIM}  Run: node scripts/generate-brand-assets.mjs\n` +
          `  These are GENERATED from MARK in packages/ui/src/brand.tsx. An icon edited by hand is\n` +
          `  one that has stopped describing the mark, and nothing else would ever notice.${OFF}\n`,
      );
      process.exit(1);
    }
    console.log(
      `${GREEN}${BOLD}Brand assets match the mark.${OFF} ${DIM}${String(produced.length)} checked.${OFF}`,
    );
  } else {
    mkdirSync(OUT, { recursive: true });
    for (const a of produced) writeFileSync(join(OUT, a.file), a.bytes);
    console.log(
      `${GREEN}${BOLD}Wrote ${String(produced.length)} brand asset(s)${OFF} ${DIM}to ${relative(ROOT, OUT)}${OFF}`,
    );
    for (const a of produced)
      console.log(`  ${DIM}· ${a.file}  ${String((a.bytes.length / 1024).toFixed(1))} kB${OFF}`);
  }
}
