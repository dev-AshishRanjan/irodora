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
 * ## The mark is 梅鉢 — a plum blossom, and a palette
 *
 * Five discs around a sixth, at the interval. It reads two ways at once and both are true:
 *
 * - a **kamon**, the Japanese tradition of geometric single-colour emblems — which is where
 *   "enterprise grade" actually comes from in this culture. Mitsubishi is three rhombi. Every
 *   great Japanese house mark is this: radial, precise, and a few hundred years old.
 * - **five colours arranged around a centre** — which is what this product does, said in the
 *   plainest way available. Adjacency and interval, the brief's own words, are what a rosette
 *   IS.
 *
 * And 梅 (plum) is a corpus colour family, in a corpus where most colours are named after
 * plants. The blossom is not decoration borrowed from Japan; it is the product's own subject.
 *
 * ## The geometry is two numbers, and everything else is derived
 *
 * `orbit` — how far a petal sits from the centre — and `interval`, which is the gap between two
 * neighbouring petals **and** the gap between a petal and the eye. One quantity, twice, exactly:
 * the petal radius is solved from it rather than chosen, so the two gaps cannot drift apart by a
 * later edit that moved something "to look better".
 *
 * That is F-141's idea — 間 (*ma*), the interval as the subject of the mark rather than the space
 * left over by it — kept, and finally given a figure that reads.
 *
 * ## In the app it is one colour. On the icon it is five
 *
 * The disqualifying line above is about **recognisability**, not about ink: a mark must not need
 * colour to be identified. This one does not — its silhouette is a rosette however it is filled,
 * and `brand.test.tsx` asserts exactly that by collapsing every fill to one and checking the
 * shape is unchanged. That is a stronger check than counting fills, which is what it replaces.
 *
 * So {@link Mark} — the one inside the app, in headers and the lockup — takes a single token and
 * stays monochrome, because the product's surfaces must not compete with the garment colours
 * they are judging. The **app icon** carries five corpus colours, because an icon that is the
 * only thing on a home screen has no such problem, and a colour product whose icon has no colour
 * was the thing that kept being reported as *"not relevant"*.
 * [ADR-0093](../../../docs/adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md).
 *
 * ## What the two earlier attempts got wrong
 *
 * Recorded because a redesign you cannot justify is one you should not make, and because the
 * same mistake was available twice.
 *
 * | attempt | what was wrong |
 * |---|---|
 * | F-141 — two offset rectangles | no closed silhouette; the idea (gap equals offset) was invisible without measuring; it read as a pause glyph; nothing in it was colour and nothing was Japanese |
 * | F-165 first pass — 彡, three 45° strokes | the story was right and the shape was not: three parallel slashes read as speed lines. **Both attempts were abstract geometric minimalism, and abstraction is what "not relevant" meant** — a person has to be able to see what the app is |
 *
 * | also rejected | because |
 * |---|---|
 * | a plain grid of swatches | excluded by the brief in as many words, and every colour app has one |
 * | a droplet, a hue wheel | the first is excluded; the second is what Adobe and everyone else uses |
 * | an aperture | says *camera*, which is one screen of this product rather than its subject |
 * | a drawn 彩 or 色 | a logo that is a single character is a wordmark in disguise, and opaque to anyone who does not read it |
 *
 * ## One geometry, two renderers
 *
 * {@link Mark} and {@link markSvg} both read {@link MARK} and neither carries its own numbers.
 * That is `cardSvg`'s arrangement one level smaller, and the reason is the same: two copies of a
 * geometry drift, and the copy that drifts is the one on the artefact that leaves the app.
 */

import { View, type ViewProps } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { nativeType } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';

/**
 * The mark, as data.
 *
 * A 24-unit grid because it divides by 2, 3, 4, 6 and 8, and because every mark this product has
 * drawn has used it — the grid is the one thing worth keeping across a redraw.
 *
 * **Only `orbit` and `interval` are chosen.** The petal radius and the eye radius are solved
 * below so that both gaps are exactly `interval`. Writing either radius here would be stating a
 * consequence as though it were a decision, and the next edit would move one of them.
 */
export const MARK = {
  /** The coordinate system everything below is expressed in. */
  grid: 24,
  /** How many petals. Five, because a plum blossom is five. */
  petals: 5,
  /** How far a petal's centre sits from the mark's centre. */
  orbit: 8,
  /**
   * 間. The gap between two neighbouring petals, AND the gap between a petal and the eye.
   *
   * One number used twice, and the radii are derived from it rather than beside it — so the two
   * gaps are equal by construction and cannot be separated by an edit that only looked at one.
   */
  interval: 3,
} as const;

/** The mark's centre, in grid units. */
const CENTRE = MARK.grid / 2;

/**
 * A petal's radius, SOLVED from the interval.
 *
 * Two neighbouring petals sit `2 · orbit · sin(π/n)` apart — the chord between their centres —
 * and the gap between their edges is that chord minus two radii. Setting the gap to `interval`
 * and rearranging gives this. It is not a number anybody picked.
 */
export const PETAL_RADIUS = (2 * MARK.orbit * Math.sin(Math.PI / MARK.petals) - MARK.interval) / 2;

/** The eye's radius, solved the same way: the gap from a petal's inner edge is the interval. */
export const EYE_RADIUS = MARK.orbit - PETAL_RADIUS - MARK.interval;

/** One disc of the mark. */
export interface MarkDisc {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  /** `eye` takes the ink; the petals take a colour each on the icon, and the ink in the app. */
  readonly role: 'eye' | 'petal';
}

/**
 * The six discs, in drawing order: the eye, then the petals clockwise from the top.
 *
 * The first petal points **up**. That is the only orientation choice in the mark, and it is the
 * one every kamon makes — a blossom with a petal at the top has an axis, and a blossom rotated
 * off it looks like a mistake nobody meant.
 */
export function markDiscs(): readonly MarkDisc[] {
  const petals = Array.from({ length: MARK.petals }, (_unused, i) => {
    // Measured from straight up, clockwise. Screen y grows downward, hence the sign.
    const angle = (i / MARK.petals) * 2 * Math.PI;
    return {
      cx: CENTRE + MARK.orbit * Math.sin(angle),
      cy: CENTRE - MARK.orbit * Math.cos(angle),
      r: PETAL_RADIUS,
      role: 'petal' as const,
    };
  });
  return [{ cx: CENTRE, cy: CENTRE, r: EYE_RADIUS, role: 'eye' as const }, ...petals];
}

/** How far the ink reaches from the centre, in grid units. The petals' outer edge. */
export function markReach(): number {
  return MARK.orbit + PETAL_RADIUS;
}

/**
 * A number as SVG writes it: enough places to be exact, none of them trailing.
 *
 * The geometry is irrational — a petal radius comes out of a sine — so the two renderers can
 * only agree if they round the same way. One formatter, used by both.
 */
export function svgNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * The mark as an SVG document.
 *
 * Exists for F-142: an app icon is a file, and a pipeline cannot render a React component into
 * one. A caller passes the colours, because the mark has none of its own.
 *
 * `ink` may be a single colour — the monochrome mark, which is what the brief's *"works in one
 * colour"* means and what the app itself draws — or one colour per petal, which is what the icon
 * uses. The eye always takes the first colour: it is the anchor, not one of the five.
 */
export function markSvg(
  ink: string | readonly string[],
  size: number = MARK.grid,
  eye?: string,
): string {
  const colors = typeof ink === 'string' ? [ink] : ink;

  /*
   * REFUSED RATHER THAN DEFAULTED, and the lint is what asked for it.
   *
   * The first version fell back to a black literal for an empty list, and `no-restricted-syntax`
   * refused the hex — correctly: *"a value typed here is checked by neither gate and is
   * indistinguishable from one that passed"*. The fix is not to import a token, which would give
   * the mark a colour of its own; it is that **a mark with no colour to draw in is a caller
   * error**, and inventing one would hide it behind a document that looked fine.
   */
  const anchor = eye ?? colors[0];
  if (anchor === undefined)
    throw new Error('markSvg needs at least one colour — the mark has none of its own');

  let petal = -1;

  const discs = markDiscs()
    .map((d) => {
      const fill =
        d.role === 'eye' ? anchor : ((petal += 1), colors[petal % colors.length] ?? anchor);
      return (
        `<circle cx="${svgNumber(d.cx)}" cy="${svgNumber(d.cy)}" ` +
        `r="${svgNumber(d.r)}" fill="${fill}"/>`
      );
    })
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" ` +
    `viewBox="0 0 ${String(MARK.grid)} ${String(MARK.grid)}">${discs}</svg>`
  );
}

/** How small the mark is allowed to be drawn. The brief's number, not a guess. */
export const MARK_MIN_SIZE = 16;

/**
 * The narrowest thing in the mark, at a given rendered size.
 *
 * The interval — which is the gap between petals and the gap around the eye, so one number
 * answers for both. A mark whose gaps have closed is a filled disc; the petals themselves are
 * twice as wide and would report a comfortable figure while the blossom stopped being one.
 */
export function narrowestFeature(size: number): number {
  return (MARK.interval / MARK.grid) * size;
}

export interface MarkProps extends Omit<ViewProps, 'style' | 'accessibilityRole'> {
  /** Rendered edge length. Defaults to the brief's floor. */
  readonly size?: number;
  /** Which foreground token every disc takes. The mark introduces no colour of its own. */
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
 * The mark, inside the app.
 *
 * **Monochrome, always.** Not a limitation of this component but the point of it: every surface
 * in this product is judged beside a garment colour, and a five-colour mark in a header would be
 * five colours competing with the one the person is trying to read. The icon is the one place
 * with nothing to compete with, and it is generated rather than rendered here.
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
        when none is given — a colour no token declared, which E-081 found the hard way on a card
        nobody had looked at. Every disc states its own.
      */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(MARK.grid)} ${String(MARK.grid)}`}
        fill="none"
        accessible={false}
      >
        {markDiscs().map((d) => (
          <Circle
            key={`${svgNumber(d.cx)}-${svgNumber(d.cy)}`}
            cx={svgNumber(d.cx)}
            cy={svgNumber(d.cy)}
            r={svgNumber(d.r)}
            fill={fill}
          />
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
