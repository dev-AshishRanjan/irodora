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
 * ## The geometry, and why the edges are sampled rather than snapped
 *
 * This drew rectangles until F-165, and refused any size where the grid unit was not a whole
 * number: a fractional edge is a soft edge, and a mark whose edges are soft at 48 px has lost
 * what makes it legible at 16.
 *
 * **A circle has no straight edges to snap.** So the rule changed rather than the goal: every
 * pixel is sampled `SUPERSAMPLE`× in each direction and the coverage becomes the blend, which is
 * what an anti-aliased edge IS. Snapping a curve to whole pixels is not sharpness, it is
 * staircasing — the same mistake one dimension down.
 *
 * The integer-unit check stays, because it keeps the blossom's petals, ring and cuts in exact
 * proportion to each other at every size and makes the signature below arithmetic rather than
 * approximate. Since F-230 the shapes are 14's blossom, drawn by point test (`coversGrid`), its
 * cuts holes.
 *
 * | asset | canvas | grid at | unit | reach | why that size |
 * |---|---:|---:|---:|---:|---|
 * | `icon` | 1024 | 624 | 26 | 312 | 14's share of its tile, 0.611 (F-231, ADR-0126), on 14's gradient tile, centred by its ink (19 px down) |
 * | `adaptive-icon`, `monochrome-icon` | 1024 | 624 | 26 | 312 | Android guarantees only a **66/108** circle — radius 312.9 (`ADAPTIVE_GRID`, derived) |
 * | `splash-icon-*` | 1024 | 768 | 32 | 384 | Expo composites it over the theme background |
 *
 * ## One ink everywhere, the icon included
 *
 * [ADR-0122](../docs/adr/0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md)
 * supersedes ADR-0093's five-colour icon: mockup 14 draws the icon's mark in `text.secondary`, and
 * C4 takes the mark from 14. `--prove` reads every asset's bytes and requires one ink, with
 * ADR-0093's icon rendered in memory as the decoy it must refuse.
 *
 * `--prove` runs in `lint`, after `--check` (F-230).
 *
 * ```
 * node scripts/generate-brand-assets.mjs
 * node scripts/generate-brand-assets.mjs --check
 * ```
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodePng, decodePng, carriesMark, downscale } from './png.mjs';
import { carriesTile } from './brand-checks.mjs';

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
 *
 * **EXPORTED, and taking an optional `source`, so the two refusals below can be watched
 * refusing (F-193).** A refusal nobody has seen refuse is a condition that parses. Production
 * callers pass nothing and read the real file.
 */
export function markGeometry(source = null) {
  const file = source ?? readFileSync(join(ROOT, 'packages/ui/src/brand.tsx'), 'utf8');

  /*
   * SCOPED TO THE `MARK` BLOCK, AND THAT IS THE POINT (F-193).
   *
   * This used to match against the WHOLE FILE. It throws when it cannot find the four numbers —
   * and it could not tell that it had found the wrong ones. A second `grid:` anywhere above
   * `MARK`, in a comment example or a neighbouring constant, would give this generator one
   * geometry and the app another, and `--check` would agree with the wrong reading because it
   * compares the assets against exactly this.
   *
   * The obvious guard — compare the parse against the component's own exports — cannot be
   * written: `brand.tsx` imports React Native, so a Node script cannot load it, which is the
   * same reason this parse exists at all. So the failure mode is REMOVED rather than detected.
   *
   * TWO CONDITIONS, both refusals rather than assumptions: exactly one `export const MARK` in
   * the file, and the numbers read only from between its braces.
   */
  const declarations = file.match(/export const MARK\b/gu) ?? [];
  if (declarations.length !== 1)
    throw new Error(
      `packages/ui/src/brand.tsx declares MARK ${String(declarations.length)} time(s); this ` +
        'generator reads exactly one. Two declarations mean the icon and the app could follow ' +
        'different geometry, and nothing downstream would notice.',
    );

  const block = /export const MARK = \{([\s\S]*?)\n\} as const;/u.exec(file);
  if (block === null)
    throw new Error(
      'could not find the MARK block in packages/ui/src/brand.tsx. It moved or was reshaped — ' +
        'this generator must follow it rather than carry its own copy.',
    );
  const src = block[1];

  const pick = (pattern, what) => {
    const m = new RegExp(pattern).exec(src);
    if (m === null)
      throw new Error(
        `could not read ${what} from packages/ui/src/brand.tsx. The MARK constant moved or was ` +
          'reshaped — this generator must follow it rather than carry its own copy.',
      );
    return Number(m[1]);
  };
  const grid = pick('grid: (\\d+)', 'the grid');
  const petals = pick('petals: (\\d+)', 'the petal count');
  const reach = pick('reach: ([\\d.]+)', 'the reach');
  const eye = pick('eye: ([\\d.]+)', 'the eye');
  const ringOuter = pick('ringOuter: ([\\d.]+)', "the ring's outer edge");
  const stamenOuter = pick('stamenOuter: ([\\d.]+)', "the stamens' end");
  const stamenWidth = pick('stamenWidth: ([\\d.]+)', "the stamens' width");
  const seamWidth = pick('seamWidth: ([\\d.]+)', "the seams' width");

  /*
   * THE PETALS ARE TANGENT (F-230, ADR-0122), HERE AND IN THE COMPONENT, FROM THE SAME REACH.
   *
   * 14 draws its petals touching, so their orbit and radius follow from the reach, and the hub is
   * their tangency radius. Reading them out of the source would mean parsing an expression rather
   * than a literal; writing them here would be a second copy of the one fact.
   */
  const half = Math.PI / petals;
  const orbit = reach / (1 + Math.sin(half));
  const petal = orbit * Math.sin(half);
  const hub = orbit * Math.cos(half);

  return {
    grid,
    petals,
    reach,
    eye,
    ringOuter,
    stamenOuter,
    stamenWidth,
    seamWidth,
    orbit,
    petal,
    hub,
  };
}

/** A unit vector `deg` clockwise from straight up, in grid axes (y down). */
const towards = (deg) => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];

/**
 * Whether the grid point (dx, dy) from the mark's centre is ink: inside a petal or the hub, and in
 * no cut. The generator's copy of `markCovers`, from the same scalars. A geometry with no hub may
 * still fill its eye (F-165's mark, a decoy below), hence the larger of the two.
 */
export function coversGrid(g, dx, dy) {
  const r = Math.hypot(dx, dy);
  const step = 360 / g.petals;
  let ink = r <= Math.max(g.hub, g.eye);
  for (let k = 0; k < g.petals && !ink; k += 1) {
    const [ex, ey] = towards(k * step);
    if (Math.hypot(dx - g.orbit * ex, dy - g.orbit * ey) <= g.petal) ink = true;
  }
  if (!ink) return false;
  if (r > g.eye && r < g.ringOuter) return false;
  const inCut = (deg, outer, width) => {
    if (width <= 0) return false;
    const [ex, ey] = towards(deg);
    const along = dx * ex + dy * ey;
    const across = Math.abs(-dx * ey + dy * ex);
    return r >= g.ringOuter && along > 0 && along <= outer && across <= width / 2;
  };
  for (let k = 0; k < g.petals; k += 1) {
    if (inCut(k * step, g.stamenOuter, g.stamenWidth)) return false;
    if (inCut(k * step + step / 2, g.reach + 1, g.seamWidth)) return false;
  }
  return true;
}

/** A number as `svgNumber` in `brand.tsx` writes it: four places, none trailing. */
const fixed = (v) => Number(v.toFixed(4));

/** How finely the point test is sampled for `mark-geometry.json`: cells across the grid. */
const COVERAGE_CELLS = 96;

/**
 * What the generator derived, as `brand.test` compares it with the component (E-116).
 *
 * Two things, because the two derivations can disagree in two ways. The SCALARS (orbit, petal, hub,
 * the cuts) are derived from `MARK` on each side. The COVERAGE is this file's `coversGrid` sampled
 * at the centre of every cell of a 96 × 96 grid over the mark, row by row from the top: `#` ink,
 * `.` ground. `brand.test` samples `markCovers` at the same points, so the two POINT TESTS are
 * compared — the cuts' angles and extents and the hub's radius included — not only the numbers they
 * start from (F-230's review). `--check` byte-compares the file like every asset.
 */
function geometryFile(g) {
  const unit = g.grid / COVERAGE_CELLS;
  const rows = Array.from({ length: COVERAGE_CELLS }, (_, j) =>
    Array.from({ length: COVERAGE_CELLS }, (_, i) =>
      coversGrid(g, (i + 0.5) * unit - g.grid / 2, (j + 0.5) * unit - g.grid / 2) ? '#' : '.',
    ).join(''),
  );
  return {
    $comment:
      'GENERATED by scripts/generate-brand-assets.mjs from MARK in packages/ui/src/brand.tsx. brand.test requires its derived scalars and markCovers() at every coverage point to equal it (E-116).',
    grid: g.grid,
    petals: g.petals,
    reach: fixed(g.reach),
    orbit: fixed(g.orbit),
    petal: fixed(g.petal),
    hub: fixed(g.hub),
    eye: fixed(g.eye),
    ringOuter: fixed(g.ringOuter),
    stamenOuter: fixed(g.stamenOuter),
    stamenWidth: fixed(g.stamenWidth),
    seamWidth: fixed(g.seamWidth),
    coverage: { cells: COVERAGE_CELLS, rows },
  };
}

/**
 * 14's icon as its inventory records it (F-231): the tile's gradient and the mark's share of the
 * tile, READ rather than restated, so a re-read of the image moves the asset and `--check` says so.
 *
 * The tile's ends are surface ROLES (`level2`, `ground`), mapped to tokens here as the inventory
 * tests map them (`packages/design-tokens/test/inventory-roles.ts`, `SURFACE`).
 */
const SURFACE_ROLE = { ground: 'background', level1: 'surface.1', level2: 'surface.2' };
export function fourteen() {
  const inventory = JSON.parse(readFileSync(join(ROOT, 'mockups/inventory/14.json'), 'utf8'));
  const element = (id) => {
    const found = inventory.elements.find((e) => e.id === id);
    if (found === undefined) throw new Error(`mockups/inventory/14.json has no ${id}`);
    return found;
  };
  const tile = element('14.icon.tile');
  const mark = element('14.icon.tile.mark');
  const token = (role) => {
    const t = SURFACE_ROLE[role];
    if (t === undefined) throw new Error(`14.icon.tile names ${String(role)}, which is no surface`);
    return t;
  };
  return {
    /** The mark's grid over the tile's side: 2 × reach over the tile, both read in 14's pixels. */
    markFraction: (2 * mark.raw.reachPx) / tile.box.w,
    gradient: {
      from: token(tile.tokens.bgTop),
      to: token(tile.tokens.bgBottom),
      angleDeg: tile.raw.gradientDeg,
    },
    /** How far below the tile's centre 14 draws the mark's grid, and its ink box, in tile sides. */
    centreDy: mark.raw.centreDyPx / tile.box.w,
    inkCentreDy: mark.raw.inkCentreDyPx / tile.box.w,
  };
}

/** Colours, from the manifest. The mark has none of its own, and the icon invents none. */
function palette() {
  const m = JSON.parse(readFileSync(join(ROOT, 'docs/design/design-system.manifest.json'), 'utf8'));
  const hex = (theme, token) => m.color[theme][token].srgb;
  const tile = fourteen().gradient;
  return {
    lightGround: hex('light', 'background'),
    darkGround: hex('dark', 'background'),
    darkInk: hex('dark', 'foreground'),
    lightInk: hex('light', 'foreground'),
    // 14's icon draws its mark in `text.secondary` (`14.icon.tile.mark`): dark `foreground.2`.
    iconInk: hex('dark', 'foreground.2'),
    // 14's tile: dark tokens, because 14 draws one icon and it is dark (no mockup draws a light one).
    tile: { from: hex('dark', tile.from), to: hex('dark', tile.to), angleDeg: tile.angleDeg },
  };
}

/**
 * A linear gradient's colour at a pixel (F-231, 14's tile), in the ENCODED channels — how 14's tile
 * reads (a plane in the encoded values fits it to 1.4 levels) and how a drawing tool interpolates.
 *
 * The axis is `angleDeg` clockwise from straight down, `from` at the corner the axis starts from and
 * `to` at the opposite one, so each end's token is exactly a corner's colour. `box` is the rectangle
 * the gradient spans, in pixels; outside it the gradient holds its end colours (an adaptive layer's
 * margin, which a launcher's parallax can show). Each channel is rounded; nothing is dithered, so the
 * same inputs give the same bytes.
 */
export function gradientAt(spec, x, y) {
  return gradient(spec)(x, y);
}

/** `gradientAt` for one spec, its axis and ends worked out once — a canvas asks a million times. */
function gradient(spec) {
  const [x0, y0, x1, y1] = spec.box;
  const a = (spec.angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = Math.cos(a);
  const corners = [x0 * dx + y0 * dy, x1 * dx + y0 * dy, x0 * dx + y1 * dy, x1 * dx + y1 * dy];
  const lo = Math.min(...corners);
  const span = Math.max(...corners) - lo;
  const [fr, fg, fb] = rgb(spec.from);
  const [tr, tg, tb] = rgb(spec.to);
  return (x, y) => {
    const t = Math.min(1, Math.max(0, (x * dx + y * dy - lo) / span));
    return [
      Math.round(fr + (tr - fr) * t),
      Math.round(fg + (tg - fg) * t),
      Math.round(fb + (tb - fb) * t),
    ];
  };
}

/**
 * How far below its grid's centre a lone mark's INK BOX is centred, in grid units (F-231).
 *
 * 14 centres the icon's mark by what is seen: a five-petal blossom reaches `orbit + petal` above its
 * centre (petal 1 straight up) and only as far below as its lowest petals, so its ink box's centre
 * sits above its grid's. Half the difference moves the grid down, and the ink box is centred.
 */
export function inkCentreDy(g) {
  const step = (2 * Math.PI) / g.petals;
  const ys = Array.from({ length: g.petals }, (_, k) => -g.orbit * Math.cos(k * step));
  const top = -Math.min(...ys) + g.petal;
  const bottom = Math.max(...ys) + g.petal;
  return (top - bottom) / 2;
}

const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/**
 * How many samples per pixel, per axis.
 *
 * Four means sixteen samples a pixel and seventeen possible coverages — more than an eight-bit
 * channel can distinguish at these contrasts, and cheap: a 1024 canvas is sixteen million
 * samples, which is a fraction of a second and happens four times per run.
 */
const SUPERSAMPLE = 4;

/**
 * The mark in a canvas's PIXELS: the ink it takes and a point test (F-230).
 *
 * A POINT TEST, NOT A LIST OF DISCS TO PAINT. 14's blossom is drawn by cutting holes — a ring,
 * stamens, seams — out of filled shapes, and a hole is not a disc anybody paints. So the renderer
 * asks, for each sample, whether the mark covers it.
 */
function shapesInPixels(g, gridPx, canvas, ink, dyPx = 0) {
  const unit = gridPx / g.grid;
  const offset = (canvas - gridPx) / 2;
  const centre = offset + (g.grid / 2) * unit;
  const centreY = centre + dyPx;
  const reach = (g.reach + 1) * unit;
  return [
    {
      ink: rgb(ink.eye),
      box: [centre - reach, centreY - reach, centre + reach, centreY + reach],
      covers: (x, y) => coversGrid(g, (x - centre) / unit, (y - centreY) / unit),
    },
  ];
}

/**
 * Draw the mark onto a flat canvas.
 *
 * `ground === null` means transparent, which is what the adaptive-icon foreground and both
 * splash images need — Android and Expo composite them over a colour of their own.
 *
 * `ink` is `{ eye, petals }`, one colour twice: the mark is one ink (ADR-0122). Each pixel's
 * coverage is the share of its samples the mark's point test accepts.
 */
function render(canvas, gridPx, ink, ground, g, dyPx = 0) {
  const unit = gridPx / g.grid;
  if (!Number.isInteger(unit))
    throw new Error(
      `unit is ${String(unit)}px and must be a whole number — a fractional unit puts the mark's` +
        ' shapes out of proportion with each other and makes the artefact signature approximate.',
    );

  const px = paintGround(canvas, ground);
  if (ink === null) return encodePng(canvas, canvas, px);

  for (const shape of shapesInPixels(g, gridPx, canvas, ink, dyPx)) {
    const [ir, ig, ib] = shape.ink;
    const [x0, y0, x1, y1] = shape.box;
    const from = Math.max(0, Math.floor(y0) - 1);
    const to = Math.min(canvas, Math.ceil(y1) + 1);
    const left = Math.max(0, Math.floor(x0) - 1);
    const right = Math.min(canvas, Math.ceil(x1) + 1);

    for (let y = from; y < to; y++)
      for (let x = left; x < right; x++) {
        /*
         * COVERAGE, NOT A HIT TEST. An edge falls between pixels wherever it likes, and the honest
         * answer for a pixel the edge crosses is "partly" — which is what an anti-aliased edge is.
         * Snapping to whole pixels would be staircasing, not sharpness.
         */
        let hits = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy++)
          for (let sx = 0; sx < SUPERSAMPLE; sx++)
            if (shape.covers(x + (sx + 0.5) / SUPERSAMPLE, y + (sy + 0.5) / SUPERSAMPLE)) hits += 1;
        if (hits === 0) continue;

        const alpha = hits / (SUPERSAMPLE * SUPERSAMPLE);
        const d = (y * canvas + x) * 4;
        // Over a transparent ground the colour is the ink and only the alpha carries coverage;
        // over an opaque one the ink is blended into what is already there.
        if (ground === null) {
          px[d] = ir;
          px[d + 1] = ig;
          px[d + 2] = ib;
          px[d + 3] = Math.round(alpha * 255);
        } else {
          px[d] = Math.round(px[d] * (1 - alpha) + ir * alpha);
          px[d + 1] = Math.round(px[d + 1] * (1 - alpha) + ig * alpha);
          px[d + 2] = Math.round(px[d + 2] * (1 - alpha) + ib * alpha);
        }
      }
  }
  return encodePng(canvas, canvas, px);
}

/**
 * A canvas's ground: transparent (`null`), one colour (a hex), or a gradient (`gradientAt`'s spec,
 * spanning `spec.box` or, without one, the whole canvas).
 */
function paintGround(canvas, ground) {
  const px = Buffer.alloc(canvas * canvas * 4);
  if (ground === null) return px;
  const spec = typeof ground === 'string' ? null : { box: [0, 0, canvas, canvas], ...ground };
  const flat = spec === null ? rgb(ground) : null;
  const at = spec === null ? null : gradient(spec);
  for (let y = 0; y < canvas; y++) {
    // A gradient whose axis has no horizontal part is one colour along a row; this one has, so
    // every pixel is evaluated — at its centre, as the mark's samples are.
    for (let x = 0; x < canvas; x++) {
      const c = flat ?? at(x + 0.5, y + 0.5);
      const d = (y * canvas + x) * 4;
      px[d] = c[0];
      px[d + 1] = c[1];
      px[d + 2] = c[2];
      px[d + 3] = 255;
    }
  }
  return px;
}

/**
 * The ground a drawing's pixels were painted on, as a function of the pixel, for the checks that
 * read the ink off it: null where transparent.
 */
function groundOf(ground, canvas) {
  if (ground === null) return () => null;
  if (typeof ground === 'string') {
    const flat = rgb(ground);
    return () => flat;
  }
  const at = gradient({ box: [0, 0, canvas, canvas], ...ground });
  return (x, y) => at(x + 0.5, y + 0.5);
}

const CANVAS = 1024;
/** Android guarantees only the central 66/108 of an adaptive icon is visible. */
export const ADAPTIVE_SAFE_FRACTION = 66 / 108;

/**
 * The grid a lone mark is drawn on to cover `fraction` of `visiblePx`: the nearest whole unit, so
 * the mark's shapes stay in proportion (F-231). 14 draws the icon's mark at 0.61 of its tile.
 */
export function gridFor(fraction, visiblePx, g = markGeometry()) {
  return Math.round((fraction * visiblePx) / g.grid) * g.grid;
}

/**
 * Every drawing the generator makes, and how (F-231). ONE TABLE, so the assets, `--prove`,
 * `brand-assets.json` and gate 16 (`verify-apk.mjs`) read the same canvas, grid and offset — a
 * second copy of any of them is a signature that refuses a correct asset, which F-230's review
 * found once already.
 *
 * `dy` is how far below the canvas's centre the mark's GRID centre sits, in whole pixels: a lone
 * mark is centred by its ink box, as 14 centres the icon's (`inkCentreDy`).
 */
export function drawings() {
  const g = markGeometry();
  const p = palette();
  const f = fourteen();
  const dyAt = (gridPx) => Math.round((inkCentreDy(g) * gridPx) / g.grid);
  const iconGrid = gridFor(f.markFraction, CANVAS, g);
  const icon = { eye: p.iconInk, petals: [p.iconInk] };
  const monoLight = { eye: p.lightInk, petals: [p.lightInk] };
  const monoDark = { eye: p.darkInk, petals: [p.darkInk] };
  return {
    /*
     * 14's TILE (criterion 1, ADR-0126): full-bleed and OPAQUE — iOS rejects an icon with alpha and
     * applies its own corner mask, and the platform draws the rim 14 shows along it. The mark at
     * 14's share of the tile, centred by its ink.
     */
    icon: {
      file: 'icon.png',
      canvas: CANVAS,
      grid: iconGrid,
      dy: dyAt(iconGrid),
      ink: icon,
      ground: p.tile,
    },
    // Android's foreground layer. Transparent; `adaptiveIcon.backgroundColor` is the other half.
    adaptive: {
      file: 'adaptive-icon.png',
      canvas: CANVAS,
      grid: ADAPTIVE_GRID,
      dy: 0,
      ink: icon,
      ground: null,
    },
    // The splashes: each theme's `foreground`, over the splash's own ground.
    splashLight: {
      file: 'splash-icon-light.png',
      canvas: CANVAS,
      grid: 768,
      dy: 0,
      ink: monoLight,
      ground: null,
    },
    splashDark: {
      file: 'splash-icon-dark.png',
      canvas: CANVAS,
      grid: 768,
      dy: 0,
      ink: monoDark,
      ground: null,
    },
    /*
     * THE THEMED-ICON LAYER (F-192). Android 13+ only, and it is the asset that was missing.
     *
     * With themed icons switched on and no `monochromeImage`, the launcher DERIVES its own
     * silhouette from the coloured icon — so an icon this product designed deliberately becomes
     * one the platform guessed at, on exactly the home screen this mark was approved on.
     *
     * The adaptive foreground's grid: this layer is masked by the launcher like the foreground is.
     * THE INK IS NOT THE POINT: Android TINTS this drawable and consumes only its alpha. `lightInk`
     * because the splashes already use it and one source beats a new decision.
     */
    monochrome: {
      file: 'monochrome-icon.png',
      canvas: CANVAS,
      grid: ADAPTIVE_GRID,
      dy: 0,
      ink: monoLight,
      ground: null,
    },
  };
}

/** What a drawing's mark must look like, from the table — the one place its numbers come from. */
export function signatureOf(drawing) {
  return expectedSignature(drawing.grid, drawing.canvas, drawing.dy);
}

/**
 * The grid the Android foreground is drawn on: DERIVED, not chosen.
 *
 * The ink reaches `reach` units from the centre, so the unit may be at most the safe radius over
 * the reach (312.9 / 12 = 26.07 px for 14's mark), and it must be a whole number of pixels; the grid
 * is that unit times 24. F-165's six discs gave 648; 14's blossom gives 624.
 */
export const ADAPTIVE_GRID = (() => {
  const g = markGeometry();
  return Math.floor((CANVAS * ADAPTIVE_SAFE_FRACTION) / 2 / g.reach) * g.grid;
})();

export function assets() {
  const g = markGeometry();
  const table = drawings();

  /*
   * ONE INK EVERYWHERE, THE ICON INCLUDED (ADR-0122, superseding ADR-0093). Mockup 14 draws the
   * icon's mark in `text.secondary` on its dark tile, and C4 takes the mark from 14 — so every
   * drawing is one ink on its ground, and the tile is a gradient of two surface tokens (ADR-0126).
   */
  return [
    ...Object.values(table).map((d) => ({
      file: d.file,
      bytes: render(d.canvas, d.grid, d.ink, d.ground, g, d.dy),
    })),
    // The shapes this generator derived, for brand.test to compare with the component's (E-116).
    {
      file: 'mark-geometry.json',
      bytes: Buffer.from(`${JSON.stringify(geometryFile(g), null, 2)}
`),
    },
    // The drawings' geometry, for the app and the checks that cannot import this file (E-178).
    {
      file: 'brand-assets.json',
      bytes: Buffer.from(`${JSON.stringify(drawingsFile(table), null, 2)}
`),
    },
  ];
}

/**
 * `brand-assets.json`: each drawing's canvas, grid and offset, as the table above has them (F-231).
 * The app reads the splash's from it, so the native splash and the overlay that continues it are
 * drawn from one set of numbers; `--check` byte-compares it like every asset.
 */
function drawingsFile(table) {
  return {
    $comment:
      'GENERATED by scripts/generate-brand-assets.mjs from its drawings table. Each drawing: its canvas and grid in px, and dy, how far below the canvas centre the grid centre sits (a lone mark is centred by its ink, ADR-0126).',
    drawings: Object.fromEntries(
      Object.entries(table).map(([name, d]) => [
        name,
        { file: d.file, canvas: d.canvas, grid: d.grid, dy: d.dy },
      ]),
    ),
  };
}

/** Ink intervals along a scan line, less cut intervals, as sorted disjoint [from, to] pairs. */
function subtract(ink, cuts) {
  let out = ink;
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [a, b] of out) {
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    out = next;
  }
  return out;
}
function union(intervals) {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/**
 * What an asset's middle row and middle column should look like, AT THE SIZE IT IS VIEWED AT.
 *
 * The row crosses the petals' sides, the ring and the eye; the column crosses the top petal, the
 * stamen along it, the ring and the eye — and below the eye the seam along the bottom notch, so the
 * column ends there. The blossom is not symmetric top to bottom, which is what tells it from a disc.
 *
 * **Two tiers, by size.** Where every cut spans at least 3 px — the generated assets — the full run
 * pattern is expected, every interval computed from the geometry. Below that — a launcher's 48 to
 * 192 px — a cut is a pixel or two, and whether it reads depends on a rasteriser's threshold, not on
 * the mark; there the mark is its OUTLINE: the row as wide as drawn and symmetric, the column
 * reaching the top petal's tip above the centre and ending well short of it below.
 */
export function expectedSignature(gridPx, canvas, dyPx = 0) {
  if (!Number.isFinite(gridPx) || !Number.isFinite(canvas))
    throw new Error(
      'expectedSignature takes a drawing’s grid and canvas — read them from the drawings table ' +
        '(signatureOf), never a default: a default is the icon’s, and every other layer would be ' +
        'refused by it (F-230’s review).',
    );
  const g = markGeometry();
  const step = 360 / g.petals;
  const petalCentres = Array.from({ length: g.petals }, (_, k) => {
    const [ex, ey] = towards(k * step);
    return [g.orbit * ex, g.orbit * ey];
  });
  const chords = (perp) =>
    petalCentres
      .filter(([along, off]) => Math.abs(perp(along, off)) < g.petal)
      .map(([along, off]) => {
        const d = perp(along, off);
        return [along, off, Math.sqrt(g.petal * g.petal - d * d)];
      });
  // The row is y = 0 (x runs along it); the column is x = 0 (y runs down it).
  const rowInk = union([
    [-g.hub, g.hub],
    ...chords((_x, y) => y).map(([x, , h]) => [x - h, x + h]),
  ]);
  const columnInk = union([[-g.hub, g.hub], ...chords((x) => x).map(([, y, h]) => [y - h, y + h])]);
  const ring = [
    [-g.ringOuter, -g.eye],
    [g.eye, g.ringOuter],
  ];
  // Along the column: the stamen of the petal straight up, and the seam of the notch straight down.
  const row = subtract(rowInk, ring);
  const column = subtract(columnInk, [
    ...ring,
    [-g.stamenOuter, -g.ringOuter],
    [g.ringOuter, g.reach + 1],
  ]);
  const rowReach = Math.max(...rowInk.map(([, to]) => to));

  /*
   * WHERE THE GRID'S CENTRE IS, as a fraction of the image's height (F-231): a lone mark is centred
   * by its ink, so its grid's centre — where the row is read and the column is measured from — sits
   * `dyPx` below the middle. Fractions survive resizing, so a launcher's 48 px copy reads it too.
   */
  const centreY = 0.5 + dyPx / canvas;
  return {
    gridPx,
    canvas,
    dyPx,
    /** What an image `width` px wide must show. */
    at(width) {
      const scale = (gridPx / canvas) * (width / g.grid);
      const narrowest = Math.min(g.ringOuter - g.eye, g.stamenWidth, g.seamWidth) * scale;
      if (narrowest < 3)
        return {
          tier: 'outline',
          centreY,
          rowWidth: (2 * rowReach * scale) / width,
          above: (g.reach * scale) / width,
          // The column below the centre ends at the eye (the seam drawn) or near the hub (not
          // drawn): well short of the top either way.
          belowAtMost: ((g.hub + (g.reach - g.hub) / 2) * scale) / width,
        };
      const runsOf = (intervals) => {
        const total = width / scale;
        const out = [];
        let at = -total / 2;
        for (const [from, to] of intervals) {
          if (from > at) out.push({ ink: false, fraction: ((from - at) * scale) / width });
          out.push({ ink: true, fraction: ((to - Math.max(from, at)) * scale) / width });
          at = to;
        }
        // Leading and trailing ground are margin: only what lies between the first and last ink counts.
        return out.filter((run, i) => run.ink || (i > 0 && i < out.length - 1));
      };
      return { tier: 'runs', centreY, row: runsOf(row), column: runsOf(column) };
    },
  };
}

/**
 * Whether a decoded asset is drawn in ONE ink (ADR-0122).
 *
 * Over a transparent ground every painted pixel must be the ink exactly — coverage lives in the
 * alpha. Over an opaque ground every pixel must lie on the line from ITS OWN ground to the ink: one
 * blend factor for all three channels, each within the half a level the blend's rounding makes (one
 * level allowed). A second colour anywhere puts a pixel off that line. `ground` is a hex, or a
 * gradient (`gradientAt`'s spec, over the whole image): 14's tile changes its ground pixel by pixel
 * (F-231), and the line is drawn from the ground at that pixel.
 */
export function oneInk(image, ink, ground) {
  const [ir, ig, ib] = rgb(ink);
  if (ground === null) {
    let painted = 0;
    for (let i = 0; i < image.rgba.length; i += 4) {
      if (image.rgba[i + 3] === 0) continue;
      painted += 1;
      if (image.rgba[i] !== ir || image.rgba[i + 1] !== ig || image.rgba[i + 2] !== ib)
        return {
          ok: false,
          why: `a painted pixel is rgb(${String(image.rgba[i])}, ${String(image.rgba[i + 1])}, ${String(image.rgba[i + 2])}), not ${ink}`,
        };
    }
    return painted > 0
      ? { ok: true, why: `${String(painted)} painted pixel(s), all ${ink}` }
      : { ok: false, why: 'nothing is painted — a silhouette of nothing' };
  }
  let inked = 0;
  const groundAt = groundOf(ground, image.width);
  for (let y = 0; y < image.height; y += 1)
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      const g = groundAt(x, y);
      const span = [ir - g[0], ig - g[1], ib - g[2]];
      const longest = span.reduce((m, v, k) => (Math.abs(v) > Math.abs(span[m]) ? k : m), 0);
      const c = [image.rgba[i], image.rgba[i + 1], image.rgba[i + 2]];
      const t = (c[longest] - g[longest]) / span[longest];
      for (let k = 0; k < 3; k += 1)
        if (Math.abs(c[k] - (g[k] + t * span[k])) > 1)
          return {
            ok: false,
            why: `rgb(${c.join(', ')}) at (${String(x)}, ${String(y)}) is off the line from its ground rgb(${g.join(', ')}) to ${ink}`,
          };
      if (t > 0.5) inked += 1;
    }
  return inked > 0
    ? { ok: true, why: `every pixel between its ground and ${ink}; ${String(inked)} mostly ink` }
    : { ok: false, why: 'no pixel is mostly ink — a ground with no mark on it' };
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
 * three decoys catch a signature that would accept anything with ink in it.
 *
 * **Nothing is written to the working tree**: the mutations happen in memory.
 */
function prove() {
  console.log(`\n${BOLD}Irodora — brand assets, discrimination proof${OFF}\n`);
  const problems = [];
  let ran = 0;
  let negatives = 0;
  const say = (ok, name, detail) => {
    ran += 1;
    // A case is a NEGATIVE when it asserts something is REJECTED. The closing line counts
    // them rather than restating a figure somebody typed once — which is the same defect
    // F-193 is about: a number that agreed with its subject on the day it was written.
    if (/DECOY|REFUSED|CANNOT|does not/u.test(name)) negatives += 1;
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

  // 2. Every generated asset carries the mark, at its full size and at every launcher density.
  const table = drawings();
  const marked = Object.values(table).filter((d) => d.ink !== null);
  const imageOf = (d) => decodePng(readFileSync(join(OUT, d.file)));
  for (const d of marked) {
    const r = carriesMark(imageOf(d), signatureOf(d));
    say(r.ok, `${d.file} carries the mark`, r.why);
  }
  /*
   * THE LAUNCHER DENSITIES (F-230). A launcher shows the icon at 48 to 192 px, where the cuts are a
   * pixel or less. The signature is derived at the size it is read at, so a cut too thin to draw is
   * expected absent there rather than demanded — and the blossom's outline still has to be there.
   */
  for (const d of [table.icon, table.adaptive])
    for (const size of [48, 72, 96, 144, 192]) {
      const image = downscale(imageOf(d), size);
      const r = carriesMark(image, signatureOf(d));
      say(r.ok, `${d.file} carries the mark at ${String(size)} px`, r.why);
    }
  /*
   * ONE SIGNATURE PER DRAWING (F-230's review). Drawings put the mark on different grids, so each is
   * REFUSED by another's signature at a launcher's size — which is why gate 16 (verify-apk.mjs,
   * `signaturesFor`) picks the signature by the resource's layer.
   */
  for (const [d, other] of [
    [table.icon, table.splashDark],
    [table.splashDark, table.icon],
  ]) {
    const image = downscale(imageOf(d), 96);
    say(
      !carriesMark(image, signatureOf(other)).ok,
      `DECOY — ${d.file} at 96 px is REFUSED by ${other.file}'s signature`,
      `it is drawn on ${String(d.grid)}/${String(d.canvas)}: one signature for every layer refuses a correct one`,
    );
  }

  /*
   * 2b. 14'S TILE AND 14'S PROPORTION (F-231, ADR-0126), each READ from the asset and from the
   * record, never compared with a copy of either.
   */
  const f = fourteen();
  const iconImage = imageOf(table.icon);
  const unitOf = (d) => d.grid / markGeometry().grid;
  say(
    Math.abs(table.icon.grid - f.markFraction * table.icon.canvas) <= unitOf(table.icon) / 2,
    "the icon's mark is 14's share of the tile, to the nearest whole unit",
    `${String(table.icon.grid)}/${String(table.icon.canvas)} = ${(table.icon.grid / table.icon.canvas).toFixed(3)}; 14 draws ${f.markFraction.toFixed(3)}`,
  );
  for (const [grid, why] of [
    [768, "the splash's grid, which the icon used before F-231"],
    [
      table.icon.grid + markGeometry().grid,
      'one unit larger — the tolerance is half a unit, not a range',
    ],
  ])
    say(
      grid !== table.icon.grid &&
        Math.abs(grid - f.markFraction * table.icon.canvas) > unitOf(table.icon) / 2,
      `DECOY — a mark on ${String(grid)}/${String(table.icon.canvas)} is REFUSED as 14's share`,
      why,
    );
  const p = palette();
  for (const size of [1024, 192, 96, 48]) {
    const image = size === 1024 ? iconImage : downscale(iconImage, size);
    const r = carriesTile(image, p.tile);
    say(r.ok, `icon.png is 14's tile at ${String(size)} px`, r.why);
  }
  const tileDecoy = (name, ground, detail) => {
    // At half size: the unit stays a whole pixel (26 → 13), and a tile reads at any size.
    const image = decodePng(
      render(
        CANVAS / 2,
        table.icon.grid / 2,
        table.icon.ink,
        ground,
        markGeometry(),
        table.icon.dy / 2,
      ),
    );
    say(!carriesTile(image, p.tile).ok, name, `${detail} — ${carriesTile(image, p.tile).why}`);
  };
  tileDecoy(
    'DECOY — a FLAT tile is REFUSED',
    p.darkGround,
    "F-230's interim icon, the mark on the ground",
  );
  tileDecoy(
    'DECOY — a REVERSED tile is REFUSED',
    { from: p.tile.to, to: p.tile.from, angleDeg: p.tile.angleDeg },
    'dark at the top-left',
  );
  tileDecoy(
    'DECOY — a VERTICAL tile is REFUSED',
    { ...p.tile, angleDeg: 0 },
    'the axis the plan assumed before 14 was re-read',
  );
  tileDecoy(
    'DECOY — a tile between OTHER tokens, on 14’s axis, is REFUSED',
    { from: '#323742', to: '#20232A', angleDeg: p.tile.angleDeg },
    'level 3 to level 1 — the ends are read, not only the slope',
  );
  tileDecoy(
    'DECOY — a LIGHT tile is REFUSED',
    { from: p.lightGround, to: '#FFFFFF', angleDeg: p.tile.angleDeg },
    'no mockup draws a light icon',
  );
  /*
   * CENTRED BY ITS INK (F-231): the rows the mark inks, read from the asset, centre on the canvas.
   * The record agrees — 14's ink box sits nearer the tile's centre than its grid does — and the
   * decoy is the same mark centred by its grid, whose ink box rides high.
   */
  const inkRows = (image, d) => {
    let first = -1;
    let last = -1;
    const groundAt = groundOf(d.ground, image.width);
    const ink = rgb(d.ink.eye);
    for (let y = 0; y < image.height; y += 1)
      for (let x = 0; x < image.width; x += 1) {
        const i = (y * image.width + x) * 4;
        const ground = groundAt(x, y) ?? [0, 0, 0];
        const t = (image.rgba[i + 1] - ground[1]) / (ink[1] - ground[1]);
        if ((d.ground === null ? image.rgba[i + 3] / 255 : t) > 0.5) {
          if (first < 0) first = y;
          last = y;
          break;
        }
      }
    return (first + last + 1) / 2 - image.height / 2;
  };
  const off = inkRows(iconImage, table.icon);
  say(
    Math.abs(off) <= 1,
    "icon.png's ink box is centred on the tile",
    `${off.toFixed(1)} px from the centre`,
  );
  say(
    Math.abs(f.inkCentreDy) < Math.abs(f.centreDy) / 2,
    '14 centres the icon’s mark by its ink, not by its grid',
    `its ink box sits ${(f.inkCentreDy * 100).toFixed(2)} % of the tile below the centre, its grid ${(f.centreDy * 100).toFixed(2)} %`,
  );
  const gridCentred = decodePng(
    render(CANVAS, table.icon.grid, table.icon.ink, table.icon.ground, markGeometry(), 0),
  );
  const offGrid = inkRows(gridCentred, table.icon);
  say(
    Math.abs(offGrid) > 1,
    'DECOY — the same mark centred by its GRID is REFUSED',
    `its ink box rides ${(-offGrid).toFixed(1)} px high`,
  );

  // 3. THE DECOYS. A signature that accepts anything is worth nothing.
  const g = markGeometry();
  const mono = { eye: '#F6F4F1', petals: ['#F6F4F1'] };
  const decoy = (name, geometry, detail) => {
    const image = decodePng(render(256, 192, mono, '#090807', { ...g, ...geometry }));
    say(!carriesMark(image, expectedSignature(768, CANVAS)).ok, name, detail);
    return image;
  };
  const solid = decoy(
    'a solid disc is REFUSED',
    { hub: g.reach, petals: 1, orbit: 0, petal: 0, ringOuter: 0, stamenWidth: 0, seamWidth: 0 },
    'ink in the middle, one run across, the same top and bottom',
  );
  decoy(
    'the blossom with no ring is REFUSED',
    { ringOuter: g.eye },
    "14's eye stands in a cut ring",
  );
  const four = decoy(
    'FOUR petals are REFUSED — the count is part of the mark',
    {
      petals: 4,
      orbit: g.reach / (1 + Math.sin(Math.PI / 4)),
      petal: (g.reach / (1 + Math.sin(Math.PI / 4))) * Math.sin(Math.PI / 4),
      hub: (g.reach / (1 + Math.sin(Math.PI / 4))) * Math.cos(Math.PI / 4),
    },
    'a petal straight down fills the column below the eye',
  );
  decoy(
    "F-165's six discs are REFUSED — the mark this replaces",
    {
      reach: 11.2,
      orbit: 8,
      petal: 3.2,
      hub: 0,
      eye: 1.8,
      ringOuter: 1.8,
      stamenWidth: 0,
      seamWidth: 0,
    },
    'five discs at one interval around a sixth',
  );
  say(
    !carriesMark(downscale(solid, 48), expectedSignature(768, CANVAS)).ok,
    'DECOY — at 48 px a solid disc is still REFUSED',
    'the outline alone tells it from the blossom, which is not symmetric top to bottom',
  );
  say(
    !carriesMark(downscale(four, 48), expectedSignature(768, CANVAS)).ok,
    'DECOY — at 48 px four petals are still REFUSED',
    'a petal straight down reaches as far below the centre as above',
  );

  /*
   * 4. EVERY ASSET IS ONE INK, READ FROM ITS BYTES (ADR-0122).
   *
   * A transparent asset paints exactly one colour among its painted pixels; an opaque one paints
   * every pixel on the line between its ground and its ink, to within the rounding a blend can
   * make. Counted from what came out, never trusted from the scheme that was passed in.
   */
  const byFile = new Map(Object.values(table).map((d) => [d.file, d]));
  for (const a of assets().filter((x) => x.file.endsWith('.png'))) {
    const d = byFile.get(a.file);
    if (d === undefined) throw new Error(`${a.file} is in no drawing`);
    const r = oneInk(decodePng(a.bytes), d.ink.eye, d.ground);
    say(r.ok, `${a.file} is one ink`, r.why);
  }
  /*
   * THE DECOY: a mark in TWO inks — the icon's half in its ink and half in ADR-0093's red — rendered
   * in memory. The check above must refuse it, or "one ink" is a property of the check rather than
   * the assets. (ADR-0093's icon had five; two is the least that is not one.)
   */
  const inkA = decodePng(render(CANVAS, table.icon.grid, table.icon.ink, p.tile, g, table.icon.dy));
  const inkB = decodePng(
    render(
      CANVAS,
      table.icon.grid,
      { eye: '#AC473E', petals: ['#AC473E'] },
      p.tile,
      g,
      table.icon.dy,
    ),
  );
  const twoInk = { width: inkA.width, height: inkA.height, rgba: Buffer.from(inkA.rgba) };
  for (let y = 0; y < twoInk.height; y += 1)
    for (let x = twoInk.width / 2; x < twoInk.width; x += 1) {
      const d = (y * twoInk.width + x) * 4;
      inkB.rgba.copy(twoInk.rgba, d, d, d + 4);
    }
  say(
    !oneInk(twoInk, p.iconInk, p.tile).ok,
    'DECOY — a mark in two inks is REFUSED',
    "half in the icon's ink and half in ADR-0093's red, which ADR-0122 supersedes",
  );

  // 4b. The Android safe zone, as arithmetic rather than a screenshot — and DERIVED, because a
  //     written-down figure would go on passing about a shape it no longer described (E-085).
  const reach = (g.reach * ADAPTIVE_GRID) / g.grid;
  const safeRadius = (CANVAS * ADAPTIVE_SAFE_FRACTION) / 2;
  say(
    reach <= safeRadius,
    'the adaptive icon fits the 66/108 safe circle',
    `ink reaches ${reach.toFixed(1)} from centre ≤ ${safeRadius.toFixed(1)}`,
  );

  /*
   * 4b-bis. THE PARSE CANNOT READ THE WRONG NUMBERS (F-193).
   *
   * `markGeometry` used to match against the whole file. It throws when it cannot FIND the four
   * numbers, and could not tell that it had found the WRONG ones — so a `grid:` anywhere above
   * `MARK` would give this generator one geometry and the app another, with `--check` agreeing
   * with the wrong reading because it compares the assets against exactly this
   * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
   *
   * The obvious guard — compare the parse against the component's own exports — cannot be
   * written: `brand.tsx` imports React Native, so a Node script cannot load it, which is the
   * same reason this parse exists. So the failure mode was REMOVED rather than detected, and
   * these three cases are what say it stayed removed.
   */
  const realSource = readFileSync(join(ROOT, 'packages/ui/src/brand.tsx'), 'utf8');

  const decoyed = markGeometry(
    realSource.replace(
      'export const MARK = {',
      'const NOT_THE_MARK = { grid: 999, petals: 9, reach: 99, eye: 9, ringOuter: 9, stamenOuter: 9, stamenWidth: 9, seamWidth: 9 }; ' +
        'export const MARK = {',
    ),
  );
  say(
    decoyed.grid === g.grid && decoyed.grid !== 999,
    'a `grid:` OUTSIDE the MARK block does not reach the parse',
    `read ${String(decoyed.grid)} with a constant declaring 999 above it`,
  );

  const refuses = (mutate) => {
    try {
      markGeometry(mutate(realSource));
      return false;
    } catch {
      return true;
    }
  };
  say(
    refuses(
      (s) =>
        `${s}export const MARK = { grid: 1, petals: 1, reach: 1, eye: 1, ringOuter: 1, stamenOuter: 1, stamenWidth: 1, seamWidth: 1 } as const;`,
    ),
    'TWO declarations of MARK are REFUSED, rather than one of them being picked',
    'the icon and the app could otherwise follow different geometry',
  );

  /*
   * THE DECOY. A function that threw on everything would pass the case above. It must still
   * refuse the opposite mistake, and it must still read the real file.
   */
  say(
    refuses((s) => s.replace(/\n {2}seamWidth: [\d.]+,/u, '')),
    'a MARK with a field missing is REFUSED, rather than drawn without that cut',
    'seamWidth removed',
  );
  say(
    refuses((s) => s.replace('export const MARK = {', 'const GONE = {')),
    'DECOY — NO declaration of MARK is refused too, so the check is not merely counting to one',
    'a parse falling back to defaults would ship an icon nobody drew',
  );

  /*
   * 4c. THE THEMED-ICON LAYER IS A SILHOUETTE (F-192): Android tints it and reads only its alpha.
   * Its one ink is checked with every other asset's above; what is left is that its ground is
   * transparent, so the launcher supplies the other half.
   */
  const themed = decodePng(assets().find((a) => a.file === 'monochrome-icon.png').bytes);
  let transparent = 0;
  for (let i = 3; i < themed.rgba.length; i += 4) if (themed.rgba[i] === 0) transparent += 1;
  say(
    transparent > 0,
    "the themed icon's ground is transparent, so the launcher supplies the other half",
    `${String(transparent)} fully transparent pixel(s)`,
  );

  const tooBig = (g.reach * 768) / g.grid;
  say(
    tooBig > safeRadius,
    'the grid this mark CANNOT use is refused',
    `at 768 the ink would reach ${tooBig.toFixed(1)} — the check is not vacuous`,
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
      `${DIM}${String(ran)} cases, ${String(negatives)} of them asserting a refusal — counted from the cases that ran, not written down beside them.${OFF}\n`,
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
