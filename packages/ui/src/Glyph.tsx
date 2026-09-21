/**
 * The icon set (F-228): every glyph a mockup draws, once, at the weight F-220 measured.
 *
 * ## One name, one shape, and the names are the inventories'
 *
 * The keys are the `icon` names F-220's inventories bind (`mockups/inventory/NN.json`), so a
 * surface feature writes the name its inventory records and nothing translates it. Where the
 * mockups draw one name several ways, the contract decides which drawing this is (§3 P1 and P5,
 * §6 C1) and the plan records each case: the tab glyphs are `01`'s, a superseded tab bar never sets
 * a shape, and an element whose screen governs it is bound to the glyph it actually shows — which
 * is why `07`'s swap buttons are bound to `refresh`.
 *
 * `ui.glyphs.test.tsx` reads the inventories and holds this registry to them in BOTH directions:
 * every name an inventory binds has a glyph here, and every glyph here is bound somewhere. A glyph
 * no mockup draws would be a design nobody made.
 *
 * ## The weight is a width on the screen, not in the glyph
 *
 * F-220 measured the line at about 1.65 dp on `01`'s tab icons, and the manifest declares it once
 * (`size.iconStroke`). A glyph is drawn on a 24-unit grid and rendered at many sizes, so a fixed
 * stroke in grid units would make a 16 dp icon thin and a 28 dp icon heavy. {@link glyphStroke}
 * converts the declared width into grid units at the size being drawn, and every line here uses
 * it — so the line is the same on every icon at every size, which is what "drawn at the mockups'
 * weight" means.
 *
 * ## Outline or solid, as drawn — in one ink
 *
 * A glyph is outline where its governing element is drawn in outline and solid where it is drawn
 * solid: `00`'s pencil, `02` and `03`'s sun, `13`'s eye, figure and scales are solid, and so they
 * are here. The first draft made every glyph an outline, which was a style of its own and not the
 * mockups' (the F-228 review). Where one name was drawn two ways by screens that each govern their
 * own element, the element was given a name of its own — `seal-check`, `close-circle`, `lock-solid`
 * and the rest — so a name still means one shape.
 *
 * Every glyph is drawn in the one colour its caller resolves from a theme token. Tinting a glyph is
 * a surface's decision under §6 C10, and the tinted icons C10 does not list are OQ-37 — including
 * the two whose shape in one ink cannot be read off the image at all (`13`'s harmony circles and
 * `15`'s split badge), which are drawn here as the nearest ink form and block their surfaces until
 * the question is answered. What a glyph guarantees is SILHOUETTE (NFR-9): each differs in shape
 * from its neighbours, so it reads with no colour, at 16 dp, under any deficiency.
 *
 * ## Filled, where a mockup draws the active state filled
 *
 * `01` draws its active tab filled (home), `02` its active lens, `02`, `15` and `18` their active
 * profile, `09` its active compass. Those four take `filled`; the others have no filled drawing to
 * follow, and asking for one draws the outline. Only `home`'s comes from the governing tab bar —
 * the other three are drawn only in tab bars C1 supersedes, so whether `01`'s bar uses them is
 * F-234's question, recorded there. `camera` is drawn filled wherever it appears (`00`).
 *
 * ## The paths are ours
 *
 * NavIcon's reasoning holds: no vendored artwork, one family, one source. Each glyph was drawn after
 * a magnified crop of the element that binds it, and the numbers below are grid coordinates, not a
 * library's.
 */

import Svg, { Circle, Path } from 'react-native-svg';
import { nativeIconStroke } from '@irodora/design-tokens';

/** The grid every glyph is drawn on — the brand mark's own 24. */
const GRID = 24;

/** Every name the inventories bind, sorted. The registry below must cover exactly these. */
export const GLYPH_NAMES = [
  'arrow-right',
  'atlas',
  'back',
  'bag',
  'bell',
  'bookmark',
  'bulb',
  'camera',
  'camera-locked',
  'check',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'close',
  'close-circle',
  'colour-wheel',
  'compass',
  'contrast',
  'document',
  'download',
  'edit',
  'export',
  'external',
  'file-code',
  'file-export',
  'file-table',
  'file-text',
  'filter',
  'filter-lines',
  'glare',
  'grid',
  'help',
  'history',
  'home',
  'hue-ring',
  'image',
  'image-solid',
  'lens',
  'list',
  'lock',
  'lock-solid',
  'map',
  'more',
  'palette',
  'palette-solid',
  'plus',
  'profile',
  'refresh',
  'reticle',
  'score',
  'score-balance',
  'score-contrast',
  'score-cvd',
  'score-fit',
  'score-harmony',
  'seal-check',
  'seal-star',
  'search',
  'settings',
  'share',
  'shield',
  'sparkle',
  'sun',
  'swap',
  'wardrobe',
] as const;

export type GlyphName = (typeof GLYPH_NAMES)[number];

/** The glyphs a mockup draws FILLED in their active state. Asking any other for `filled` is a no-op. */
export const FILLABLE_GLYPHS = [
  'home',
  'lens',
  'profile',
  'compass',
] as const satisfies readonly GlyphName[];

/**
 * The declared line width, in grid units, for a glyph drawn `size` dp wide.
 *
 * Exported because it is the one piece of arithmetic that decides whether the set is drawn at the
 * mockups' weight, and a helper that can only be exercised through a render is one nobody tests.
 */
export function glyphStroke(size: number): number {
  return (nativeIconStroke * GRID) / size;
}

// --- drawing helpers ------------------------------------------------------------------------

/** Two decimals, so every path is byte-stable across engines (NFR-3's spirit, applied to art). */
const n = (v: number): string => String(Math.round(v * 100) / 100);

interface Pen {
  readonly ink: string;
  readonly sw: number;
  readonly filled: boolean;
}

type Draw = (pen: Pen) => React.JSX.Element;

/** A stroked path. Round caps and joins: the register this product chose is soft. */
function line(d: string, pen: Pen, key?: string): React.JSX.Element {
  return (
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
}

/** A filled path. `evenodd` so a compound path can leave holes — a door, a lens. */
function solid(d: string, pen: Pen, key?: string): React.JSX.Element {
  return <Path key={key} d={d} fill={pen.ink} fillRule="evenodd" />;
}

function ring(cx: number, cy: number, r: number, pen: Pen, key?: string): React.JSX.Element {
  return (
    <Circle key={key} cx={cx} cy={cy} r={r} stroke={pen.ink} strokeWidth={pen.sw} fill="none" />
  );
}

function dot(cx: number, cy: number, r: number, pen: Pen, key?: string): React.JSX.Element {
  return <Circle key={key} cx={cx} cy={cy} r={r} fill={pen.ink} />;
}

/**
 * A rounded rectangle as a path — `<Rect x y>` is deprecated in react-native-svg 15, and a path is
 * what every other glyph here is, so the family is one primitive as well as one drawing.
 */
function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const [ix, iy] = [w - 2 * r, h - 2 * r];
  return [
    `M${n(x + r)} ${n(y)}`,
    `h${n(ix)}`,
    `a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}`,
    `v${n(iy)}`,
    `a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}`,
    `h${n(-ix)}`,
    `a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}`,
    `v${n(-iy)}`,
    `a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}`,
    'z',
  ].join(' ');
}

/** A circle as a path, so it can be one contour of a compound `evenodd` shape. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0z`;
}

const polar = (cx: number, cy: number, r: number, degrees: number): readonly [number, number] => {
  const a = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** Short radial strokes — the rays of a sun. */
function rays(count: number, from: number, to: number, offset = 0): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const deg = offset + (360 / count) * i;
    const [x1, y1] = polar(12, 12, from, deg);
    const [x2, y2] = polar(12, 12, to, deg);
    parts.push(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
  }
  return parts.join('');
}

/**
 * A polygon from local coordinates: `t` along an axis at `degrees`, `s` across it, from `origin`.
 * The pencil and the knocked-out cross are drawn square to their own axis and turned here.
 */
function turned(
  origin: readonly [number, number],
  degrees: number,
  points: readonly (readonly [number, number])[],
): string {
  const a = (degrees * Math.PI) / 180;
  const [ux, uy, vx, vy] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
  const at = ([t, w]: readonly [number, number]): string =>
    `${n(origin[0] + t * ux + w * vx)} ${n(origin[1] + t * uy + w * vy)}`;
  return `M${points.map(at).join('L')}z`;
}

/** A four-pointed star with concave sides — `13`'s sparkles and the mark in `04`'s seal. */
function star4(cx: number, cy: number, r: number): string {
  const c = r * 0.16;
  return (
    `M${n(cx)} ${n(cy - r)}` +
    `Q${n(cx + c)} ${n(cy - c)} ${n(cx + r)} ${n(cy)}` +
    `Q${n(cx + c)} ${n(cy + c)} ${n(cx)} ${n(cy + r)}` +
    `Q${n(cx - c)} ${n(cy + c)} ${n(cx - r)} ${n(cy)}` +
    `Q${n(cx - c)} ${n(cy - c)} ${n(cx)} ${n(cy - r)}z`
  );
}

/** `00`'s pencil, solid: a pointed body and, past a gap, its rounded cap. Tip at lower left. */
const PENCIL = (() => {
  const h = 2.3;
  const body = turned([4.4, 19.6], -45, [
    [0, 0],
    [4, -h],
    [14.4, -h],
    [14.4, h],
    [4, h],
  ]);
  const cap = turned([4.4, 19.6], -45, [
    [15.8, -h],
    [18.2, -h],
    [19.6, -h * 0.55],
    [19.6, h * 0.55],
    [18.2, h],
    [15.8, h],
  ]);
  return `${body} ${cap}`;
})();

/** An X as a closed shape, so it can be cut out of a disc (`09`'s clear button). */
const CROSS_HOLE = (() => {
  const [w, e] = [0.95, 4.6];
  return turned([12, 12], 45, [
    [-w, -e],
    [w, -e],
    [w, -w],
    [e, -w],
    [e, w],
    [w, w],
    [w, e],
    [-w, e],
    [-w, w],
    [-e, w],
    [-e, -w],
    [-w, -w],
  ]);
})();

/** A check as a closed shape, so it can be cut out of `06`'s seal. */
const CHECK_HOLE = 'M7.4 12.4l1.35-1.35 2.15 2.15 4.35-4.35 1.35 1.35-5.7 5.7z';

/**
 * A scalloped seal: twelve smooth bumps, each a quadratic curve whose control point sits outside the
 * ring. Computed once, at load. The first draft joined twenty-four points with straight segments,
 * and beside `04`'s seal it read as a sawtooth.
 */
const SEAL = (() => {
  const [count, inner, outer] = [12, 8.2, 10.4];
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a0 = (360 / count) * i - 90;
    const [x0, y0] = polar(12, 12, inner, a0);
    const [cx, cy] = polar(12, 12, outer, a0 + 180 / count);
    const [x1, y1] = polar(12, 12, inner, a0 + 360 / count);
    if (i === 0) parts.push(`M${n(x0)} ${n(y0)}`);
    parts.push(`Q${n(cx)} ${n(cy)} ${n(x1)} ${n(y1)}`);
  }
  return `${parts.join('')}z`;
})();

/** A camera body with its viewfinder bump — `01`'s lens and `00`'s camera share it. */
const CAMERA_BODY =
  'M3 8.6a2 2 0 0 1 2-2h2.6l1.5-2.1a1.6 1.6 0 0 1 1.3-.7h3.2a1.6 1.6 0 0 1 1.3.7l1.5 2.1H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';

/** The camera drawn solid: body, the lens cut out as a ring, its centre filled back in. */
const CAMERA_SOLID = `${CAMERA_BODY} ${circlePath(12, 13.2, 4.2)} ${circlePath(12, 13.2, 2.1)}`;

/** A page with its top-right corner folded — the four export documents of `18` share it. */
const PAGE = 'M6 5a2 2 0 0 1 2-2h6.5L19 7.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z';
const PAGE_FOLD = 'M14.5 3v3a1.5 1.5 0 0 0 1.5 1.5h3';

/** The anticlockwise arrow `refresh` is, and `history` is with a clock's hands added. */
const TURN_ARC = 'M3.5 12a8.5 8.5 0 1 0 2.49-6.01L3.5 8';
const TURN_HEAD = 'M3.5 3.5V8H8';

const HOUSE = 'M4 10.3 12 3.8l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4V15h-5v5.5h-4A1.5 1.5 0 0 1 4 19z';

const PALETTE =
  'M12 3a9 9 0 0 0 0 18c1.2 0 1.7-.8 1.5-1.8-.3-1 .3-2.2 1.5-2.2h2a4 4 0 0 0 4-4C21 7.2 17 3 12 3z';

/** The palette's paint wells: dots on the outline palette, holes in the solid one. */
const WELLS: readonly (readonly [number, number])[] = [
  [7.5, 11.5],
  [9, 7.8],
  [13.5, 6.8],
  [17, 9.5],
];

// --- the glyphs -----------------------------------------------------------------------------

const GLYPHS: Readonly<Record<GlyphName, Draw>> = {
  'arrow-right': (p) => <>{line('M4 12h15.5M13.5 6l6 6-6 6', p)}</>,

  /** `01`'s globe: a sphere, one meridian, the equator (§6 C1). */
  atlas: (p) => (
    <>
      {ring(12, 12, 9, p, 'sphere')}
      {line(
        'M12 3c-2.8 2.5-4.2 5.5-4.2 9s1.4 6.5 4.2 9c2.8-2.5 4.2-5.5 4.2-9S14.8 5.5 12 3z',
        p,
        'meridian',
      )}
      {line('M3 12h18', p, 'equator')}
    </>
  ),

  back: (p) => <>{line('M20 12H4.5M10.5 6l-6 6 6 6', p)}</>,

  bag: (p) => (
    <>
      {line(rrect(5, 8, 14, 13, 2), p, 'body')}
      {line('M9 8V6.5a3 3 0 0 1 6 0V8', p, 'handle')}
    </>
  ),

  bell: (p) => (
    <>
      {line('M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z', p, 'bell')}
      {line('M10.5 20.5a1.5 1.5 0 0 0 3 0', p, 'clapper')}
    </>
  ),

  bookmark: (p) => (
    <>{line('M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17l-5.5 4z', p)}</>
  ),

  /** `11`: a lit bulb, solid, on a banded base. Its yellow is OQ-37. */
  bulb: (p) => (
    <>
      {solid(
        'M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.7.5 1.1 1.3 1.1 2.2V17h5.6v-.6c0-.9.4-1.7 1.1-2.2A6.5 6.5 0 0 0 12 2.5z',
        p,
        'glass',
      )}
      {solid(`${rrect(9.2, 18, 5.6, 1.6, 0.8)} ${rrect(10.2, 20.2, 3.6, 1.6, 0.8)}`, p, 'base')}
    </>
  ),

  /** `00` draws the camera solid, wherever it appears. */
  camera: (p) => <>{solid(CAMERA_SOLID, p)}</>,

  /** `27`: the camera, and a solid padlock over its corner. */
  'camera-locked': (p) => (
    <>
      {line(CAMERA_BODY, p, 'body')}
      {ring(12, 13.2, 3.6, p, 'lens')}
      {solid(rrect(15, 16, 6.2, 5.2, 1.1), p, 'lock-body')}
      {line('M16.4 16v-1.3a1.7 1.7 0 0 1 3.4 0V16', p, 'shackle')}
    </>
  ),

  check: (p) => <>{line('M5 12.5l4.5 4.5L19 7.5', p)}</>,
  'chevron-left': (p) => <>{line('M14.5 5.5 8 12l6.5 6.5', p)}</>,
  'chevron-right': (p) => <>{line('M9.5 5.5 16 12l-6.5 6.5', p)}</>,
  'chevron-up': (p) => <>{line('M5.5 15 12 8.5l6.5 6.5', p)}</>,
  /** `09`'s Clear: the bare cross beside its word. */
  close: (p) => <>{line('M6.5 6.5l11 11M17.5 6.5l-11 11', p)}</>,

  /** `09`'s search-field clear: a solid disc with the cross cut out of it. */
  'close-circle': (p) => <>{solid(`${circlePath(12, 12, 10)} ${CROSS_HOLE}`, p)}</>,

  /**
   * `00`'s wheel: a solid hue disc with a palette cut out of it and the palette's wells inside. Its
   * hues — and the palette's white against them — are OQ-37.
   */
  'colour-wheel': (p) => (
    <>
      {solid(
        [
          circlePath(12, 12, 10),
          'M12 6.3a5.7 5.7 0 0 0 0 11.4c.7 0 1-.5.9-1.1-.2-.6.2-1.3.9-1.3h1.3a2.6 2.6 0 0 0 2.6-2.6c0-3.5-2.6-6.4-5.7-6.4z',
          circlePath(9.3, 11.2, 0.85),
          circlePath(10.6, 8.9, 0.85),
          circlePath(13.3, 8.7, 0.85),
        ].join(' '),
        p,
      )}
    </>
  ),

  compass: (p) =>
    p.filled ? (
      <>{solid(`${circlePath(12, 12, 9.75)} M15.5 8.5l-2 5-5 2 2-5z`, p)}</>
    ) : (
      <>
        {ring(12, 12, 9, p, 'dial')}
        {solid('M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z', p, 'needle')}
      </>
    ),

  /**
   * `00`: a ring with a crescent filled on its right, bounded by a curve rather than a diameter.
   * `score-contrast` is `13`'s straight half. `15`'s two-colour split badge is also bound here, and
   * what it is in one ink is part of OQ-37.
   */
  contrast: (p) => (
    <>
      {ring(12, 12, 8.5, p, 'disc')}
      {solid('M12 3.5A8.5 8.5 0 0 1 17.46 18.51Q10.6 13.4 12 3.5z', p, 'crescent')}
    </>
  ),

  document: (p) => (
    <>
      {line(rrect(5, 3, 14, 18, 2.5), p, 'sheet')}
      {line('M8.5 8h7M8.5 12h7M8.5 16h4.5', p, 'lines')}
    </>
  ),

  download: (p) => (
    <>
      {line(PAGE, p, 'page')}
      {line(PAGE_FOLD, p, 'fold')}
      {line('M12 10.5v6.5M9 14l3 3 3-3', p, 'arrow')}
    </>
  ),

  /** `00`: a solid pencil, its cap parted from the body. */
  edit: (p) => <>{solid(PENCIL, p)}</>,

  /** `06`: a shallow tray and an arrow leaving it. `share` is the deeper, iOS box. */
  export: (p) => (
    <>
      {line('M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14', p, 'tray')}
      {line('M12 15V3.5M7.5 8 12 3.5 16.5 8', p, 'arrow')}
    </>
  ),

  /** `00`: a box with an arrow leaving its corner — not `share` (F-228, increment 1). */
  external: (p) => (
    <>
      {line('M13.5 4.5h6v6M19.5 4.5 11 13', p, 'arrow')}
      {line('M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4', p, 'box')}
    </>
  ),

  'file-code': (p) => (
    <>
      {line(PAGE, p, 'page')}
      {line(PAGE_FOLD, p, 'fold')}
      {line('M8.5 14.5h7M8.5 17.5h4', p, 'lines')}
    </>
  ),

  'file-export': (p) => (
    <>
      {line(PAGE, p, 'page')}
      {line(PAGE_FOLD, p, 'fold')}
      {line('M9 18.5c1.5-2 2-4.5 3.5-6.5 1-1.3 2.5-2 3.5-2', p, 'swoosh')}
    </>
  ),

  'file-table': (p) => (
    <>
      {line(PAGE, p, 'page')}
      {line(PAGE_FOLD, p, 'fold')}
      {line(rrect(8.5, 11.5, 7, 6, 0.8), p, 'table')}
      {line('M8.5 14.5h7M12 11.5v6', p, 'cells')}
    </>
  ),

  'file-text': (p) => (
    <>
      {line(PAGE, p, 'page')}
      {line(PAGE_FOLD, p, 'fold')}
      {line('M8.5 11h7M8.5 14h7M8.5 17h4.5', p, 'lines')}
    </>
  ),

  /** `19`: three sliders, each broken where its knob sits. */
  filter: (p) => (
    <>
      {line('M3 6h9.5M17.5 6H21M3 12h3.5M11.5 12H21M3 18h9.5M17.5 18H21', p, 'tracks')}
      {ring(15, 6, 2.5, p, 'k1')}
      {ring(9, 12, 2.5, p, 'k2')}
      {ring(15, 18, 2.5, p, 'k3')}
    </>
  ),

  /** `21`: three centred bars, each shorter than the one above. */
  'filter-lines': (p) => <>{line('M3.5 7h17M7 12h10M10 17h4', p)}</>,

  /** `27`: a sun with a slash through it — too much light to read. */
  glare: (p) => (
    <>
      {ring(12, 12, 3.5, p, 'sun')}
      {line(rays(8, 6, 8.5), p, 'rays')}
      {line('M4.5 4.5l15 15', p, 'slash')}
    </>
  ),

  grid: (p) => (
    <>
      {line(rrect(4, 4, 6.5, 6.5, 1.5), p, 'a')}
      {line(rrect(4, 13.5, 6.5, 6.5, 1.5), p, 'b')}
      {line(rrect(13.5, 13.5, 6.5, 6.5, 1.5), p, 'c')}
      {line('M16.75 4.25v6M13.75 7.25h6', p, 'plus')}
    </>
  ),

  help: (p) => (
    <>
      {ring(12, 12, 9, p, 'ring')}
      {line('M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.7.3-1.2 1-1.2 1.8v.6', p, 'question')}
      {dot(12, 16.8, 1, p, 'dot')}
    </>
  ),

  /** `23`: the turn `refresh` draws, with a clock's hands inside it. */
  history: (p) => (
    <>
      {line(TURN_ARC, p, 'arc')}
      {line(TURN_HEAD, p, 'head')}
      {line('M12 7.5V12l3 2', p, 'hands')}
    </>
  ),

  /** A house with its door. Filled, it is `01`'s active tab. */
  home: (p) => (p.filled ? <>{solid(HOUSE, p)}</> : <>{line(HOUSE, p)}</>),

  /** `03`'s gamut chip: a thick ring. Its hues are OQ-37. */
  'hue-ring': (p) => <>{solid(`${circlePath(12, 12, 9)} ${circlePath(12, 12, 5.6)}`, p)}</>,

  /** `00`: a framed picture in line — hills and a sun. `image-solid` is `02`'s. */
  image: (p) => (
    <>
      {line(rrect(3, 4.5, 18, 15, 2.5), p, 'frame')}
      {line('M3.5 17l4.5-4.5 3.5 3.5 3-3 6 6', p, 'hills')}
      {ring(15.5, 9.5, 1.6, p, 'sun')}
    </>
  ),

  /** `02`'s import: a frame, and inside it solid hills and a solid sun at the upper left. */
  'image-solid': (p) => (
    <>
      {line(rrect(3, 4.5, 18, 15, 2.5), p, 'frame')}
      {solid(
        'M3.8 16.6 8.6 12.3l2.9 2.7 4.4-4.9 4.3 4.6V17a2.5 2.5 0 0 1-2.5 2.5H6.3A2.5 2.5 0 0 1 3.8 17z',
        p,
        'hills',
      )}
      {dot(8.3, 8.9, 1.9, p, 'sun')}
    </>
  ),

  /** `01`'s Lens tab: a camera in outline. Filled, it is `02`'s active lens. */
  lens: (p) =>
    p.filled ? (
      <>{solid(CAMERA_SOLID, p)}</>
    ) : (
      <>
        {line(CAMERA_BODY, p, 'body')}
        {ring(12, 13.2, 3.6, p, 'lens')}
      </>
    ),

  /** `05`'s count chip: a square page of lines. `document` is the taller sheet. */
  list: (p) => (
    <>
      {line(rrect(4, 4, 16, 16, 3.5), p, 'frame')}
      {line('M8 9h8M8 12h8M8 15h5', p, 'lines')}
    </>
  ),

  lock: (p) => (
    <>
      {line(rrect(5, 10.5, 14, 10.5, 2), p, 'body')}
      {line('M8 10.5V8a4 4 0 0 1 8 0v2.5', p, 'shackle')}
      {dot(12, 15.7, 1.3, p, 'keyhole')}
    </>
  ),

  /** `07`, `15` and `16`: a solid padlock under a heavy shackle. Their gold is OQ-37. */
  'lock-solid': (p) => (
    <>
      {solid(rrect(5, 10.5, 14, 10.5, 2), p, 'body')}
      {solid('M7.3 10.5V8a4.7 4.7 0 0 1 9.4 0v2.5h-1.8V8a2.9 2.9 0 0 0-5.8 0v2.5z', p, 'shackle')}
    </>
  ),

  map: (p) => (
    <>
      {line('M3 6.2 9 4l6 2.2L21 4v13.8L15 20l-6-2.2L3 20z', p, 'sheet')}
      {line('M9 4v13.8M15 6.2V20', p, 'folds')}
    </>
  ),

  more: (p) => (
    <>
      {dot(6, 12, 1.6, p, 'a')}
      {dot(12, 12, 1.6, p, 'b')}
      {dot(18, 12, 1.6, p, 'c')}
    </>
  ),

  /** `00`'s palette control: the palette in line, its wells as dots. */
  palette: (p) => (
    <>
      {line(PALETTE, p, 'palette')}
      {WELLS.map(([x, y]) => dot(x, y, 1.2, p, `${String(x)}-${String(y)}`))}
    </>
  ),

  /** `00`'s palette button: the palette solid, its wells cut out. Its colours are OQ-37. */
  'palette-solid': (p) => (
    <>{solid([PALETTE, ...WELLS.map(([x, y]) => circlePath(x, y, 1.25))].join(' '), p)}</>
  ),

  plus: (p) => <>{line('M12 5v14M5 12h14', p)}</>,

  /** A head over shoulders. Filled, it is the active profile `02`, `15` and `18` draw. */
  profile: (p) =>
    p.filled ? (
      <>{solid(`${circlePath(12, 8.3, 4.1)} M4.7 20.5a7.3 7.3 0 0 1 14.6 0z`, p)}</>
    ) : (
      <>
        {ring(12, 8.3, 3.8, p, 'head')}
        {line('M5 20.5a7 7 0 0 1 14 0', p, 'shoulders')}
      </>
    ),

  refresh: (p) => (
    <>
      {line(TURN_ARC, p, 'arc')}
      {line(TURN_HEAD, p, 'head')}
    </>
  ),

  /** `06`: four corner brackets round a ring — what the Lens holds a target with. */
  reticle: (p) => (
    <>
      {line(
        'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3',
        p,
        'corners',
      )}
      {ring(12, 12, 3.8, p, 'ring')}
    </>
  ),

  /** `13`: a ring open at its upper right, holding a check. */
  score: (p) => (
    <>
      {line('M19.2 7.8A8.5 8.5 0 1 1 15.4 4.2', p, 'arc')}
      {line('M8.5 12.2l2.5 2.5 4.8-5', p, 'check')}
    </>
  ),

  /** `13`: solid scales — post, beam, base and two bowls — hung on fine lines. */
  'score-balance': (p) => (
    <>
      {solid(
        [
          circlePath(12, 4.4, 1.3),
          rrect(11.1, 5.2, 1.8, 14, 0.5),
          rrect(3.8, 6.4, 16.4, 1.5, 0.75),
          rrect(7, 19, 10, 2, 1),
          'M2 13.6h7.2a3.6 3.6 0 0 1-7.2 0z',
          'M14.8 13.6H22a3.6 3.6 0 0 1-7.2 0z',
        ].join(' '),
        p,
        'frame',
      )}
      {line('M2.6 13.4 5.6 7.6l3 5.8M15.4 13.4l3-5.8 3 5.8', p, 'strings')}
    </>
  ),

  /** `13`: a disc with its LEFT half filled — the mirror of `contrast`, so the two differ in shape. */
  'score-contrast': (p) => (
    <>
      {ring(12, 12, 8.5, p, 'disc')}
      {solid('M12 3.5a8.5 8.5 0 0 0 0 17z', p, 'half')}
    </>
  ),

  /** `13`: a solid eye, the iris cut out as a ring around a solid pupil. */
  'score-cvd': (p) => (
    <>
      {solid(
        [
          'M2 12c2.5-4.7 5.9-6.8 10-6.8s7.5 2.1 10 6.8c-2.5 4.7-5.9 6.8-10 6.8S4.5 16.7 2 12z',
          circlePath(12, 12, 4.4),
          circlePath(12, 12, 2.5),
        ].join(' '),
        p,
      )}
    </>
  ),

  /** `13`: a solid figure, arms raised out to the sides, legs apart. */
  'score-fit': (p) => (
    <>
      {dot(12, 4.4, 2.2, p, 'head')}
      {solid(
        'M3.2 7.1 12 8.7l8.8-1.6-.6 2.1-5.8 1.5v3.8l1.8 6.1-2 .6L12 15.8l-2.2 5.4-2-.6 1.8-6.1v-3.8L3.8 9.2z',
        p,
        'body',
      )}
    </>
  ),

  /**
   * `13`: three overlapping circles, told apart in the image only by their colours. What they are
   * in one ink is part of OQ-37; until it is answered this draws them as three outlines and F-257,
   * the surface that shows them, is blocked.
   */
  'score-harmony': (p) => (
    <>
      {ring(12, 8.6, 4.8, p, 'a')}
      {ring(8.6, 14.6, 4.8, p, 'b')}
      {ring(15.4, 14.6, 4.8, p, 'c')}
    </>
  ),

  /** `06`'s editorial review: a solid seal with the check cut out of it. Its green is OQ-37. */
  'seal-check': (p) => <>{solid(`${SEAL} ${CHECK_HOLE}`, p)}</>,

  /**
   * `04`'s gauge: a scalloped seal in line — its body is only a tint (C10's green) — holding a solid
   * four-pointed star.
   */
  'seal-star': (p) => (
    <>
      {line(SEAL, p, 'seal')}
      {solid(star4(12, 12, 5.2), p, 'star')}
    </>
  ),

  /** `05`'s search field: a magnifier. `21`'s tab draws people, and C1 supersedes that tab. */
  search: (p) => (
    <>
      {ring(10.5, 10.5, 6.5, p, 'glass')}
      {line('M15.4 15.4 20.5 20.5', p, 'handle')}
    </>
  ),

  /**
   * `00`'s settings button — the only settings a governing element draws: a ring of eight small
   * rings round a hub. The toothed gear is drawn only in tab bars C1 supersedes, so it is not built.
   */
  settings: (p) => (
    <>
      {ring(12, 12, 3, p, 'hub')}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = polar(12, 12, 7.3, 45 * i - 90);
        return ring(Number(n(x)), Number(n(y)), 1.7, p, `petal-${String(i)}`);
      })}
    </>
  ),

  /** `06 20 23 24 26`: the open box an arrow leaves upward. */
  share: (p) => (
    <>
      {line(
        'M8.5 9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.5',
        p,
        'box',
      )}
      {line('M12 14V3.5M8.5 7 12 3.5 15.5 7', p, 'arrow')}
    </>
  ),

  shield: (p) => (
    <>
      {line('M12 3l7 2.8v5.7c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V5.8z', p, 'shield')}
      {line('M9 12l2.2 2.2L15.5 10', p, 'check')}
    </>
  ),

  /** `13`'s capsule: three solid four-pointed stars, one large. Their gold is OQ-37. */
  sparkle: (p) => (
    <>{solid([star4(14.5, 12, 7.5), star4(5.8, 6, 3.2), star4(6.3, 18.2, 2.6)].join(' '), p)}</>
  ),

  /** `02` and `03`: a solid disc and eight short rays. */
  sun: (p) => (
    <>
      {dot(12, 12, 4.3, p, 'disc')}
      {line(rays(8, 7, 9.5), p, 'rays')}
    </>
  ),

  /** `13`: two arrows chasing each other. `07`'s single turn is `refresh`. */
  swap: (p) => (
    <>
      {line('M5 10.5A5.5 5.5 0 0 1 10.5 6H18', p, 'top')}
      {line('M15 3l3 3-3 3', p, 'top-head')}
      {line('M19 13.5a5.5 5.5 0 0 1-5.5 4.5H6', p, 'bottom')}
      {line('M9 21l-3-3 3-3', p, 'bottom-head')}
    </>
  ),

  /** `01`'s Wardrobe tab, and `11`'s Outfit Lab: a shirt. */
  wardrobe: (p) => (
    <>
      {line(
        'M8.5 3.5 4.2 5.8a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.3.4L8 10v9.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V10l1.3.5a1 1 0 0 0 1.3-.4l1.6-3a1 1 0 0 0-.4-1.3l-4.3-2.3c-.6 1.5-1.9 2.4-3.5 2.4s-2.9-.9-3.5-2.4z',
        p,
      )}
    </>
  ),
};

export interface GlyphProps {
  readonly name: GlyphName;
  /** Resolved by the caller from a theme token — a glyph names no colour. */
  readonly color: string;
  /** The rendered size in dp. The line keeps its declared width at every size. */
  readonly size?: number;
  /** The active state, where a mockup draws one filled ({@link FILLABLE_GLYPHS}). */
  readonly filled?: boolean;
  readonly testID?: string;
}

/**
 * A glyph, by the name its inventory binds.
 *
 * **Decorative to a screen reader.** A glyph beside a word adds nothing a person can act on, and a
 * glyph that is the whole of a control is named by the control — `IconButton` requires that name.
 */
export function Glyph({
  name,
  color,
  size = 24,
  filled = false,
  testID,
}: GlyphProps): React.JSX.Element {
  const fillable = (FILLABLE_GLYPHS as readonly GlyphName[]).includes(name);
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(GRID)} ${String(GRID)}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      /*
        NO DEFAULT FILL. react-native-svg injects `fill: #000000` onto the root group when none is
        given, and the conformance scan reads it as a colour literal — correctly: a shape added
        later without an explicit fill would paint solid black.
      */
      fill="none"
      {...(testID === undefined ? {} : { testID })}
    >
      {GLYPHS[name]({ ink: color, sw: glyphStroke(size), filled: filled && fillable })}
    </Svg>
  );
}
