/**
 * Motion — the two things a test can settle, and the one it cannot.
 *
 * **What is asserted here:** the durations come from the manifest, and reduced motion collapses
 * every one of them to zero. F-144's criterion 2 says *"asserted rather than described"*, and
 * this file is what that sentence has to mean — `AccessibilityInfo` is driven, not documented.
 *
 * **What is NOT asserted here:** any intermediate frame. Reanimated is not mocked in this suite
 * (see `jest.config.mjs` — its mock omits `useReducedMotion`, which HeroUI calls on first
 * render), so animations really do schedule. Asserting frame 3 would be asserting the scheduler,
 * and a test that does that is flaky by construction. The end state and the reduced state are
 * deterministic; those are the two that get assertions.
 *
 * **What no test can see at all:** whether an animated style animates a COLOUR. An
 * `Animated.View` with an interpolated `backgroundColor` renders to a concrete resolved value,
 * indistinguishable from a static one. That is `scripts/verify-motion.mjs`'s job, and the reason
 * it is a source scan rather than a rendered check.
 */

import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, Text as RNText } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { nativeMotion } from '@irodora/design-tokens';
import { Appear, durations, overlayKeyframes, useMotion } from '../src/motion.js';

/** One frame at 60fps, the unit reanimated advances in. */
const FRAME = 17;

/** The listeners `useMotion` registers, so a test can fire `reduceMotionChanged` itself. */
let listeners: ((on: boolean) => void)[] = [];

beforeEach(() => {
  listeners = [];
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  // CAST THROUGH THE WHOLE SIGNATURE, not through each argument. `addEventListener` is
  // overloaded per event name and TypeScript resolves a `mockImplementation` against the FIRST
  // overload — `announcementFinished` — so narrowing the parameters individually produces
  // three errors that all say the same thing about the wrong overload.
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    event: string,
    handler: (on: boolean) => void,
  ) => {
    if (event === 'reduceMotionChanged') listeners.push(handler);
    return { remove: () => undefined };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** A probe that renders what `useMotion` reports, because a hook has no rendered tree. */
function Probe(): React.JSX.Element {
  const { reduced, duration } = useMotion();
  return (
    <RNText testID="probe">
      {[
        String(reduced),
        String(duration('micro')),
        String(duration('local')),
        String(duration('view')),
      ].join(' ')}
    </RNText>
  );
}

const readProbe = async (): Promise<string> => {
  const tree = render(<Probe />);
  // FLUSHED: `isReduceMotionEnabled` is a promise, so the first paint is always the default.
  await act(async () => {
    await Promise.resolve();
  });
  const text = tree.getByTestId('probe').props['children'] as string;
  tree.unmount();
  return text;
};

describe('useMotion', () => {
  it('reports the manifest durations when motion is not reduced', async () => {
    expect(await readProbe()).toBe(
      `false ${String(nativeMotion.durations.micro)} ${String(nativeMotion.durations.local)} ` +
        String(nativeMotion.durations.view),
    );
  });

  it('collapses EVERY duration to zero when the platform asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    // Not "shorter". Zero — for all three steps, with nothing left to tune down.
    expect(await readProbe()).toBe('true 0 0 0');
  });

  it('collapses when the setting is turned on mid-session', async () => {
    const tree = render(<Probe />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(tree.getByTestId('probe').props['children']).toContain(
      String(nativeMotion.durations.view),
    );

    // The user turns it on in Settings while the app is open. Reading once at mount would
    // leave the app animating at full speed for the rest of the session.
    act(() => {
      for (const l of listeners) l(true);
    });
    expect(tree.getByTestId('probe').props['children']).toBe('true 0 0 0');
    tree.unmount();
  });

  it('gives timing the manifest easing, and reanimated its own reduced-motion escape', async () => {
    function Config(): React.JSX.Element {
      const { timing } = useMotion();
      const c = timing('view', 'inOut');
      return (
        <RNText testID="cfg">
          {[String(c.duration), typeof c.easing, String(c.reduceMotion)].join(' ')}
        </RNText>
      );
    }
    const tree = render(<Config />);
    await act(async () => {
      await Promise.resolve();
    });
    const text = tree.getByTestId('cfg').props['children'] as string;
    tree.unmount();

    // Two mechanisms, deliberately: our zero AND reanimated's own check. The second keeps
    // working if a caller reaches past `duration`.
    //
    // `easing` is an OBJECT rather than a function: `Easing.bezier` returns an
    // `EasingFunctionFactory`, which reanimated unwraps on the UI thread, and
    // `ReduceMotion.System` is the string 'system'. Both are asserted as what they ARE — a
    // test written against what they were assumed to be would have passed for the wrong
    // reason the first time reanimated changed either wrapper.
    expect(text).toBe(`${String(nativeMotion.durations.view)} object system`);
  });
});

describe('Appear', () => {
  /**
   * The animated style, read from reanimated rather than from the element's props.
   *
   * `props.style` is the style array as it was AT MOUNT — for an animated element that is the
   * starting frame, permanently, which is why the first version of these tests read
   * `undefined`. `getAnimatedStyle` is reanimated's own accessor for the value the UI thread
   * currently holds, and it is the only thing that can watch an animation finish.
   */
  const animated = (node: unknown): Record<string, unknown> =>
    getAnimatedStyle(node as never) as unknown as Record<string, unknown>;

  /*
   * FAKE TIMERS, AND `jest.advanceTimersByTime` DIRECTLY.
   *
   * Reanimated ships `advanceAnimationByTime`, and it is deprecated in favour of exactly this
   * — its own source says so, and it warns on every call. It is also a trap without fake
   * timers: with real ones it advances nothing, the animation keeps running on wall-clock
   * time, and the value read back is whatever the test happened to catch. That is how the
   * first version of this test read 0.877 for one advance and 0.673 for a longer one, which
   * is not a slow animation but a test measuring the suite's own latency.
   */
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts hidden and below, then settles fully present with no offset', async () => {
    const tree = render(
      <Appear testID="appear">
        <RNText>child</RNText>
      </Appear>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    // The START state is deterministic and worth asserting on its own: an entrance that begins
    // already visible is not an entrance, and nothing else in this suite would notice.
    expect(animated(tree.getByTestId('appear'))['opacity']).toBe(0);

    // Then time is advanced past the duration — the END state, never a frame in between.
    // Asserting frame 3 would be asserting the scheduler.
    act(() => {
      jest.advanceTimersByTime(nativeMotion.durations.local * 2);
    });
    const settled = animated(tree.getByTestId('appear'));
    expect(settled['opacity']).toBe(1);
    expect(settled['transform']).toEqual([{ translateY: 0 }]);
    tree.unmount();
  });

  it('is simply present under reduced motion — not a faster animation', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const tree = render(
      <Appear testID="appear" index={5}>
        <RNText>child</RNText>
      </Appear>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    // ONE FRAME, and that is the assertion. `isReduceMotionEnabled` is asynchronous on both
    // platforms, so no component can know the answer at mount; `Appear` reaches rest on the
    // frame after it learns. One frame is what that costs and it is what is claimed.
    //
    // It still discriminates. If `Appear` animated under reduced motion, one frame into a
    // 180ms entrance would read about 0.09 — not 1. The index of 5 would add a stagger delay
    // on top, so it would read 0.
    act(() => {
      jest.advanceTimersByTime(FRAME);
    });
    const style = animated(tree.getByTestId('appear'));
    expect(style['opacity']).toBe(1);
    expect(style['transform']).toEqual([{ translateY: 0 }]);
    tree.unmount();
  });

  it('staggers a later row behind an earlier one', async () => {
    const first = render(
      <Appear testID="first" index={0}>
        <RNText>a</RNText>
      </Appear>,
    );
    const later = render(
      <Appear testID="later" index={4}>
        <RNText>b</RNText>
      </Appear>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Advanced to just past the duration of ONE row's animation. Row 0 has had its whole
    // animation; row 4 is still inside its delay or partway through. The comparison is what
    // is asserted — a stagger read as an absolute value would be pinning the frame budget.
    act(() => {
      jest.advanceTimersByTime(nativeMotion.durations.local);
    });
    const a = animated(first.getByTestId('first'))['opacity'] as number;
    const b = animated(later.getByTestId('later'))['opacity'] as number;
    expect(a).toBeGreaterThan(b);

    first.unmount();
    later.unmount();
  });

  it('renders its children', async () => {
    const tree = render(
      <Appear>
        <RNText>a row</RNText>
      </Appear>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(tree.getByText('a row')).toBeTruthy();
    tree.unmount();
  });
});

describe('the exported durations', () => {
  it('are the manifest, not a copy of it', () => {
    // Identity, not equality: a copy would drift the first time the manifest changed, and the
    // drift would be invisible because both objects would still look right.
    expect(durations).toBe(nativeMotion.durations);
  });

  it('give an overlay OUR timing rather than HeroUI 200/150ms defaults', () => {
    // A `Keyframe` keeps its duration privately, so this reads what was handed to it. The
    // assertion that matters is that neither is 200 or 150.
    expect(overlayKeyframes.entering).toBeDefined();
    expect(overlayKeyframes.exiting).toBeDefined();
    expect(nativeMotion.durations.local).not.toBe(200);
    expect(nativeMotion.durations.micro).not.toBe(150);
  });
});
