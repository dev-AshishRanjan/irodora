/**
 * `IconButton` (F-228): a glyph that is the whole of a control, and the name it cannot be without.
 *
 * The refusals are `@ts-expect-error`, so `tsc` is the check: if a line under one starts compiling,
 * typecheck goes red on the unused directive. Each is paired with a decoy that compiles, so a
 * refusal that holds for some unrelated reason — a typo in the glyph name — is not mistaken for
 * the one being claimed [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 */

import { render, screen } from '@testing-library/react-native';
import { nativeColors, nativeTapTarget } from '@irodora/design-tokens';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Path } from 'react-native-svg';
import { Glyph, IconButton, ThemeProvider } from '../src/index.js';

const INK = '#F2F2F2';

const pathsOf = (node: React.JSX.Element): string[] =>
  render(node)
    .UNSAFE_queryAllByType(Path)
    .map((p) => String((p.props as { d?: unknown }).d));

describe('an icon-only control cannot be written without its name', () => {
  it('refuses a missing label, and compiles the named one beside it', () => {
    // @ts-expect-error — `label` is required: the glyph is all a screen-reader user would get.
    const unnamed = <IconButton name="share" />;
    const named = <IconButton name="share" label="Share this colour" />;
    expect([unnamed, named]).toHaveLength(2);
  });

  it('refuses a second name by the side door, where it could disagree with the first', () => {
    // @ts-expect-error — `accessibilityLabel` is not a prop; `label` is the one name.
    const doubled = <IconButton name="share" label="Share" accessibilityLabel="Export" />;
    expect(doubled).toBeDefined();
  });

  it('refuses a glyph no mockup draws, and compiles one that is drawn', () => {
    // @ts-expect-error — `calendar` is in the acceptance list and in no mockup (F-228).
    const undrawn = <IconButton name="calendar" label="Pick a date" />;
    const drawn = <IconButton name="history" label="Show history" />;
    expect([undrawn, drawn]).toHaveLength(2);
  });
});

describe('what a screen reader and a finger get', () => {
  it('is one button, named by its label, with the glyph hidden inside it', () => {
    render(
      <ThemeProvider theme="dark">
        <IconButton name="share" label="Share this colour" />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: 'Share this colour' });
    expect(button).toBeTruthy();
    // The glyph is decorative: the only name in the tree is the control's.
    expect(screen.queryAllByLabelText(/share/iu)).toHaveLength(1);
  });

  it('announces disabled and busy from the two props that set them', () => {
    render(
      <ThemeProvider theme="dark">
        <IconButton name="export" label="Export the report" disabled />
        <IconButton name="export" label="Exporting the report" loading />
        <IconButton name="export" label="Export again" />
      </ThemeProvider>,
    );
    const role = 'button';
    expect(
      screen.getByRole(role, { name: 'Export the report', disabled: true, busy: false }),
    ).toBeTruthy();
    expect(
      screen.getByRole(role, { name: 'Exporting the report', disabled: true, busy: true }),
    ).toBeTruthy();
    // DECOY — the filter is not satisfied by any button: the plain one is neither.
    expect(screen.queryByRole(role, { name: 'Export again', disabled: true })).toBeNull();
    expect(
      screen.getByRole(role, { name: 'Export again', disabled: false, busy: false }),
    ).toBeTruthy();
  });

  it('declares the tap target, not the glyph’s size', () => {
    render(
      <ThemeProvider theme="dark">
        <IconButton name="back" label="Back" size={16} testID="small" />
      </ThemeProvider>,
    );
    const style = StyleSheet.flatten(
      screen.getByTestId('small').props['style'] as StyleProp<ViewStyle>,
    );
    expect(style.minWidth).toBe(nativeTapTarget);
    expect(style.minHeight).toBe(nativeTapTarget);
    expect(nativeTapTarget).toBeGreaterThan(16);
  });
});

describe('what it draws', () => {
  it('draws the registry’s glyph, and no other', () => {
    const inButton = pathsOf(
      <ThemeProvider theme="dark">
        <IconButton name="history" label="Show history" />
      </ThemeProvider>,
    );
    expect(inButton.length).toBeGreaterThan(0);
    expect(inButton).toEqual(pathsOf(<Glyph name="history" color={INK} />));
    // DECOY — a different glyph is told apart, so the equality is not vacuous.
    expect(inButton).not.toEqual(pathsOf(<Glyph name="refresh" color={INK} />));
  });

  it('draws the filled state only when asked', () => {
    const inButton = (filled: boolean): string[] =>
      pathsOf(
        <ThemeProvider theme="dark">
          <IconButton name="compass" label="Explore" filled={filled} />
        </ThemeProvider>,
      );
    expect(inButton(true)).toEqual(pathsOf(<Glyph name="compass" color={INK} filled />));
    expect(inButton(false)).not.toEqual(inButton(true));
  });

  it('inks the glyph with the theme token it is given, in each theme', () => {
    for (const theme of ['light', 'dark'] as const) {
      const strokes = render(
        <ThemeProvider theme={theme}>
          <IconButton name="history" label="Show history" color="foreground.2" />
        </ThemeProvider>,
      )
        .UNSAFE_queryAllByType(Path)
        .map((p) => (p.props as { stroke?: unknown }).stroke);
      expect(new Set(strokes)).toEqual(new Set([nativeColors[theme]['foreground.2']]));
    }
  });
});
