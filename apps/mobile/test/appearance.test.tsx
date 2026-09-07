/**
 * The chosen appearance (F-153, FR-70).
 *
 * ## What is worth asserting here
 *
 * Not that a theme looks different — gate 9 measures all eight palettes and
 * `packages/design-tokens/test/themes.test.ts` proves what a theme is allowed to change.
 *
 * What only this layer can answer is whether the CHOICE survives: that it is two independent
 * choices rather than one, that it reaches the provider, that it persists, and that a stored
 * value written by a build that no longer exists does not stop the app from opening.
 */

import { render } from '@testing-library/react-native';
import {
  DEFAULT_APPEARANCE,
  formatAppearance,
  parseAppearance,
  resolveThemeName,
  ThemeProvider,
  useTheme,
  type Appearance,
} from '@irodora/ui';
import { Text } from 'react-native';

import {
  APPEARANCE_KEY,
  AppearanceProvider,
  useAppearance,
  type AppearanceStore,
} from '../src/appearance';

/** An in-memory settings store — the two methods, and a record of what was written. */
function fakeSettings(initial?: string): AppearanceStore & { readonly rows: Map<string, string> } {
  const rows = new Map<string, string>();
  if (initial !== undefined) rows.set(APPEARANCE_KEY, initial);
  return {
    rows,
    getSetting: (key) => rows.get(key),
    putSetting: (key, value) => {
      rows.set(key, value);
    },
  };
}

describe('parseAppearance', () => {
  it('round-trips every choice', () => {
    for (const family of ['base', 'fuka', 'yama', 'aota'] as const)
      for (const mode of ['system', 'light', 'dark'] as const) {
        const appearance: Appearance = { family, mode };
        expect(parseAppearance(formatAppearance(appearance))).toEqual(appearance);
      }
  });

  it('falls back to the default for anything it does not recognise', () => {
    /*
     * TOTAL ON PURPOSE. This value comes off a device that may have been written by an older
     * build, or a newer one, or by a theme family that has since been removed — and a person
     * whose app refuses to start because their saved theme no longer exists has lost more than
     * a colour.
     */
    for (const stored of [undefined, '', 'nonsense', 'fuka', 'fuka:sideways', 'ghost:light'])
      expect(parseAppearance(stored)).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('resolveThemeName', () => {
  it('follows the platform only when the mode is `system`', () => {
    // The whole difference between the three answers a person is offered.
    expect(resolveThemeName('dark', undefined, { family: 'base', mode: 'system' })).toBe('dark');
    expect(resolveThemeName('dark', undefined, { family: 'base', mode: 'light' })).toBe('light');
    expect(resolveThemeName('light', undefined, { family: 'base', mode: 'dark' })).toBe('dark');
  });

  it('carries the family through both, which is why they are two choices', () => {
    expect(resolveThemeName('dark', undefined, { family: 'fuka', mode: 'system' })).toBe(
      'fuka.dark',
    );
    expect(resolveThemeName('dark', undefined, { family: 'fuka', mode: 'light' })).toBe(
      'fuka.light',
    );
  });

  it('uses the manifest default when the platform states no preference', () => {
    // `null` is the absence of a preference, not a preference for light — the distinction this
    // function was extracted to make in the first place.
    expect(resolveThemeName(null, undefined, { family: 'yama', mode: 'system' })).toBe('yama.dark');
    expect(resolveThemeName('unspecified', undefined, DEFAULT_APPEARANCE)).toBe('dark');
  });

  it('an explicit palette still wins, because that is what the suite renders with', () => {
    expect(resolveThemeName('light', 'aota.dark', { family: 'base', mode: 'light' })).toBe(
      'aota.dark',
    );
  });
});

describe('AppearanceProvider', () => {
  function Probe(): React.JSX.Element {
    const { appearance } = useAppearance();
    const { name } = useTheme();
    return <Text>{`${formatAppearance(appearance)} → ${name}`}</Text>;
  }

  const draw = (store: AppearanceStore) =>
    render(
      <AppearanceProvider store={store} now={() => 1_000}>
        <Wrapped />
      </AppearanceProvider>,
    );

  function Wrapped(): React.JSX.Element {
    const { appearance } = useAppearance();
    return (
      <ThemeProvider appearance={appearance}>
        <Probe />
      </ThemeProvider>
    );
  }

  it('reads a stored choice and hands it to the theme', () => {
    const tree = draw(fakeSettings('yama:light'));
    expect(tree.toJSON()).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).toContain('yama:light → yama.light');
  });

  it('starts at the default when nothing is stored', () => {
    expect(JSON.stringify(draw(fakeSettings()).toJSON())).toContain('base:system');
  });

  it('does not write on read, because opening the app is not a choice', () => {
    // The decoy for the case above: a provider that persisted its default on mount would look
    // identical until somebody asked what was in the database.
    const store = fakeSettings();
    draw(store);
    expect(store.rows.size).toBe(0);
  });

  it('throws outside its provider rather than guessing', () => {
    /*
     * Like `useTheme`, and for the same reason: a silent default would render the base theme
     * inside an app somebody had themed, and look merely wrong — the kind of defect that
     * survives review because it is plausible.
     */
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/AppearanceProvider/u);
    quiet.mockRestore();
  });
});
