/**
 * Motion, as a typed API over the manifest — and the one rule it exists to keep.
 *
 * ## The rule
 *
 * **Motion may never move a colour.** The intermediate frames of a colour transition are
 * plausible colours that never existed, so a user watching a swatch cross-fade reads a value
 * the engine never produced. For a product whose entire claim is *this is what colour that
 * is*, that is a correctness defect rather than a polish one. `motion.animatable` states the
 * same rule positively — `opacity` and `transform`, nothing else — and
 * `scripts/verify-motion.mjs` enforces it on source that this module cannot reach.
 *
 * ## Why reanimated rather than React Native's own `Animated`
 *
 * Not preference. `heroui-native` declares `react-native-reanimated` as a **required** peer —
 * its `peerDependenciesMeta` marks three peers optional and reanimated is not among them — so
 * reanimated is already unavoidable in every tree that renders this package. And HeroUI's
 * Dialog and Popover take their timing as reanimated `Keyframe`s: there is no other way to
 * give an overlay our durations. `Animated` would mean two animation engines in one app and
 * would still leave the overlays on somebody else's 200ms.
 *
 * ## Why reduced motion reads `AccessibilityInfo` and not `useReducedMotion`
 *
 * Reanimated ships `useReducedMotion()`, and it initialises from module state at import —
 * which makes it very hard to drive from a test. F-144's acceptance criterion says reduced
 * motion is **"asserted rather than described"**, so the mechanism has to be one a test can
 * turn on and off. `AccessibilityInfo` is the platform API reanimated itself reads, and it is
 * fully drivable. `ReduceMotion.System` is passed to every animation as well; that is defence
 * in depth, and the hook below is the part that is checked.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { nativeMotion, nativeSpacing } from '@irodora/design-tokens';

/**
 * The three durations, as a union derived from the manifest.
 *
 * `micro` (120) is a state change on one control. `local` (180) is something appearing or
 * leaving within a screen. `view` (260) is a whole screen replacing another. Nothing else is
 * expressible, which is the point: a duration is a design decision, and the scale is where
 * design decisions live.
 */
export type DurationStep = keyof typeof nativeMotion.durations;

/** The two easings, likewise. `out` decelerates into rest; `inOut` is for a value in motion. */
export type EasingName = keyof typeof nativeMotion.easing;

/** The manifest's easing as reanimated's bezier. Read from the tokens, never re-typed here. */
function bezier(name: EasingName): ReturnType<typeof Easing.bezier> {
  const [a, b, c, d] = nativeMotion.easing[name];
  return Easing.bezier(a, b, c, d);
}

/**
 * How long a staggered list entrance waits per row, and where the stagger stops.
 *
 * A 120-row Atlas staggered at 60ms would take seven seconds to finish, which is not an
 * entrance — it is a loading screen the product does not need. After {@link STAGGER_CAP} rows
 * everything appears together, and that is correct rather than a compromise: by then the rows
 * are below the fold and nobody is watching them arrive.
 */
const STAGGER_STEP = nativeMotion.durations.micro / 2;
const STAGGER_CAP = 6;

/** How far an entering element rises, in pixels — one step of the spacing scale, not a number. */
const RISE = nativeSpacing.md;

export interface MotionValues {
  /** Whether the platform is asking for reduced motion right now. */
  readonly reduced: boolean;
  /** A duration in milliseconds. **Zero for every step when {@link reduced}.** */
  readonly duration: (step: DurationStep) => number;
  /** A ready `withTiming` config — duration, easing and the reduced-motion escape together. */
  readonly timing: (step: DurationStep, easing?: EasingName) => WithTimingConfig;
}

/**
 * The motion API, live to the platform's reduced-motion setting.
 *
 * Subscribed rather than read once: `reduceMotionChanged` fires while the app is open, and a
 * user who turns the setting on mid-session is asking for it to take effect now.
 */
export function useMotion(): MotionValues {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      // GUARDED: the promise can settle after unmount, and setting state then is a leak
      // warning in development and a wasted render in production.
      if (live) setReduced(on);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  const duration = (step: DurationStep): number => (reduced ? 0 : nativeMotion.durations[step]);

  return {
    reduced,
    duration,
    timing: (step, easing = 'out') => ({
      duration: duration(step),
      easing: bezier(easing),
      // Reanimated's own check, in addition to the zero above. Two mechanisms rather than
      // one, because this one keeps working if a caller reaches past `duration`.
      reduceMotion: ReduceMotion.System,
    }),
  };
}

export interface AppearProps {
  readonly children: ReactNode;
  /**
   * Position in a staggered group. Omit outside a list.
   *
   * The DELAY is derived from this, never passed. A caller that could pass milliseconds could
   * pass a number off the scale, and then the scale is decorative.
   */
  readonly index?: number;
  readonly testID?: string;
}

/**
 * An element that fades and rises into place.
 *
 * ## Why there is no `style` prop, and no way to say what it animates
 *
 * The same reason `Screen` has no `style`: **an allow-list cannot be enforced at a call site
 * that can pass anything.** What this animates is `opacity` and `translateY`, decided here,
 * and a caller cannot widen it to a colour. `verify-motion` checks the source below; the API
 * shape is what stops the check from being the only thing standing between the product and a
 * cross-fading swatch.
 *
 * Under reduced motion the element is simply present — opacity 1, no offset, no delay. Not a
 * faster animation: **no animation**, which is what the setting asks for.
 *
 * ## The one frame this costs a reduced-motion user, stated rather than hidden
 *
 * `AccessibilityInfo.isReduceMotionEnabled()` is asynchronous on both platforms, so NO
 * component can know the answer at mount. This one starts hidden and reaches rest on the frame
 * after it learns — about 16ms of invisibility for a user who asked for no motion.
 *
 * Reanimated's `useReducedMotion()` is synchronous and would close the window, and it is not
 * used, because its answer is module state cached at import: in the test environment it is
 * always `false`, so seeding from it would add a line no test could observe. An unverified
 * line that removes 16ms is a worse trade than a verified one that does not.
 */
export function Appear({ children, index = 0, testID }: AppearProps): React.JSX.Element {
  const { reduced, timing } = useMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  // BUILT OUTSIDE THE EFFECT so the effect's dependencies can be honest. `timing` is rebuilt
  // on every render, so listing it would re-run the animation on every render; omitting it
  // while using it inside would be a lie the linter cannot see here. Reading the two numbers
  // out first makes the dependency list exactly what the animation depends on.
  const entrance = timing('local');
  const delay = Math.min(index, STAGGER_CAP) * STAGGER_STEP;
  const entranceDuration = entrance.duration;

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, entrance));
    // `entrance` itself is a fresh object each render; `entranceDuration` is the value that
    // actually changes when anything about it changes, and it is what the effect keys on.
  }, [reduced, delay, entranceDuration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE }],
  }));

  return (
    <Animated.View testID={testID} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * The entering and exiting animation for an overlay, in the shape HeroUI's `animation` prop
 * takes.
 *
 * HeroUI's defaults are 200ms in and 150ms out. Neither is on our scale, and an overlay that
 * moves at a different speed from the screen behind it is the specific thing that reads as
 * assembled from parts. These are `local` (180) and `micro` (120).
 *
 * A `Keyframe` is a value, not a hook, so it cannot consult reduced motion itself — reanimated
 * checks the platform setting when it runs one, and {@link ReduceMotion.System} is what asks
 * it to. That is why this is the one place the reduced-motion mechanism is reanimated's rather
 * than ours.
 *
 * Only `opacity` and `transform` appear, which is the whole allow-list.
 */
export const overlayKeyframes = {
  entering: new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.96 }] },
    100: { opacity: 1, transform: [{ scale: 1 }] },
  })
    .duration(nativeMotion.durations.local)
    .reduceMotion(ReduceMotion.System),
  exiting: new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 0.96 }] },
  })
    .duration(nativeMotion.durations.micro)
    .reduceMotion(ReduceMotion.System),
} as const;

/**
 * The durations, re-exported for the places a hook cannot go — a navigator's `screenOptions`,
 * which is a plain object evaluated outside a component.
 *
 * These do NOT collapse under reduced motion, because nothing here can subscribe to it. The
 * platform handles screen transitions itself and honours the setting at the OS level, which is
 * the layer that owns them; this is the seam where that is true, and it is the reason this
 * export exists rather than everything going through {@link useMotion}.
 */
export const durations = nativeMotion.durations;
