/**
 * `Button` and `Chip` own their name, role and state (F-232), as `IconButton` does (F-228).
 *
 * The refusals are `@ts-expect-error`, so `tsc` is the check: if a line under one starts compiling,
 * typecheck goes red on the unused directive. Each group has a decoy that compiles, so a refusal
 * that holds for an unrelated reason is not mistaken for the one claimed
 * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]. The render half is what a cast gets past
 * the type: F-228's review found `Button` spread its caller's props AFTER its own role, name and
 * state, so a caller could rename it or contradict its state, and an `aria-*` prop would have won
 * over its `accessibility*` twin whatever the order.
 */

import { render, screen } from '@testing-library/react-native';
import { Button, Chip, ThemeProvider } from '../src/index.js';
import { OWNED_ACCESSIBILITY, withoutOwnedAccessibility } from '../src/ownedAccessibility.js';

describe('Button and Chip cannot be renamed, re-roled or contradicted by a caller', () => {
  it('refuses a second name, and compiles a hint', () => {
    // @ts-expect-error — `label` is the one name.
    const b1 = <Button label="Save" accessibilityLabel="Export" />;
    // @ts-expect-error — nor its web spelling.
    const b2 = <Button label="Save" aria-label="Export" />;
    // @ts-expect-error — the chip's name carries its selection; a second name would drop it.
    const c1 = <Chip label="Warm" accessibilityLabel="Cool" />;
    // @ts-expect-error — nor named after another element.
    const c2 = <Chip label="Warm" aria-labelledby="h" />;
    // DECOY — a hint names nothing and states nothing, and it compiles on both.
    const b3 = <Button label="Save" accessibilityHint="Keeps this garment" />;
    const c3 = <Chip label="Warm" accessibilityHint="Filters the atlas" />;
    expect([b1, b2, c1, c2, b3, c3]).toHaveLength(6);
  });

  it('refuses a role, a state or a hiding, and compiles the honest props', () => {
    // @ts-expect-error — the role is the component's.
    const b1 = <Button label="Save" accessibilityRole="link" />;
    // @ts-expect-error — the state comes from `disabled` and `loading`.
    const b2 = <Button label="Save" aria-disabled={false} />;
    // @ts-expect-error — a control a screen reader cannot reach is not a control.
    const b3 = <Button label="Save" importantForAccessibility="no" />;
    // @ts-expect-error — the selection comes from `selected`, and nowhere else.
    const c1 = <Chip label="Warm" aria-selected />;
    // @ts-expect-error — nor from a state object.
    const c2 = <Chip label="Warm" accessibilityState={{ selected: true }} />;
    // @ts-expect-error — nor hidden.
    const c3 = <Chip label="Warm" aria-hidden />;
    // DECOY — the props that set the state honestly compile.
    const b4 = <Button label="Save" disabled loading={false} testID="b" />;
    const c4 = <Chip label="Warm" selected focused={false} testID="c" />;
    expect([b1, b2, b3, c1, c2, c3, b4, c4]).toHaveLength(8);
  });

  const smuggled = {
    accessibilityRole: 'link',
    accessibilityState: { disabled: false, busy: false, selected: false },
    accessibilityLabel: 'Something else',
    accessible: false,
    'aria-label': 'Something else again',
    'aria-disabled': false,
    'aria-busy': true,
    'aria-selected': false,
    'aria-hidden': true,
  } as unknown as Record<string, never>;

  /** The native views a screen reader is given (see icon-button.test: not a role query). */
  function hostsOf(testID: string): Record<string, unknown>[] {
    const hosts = screen.getAllByTestId(testID, { includeHiddenElements: true });
    expect(hosts.length).toBeGreaterThan(0);
    return hosts.map((h) => h.props as Record<string, unknown>);
  }
  const noAria = (p: Record<string, unknown>): void => {
    for (const key of ['aria-hidden', 'aria-label', 'aria-busy', 'aria-disabled', 'aria-selected'])
      expect(p[key]).toBeUndefined();
    expect(p['accessible']).not.toBe(false);
    expect(p['importantForAccessibility']).not.toBe('no-hide-descendants');
  };

  it('keeps the Button its own when a cast slips the refused props past the type', () => {
    render(
      <ThemeProvider theme="dark">
        <Button label="Save" disabled {...smuggled} testID="b" />
      </ThemeProvider>,
    );
    for (const p of hostsOf('b')) {
      expect(p['accessibilityRole']).toBe('button');
      expect(p['accessibilityLabel']).toBe('Save');
      expect(p['accessibilityState']).toEqual({ disabled: true, busy: false });
      noAria(p);
    }
    expect(
      screen.queryAllByLabelText(/Something else/u, { includeHiddenElements: true }),
    ).toHaveLength(0);
  });

  it('keeps the Chip its own, selection included, when a cast slips them past the type', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip label="Warm" selected {...smuggled} testID="c" />
      </ThemeProvider>,
    );
    for (const p of hostsOf('c')) {
      expect(p['accessibilityRole']).toBe('button');
      expect(p['accessibilityLabel']).toBe('Warm ✓');
      expect(p['accessibilityState']).toEqual({ selected: true, disabled: false, busy: false });
      noAria(p);
    }
    expect(
      screen.queryAllByLabelText(/Something else/u, { includeHiddenElements: true }),
    ).toHaveLength(0);
  });

  it('strips every owned prop and keeps the rest', () => {
    const all = Object.fromEntries(OWNED_ACCESSIBILITY.map((k) => [k, 'x']));
    expect(withoutOwnedAccessibility({ ...all, testID: 't', accessibilityHint: 'h' })).toEqual({
      testID: 't',
      accessibilityHint: 'h',
    });
    // DECOY — with nothing owned passed, nothing is taken.
    expect(withoutOwnedAccessibility({ testID: 't' })).toEqual({ testID: 't' });
  });
});
