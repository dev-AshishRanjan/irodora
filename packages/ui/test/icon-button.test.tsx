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
import Svg, { Path } from 'react-native-svg';
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
    // @ts-expect-error — nor is naming it after another element.
    const borrowed = <IconButton name="share" label="Share" accessibilityLabelledBy="h" />;
    // @ts-expect-error — nor the web spelling of either.
    const aria = <IconButton name="share" label="Share" aria-labelledby="h" />;
    // DECOY — a hint describes what happens; it is not a name, and it compiles.
    const hinted = <IconButton name="share" label="Share" accessibilityHint="Opens a sheet" />;
    expect([doubled, borrowed, aria, hinted]).toHaveLength(4);
  });

  it('refuses a role, a state or a hiding that would contradict what it announces', () => {
    // @ts-expect-error — the role is the component's.
    const role = <IconButton name="share" label="Share" accessibilityRole="image" />;
    // @ts-expect-error — in either spelling.
    const webRole = <IconButton name="share" label="Share" role="img" />;
    // @ts-expect-error — the state comes from `disabled` and `loading`, and nowhere else.
    const state = <IconButton name="share" label="Share" accessibilityState={{}} />;
    // @ts-expect-error — nor the web spelling of it.
    const ariaOff = <IconButton name="share" label="Share" aria-disabled={false} />;
    // @ts-expect-error — nor busy.
    const ariaBusy = <IconButton name="share" label="Share" aria-busy />;
    // @ts-expect-error — a control a screen reader cannot reach is not a control.
    const hidden = <IconButton name="share" label="Share" aria-hidden />;
    // @ts-expect-error — in any of its forms.
    const merged = <IconButton name="share" label="Share" accessible={false} />;
    // @ts-expect-error — including Android's.
    const removed = <IconButton name="share" label="Share" importantForAccessibility="no" />;
    // DECOY — the props that set the state honestly compile.
    const honest = <IconButton name="share" label="Share" disabled loading={false} testID="t" />;
    expect([role, webRole, state, ariaOff, ariaBusy, hidden, merged, removed, honest]).toHaveLength(
      9,
    );
  });

  it('keeps its role and state when a cast slips the refused props past the type', () => {
    // React Native gives each `aria-*` prop precedence over its `accessibility*` twin, so the web
    // spellings are the ones that would win if they got through.
    const smuggled = {
      accessibilityRole: 'image',
      accessibilityState: { disabled: false, busy: false },
      accessibilityLabel: 'Something else',
      accessible: false,
      'aria-label': 'Something else again',
      'aria-disabled': false,
      'aria-busy': true,
      'aria-hidden': true,
    } as unknown as Record<string, never>;
    render(
      <ThemeProvider theme="dark">
        <IconButton name="share" label="Share this colour" disabled {...smuggled} testID="b" />
      </ThemeProvider>,
    );
    // THE NATIVE VIEWS ARE WHAT IS READ, not a role query. The testing library judges "hidden" by
    // walking every ancestor's props, composite ones included, so the `aria-hidden` still sitting on
    // the IconButton ELEMENT hides everything beneath it from its queries — a prop no native view
    // ever receives. The views below are what a screen reader is given.
    const hosts = screen.getAllByTestId('b', { includeHiddenElements: true });
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
      const p = host.props as Record<string, unknown>;
      expect(p['accessibilityRole']).toBe('button');
      expect(p['accessibilityLabel']).toBe('Share this colour');
      expect(p['accessibilityState']).toEqual({ disabled: true, busy: false });
      expect(p['accessible']).toBe(true);
      for (const key of ['aria-hidden', 'aria-label', 'aria-busy', 'aria-disabled'])
        expect(p[key]).toBeUndefined();
      expect(p['accessibilityElementsHidden']).not.toBe(true);
      expect(p['importantForAccessibility']).not.toBe('no-hide-descendants');
    }
    // DECOY — neither smuggled name is on anything.
    expect(
      screen.queryAllByLabelText(/Something else/u, { includeHiddenElements: true }),
    ).toHaveLength(0);
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
    // The glyph INSIDE this button is the one hidden — read off the drawing, not off the absence of
    // a second label, which an exposed but unnamed glyph would satisfy just as well.
    const drawing = button.findByType(Svg);
    expect(drawing.props['accessible']).toBe(false);
    expect(drawing.props['importantForAccessibility']).toBe('no-hide-descendants');
    // DECOY — the control around it is not hidden.
    expect(button.props['importantForAccessibility']).not.toBe('no-hide-descendants');
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
