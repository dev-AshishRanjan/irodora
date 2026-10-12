/**
 * No dependency animates a colour on our behalf (F-266, ADR-0133 §9 and §10).
 *
 * `scripts/verify-motion.mjs` reads OUR source. What a dependency's own worklets return is
 * invisible to it, and reanimated gives an animated style precedence over a static one — so a
 * colour a library animates paints over the token we set, and its frames between two colours are
 * colours the engine never produced. This file holds the one dependency that did, at runtime, and
 * pins the audit to the version it was made against.
 *
 * **The audit (heroui-native 1.0.8, F-266 increment 1).** Of the HeroUI animation hooks
 * `@irodora/ui` renders — PressableFeedback (Button, IconButton), RadioGroup (ChoiceGroup), Switch
 * root and thumb, Skeleton, Toast, Select, Accordion, Slider, Tabs, and the Dialog, Popover and
 * BottomSheet content hooks — only the Switch's thumb animated a colour: a `withTiming` on its
 * `backgroundColor`, and a spring on `start`, because `state: 'disabled'` on the root does not
 * reach it. PressableFeedback paints a constant colour under an animated opacity, and our buttons
 * turn that highlight off (`feedbackVariant="scale"`).
 *
 * **How it is read.** Jest has no layout pass, and the thumb takes its unmounted branch until the
 * root has a width — so the root is given one. Then a toggle, and the animated styles one frame
 * in, read with `animatedStyleOf`: what the WORKLET returned, alone, so a worklet that returned no
 * colour could not pass on the static token underneath (`props.style` is only the mount value). The worklets here
 * capture shared values and numbers, so advancing time is safe (E-069).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Switch as HeroSwitch } from 'heroui-native';
import { nativeColors } from '@irodora/design-tokens';
import { Switch, ThemeProvider } from '../src/index.js';
import { animatedStyleOf } from '../src/testing/index.js';

/** The version the audit above was made against. An upgrade fails here until it is re-audited. */
const AUDITED_HEROUI = '1.0.8';

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const INSTALLED_HEROUI = (
  JSON.parse(
    readFileSync(join(__dirname, '..', 'node_modules', 'heroui-native', 'package.json'), 'utf8'),
  ) as { readonly version: string }
).version;

/** One frame at 60 fps, the unit reanimated advances in. */
const FRAME = 17;

type Instance = ReturnType<typeof render>['UNSAFE_root'];

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Every host node HeroUI animates, with what its worklet returned, in tree order: root, thumb. */
function animated(root: Instance): Record<string, unknown>[] {
  return root
    .findAll((n) => typeof n.type === 'string' && 'jestAnimatedStyle' in n.props)
    .map((n) => animatedStyleOf(n));
}

/** Give every node that measures itself a layout, as a device would on first frame. */
function laidOut(root: Instance): void {
  for (const n of root.findAll((x) => typeof x.props['onLayout'] === 'function'))
    act(() => {
      fireEvent(n, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 34.5, height: 18 } } });
    });
  act(() => {
    jest.advanceTimersByTime(400);
  });
}

function toggle(root: Instance, testID: string): void {
  const press = root.findAll(
    (n) => n.props['testID'] === testID && typeof n.props['onPress'] === 'function',
  )[0];
  if (press === undefined) throw new Error(`nothing pressable carries ${testID}`);
  fireEvent.press(press);
  act(() => {
    jest.advanceTimersByTime(FRAME);
  });
}

describe('the audit is of the version installed', () => {
  it(`is heroui-native ${AUDITED_HEROUI}; an upgrade is re-audited before this passes`, () => {
    expect(INSTALLED_HEROUI).toBe(AUDITED_HEROUI);
  });
});

describe('our Switch jumps, and paints our tokens through HeroUI’s worklets', () => {
  function Ours(): React.JSX.Element {
    const [on, setOn] = useState(false);
    return (
      <ThemeProvider theme="dark">
        <Switch label="Probe" checked={on} onCheckedChange={setOn} testID="ours" />
      </ThemeProvider>
    );
  }
  const dark = nativeColors.dark;

  it('paints the off state in our tokens: track surface.3, thumb inverse', () => {
    const tree = render(<Ours />);
    laidOut(tree.UNSAFE_root);
    const [track, thumb] = animated(tree.UNSAFE_root);
    expect(track?.['backgroundColor']).toBe(dark['surface.3']);
    expect(thumb?.['backgroundColor']).toBe(dark.inverse);
  });

  it('is at its end state one frame after a toggle: our on colours, the thumb already there', () => {
    const tree = render(<Ours />);
    laidOut(tree.UNSAFE_root);
    toggle(tree.UNSAFE_root, 'ours');
    const [track, thumb] = animated(tree.UNSAFE_root);
    expect(track?.['backgroundColor']).toBe(dark.inverse);
    expect(thumb?.['backgroundColor']).toBe(dark['surface.1']);
    const oneFrameIn = thumb?.['start'];
    act(() => {
      jest.advanceTimersByTime(400);
    });
    // A jump: nothing left to travel after the first frame.
    expect(animated(tree.UNSAFE_root)[1]?.['start']).toBe(oneFrameIn);
  });
});

describe('DECOY — the reading sees an interpolation where there is one', () => {
  /** The configuration before F-266: the root's own tween off, the thumb's left on. */
  function Before(): React.JSX.Element {
    const [on, setOn] = useState(false);
    return (
      <ThemeProvider theme="dark">
        <HeroSwitch
          testID="before"
          isSelected={on}
          onSelectedChange={setOn}
          animation={{ state: 'disabled' }}
          style={{ width: 34.5, height: 18 }}
        >
          <HeroSwitch.Thumb
            animation={{
              left: { value: 2 },
              backgroundColor: { value: ['#000000', '#FFFFFF'] },
            }}
            style={{ width: 14, height: 14 }}
          />
        </HeroSwitch>
      </ThemeProvider>
    );
  }

  it('reads a thumb colour between its two, and a position between its two, one frame in', () => {
    const tree = render(<Before />);
    laidOut(tree.UNSAFE_root);
    const startBefore = animated(tree.UNSAFE_root)[1]?.['start'];
    toggle(tree.UNSAFE_root, 'before');
    const thumb = animated(tree.UNSAFE_root)[1];
    expect(thumb?.['backgroundColor']).not.toBe('#000000');
    expect(thumb?.['backgroundColor']).not.toBe('#FFFFFF');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    const startAfter = animated(tree.UNSAFE_root)[1]?.['start'];
    expect(thumb?.['start']).not.toBe(startBefore);
    expect(thumb?.['start']).not.toBe(startAfter);
  });
});
