/**
 * A progress ring — how far a process has got, as an arc, with a mark at its centre (F-236; mockup
 * 27, `27.lens-working.progress`).
 *
 * `27` draws it in the Lens's working state: a full circle in `level3` and, over it, an arc in
 * `text.primary` from 12 o'clock clockwise, round at both ends, the tinted mark and its glow inside.
 * Its size and stroke are `27`'s at the board's scale (`STATE_RING`).
 *
 * - **The value is an arc length, never a colour.** The track and the fill are one ink each at every
 *   value; how far round the fill reaches is the reading (golden rule 13 — length is the channel).
 *   Nothing else moves with the value.
 * - **It is a `progressbar`** with a label and a value, where `ProgressBar` is decorative: the ring
 *   is the working state's own reading, and a person must be able to be told how far it has got. It
 *   is `busy` until it is full.
 * - **The value is the caller's, and a real one** (ADR-0128 D4): the Lens passes the share of its
 *   pipeline's steps done. `27`'s 61 % is sample content (E1), and nothing here draws a value nobody
 *   computed.
 * - **It moves when the value changes, never when it mounts** (F-266, ADR-0133 §3, §4). The fill is
 *   an `ArcFill`: the whole circle drawn once from 12 o'clock, its dash showing the share and moving
 *   over `view`. The spoken value changes at once. On today's Lens the value is 0 for the card's
 *   whole life (ADR-0128 D4), so the ring is still there: no spinner is drawn for a value nobody
 *   computed (ADR-0133 §5).
 */

import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ArcFill } from './ArcFill.js';
import { STATE_RING } from './stateBoard.js';
import { useTheme } from './theme.js';

export interface ProgressRingProps {
  /** How far, from 0 to 1. Anything else is a RangeError: a ring never draws a guess. */
  readonly value: number;
  /** What is in progress — the ring's accessible name. */
  readonly label: string;
  /** The value as words, read after the name: the caller's catalogue text (*Step 1 of 2*). */
  readonly valueText: string;
  /** Outer diameter, in dp. Defaults to `27`'s. */
  readonly size?: number;
  /** The line's width, in dp. Defaults to `27`'s. */
  readonly stroke?: number;
  /** What sits at the centre: `27`'s mark and its glow. Decorative; the ring is what is read. */
  readonly children?: React.ReactNode;
  readonly testID?: string;
}

export function ProgressRing({
  value,
  label,
  valueText,
  size = STATE_RING.size,
  stroke = STATE_RING.stroke,
  children,
  testID,
}: ProgressRingProps): React.JSX.Element {
  const { colors } = useTheme();
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`ProgressRing: value ${String(value)} is not a fraction in [0, 1]`);
  const c = size / 2;
  const r = (size - stroke) / 2;
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: valueText }}
      accessibilityState={{ busy: value < 1 }}
      style={{ width: size, height: size }}
    >
      {/* No default fill on the root: react-native-svg would inject black (FabricSwatch notes). */}
      <Svg width={size} height={size} fill="none" accessible={false}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={colors['surface.3']} strokeWidth={stroke} />
        {/* The fill, always mounted so a change from 0 can move; at 0 it is not drawn (no dot). */}
        <ArcFill
          {...(testID === undefined ? {} : { testID: `${testID}.fill` })}
          cx={c}
          cy={c}
          r={r}
          from={0}
          sweep={360}
          value={value}
          color={colors.foreground}
          strokeWidth={stroke}
        />
      </Svg>
      {children === undefined ? null : (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          {children}
        </View>
      )}
    </View>
  );
}
