/**
 * The launch: the native splash, continued into mockup 14's splash, and handed over to the app.
 *
 * ## The defect this was first written for is not the missing animation
 *
 * Reported as *"Add some animation to splash screen"*. Reading the code first found something
 * worse: **nothing called `SplashScreen.preventAutoHideAsync()`**, and `expo-splash-screen` hides the
 * native splash as soon as the React root renders its first frame — which was `<></>` while the
 * Japanese font subset loaded. Every cold start went native splash → **blank screen** → app (F-190).
 *
 * ## The first JavaScript frame IS the last native one (F-231)
 *
 * The native splash draws its image at {@link SPLASH_IMAGE_WIDTH}, centred, on the phone's
 * `background`, and the mark inside it on a grid of {@link SPLASH_MARK} — the image's grid at that
 * width, read from the generator's drawings table — {@link SPLASH_MARK_DY} below the centre (a lone
 * mark is centred by its ink, ADR-0126). The overlay's first frame draws that mark there, on that
 * ground, and nothing else. F-230 found it drawing the image's WIDTH as the grid — 160 against 120 —
 * so the mark grew by a third at the moment the eye is on it.
 *
 * ## Then it becomes 14 (criterion 3, ADR-0127)
 *
 * Over the motion system's `view` step the mark rises — a translation and a scale, never a colour —
 * to where 14's lockup puts it, while 14's composition fades in around it: the glow, "Irodora" and
 * 彩り・色の知性, the subline, the silk wave and the progress line. When it arrives the lockup's own
 * mark is shown and the travelling one goes: the same component, ink and size in the same place, so
 * the swap cannot be seen. A beat later the overlay fades into the app. F-266 adds the ambient
 * motion — the wave's drift, the glow, the line's progress between its steps; the hand-over is here.
 *
 * ## In the phone's appearance, as the native splash is
 *
 * A native launch screen can only follow the system's light or dark, so the overlay does too
 * ({@link LaunchHost}): Sumi or Washi, 14's composition in 25's palette when light (C17). A theme
 * chosen in the app — Slate, Obsidian, the device colour, or Washi on a dark phone — appears as the
 * overlay leaves (R9 §4 E4). Following the app's choice instead would flip polarity at the hand-over.
 *
 * ## It never blocks the app, and reduced motion resolves at once
 *
 * The app mounts underneath immediately; this is a sibling that leaves. Under reduced motion the
 * composition is drawn at rest at once and the overlay goes on the next tick — not faster, at once
 * (F-144). The launch is where a person who asked for no motion most likely asked because motion
 * makes them unwell.
 */

import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { nativeArtStroke, nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  Illustration,
  illustrationBox,
  lockupGeometry,
  Mark,
  PROGRESS_TRACK,
  ProgressBar,
  SYSTEM_APPEARANCE,
  Text,
  ThemeProvider,
  useMotion,
  useTheme,
  Wordmark,
  type LockupGeometry,
} from '@irodora/ui';
import { SPLASH_IMAGE_WIDTH } from '../app.config';
import brandAssets from '../assets/brand/brand-assets.json' with { type: 'json' };
import launchGlow from '../assets/brand/launch-glow.png';
import { useMessages } from './i18n/useMessages';

/** The splash image's drawing — the light and the dark one are drawn on one grid (the test holds it). */
const SPLASH_DRAWING = brandAssets.drawings.splashDark;

/**
 * The native splash's mark, as an edge length of its grid in points: the image's grid at the image's
 * width. 14's splash lockup draws its mark at the same grid (`lockupGeometry('splash').mark`), and
 * `launch.test` holds the two within 0.1 dp, so the overlay continues the native frame AND is 14's.
 */
export const SPLASH_MARK = (SPLASH_IMAGE_WIDTH * SPLASH_DRAWING.grid) / SPLASH_DRAWING.canvas;

/** How far below the window's centre the native splash puts the mark's grid centre, in points. */
export const SPLASH_MARK_DY = (SPLASH_IMAGE_WIDTH * SPLASH_DRAWING.dy) / SPLASH_DRAWING.canvas;

/**
 * The glow behind the lockup's mark (`14.splash.glow`): a mask the generator blurs from the mark's
 * geometry — 14's sigma, 14's opacity — and the app tints with the mark's own token. `canvas / grid`
 * is how much larger than the mark's grid the image is drawn (ADR-0127).
 */
export const LAUNCH_GLOW = brandAssets.glow;

/**
 * Where 14 puts the rest, in the R9 scale (§2). Read off 14 at 1.3521 dp/px and snapped:
 *
 * - **the subline's line box 16 under the lockup's ink.** The lockup's box is its ink (ADR-0123);
 *   the subline's is a caption line, whose cap top sits about 4 dp into it in either platform's sans
 *   (half the leading over the face's own line, plus the ascender over the cap height — SF Pro's and
 *   Roboto's metrics give 4.1 and 3.9 at 10.3 on 15.45). 14's ink gap is 22.9 dp, so the gap this
 *   sets is 18.9, and §2 takes 16;
 * - the line's ends 27.7 dp in from the screen's sides (24) and its foot 47.7 dp up (48);
 * - the wave's lines ending 16.6 dp above the line (16).
 */
export const LAUNCH_SPACING = {
  subline: nativeSpacing.md,
  inset: nativeSpacing.lg,
  foot: nativeSpacing.xxl,
  wave: nativeSpacing.md,
} as const;

/**
 * Where `silk-wave`'s lines end, in its own 96 × 24 units: its lowest line's trough. 14 places the
 * wave by its lines, not its box, and `launch.test` reads this back out of the drawing's paths.
 */
export const SILK_WAVE_LINES_END = 20.4;

/**
 * How long the composition is held before it leaves, as a motion step.
 *
 * **A beat, not a pause.** Long enough that the settle is seen rather than glimpsed, short enough
 * that nobody waits for it. It is the manifest's `view` step, which is what one screen replacing
 * another costs — the launch is exactly that, once.
 */
export const LAUNCH_HOLD = 'view' as const;

/** Where the launch has got: the first frame, the mark arrived in the lockup, and leaving. */
export type LaunchPhase = 'native' | 'arrived' | 'leaving';

/**
 * The progress line's value (`engine:launch.progress`, R9 §8, ADR-0127): how much of the launch's
 * sequence — the rise and the hold — has elapsed, at each step it reaches. Nothing loads after the
 * first frame (every face is loaded behind the native splash, and the stored choices are read
 * synchronously), so a loading percentage would be a number nobody computed; this one is.
 */
export function launchProgress(phase: LaunchPhase): number {
  return phase === 'native' ? 0 : phase === 'arrived' ? 0.5 : 1;
}

/** A box, in the window's points. */
export interface LaunchBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where everything goes, in the window's points. */
export interface LaunchLayout {
  /** The lockup's box, which is its ink (ADR-0123). */
  readonly lockup: LaunchBox;
  /** The lockup's mark's grid, where the travelling mark arrives. */
  readonly mark: LaunchBox;
  readonly glow: LaunchBox;
  /** The subline's line box. */
  readonly subline: LaunchBox;
  readonly wave: LaunchBox;
  readonly line: LaunchBox;
}

/**
 * The composition's layout (pure, so the test can hold it to 14's boxes).
 *
 * - **The lockup and the subline are one group, centred in the window**: 14 draws the group's
 *   centre 3 dp from the frame's, and the lockup alone 15 dp above it.
 * - **The line is at the foot**, its ends inset, and **the wave's lines end above it**.
 *
 * `sublineHeight` is the subline's laid-out line box, one caption line until it is measured: it
 * wraps when a person has enlarged text (A7), and the group re-centres.
 */
export function launchLayout(
  window: { readonly width: number; readonly height: number },
  lockup: LockupGeometry,
  sublineHeight: number,
): LaunchLayout {
  const group = lockup.height + LAUNCH_SPACING.subline + sublineHeight;
  const top = (window.height - group) / 2;
  const lockupBox = {
    x: (window.width - lockup.width) / 2,
    y: top,
    width: lockup.width,
    height: lockup.height,
  };
  // The mark's grid, from its ink box and the margins that take the box to the ink.
  const { left, right } = lockup.ink.mark;
  if (left === undefined || right === undefined)
    throw new Error('launchLayout: the splash lockup always places its mark across');
  const inkWidth = right - left;
  const mark = {
    x: window.width / 2 - inkWidth / 2 + lockup.markMargins.marginLeft,
    y: top + lockup.ink.mark.top + lockup.markMargins.marginTop,
    width: lockup.mark,
    height: lockup.mark,
  };
  const glowSize = (LAUNCH_GLOW.canvas / LAUNCH_GLOW.grid) * lockup.mark;
  const [boxWidth, boxHeight] = illustrationBox('silk-wave');
  const waveHeight = (window.width * boxHeight) / boxWidth;
  const lineTop = window.height - LAUNCH_SPACING.foot - PROGRESS_TRACK;
  const linesEnd = (waveHeight * SILK_WAVE_LINES_END) / boxHeight + nativeArtStroke / 2;
  return {
    lockup: lockupBox,
    mark,
    glow: {
      x: mark.x + mark.width / 2 - glowSize / 2,
      y: mark.y + mark.height / 2 - glowSize / 2,
      width: glowSize,
      height: glowSize,
    },
    subline: {
      x: 0,
      y: top + lockup.height + LAUNCH_SPACING.subline,
      width: window.width,
      height: sublineHeight,
    },
    wave: {
      x: 0,
      y: lineTop - LAUNCH_SPACING.wave - linesEnd,
      width: window.width,
      height: waveHeight,
    },
    line: {
      x: LAUNCH_SPACING.inset,
      y: lineTop,
      width: window.width - 2 * LAUNCH_SPACING.inset,
      height: PROGRESS_TRACK,
    },
  };
}

export interface LaunchProps {
  /**
   * Called once the overlay is on screen and the native splash can be dismissed.
   *
   * **The order is the point.** See the header: hiding the native splash before this has rendered
   * reintroduces the blank frame.
   */
  readonly onShown: () => void;
  /** Called when the overlay has finished leaving and can be unmounted. */
  readonly onDone: () => void;
}

/**
 * The overlay in the phone's own appearance — the one a native launch screen can follow — whatever
 * the person chose inside the app (see the header).
 */
export function LaunchHost(props: LaunchProps): React.JSX.Element {
  return (
    <ThemeProvider appearance={SYSTEM_APPEARANCE}>
      <Launch {...props} />
    </ThemeProvider>
  );
}

/** A box as absolute style. */
const placed = (box: LaunchBox) =>
  ({
    position: 'absolute',
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
  }) as const;

/**
 * The overlay, and its sequence. Opacity and transforms only — `motion.animatable`, and
 * `verify-motion` holds it. Every ink is a token of the theme it is drawn in.
 */
export function Launch({ onShown, onDone }: LaunchProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const { reduced, timing, duration } = useMotion();
  const window = useWindowDimensions();
  const [geometry, setGeometry] = useState<LockupGeometry>(() => lockupGeometry('splash'));
  const [sublineHeight, setSublineHeight] = useState<number>(nativeType[script].caption.lineHeight);
  const [phase, setPhase] = useState<LaunchPhase>('native');
  const [shown, setShown] = useState(false);
  const arrive = useSharedValue(0);
  const leaving = useSharedValue(0);
  const layout = launchLayout(window, geometry, sublineHeight);

  useEffect(() => {
    if (shown) return;
    setShown(true);
    // The overlay is on screen NOW, so the native splash underneath it can go.
    onShown();
  }, [shown, onShown]);

  useEffect(() => {
    if (!shown) return undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    /*
     * REDUCED MOTION IS NOT A SHORTER SEQUENCE, it is no sequence: the composition is at rest at
     * once and the overlay goes on the next tick. `duration` returns 0 under the setting, so every
     * step collapses without a second code path.
     */
    const step = duration('view');
    arrive.value = reduced ? 1 : withTiming(1, timing('view'));
    // The arrival is a React state change — the travelling mark gives way to the lockup's — so it
    // is scheduled here rather than on the UI thread, as the leaving is.
    timers.push(
      setTimeout(() => {
        setPhase('arrived');
        timers.push(
          setTimeout(() => {
            setPhase('leaving');
            if (reduced) {
              onDone();
              return;
            }
            leaving.value = withTiming(1, timing('view'));
            timers.push(setTimeout(onDone, step));
          }, duration(LAUNCH_HOLD)),
        );
      }, step),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
    // `timing` and `duration` are rebuilt every render; `reduced` and `shown` are what change the
    // answer. The same honest list `Appear` keeps in motion.tsx.
  }, [shown, reduced, onDone, arrive, leaving, duration, timing]);

  // Where the travelling mark starts (the native frame) and where it arrives (the lockup's mark),
  // as an offset of its centre from the window's and a scale of its grid.
  const fromY = SPLASH_MARK_DY;
  const toY = layout.mark.y + layout.mark.height / 2 - window.height / 2;
  const toX = layout.mark.x + layout.mark.width / 2 - window.width / 2;
  const toScale = layout.mark.width / SPLASH_MARK;
  const travelling = useAnimatedStyle(() => ({
    transform: [
      { translateX: toX * arrive.value },
      { translateY: fromY + (toY - fromY) * arrive.value },
      { scale: 1 + (toScale - 1) * arrive.value },
    ],
  }));
  const composition = useAnimatedStyle(() => ({ opacity: arrive.value }));
  const leave = useAnimatedStyle(() => ({ opacity: 1 - leaving.value }));
  const onGeometry = useCallback((next: LockupGeometry) => {
    setGeometry(next);
  }, []);
  const arrived = phase !== 'native';

  return (
    <Animated.View
      testID="launch"
      // Not announced: the app underneath is already the accessible tree, and a screen reader
      // stopping on a decorative overlay at launch is a stop that says nothing.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, leave, { backgroundColor: colors.background }]}
    >
      <Animated.View testID="launch.composition" style={[StyleSheet.absoluteFill, composition]}>
        {/* The glow, behind the lockup, so the mark's cuts show it (ADR-0122 §3). */}
        <Image
          testID="launch.glow"
          source={launchGlow}
          style={[placed(layout.glow), { tintColor: colors.foreground }]}
        />
        <View style={placed(layout.lockup)}>
          <Wordmark
            form="splash"
            tagline={t('brand.taglineJa')}
            markHidden={!arrived}
            onGeometry={onGeometry}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            left: LAUNCH_SPACING.inset,
            right: LAUNCH_SPACING.inset,
            top: layout.subline.y,
          }}
          onLayout={(event) => {
            setSublineHeight(event.nativeEvent.layout.height);
          }}
        >
          <Text size="caption" color="foreground.2" script={script} align="center">
            {t('brand.splashSubline')}
          </Text>
        </View>
        <View style={placed(layout.wave)}>
          <Illustration name="silk-wave" width={layout.wave.width} color="foreground.3" />
        </View>
        <View style={placed(layout.line)}>
          <ProgressBar value={launchProgress(phase)} testID="launch.progress" />
        </View>
      </Animated.View>
      {/*
        THE SAME MARK, AT THE SAME SIZE, IN THE SAME PLACE, ON THE SAME GROUND the native splash was
        drawing — from the same table — until it arrives in the lockup. See the header.
      */}
      {arrived ? null : (
        <Animated.View
          testID="launch.handover"
          style={[
            {
              position: 'absolute',
              left: window.width / 2 - SPLASH_MARK / 2,
              top: window.height / 2 - SPLASH_MARK / 2,
            },
            travelling,
          ]}
        >
          <Mark size={SPLASH_MARK} color="foreground" />
        </Animated.View>
      )}
    </Animated.View>
  );
}
