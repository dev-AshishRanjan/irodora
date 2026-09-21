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
 * `18` a solid turned corner, and F-228's review is the warning against a house style the images
 * do not have.
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
  /** The grid this drawing is expressed on — width, height. Its aspect is the mockup's. */
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
 * A plum blossom: five rounded petals around a centre, with its stamens.
 *
 * `01`, `06`, `08`, `25` and `27` all draw this flower, at five sizes. Generated once and placed,
 * rather than drawn five times with five sets of numbers that would drift apart.
 */
function blossom(cx: number, cy: number, r: number, pen: Pen, key: string): React.JSX.Element {
  const stamens: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const [x1, y1] = polar(cx, cy, r * 0.12, i * 30 - 90);
    const [x2, y2] = polar(cx, cy, r * 0.4, i * 30 - 90);
    stamens.push(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
  }
  return (
    <Fragment key={key}>
      {[0, 1, 2, 3, 4].map((i) => {
        const [px, py] = polar(cx, cy, r * 0.56, i * 72 - 90);
        return ring(Number(n(px)), Number(n(py)), Number(n(r * 0.46)), pen, `${key}-p${String(i)}`);
      })}
      {stroked(stamens.join(''), pen, `${key}-s`)}
    </Fragment>
  );
}

/** A bud: the same flower before it opens — a small circle on a short stem. */
function bud(cx: number, cy: number, r: number, pen: Pen, key: string): React.JSX.Element {
  return (
    <Fragment key={key}>
      {ring(cx, cy, r, pen, `${key}-o`)}
      {stroked(`M${n(cx)} ${n(cy + r)}L${n(cx)} ${n(cy + r * 2.2)}`, pen, `${key}-t`)}
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
 * Sashiko: a block of short parallel stitches, turned one way or the other.
 *
 * Inset inside its block, because a stitch that reaches the block's corners joins the next block's
 * and the weave reads as one long diagonal — which is what the first draft drew.
 */
function stitches(x: number, y: number, size: number, turned: boolean, count = 3): string {
  const parts: string[] = [];
  const m = size * 0.16;
  const step = (size - 2 * m) / (count - 1);
  for (let i = 0; i < count; i += 1) {
    const o = m + step * i;
    parts.push(
      turned
        ? `M${n(x + o)} ${n(y + m)}L${n(x + size - m)} ${n(y + size - o)}`
        : `M${n(x + m)} ${n(y + o)}L${n(x + size - o)} ${n(y + size - m)}`,
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
        {blossom(16, 13, 7, p, 'b1')}
        {blossom(34, 19, 8, p, 'b2')}
        {bud(6, 21, 2.3, p, 'd1')}
        {bud(43, 7, 2.1, p, 'd2')}
      </Fragment>
    ),
  },

  /**
   * `18`: the sheet its exports are drawn as — SOLID, with its turned corner and its lines cut
   * out of it, which is how `18` draws the watermark behind each export card.
   */
  document: {
    box: [24, 30],
    draw: (p) => (
      <Fragment>
        {filled(
          [
            'M3 4a3 3 0 0 1 3-3h8l7 7v19a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z',
            'M14 1.4 20.6 8H17a3 3 0 0 1-3-3z',
            'M7 15h10a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2z',
            'M7 19h10a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2z',
            'M7 23h6a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2z',
          ].join(' '),
          p,
        )}
      </Fragment>
    ),
  },

  /**
   * `27`'s empty wardrobe: a hanger with a sprig of blossom growing across it.
   *
   * Solid, because `27` draws it solid — and in tan, which `C10` declares. The tint is the
   * surface's; this is the shape.
   */
  hanger: {
    box: [48, 34],
    draw: (p) => (
      <Fragment>
        {stroked('M24 14V8.4a2.6 2.6 0 1 0-2.6-2.6', p, 'hook')}
        {filled(
          [
            // The shoulders: a slim sloped bar from the hook down to each end.
            'M24 13.6 44.8 28.2l-1.1 1.6L24 16.3 4.3 29.8l-1.1-1.6z',
            // The bar across the bottom, thinner than the shoulders and rounded at its ends.
            'M4.6 28.4h38.8a1 1 0 0 1 0 2H4.6a1 1 0 0 1 0-2z',
          ].join(' '),
          p,
          'body',
        )}
        {stroked('M28 31c5-1.6 8.6-5.6 10.6-11.2 1.3-3.6 2.8-6 4.4-7.4', p, 'sprig')}
        {blossom(33.5, 22.5, 3.8, p, 'f1')}
        {blossom(41, 9.5, 3.2, p, 'f2')}
        {stroked(leaf(38.6, 14.6, 3.6, -42), p, 'l1')}
        {stroked(leaf(30.4, 27.4, 3.2, 26), p, 'l2')}
      </Fragment>
    ),
  },

  /** `00`, `03`, `11`, `13`, `16`: a kimono laid flat on its rail, sleeves hanging. */
  kimono: {
    box: [48, 44],
    draw: (p) => (
      <Fragment>
        {stroked('M6 6h36M22 6a2 2 0 0 1 4 0', p, 'rail')}
        {stroked('M14 7h20l3 33H11z', p, 'body')}
        {stroked('M14 7H4v16a2 2 0 0 0 2 2h8M34 7h10v16a2 2 0 0 1-2 2h-8', p, 'sleeves')}
        {stroked('M20 7l4 13 4-13', p, 'collar')}
        {stroked('M18 20v20M24 20v20M30 20v20', p, 'folds')}
      </Fragment>
    ),
  },

  /** `09`, `10`, `12`, `15`: a spray of leaves on one stem — the strips down a screen's edge. */
  leaves: {
    box: [24, 96],
    draw: (p) => (
      <Fragment>
        {stroked('M13 96C10 76 15 60 12 40 9 24 12 12 15 2', p, 'stem')}
        {stroked(leaf(12.6, 78, 13, -32), p, 'a')}
        {stroked(leaf(13.4, 64, 12, 26), p, 'b')}
        {stroked(leaf(12.2, 50, 13, -28), p, 'c')}
        {stroked(leaf(11.4, 36, 11, 32), p, 'd')}
        {stroked(leaf(12.4, 22, 12, -34), p, 'e')}
        {stroked(leaf(14, 10, 9, 28), p, 'f')}
      </Fragment>
    ),
  },

  /** `00`'s empty state: the picture that is not there — a sun, two peaks and the ground. */
  'no-results': {
    box: [32, 24],
    draw: (p) => (
      <Fragment>
        {ring(9, 6, 3.4, p, 'sun')}
        {stroked('M3 18l8-8 6 6 5-5 7 7', p, 'peaks')}
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
        {stroked('M3 1h19.5a0.5 0.5 0 0 1 0.5 0.5V15z', p, 'flap')}
        {stroked('M3 1 23 15', p, 'fold')}
      </Fragment>
    ),
  },

  /** `01`, `06`, `08`: the plum branch — open flowers, buds and the twigs between them. */
  'plum-branch': {
    box: [60, 52],
    draw: (p) => (
      <Fragment>
        {stroked('M1 50C13 46 20 37 26 27 31 19 41 10 59 4', p, 'branch')}
        {stroked('M26 27c4 6 10 9 18 10M33 18c-3-6-7-10-13-13M44 15c4-3 9-5 15-6', p, 'twigs')}
        {blossom(19, 17, 7, p, 'b1')}
        {blossom(41, 28, 8.5, p, 'b2')}
        {blossom(51, 12, 6, p, 'b3')}
        {bud(9, 30, 2.6, p, 'd1')}
        {bud(30, 7, 2.4, p, 'd2')}
        {bud(47, 41, 2.4, p, 'd3')}
        {bud(57, 25, 2.2, p, 'd4')}
      </Fragment>
    ),
  },

  /** `16`: sashiko stitching — blocks of short parallel stitches, turned block by block. */
  sashiko: {
    box: [24, 24],
    draw: (p) => (
      <Fragment>
        {stroked(
          Array.from({ length: 16 }, (_, i) => {
            const [col, row] = [i % 4, Math.floor(i / 4)];
            return stitches(col * 6, row * 6, 6, (col + row) % 2 === 0);
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
        {stroked(
          Array.from({ length: 11 }, (_, i) =>
            ripple(96, 4 + i * 1.6, 4.5 - i * 0.18, i * 0.42),
          ).join(''),
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
          'M2 9V4a2 2 0 0 1 2-2h5M23 2h5a2 2 0 0 1 2 2v5M30 23v5a2 2 0 0 1-2 2h-5M9 30H4a2 2 0 0 1-2-2v-5',
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
      <Fragment>{stroked(seigaiha(24, 24, [4.5, 9, 13.5, 18, 22.5, 27]), p, 'fan')}</Fragment>
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
