/**
 * The hit area (F-232, ADR-0114): a control drawn at its mockup's size reaches the platform's tap
 * target through `hitSlop`, and the conformance rule can see it.
 *
 * F-285 is why this exists. A switch was raised to 68 × 44 because the `tap-target` rule read only
 * `minWidth`/`minHeight`, so a hit area declared anywhere else was invisible to it. The rule now
 * adds the declared drawn size and the `hitSlop` back together. The decoys hold it from both sides:
 * no slop and too little slop are reported, and enough slop is not.
 */

import { render, screen } from '@testing-library/react-native';
import { Platform, Pressable } from 'react-native';
import { nativeTapTarget, nativeTapTargetAndroid, type Theme } from '@irodora/design-tokens';
import { Button, BUTTON_HEIGHT, hitArea, platformTapTarget, ThemeProvider } from '../src/index.js';
import {
  checkSubject,
  pressableNodes,
  tapTargetReach,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

/** 15's switch track, the drawn size F-285 is about: 34.5 × 18 dp. */
const DRAWN = { width: 34.5, height: 18 } as const;

describe('the target is the platform’s', () => {
  it('is Apple’s 44 on iOS and Material’s 48 on Android, from the manifest', () => {
    expect(platformTapTarget('ios')).toBe(nativeTapTarget);
    expect(platformTapTarget('android')).toBe(nativeTapTargetAndroid);
    expect([nativeTapTarget, nativeTapTargetAndroid]).toStrictEqual([44, 48]);
  });

  it('reads the platform it runs on when none is named', () => {
    expect(platformTapTarget()).toBe(44); // jest's React Native preset is iOS
    const replaced = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      expect(platformTapTarget()).toBe(48);
      expect(hitArea(DRAWN.width, DRAWN.height)).toStrictEqual({
        top: 15,
        bottom: 15,
        left: 6.75,
        right: 6.75,
      });
    } finally {
      replaced.restore();
    }
  });
});

describe('hitArea grows the drawn box to the target, evenly, and never shrinks it', () => {
  it('splits the difference on each side', () => {
    expect(hitArea(DRAWN.width, DRAWN.height, 'ios')).toStrictEqual({
      top: 13,
      bottom: 13,
      left: 4.75,
      right: 4.75,
    });
  });

  it('asks nothing of a control already drawn at the target, or past it', () => {
    expect(hitArea(44, 44, 'ios')).toStrictEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(hitArea(200, 52, 'android')).toStrictEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

describe('the rule adds the drawn size and the hit area back together', () => {
  const drawn = { width: DRAWN.width, height: DRAWN.height };

  it('DECOY — the drawn size alone falls short', () => {
    expect(tapTargetReach(drawn, undefined)).toStrictEqual({ width: 34.5, height: 18 });
  });

  it('DECOY — too little slop still falls short', () => {
    expect(tapTargetReach(drawn, 4)).toStrictEqual({ width: 42.5, height: 26 });
  });

  it('reaches exactly the target with the slop hitArea gives', () => {
    expect(tapTargetReach(drawn, hitArea(DRAWN.width, DRAWN.height, 'ios'))).toStrictEqual({
      width: 44,
      height: 44,
    });
  });

  it('still accepts a control that declares the target as its minimum, with no slop', () => {
    expect(tapTargetReach({ minWidth: 44, minHeight: 44 }, undefined)).toStrictEqual({
      width: 44,
      height: 44,
    });
  });

  it('reaches nothing on an axis whose size nobody declared', () => {
    expect(tapTargetReach({ height: 18 }, 20)).toStrictEqual({ width: null, height: 58 });
  });
});

describe('the hit area arrives where the rule reads it', () => {
  it('HeroUI’s Button forwards hitSlop to the host view (the probe the plan asked for)', () => {
    // Button sets its own hit area and hands it to HeroUI's Button; the host view is where it lands.
    render(
      <ThemeProvider theme="dark">
        <Button label="Save" testID="b" />
      </ThemeProvider>,
    );
    const hosts = screen.getAllByTestId('b', { includeHiddenElements: true });
    expect(
      hosts.some(
        (h) =>
          JSON.stringify((h.props as { hitSlop?: unknown }).hitSlop) ===
          JSON.stringify(hitArea(nativeTapTarget, BUTTON_HEIGHT, 'ios')),
      ),
    ).toBe(true);
  });

  it('is the button’s own: a caller cannot shrink it', () => {
    // @ts-expect-error — the hit area is what makes the drawn size reach the target (ADR-0114).
    const shrunk = <Button label="Save" hitSlop={0} />;
    // DECOY — without it, the button compiles.
    const own = <Button label="Save" />;
    expect([shrunk, own]).toHaveLength(2);
  });

  /** A pressable drawn at the switch's size, with the slop given, as a conformance subject. */
  const subject = (slop: ReturnType<typeof hitArea> | undefined): ConformanceSubject => ({
    name: 'drawn-small',
    kind: 'interactive',
    paintsNoColour: 'a bare pressable, drawn only to be measured',
    render: (_state: string, theme: Theme): TestNode => {
      const rendered = render(
        <ThemeProvider theme={theme}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Tabular figures"
            hitSlop={slop}
            style={DRAWN}
          />
        </ThemeProvider>,
      );
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const tapFindings = (s: ConformanceSubject): string[] =>
    checkSubject(s, ['dark'])
      .filter((f) => f.rule === 'tap-target')
      .map((f) => f.detail);

  it('passes the drawn switch with its hit area', () => {
    expect(tapFindings(subject(hitArea(DRAWN.width, DRAWN.height)))).toStrictEqual([]);
  });

  it('DECOY — reports the same switch without it, and says what it reached', () => {
    const findings = tapFindings(subject(undefined));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toContain('reaches 34.5 × 18 of the 44 dp target');
  });

  it('reads the slop off the host node, as the rule does', () => {
    const rendered = render(
      <Pressable accessibilityRole="button" accessibilityLabel="x" hitSlop={7} style={DRAWN} />,
    );
    const [node] = pressableNodes(rendered.toJSON() as TestNode);
    expect(node?.hitSlop).toBe(7);
  });
});
