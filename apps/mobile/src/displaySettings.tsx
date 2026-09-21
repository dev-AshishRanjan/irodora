/**
 * The three display settings `15` draws, read from and written to the device (F-239).
 *
 * ## Where the halves live
 *
 * The VALUES and the provider are in `@irodora/ui`, because `Text` reads them and `Text` cannot
 * see an app context. Everything that touches the device is here: the keys, the parsing, and the
 * two settings methods F-153 already put on the repository.
 *
 * ## An unreadable value reads as the drawn default, and does not throw
 *
 * A settings row is one `TEXT` column. It can hold `"true"`, `"false"`, something an older build
 * wrote, or something a hand-edited database put there. A preference that threw on the way in
 * would take the whole app down for a string, so anything that is not exactly `"false"` reads as
 * on — which is what `15` draws, and the state the product shipped in.
 *
 * `"false"` is therefore the only value that turns anything off, and that asymmetry is deliberate:
 * a setting whose OFF state depends on parsing succeeding is a setting that silently turns itself
 * on after a bad write.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DISPLAY_SETTING_KEYS,
  DisplaySettingsProvider,
  DRAWN_DISPLAY_SETTINGS,
  type DisplaySettingKey,
  type DisplaySettings,
} from '@irodora/ui';

/** The two settings methods this needs, and nothing else — the shape `AppearanceStore` uses. */
export interface DisplaySettingsStore {
  getSetting(key: string): string | undefined;
  putSetting(key: string, value: string, now: number): void;
}

/** One key per setting, spelled once. A typo here is a preference that never loads. */
export const DISPLAY_SETTING_STORE_KEYS: Readonly<Record<keyof DisplaySettings, string>> = {
  tabularNumerals: 'display.tabular',
  hapticOnSelection: 'display.haptics',
  provenanceBadges: 'display.provenanceBadges',
};

/** `"false"` is off; anything else — including an absent row — is what `15` draws. */
const parseSetting = (raw: string | undefined): boolean => raw !== 'false';

export function readDisplaySettings(store: DisplaySettingsStore): DisplaySettings {
  const out = { ...DRAWN_DISPLAY_SETTINGS } as { -readonly [K in keyof DisplaySettings]: boolean };
  for (const key of DISPLAY_SETTING_KEYS)
    out[key] = parseSetting(store.getSetting(DISPLAY_SETTING_STORE_KEYS[key]));
  return out;
}

export function writeDisplaySetting(
  store: DisplaySettingsStore,
  key: keyof DisplaySettings,
  value: boolean,
  now: number,
): void {
  store.putSetting(DISPLAY_SETTING_STORE_KEYS[key], value ? 'true' : 'false', now);
}

export interface DisplayValue {
  readonly settings: DisplaySettings;
  /** Change one, and persist it. Synchronous, because the device write is. */
  readonly change: (key: DisplaySettingKey, value: boolean) => void;
}

const DisplayContext = createContext<DisplayValue | undefined>(undefined);

export interface DisplayProviderProps {
  readonly children: ReactNode;
  readonly store: DisplaySettingsStore;
  /** Injected so a test can write at a chosen time rather than reading a clock. */
  readonly now?: () => number;
}

/**
 * The app half: read the three settings once, hold them, write each change back.
 *
 * ## Two providers, and the inner one is not a duplicate
 *
 * This holds the STATE and owns the device; `@irodora/ui`'s {@link DisplaySettingsProvider}
 * holds the VALUE for components that read it — `Text` most of all, which cannot see an app
 * context. Mounting the ui provider from inside this one is what keeps the two in step without
 * every route remembering to pass the values down.
 *
 * ## Read once, lazily — the same reasoning `AppearanceProvider` gives
 *
 * The stored value cannot change underneath this app: there is no server and no second writer.
 * Re-reading on every render would be a database round trip per frame to learn something only
 * this component changes.
 */
export function DisplayProvider({
  children,
  store,
  now = () => Date.now(),
}: DisplayProviderProps): React.JSX.Element {
  const [settings, setSettings] = useState<DisplaySettings>(() => readDisplaySettings(store));

  const change = useCallback(
    (key: DisplaySettingKey, value: boolean): void => {
      // State first, then the write — a device write that failed would leave the person looking
      // at the switch they moved rather than at the one they did not, and the next launch would
      // tell the truth about what was stored. `AppearanceProvider.choose` does the same.
      setSettings((current) => ({ ...current, [key]: value }));
      writeDisplaySetting(store, key, value, now());
    },
    [store, now],
  );

  const value = useMemo(() => ({ settings, change }), [settings, change]);
  return (
    <DisplayContext.Provider value={value}>
      <DisplaySettingsProvider settings={settings}>{children}</DisplaySettingsProvider>
    </DisplayContext.Provider>
  );
}

/**
 * The settings and the writer.
 *
 * **Throws outside the provider**, where `useDisplaySettings()` deliberately does not. The two
 * hooks answer different questions: *what is set* has a correct answer without a provider — what
 * `15` draws — but *how do I change it* does not, and a writer that silently did nothing is the
 * failure a settings screen cannot show you.
 */
export function useDisplay(): DisplayValue {
  const value = useContext(DisplayContext);
  if (value === undefined)
    throw new Error(
      'useDisplay() outside a <DisplayProvider>. The root layout mounts one; a screen that ' +
        'needs the settings takes them as props so the conformance suite can render it.',
    );
  return value;
}
