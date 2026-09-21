/**
 * The display settings `15` draws, held for the tree that reads them (F-239).
 *
 * ## Why these live in `@irodora/ui` and not in the app
 *
 * `Text` decides whether it renders tabular figures, and `Text` is a ui component: an app-level
 * context is not something it can read. So the VALUES live here, beside `ThemeProvider`, and the
 * app owns everything about them that touches a device — reading the stored value, writing it back,
 * and firing the haptic.
 *
 * ## This hook DEFAULTS outside its provider, where `useTheme` throws
 *
 * `useTheme` and `useAppearance` throw when nobody has provided them, because a screen rendering
 * the base theme inside a themed app looks merely wrong and a throw says which. **The opposite is
 * right here.** Every `Text` in the product would have to be inside a provider — including the ones
 * the conformance suite renders on their own — and a missing provider is not a wrong setting, it is
 * no setting. So the hook falls back to {@link DRAWN_DISPLAY_SETTINGS}: what `15` actually draws,
 * which is all three switches on.
 *
 * That default is also the reason this change is invisible until somebody uses it — the shipped
 * behaviour with every switch on is the behaviour the product already had.
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface DisplaySettings {
  /** Figures in `Text` are set with tabular numerals — `15`'s *Tabular Numeric Figures*. */
  readonly tabularNumerals: boolean;
  /** This app asks for a haptic when a swatch is chosen — `15`'s *Haptic Feedback* (ADR-0104). */
  readonly hapticOnSelection: boolean;
  /** The sample family draws its provenance chip — `15`'s *Show Provenance Badges*. */
  readonly provenanceBadges: boolean;
}

/** The three settings as `15` draws them: every switch on. Also the default outside the provider. */
export const DRAWN_DISPLAY_SETTINGS: DisplaySettings = {
  tabularNumerals: true,
  hapticOnSelection: true,
  provenanceBadges: true,
};

/** The keys, in one place, because a typo is a setting that silently never loads. */
export const DISPLAY_SETTING_KEYS = [
  'tabularNumerals',
  'hapticOnSelection',
  'provenanceBadges',
] as const satisfies readonly (keyof DisplaySettings)[];
export type DisplaySettingKey = (typeof DISPLAY_SETTING_KEYS)[number];

const DisplaySettingsContext = createContext<DisplaySettings | undefined>(undefined);

export interface DisplaySettingsProviderProps {
  readonly children: ReactNode;
  /**
   * The settings, already read from wherever they are kept.
   *
   * A value rather than a store: this package has no device seam and is not about to grow one for
   * three booleans. The app reads them, writes them and passes them down.
   */
  readonly settings: DisplaySettings;
}

export function DisplaySettingsProvider({
  children,
  settings,
}: DisplaySettingsProviderProps): React.JSX.Element {
  return (
    <DisplaySettingsContext.Provider value={settings}>{children}</DisplaySettingsContext.Provider>
  );
}

/** The settings in force — `15`'s drawn state where nobody has provided any. */
export function useDisplaySettings(): DisplaySettings {
  return useContext(DisplaySettingsContext) ?? DRAWN_DISPLAY_SETTINGS;
}
