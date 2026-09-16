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
 * ## Ink, not colour
 *
 * Every glyph is drawn in the one colour its caller resolves from a theme token. Tinting a glyph is
 * a surface's decision under §6 C10, and the four tinted icons C10 does not list are OQ-37. What a
 * glyph guarantees instead is SILHOUETTE (NFR-9): each is an outline that differs in shape from its
 * neighbours, so it reads with no colour, at 16 dp, under any deficiency.
 *
 * ## Filled, where a mockup draws the active state filled
 *
 * `01` draws its active tab filled (home), `02` its active lens, `15` and `18` their active profile,
 * `09` its active compass. Those four take `filled`; the others have no filled drawing to follow, and
 * asking for one draws the outline. `camera` is drawn filled wherever it appears (`00`).
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
  'glare',
  'grid',
  'help',
  'history',
  'home',
  'image',
  'lens',
  'list',
  'lock',
  'map',
  'more',
  'palette',
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

/** A gear: eight teeth, each a flat-topped trapezoid on a ring. Computed once, at load. */
const GEAR = (() => {
  const [outer, inner, teeth] = [9.6, 7.2, 8];
  const pts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = (360 / teeth) * i - 90;
    for (const [r, d] of [
      [inner, a - 16],
      [outer, a - 9],
      [outer, a + 9],
      [inner, a + 16],
    ] as const) {
      const [x, y] = polar(12, 12, r, d);
      pts.push(`${n(x)} ${n(y)}`);
    }
  }
  return `M${pts.join('L')}z`;
})();

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

/** A four-pointed star, the mark inside `04`'s seal. */
const STAR =
  'M12 6.8c.5 2.8 2.4 4.7 5.2 5.2-2.8.5-4.7 2.4-5.2 5.2-.5-2.8-2.4-4.7-5.2-5.2 2.8-.5 4.7-2.4 5.2-5.2z';

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

  bulb: (p) => (
    <>
      {line(
        'M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v1h5v-1c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z',
        p,
        'glass',
      )}
      {line('M9.5 19.5h5M10.5 21.5h3', p, 'base')}
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
  close: (p) => <>{line('M6.5 6.5l11 11M17.5 6.5l-11 11', p)}</>,

  /** `00`'s wheel is a hue disc with a palette on it; in ink, a ring holding the palette. */
  'colour-wheel': (p) => (
    <>
      {ring(12, 12, 9.5, p, 'wheel')}
      {line(
        'M12 6.5a5.5 5.5 0 0 0 0 11c.7 0 1-.5.9-1.1-.2-.6.2-1.3.9-1.3h1.2a2.5 2.5 0 0 0 2.5-2.5c0-3.4-2.5-6.1-5.5-6.1z',
        p,
        'palette',
      )}
      {dot(9.3, 11, 0.8, p, 'a')}
      {dot(10.6, 8.8, 0.8, p, 'b')}
      {dot(13.4, 8.6, 0.8, p, 'c')}
    </>
  ),

  compass: (p) =>
    p.filled ? (
      <>{solid(`${circlePath(12, 12, 9.75)} M15.5 8.5l-2 5-5 2 2-5z`, p)}</>
    ) : (
      <>
        {ring(12, 12, 9, p, 'dial')}
        {line('M15.5 8.5l-2 5-5 2 2-5z', p, 'needle')}
      </>
    ),

  /** `00`: a disc with its right half filled. `score-contrast` is its mirror. */
  contrast: (p) => (
    <>
      {ring(12, 12, 8.5, p, 'disc')}
      {solid('M12 3.5a8.5 8.5 0 0 1 0 17z', p, 'half')}
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

  edit: (p) => (
    <>
      {line(
        'M4 20l1.1-4.2L15.8 5.1a1.8 1.8 0 0 1 2.6 0l.5.5a1.8 1.8 0 0 1 0 2.6L8.2 18.9z',
        p,
        'pencil',
      )}
      {line('M14 7l3 3', p, 'ferrule')}
    </>
  ),

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

  image: (p) => (
    <>
      {line(rrect(3, 4.5, 18, 15, 2.5), p, 'frame')}
      {line('M3.5 17l4.5-4.5 3.5 3.5 3-3 6 6', p, 'hills')}
      {ring(15.5, 9.5, 1.6, p, 'sun')}
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

  palette: (p) => (
    <>
      {line(PALETTE, p, 'palette')}
      {dot(7.5, 11.5, 1.2, p, 'a')}
      {dot(9, 7.8, 1.2, p, 'b')}
      {dot(13.5, 6.8, 1.2, p, 'c')}
      {dot(17, 9.5, 1.2, p, 'd')}
    </>
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

  'score-balance': (p) => (
    <>
      {line('M12 4.5V20M8 20h8M5 7h14', p, 'frame')}
      {line('M5 7l-2.5 6a2.5 1.5 0 0 0 5 0zM19 7l-2.5 6a2.5 1.5 0 0 0 5 0z', p, 'pans')}
    </>
  ),

  /** `13`: a disc with its LEFT half filled — the mirror of `contrast`, so the two differ in shape. */
  'score-contrast': (p) => (
    <>
      {ring(12, 12, 8.5, p, 'disc')}
      {solid('M12 3.5a8.5 8.5 0 0 0 0 17z', p, 'half')}
    </>
  ),

  'score-cvd': (p) => (
    <>
      {line('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', p, 'eye')}
      {ring(12, 12, 3, p, 'iris')}
      {dot(12, 12, 1.2, p, 'pupil')}
    </>
  ),

  /** `13`: a figure with its arms out. */
  'score-fit': (p) => (
    <>
      {dot(12, 4.8, 2, p, 'head')}
      {line('M4.5 8.5 12 10l7.5-1.5M12 10v5M12 15l-3 5.5M12 15l3 5.5', p, 'body')}
    </>
  ),

  /** `13`: three overlapping circles. In ink; their colours are OQ-37. */
  'score-harmony': (p) => (
    <>
      {ring(12, 8.6, 4.8, p, 'a')}
      {ring(8.6, 14.6, 4.8, p, 'b')}
      {ring(15.4, 14.6, 4.8, p, 'c')}
    </>
  ),

  /** `05`'s search field: a magnifier. `21`'s tab draws people, and C1 supersedes that tab. */
  search: (p) => (
    <>
      {ring(10.5, 10.5, 6.5, p, 'glass')}
      {line('M15.4 15.4 20.5 20.5', p, 'handle')}
    </>
  ),

  settings: (p) => (
    <>
      {line(GEAR, p, 'gear')}
      {ring(12, 12, 3, p, 'hub')}
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

  /** `04`: a scalloped seal holding a four-pointed star. */
  sparkle: (p) => (
    <>
      {line(SEAL, p, 'seal')}
      {solid(STAR, p, 'star')}
    </>
  ),

  sun: (p) => (
    <>
      {ring(12, 12, 4, p, 'disc')}
      {line(rays(8, 6.5, 9), p, 'rays')}
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
