/**
 * A fabric sample with a pinked edge — `12`'s source colour in the add-garment flow (F-233).
 *
 * `12` draws the garment's colour as a swatch of cloth cut with pinking shears: the same square
 * sample as a `Swatch`, with its four edges toothed. The teeth are measured off the image
 * (`mockups/tools/pinking.mjs`): 12.7 px between tips and 5.3 px deep at 2 px per dp, so
 * {@link FABRIC_PITCH} and {@link FABRIC_TOOTH} below, recomputed by `fabric-swatch.test`.
 *
 * What a `Swatch` guarantees, this does too:
 * - **Its line keeps the edge.** The outline is stroked in the sample's line (`sampleEdge`,
 *   ADR-0116): the README keyline where it edges the sample, moved where it would not.
 * - **It says what it is.** One image, named with the colour's name, value and provenance.
 * - **Provenance is required** (ADR-0005): the prop is a `Color`.
 *
 * The woven texture the image draws inside the sample is not drawn: the sample is the colour
 * (R9 §4 E1), and a texture over it would change the colour a person judges.
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Color } from '@irodora/color-core';
import { sampleEdge } from './sampleInk.js';
import { swatchAccessibleName } from './Swatch.js';
import { useTheme } from './theme.js';

/** The sample's side in dp: `12.source.swatch`, the one pinked sample the mockups draw. */
export const FABRIC_SIZE = 83.5;

/** The distance between two tooth tips, in dp: 12.7 px at 2 px per dp, to the half dp. */
export const FABRIC_PITCH = 6.5;

/** How deep a tooth is, tip to valley, in dp: 5.3 px at 2 px per dp, to the half dp. */
export const FABRIC_TOOTH = 2.5;

/** Whether the pinked sample draws the README keyline: `12` binds it. */
export const FABRIC_KEYLINE = true;

/** The line's width in dp, as on every sample. */
const LINE = 1;

export interface FabricSwatchProps {
  /** The colour's name — never "swatch", never "colour". */
  readonly name: string;
  /** The rendered value. Derived by the engine at the call site, never typed by hand. */
  readonly hex: string;
  /** Carries provenance in its type. This is the ADR-0005 enforcement. */
  readonly color: Color;
  /** The sample's side in dp. Defaults to {@link FABRIC_SIZE}. */
  readonly size?: number;
  /** Whether the element draws the README keyline. Defaults to {@link FABRIC_KEYLINE}. */
  readonly keyline?: boolean;
  readonly testID?: string;
}

/** A point of the outline, and whether it is a tooth's tip or the valley between two. */
export interface PinkedPoint {
  readonly x: number;
  readonly y: number;
  readonly tip: boolean;
}

/**
 * The pinked outline of a square of side `size`, as points and as an SVG path.
 *
 * Each side carries as many whole teeth as fit at `pitch`, centred on it: tips on the box's edge,
 * valleys `tooth` in. Adjacent sides meet valley to valley, a short cut across each corner, as the
 * drawing does. The outline is inset by half the line, so the line it is stroked with stays inside
 * the box the element is drawn in.
 */
export function pinkedOutline(
  size: number,
  pitch: number = FABRIC_PITCH,
  tooth: number = FABRIC_TOOTH,
): { readonly points: readonly PinkedPoint[]; readonly d: string } {
  const lo = LINE / 2;
  const hi = size - LINE / 2;
  const run = hi - lo;
  const teeth = Math.max(1, Math.floor(run / pitch));
  const start = (run - teeth * pitch) / 2;
  // One side, walked from its first valley: `along` goes 0 → run, `inward` is the tooth's depth.
  const side = (
    at: (along: number, inward: number) => readonly [number, number],
  ): readonly PinkedPoint[] => {
    const out: PinkedPoint[] = [];
    for (let i = 0; i <= teeth; i += 1) {
      const [vx, vy] = at(start + i * pitch, tooth);
      out.push({ x: vx, y: vy, tip: false });
      if (i < teeth) {
        const [tx, ty] = at(start + (i + 0.5) * pitch, 0);
        out.push({ x: tx, y: ty, tip: true });
      }
    }
    return out;
  };
  const points = [
    ...side((a, n) => [lo + a, lo + n]), // top, left to right
    ...side((a, n) => [hi - n, lo + a]), // right, top to bottom
    ...side((a, n) => [hi - a, hi - n]), // bottom, right to left
    ...side((a, n) => [lo + n, hi - a]), // left, bottom to top
  ];
  const fixed = (v: number): string => String(Math.round(v * 1000) / 1000);
  const d = `${points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${fixed(p.x)} ${fixed(p.y)}`)
    .join(' ')} Z`;
  return { points, d };
}

export function FabricSwatch({
  name,
  hex,
  color,
  size = FABRIC_SIZE,
  keyline = FABRIC_KEYLINE,
  testID,
}: FabricSwatchProps): React.JSX.Element {
  const { colors } = useTheme();
  const edge = sampleEdge(hex, colors, keyline);
  const { d } = pinkedOutline(size);
  return (
    <View
      testID={testID}
      // One image with a full name. Not pressable: `12` draws it as the colour being added, and a
      // role it does not have is worse than none.
      accessible
      accessibilityRole="image"
      accessibilityLabel={swatchAccessibleName(name, hex, color)}
      style={{ width: size, height: size }}
    >
      {/*
        NO DEFAULT FILL on the root: react-native-svg injects `#000000` onto the root group when
        none is given, and the conformance scan reads it as a colour literal (as Glyph notes).
      */}
      <Svg width={size} height={size} fill="none" accessible={false}>
        <Path d={d} fill={hex} stroke={edge.hex} strokeWidth={LINE} strokeLinejoin="miter" />
      </Svg>
    </View>
  );
}
