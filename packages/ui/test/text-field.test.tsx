/**
 * `TextField`'s label inside and its drawn form (F-251, ADR-0165): `16`'s palette name field — no
 * label row, an outline in `border` at `sm`, 27 dp tall, the words at `label`.
 *
 * Held here: the label is the accessible name in every form, and the placeholder only while the
 * field is empty; the drawn form takes its drawn height in layout and the platform's target in touch;
 * and without the new props the field is the tree it always was.
 */

import { render, screen } from '@testing-library/react-native';
import { Platform, TextInput, View } from 'react-native';
import { nativeColors, nativeRadius, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { platformTapTarget, TextField, ThemeProvider } from '../src/index.js';
import { flattenStyle } from '../src/testing/index.js';

const noop = (): void => undefined;
const dark = nativeColors.dark;

function input(): Record<string, unknown> {
  return screen.UNSAFE_getByType(TextInput).props;
}

const styleOf = (node: { readonly props: unknown }): Record<string, unknown> =>
  flattenStyle((node.props as { style?: unknown }).style);

describe('the label inside (16)', () => {
  it('draws no label row: the label is the placeholder and the accessible name', () => {
    render(
      <ThemeProvider theme="dark">
        <TextField label="Palette name" labelPlacement="inside" value="" onChangeText={noop} />
      </ThemeProvider>,
    );
    expect(input()['placeholder']).toBe('Palette name');
    expect(input()['accessibilityLabel']).toBe('Palette name');
    // The only text node would be the label row's; there is none.
    expect(screen.queryByText('Palette name')).toBeNull();
  });

  it('keeps the name when the person has typed, as the words replace the placeholder', () => {
    render(
      <ThemeProvider theme="dark">
        <TextField
          label="Palette name"
          labelPlacement="inside"
          value="Kyoto Autumn Linen"
          onChangeText={noop}
        />
      </ThemeProvider>,
    );
    expect(input()['accessibilityLabel']).toBe('Palette name');
    expect(input()['value']).toBe('Kyoto Autumn Linen');
  });

  it('refuses a hint beside it: the placeholder is the label’s', () => {
    const wrong = (
      // @ts-expect-error — inside, the placeholder is the label
      <TextField label="x" labelPlacement="inside" hint="y" value="" onChangeText={noop} />
    );
    expect(wrong).toBeDefined();
  });

  it('DECOY — above (the default) draws the label row and keeps a hint as the placeholder', () => {
    render(
      <ThemeProvider theme="dark">
        <TextField label="Palette name" hint="Evening walk" value="" onChangeText={noop} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Palette name')).toBeTruthy();
    expect(input()['placeholder']).toBe('Evening walk');
  });
});

describe('the drawn form (16: 27 dp, outlined, sm)', () => {
  const HEIGHT = 27;

  const drawn = (): void => {
    render(
      <ThemeProvider theme="dark">
        <TextField
          label="Palette name"
          labelPlacement="inside"
          value=""
          onChangeText={noop}
          height={HEIGHT}
          radius="sm"
          size="label"
          testID="field"
        />
      </ThemeProvider>,
    );
  };

  it('draws its outline at the drawn height, in border, at the sm corner, under the input', () => {
    drawn();
    const outline = screen.UNSAFE_getAllByType(View).find((v) => styleOf(v)['height'] === HEIGHT);
    expect(outline).toBeDefined();
    expect(outline?.props['pointerEvents']).toBe('none');
    expect(styleOf(outline as never)).toMatchObject({
      borderWidth: 1,
      borderColor: dark.border,
      borderRadius: nativeRadius.sm,
    });
  });

  it('sets the words at its step and gives the input the platform’s target', () => {
    drawn();
    const style = flattenStyle(input()['style']);
    expect(style['fontSize']).toBe(nativeType.latin.label.fontSize);
    expect(style['height']).toBe(Math.max(platformTapTarget(), HEIGHT));
    expect(style['height']).toBeGreaterThanOrEqual(nativeTapTarget);
  });

  it('takes only its drawn height in layout: the target’s overhang is given back by margins', () => {
    drawn();
    const touch = Math.max(platformTapTarget(), HEIGHT);
    const box = screen.UNSAFE_getAllByType(View).find((v) => styleOf(v)['height'] === touch);
    expect(styleOf(box as never)['marginVertical']).toBe(-(touch - HEIGHT) / 2);
  });

  it('reaches Material’s 48 on Android, with the drawn height unchanged', () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      drawn();
      const style = flattenStyle(input()['style']);
      expect(style['height']).toBe(48);
      const outline = screen.UNSAFE_getAllByType(View).find((v) => styleOf(v)['height'] === HEIGHT);
      expect(outline).toBeDefined();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });

  it('draws focus as a ring on the outline, not as a fill', () => {
    render(
      <ThemeProvider theme="dark">
        <TextField
          label="Palette name"
          labelPlacement="inside"
          value=""
          onChangeText={noop}
          height={HEIGHT}
          focused
        />
      </ThemeProvider>,
    );
    const outline = screen.UNSAFE_getAllByType(View).find((v) => styleOf(v)['height'] === HEIGHT);
    expect(styleOf(outline as never)).toMatchObject({ borderWidth: 2, borderColor: dark.ring });
  });

  it('DECOY — without a height the field is the filled one it always was', () => {
    render(
      <ThemeProvider theme="dark">
        <TextField label="Palette name" value="" onChangeText={noop} />
      </ThemeProvider>,
    );
    const style = flattenStyle(input()['style']);
    expect(style).toMatchObject({
      backgroundColor: dark['surface.2'],
      borderRadius: nativeRadius.md,
      minHeight: nativeTapTarget,
      fontSize: nativeType.latin.body.fontSize,
    });
  });
});
