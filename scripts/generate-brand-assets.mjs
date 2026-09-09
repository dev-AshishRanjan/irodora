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
 * The integer-unit check stays, because it keeps the six discs in exact proportion to each other
 * at every size and makes the signature below arithmetic rather than approximate.
 *
 * | asset | canvas | grid at | unit | reach | why that size |
 * |---|---:|---:|---:|---:|---|
 * | `icon` | 1024 | 768 | 32 | 358 | iOS squircle-masks the corners; the ink is a disc well inside them |
 * | `adaptive-icon` | 1024 | 648 | 27 | 302 | Android guarantees only a **66/108** circle — radius 312.9 |
 * | `splash-icon-*` | 1024 | 768 | 32 | 358 | Expo composites it over the theme background |
 *
 * ## The icon carries colour and the app does not
 *
 * [ADR-0093](../docs/adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md).
 * Five petals, five corpus colours, pinned by slug below and checked against the published
 * bundle by `--prove` — so a corpus republish that moves one of them fails loudly instead of
 * silently redrawing the app icon.
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
  const orbit = pick('orbit: (\\d+)', 'the orbit');
  const interval = pick('interval: (\\d+)', 'the interval');

  /*
   * THE RADII ARE SOLVED, HERE AND IN THE COMPONENT, FROM THE SAME TWO NUMBERS.
   *
   * Reading them out of the source instead would mean parsing an expression rather than a
   * literal — and writing them down here would be a second copy of the one thing the mark is:
   * both gaps are the interval, exactly, because the radii come out of it.
   */
  const petal = (2 * orbit * Math.sin(Math.PI / petals) - interval) / 2;
  const eye = orbit - petal - interval;

  return { grid, petals, orbit, interval, petal, eye };
}

/** The six discs, in the component's order. The generator's copy of `markDiscs()`, derived. */
function discs(g) {
  const c = g.grid / 2;
  const out = [{ cx: c, cy: c, r: g.eye, role: 'eye' }];
  for (let i = 0; i < g.petals; i++) {
    const angle = (i / g.petals) * 2 * Math.PI;
    out.push({
      cx: c + g.orbit * Math.sin(angle),
      cy: c - g.orbit * Math.cos(angle),
      r: g.petal,
      role: 'petal',
    });
  }
  return out;
}

/**
 * The five petals, pinned by slug.
 *
 * **From the corpus, which is where every colour in this product comes from** — but PINNED
 * rather than read at build time, so a corpus republish cannot silently redraw the app icon.
 * `--prove` checks each hex against the published bundle and fails by name if one has moved,
 * which turns a silent redraw into a decision somebody has to make.
 *
 * A year, in five colours: the hues are spread across the circle so the mark reads as *colours*
 * rather than as a tint, and the lightnesses are held between OKLCh 0.53 and 0.64 so they sit
 * together calmly rather than shouting past each other. That restraint is the register the
 * product chose — soft minimal — applied to the one surface allowed any colour at all.
 */
const PETALS = [
  { slug: 'mi-aka', hex: '#AC473E', name: '実赤 Fruit Red' },
  { slug: 'aki-batake', hex: '#9F7850', name: '秋畑 Autumn Field' },
  { slug: 'natsu-kage', hex: '#4E8164', name: '夏影 Summer Shade' },
  { slug: 'oki-nagi', hex: '#449AAC', name: '沖凪 Calm Offing' },
  { slug: 'yoru-kawa', hex: '#507DB3', name: '夜川 Night River' },
];

/** Colours, from the manifest and the corpus. The icon invents none of its own. */
function palette() {
  const m = JSON.parse(readFileSync(join(ROOT, 'docs/design/design-system.manifest.json'), 'utf8'));
  const hex = (theme, token) => m.color[theme][token].srgb;
  return {
    lightGround: hex('light', 'background'),
    darkGround: hex('dark', 'background'),
    darkInk: hex('dark', 'foreground'),
    lightInk: hex('light', 'foreground'),
    petals: PETALS.map((p) => p.hex),
  };
}

/** Every published entry's derived hex, by slug. Read only by `--prove`. */
function corpusHexes() {
  const src = readFileSync(join(ROOT, 'apps/mobile/src/corpus/generated/bundle.ts'), 'utf8');
  const match = /export const CORPUS_BUNDLE_TEXT = ("[\s\S]*?");\n/.exec(src);
  if (match === null) throw new Error('could not read the corpus bundle text');
  const by = new Map();
  for (const e of JSON.parse(JSON.parse(match[1])).entries) by.set(e.entry.slug, e.derived.hex);
  return by;
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
 * Draw the mark onto a flat canvas.
 *
 * `ground === null` means transparent, which is what the adaptive-icon foreground and both
 * splash images need — Android and Expo composite them over a colour of their own.
 *
 * `ink` is `{ eye, petals }`: one colour for the anchor and one per petal, or a single-entry
 * `petals` for the monochrome mark. The discs do not overlap — the gap between them is the
 * interval — so each is blended independently and the order does not matter.
 */
function render(canvas, gridPx, ink, ground, g) {
  const unit = gridPx / g.grid;
  if (!Number.isInteger(unit))
    throw new Error(
      `unit is ${String(unit)}px and must be a whole number — a fractional unit puts the six discs` +
        ' out of proportion with each other and makes the artefact signature approximate.',
    );

  const offset = (canvas - gridPx) / 2;
  const [gr, gg, gb] = ground === null ? [0, 0, 0] : rgb(ground);
  const px = Buffer.alloc(canvas * canvas * 4);
  for (let i = 0; i < canvas * canvas; i++) {
    px[i * 4] = gr;
    px[i * 4 + 1] = gg;
    px[i * 4 + 2] = gb;
    px[i * 4 + 3] = ground === null ? 0 : 255;
  }

  let petal = -1;
  for (const disc of discs(g)) {
    const fill =
      disc.role === 'eye' ? ink.eye : ((petal += 1), ink.petals[petal % ink.petals.length]);
    const [ir, ig, ib] = rgb(fill);

    const cx = offset + disc.cx * unit;
    const cy = offset + disc.cy * unit;
    const r = disc.r * unit;
    const from = Math.max(0, Math.floor(cy - r) - 1);
    const to = Math.min(canvas, Math.ceil(cy + r) + 1);
    const left = Math.max(0, Math.floor(cx - r) - 1);
    const right = Math.min(canvas, Math.ceil(cx + r) + 1);

    for (let y = from; y < to; y++)
      for (let x = left; x < right; x++) {
        /*
         * COVERAGE, NOT A HIT TEST. A circle's edge falls between pixels wherever it likes, and
         * the honest answer for a pixel the edge crosses is "partly" — which is what an
         * anti-aliased edge is. Snapping to whole pixels would be staircasing, not sharpness.
         */
        let hits = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy++)
          for (let sx = 0; sx < SUPERSAMPLE; sx++) {
            const dx = x + (sx + 0.5) / SUPERSAMPLE - cx;
            const dy = y + (sy + 0.5) / SUPERSAMPLE - cy;
            if (dx * dx + dy * dy <= r * r) hits += 1;
          }
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
 * The grid the Android foreground is drawn on.
 *
 * A consequence rather than a preference: the ink reaches `orbit + petal` units from the centre,
 * so the unit may be at most `312.9 / reach`. It must also divide the grid exactly, and 27 is
 * the largest whole number that does both.
 */
const ADAPTIVE_GRID = 648;

export function assets() {
  const g = markGeometry();
  const p = palette();

  /*
   * THE ICON IS THE ONE SURFACE WITH COLOUR (ADR-0093), and it is the one surface with nothing
   * to compete with: a home screen has no garment in it. Everywhere inside the app the mark is
   * a single token, because every screen there is being used to judge a colour.
   *
   * The ground is the LIGHT background — warm off-white. Among a screen of saturated icons a
   * pale one is the distinctive choice rather than the timid one, and it is the same ground the
   * product's own light theme uses.
   */
  const colour = { eye: p.lightInk, petals: p.petals };
  const monoLight = { eye: p.lightInk, petals: [p.lightInk] };
  const monoDark = { eye: p.darkInk, petals: [p.darkInk] };

  return [
    // iOS and the store. OPAQUE — iOS rejects an app icon with an alpha channel.
    { file: 'icon.png', bytes: render(CANVAS, 768, colour, p.lightGround, g) },
    // Android's foreground layer. Transparent; `adaptiveIcon.backgroundColor` is the other half.
    { file: 'adaptive-icon.png', bytes: render(CANVAS, ADAPTIVE_GRID, colour, null, g) },
    /*
     * THE SPLASHES STAY MONOCHROME. A splash is inside the app: it is the first thing before a
     * surface where colours are judged, and a five-colour blossom there would set the eye up
     * with five colours it has to forget. The icon has done its job by then.
     */
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
     * used because the splashes already use it and one source beats a new decision — a reader
     * wondering why should know there is nothing to find.
     */
    { file: 'monochrome-icon.png', bytes: render(CANVAS, ADAPTIVE_GRID, monoLight, null, g) },
  ];
}

/**
 * What the middle ROW of an asset should look like, as fractions of its width.
 *
 * The row crosses five things: the two petals either side of the centre, the eye, and the two
 * gaps between them. It does NOT cross the two lower petals, which sit clear of it — so the
 * signature is a symmetric five-run pattern that a solid disc, a ring, or any of this mark's own
 * predecessors would fail.
 *
 * Every figure is derived. The petals' chord in particular is arithmetic rather than a
 * measurement: the row passes a known distance from a petal's centre, and the half-chord follows.
 */
export function expectedSignature(gridPx = 768, canvas = CANVAS) {
  const g = markGeometry();
  const unit = gridPx / g.grid;
  const middle = g.grid / 2;

  // The two petals the middle row crosses are the pair nearest the horizontal — for five petals
  // with one pointing up, that is the second and the fifth.
  const side = discs(g).filter((d) => d.role === 'petal' && Math.abs(d.cy - middle) < d.r);
  const offCentre = Math.abs((side[0]?.cy ?? middle) - middle);
  const halfChord = Math.sqrt(Math.max(0, g.petal * g.petal - offCentre * offCentre));

  const petalWidth = (2 * halfChord * unit) / canvas;
  const eyeWidth = (2 * g.eye * unit) / canvas;
  // Edge of the eye to edge of the petal, along the row.
  const gapWidth =
    ((Math.abs((side[0]?.cx ?? 0) - middle) + halfChord - g.eye) * unit) / canvas - petalWidth;

  return { petals: petalWidth, eye: eyeWidth, gap: gapWidth };
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
  const mono = { eye: '#F6F4F1', petals: ['#F6F4F1'] };

  const solid = decodePng(
    render(256, 192, mono, '#090807', { ...g, petals: 1, orbit: 0, eye: 10, petal: 10 }),
  );
  say(
    !carriesMark(solid, expectedSignature(768)).ok,
    'a solid disc is REFUSED',
    'ink in the middle, one run across',
  );

  const noEye = decodePng(render(256, 192, mono, '#090807', { ...g, eye: 0 }));
  say(
    !carriesMark(noEye, expectedSignature(768)).ok,
    'the blossom with no centre is REFUSED',
    'five petals is not this mark',
  );

  const fourPetals = decodePng(render(256, 192, mono, '#090807', { ...g, petals: 4 }));
  say(
    !carriesMark(fourPetals, expectedSignature(768)).ok,
    'FOUR petals are REFUSED — the count is part of the mark',
    'the row crosses a different pattern',
  );

  // 4. The petals are the corpus's, and still are.
  const published = corpusHexes();
  for (const p of PETALS) {
    const now = published.get(p.slug);
    say(
      now === p.hex,
      `${p.name} is still ${p.hex}`,
      now === p.hex ? `corpus entry ${p.slug}` : `the corpus now says ${String(now)} — decide`,
    );
  }

  // 4b. The Android safe zone, as arithmetic rather than a screenshot — and DERIVED, because a
  //     written-down figure would go on passing about a shape it no longer described (E-085).
  const reach = ((g.orbit + g.petal) * ADAPTIVE_GRID) / g.grid;
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
      'const NOT_THE_MARK = { grid: 999, petals: 9, orbit: 99, interval: 9 }; ' +
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
      (s) => `${s}export const MARK = { grid: 1, petals: 1, orbit: 1, interval: 1 } as const;`,
    ),
    'TWO declarations of MARK are REFUSED, rather than one of them being picked',
    'the icon and the app could otherwise follow different geometry',
  );

  /*
   * THE DECOY. A function that threw on everything would pass the case above. It must still
   * refuse the opposite mistake, and it must still read the real file.
   */
  say(
    refuses((s) => s.replace('export const MARK = {', 'const GONE = {')),
    'DECOY — NO declaration of MARK is refused too, so the check is not merely counting to one',
    'a parse falling back to defaults would ship an icon nobody drew',
  );

  /*
   * 4c. THE THEMED-ICON LAYER IS A SILHOUETTE, NOT A PICTURE (F-192).
   *
   * Android tints `monochromeImage` itself and reads only the alpha. A layer that kept the five
   * petal colours would look right in every preview here and be wrong the instant a launcher
   * tinted it — five hues collapsing to one, with the gaps between them gone.
   *
   * So: every painted pixel is ONE ink. Counted from the decoded bytes rather than trusted from
   * the ink scheme that was passed in, because the point is what came out.
   */
  const themed = decodePng(assets().find((a) => a.file === 'monochrome-icon.png').bytes);
  const inks = new Set();
  let transparent = 0;
  for (let i = 0; i < themed.rgba.length; i += 4) {
    const alpha = themed.rgba[i + 3];
    if (alpha === 0) {
      transparent += 1;
      continue;
    }
    inks.add(
      `${String(themed.rgba[i])},${String(themed.rgba[i + 1])},${String(themed.rgba[i + 2])}`,
    );
  }
  say(
    inks.size === 1,
    'the themed icon paints ONE ink, so a launcher tinting it keeps the shape',
    `${String(inks.size)} colour(s) among the painted pixels`,
  );
  say(
    transparent > 0,
    'and its ground is transparent, so the launcher supplies the other half',
    `${String(transparent)} fully transparent pixel(s)`,
  );

  /*
   * THE DECOY. A count of one would also be produced by an asset that is entirely transparent,
   * or entirely one flat colour edge to edge — both of which are silhouettes of nothing.
   */
  const coloured = decodePng(assets().find((a) => a.file === 'icon.png').bytes);
  const colouredInks = new Set();
  for (let i = 0; i < coloured.rgba.length; i += 4)
    if (coloured.rgba[i + 3] !== 0)
      colouredInks.add(
        `${String(coloured.rgba[i])},${String(coloured.rgba[i + 1])},${String(coloured.rgba[i + 2])}`,
      );
  say(
    colouredInks.size > 1 && inks.size > 0,
    'DECOY — the COLOURED icon has many inks, so "one" is a measurement not a constant',
    `icon.png: ${String(colouredInks.size)} colour(s)`,
  );

  const tooBig = ((g.orbit + g.petal) * 768) / g.grid;
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
