/**
 * The chosen appearance, held once and persisted on the device (F-153, FR-70).
 *
 * ## Why this is a context and almost nothing else in this app is
 *
 * Screens take their ports as props, and that is deliberate: it is what lets the conformance
 * suite render every one of them without a device. The appearance is the exception because it
 * is read by `ThemeProvider` at the ROOT and written from a screen several routes down, and
 * expo-router owns everything in between.
 *
 * So the context holds it, and `Preferences` still takes the value and the setter as **props**
 * — the route reads the hook and passes them down. A screen that reached for the hook itself
 * would throw in the suite that checks its accessibility, which is the one place the guarantees
 * are actually verified.
 *
 * ## The store is a port, for the reason every store here is
 *
 * `expo-sqlite` needs a device. A module that imported the repository could not be rendered by
 * jest, so the two methods this needs are named as an interface and the route supplies the real
 * one.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_APPEARANCE,
  formatAppearance,
  parseAppearance,
  type Appearance,
  type ThemeColors,
} from '@irodora/ui';
import {
  nativeDefaultTheme,
  runtimeManifest,
  RUNTIME_THEME,
  themeFromSeed,
  themeMode,
  type ManifestOklch,
  type Mode,
} from '@irodora/design-tokens';

/** The two settings methods this needs, and nothing else. */
export interface AppearanceStore {
  getSetting(key: string): string | undefined;
  putSetting(key: string, value: string, now: number): void;
}

/** The settings key. One place, because a typo here is a preference that silently never loads. */
export const APPEARANCE_KEY = 'appearance';

/**
 * The platform's own colour, if it has one (F-154).
 *
 * A PORT, and it returns `null` on every platform this repository can currently build for.
 * Android exposes the dynamic palette from API 31, and **nothing in `apps/mobile` can read
 * it**: no dependency surfaces it, and React Native's `PlatformColor` returns an opaque token
 * that resolves natively, so JS never sees its channels. That needs a native module, an EAS
 * build and a device.
 *
 * iOS returns `null` and always will — Apple exposes no user accent — so the honest answer
 * there is the preloaded set from F-153, said in words rather than by a theme that silently
 * does not change.
 *
 * The port exists anyway, and everything downstream of it is built and proven: the derivation,
 * the checks running on device against the derived values, the corrections and the refusal.
 * Inventing a seed and calling it the device colour would be worse than saying this.
 */
export interface SeedSource {
  /** The accent, in OKLCh, or `null` where the platform exposes none. */
  read(): ManifestOklch | null;
}

/** What happened when the device colour was asked for. */
export type DeviceTheme =
  | { readonly kind: 'none'; readonly why: 'unsupported' }
  | { readonly kind: 'refused'; readonly reason: string }
  | {
      readonly kind: 'applied';
      readonly name: string;
      readonly mode: Mode;
      readonly colors: ThemeColors;
      readonly corrected: number;
    };

/**
 * Derive a theme from the platform's colour, and check it before it is applied.
 *
 * THE CHECKS RUN HERE, on the device, against the values that will be painted — because a seed
 * that does not exist until runtime cannot be verified when the manifest is compiled. What
 * makes that possible is that `@irodora/design-tokens` has no runtime dependencies and touches
 * no platform API, so the code a phone runs is the code CI runs.
 */
export function deviceTheme(source: SeedSource, mode: Mode): DeviceTheme {
  const seed = source.read();
  if (seed === null) return { kind: 'none', why: 'unsupported' };

  const outcome = themeFromSeed(runtimeManifest, mode, seed);
  if (outcome.kind === 'refused') return { kind: 'refused', reason: outcome.reason };

  /*
   * A COMPONENT PAINTS HEXES, not tokens. `useTheme().colors` is a name-to-hex map, and the
   * derivation produces tokens — each carrying the sRGB the engine derived from its own OKLCh,
   * which is the value the gate measured and therefore the value to paint.
   */
  const colors = Object.fromEntries(
    Object.entries(outcome.colors).map(([name, token]) => [name, token.srgb]),
  ) as ThemeColors;

  return {
    kind: 'applied',
    name: RUNTIME_THEME,
    mode,
    colors,
    corrected: outcome.corrections.length,
  };
}

/**
 * The seed source this app ships with.
 *
 * Honest about returning nothing. When a native module arrives, this is the one function that
 * changes — everything downstream already handles a real seed, and `seed.test.ts` sweeps every
 * hue through it.
 */
export const noSeed: SeedSource = { read: () => null };

export interface AppearanceValue {
  readonly appearance: Appearance;
  /** Choose, and persist. Synchronous, because the device write is. */
  readonly choose: (next: Appearance) => void;
  /**
   * What came of asking for the device colour.
   *
   * Present whatever the person chose, so a screen can say *why* the device colour is not
   * available without having to ask for it first — which is the difference between a designed
   * absent state and a control that does nothing.
   */
  readonly device: DeviceTheme;
}

const AppearanceContext = createContext<AppearanceValue | undefined>(undefined);

export interface AppearanceProviderProps {
  readonly children: ReactNode;
  readonly store: AppearanceStore;
  /** Injected so a test can write at a chosen time rather than reading a clock. */
  readonly now?: () => number;
  /** The platform's colour. Defaults to the one that has none, which is every platform today. */
  readonly seed?: SeedSource;
  /** Which mode the device theme is derived against. Defaults to the manifest's. */
  readonly mode?: Mode;
}

export function AppearanceProvider({
  children,
  store,
  now = () => Date.now(),
  seed = noSeed,
  mode = themeMode(nativeDefaultTheme),
}: AppearanceProviderProps): React.JSX.Element {
  /*
   * Read ONCE, lazily. The stored value cannot change underneath this app — there is no server
   * and no second writer — so re-reading it on every render would be a database round trip per
   * frame to learn something that only this component changes.
   */
  const [appearance, setAppearance] = useState<Appearance>(() =>
    parseAppearance(store.getSetting(APPEARANCE_KEY)),
  );

  const choose = useCallback(
    (next: Appearance): void => {
      // State first, then the write. A device write that failed would leave the person looking
      // at the theme they chose rather than at the one they did not — and the next launch
      // would tell the truth about what was stored.
      setAppearance(next);
      store.putSetting(APPEARANCE_KEY, formatAppearance(next), now());
    },
    [store, now],
  );

  /*
   * Derived once per mode rather than per render. The seed cannot change while the app is open
   * — a wallpaper change restarts it — and the derivation runs the contrast and CVD checks,
   * which is a few milliseconds nobody should spend on every frame.
   */
  const device = useMemo(() => deviceTheme(seed, mode), [seed, mode]);

  const value = useMemo(() => ({ appearance, choose, device }), [appearance, choose, device]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/**
 * The chosen appearance.
 *
 * **Throws outside the provider**, like `useTheme`, and for the same reason: a silent default
 * would render the base theme inside an app somebody had themed, and look merely wrong.
 */
export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (value === undefined)
    throw new Error(
      'useAppearance() outside an <AppearanceProvider>. The root layout mounts one; a screen ' +
        'that needs the choice takes it as a prop so the conformance suite can render it.',
    );
  return value;
}

export { DEFAULT_APPEARANCE };
