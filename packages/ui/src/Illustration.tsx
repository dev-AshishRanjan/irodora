/**
 * The drawings this product is drawn with — the mockups' set, and the three that predate it.
 *
 * ## Two sets, and the reason there are two
 *
 * **The mockups' set (F-229).** Every drawing F-220's inventories bind an `illustration` to: the
 * plum branch, the kimono, the leaves, the sashiko stitching, the seigaiha wave, the silk band, the
 * hanger, the viewfinder, the document. Keyed by the inventory's own names, so a surface feature
 * asks for `plum-branch` and nothing translates it, and held to the inventories in both directions
 * by a test that reads them — the shape `Glyph` uses, for the reason F-228's review made plain: a
 * name check says nothing about the drawing, so each of these was drawn against a magnified crop of
 * the element that binds it.
 *
 * **R7's three** — `swatches`, `reading`, `pairing` — are keyed by what is MISSING rather than by a
 * picture, and no mockup draws them. Eight screens render them today, so they stay until F-236
 * rebuilds those surfaces to `27`'s empty, working, refused and denied (golden rule 6).
 *
 * ## The line and the tone are measurements, not taste
 *
 * F-229 measured every bound element ([`art-measure.ps1`](../../../mockups/tools/art-measure.ps1),
 * R9-MOCKUP-FIDELITY §5) and found the art drawn two ways:
 *
 * | | ink | line |
 * |---|---|---|
 * | **backdrop** — behind a screen's content, 21 of the 33 | 0.10 – 0.18 of `foreground`, median 0.15 | 1 px at 2 px/dp |
 * | **figure** — where the drawing IS the content | 0.80 – 0.96 | 1 – 2 px |
 *
 * So `opacity.art` (0.15) and `size.artStroke` (0.5 dp) are declared once in the manifest, and the
 * line is a width ON SCREEN: each drawing carries its own grid and converts the declared dp at the
 * size it is rendered, so a 64 dp drawing and a 240 dp one carry the same line.
 *
 * ## Three rules, and the third is the one that is easy to break
 *
 * **1. Every colour is a token.** No literal, ever — so both themes and every CVD simulation
 * measure these the way they measure everything else. The conformance suite's `colour-literal`
 * rule is the guard, and it has already caught a dependency painting `#000000` (F-185).
 *
 * **It caught this file too, on its first run.** `Rect` and `Circle` here stated `fill="none"`
 * and `Line` did not, so react-native-svg injected `#000000` onto four strokes — the exact
 * hazard the paragraph above the `<Svg>` element already warned about, written by the same hand
 * in the same commit. **A rule you have just written down is not a rule you have followed**, and
 * a check that only reads the source would never have seen it: the literal is in the library.
 *
 * **2. Outline, with the fills the mockups actually draw.** R7's rule was outline-only, because a
 * filled shape at illustration scale is a large flat field of colour and this product asks people
 * to judge large flat fields of colour a few centimetres away. That reasoning survives as WHERE
 * art may go — never over a sample — rather than as a ban on a fill: `27` draws a solid hanger and
 * `18` fills the lines on its document. **Which is which is read off the image, not decided here**,
 * and the first pass got `18`'s page exactly backwards — solid with its lines knocked out, where
 * `18` draws a stroked page over a second sheet (F-229's review). Both reviews in this release
 * found the same class of error, in opposite directions.
 *
 * **3. A drawing may never carry meaning the text does not.** These are `accessibilityElements
 * Hidden` and they say nothing a screen reader needs — the message beside them is the whole
 * content. That is golden rule 13 read strictly: a picture is a channel, and a channel carrying
 * something no other channel carries is a channel somebody is excluded from.
 *
 * ## They do not move
 *
 * The report asked for *animated* art. These are still, and that is a decision rather than an
 * omission: an empty state is a thing a person reads once and leaves, and a looping animation on
 * a screen whose message is *"there is nothing here"* draws the eye to the absence repeatedly.
 * The motion in this product is on arrival — `Screen` enters, and these enter with it (F-188),
 * which is animation at the moment it means something.
 */

import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { nativeArtOpacity, nativeArtStroke } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';

/**
 * The drawings the mockups are drawn with, by the names the inventories bind.
 *
 * Twelve of the thirteen: `signature` is `18`'s envelope word *Signed*, written in a script face,
 * and whether that is a drawing at all is OQ-38 — so it is declared unbuilt below rather than
 * traced, and the registry's test expects it missing for that reason.
 */
export const DRAWN_ILLUSTRATIONS = [
  'blossom',
  'document',
  'hanger',
  'kimono',
  'leaves',
  'no-results',
  'page-fold',
  'plum-branch',
  'sashiko',
  'silk-wave',
  'viewfinder',
  'waves',
] as const;

/**
 * Bound by an inventory and deliberately not drawn, with the question that stops each.
 *
 * The registry's test reads this: a name here may be absent from the set, and a name that stops
 * being bound fails, so the list cannot outlive its reason.
 */
export const UNBUILT_ILLUSTRATIONS = {
  signature: 'OQ-38 — 18 draws the word "Signed" in a script face, which is type, not a drawing',
} as const;

/** R7's three, keyed by what is missing. No mockup draws them; F-236 rebuilds their surfaces. */
export const EMPTY_STATE_ILLUSTRATIONS = ['swatches', 'reading', 'pairing'] as const;

/**
 * The set's version — *one versioned, vector set* is what F-229 asks for, and this is the half a
 * check can hold.
 *
 * Its test digests every drawing's path data and compares the digest recorded against THIS
 * version, so a redrawn line fails until it is recorded as a change. A version nobody can fail is
 * a number in a file; this one is the set's identity.
 */
export const ILLUSTRATION_SET_VERSION = '1.1.0';

export const ILLUSTRATIONS = [...DRAWN_ILLUSTRATIONS, ...EMPTY_STATE_ILLUSTRATIONS] as const;
export type IllustrationName = (typeof ILLUSTRATIONS)[number];

/**
 * The grid R7's three are expressed on.
 *
 * One grid for those three, so they share a stroke weight and an optical size. The mockups' set
 * carries a grid per drawing, because a 96-unit strip of leaves and a 24-unit sashiko tile are not
 * one square.
 */
const GRID = 48;

/** The stroke R7's three use, in grid units — predating the measurement, and kept with them. */
const STROKE = 1.5;

/**
 * A corner radius that matches the product's samples in spirit rather than by import.
 *
 * `radius.swatchRatio` is about a rendered sample and this is a drawing of one; taking the ratio
 * and applying it here would tie an illustration to a token whose reason — how a flat colour
 * field is judged — does not apply to an outline.
 */
const SAMPLE_CORNER = 1.5;

/**
 * A rounded rectangle, as a path.
 *
 * ## Why not `<Rect>`
 *
 * `react-native-svg`'s `Rect` inherits React Native's **deprecated `x` / `y` style props**
 * in its typings, so `no-deprecated` flags the rectangle's own geometry — the props are not the
 * deprecated ones, but nothing in the type says so. A path takes a single `d` and has no such
 * collision.
 *
 * It is also the more honest shape for this file: a rounded rectangle is four lines and four
 * arcs, and stating them is stating the drawing rather than asking a library to infer it.
 */
function roundedRect(x: number, y: number, size: number, r: number): string {
  const x2 = x + size;
  const y2 = y + size;
  return [
    `M ${String(x + r)} ${String(y)}`,
    `H ${String(x2 - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x2)} ${String(y + r)}`,
    `V ${String(y2 - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x2 - r)} ${String(y2)}`,
    `H ${String(x + r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x)} ${String(y2 - r)}`,
    `V ${String(y + r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x + r)} ${String(y)}`,
    'Z',
  ].join(' ');
}

/** What a drawing is given: one ink, and the line in its own grid's units. */
interface Pen {
  readonly ink: string;
  readonly sw: number;
}
type Draw = (pen: Pen) => React.JSX.Element;

interface Drawing {
  /**
   * The grid this drawing is expressed on — width, height.
   *
   * The aspect of the ELEMENT it was drawn from, not of every element that binds the name: `leaves`
   * is drawn from `12`'s strip and is also bound by boxes from 0.03 to 0.64 (F-229's review,
   * finding 9). A surface scales the drawing; it does not restate it.
   */
  readonly box: readonly [number, number];
  /** A line fixed in grid units, for the three that predate the measured one. */
  readonly fixedStroke?: number;
  readonly draw: Draw;
}

/** Two decimals, so a generated path is the same string on every engine. */
const n = (v: number): string => String(Math.round(v * 100) / 100);

const stroked = (d: string, pen: Pen, key?: string): React.JSX.Element => (
  <Path
    key={key}
    d={d}
    stroke={pen.ink}
    strokeWidth={pen.sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

const filled = (d: string, pen: Pen, key?: string): React.JSX.Element => (
  <Path key={key} d={d} fill={pen.ink} fillRule="evenodd" />
);

const ring = (cx: number, cy: number, r: number, pen: Pen, key?: string): React.JSX.Element => (
  <Circle key={key} cx={cx} cy={cy} r={r} stroke={pen.ink} strokeWidth={pen.sw} fill="none" />
);

const polar = (cx: number, cy: number, r: number, deg: number): readonly [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/**
 * A plum blossom: ONE outline of five lobes meeting at cusps, and stamens that end in a dot.
 *
 * `01`, `06`, `08`, `25` and `27` all draw this flower, at five sizes, and they draw it as a single
 * scalloped contour — not as five overlapping circles, which is what the first draft drew and what
 * the review caught (F-229's review, finding 3). The difference is visible at any size: circles cross
 * inside the flower and leave a rosette of arcs where the mockups leave an open centre.
 */
function blossom(cx: number, cy: number, r: number, pen: Pen, key: string): React.JSX.Element {
  const cusp = r * 0.34;
  const petals: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = i * 72 - 90;
    const [x0, y0] = polar(cx, cy, cusp, a - 36);
    const [c1x, c1y] = polar(cx, cy, r * 1.22, a - 29);
    const [c2x, c2y] = polar(cx, cy, r * 1.22, a + 29);
    const [x1, y1] = polar(cx, cy, cusp, a + 36);
    if (i === 0) petals.push(`M${n(x0)} ${n(y0)}`);
    petals.push(`C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(x1)} ${n(y1)}`);
  }
  const stamens: string[] = [];
  const tips: React.JSX.Element[] = [];
  for (let i = 0; i < 14; i += 1) {
    const a = (360 / 14) * i - 90;
    const [x1, y1] = polar(cx, cy, r * 0.08, a);
    const [x2, y2] = polar(cx, cy, r * 0.46, a);
    stamens.push(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
    tips.push(
      <Circle
        key={`${key}-t${String(i)}`}
        cx={Number(n(x2))}
        cy={Number(n(y2))}
        r={Number(n(r * 0.075))}
        fill={pen.ink}
      />,
    );
  }
  return (
    <Fragment key={key}>
      {stroked(`${petals.join('')}z`, pen, `${key}-p`)}
      {stroked(stamens.join(''), pen, `${key}-s`)}
      {tips}
    </Fragment>
  );
}

/** A bud: the flower before it opens — a small round head on its calyx and stem. */
function bud(cx: number, cy: number, r: number, pen: Pen, key: string): React.JSX.Element {
  return (
    <Fragment key={key}>
      {ring(cx, cy, r, pen, `${key}-o`)}
      {stroked(`M${n(cx)} ${n(cy + r)}L${n(cx + r * 0.3)} ${n(cy + r * 2.1)}`, pen, `${key}-t`)}
    </Fragment>
  );
}

/** A leaf: an almond with a midrib, pointing `deg` away from the stem it grows on. */
function leaf(x: number, y: number, len: number, deg: number): string {
  const [tx, ty] = polar(x, y, len, deg);
  const [c1x, c1y] = polar(x, y, len * 0.55, deg - 34);
  const [c2x, c2y] = polar(x, y, len * 0.55, deg + 34);
  return (
    `M${n(x)} ${n(y)}Q${n(c1x)} ${n(c1y)} ${n(tx)} ${n(ty)}` +
    `Q${n(c2x)} ${n(c2y)} ${n(x)} ${n(y)}M${n(x)} ${n(y)}L${n(tx)} ${n(ty)}`
  );
}

/**
 * A blade: a long tapered leaf, drawn as two curves meeting at its tip.
 *
 * `bow` is how far the blade bends across its own length — the strips in `09`, `12` and `15` draw
 * blades that sweep rather than points that stick out.
 */
function blade(x: number, y: number, dx: number, dy: number, bow: number): string {
  const [tx, ty] = [x + dx, y + dy];
  const [mx, my] = [x + dx * 0.5, y + dy * 0.5];
  const [px, py] = [-dy * bow, dx * bow];
  return (
    `M${n(x)} ${n(y)}Q${n(mx + px)} ${n(my + py)} ${n(tx)} ${n(ty)}` +
    `Q${n(mx - px * 0.35)} ${n(my - py * 0.35)} ${n(x)} ${n(y)}`
  );
}

/**
 * Sashiko: a block of parallel stitches of EQUAL length, turned one way or the other.
 *
 * Drawn about the block's centre rather than corner to corner. The first draft walked an offset from
 * one edge to the other, which made the last stitch of every block a point — 16 zero-length segments
 * that `strokeLinecap="round"` then drew as dots the mockups do not have, and two stitches where
 * three were asked for (F-229's review, finding 2). `16` draws a dense weave and nothing else.
 */
function stitches(x: number, y: number, size: number, turned: boolean, count = 4): string {
  const parts: string[] = [];
  const angle = turned ? -45 : 45;
  const [ux, uy] = [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)];
  const [vx, vy] = [-uy, ux];
  const [cx, cy] = [x + size / 2, y + size / 2];
  const half = size * 0.34;
  const gap = (size * 0.82) / count;
  for (let i = 0; i < count; i += 1) {
    const off = (i - (count - 1) / 2) * gap;
    const [mx, my] = [cx + off * vx, cy + off * vy];
    parts.push(
      `M${n(mx - half * ux)} ${n(my - half * uy)}L${n(mx + half * ux)} ${n(my + half * uy)}`,
    );
  }
  return parts.join('');
}

/**
 * Seigaiha: the wave, as the fan of concentric arcs it is — quarter circles breaking from one
 * corner, which is how `25` draws it, rather than the half circles the first draft drew.
 */
function seigaiha(cx: number, cy: number, radii: readonly number[], from = 180): string {
  return radii
    .map((r) => {
      const [x1, y1] = polar(cx, cy, r, from);
      const [x2, y2] = polar(cx, cy, r, from + 90);
      return `M${n(x1)} ${n(y1)}A${n(r)} ${n(r)} 0 0 1 ${n(x2)} ${n(y2)}`;
    })
    .join('');
}

/** One line of the silk band: a sine, sampled — `14` draws eleven, out of phase with each other. */
function ripple(width: number, mid: number, amp: number, phase: number, cycles = 2): string {
  const steps = 48;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (width * i) / steps;
    const y = mid + amp * Math.sin(phase + (cycles * 2 * Math.PI * i) / steps);
    parts.push(`${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`);
  }
  return parts.join('');
}

// --- the drawings ---------------------------------------------------------------------------

const DRAWINGS: Readonly<Record<IllustrationName, Drawing>> = {
  /** `25`'s home: blossoms on fine twigs, without `01`'s heavy branch. */
  blossom: {
    box: [48, 32],
    draw: (p) => (
      <Fragment>
        {stroked('M0 27C9 24 15 18 22 9M22 20C29 23 38 22 48 17M31 9C34 5 39 3 45 2', p, 'twigs')}
        {blossom(15.5, 12.5, 5, p, 'b1')}
        {blossom(25, 18, 4, p, 'b2')}
        {blossom(34.5, 19.5, 5.6, p, 'b3')}
        {bud(6, 21, 1.8, p, 'd1')}
        {bud(42.5, 7, 1.6, p, 'd2')}
      </Fragment>
    ),
  },

  /**
   * `18`: the sheet its exports are drawn as — an OUTLINED page over a second sheet, with a turned
   * corner and filled lines.
   *
   * The first draft drew it solid with the lines cut out, and the review caught it: the five elements
   * that bind it draw a stroked page with the card's own ground showing through, and `18.report.art`
   * draws a stack (F-229's review, finding 1). The measurement said so too and was not read —
   * `strokePx` 3–4 with a fifth of the box inked is an outline, not a fill.
   */
  document: {
    box: [24, 30],
    draw: (p) => (
      <Fragment>
        {stroked('M3.5 10A2.5 2.5 0 0 1 6 7.5M3.5 10v13A2.5 2.5 0 0 0 6 25.5', p, 'behind')}
        {stroked(
          'M6 5.5A2.5 2.5 0 0 1 8.5 3h8l5 5v18.5a2.5 2.5 0 0 1-2.5 2.5H8.5A2.5 2.5 0 0 1 6 26.5z',
          p,
          'page',
        )}
        {stroked('M16.5 3v2.5A2.5 2.5 0 0 0 19 8h2.5', p, 'fold')}
        {filled(
          [
            'M9.5 13.5h8a1 1 0 0 1 0 2h-8a1 1 0 0 1 0-2z',
            'M9.5 17.5h8a1 1 0 0 1 0 2h-8a1 1 0 0 1 0-2z',
            'M9.5 21.5h5a1 1 0 0 1 0 2h-5a1 1 0 0 1 0-2z',
          ].join(' '),
          p,
          'lines',
        )}
      </Fragment>
    ),
  },

  /**
   * `27`'s empty wardrobe: a hanger with a sprig of blossom growing across it.
   *
   * Solid, because `27` draws it solid. **Its tan is NOT available here**: `C10` declares the
   * tint, and `color` below takes only the two quiet foregrounds, so no surface can pass one yet —
   * the gap is recorded against F-236, which builds `27`'s states (F-229's review, finding 7).
   */
  hanger: {
    box: [48, 34],
    draw: (p) => (
      <Fragment>
        {stroked('M24 14V10a2.2 2.2 0 1 0-2.2-2.2', p, 'hook')}
        {filled(
          [
            // The shoulders CURVE down from the hook, the way a wooden hanger is cut — the first
            // draft drew a flat triangle (F-229's review, finding 6).
            'M24 13.6c2.2 0 15.6 10.6 20.4 14.4l-1.2 1.6C38.2 25.6 26 15.8 24 15.8S9.8 25.6 4.8 29.6l-1.2-1.6C8.4 24.2 21.8 13.6 24 13.6z',
            // The bar across the bottom, rounded at its ends.
            'M5 28.2h38a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2z',
          ].join(' '),
          p,
          'body',
        )}
        {/* Two sprigs, as 27 draws them: one over the shoulder, one crossing the bar. */}
        {stroked('M36 28c3.6-2.2 6-6 7.2-11.4.7-3 1.6-5.2 2.8-6.6', p, 'sprig-a')}
        {stroked('M9.5 31c2.6-1.6 4.4-3.6 5.4-6 .8-2 1.8-3.4 3-4.4', p, 'sprig-b')}
        {blossom(41.4, 10.6, 3, p, 'f1')}
        {blossom(38.4, 19.4, 2.6, p, 'f2')}
        {blossom(17.6, 21.4, 3, p, 'f3')}
        {bud(13.2, 27.6, 1.5, p, 'd1')}
        {stroked(leaf(43.4, 14.2, 3.2, -38), p, 'l1')}
        {stroked(leaf(13.8, 25, 3, 148), p, 'l2')}
      </Fragment>
    ),
  },

  /** `00`, `03`, `11`, `13`, `16`: a kimono laid flat on its rail, sleeves hanging. */
  kimono: {
    box: [48, 44],
    draw: (p) => (
      <Fragment>
        {stroked('M3.5 8 6 6h36l2.5 2M23 6a1.6 1.6 0 0 1 2 0', p, 'rail')}
        {/* The body FLARES to a curved hem, which is what 00 draws; the first draft was a
            near-rectangle with a straight one (F-229's review, finding 4). */}
        {stroked('M13.5 7.5h21l4.5 31.5q-15 2-30 0z', p, 'body')}
        {stroked('M13.5 7.5H4v17.5h9.7M34.5 7.5H44V25h-9.7', p, 'sleeves')}
        {/* A narrow collar band down the centre, not a wide V. */}
        {stroked('M21.4 7.5 23 19.5M26.6 7.5 25 19.5M23 19.5h2', p, 'collar')}
        {stroked(
          'M17 8.6 15.4 39M20.3 8 19.6 39.6M27.7 8l.7 31.6M31 8.6 32.6 39M24 20v19.8',
          p,
          'folds',
        )}
      </Fragment>
    ),
  },

  /** `09`, `10`, `12`, `15`: a spray of leaves on one stem — the strips down a screen's edge. */
  leaves: {
    box: [24, 96],
    draw: (p) => (
      <Fragment>
        {stroked('M11 96C9 74 13 54 11 34 10 20 12 9 14 1', p, 'stem')}
        {/* LONG blades that run off the strip, which is how 09, 12 and 15 draw them — the first
            draft drew six small almonds sized to fit the grid (F-229's review, finding 5). */}
        {stroked(blade(11.6, 76, 18, -30, 0.3), p, 'a')}
        {stroked(blade(11.8, 63, -14, -24, 0.28), p, 'b')}
        {stroked(blade(11.4, 51, 19, -26, 0.3), p, 'c')}
        {stroked(blade(11, 39, -15, -22, 0.28), p, 'd')}
        {stroked(blade(11.4, 27, 17, -24, 0.3), p, 'e')}
        {stroked(blade(12.4, 15, -13, -19, 0.26), p, 'f')}
        {stroked(blade(13.2, 7, 14, -16, 0.26), p, 'g')}
      </Fragment>
    ),
  },

  /** `00`'s empty state: the picture that is not there — a sun, two peaks and the ground. */
  'no-results': {
    box: [32, 24],
    draw: (p) => (
      <Fragment>
        {ring(9, 6, 3.4, p, 'sun')}
        {/* The peaks CROSS, which is the placeholder figure 00 draws; the first draft had them
            meeting at a valley (F-229's review, finding 19). */}
        {stroked('M2.5 18.5 9 11l5.5 6.5M8 18.5 16 9.5l7.5 9', p, 'peaks')}
        {stroked('M3 21.5h26', p, 'ground')}
      </Fragment>
    ),
  },

  /**
   * `18`'s report: the turned corner of a sheet, on its own.
   *
   * The flap is an OUTLINE and not a fill: `18` draws it as a corner lifting off the card, a shade
   * away from the card's own colour, and a solid triangle in ink is a slab rather than a fold.
   */
  'page-fold': {
    box: [24, 16],
    draw: (p) => (
      <Fragment>
        {/* ONE path: its `z` IS the fold line, and the first draft drew that line twice, so it
            carried a double stroke (F-229's review, finding 15). 18's corner takes the card's own
            radius rather than a hairline one. */}
        {stroked('M3 1h17.5a2.5 2.5 0 0 1 2.5 2.5V15z', p, 'flap')}
      </Fragment>
    ),
  },

  /** `01`, `06`, `08`: the plum branch — open flowers, buds and the twigs between them. */
  'plum-branch': {
    box: [60, 52],
    draw: (p) => (
      <Fragment>
        {stroked(
          'M1 50C13 46 20 37 26 27 31 19 41 10 59 4M2.6 52C14 48 22 39 28 29 33 21 43 12 59.6 6',
          p,
          'branch',
        )}
        {stroked('M26 27c4 6 10 9 18 10M33 18c-3-6-7-10-13-13M44 15c4-3 9-5 15-6', p, 'twigs')}
        {blossom(18.5, 16.5, 5.2, p, 'b1')}
        {blossom(29.5, 24, 4.4, p, 'b2')}
        {blossom(41, 28.5, 6, p, 'b3')}
        {blossom(49.5, 11.5, 4.6, p, 'b4')}
        {bud(9.5, 30.5, 1.9, p, 'd1')}
        {bud(24, 8.5, 1.7, p, 'd2')}
        {bud(35.5, 15.5, 1.6, p, 'd3')}
        {bud(47.5, 40, 1.8, p, 'd4')}
        {bud(56.5, 24.5, 1.6, p, 'd5')}
      </Fragment>
    ),
  },

  /** `16`: sashiko stitching — blocks of short parallel stitches, turned block by block. */
  sashiko: {
    box: [24, 24],
    draw: (p) => (
      <Fragment>
        {stroked(
          Array.from({ length: 36 }, (_, i) => {
            const [col, row] = [i % 6, Math.floor(i / 6)];
            return stitches(col * 4, row * 4, 4, (col + row) % 2 === 0, 3);
          }).join(''),
          p,
          'stitches',
        )}
      </Fragment>
    ),
  },

  /** `14`'s splash: a band of silk, drawn as one wave out of phase with itself eleven times. */
  'silk-wave': {
    box: [96, 24],
    draw: (p) => (
      <Fragment>
        {/* TWO trains that cross, sixteen lines, and every one inside the box — the first draft
            drew eleven and let the top one reach y = -0.5 (F-229's review, finding 21). */}
        {stroked(
          [
            ...Array.from({ length: 9 }, (_, i) =>
              ripple(96, 6 + i * 1.4, 4.4 - i * 0.22, i * 0.4),
            ),
            ...Array.from({ length: 7 }, (_, i) =>
              ripple(96, 9 + i * 1.5, 3.6 - i * 0.2, Math.PI + i * 0.5, 3),
            ),
          ].join(''),
          p,
          'ripples',
        )}
      </Fragment>
    ),
  },

  /** `00`: the Lens's own viewfinder — brackets, ticks, and the lens inside them. */
  viewfinder: {
    box: [32, 32],
    draw: (p) => (
      <Fragment>
        {stroked(
          // SQUARE corners, as 00 draws them (F-229's review, finding 18).
          'M2 9V2h7M23 2h7v7M30 23v7h-7M9 30H2v-7',
          p,
          'brackets',
        )}
        {stroked('M16 1v4M31 16h-4M16 31v-4M1 16h4', p, 'ticks')}
        {ring(16, 16, 8.6, p, 'outer')}
        {ring(16, 16, 6.4, p, 'inner')}
        {stroked('M12.4 13.2a4.6 4.6 0 0 1 3.4-2.6', p, 'highlight')}
      </Fragment>
    ),
  },

  /** `25`: seigaiha, the wave pattern, as the tile it is drawn as. */
  waves: {
    box: [24, 24],
    draw: (p) => (
      <Fragment>
        {/* Ten arcs, and none past the box: the first draft drew six and let the outer one leave
            the viewBox at both ends (F-229's review, finding 20). */}
        {stroked(
          seigaiha(
            24,
            24,
            Array.from({ length: 10 }, (_, i) => +(2.4 * (i + 1)).toFixed(2)),
          ),
          p,
          'fan',
        )}
      </Fragment>
    ),
  },

  /**
   * Nothing collected: four sample outlines in a grid, one of them absent.
   *
   * The gap is the subject. Four full outlines would read as "here are four things"; three and a
   * space reads as "there is room for another", which is what an empty wardrobe actually is.
   */
  swatches: {
    box: [GRID, GRID],
    fixedStroke: STROKE,
    draw: (p) => (
      <Fragment>
        {[
          [8, 8],
          [26, 8],
          [8, 26],
        ].map(([x, y]) => (
          <Path
            key={`${String(x)}-${String(y)}`}
            d={roundedRect(x ?? 0, y ?? 0, 14, SAMPLE_CORNER)}
            stroke={p.ink}
            strokeWidth={p.sw}
            fill="none"
          />
        ))}
        {/* The absence, drawn as a dashed outline rather than left blank: a blank corner is a
            drawing that looks unfinished, and this one is finished and saying something. */}
        <Path
          d={roundedRect(26, 26, 14, SAMPLE_CORNER)}
          stroke={p.ink}
          strokeWidth={p.sw}
          strokeDasharray="3 3"
          fill="none"
        />
      </Fragment>
    ),
  },

  /**
   * Nothing measured: the Lens's own reticle, with nothing in it.
   *
   * Four corner brackets and a centre point — the shape the viewfinder already draws, so a
   * person who has used the Lens recognises what this screen is waiting for.
   */
  reading: {
    box: [GRID, GRID],
    fixedStroke: STROKE,
    draw: (p) => (
      <Fragment>
        {[
          [10, 10, 10, 18, 18, 10],
          [38, 10, 38, 18, 30, 10],
          [10, 38, 10, 30, 18, 38],
          [38, 38, 38, 30, 30, 38],
        ].map(([cx, cy, vx, vy, hx, hy]) => (
          <Fragment key={`${String(cx)}-${String(cy)}`}>
            <Line x1={cx} y1={cy} x2={vx} y2={vy} stroke={p.ink} strokeWidth={p.sw} fill="none" />
            <Line x1={cx} y1={cy} x2={hx} y2={hy} stroke={p.ink} strokeWidth={p.sw} fill="none" />
          </Fragment>
        ))}
        <Circle cx={24} cy={24} r={2.5} stroke={p.ink} strokeWidth={p.sw} fill="none" />
      </Fragment>
    ),
  },

  /**
   * Nothing put together: two sample outlines that do not meet.
   *
   * The gap between them is the point, and it is the same gap `Pair` closes when there IS a
   * pairing — F-151 established that this product answers *how do these two go together* at the
   * boundary, so an absent pairing is drawn as a boundary that is not there.
   */
  pairing: {
    box: [GRID, GRID],
    fixedStroke: STROKE,
    draw: (p) => (
      <Fragment>
        <Path
          d={roundedRect(6, 17, 14, SAMPLE_CORNER)}
          stroke={p.ink}
          strokeWidth={p.sw}
          fill="none"
        />
        <Path
          d={roundedRect(28, 17, 14, SAMPLE_CORNER)}
          stroke={p.ink}
          strokeWidth={p.sw}
          strokeDasharray="3 3"
          fill="none"
        />
        {/* The join that is missing, dashed across the gap. */}
        <Line
          x1={20}
          y1={24}
          x2={28}
          y2={24}
          stroke={p.ink}
          strokeWidth={p.sw}
          strokeDasharray="2 3"
          fill="none"
        />
      </Fragment>
    ),
  },
};

/** The grid a drawing is expressed on, for a caller that needs its height before it renders. */
export const illustrationBox = (name: IllustrationName): readonly [number, number] =>
  DRAWINGS[name].box;

export interface IllustrationProps {
  readonly name: IllustrationName;
  /** Rendered WIDTH in dp. The height follows the drawing's own aspect — see {@link illustrationBox}. */
  readonly width?: number;
  /**
   * The token the drawing takes.
   *
   * Constrained to the quiet foregrounds. An illustration in `foreground` at full strength would
   * be as loud as the sentence beside it, and the sentence is the content — rule 3. `foreground`
   * is allowed only as a `backdrop`, which is how the mockups draw it: the same ink at 0.15.
   */
  readonly color?: Extract<keyof ThemeColors, 'foreground.2' | 'foreground.3'>;
  /**
   * How strongly it is inked (F-229's measurement).
   *
   * `figure` — the drawing is the content, at full strength. `backdrop` — it sits behind the
   * content at the declared `opacity.art`, which is what 21 of the 33 drawn elements do.
   */
  readonly tone?: 'figure' | 'backdrop';
  readonly testID?: string;
}

export function Illustration({
  name,
  width = 64,
  color = 'foreground.3',
  tone = 'figure',
  testID,
}: IllustrationProps): React.JSX.Element {
  const { colors } = useTheme();
  const { box, fixedStroke, draw } = DRAWINGS[name];
  const [boxWidth, boxHeight] = box;
  const height = (width * boxHeight) / boxWidth;
  /*
   * THE LINE IS A WIDTH ON SCREEN, so it is converted into this drawing's units at the size being
   * rendered — the same arithmetic `Glyph` does for an icon. Without it a strip drawn on a 96-unit
   * grid and a tile drawn on a 24-unit one would carry lines four times apart.
   */
  const pen: Pen = { ink: colors[color], sw: fixedStroke ?? (nativeArtStroke * boxWidth) / width };

  return (
    <View
      testID={testID}
      /*
       * DECORATIVE, ALWAYS. Rule 3: a drawing may never carry meaning the text does not, so
       * there is nothing here for a screen reader to be told. Hidden rather than merely
       * unlabelled, for the reason `Mark` gives — an unlabelled View is skipped by VoiceOver and
       * announced as an unnamed element by some TalkBack versions.
       */
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      {/*
        `fill="none"` ON THE ROOT. react-native-svg injects `fill: #000000` onto the root group
        when none is given — a colour no token declared, which E-081 found the hard way and
        F-185 found again inside a dependency. Every shape states its own.
      */}
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${String(boxWidth)} ${String(boxHeight)}`}
        fill="none"
        opacity={tone === 'backdrop' ? nativeArtOpacity : 1}
        accessible={false}
      >
        {draw(pen)}
      </Svg>
    </View>
  );
}
