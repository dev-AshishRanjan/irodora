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

import { useEffect, useId, useState } from 'react';
import {
  Platform,
  View,
  type LayoutChangeEvent,
  type TextLayoutEvent,
  type ViewProps,
} from 'react-native';
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
 * none of them a hue (ADR-0122).
 */
export const MARK_INKS = [
  'foreground',
  'foreground.2',
  'foreground.3',
  'inverse.foreground',
] as const satisfies readonly (keyof ThemeColors)[];

/**
 * C10's one tinted mark (F-236, ADR-0128 §3): `27`'s working state draws the mark in a lilac, and
 * this is the token minted for it. It is not one of {@link MARK_INKS}, which every other mark takes;
 * the mark census holds that `27.lens-working.mark` is the only mark among the chroma exceptions,
 * and `states.test` that one component draws it.
 */
export const MARK_TINT = 'state.mark' as const satisfies keyof ThemeColors;

export type MarkInk = (typeof MARK_INKS)[number] | typeof MARK_TINT;

export interface MarkProps extends Omit<ViewProps, 'style' | 'accessibilityRole'> {
  /** Rendered edge length of the grid. Defaults to the brief's floor. */
  readonly size?: number;
  /**
   * Which foreground token the mark takes. The mark introduces no colour of its own. `22` draws it
   * in the header in `text.tertiary`, which is `foreground.3` (F-234); `27`'s working state in
   * {@link MARK_TINT}, its one tint (C10).
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
 * Gelasio Regular's vertical metrics and the name's extent, in font units, as the bundled
 * `Gelasio-Regular.ttf` declares them — `apps/mobile/test/fonts.test.tsx` reads them again from its
 * tables.
 *
 * The ascender and descender are `hhea`'s, which equal `OS/2`'s typographic pair (the face sets
 * USE_TYPO_METRICS), so both platforms lay a line out from the same two numbers. "Irodora" is set at
 * no tracking (ADR-0112) and nothing kerns it: HarfBuzz shapes it to the sum of its seven advances.
 */
export const GELASIO = {
  unitsPerEm: 2048,
  ascender: 1900,
  descender: -700,
  /** "Irodora": its advance, and its ink from the first glyph's origin, y up. */
  name: { advance: 6892, inkLeft: 108, inkRight: 6860, inkTop: 1558, inkBottom: -29 },
} as const;

/**
 * Noto Sans JP's vertical metrics and its ideographic character face (`BASE`'s `icft` and `icfb`),
 * in font units.
 *
 * The tagline is the caller's copy, so its ink is not known here. A line of kanji and kana fills the
 * character face, which is what Japanese setting aligns to; `14`'s tagline reads within five units
 * of it (−70 to 832).
 */
export const GOTHIC = {
  unitsPerEm: 1000,
  ascender: 1160,
  descender: -288,
  faceTop: 827,
  faceBottom: -67,
} as const;

/**
 * The in-app lockup, `01`'s (C4, P5): the mark's ink width, and the interval from its ink to the
 * name's, each a ratio of the name's em (ADR-0123). `brand.test` recomputes both from
 * `01.header.mark` and `01.header.wordmark`.
 */
export const LOCKUP_APP = { markInk: 1.206, interval: 0.317 } as const;

/**
 * The splash lockup, `14`'s (C4, P2): the mark's ink width, the interval from its ink to the name's,
 * and from the name's ink to the tagline's — each a ratio of the name's em (ADR-0123), recomputed
 * by `brand.test` from `14.splash.mark`, `14.splash.wordmark` and `14.splash.tagline`.
 */
export const LOCKUP_SPLASH = {
  markInk: 2.508,
  markInterval: 0.545,
  taglineInterval: 0.266,
} as const;

/** The two lockups the mockups draw: `01`'s row on Home, and `14`'s stack on the splash. */
export type WordmarkForm = 'app' | 'splash';

/** A member's margins: what takes its box to its ink and puts the ink where the drawing has it. */
export interface LockupMargins {
  readonly marginTop: number;
  readonly marginRight: number;
  readonly marginBottom: number;
  readonly marginLeft: number;
}

/** Where a member's ink lies, dp from the figure's top (and, for the mark and the name, its left). */
export interface LockupInk {
  readonly top: number;
  readonly bottom: number;
  readonly left?: number;
  readonly right?: number;
}

/** A lockup at one scale: the mark's size, every member's margins, and where each one's ink lies. */
export interface LockupGeometry {
  readonly form: WordmarkForm;
  /** The mark's box, dp. */
  readonly mark: number;
  readonly markMargins: LockupMargins;
  readonly nameMargins: LockupMargins;
  /** The splash's tagline, centred, so its vertical margins only; `undefined` on `app`. */
  readonly taglineMargins: Pick<LockupMargins, 'marginTop' | 'marginBottom'> | undefined;
  readonly ink: {
    readonly mark: LockupInk;
    readonly name: LockupInk;
    readonly tagline: LockupInk | undefined;
  };
  /**
   * The figure's ink box, dp — the tagline's width excepted, which is its copy's, and its height for
   * one line of tagline. A wrapped tagline's box still ends at its last line's ink: each line sits in
   * its box as the first does.
   */
  readonly width: number;
  readonly height: number;
  /** The name's box (its advance), dp. */
  readonly nameBox: number;
}

/** The platform whose line placement a lockup's geometry follows. */
export type LockupPlatform = 'ios' | 'android';

/**
 * The baseline's distance from the top of a line box, where React Native 0.86 puts it.
 *
 * - **Android** (`CustomLineHeightSpan`): the CSS half-leading model — the leading, negative or not,
 *   split evenly above the face's ascent and below its descent.
 * - **iOS** (`RCTAttributedTextUtils.mm`, `RCTApplyBaselineOffsetForRange`): the same, but only
 *   where the line is at least the face's own (its ascent plus its descent; these faces carry no line
 *   gap). Below that no offset is applied, TextKit sets the glyphs on the line's foot — the baseline
 *   the face's descent above the bottom — and the top of a tall line is clipped by its frame.
 *
 * So a lockup's NAME is set at the serif's own line (`wordmark` and `wordmarkSplash` lead at 1.27,
 * ADR-0121 amended by F-230's review), where the two platforms agree and nothing is clipped; the
 * TAGLINE keeps `title`'s leading, under the gothic's own line, so its two placements differ by a dp
 * and each is computed.
 */
function baselineIn(
  face: { readonly unitsPerEm: number; readonly ascender: number; readonly descender: number },
  em: number,
  lineHeight: number,
  platform: LockupPlatform,
): number {
  const unit = em / face.unitsPerEm;
  const own = (face.ascender - face.descender) * unit;
  if (platform === 'ios' && lineHeight < own) return lineHeight + face.descender * unit;
  return (lineHeight - own) / 2 + face.ascender * unit;
}

/** This device's placement: iOS's, or Android's everywhere else. */
const PLATFORM: LockupPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * A lockup's geometry at a scale (ADR-0123).
 *
 * `scale` is the name's — the size the platform set it at over its step, which Dynamic Type and
 * Android's font scale move (A7) — and the mark and every interval follow it, so the lockup scales
 * as one figure. `taglineScale` is the tagline's own, which its own ramp sets; only its line metrics
 * follow it.
 *
 * **A Text's line box is not its ink.** Each member's margins take its box to its ink, from the
 * face's metrics above, so the figure's box IS its ink — a caller places the lockup where a mockup
 * draws it by the ink, the way every inventory records it — and the members' inks sit as `01` and
 * `14` draw them:
 *
 * - `app`: one row. The mark's ink, then the interval, then the name's ink, their centres on one
 *   line (`01` draws them 0.16 dp apart).
 * - `splash`: one column on one axis. The mark's ink, the interval, the name's ink, the interval,
 *   the tagline's ink.
 *
 * `platform` is whose line placement to follow ({@link baselineIn}); it defaults to this device's.
 * The jest tree has no layout, so the placement is React Native's source read rather than a render
 * measured: that it lands where computed is a device attestation.
 */
export function lockupGeometry(
  form: WordmarkForm,
  scale = 1,
  taglineScale = scale,
  platform: LockupPlatform = PLATFORM,
): LockupGeometry {
  const step = form === 'app' ? nativeType.latin.wordmark : nativeType.latin.wordmarkSplash;
  const em = step.fontSize * scale;
  const line = step.lineHeight * scale;
  const unit = em / GELASIO.unitsPerEm;
  const baseline = baselineIn(GELASIO, em, line, platform);
  const name = {
    top: baseline - GELASIO.name.inkTop * unit,
    bottom: baseline - GELASIO.name.inkBottom * unit,
    left: GELASIO.name.inkLeft * unit,
    right: GELASIO.name.inkRight * unit,
    advance: GELASIO.name.advance * unit,
  };
  const nameInkWidth = name.right - name.left;
  const nameInkHeight = name.bottom - name.top;

  // The mark is sized by its ink, which is narrower than its grid: the petals' sides fall short of
  // the edges, and the blossom's notch leaves the grid's foot empty.
  const box = markInkBox();
  const markInk = (form === 'app' ? LOCKUP_APP.markInk : LOCKUP_SPLASH.markInk) * em;
  const mark = (markInk * MARK.grid) / (box.right - box.left);
  const inMark = {
    left: (box.left / MARK.grid) * mark,
    top: (box.top / MARK.grid) * mark,
    right: (box.right / MARK.grid) * mark,
    bottom: (box.bottom / MARK.grid) * mark,
  };
  const markInkHeight = inMark.bottom - inMark.top;

  if (form === 'app') {
    const gap = LOCKUP_APP.interval * em;
    const height = Math.max(markInkHeight, nameInkHeight);
    const markTop = (height - markInkHeight) / 2;
    const nameTop = (height - nameInkHeight) / 2;
    return {
      form,
      mark,
      markMargins: {
        marginTop: markTop - inMark.top,
        marginRight: inMark.right - mark,
        marginBottom: height - (markTop - inMark.top) - mark,
        marginLeft: -inMark.left,
      },
      nameMargins: {
        marginTop: nameTop - name.top,
        marginRight: name.right - name.advance,
        marginBottom: height - (nameTop - name.top) - line,
        marginLeft: gap - name.left,
      },
      taglineMargins: undefined,
      ink: {
        mark: { top: markTop, bottom: markTop + markInkHeight, left: 0, right: markInk },
        name: {
          top: nameTop,
          bottom: nameTop + nameInkHeight,
          left: markInk + gap,
          right: markInk + gap + nameInkWidth,
        },
        tagline: undefined,
      },
      width: markInk + gap + nameInkWidth,
      height,
      nameBox: name.advance,
    };
  }

  const markGap = LOCKUP_SPLASH.markInterval * em;
  const taglineGap = LOCKUP_SPLASH.taglineInterval * em;
  const tagline = nativeType.japanese.title;
  const taglineEm = tagline.fontSize * taglineScale;
  const taglineLine = tagline.lineHeight * taglineScale;
  const taglineBaseline = baselineIn(GOTHIC, taglineEm, taglineLine, platform);
  const taglineUnit = taglineEm / GOTHIC.unitsPerEm;
  const taglineInk = {
    top: taglineBaseline - GOTHIC.faceTop * taglineUnit,
    bottom: taglineBaseline - GOTHIC.faceBottom * taglineUnit,
  };
  const width = Math.max(markInk, nameInkWidth);
  const nameTop = markInkHeight + markGap;
  const taglineTop = nameTop + nameInkHeight + taglineGap;
  return {
    form,
    mark,
    markMargins: {
      marginTop: -inMark.top,
      marginRight: inMark.right - mark,
      marginBottom: inMark.bottom - mark,
      marginLeft: -inMark.left,
    },
    nameMargins: {
      marginTop: markGap - name.top,
      marginRight: name.right - name.advance,
      marginBottom: name.bottom - line,
      marginLeft: -name.left,
    },
    taglineMargins: {
      marginTop: taglineGap - taglineInk.top,
      marginBottom: taglineInk.bottom - taglineLine,
    },
    ink: {
      mark: {
        top: 0,
        bottom: markInkHeight,
        left: (width - markInk) / 2,
        right: (width + markInk) / 2,
      },
      name: {
        top: nameTop,
        bottom: nameTop + nameInkHeight,
        left: (width - nameInkWidth) / 2,
        right: (width + nameInkWidth) / 2,
      },
      tagline: { top: taglineTop, bottom: taglineTop + (taglineInk.bottom - taglineInk.top) },
    },
    width,
    height: taglineTop + (taglineInk.bottom - taglineInk.top),
    nameBox: name.advance,
  };
}

/** The name's scale, from the width the platform laid its line out at (A7). */
export function nameScaleOf(form: WordmarkForm, lineWidth: number): number {
  const step = form === 'app' ? nativeType.latin.wordmark : nativeType.latin.wordmarkSplash;
  return lineWidth / ((GELASIO.name.advance / GELASIO.unitsPerEm) * step.fontSize);
}

/** The tagline's scale, from the height of its first line — its copy is the caller's, so not its width. */
export function taglineScaleOf(lineHeight: number): number {
  return lineHeight / nativeType.japanese.title.lineHeight;
}

/**
 * The widest the name's box may be in a lockup given `width`: the share of the figure the name
 * takes, so the figure at the name's scale fits the width (A7 without loss of content).
 */
export function nameBoxFor(form: WordmarkForm, width: number): number {
  const drawn = lockupGeometry(form);
  return (drawn.nameBox * width) / drawn.width;
}

interface AppLockupProps {
  readonly form: 'app';
  /** Announce the name as a heading: Home's header is one. */
  readonly heading?: boolean;
  readonly tagline?: never;
}

interface SplashLockupProps {
  readonly form: 'splash';
  /**
   * The line under the name, `14`'s 彩り・色の知性 — the caller's copy (ADR-0056), Japanese, set in
   * the gothic at `title` as `14.splash.tagline` records it.
   */
  readonly tagline: string;
  /** A splash is not a heading. */
  readonly heading?: never;
  /**
   * Draw the mark's place but not the mark (F-231): the launch overlay brings the native splash's
   * mark into the lockup itself, and a second mark fading in under the travelling one would show
   * the blossom twice. The figure's layout is unchanged — only the mark's ink is withheld.
   */
  readonly markHidden?: boolean;
  /**
   * The geometry the figure is laid out at, each time it changes — the scale moves it when a person
   * has enlarged text (A7). The launch overlay reads it to know where the mark will be.
   */
  readonly onGeometry?: (geometry: LockupGeometry) => void;
}

/** Which lockup, and what it carries. `size` is gone: each form's size is its drawing's. */
export type WordmarkProps = AppLockupProps | SplashLockupProps;

/** The scale a member was laid out at, kept only when it moves by more than rounding. */
function useScale(): [number, (next: number) => void] {
  const [scale, setScale] = useState(1);
  return [
    scale,
    (next: number) => {
      if (Number.isFinite(next) && next > 0 && Math.abs(next - scale) > 0.001) setScale(next);
    },
  ];
}

/**
 * The lockup: the mark, the name and, on the splash, the tagline — `01`'s row or `14`'s stack (C4),
 * drawn as one figure whose box is its ink ({@link lockupGeometry}, ADR-0123).
 *
 * **The name is measured type** (ADR-0121): `wordmark` in the row and `wordmarkSplash` in the stack,
 * the sizes `01` and `14` draw it at — the only component that may read either step. The mark and
 * the intervals are ratios of that em, so they are the drawing's at the default text size.
 *
 * **It scales as one figure** (A7). The platform sets the name larger when a person has enlarged
 * text — along iOS's Large Title ramp, or Android's font scale — and the name's laid-out line says
 * by how much; the mark and the intervals follow it. The first frame is the drawing's, exact at the
 * default size, so nothing moves unless a person has enlarged text.
 *
 * **It fits the width it is given** (A7: 200 % without loss of content). The name is one line that
 * the platform shrinks rather than breaks or clips, so in the stack — where the name is the widest
 * member — the figure fits its column. In the row the name's box is held to its share of the width
 * the row is given, so the mark and the interval beside it fit too. The row takes its column's width
 * to measure it: both drawn placements are columns.
 *
 * ## The name is set type, not drawn letterforms
 *
 * A drawn wordmark is the usual answer for a wordmark-led identity, and it is out of reach: React
 * Native has no path-text and this product has no type designer. Setting the name in the mockups'
 * serif — Gelasio, at the weight and tracking measured against `01`'s and `14`'s drawn wordmarks
 * (ADR-0112) — is honest and reversible: a drawn wordmark can replace it without touching the
 * lockup, whose rule is about the figure's proportions, not the glyphs.
 *
 * The mark carries no label here. The word beside it is real text, so a screen reader already says
 * "Irodora"; labelling the mark as well would say it twice.
 */
export function Wordmark(props: WordmarkProps): React.JSX.Element {
  const { form } = props;
  const [scale, setNameScale] = useScale();
  const [taglineScale, setTaglineScale] = useScale();
  const [given, setGiven] = useState<number | undefined>(undefined);
  const g = lockupGeometry(form, scale, taglineScale);
  const onGeometry = props.form === 'splash' ? props.onGeometry : undefined;
  useEffect(() => {
    onGeometry?.(lockupGeometry(form, scale, taglineScale));
  }, [onGeometry, form, scale, taglineScale]);

  const mark = (
    <View
      style={[
        g.markMargins,
        props.form === 'splash' && props.markHidden === true ? { opacity: 0 } : null,
      ]}
    >
      <Mark size={g.mark} />
    </View>
  );
  const nameLayout = {
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    onTextLayout: (event: TextLayoutEvent) => {
      const line = event.nativeEvent.lines[0];
      if (line !== undefined) setNameScale(nameScaleOf(form, line.width));
    },
  } as const;

  if (props.form === 'app')
    return (
      <View
        // The width the row is given, which its name's share is held to.
        onLayout={(event: LayoutChangeEvent) => {
          setGiven(event.nativeEvent.layout.width);
        }}
        style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start' }}
      >
        {mark}
        <View
          style={{
            ...g.nameMargins,
            ...(given === undefined ? {} : { maxWidth: nameBoxFor(form, given) }),
          }}
        >
          {/*
            LATIN IN BOTH LOCALES, and in the serif (ADR-0112): the product is called Irodora in
            both, so the name is set as Latin text, and the brand face wins over the page's script.
          */}
          <Text
            size="wordmark"
            face="serif"
            color="foreground"
            heading={props.heading ?? false}
            {...nameLayout}
          >
            Irodora
          </Text>
        </View>
      </View>
    );

  return (
    <View style={{ alignItems: 'center' }}>
      {mark}
      <View style={g.nameMargins}>
        <Text size="wordmarkSplash" face="serif" color="foreground" {...nameLayout}>
          Irodora
        </Text>
      </View>
      <View style={g.taglineMargins}>
        <Text
          size="title"
          script="japanese"
          face="gothic"
          weight={400}
          color="foreground"
          align="center"
          onTextLayout={(event: TextLayoutEvent) => {
            const line = event.nativeEvent.lines[0];
            if (line !== undefined) setTaglineScale(taglineScaleOf(line.height));
          }}
        >
          {props.tagline}
        </Text>
      </View>
    </View>
  );
}
