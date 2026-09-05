/**
 * The mark and the wordmark (F-141, F-165, FR-69).
 *
 * ## The brief this answers
 *
 * [`BRAND.md` §7](../../../docs/design/BRAND.md#7-the-mark) has specified an identity since R0:
 * *"a wordmark-led identity with a geometric mark suggesting **arranged** colour — relationship,
 * adjacency, interval — rather than a swatch or a droplet. It must work in one colour, at 16 px,
 * and under protan, deutan and tritan simulation."*
 *
 * And the line that turns a review note into a gate: **"a mark that depends on colour to be
 * recognisable is disqualified from this product."**
 *
 * ## The mark is 彡 — the radical that means colour in 彩
 *
 * 彩 is the character in *irodoru*, the verb this product is named after, and 彡 is the part of
 * it that carries the meaning: pattern, ornament, colour laid on. **The mark is a piece of the
 * subject's own writing rather than an abstraction of it** — which is the whole answer to
 * *"could this be any other product?"*, and the answer the shape it replaces did not have.
 *
 * ```
 *        ▄▄▄▄▄▄▄▄▄▄▄▄          three equal strokes
 *       ▄▄▄▄▄▄▄▄▄▄▄▄           thickness = gap = shear = the interval
 *        ▄▄▄▄▄▄▄▄▄▄▄▄
 *       ▄▄▄▄▄▄▄▄▄▄▄▄
 *        ▄▄▄▄▄▄▄▄▄▄▄▄
 *       ▄▄▄▄▄▄▄▄▄▄▄▄
 * ```
 *
 * **One quantity, used three times.** F-141's real idea was 間 (*ma*) — the interval as the
 * subject of the mark rather than the space left over by it — and that idea survives; what it
 * lacked was a figure. Here the interval is the stroke's thickness, the gap between strokes, and
 * the horizontal displacement from a stroke's bottom edge to its top. Change it and the whole
 * mark rescales without changing what it is.
 *
 * ## 45° is a manufacturing decision, not a stylistic one
 *
 * Shear equals thickness, so the edge advances **exactly one pixel per pixel row** at any scale
 * where the grid unit is a whole number — which is the condition
 * [`generate-brand-assets.mjs`](../../../scripts/generate-brand-assets.mjs) already refuses to
 * build without. Every edge lands on a pixel boundary. A mark whose edges are soft at 48 px has
 * lost the thing that makes it legible at 16.
 *
 * ## What the first attempt got wrong
 *
 * F-141 drew two identical rectangles displaced by the interval, and it was reported as *"not
 * relevant and not professional"* twice. The audit, because a redesign you cannot justify is one
 * you should not make:
 *
 * | what was wrong | why it mattered |
 * |---|---|
 * | no closed silhouette — two free-floating slabs | an icon on a home screen needs one figure you could trace; this asked the eye to do the arranging the concept claimed as its subject |
 * | the idea was legible only in prose | the equality of gap and offset is invisible without measuring, and a mark that needs its caption is a diagram |
 * | it read as something else | two offset bars is a pause glyph or a chart fragment — the rejection table ruled out three bars as "a bar chart" and then shipped two |
 * | nothing in it was colour, and nothing was Japanese | the brief asks for *arranged colour*, and a person looking at it had no route to the product |
 *
 * ## What it deliberately is not
 *
 * | rejected | because |
 * |---|---|
 * | bars of increasing height | a bar chart — generic, and on the visual-taste cliché list |
 * | nested rectangles, a sample on its well | that **is** a swatch, excluded by the brief in as many words |
 * | overlapping fields, colour mixing | wrong about the product: this measures colour, it does not mix it |
 * | a droplet, a hue wheel, an aperture | the first two are excluded by the brief; the third says *camera* rather than *colour*, and every camera app has one |
 * | filling the strokes with corpus colours | more obviously "a colour app", and it contradicts the register the product chose — soft minimal, which is monochrome — as well as the disqualifying line above |
 *
 * ## One geometry, two renderers
 *
 * {@link Mark} and {@link markSvg} both read {@link MARK} and neither carries its own numbers.
 * That is `cardSvg`'s arrangement one level smaller, and the reason is the same: two copies of a
 * geometry drift, and the copy that drifts is the one on the artefact that leaves the app.
 *
 * Both now draw **polygons**. The component used two `View`s so the package would stay
 * dependency-free; `react-native-svg` has been a required `@irodora/ui` peer since F-162, so the
 * argument expired — and a sheared stroke as a `View` would need a transform, which is a second
 * way of expressing the same geometry and therefore a second thing to get wrong.
 */

import { View, type ViewProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { nativeType } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';

/**
 * The mark, as data.
 *
 * A 24-unit grid because it divides by 2, 3, 4, 6 and 8 — every subdivision the geometry below
 * wants lands on an integer, so the mark has no fractional edges to soften at small sizes.
 *
 * **`interval` appears twice on purpose**, as the gap and as the offset. It is not two numbers
 * that happen to be equal; it is one number used twice, and writing it once is what stops a
 * later edit changing the mark into a different idea while it still looks about right.
 */
export const MARK = {
  /** The coordinate system everything below is expressed in. */
  grid: 24,
  /**
   * 間. The stroke's thickness, the gap between strokes, AND the horizontal shear of each
   * stroke.
   *
   * **One number used three times, not three numbers that happen to agree.** Writing it once is
   * what stops a later edit turning the mark into a different idea while it still looks about
   * right — and the shear being equal to the thickness is what puts every edge at 45°, which is
   * the only angle a raster grid renders without softening.
   */
  interval: 4,
  /** How many strokes. Three, because 彡 is three. */
  strokes: 3,
  /** The horizontal run of one stroke's lower edge. */
  length: 16,
  /** The lower-left corner of the first stroke's lower edge. Everything else is derived. */
  origin: { x: 2, y: 2 },
} as const;

/** One stroke, as the four corners of a parallelogram, clockwise from its upper left. */
export type MarkStroke = readonly (readonly [number, number])[];

/**
 * The three strokes, in drawing order. Derived from {@link MARK}, so the equalities cannot drift.
 *
 * Each stroke is a parallelogram: the lower edge runs from `x` to `x + length`, and the upper
 * edge is the same run displaced right by `interval` and up by `interval`. Those two being the
 * same number is what makes the slant exactly 45°.
 */
export function markStrokes(): readonly MarkStroke[] {
  const { interval, strokes, length, origin } = MARK;
  return Array.from({ length: strokes }, (_unused, i) => {
    // Stroke i sits one thickness and one gap below the one before it — two intervals.
    const top = origin.y + i * interval * 2;
    const bottom = top + interval;
    const left = origin.x;
    return [
      [left + interval, top],
      [left + interval + length, top],
      [left + length, bottom],
      [left, bottom],
    ] as const;
  });
}

/** The ink's bounding box, derived rather than stated. Used to prove the mark sits centred. */
export function markBounds(): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const points = markStrokes().flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * The mark as an SVG document.
 *
 * Exists for F-142: an app icon is a file, and a pipeline cannot render a React component into
 * one. A caller passes the colour, because the mark has none of its own — see the disqualifying
 * line quoted in the header.
 *
 * **Exactly one `fill` is emitted, and that is the CVD guarantee.** Not a simulation: a
 * simulation maps colours to what a given deficiency would perceive, and a document with one
 * colour has nothing to confuse it with, whatever that colour becomes. So the honest check is
 * that there is only one — which `brand.test.tsx` asserts, with a two-colour decoy that must
 * fail it.
 */
export function markSvg(color: string, size: number = MARK.grid): string {
  const strokes = markStrokes()
    .map((stroke) => `<path d="${pathOf(stroke)}" fill="${color}"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" ` +
    `viewBox="0 0 ${String(MARK.grid)} ${String(MARK.grid)}">${strokes}</svg>`
  );
}

/**
 * A stroke as SVG path data. **One formatter, so the two renderers cannot disagree.**
 *
 * A path rather than a polygon, and the reason is that react-native-svg lowers `<Polygon>` to a
 * `Path` and discards the `points` prop on the way — so the component and the emitted document
 * would have been comparable only through a conversion, which is a third expression of one
 * geometry. Emitting `d` from both makes the assertion a string equality.
 */
export function pathOf(stroke: MarkStroke): string {
  const [start, ...rest] = stroke;
  if (start === undefined) throw new Error('a stroke with no corners cannot be drawn');
  const line = rest.map(([x, y]) => `L${String(x)} ${String(y)}`).join(' ');
  return `M${String(start[0])} ${String(start[1])} ${line} Z`;
}

/** How small the mark is allowed to be drawn. The brief's number, not a guess. */
export const MARK_MIN_SIZE = 16;

/**
 * The narrowest thing in the mark, at a given rendered size.
 *
 * The interval — which is now both the stroke and the gap between strokes, so one number answers
 * for both. A mark whose gaps have closed is a filled block; a mark whose strokes have closed is
 * nothing at all. Exported so the test asserts a number rather than a screenshot.
 */
export function narrowestFeature(size: number): number {
  return (MARK.interval / MARK.grid) * size;
}

export interface MarkProps extends Omit<ViewProps, 'style' | 'accessibilityRole'> {
  /** Rendered edge length. Defaults to the brief's floor. */
  readonly size?: number;
  /** Which foreground token the fields take. The mark introduces no colour of its own. */
  readonly color?: Extract<keyof ThemeColors, 'foreground' | 'foreground.2' | 'inverse.foreground'>;
  /**
   * What a screen reader announces.
   *
   * **Omitted means decorative**, and that is the common case: in a lockup the wordmark beside
   * it is real text, so a labelled mark would announce the product name twice. A mark standing
   * alone — a splash, a header with no wordmark — passes one.
   */
  readonly label?: string;
}

/**
 * The mark.
 *
 * The same polygons {@link markSvg} emits, through `react-native-svg` — which has been a required
 * `@irodora/ui` peer since F-162. A sheared stroke drawn as a `View` would need a transform, and
 * a transform is a second way of expressing one geometry: a second thing to get wrong, in the
 * renderer that is not the one on the home screen.
 */
export function Mark({
  size = MARK_MIN_SIZE,
  color = 'foreground',
  label,
  ...rest
}: MarkProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const fill = colors[color];

  return (
    <View
      {...rest}
      {...(label === undefined
        ? // Decorative. Hidden from both platforms' accessibility trees rather than merely
          // unlabelled — an unlabelled View is skipped by VoiceOver and announced as an
          // unnamed element by some TalkBack versions, which is a difference worth not having.
          {
            accessible: false,
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
          }
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label })}
      style={{ width: size, height: size }}
    >
      {/*
        NO DEFAULT FILL ON THE ROOT. react-native-svg injects `fill: #000000` onto the root group
        when none is given, which is a colour no token declared and which E-081 found the hard way
        on a card nobody had looked at. Every polygon states its own.
      */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(MARK.grid)} ${String(MARK.grid)}`}
        fill="none"
        accessible={false}
      >
        {markStrokes().map((stroke) => (
          <Path key={pathOf(stroke)} d={pathOf(stroke)} fill={fill} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * The type steps the wordmark may be set at.
 *
 * **`display.1` (72 px) is deliberately absent, and the gate is why.** The first draft listed it
 * — a wordmark is the obvious home for the largest step — and `verify-token-reach.mjs` promptly
 * reported `display.1` as reached, because the string appears in this union and the check reads
 * string literals.
 *
 * It was right to complain and wrong about the fact, which is the interesting part: **a type
 * literal is not a painted pixel.** Nothing renders at 72 px; a union member merely says
 * something could. Leaving it would have closed F-146's exemption with a promise instead of a
 * surface — the exact laundering ADR-0088 exists to stop, arriving from a direction that ADR
 * does not anticipate.
 *
 * **F-146 widened it, and only then.** Home now leads with the wordmark at 72px, so the union
 * admits `display.1` because something renders one — not because something might. The exemption
 * in `unreached-tokens.json` went at the same time, and `verify-token-reach` fails on a
 * declaration that outlived its owner, so the two cannot drift apart.
 */
export type WordmarkSize = Extract<
  keyof typeof nativeType.latin,
  'display.1' | 'display.2' | 'title'
>;

export interface WordmarkProps {
  readonly size?: WordmarkSize;
  readonly script?: Script;
  /** Announce as a heading. A splash is not a heading; a screen header is. */
  readonly heading?: boolean;
}

/**
 * The lockup: the mark, the interval, the name.
 *
 * **The gap between them is the mark's own interval, scaled to the type step** — so the lockup
 * cannot drift from the mark, and changing `MARK.interval` moves both at once. One quantity,
 * used a third time.
 *
 * The mark is sized to the step's font size rather than its line height. Line height carries
 * leading, which is space around the letters rather than the letters themselves, and matching
 * it would leave the mark visibly larger than the word beside it.
 *
 * ## The name is set type, not drawn letterforms
 *
 * A drawn wordmark is the usual answer for a wordmark-led identity, and it is out of reach:
 * React Native has no path-text and this product has no type designer. Setting the name from
 * the scale with its own tracking is honest and reversible — a drawn wordmark can replace this
 * without touching the lockup rule, because the rule is about the interval and not the glyphs.
 *
 * The mark carries no label here. The word beside it is real text, so a screen reader already
 * says "Irodora"; labelling the mark as well would say it twice.
 */
export function Wordmark({
  size = 'title',
  script = 'latin',
  heading = false,
}: WordmarkProps = {}): React.JSX.Element {
  const step = nativeType.latin[size].fontSize;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: (MARK.interval / MARK.grid) * step,
      }}
    >
      <Mark size={step} />
      {/*
        NOT `script`-switched, and that is a brand decision rather than an i18n oversight. The
        product is called Irodora in both locales — a name is not translated — so the wordmark
        is always Latin. `script` is still accepted and threaded, because the surrounding line
        height is set by the page and a wordmark that ignored it would sit wrong in Japanese.
      */}
      <Text size={size} color="foreground" script={script} heading={heading}>
        Irodora
      </Text>
    </View>
  );
}
