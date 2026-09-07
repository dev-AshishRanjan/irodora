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
} from '@irodora/ui';

/** The two settings methods this needs, and nothing else. */
export interface AppearanceStore {
  getSetting(key: string): string | undefined;
  putSetting(key: string, value: string, now: number): void;
}

/** The settings key. One place, because a typo here is a preference that silently never loads. */
export const APPEARANCE_KEY = 'appearance';

export interface AppearanceValue {
  readonly appearance: Appearance;
  /** Choose, and persist. Synchronous, because the device write is. */
  readonly choose: (next: Appearance) => void;
}

const AppearanceContext = createContext<AppearanceValue | undefined>(undefined);

export interface AppearanceProviderProps {
  readonly children: ReactNode;
  readonly store: AppearanceStore;
  /** Injected so a test can write at a chosen time rather than reading a clock. */
  readonly now?: () => number;
}

export function AppearanceProvider({
  children,
  store,
  now = () => Date.now(),
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

  const value = useMemo(() => ({ appearance, choose }), [appearance, choose]);
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
