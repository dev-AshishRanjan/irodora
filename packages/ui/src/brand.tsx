/**
 * The mark and the wordmark (F-141, F-165, F-230, FR-69).
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
 * ## The mark is mockup 14's 梅鉢 (F-230, ADR-0122)
 *
 * C4 takes the mark from `14`. Measured off its splash (`mark-fit.mjs`, calibrated through a JPEG
 * to 0.3 px) it is: **five tangent petals over a hub filled to their tangency, the first petal
 * straight up; a ring cut around a centre disc; a stamen cut along each petal; a seam cut along
 * each notch, from the ring to the edge.** Every cut is a hole — the surface beneath shows through
 * it — so the mark is ONE ink on any surface, the icon included (ADR-0122, superseding ADR-0093).
 *
 * It is still a kamon — radial, precise, one colour — and 梅 is still a corpus colour family, in a
 * corpus where most colours are named after plants. What changed is that the drawing now decides
 * its proportions, rather than F-165's two chosen numbers.
 *
 * ## The geometry is the drawing's, and the rest is derived
 *
 * {@link MARK} holds the reach (the blossom fills its grid: the top petal touches the edge) and
 * the five cut scalars `14` draws, each as its splash reading over the reach. The petals are
 * TANGENT, as `14` draws them (0.06 px from touching), so their radius and their orbit follow
 * from the reach alone, and the hub is their tangency radius. `brand.test` recomputes every field
 * from `14.splash.mark`'s readings, with F-165's mark, four petals, six and no ring as decoys.
 *
 * ## What the earlier attempts got wrong
 *
 * | attempt | what was wrong |
 * |---|---|
 * | F-141 — two offset rectangles | no closed silhouette; read as a pause glyph |
 * | F-165 first pass — 彡, three 45° strokes | three parallel slashes read as speed lines |
 * | F-165 — six discs at one interval (ADR-0093) | a blossom of its own, not `14`'s; and five corpus colours on the icon, which `14` draws in one ink |
 *
 * ## One geometry, three renderers
 *
 * {@link Mark}, {@link markSvg} and `scripts/generate-brand-assets.mjs` all read {@link MARK}.
 * The generator cannot import this file (it imports React Native), so it parses the block and
 * writes the shapes it derives to `apps/mobile/assets/brand/mark-geometry.json`; `brand.test`
 * requires {@link markShapes} to equal that file, so the two derivations cannot drift.
 */

import { useId } from 'react';
import { View, type ViewProps } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { nativeType } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';
import { Text } from './Text.js';

/**
 * The mark, as data: a 24-unit grid, the reach, and the five cuts `14` draws.
 *
 * Each cut is `14.splash.mark`'s reading in px times the reach over the petals' measured reach
 * (`orbitPx + petalPx`, 57.13 px), to two places — what `brand.test` recomputes.
 */
export const MARK = {
  /** The coordinate system everything below is expressed in. */
  grid: 24,
  /** How many petals. Five, because a plum blossom is five — and `14` draws five. */
  petals: 5,
  /** How far the petals reach from the centre: half the grid, so the top petal touches its edge. */
  reach: 12,
  /** The centre disc's radius. */
  eye: 2.06,
  /** Where the ring cut around the eye ends. */
  ringOuter: 2.49,
  /** Where each stamen cut ends, along its petal. */
  stamenOuter: 5.92,
  /** A stamen cut's width. */
  stamenWidth: 0.48,
  /** A seam cut's width, along each notch from the ring to the edge. */
  seamWidth: 0.54,
} as const;

/** Half the angle between two petals. */
const HALF_STEP = Math.PI / MARK.petals;
/** How far a petal's centre sits from the mark's centre: the petals are tangent, and reach `reach`. */
export const MARK_ORBIT = MARK.reach / (1 + Math.sin(HALF_STEP));
/** A petal's radius: tangent to its neighbours. */
export const MARK_PETAL = MARK_ORBIT * Math.sin(HALF_STEP);
/** The hub's radius: the blossom is filled out to where its petals touch. */
export const MARK_HUB = MARK_ORBIT * Math.cos(HALF_STEP);

/** The mark's centre, in grid units. */
const CENTRE = MARK.grid / 2;

/** A unit vector `deg` clockwise from straight up, in grid axes (y down). */
const towards = (deg: number): readonly [number, number] => [
  Math.sin((deg * Math.PI) / 180),
  -Math.cos((deg * Math.PI) / 180),
];

/** A cut from the ring outward: a stamen (along a petal) or a seam (along a notch). */
export interface MarkCut {
  /** Degrees clockwise from straight up. */
  readonly angle: number;
  readonly width: number;
  /** Where it ends, from the centre; a seam runs past the reach. */
  readonly outer: number;
}

/** The mark's shapes, in grid units. */
export interface MarkShapes {
  readonly centre: number;
  readonly petals: readonly { readonly cx: number; readonly cy: number; readonly r: number }[];
  readonly hub: number;
  readonly eye: number;
  readonly ringOuter: number;
  readonly stamens: readonly MarkCut[];
  readonly seams: readonly MarkCut[];
}

/**
 * The mark's shapes: the ink is the petals and the hub; the ring, the stamens and the seams are cut
 * out of it. The first petal points **up** — the one orientation choice, and the one every kamon
 * makes.
 */
export function markShapes(): MarkShapes {
  const step = 360 / MARK.petals;
  const petals = Array.from({ length: MARK.petals }, (_unused, i) => {
    const [ex, ey] = towards(i * step);
    return { cx: CENTRE + MARK_ORBIT * ex, cy: CENTRE + MARK_ORBIT * ey, r: MARK_PETAL };
  });
  return {
    centre: CENTRE,
    petals,
    hub: MARK_HUB,
    eye: MARK.eye,
    ringOuter: MARK.ringOuter,
    stamens: Array.from({ length: MARK.petals }, (_unused, i) => ({
      angle: i * step,
      width: MARK.stamenWidth,
      outer: MARK.stamenOuter,
    })),
    seams: Array.from({ length: MARK.petals }, (_unused, i) => ({
      angle: i * step + step / 2,
      width: MARK.seamWidth,
      outer: MARK.reach + 1,
    })),
  };
}

/**
 * Whether the grid point (u, v) is ink: inside a petal or the hub, and in no cut.
 *
 * The point test every renderer agrees with. A cut is the set of points past the ring, within half
 * its width of its centre line, and before its end — which is exactly the region the SVG clip path
 * below cuts, its inner edge an arc of the ring, so no cut overlaps another and evenodd holds.
 */
export function markCovers(u: number, v: number): boolean {
  const shapes = markShapes();
  const dx = u - shapes.centre;
  const dy = v - shapes.centre;
  const r = Math.hypot(dx, dy);
  const filled =
    r <= shapes.hub || shapes.petals.some((p) => Math.hypot(u - p.cx, v - p.cy) <= p.r);
  if (!filled) return false;
  if (r > shapes.eye && r < shapes.ringOuter) return false;
  const inCut = (cut: MarkCut): boolean => {
    const [ex, ey] = towards(cut.angle);
    const along = dx * ex + dy * ey;
    const across = Math.abs(-dx * ey + dy * ex);
    return r >= shapes.ringOuter && along > 0 && along <= cut.outer && across <= cut.width / 2;
  };
  return !shapes.stamens.some(inCut) && !shapes.seams.some(inCut);
}

/** The mark's ink box, in grid units: the blossom is not symmetric top to bottom. */
export function markInkBox(): {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
} {
  const { petals } = markShapes();
  return {
    left: Math.min(...petals.map((p) => p.cx - p.r)),
    top: Math.min(...petals.map((p) => p.cy - p.r)),
    right: Math.max(...petals.map((p) => p.cx + p.r)),
    bottom: Math.max(...petals.map((p) => p.cy + p.r)),
  };
}

/** How far the ink reaches from the centre, in grid units. */
export function markReach(): number {
  return MARK.reach;
}

/**
 * A number as SVG writes it: enough places to be exact, none of them trailing.
 *
 * The geometry is irrational — a petal radius comes out of a sine — so the renderers can only agree
 * if they round the same way. One formatter, used by all of them.
 */
export function svgNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** One cut's outline: an arc of the ring, then straight out to its end. */
function cutPath(cut: MarkCut, ring: number): string {
  const [ex, ey] = towards(cut.angle);
  const [px, py] = [-ey, ex];
  const half = cut.width / 2;
  const reach = Math.sqrt(ring * ring - half * half);
  const point = (along: number, across: number): string =>
    `${svgNumber(CENTRE + along * ex + across * px)} ${svgNumber(CENTRE + along * ey + across * py)}`;
  return (
    `M${point(cut.outer, -half)}L${point(reach, -half)}` +
    `A${svgNumber(ring)} ${svgNumber(ring)} 0 0 1 ${point(reach, half)}` +
    `L${point(cut.outer, half)}Z`
  );
}

/** A circle as a path, so it can join an evenodd clip. */
function circlePath(r: number): string {
  const d = svgNumber(r);
  return (
    `M${svgNumber(CENTRE + r)} ${svgNumber(CENTRE)}A${d} ${d} 0 1 0 ${svgNumber(CENTRE - r)} ${svgNumber(CENTRE)}` +
    `A${d} ${d} 0 1 0 ${svgNumber(CENTRE + r)} ${svgNumber(CENTRE)}Z`
  );
}

/**
 * The region the mark is clipped to, as one evenodd path: the grid, less the ring (its outer circle
 * and the eye's circle), less every stamen and seam. No two cuts overlap — each starts on the ring's
 * arc — so evenodd removes each exactly once.
 */
export function markClipPath(): string {
  const shapes = markShapes();
  return [
    `M-1 -1H${String(MARK.grid + 1)}V${String(MARK.grid + 1)}H-1Z`,
    circlePath(shapes.ringOuter),
    circlePath(shapes.eye),
    ...shapes.stamens.map((cut) => cutPath(cut, shapes.ringOuter)),
    ...shapes.seams.map((cut) => cutPath(cut, shapes.ringOuter)),
  ].join('');
}

/**
 * The mark as an SVG document.
 *
 * Exists for F-142: an app icon is a file, and a pipeline cannot render a React component into
 * one. A caller passes the ink, because the mark has none of its own.
 *
 * **One ink, by type** (ADR-0122, superseding ADR-0093's five-colour icon): a list of colours does
 * not compile. The cuts are a clip path, never a second fill.
 */
export function markSvg(ink: string, size: number = MARK.grid): string {
  /*
   * REFUSED RATHER THAN DEFAULTED, and the lint is what asked for it: a mark with no colour to draw
   * in is a caller error, and inventing one would hide it behind a document that looked fine.
   */
  if (ink.trim() === '') throw new Error('markSvg needs a colour — the mark has none of its own');
  const shapes = markShapes();
  const discs = [...shapes.petals, { cx: shapes.centre, cy: shapes.centre, r: shapes.hub }]
    .map(
      (d) =>
        `<circle cx="${svgNumber(d.cx)}" cy="${svgNumber(d.cy)}" r="${svgNumber(d.r)}" fill="${ink}"/>`,
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" ` +
    `viewBox="0 0 ${String(MARK.grid)} ${String(MARK.grid)}">` +
    `<defs><clipPath id="mark-cuts"><path d="${markClipPath()}" clip-rule="evenodd"/></clipPath></defs>` +
    `<g clip-path="url(#mark-cuts)">${discs}</g></svg>`
  );
}

/** How small the mark is allowed to be drawn. The brief's number, not a guess. */
export const MARK_MIN_SIZE = 16;

/**
 * The narrowest cut, at a given rendered size: the ring's width, a stamen's or a seam's.
 *
 * Below a pixel the cuts are not drawn by any rasteriser, and the mark is its five lobes —
 * `brand.test` claims only that at 16 px.
 */
export function narrowestFeature(size: number): number {
  return (Math.min(MARK.ringOuter - MARK.eye, MARK.stamenWidth, MARK.seamWidth) / MARK.grid) * size;
}

/**
 * The tokens the mark may be drawn in: the neutral foregrounds and their inverse. One ink each, and
 * none of them a hue (ADR-0122). 27's tinted loading mark is the one declared exception, and F-236
 * adds its token here when it mints it.
 */
export const MARK_INKS = [
  'foreground',
  'foreground.2',
  'foreground.3',
  'inverse.foreground',
] as const satisfies readonly (keyof ThemeColors)[];
export type MarkInk = (typeof MARK_INKS)[number];

export interface MarkProps extends Omit<ViewProps, 'style' | 'accessibilityRole'> {
  /** Rendered edge length of the grid. Defaults to the brief's floor. */
  readonly size?: number;
  /**
   * Which foreground token the mark takes. The mark introduces no colour of its own. `22` draws it
   * in the header in `text.tertiary`, which is `foreground.3` (F-234).
   */
  readonly color?: MarkInk;
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
 * **Monochrome, always** (ADR-0122): every surface in this product is judged beside a garment
 * colour, and the mark is one ink everywhere. Its cuts are a clip path, so the surface shows
 * through them.
 */
export function Mark({
  size = MARK_MIN_SIZE,
  color = 'foreground',
  label,
  ...rest
}: MarkProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const fill = colors[color];
  const shapes = markShapes();
  // One clip per mark on the page: an id shared by two marks would clip one by the other.
  const clip = `mark-cuts${useId().replace(/[^a-zA-Z0-9]/gu, '')}`;

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
        when none is given — a colour no token declared. Every shape states its own, and the clip's
        path is geometry, never painted.
      */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(MARK.grid)} ${String(MARK.grid)}`}
        fill="none"
        accessible={false}
      >
        <Defs>
          <ClipPath id={clip}>
            <Path d={markClipPath()} clipRule="evenodd" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clip})`} fill="none">
          {[...shapes.petals, { cx: shapes.centre, cy: shapes.centre, r: shapes.hub }].map((d) => (
            <Circle
              key={`${svgNumber(d.cx)}-${svgNumber(d.cy)}-${svgNumber(d.r)}`}
              cx={svgNumber(d.cx)}
              cy={svgNumber(d.cy)}
              r={svgNumber(d.r)}
              fill={fill}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

/**
 * The type steps the wordmark may be set at.
 *
 * **`display1` (72 px) was once deliberately absent, and the gate is why.** The first draft listed it
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
export type WordmarkSize = Extract<keyof typeof nativeType.latin, 'display1' | 'title'>;

export interface WordmarkProps {
  readonly size?: WordmarkSize;
  /** Announce as a heading. A splash is not a heading; a screen header is. */
  readonly heading?: boolean;
}

/**
 * The lockup: the mark, the interval, the name.
 *
 * The gap between them is F-165's, scaled to the type step, until F-230's increment 6 sets the
 * gap `01` draws.
 *
 * The mark is sized to the step's font size rather than its line height. Line height carries
 * leading, which is space around the letters rather than the letters themselves, and matching
 * it would leave the mark visibly larger than the word beside it.
 *
 * ## The name is set type, not drawn letterforms
 *
 * A drawn wordmark is the usual answer for a wordmark-led identity, and it is out of reach:
 * React Native has no path-text and this product has no type designer. Setting the name from
 * the scale in the mockups' serif — Gelasio, at the weight and tracking measured against 01's
 * and 14's drawn wordmarks (ADR-0112) — is honest and reversible — a drawn wordmark can replace this
 * without touching the lockup rule, because the rule is about the interval and not the glyphs.
 *
 * The mark carries no label here. The word beside it is real text, so a screen reader already
 * says "Irodora"; labelling the mark as well would say it twice.
 */
export function Wordmark({
  size = 'title',
  heading = false,
}: WordmarkProps = {}): React.JSX.Element {
  const step = nativeType.latin[size].fontSize;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        // F-165's gap, three grid units in 24, until increment 6 sets 01's measured one.
        gap: (3 / MARK.grid) * step,
      }}
    >
      <Mark size={step} />
      {/*
        LATIN IN BOTH LOCALES, and in the serif (ADR-0112). The product is called Irodora in both
        (a name is not translated), so the name is set as Latin text. Until F-226 the page script
        was threaded through for its leading; once the name is set in the serif, a Japanese script
        would route it to the gothic (C6, the rule for kanji in a serif element), so the brand
        face wins over the page leading, and the prop is gone.
      */}
      <Text size={size} color="foreground" heading={heading} face="serif">
        Irodora
      </Text>
    </View>
  );
}
