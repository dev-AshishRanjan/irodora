/**
 * The radar — four dimensions of a profile as one polygon over a ring grid (F-235, criterion 2;
 * mockup 17).
 *
 * `17` draws a diamond 91 dp across: six evenly spaced rings, spokes on both axes, a filled polygon
 * with an edge and a marker at each vertex, and a label beyond each axis's end — top, right, bottom,
 * left. Every number is `17`'s, recomputed by `charts.test`.
 *
 * - **Four axes, by type.** `17` draws four; three or five are refused at compile time.
 * - **The ink is the caller's**, typed to the neutrals that exist. `17` draws its vertices in two
 *   inks, blue and grey, and which colour the radar takes is OQ-24's (F-260). Edge, markers and fill
 *   take the one ink, the fill at the opacity `17`'s fill reads over its card.
 * - **The rings are `border.strong` and the spokes `border`**, as `17` draws them: a 1 px ring reads
 *   lighter than a 2 px spoke on the JPEG, which only a lighter ink does, since antialiasing darkens a
 *   thin line toward the card. Both are decorative: the labels name the axes and the name carries the
 *   values.
 * - **One accessible element**, an image named by its data — each axis's figure, which names its own
 *   quantity — joined by `, ` or, in Japanese, `、`. The drawing says nothing of its own.
 */

import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { nativeType } from '@irodora/design-tokens';
import { figureName, type Figure } from './figures.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** The chart's box, in dp: the outer ring's diamond, edge to edge. */
export const RADAR_SIZE = 91;
/** How many rings, evenly spaced from the centre to the outer one. */
export const RADAR_RINGS = 6;
/** A ring's stroke, in dp. */
export const RADAR_RING = 0.5;
/** A spoke's stroke, in dp. */
export const RADAR_SPOKE = 1;
/** The polygon's edge, in dp. */
export const RADAR_EDGE = 1.25;
/** A vertex marker's diameter, in dp. */
export const RADAR_MARKER = 4.5;
/** The polygon's fill, as an opacity of the ink. */
export const RADAR_FILL_OPACITY = 0.33;
/** From the chart's side to a side label's near edge, in dp. */
export const RADAR_LABEL_GAP = 0.5;
/** From the chart's top or bottom to the centre of the label beyond it, in dp. */
export const RADAR_LABEL_OUT = 6;

export interface RadarAxis {
  /** Printed beyond the axis's end: `Temperature`. */
  readonly label: string;
  /** Where the vertex sits on the axis, 0 at the centre to 1 at the outer ring. */
  readonly fraction: number;
  /** What the axis's value is, spoken: it names its own quantity (FR-61). */
  readonly figure: Figure;
}

export interface RadarProps {
  /** What the chart shows, said first: `Colour profile`. */
  readonly name: string;
  /** Top, right, bottom, left, as `17` draws them. */
  readonly axes: readonly [RadarAxis, RadarAxis, RadarAxis, RadarAxis];
  /** The polygon's ink. Which colour is OQ-24's (F-260). */
  readonly ink: 'foreground' | 'foreground.2';
  readonly script?: Script;
  readonly testID?: string;
}

const round = (v: number): string => String(Math.round(v * 1000) / 1000);

/** A diamond of this half-diagonal about the centre, top first, clockwise. */
function diamond(c: number, r: readonly [number, number, number, number]): string {
  const [top, right, bottom, left] = r;
  return `M${round(c)} ${round(c - top)}L${round(c + right)} ${round(c)}L${round(c)} ${round(c + bottom)}L${round(c - left)} ${round(c)}Z`;
}

/** The radar's spoken name. */
export function radarName(name: string, axes: RadarProps['axes'], script: Script): string {
  return `${name}: ${axes.map((axis) => figureName(axis.figure)).join(script === 'japanese' ? '、' : ', ')}`;
}

export function Radar({
  name,
  axes,
  ink,
  script = 'latin',
  testID,
}: RadarProps): React.JSX.Element {
  const { colors } = useTheme();
  for (const axis of axes) {
    if (!(axis.fraction >= 0 && axis.fraction <= 1)) {
      throw new RangeError(
        `Radar: ${axis.label}'s fraction must be 0 to 1, not ${String(axis.fraction)}`,
      );
    }
  }
  // The canvas reaches past the chart's box by half a marker, so a vertex on the outer ring is drawn
  // whole; the box, which the labels sit against, stays the chart's.
  const pad = RADAR_MARKER / 2;
  const canvas = RADAR_SIZE + 2 * pad;
  const c = canvas / 2;
  const outer = RADAR_SIZE / 2 - RADAR_RING;
  const [top, right, bottom, left] = axes;
  const reach = [
    top.fraction * outer,
    right.fraction * outer,
    bottom.fraction * outer,
    left.fraction * outer,
  ] as const;
  const vertices = [
    [c, c - reach[0]],
    [c + reach[1], c],
    [c, c + reach[2]],
    [c - reach[3], c],
  ] as const;
  // The label's line box is centred RADAR_LABEL_OUT beyond the chart's edge.
  const beyond = RADAR_LABEL_OUT - nativeType[script].caption.lineHeight / 2;
  // Every label is centred on its own lines, as `17` sets its two-line *Muted / Tolerance*.
  const label = (text: string): React.JSX.Element => (
    <Text size="caption" color="foreground.2" script={script} align="center">
      {text}
    </Text>
  );
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="image"
      accessibilityLabel={radarName(name, axes, script)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={{ maxWidth: RADAR_SIZE / 2, marginRight: RADAR_LABEL_GAP }}>
        {label(left.label)}
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={{ marginBottom: beyond }}>{label(top.label)}</View>
        <View style={{ width: RADAR_SIZE, height: RADAR_SIZE }}>
          {/* No default fill on the root: react-native-svg would inject black (FabricSwatch notes). */}
          <Svg
            width={canvas}
            height={canvas}
            fill="none"
            accessible={false}
            style={{ position: 'absolute', left: -pad, top: -pad }}
          >
            {Array.from({ length: RADAR_RINGS }, (_, i) => {
              const r = (outer * (i + 1)) / RADAR_RINGS;
              return (
                <Path
                  key={String(i)}
                  d={diamond(c, [r, r, r, r])}
                  fill="none"
                  stroke={colors['border.strong']}
                  strokeWidth={RADAR_RING}
                />
              );
            })}
            <Path
              d={`M${round(c)} ${round(c - outer)}V${round(c + outer)}M${round(c - outer)} ${round(c)}H${round(c + outer)}`}
              fill="none"
              stroke={colors.border}
              strokeWidth={RADAR_SPOKE}
            />
            <Path
              d={diamond(c, reach)}
              fill={colors[ink]}
              fillOpacity={RADAR_FILL_OPACITY}
              stroke={colors[ink]}
              strokeWidth={RADAR_EDGE}
              strokeLinejoin="round"
            />
            {vertices.map(([x, y], i) => (
              <Circle key={String(i)} cx={x} cy={y} r={RADAR_MARKER / 2} fill={colors[ink]} />
            ))}
          </Svg>
        </View>
        <View style={{ marginTop: beyond }}>{label(bottom.label)}</View>
      </View>
      <View style={{ maxWidth: RADAR_SIZE / 2, marginLeft: RADAR_LABEL_GAP }}>
        {label(right.label)}
      </View>
    </View>
  );
}
