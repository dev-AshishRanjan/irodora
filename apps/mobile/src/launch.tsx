/**
 * The hand-over from the native splash to the app.
 *
 * ## The defect this was written for is not the missing animation
 *
 * Reported as *"Add some animation to splash screen"*. Reading the code first found something
 * worse: **nothing called `SplashScreen.preventAutoHideAsync()`**.
 *
 * `expo-splash-screen` hides the native splash as soon as the React root renders its first
 * frame, and `app/_layout.tsx` rendered `<></>` while the Japanese font subset loaded. So every
 * cold start was:
 *
 * ```
 * native splash  →  BLANK SCREEN  →  the app
 * ```
 *
 * Not a cut with no animation — a **gap**, for as long as the font takes. That is what somebody
 * reports as "the app flashes white when I open it", and it is the first thing this fixes.
 *
 * ## The first JavaScript frame continues the last native one
 *
 * The native splash draws the mark at {@link SPLASH_IMAGE_WIDTH}, centred, on the theme's
 * `background`. So does this, from the **same exported number** — a second copy would drift by a
 * few points and read as a jump at exactly the moment the eye is on it.
 *
 * And the native splash is hidden **after** this has rendered, never before. Hiding first and
 * drawing after is the blank frame again, one layer up.
 *
 * ## It never blocks the app
 *
 * The app mounts underneath immediately; this is a sibling that leaves. A cold start that waited
 * on decoration would have traded a blank frame for a slow one.
 *
 * ## Reduced motion resolves at once
 *
 * Not faster — **at once**. The resting frame, then through. F-144's rule, and the launch is the
 * one place where a person who asked for no motion is most likely to be asking because motion
 * makes them unwell.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Mark, useMotion, useTheme } from '@irodora/ui';
import { SPLASH_IMAGE_WIDTH } from '../app.config';

/**
 * How long the mark is held before it leaves, in milliseconds.
 *
 * **A beat, not a pause.** Long enough that the settle is seen rather than glimpsed, short
 * enough that nobody waits for it. It is the manifest's `view` step, which is what one screen
 * replacing another costs — the launch is exactly that, once.
 */
export const LAUNCH_HOLD = 'view' as const;

export interface LaunchProps {
  /**
   * Called once the overlay is on screen and the native splash can be dismissed.
   *
   * **The order is the point.** See the header: hiding the native splash before this has
   * rendered reintroduces the blank frame.
   */
  readonly onShown: () => void;
  /** Called when the overlay has finished leaving and can be unmounted. */
  readonly onDone: () => void;
}

/**
 * The overlay, and its one animation.
 *
 * Opacity and scale only — `motion.animatable`, and `verify-motion` holds it. The mark itself is
 * `foreground` on `background`, which is the pairing the native splash was already drawing, so
 * nothing here introduces a colour.
 */
export function Launch({ onShown, onDone }: LaunchProps): React.JSX.Element {
  const { colors } = useTheme();
  const { reduced, timing, duration } = useMotion();
  const leaving = useSharedValue(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    setShown(true);
    // The overlay is on screen NOW, so the native splash underneath it can go.
    onShown();
  }, [shown, onShown]);

  useEffect(() => {
    if (!shown) return undefined;

    /*
     * REDUCED MOTION IS NOT A SHORTER SEQUENCE, it is no sequence: the overlay is done on the
     * next tick and the app is simply there. `duration('view')` returns 0 under the setting, so
     * both the hold and the fade collapse without a second code path.
     */
    const hold = duration(LAUNCH_HOLD);
    const timer = setTimeout(() => {
      if (reduced) {
        onDone();
        return;
      }
      leaving.value = withTiming(1, timing('view'));
      // The overlay unmounts a frame after it has finished fading, rather than on a listener:
      // a worklet callback would run on the UI thread and `onDone` unmounts a React tree.
      setTimeout(onDone, duration('view'));
    }, hold);

    return () => {
      clearTimeout(timer);
    };
    // `timing` and `duration` are rebuilt every render; `reduced` and `shown` are what change
    // the answer. The same honest list `Appear` keeps in motion.tsx.
  }, [shown, reduced, onDone, leaving, duration, timing]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - leaving.value,
    // The mark rises very slightly as it goes, so the leaving reads as a hand-over rather than
    // as a light being switched off. 1.04 is barely perceptible and that is the intent.
    transform: [{ scale: 1 + leaving.value * 0.04 }],
  }));

  return (
    <Animated.View
      testID="launch"
      // Not announced: the app underneath is already the accessible tree, and a screen reader
      // stopping on a decorative overlay at launch is a stop that says nothing.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        style,
        {
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      {/*
        THE SAME MARK, AT THE SAME SIZE, ON THE SAME GROUND the native splash was drawing —
        from the same exported number. See the header.
      */}
      <View>
        <Mark size={SPLASH_IMAGE_WIDTH} color="foreground" />
      </View>
    </Animated.View>
  );
}
