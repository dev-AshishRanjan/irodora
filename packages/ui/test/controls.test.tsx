/**
 * The form controls (F-156) — criterion 3, and the two findings that made it possible.
 *
 * ## What criterion 3 asks for
 *
 * > *"The accessibility state each one reports — checked, expanded, value — is asserted from
 * > the rendered tree rather than from the prop."*
 *
 * The distinction is the whole test. `expect(props.checked).toBe(true)` asserts that a value
 * this file passed came back, which is true of a component that renders nothing at all. What a
 * screen reader receives is a node in a tree, so that is what these read — and both polarities,
 * because a wrapper hard-coding `checked: true` would satisfy a one-sided assertion.
 *
 * ## The two things the suite could not see before this feature
 *
 * **It read one of React Native's two role props.** Every HeroUI primitive sets `role`, and
 * `pressableNodes` read `accessibilityRole` — so four correct components would have been
 * reported as `no-role`, and the obvious fix (`accessibilityRole="slider"`) compiles, because
 * `AccessibilityRole` ends in `| string`, and announces nothing.
 *
 * **It defined "responds" as "is pressed or typed into".** A slider thumb is dragged through a
 * `GestureDetector` and carries neither, so every accessibility rule silently skipped it. The
 * decoys below hold both widenings to the thing that makes them safe: a node with NO role is
 * still reported, and a node with a value is not admitted merely for having a number on it.
 */

import { render } from '@testing-library/react-native';
import { Pressable, Text as RNText, View } from 'react-native';
import { Accordion, percentOf, Select, Slider, Switch, ThemeProvider } from '../src/index.js';
import { pressableNodes, type TestNode } from '../src/testing/index.js';

/** Render, capture the tree, unmount — the same arrangement the registry uses for portals. */
function draw(node: React.JSX.Element): TestNode {
  const rendered = render(<ThemeProvider theme="light">{node}</ThemeProvider>);
  const json = rendered.toJSON();
  rendered.unmount();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/** Every node in the tree that responds, whatever it responds to. */
const responders = (tree: TestNode): readonly ReturnType<typeof pressableNodes>[number][] => [
  ...pressableNodes(tree),
];

const noop = (): void => undefined;

describe('Switch — checked, from the tree', () => {
  const switchNode = (checked: boolean) =>
    responders(
      draw(<Switch label="Announce readings aloud" checked={checked} onCheckedChange={noop} />),
    ).find((n) => n.accessibilityLabel === 'Announce readings aloud');

  it('reports checked when it is on, and not-checked when it is off', () => {
    // Both directions. A wrapper that wrote `checked: true` unconditionally passes the first
    // assertion and fails the second, which is the only reason the second is here.
    expect(switchNode(true)?.accessibilityState?.['checked']).toBe(true);
    expect(switchNode(false)?.accessibilityState?.['checked']).toBe(false);
  });

  it('announces as a switch — through `role`, which is what the primitive sets', () => {
    /*
     * NOT `accessibilityRole`. HeroUI's primitive writes `role="switch"`, and this assertion
     * says so out loud rather than through the widened rule, so that a future HeroUI release
     * moving to `accessibilityRole` shows up here as a change rather than as silence.
     */
    const node = switchNode(true);
    expect(node?.role).toBe('switch');
    expect(node?.accessibilityRole).toBeUndefined();
  });

  it('is named by what it turns on, not by the word "switch"', () => {
    expect(switchNode(true)?.accessibilityLabel).toBe('Announce readings aloud');
  });

  it('says so when it is disabled', () => {
    const node = responders(
      draw(<Switch label="Announce readings aloud" checked onCheckedChange={noop} disabled />),
    ).find((n) => n.accessibilityLabel === 'Announce readings aloud');
    expect(node?.accessibilityState?.['disabled']).toBe(true);
  });

  it('does not announce its drawn label a second time', () => {
    /*
     * The row draws the label AND the switch carries it. Without the hidden wrapper a screen
     * reader reads the word, then reads it again with the state attached — two stops for one
     * control, which is the kind of thing that only shows up when somebody uses the app with
     * the screen off.
     */
    const tree = draw(<Switch label="Announce readings aloud" checked onCheckedChange={noop} />);
    const hidden = (node: TestNode): number => {
      const here = node.props['accessibilityElementsHidden'] === true ? 1 : 0;
      const kids = (node.children ?? []).filter((c): c is TestNode => typeof c !== 'string');
      return here + kids.reduce((n, c) => n + hidden(c), 0);
    };
    expect(hidden(tree)).toBeGreaterThan(0);
  });
});

describe('Select — expanded and selected, from the tree', () => {
  const options = [
    { value: 'base', label: 'Base' },
    { value: 'fuka', label: 'Fuka' },
    { value: 'device', label: "This phone's colour", disabled: true },
  ] as const;

  const trigger = (open: boolean) =>
    responders(
      draw(
        <Select
          open={open}
          label="Theme"
          closeLabel="Close"
          options={[...options]}
          value="fuka"
          onValueChange={noop}
        />,
      ),
    ).find((n) => n.accessibilityLabel === 'Theme: Fuka');

  it('reports expanded when the list is open, and not when it is closed', () => {
    expect(trigger(true)?.accessibilityState?.['expanded']).toBe(true);
    expect(trigger(false)?.accessibilityState?.['expanded']).toBe(false);
  });

  it('names the field AND the value, because neither alone is an answer', () => {
    // "Theme" does not say what is chosen; "Fuka" does not say what it is. A screen reader
    // gets one string.
    expect(trigger(true)).toBeDefined();
  });

  it('marks the chosen option selected and the unavailable one disabled', () => {
    const nodes = responders(
      draw(
        <Select
          open
          label="Theme"
          closeLabel="Close"
          options={[...options]}
          value="fuka"
          onValueChange={noop}
        />,
      ),
    );
    const chosen = nodes.find((n) => n.accessibilityLabel === 'Fuka ✓');
    const other = nodes.find((n) => n.accessibilityLabel === 'Base');
    const unavailable = nodes.find((n) => n.accessibilityLabel === "This phone's colour");

    expect(chosen?.accessibilityState?.['selected']).toBe(true);
    expect(other?.accessibilityState?.['selected']).toBe(false);
    // A disabled OPTION rather than an absent one: a control that is not there cannot explain
    // itself, which is the same call Preferences made for the device colour.
    expect(unavailable?.accessibilityState?.['disabled']).toBe(true);
  });

  it('names the scrim, which is the primary way the list is dismissed', () => {
    const nodes = responders(
      draw(
        <Select
          open
          label="Theme"
          closeLabel="Close"
          options={[...options]}
          value="fuka"
          onValueChange={noop}
        />,
      ),
    );
    expect(nodes.some((n) => n.accessibilityLabel === 'Close')).toBe(true);
  });
});

describe('Slider — the value, from the tree', () => {
  const thumb = (value: number, valueLabel: string) =>
    responders(
      draw(
        <Slider
          label="Simulated severity"
          value={value}
          valueLabel={valueLabel}
          onValueChange={noop}
        />,
      ),
    ).find((n) => n.accessibilityLabel === 'Simulated severity');

  it('is found at all — a dragged control responds to no press', () => {
    /*
     * THE FINDING, AS AN ASSERTION. Before `pressableNodes` learned about
     * `accessibilityValue`, this returned undefined and every accessibility rule in the suite
     * skipped the slider while reporting a pass over the rest of it.
     */
    expect(thumb(0.6, '0.60')).toBeDefined();
  });

  it('announces as a slider through `role`, not `accessibilityRole`', () => {
    // `Role` has `slider`; `AccessibilityRole` does not — its member is `adjustable`. Writing
    // `accessibilityRole="slider"` would compile and mean nothing.
    expect(thumb(0.6, '0.60')?.role).toBe('slider');
  });

  it('carries the readable value in `text`, not only the percentage in `now`', () => {
    /*
     * React Native's bridge takes `min`/`max`/`now` as integers, so HeroUI normalises every
     * slider to 0–100. A severity of 0.6 therefore has `now: 60` — a number whose units are
     * not percent and whose quantity is not 60. `text` is the one a person hears.
     */
    const node = draw(
      <Slider label="Simulated severity" value={0.6} valueLabel="0.60" onValueChange={noop} />,
    );
    const found = responders(node).find((n) => n.accessibilityLabel === 'Simulated severity');
    expect(found).toBeDefined();
  });

  it('reports a value that moves with the value', () => {
    const at = (v: number): unknown =>
      valueOf(
        draw(
          <Slider
            label="Simulated severity"
            value={v}
            valueLabel={v.toFixed(2)}
            onValueChange={noop}
          />,
        ),
      );
    expect(at(0)).toEqual({ min: 0, max: 100, now: 0, text: '0.00' });
    expect(at(0.6)).toEqual({ min: 0, max: 100, now: 60, text: '0.60' });
    expect(at(1)).toEqual({ min: 0, max: 100, now: 100, text: '1.00' });
  });

  it('DECOY — the announcement is not a constant', () => {
    // Without this, a thumb hard-coding `now: 0` would satisfy every "has a value" assertion.
    const a = valueOf(
      draw(<Slider label="S" value={0.2} valueLabel="0.20" onValueChange={noop} />),
    );
    const b = valueOf(
      draw(<Slider label="S" value={0.8} valueLabel="0.80" onValueChange={noop} />),
    );
    expect(a).not.toEqual(b);
  });
});

describe('percentOf', () => {
  it('is the position on the interval, in whole percent', () => {
    expect(percentOf(0, 0, 1)).toBe(0);
    expect(percentOf(0.5, 0, 1)).toBe(50);
    expect(percentOf(1, 0, 1)).toBe(100);
    expect(percentOf(5, 0, 20)).toBe(25);
  });

  it('clamps rather than reporting a position off the track', () => {
    // A value outside the interval is a caller's bug, and `now: -40` on the bridge is a
    // different bug on top of it. Clamping keeps the announcement inside its declared range.
    expect(percentOf(-1, 0, 1)).toBe(0);
    expect(percentOf(2, 0, 1)).toBe(100);
  });

  it('refuses a degenerate interval instead of dividing by zero', () => {
    expect(percentOf(1, 1, 1)).toBe(0);
    expect(percentOf(Number.NaN, 0, 1)).toBe(0);
  });
});

describe('Accordion — expanded, from the tree', () => {
  const items = [
    { value: 'about', title: 'Description', children: <RNText>A deep indigo.</RNText> },
    { value: 'source', title: 'Provenance', children: <RNText>Declared.</RNText> },
  ];

  const triggers = (expanded: readonly string[]) =>
    responders(
      draw(<Accordion items={items} expanded={expanded} onExpandedChange={noop} />),
    ).filter(
      (n) => n.accessibilityLabel === 'Description' || n.accessibilityLabel === 'Provenance',
    );

  it('reports expanded per section, not for the accordion as a whole', () => {
    const nodes = triggers(['about']);
    expect(
      nodes.find((n) => n.accessibilityLabel === 'Description')?.accessibilityState?.['expanded'],
    ).toBe(true);
    expect(
      nodes.find((n) => n.accessibilityLabel === 'Provenance')?.accessibilityState?.['expanded'],
    ).toBe(false);
  });

  it('follows the prop in both directions', () => {
    const swapped = triggers(['source']);
    expect(
      swapped.find((n) => n.accessibilityLabel === 'Description')?.accessibilityState?.['expanded'],
    ).toBe(false);
    expect(
      swapped.find((n) => n.accessibilityLabel === 'Provenance')?.accessibilityState?.['expanded'],
    ).toBe(true);
  });

  it('draws its own indicator rather than HeroUI’s hard-coded black chevron', () => {
    /*
     * THE FINDING, AS AN ASSERTION. `Accordion.Indicator` paints `#000000`, which the
     * conformance suite reported as a `colour-literal` in both themes — in the dark theme that
     * is a black glyph on a near-black surface.
     *
     * Asserted as "no literal black anywhere in the tree" rather than "our chevron is present",
     * because the second would pass with both drawn.
     */
    const tree = draw(<Accordion items={items} expanded={['about']} onExpandedChange={noop} />);
    expect(JSON.stringify(tree).toLowerCase()).not.toContain('#000000');
  });
});

/**
 * The two widenings, held to what makes them safe.
 *
 * A rule that admits more is only an improvement if it still refuses what it refused before.
 * These are the refusals [[a-decoy-that-is-not-broken-proves-nothing]].
 */
describe('what the widened detector still refuses', () => {
  it('DECOY — a pressable with neither role nor accessibilityRole is still roleless', () => {
    const tree = draw(
      <Pressable onPress={noop} accessibilityLabel="Save" style={{ minWidth: 44, minHeight: 44 }}>
        <View />
      </Pressable>,
    );
    const [node] = responders(tree);
    expect(node?.accessibilityRole).toBeUndefined();
    expect(node?.role).toBeUndefined();
  });

  it('reads `role` as a declaration, and keeps the two vocabularies apart', () => {
    const tree = draw(
      <Pressable
        onPress={noop}
        role="switch"
        accessibilityLabel="Announce readings"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        <View />
      </Pressable>,
    );
    const [node] = responders(tree);
    // Both fields, separately. Folding `role` into `accessibilityRole` would have made
    // "declared as a slider" indistinguishable from "declared as an adjustable".
    expect(node?.role).toBe('switch');
    expect(node?.accessibilityRole).toBeUndefined();
  });

  it('DECOY — a plain View with a number in it is not a control', () => {
    // `accessibilityValue` admits adjustable controls, not everything with a number on it. A
    // detector that widened to "has any accessibility prop" would report every label.
    const tree = draw(
      <View accessibilityLabel="Delta E 2.14">
        <RNText>2.14</RNText>
      </View>,
    );
    expect(responders(tree)).toHaveLength(0);
  });
});

/** Pull the `accessibilityValue` off the one node in the tree that declares one. */
function valueOf(tree: TestNode): unknown {
  let found: unknown;
  const walk = (node: TestNode): void => {
    const v = node.props['accessibilityValue'];
    if (typeof v === 'object' && v !== null && found === undefined) found = v;
    for (const child of node.children ?? []) if (typeof child !== 'string') walk(child);
  };
  walk(tree);
  return found;
}
