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
 * | `icon` | 1024 | 768 | 32 | 384 | iOS squircle-masks the corners; the top petal touches the grid's edge, well inside them |
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

/** Colours, from the manifest. The mark has none of its own, and the icon invents none. */
function palette() {
  const m = JSON.parse(readFileSync(join(ROOT, 'docs/design/design-system.manifest.json'), 'utf8'));
  const hex = (theme, token) => m.color[theme][token].srgb;
  return {
    lightGround: hex('light', 'background'),
    darkGround: hex('dark', 'background'),
    darkInk: hex('dark', 'foreground'),
    lightInk: hex('light', 'foreground'),
    // 14's icon draws its mark in `text.secondary` (`14.icon.tile.mark`): dark `foreground.2`.
    iconInk: hex('dark', 'foreground.2'),
  };
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
function shapesInPixels(g, gridPx, canvas, ink) {
  const unit = gridPx / g.grid;
  const offset = (canvas - gridPx) / 2;
  const centre = offset + (g.grid / 2) * unit;
  const reach = (g.reach + 1) * unit;
  return [
    {
      ink: rgb(ink.eye),
      box: [centre - reach, centre - reach, centre + reach, centre + reach],
      covers: (x, y) => coversGrid(g, (x - centre) / unit, (y - centre) / unit),
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
function render(canvas, gridPx, ink, ground, g) {
  const unit = gridPx / g.grid;
  if (!Number.isInteger(unit))
    throw new Error(
      `unit is ${String(unit)}px and must be a whole number — a fractional unit puts the mark's` +
        ' shapes out of proportion with each other and makes the artefact signature approximate.',
    );

  const [gr, gg, gb] = ground === null ? [0, 0, 0] : rgb(ground);
  const px = Buffer.alloc(canvas * canvas * 4);
  for (let i = 0; i < canvas * canvas; i++) {
    px[i * 4] = gr;
    px[i * 4 + 1] = gg;
    px[i * 4 + 2] = gb;
    px[i * 4 + 3] = ground === null ? 0 : 255;
  }

  for (const shape of shapesInPixels(g, gridPx, canvas, ink)) {
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

const CANVAS = 1024;
/** Android guarantees only the central 66/108 of an adaptive icon is visible. */
export const ADAPTIVE_SAFE_FRACTION = 66 / 108;

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
  const p = palette();

  /*
   * ONE INK EVERYWHERE, THE ICON INCLUDED (ADR-0122, superseding ADR-0093). Mockup 14 draws the
   * icon's mark in `text.secondary` on a dark tile, and C4 takes the mark from 14. The tile's
   * gradient and squircle are F-231's; until then the icon is the mark in dark `foreground.2` on
   * the dark `background` the adaptive layer already composes over, so iOS and Android show one
   * image.
   */
  const icon = { eye: p.iconInk, petals: [p.iconInk] };
  const monoLight = { eye: p.lightInk, petals: [p.lightInk] };
  const monoDark = { eye: p.darkInk, petals: [p.darkInk] };

  return [
    // iOS and the store. OPAQUE — iOS rejects an app icon with an alpha channel.
    { file: 'icon.png', bytes: render(CANVAS, 768, icon, p.darkGround, g) },
    // Android's foreground layer. Transparent; `adaptiveIcon.backgroundColor` is the other half.
    { file: 'adaptive-icon.png', bytes: render(CANVAS, ADAPTIVE_GRID, icon, null, g) },
    // The splashes: each theme's `foreground`, over the splash's own ground.
    { file: 'splash-icon-light.png', bytes: render(CANVAS, 768, monoLight, null, g) },
    { file: 'splash-icon-dark.png', bytes: render(CANVAS, 768, monoDark, null, g) },
    /*
     * THE THEMED-ICON LAYER (F-192). Android 13+ only, and it is the asset that was missing.
     *
     * With themed icons switched on and no `monochromeImage`, the launcher DERIVES its own
     * silhouette from the coloured icon — so an icon this product designed deliberately becomes
     * one the platform guessed at, on exactly the home screen this mark was approved on. It is
     * the same class of defect as the icon that predated F-141: *"an app icon is the one asset
     * you stop seeing after a week, so nobody notices."*
     *
     * ADAPTIVE_GRID, not 768: this layer is masked by the launcher like the foreground is, so it
     * has to survive the same crop. Drawing it on the icon grid would put the outer petals under
     * the mask on a round launcher.
     *
     * THE INK IS NOT THE POINT, and that is recorded rather than left looking deliberate:
     * Android TINTS this drawable itself and consumes only the alpha silhouette. `lightInk` is
     * used because the splashes already use it and one source beats a new decision.
     */
    { file: 'monochrome-icon.png', bytes: render(CANVAS, ADAPTIVE_GRID, monoLight, null, g) },
    // The shapes this generator derived, for brand.test to compare with the component's (E-116).
    {
      file: 'mark-geometry.json',
      bytes: Buffer.from(`${JSON.stringify(geometryFile(g), null, 2)}\n`),
    },
  ];
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
export function expectedSignature(gridPx = 768, canvas = CANVAS) {
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

  return {
    gridPx,
    canvas,
    /** What an image `width` px wide must show. */
    at(width) {
      const scale = (gridPx / canvas) * (width / g.grid);
      const narrowest = Math.min(g.ringOuter - g.eye, g.stamenWidth, g.seamWidth) * scale;
      if (narrowest < 3)
        return {
          tier: 'outline',
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
      return { tier: 'runs', row: runsOf(row), column: runsOf(column) };
    },
  };
}

/**
 * Whether a decoded asset is drawn in ONE ink (ADR-0122).
 *
 * Over a transparent ground every painted pixel must be the ink exactly — coverage lives in the
 * alpha. Over an opaque ground every pixel must lie on the line from the ground to the ink: one
 * blend factor for all three channels, each within the half a level the blend's rounding makes
 * (one level allowed). A second colour anywhere puts a pixel off that line.
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
  const g = rgb(ground);
  const span = [ir - g[0], ig - g[1], ib - g[2]];
  const longest = span.reduce((m, v, k) => (Math.abs(v) > Math.abs(span[m]) ? k : m), 0);
  let inked = 0;
  for (let i = 0; i < image.rgba.length; i += 4) {
    const c = [image.rgba[i], image.rgba[i + 1], image.rgba[i + 2]];
    const t = (c[longest] - g[longest]) / span[longest];
    for (let k = 0; k < 3; k += 1)
      if (Math.abs(c[k] - (g[k] + t * span[k])) > 1)
        return { ok: false, why: `rgb(${c.join(', ')}) is off the line from ${ground} to ${ink}` };
    if (t > 0.5) inked += 1;
  }
  return inked > 0
    ? { ok: true, why: `every pixel between ${ground} and ${ink}; ${String(inked)} mostly ink` }
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
  const grids = [
    ['icon.png', 768],
    ['adaptive-icon.png', ADAPTIVE_GRID],
    ['splash-icon-light.png', 768],
    ['splash-icon-dark.png', 768],
  ];
  for (const [file, grid] of grids) {
    const image = decodePng(readFileSync(join(OUT, file)));
    const r = carriesMark(image, expectedSignature(grid));
    say(r.ok, `${file} carries the mark`, r.why);
  }
  /*
   * THE LAUNCHER DENSITIES (F-230). A launcher shows the icon at 48 to 192 px, where the cuts are a
   * pixel or less. The signature is derived at the size it is read at, so a cut too thin to draw is
   * expected absent there rather than demanded — and the blossom's outline still has to be there.
   */
  for (const [file, grid] of grids.slice(0, 2))
    for (const size of [48, 72, 96, 144, 192]) {
      const image = downscale(decodePng(readFileSync(join(OUT, file))), size);
      const r = carriesMark(image, expectedSignature(grid));
      say(r.ok, `${file} carries the mark at ${String(size)} px`, r.why);
    }
  /*
   * ONE SIGNATURE PER DRAWING (F-230's review). The icon and the adaptive layer draw the mark on
   * different grids, so each is REFUSED by the other's signature at a launcher's size — which is
   * why gate 16 (verify-apk.mjs, `signaturesFor`) picks the signature by the resource's layer.
   */
  for (const [file, grid, other] of [
    ['icon.png', 768, ADAPTIVE_GRID],
    ['adaptive-icon.png', ADAPTIVE_GRID, 768],
  ]) {
    const image = downscale(decodePng(readFileSync(join(OUT, file))), 96);
    say(
      !carriesMark(image, expectedSignature(other)).ok,
      `DECOY — ${file} at 96 px is REFUSED by the ${String(other)} px grid's signature`,
      `it is drawn on ${String(grid)}: one signature for every launcher layer refuses a correct one`,
    );
  }

  // 3. THE DECOYS. A signature that accepts anything is worth nothing.
  const g = markGeometry();
  const mono = { eye: '#F6F4F1', petals: ['#F6F4F1'] };
  const decoy = (name, geometry, detail) => {
    const image = decodePng(render(256, 192, mono, '#090807', { ...g, ...geometry }));
    say(!carriesMark(image, expectedSignature(768)).ok, name, detail);
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
    !carriesMark(downscale(solid, 48), expectedSignature(768)).ok,
    'DECOY — at 48 px a solid disc is still REFUSED',
    'the outline alone tells it from the blossom, which is not symmetric top to bottom',
  );
  say(
    !carriesMark(downscale(four, 48), expectedSignature(768)).ok,
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
  const p = palette();
  const expected = {
    'icon.png': [p.iconInk, p.darkGround],
    'adaptive-icon.png': [p.iconInk, null],
    'splash-icon-light.png': [p.lightInk, null],
    'splash-icon-dark.png': [p.darkInk, null],
    'monochrome-icon.png': [p.lightInk, null],
  };
  for (const a of assets().filter((x) => x.file.endsWith('.png'))) {
    const [ink, ground] = expected[a.file];
    const r = oneInk(decodePng(a.bytes), ink, ground);
    say(r.ok, `${a.file} is one ink`, r.why);
  }
  /*
   * THE DECOY: a mark in TWO inks — the icon's half in its ink and half in ADR-0093's red — rendered
   * in memory. The check above must refuse it, or "one ink" is a property of the check rather than
   * the assets. (ADR-0093's icon had five; two is the least that is not one.)
   */
  const inkA = decodePng(
    render(CANVAS, 768, { eye: p.iconInk, petals: [p.iconInk] }, p.darkGround, g),
  );
  const inkB = decodePng(
    render(CANVAS, 768, { eye: '#AC473E', petals: ['#AC473E'] }, p.darkGround, g),
  );
  const twoInk = { width: inkA.width, height: inkA.height, rgba: Buffer.from(inkA.rgba) };
  for (let y = 0; y < twoInk.height; y += 1)
    for (let x = twoInk.width / 2; x < twoInk.width; x += 1) {
      const d = (y * twoInk.width + x) * 4;
      inkB.rgba.copy(twoInk.rgba, d, d, d + 4);
    }
  say(
    !oneInk(twoInk, p.iconInk, p.darkGround).ok,
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
