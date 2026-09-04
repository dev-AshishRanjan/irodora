/**
 * The navigation glyphs, and why they are a second registry rather than three more entries.
 *
 * ## Not the status icons
 *
 * `Icon` holds `icon.check`, `icon.alert` and `icon.cross`, and its test asserts coverage in BOTH
 * directions: every icon token the manifest declares in `statusPairing` has a glyph, and every
 * glyph is a declared token. That second direction is what stops the registry growing names
 * nothing declares.
 *
 * A tab icon is not a status. Adding one to `GLYPHS` would break that direction, and forcing five
 * navigation entries into `statusPairing` to satisfy it would be a lie about what those entries
 * are — they exist because ACCESSIBILITY.md §4 says a status expressible only as colour cannot be
 * constructed.
 *
 * So this is a second registry with the **same discipline applied to its own subject**: every tab
 * has a glyph, every glyph belongs to a tab, asserted both ways. The rule was right; only the
 * thing it governs differs.
 *
 * ## Drawn as SVG, which is not a reversal of ADR-0057
 *
 * The status glyphs are composed `View`s because a check, a triangle and a cross are rectangles.
 * A house, a grid, a lens and a person are not, and composing them from bordered `View`s produces
 * something crude enough that nobody would call it minimal.
 *
 * **ADR-0057 is about FONTS.** A font maps a codepoint to a glyph at render time, and a missing
 * mapping is a tofu box that nobody sees in review — that is the failure it exists to prevent. An
 * SVG path is the shape itself, in the source. There is no lookup to fail.
 *
 * `react-native-svg` is a **required peer of heroui-native**, so it is already unavoidable in
 * every tree that renders this package. Same argument as `react-native-reanimated` in F-144 and
 * `react-native-safe-area-context` in F-159: declaring it costs nothing new.
 *
 * ## The paths are ours
 *
 * Lucide is MIT and would be defensible. Vendoring third-party artwork carries the provenance
 * obligations `content/AGENTS.md` sets out for everything else this product ships, and five
 * geometric glyphs matching a mark already made of rectangles is both less work and more
 * coherent. *One family, one source, no mixed metaphors* is then true by construction.
 *
 * ## They differ in SILHOUETTE
 *
 * Which is what NFR-9 asks for. A pointed roof, four squares, a circle in a frame, two overlapping
 * shapes, a head over an arc — told apart with no colour, at 20px, under any deficiency. The `cvd`
 * gate covers the colour half; this is the half a gate cannot check, so it is drawn as outline
 * rather than as five filled blobs that would silhouette identically.
 */

import Svg, { Circle, Path } from 'react-native-svg';

/** The grid every glyph is drawn on, matching the brand mark's own 24. */
const GRID = 24;

/**
 * One stroke weight, everywhere.
 *
 * 1.75 rather than 2: at 20px on a tab bar, 2 reads as heavy beside 10px uppercase labels, and
 * the register this release chose is soft. Round joins for the same reason.
 */
const STROKE = 1.75;

/**
 * A rounded rectangle as a path.
 *
 * `<Rect x y>` would be shorter and its `x` and `y` props are DEPRECATED in react-native-svg 15
 * — they collide with the transform API's naming — so lint refuses them. Building the path
 * instead has a second benefit worth more than the first: every glyph in this file is now a
 * `Path`, which makes *one family, one source* literally true of the primitive as well as of the
 * drawing.
 *
 * Written out rather than pulled from a library: it is six segments of arithmetic, and a
 * dependency for it would be a dependency to audit.
 */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const [ix, iy] = [w - 2 * r, h - 2 * r];
  return [
    `M${String(x + r)} ${String(y)}`,
    `h${String(ix)}`,
    `a${String(r)} ${String(r)} 0 0 1 ${String(r)} ${String(r)}`,
    `v${String(iy)}`,
    `a${String(r)} ${String(r)} 0 0 1 ${String(-r)} ${String(r)}`,
    `h${String(-ix)}`,
    `a${String(r)} ${String(r)} 0 0 1 ${String(-r)} ${String(-r)}`,
    `v${String(-iy)}`,
    `a${String(r)} ${String(r)} 0 0 1 ${String(r)} ${String(-r)}`,
    'z',
  ].join(' ');
}

export type NavIconName = 'home' | 'atlas' | 'lens' | 'wardrobe' | 'profile';

/**
 * Each glyph, as the body of an SVG on a 24 grid.
 *
 * A record rather than a switch so the registry can be enumerated — which is what makes the
 * both-directions test possible.
 */
const NAV_GLYPHS: Readonly<Record<NavIconName, (color: string) => React.JSX.Element>> = {
  /** A house. A metaphor rather than a description, and the word below it is still there. */
  home: (color) => (
    <Path
      d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
      fill="none"
    />
  ),

  /** Four squares — the corpus, which is many colours rather than one. */
  atlas: (color) => (
    <>
      {[
        [4, 4],
        [13.5, 4],
        [4, 13.5],
        [13.5, 13.5],
      ].map(([x, y]) => (
        <Path
          key={`${String(x)}-${String(y)}`}
          d={roundedRect(x ?? 0, y ?? 0, 6.5, 6.5, 1.5)}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
        />
      ))}
    </>
  ),

  /**
   * A circle inside a frame — the reticle the Lens actually draws.
   *
   * The one glyph here that describes rather than symbolises: it is a small picture of the thing
   * on the screen it leads to.
   */
  lens: (color) => (
    <>
      <Path d={roundedRect(3.5, 3.5, 17, 17, 4)} stroke={color} strokeWidth={STROKE} fill="none" />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={STROKE} fill="none" />
    </>
  ),

  /** Two overlapping rounded rects — garments, which come in more than one. */
  wardrobe: (color) => (
    <>
      <Path
        d={roundedRect(3.5, 6.5, 11, 13, 2.5)}
        stroke={color}
        strokeWidth={STROKE}
        fill="none"
      />
      <Path
        d="M17 5h1.5A2 2 0 0 1 20.5 7v10"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),

  /** A head over an arc. The one universal metaphor in the set. */
  profile: (color) => (
    <>
      <Circle cx={12} cy={8.5} r={3.75} stroke={color} strokeWidth={STROKE} fill="none" />
      <Path
        d="M5 20a7 7 0 0 1 14 0"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
};

/** Every glyph this registry holds. Enumerable, so the test can check both directions. */
export const NAV_ICON_NAMES = Object.keys(NAV_GLYPHS) as readonly NavIconName[];

export interface NavIconProps {
  readonly name: NavIconName;
  /** Resolved by the caller from a theme token — this component names no colour. */
  readonly color: string;
  readonly size?: number;
}

/**
 * A navigation glyph.
 *
 * **Decorative to a screen reader.** The tab it sits in carries the accessible name, and a second
 * announcement of "home, image" adds nothing a person can act on. This is also why an icon is
 * never the only channel here: the label is a sibling, not a tooltip.
 */
export function NavIcon({ name, color, size = 20 }: NavIconProps): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(GRID)} ${String(GRID)}`}
      accessible={false}
      /*
        NO DEFAULT FILL. react-native-svg injects `fill: #000000` onto the root group when none
        is given, and the conformance scan reads it as a colour literal — correctly, because it
        IS one: a shape added later without an explicit `fill` would paint solid black rather
        than inheriting the stroke-only treatment every glyph here uses.
      */
      fill="none"
    >
      {NAV_GLYPHS[name](color)}
    </Svg>
  );
}
