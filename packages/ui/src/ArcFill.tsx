/**
 * The filled part of an arc whose LENGTH is the reading — the progress ring's and the coverage
 * dial's (F-266, ADR-0133 §4).
 *
 * It is drawn once, as the arc's whole span, and a dash shows the share: with `strokeDasharray`
 * `[L, L]` and `strokeDashoffset` `L·(1 − v)`, the dash covers exactly the first `L·v` of the path,
 * from its start. So a change of value moves one number, the dash offset, and never the path, the
 * ink or the layout.
 *
 * - **A length, never a colour.** The manifest admits `strokeDashoffset` as an animated prop
 *   (`motion.animatableLength`), and nothing else here moves. `verify-motion` reads the worklet.
 * - **It moves when the value changes, never when it mounts** (`useValueMotion`, `view`, `inOut`),
 *   and under reduced motion it lands at once.
 * - **No dot at zero.** A zero-length dash with round caps paints a dot, a value nobody computed, so
 *   at 0 the fill's opacity is 0.
 * - **The worklet captures a shared value and a number**, nothing else, so a test can advance time
 *   through it (E-069).
 */

import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { sweepLength, sweepPath } from './arcPath.js';
import { type DurationStep, useValueMotion } from './motion.js';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ArcFillProps {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  /** Where the arc starts: degrees clockwise from 12 o'clock. */
  readonly from: number;
  /** The arc's whole span, in degrees: what a value of 1 fills. */
  readonly sweep: number;
  /** How much of the span is filled, 0 to 1. The caller validates it before drawing. */
  readonly value: number;
  /** The fill's ink, already painted by the caller's theme. */
  readonly color: string;
  readonly strokeWidth: number;
  /** How long a change of value takes to arrive: a step, never milliseconds. `view` by default. */
  readonly step?: DurationStep;
  readonly testID?: string;
}

export function ArcFill({
  cx,
  cy,
  r,
  from,
  sweep,
  value,
  color,
  strokeWidth,
  step = 'view',
  testID,
}: ArcFillProps): React.JSX.Element {
  const length = sweepLength(r, sweep);
  const shown = useValueMotion(value, step);
  // CLAMPED (F-266's review, M14): an easing that overshot would put the offset past `L` and draw a
  // dash at the arc's far end. Today's beziers do not overshoot; the arithmetic does not rely on it.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - Math.min(1, Math.max(0, shown.value))),
    opacity: shown.value > 0 ? 1 : 0,
  }));
  return (
    <AnimatedPath
      {...(testID === undefined ? {} : { testID })}
      d={sweepPath(cx, cy, r, from, sweep)}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
}
