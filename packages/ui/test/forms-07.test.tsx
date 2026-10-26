/**
 * The forms `07` draws, added to four components (F-248, ADR-0153). Each is additive: without its
 * prop the component draws exactly what it drew before, and each test below holds that default as
 * its decoy.
 *
 * - `Button on`: the compact *Swap* sits on a colour sample, so its words, glyph and outline take the
 *   ink the sample takes for text (C8), not a theme token.
 * - `Button glyphTint`, `selected`, and the plain form's `weight`: the gold padlock on *Lock*, the
 *   toggle announced as selected, and the back word drawn at 500.
 * - `ChoiceGroup` segmented `fit: 'content'`: segments sized by their words, scrolling where they
 *   cannot fit.
 * - `ActionBar note`: the line that says why an action cannot be used.
 * - `AppBarBack.weight`: the back word's weight, forwarded.
 */

import { render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, type Theme } from '@irodora/design-tokens';
import {
  ActionBar,
  AppBar,
  Button,
  ChoiceGroup,
  Glyph,
  sampleInk,
  Text,
  ThemeProvider,
  type Sample,
} from '../src/index.js';
import { flattenStyle } from '../src/testing/index.js';

const draw = (node: React.JSX.Element, theme: Theme = 'dark') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
const noop = (): void => undefined;

/** A sample from OKLCh, with its provenance (ADR-0005), and its rendered hex the engine's. */
const sampleOf = (hex: string, l: number): Sample => ({
  hex,
  color: fromSpace('oklch', [l, 0.02, 250], { source: 'declared', confidence: 1 }),
});
const LIGHT = sampleOf('#CDC4B9', 0.82);
const DARK = sampleOf('#1F2025', 0.24);

/** The style of the host node a test id lands on. */
const hostStyle = (id: string): Readonly<Record<string, unknown>> => {
  const nodes = screen.getAllByTestId(id, { includeHiddenElements: true });
  const host = nodes.find((n) => typeof n.type === 'string') ?? nodes[0];
  return flattenStyle(host?.props['style']);
};
/** The rendered colour of the first Text in the tree with these words. */
const inkOf = (words: string): unknown => {
  const text = screen.UNSAFE_getAllByType(Text).find((t) => t.props['children'] === words);
  const host = text?.findAll((n) => (n.type as unknown) === 'Text')[0];
  return flattenStyle(host?.props['style'])['color'];
};

describe('Button on a sample (C8, ADR-0153 D2)', () => {
  it.each([
    ['light', LIGHT],
    ['dark', DARK],
  ] as const)('on a %s sample, the words, glyph and outline are the sample’s ink', (_, on) => {
    for (const theme of ['dark', 'light'] as const) {
      draw(
        <Button
          variant="secondary"
          label="Swap"
          glyph="refresh"
          on={on}
          onPress={noop}
          testID="swap"
        />,
        theme,
      );
      const ink = sampleInk(on.hex, nativeColors[theme]).hex;
      expect({ theme, ink: inkOf('Swap') }).toStrictEqual({ theme, ink });
      expect(hostStyle('swap')['borderColor']).toBe(ink);
      expect(screen.UNSAFE_getByType(Glyph).props['color']).toBe(ink);
      screen.unmount();
    }
  });

  it('DECOY: without `on` the outline is the theme’s token and the words its foreground', () => {
    draw(<Button variant="secondary" label="Swap" onPress={noop} testID="swap" />);
    expect(hostStyle('swap')['borderColor']).toBe(nativeColors.dark['border.strong']);
    expect(inkOf('Swap')).toBe(nativeColors.dark.foreground);
  });

  it('the two inks the samples take differ, so the test above can tell them apart', () => {
    expect(sampleInk(LIGHT.hex, nativeColors.dark).hex).not.toBe(
      sampleInk(DARK.hex, nativeColors.dark).hex,
    );
  });
});

describe('Button’s glyph tint, toggle state and plain weight', () => {
  it('tints the glyph in glyph.lock and leaves the words their ink (07’s padlock)', () => {
    draw(
      <Button
        variant="tonal"
        level={3}
        label="Lock"
        glyph="lock-solid"
        glyphTint="glyph.lock"
        onPress={noop}
      />,
    );
    expect(screen.UNSAFE_getByType(Glyph).props['color']).toBe(nativeColors.dark['glyph.lock']);
    expect(inkOf('Lock')).toBe(nativeColors.dark.foreground);
    screen.unmount();
    // DECOY: without the tint, the glyph takes the words' ink.
    draw(<Button variant="tonal" level={3} label="Lock" glyph="lock-solid" onPress={noop} />);
    expect(screen.UNSAFE_getByType(Glyph).props['color']).toBe(nativeColors.dark.foreground);
  });

  it('announces a toggle’s state as selected, and says nothing of one it was not given', () => {
    for (const selected of [true, false]) {
      draw(<Button label="Locked" selected={selected} onPress={noop} testID="lock" />);
      const state = screen.getByTestId('lock').props['accessibilityState'] as {
        selected?: boolean;
      };
      expect(state.selected).toBe(selected);
      screen.unmount();
    }
    // DECOY: no `selected`, no selected state announced — React Native's Pressable merges its aria
    // state in, so the key may be present, but its value is undefined, which announces nothing.
    draw(<Button label="Save" onPress={noop} testID="save" />);
    const bare = screen.getByTestId('save').props['accessibilityState'] as { selected?: boolean };
    expect(bare.selected).toBeUndefined();
  });

  it('draws a plain word at 500 where asked, and at board 00’s 400 by default', () => {
    const weightOf = (words: string): unknown => {
      const text = screen.UNSAFE_getAllByType(Text).find((t) => t.props['children'] === words);
      const host = text?.findAll((n) => (n.type as unknown) === 'Text')[0];
      return flattenStyle(host?.props['style'])['fontWeight'] ?? '400';
    };
    draw(<Button variant="plain" label="Ai-nezumi" weight={500} onPress={noop} />);
    expect(weightOf('Ai-nezumi')).toBe('500');
    screen.unmount();
    draw(<Button variant="plain" label="Atlas" onPress={noop} />);
    expect(weightOf('Atlas')).toBe('400');
  });
});

describe('AppBar’s back word takes its weight (07’s 500)', () => {
  it('forwards the weight to the back control, and leaves it 400 without one', () => {
    const back = (weight?: 500) =>
      draw(
        <AppBar
          back={{
            glyph: 'back',
            label: 'Ai-nezumi',
            name: 'Back to Ai-nezumi',
            onPress: noop,
            ...(weight === undefined ? {} : { weight }),
          }}
        />,
      );
    back(500);
    expect(screen.UNSAFE_getByType(Button).props['weight']).toBe(500);
    screen.unmount();
    back();
    expect(screen.UNSAFE_getByType(Button).props['weight']).toBeUndefined();
  });
});

describe('ChoiceGroup segmented, sized by its words (07, ADR-0153 D6)', () => {
  const OPTIONS = [
    { value: 'casual', label: 'Casual' },
    { value: 'office', label: 'Office' },
    { value: 'japanese-inspired', label: 'Japanese-inspired' },
    { value: 'formal', label: 'Formal' },
  ] as const;
  const group = (fit?: 'content') =>
    draw(
      <ChoiceGroup
        label="Occasion"
        options={OPTIONS}
        value="office"
        onChange={noop}
        segmented={{
          mark: 'dot',
          selectedFill: 'accent',
          radius: 'sm',
          ...(fit === undefined ? {} : { fit }),
        }}
      />,
    );
  const segmentStyles = () =>
    screen
      .getAllByRole('radio', { includeHiddenElements: true })
      .map((n) => flattenStyle(n.props['style']));

  it('grows each segment from its words and never shrinks one, inside a row that can scroll', () => {
    group('content');
    const styles = segmentStyles();
    expect(styles).toHaveLength(4);
    for (const s of styles)
      expect([s['flexGrow'], s['flexShrink'], s['flex']]).toStrictEqual([1, 0, undefined]);
    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(scroll.props['horizontal']).toBe(true);
  });

  it('DECOY: the default shares the row equally and does not scroll', () => {
    group();
    for (const s of segmentStyles()) expect(s['flex']).toBe(1);
    expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
  });
});

describe('ActionBar’s note (07’s disabled save, ADR-0152 D5)', () => {
  const bar = (note?: string) =>
    draw(
      <ActionBar
        testID="bar"
        actions={[
          { label: 'Save to Outfit Lab', disabled: true, onPress: noop },
          { variant: 'secondary', label: 'Export Palette Tokens', onPress: noop },
        ]}
        {...(note === undefined ? {} : { note })}
      />,
    );

  it('says why an action cannot be used, in words under the actions, announced politely', () => {
    bar('Build a profile to use the Outfit Lab.');
    const note = screen.getByTestId('bar.note');
    expect(note.props['accessibilityLiveRegion']).toBe('polite');
    expect(note.props['children']).toBe('Build a profile to use the Outfit Lab.');
    // The actions keep their row.
    const toolbar = screen.getByTestId('bar');
    expect(flattenStyle(toolbar.props['style'])['flexDirection']).toBeUndefined();
  });

  it('DECOY: without a note the bar is the row it always was, with no note node', () => {
    bar();
    expect(screen.queryByTestId('bar.note')).toBeNull();
    expect(flattenStyle(screen.getByTestId('bar').props['style'])['flexDirection']).toBe('row');
  });
});
