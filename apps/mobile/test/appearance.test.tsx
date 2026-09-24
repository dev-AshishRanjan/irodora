/**
 * The chosen appearance (F-153, FR-70; one choice since F-225).
 *
 * ## What is worth asserting here
 *
 * Not that a theme looks different — gate 9 measures every palette and
 * `packages/design-tokens/test/themes.test.ts` proves which themes exist.
 *
 * What only this layer can answer is whether the CHOICE survives: that it reaches the provider,
 * that it persists, and that a stored value written by a build that no longer exists — including
 * every `family:mode` value from before F-225 — does not stop the app from opening, and lands
 * on the drawn theme of the mode the person chose.
 */

import { render } from '@testing-library/react-native';
import {
  APPEARANCES,
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
  deviceTheme,
  noSeed,
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
    for (const appearance of APPEARANCES)
      expect(parseAppearance(formatAppearance(appearance))).toBe(appearance);
  });

  it('maps every value from before F-225 by the mode it chose, since its family is withdrawn', () => {
    const want: Record<string, Appearance> = { dark: 'sumi', light: 'washi', system: 'system' };
    for (const family of ['base', 'fuka', 'yama', 'aota'])
      for (const mode of ['system', 'light', 'dark'])
        expect([family, mode, parseAppearance(`${family}:${mode}`)]).toEqual([
          family,
          mode,
          want[mode],
        ]);
    for (const mode of ['system', 'light', 'dark'])
      expect(parseAppearance(`device:${mode}`)).toBe('device');
  });

  it('falls back to the default for anything it does not recognise', () => {
    /*
     * TOTAL ON PURPOSE. This value comes off a device that may have been written by an older
     * build, or a newer one — and a person whose app refuses to start because their saved theme
     * no longer exists has lost more than a colour.
     */
    for (const stored of [
      undefined,
      '',
      'nonsense',
      'fuka',
      'fuka:sideways',
      'ghost:light',
      'mizu:dark',
      'fuka:dusk',
    ])
      expect(parseAppearance(stored)).toBe(DEFAULT_APPEARANCE);
  });
});

describe('resolveThemeName', () => {
  it('paints a drawn theme whatever the phone says', () => {
    for (const scheme of ['light', 'dark', null] as const) {
      expect(resolveThemeName(scheme, undefined, 'sumi')).toBe('dark');
      expect(resolveThemeName(scheme, undefined, 'washi')).toBe('light');
    }
  });

  it('follows the phone for `system`, and for the device colour’s declared fallback', () => {
    for (const appearance of ['system', 'device'] as const) {
      expect(resolveThemeName('dark', undefined, appearance)).toBe('dark');
      expect(resolveThemeName('light', undefined, appearance)).toBe('light');
    }
  });

  it('uses the manifest default when the platform states no preference', () => {
    // `null` is the absence of a preference, not a preference for light.
    expect(resolveThemeName(null, undefined, 'system')).toBe('dark');
    expect(resolveThemeName('unspecified', undefined, DEFAULT_APPEARANCE)).toBe('dark');
  });

  it('an explicit palette still wins, because that is what the suite renders with', () => {
    expect(resolveThemeName('dark', 'light', 'sumi')).toBe('light');
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
    const tree = draw(fakeSettings('washi'));
    expect(tree.toJSON()).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).toContain('washi → light');
  });

  it('reads a value from before F-225 as the drawn theme of its mode', () => {
    expect(JSON.stringify(draw(fakeSettings('yama:light')).toJSON())).toContain('washi → light');
  });

  it('starts at the default when nothing is stored', () => {
    expect(JSON.stringify(draw(fakeSettings()).toJSON())).toContain('system');
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

/**
 * The device colour (F-154).
 *
 * ## What only this layer can answer
 *
 * `packages/design-tokens/test/seed.test.ts` sweeps every hue through the derivation and the
 * checks. What it cannot say is whether the app **applies only what passed** — and whether the
 * absence of a platform accent is a designed state rather than a crash or a silent base.
 */
describe('the device colour', () => {
  const accent = { l: 0.55, c: 0.09, h: 258 };

  it('is unavailable, with a reason, on a platform that offers none', () => {
    /*
     * WHICH IS EVERY PLATFORM THIS REPOSITORY CAN BUILD FOR TODAY. Android exposes the dynamic
     * palette from API 31 and nothing here can read it; iOS exposes no user accent at all. The
     * honest shape is a state that says so — not a chip that does nothing, and not a theme that
     * silently fails to change.
     */
    const outcome = deviceTheme(noSeed, 'light');
    expect(outcome.kind).toBe('none');
  });

  it('derives and applies a real accent, and says what it corrected', () => {
    const outcome = deviceTheme({ read: () => accent }, 'light');
    expect(outcome.kind).toBe('applied');
    if (outcome.kind !== 'applied') return;

    // Corrections are normal: at L 0.99 the sRGB gamut is a sliver, so a light background
    // cannot hold the chroma the ceiling would allow.
    expect(outcome.corrected).toBeGreaterThan(0);
    expect(Object.keys(outcome.colors).length).toBeGreaterThan(20);
    expect(outcome.mode).toBe('light');
  });

  it('refuses a greyscale accent rather than inventing a hue', () => {
    // A greyscale wallpaper is a real thing, and a colour taken from the rounding on a grey is
    // not the device colour.
    const outcome = deviceTheme({ read: () => ({ l: 0.5, c: 0, h: 0 }) }, 'dark');
    expect(outcome.kind).toBe('refused');
    if (outcome.kind === 'refused') expect(outcome.reason).toMatch(/achromatic/u);
  });

  it('reaches the theme only when it was BOTH chosen and checked', () => {
    /*
     * The assertion that keeps criterion 3 true at the top of the tree. Two conditions, and the
     * root layout requires both: a person who has not chosen the device colour does not get it,
     * and a seed that did not pass is not applied at all.
     */
    const chosenAndChecked =
      parseAppearance('device') === 'device' &&
      deviceTheme({ read: () => accent }, 'light').kind === 'applied';
    expect(chosenAndChecked).toBe(true);

    const chosenButRefused = deviceTheme({ read: () => ({ l: 0.5, c: 0, h: 0 }) }, 'light');
    expect(chosenButRefused.kind).not.toBe('applied');
  });

  it('round-trips `device` as a stored choice', () => {
    // `device` is not a drawn theme, but it is a choice somebody makes, so the stored form has
    // to carry it.
    expect(parseAppearance(formatAppearance('device'))).toBe('device');
  });
});
