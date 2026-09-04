/**
 * The mark and the wordmark (F-141, FR-69).
 *
 * ## The brief this answers
 *
 * [`BRAND.md` §7](../../../docs/design/BRAND.md#7-the-mark) has specified an identity since R0
 * and nothing was ever drawn: *"a wordmark-led identity with a geometric mark suggesting
 * **arranged** colour — relationship, adjacency, interval — rather than a swatch or a droplet.
 * It must work in one colour, at 16 px, and under protan, deutan and tritan simulation."*
 *
 * And the line that turns a review note into a gate: **"a mark that depends on colour to be
 * recognisable is disqualified from this product."**
 *
 * ## The mark is two fields and the interval between them
 *
 * Two identical rectangles on a 24-unit grid. The horizontal gap between them is 4, and the
 * vertical offset between them is **also 4** — one quantity, stated on both axes.
 *
 * ```
 *   ┌─────┐            ← left field, y 3..17
 *   │     │  ┌─────┐   ← right field, y 7..21 — offset by the interval
 *   │     │  │     │
 *   └─────┘  │     │
 *      ↑  ↑  └─────┘
 *      the gap is the same 4
 * ```
 *
 * That equality is the whole idea, and it is the reason this is a mark rather than a shape.
 * Two rectangles that merely sit near each other are adjacent; two whose separation and whose
 * displacement are *the same measured quantity* are **arranged**. 間 (*ma*) — the interval as a
 * design element, from [`BRAND.md` §6](../../../docs/design/BRAND.md#6-visual-direction) — is
 * the subject of the mark rather than the space left over by it.
 *
 * It is also the one thing about the mark that can be asserted instead of admired, and
 * `brand.test.tsx` asserts it.
 *
 * ## What it deliberately is not
 *
 * | rejected | because |
 * |---|---|
 * | three bars of increasing height | a bar chart — generic, and on the visual-taste cliché list |
 * | nested rectangles, a sample on its well | that **is** a swatch, excluded by the brief in as many words |
 * | overlapping circles, colour mixing | wrong about the product: this measures colour, it does not mix it — and circles contradict *"rectilinear… swatches are true rectangles"* |
 * | a droplet | excluded by the brief |
 * | three fields rather than two | busier, not more meaningful. *Interval* needs exactly two edges; a third only costs legibility at 16 px |
 *
 * ## One geometry, two renderers
 *
 * {@link Mark} draws two `View`s, so `@irodora/ui` gains no dependency — the mark is two
 * rectangles and does not need SVG to be one. {@link markSvg} emits the same rectangles as a
 * string, because F-142's icon pipeline needs a **file** and cannot consume a React component.
 *
 * Both read {@link MARK} and neither carries its own numbers. That is `cardSvg`'s arrangement
 * one level smaller, and the reason is the same: two copies of a geometry drift, and the copy
 * that drifts is the one on the artefact that leaves the app.
 */

import { View, type ViewProps } from 'react-native';
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
  /** 間. The gap between the fields, and the displacement between them. */
  interval: 4,
  /** One field. Both are identical; only their position differs. */
  field: { width: 7, height: 14 },
  /** The left field's origin. The right one is derived, never written down. */
  origin: { x: 3, y: 3 },
} as const;

/** The two fields, in drawing order. Derived from {@link MARK}, so the equality cannot drift. */
export function markFields(): readonly { x: number; y: number; width: number; height: number }[] {
  const { interval, field, origin } = MARK;
  return [
    { x: origin.x, y: origin.y, ...field },
    // The gap AND the offset are the same `interval`. This line is the mark.
    { x: origin.x + field.width + interval, y: origin.y + interval, ...field },
  ];
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
  const rects = markFields()
    .map(
      (r) =>
        `<rect x="${String(r.x)}" y="${String(r.y)}" ` +
        `width="${String(r.width)}" height="${String(r.height)}" fill="${color}"/>`,
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" ` +
    `viewBox="0 0 ${String(MARK.grid)} ${String(MARK.grid)}">${rects}</svg>`
  );
}

/** How small the mark is allowed to be drawn. The brief's number, not a guess. */
export const MARK_MIN_SIZE = 16;

/**
 * The narrowest thing in the mark, at a given rendered size.
 *
 * The interval, not the field — the gap is what closes up first, and a mark whose gap has
 * closed is one rectangle. Exported so the test asserts a number rather than a screenshot.
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
 * Two `View`s rather than an SVG, so the UI package stays dependency-free. At these sizes there
 * is nothing an SVG would render that two absolutely-positioned rectangles do not.
 */
export function Mark({
  size = MARK_MIN_SIZE,
  color = 'foreground',
  label,
  ...rest
}: MarkProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const scale = size / MARK.grid;
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
      {markFields().map((r) => (
        <View
          key={`${String(r.x)}-${String(r.y)}`}
          style={{
            position: 'absolute',
            left: r.x * scale,
            top: r.y * scale,
            width: r.width * scale,
            height: r.height * scale,
            backgroundColor: fill,
          }}
        />
      ))}
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
 * F-146 widens this when Home actually leads at that size.
 */
export type WordmarkSize = Extract<keyof typeof nativeType.latin, 'display.2' | 'title'>;

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
