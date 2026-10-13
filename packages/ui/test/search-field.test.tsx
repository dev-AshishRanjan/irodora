/**
 * `SearchField`'s trailing toggle (F-237, ADR-0135 D1): the Atlas's bookmark filter, inside the
 * field it narrows.
 *
 * Three things are held here. Without a toggle the field is the tree it always was, so every
 * screen that has no use for one is untouched. The toggle is a named control that announces its
 * state and goes inert with the field. And its whole hit area is inside the field, because
 * Android does not deliver a touch outside a view's parent, so a slop that reached past the field
 * would be a target drawn and never delivered.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import {
  platformTapTarget,
  SearchField,
  ThemeProvider,
  type SearchFieldToggle,
} from '../src/index.js';
import { tapTargetReach } from '../src/testing/index.js';

const noop = (): void => undefined;

const field = (props: {
  readonly trailing?: SearchFieldToggle;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}) => (
  <ThemeProvider theme="dark">
    <SearchField
      label="Search by name or reading"
      value=""
      onChangeText={noop}
      testID="field"
      {...props}
    />
  </ThemeProvider>
);

const toggle = (selected: boolean, onPress = noop): SearchFieldToggle => ({
  glyph: 'bookmark',
  label: 'Show only bookmarked colours',
  selected,
  onPress,
  testID: 'toggle',
});

const flat = (style: unknown): Record<string, unknown> => ({
  ...(StyleSheet.flatten(style as StyleProp<ViewStyle>) as Record<string, unknown> | undefined),
});

describe('without a toggle, the field is the tree it always was', () => {
  it('renders one text input, padded on both sides alike, and no button', () => {
    render(field({}));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const input = screen.UNSAFE_getByType(TextInput);
    expect(flat(input.props['style'])['paddingRight']).toBeUndefined();
  });

  it('DECOY: with one, the text stops short of it', () => {
    render(field({ trailing: toggle(false) }));
    const input = screen.UNSAFE_getByType(TextInput);
    expect(flat(input.props['style'])['paddingRight']).toBe(platformTapTarget());
  });
});

describe('the toggle', () => {
  it('is named by what it does, and announces whether it is on', () => {
    for (const selected of [false, true]) {
      render(field({ trailing: toggle(selected) }));
      const button = screen.getByRole('button', { name: 'Show only bookmarked colours' });
      expect((button.props['accessibilityState'] as { selected?: boolean }).selected).toBe(
        selected,
      );
      screen.unmount();
    }
  });

  it('calls its handler when pressed', () => {
    const pressed = jest.fn();
    render(field({ trailing: toggle(false, pressed) }));
    fireEvent.press(screen.getByRole('button', { name: 'Show only bookmarked colours' }));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it.each([['disabled'], ['loading']] as const)('is inert when the field is %s', (state) => {
    render(field({ trailing: toggle(false), [state]: true }));
    const button = screen.getByRole('button', { name: 'Show only bookmarked colours' });
    expect((button.props['accessibilityState'] as { disabled?: boolean }).disabled).toBe(true);
  });

  it('DECOY: is live when the field is', () => {
    render(field({ trailing: toggle(false) }));
    const button = screen.getByRole('button', { name: 'Show only bookmarked colours' });
    expect((button.props['accessibilityState'] as { disabled?: boolean }).disabled).toBe(false);
  });
});

describe('its hit area lies inside the field', () => {
  it('sits in a box the size of the tap target, at the trailing edge, the field’s full height', () => {
    render(field({ trailing: toggle(false) }));
    const button = screen.getByTestId('toggle');
    // The box the toggle sits in: the one positioned view in the field.
    const boxes = screen
      .UNSAFE_getAllByType(View)
      .map((v) => flat(v.props['style']))
      .filter((style) => style['position'] === 'absolute');
    expect(boxes).toHaveLength(1);
    const holder = boxes[0] ?? {};
    expect(holder).toMatchObject({ position: 'absolute', top: 0, bottom: 0, right: 0 });
    expect(holder['width']).toBe(platformTapTarget());
    // The glyph and its slop reach the target exactly, so the slop ends at the box's edges.
    const reach = tapTargetReach(flat(button.props['style']), button.props['hitSlop'] as never);
    expect(reach.width).toBe(platformTapTarget());
    // And the field is at least as tall as the box the toggle is centred in.
    const input = screen.UNSAFE_getByType(TextInput);
    expect(flat(input.props['style'])['minHeight']).toBe(nativeTapTarget);
  });
});
