/**
 * The theme, and the only place a component learns which one it is in.
 *
 * ## Why `defaultTheme` comes from the manifest
 *
 * `useColorScheme()` returns `null` before the first appearance event, and on a platform
 * that expresses no preference it keeps returning it. Something has to decide what happens
 * then. `apps/mobile/app/_layout.tsx` decided `'light'`, in a `??` nobody recorded — while
 * the manifest says `"defaultTheme": "dark"`, and DESIGN-SYSTEM.md lists "default theme on
 * first visit" as still open. Three answers, one of them in code, none of them agreeing.
 *
 * The manifest wins, because it is the source of truth the contrast and CVD gates read.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { HeroUINativeProvider } from 'heroui-native';
import { useColorScheme, type ColorSchemeName } from 'react-native';
import {
  nativeColors,
  nativeDefaultTheme,
  THEME_FAMILIES,
  themeMode,
  themeName,
  type Mode,
  type Theme,
  type ThemeFamily,
} from '@irodora/design-tokens';

/** Colour tokens for one theme, exactly as the manifest declares them. */
export type ThemeColors = (typeof nativeColors)[Theme];

export interface ThemeValue {
  readonly name: Theme;
  /**
   * Whether this palette is a light or a dark reading.
   *
   * Separate from `name` since F-153, because those became two different questions. A component
   * asking "am I on dark" wants this; a component asking "which palette am I" wants the name.
   */
  readonly mode: Mode;
  readonly colors: ThemeColors;
}

/**
 * What a person chose, which is TWO choices rather than one (FR-70).
 *
 * Choosing a theme and choosing light or dark are independent: somebody can want the blue theme
 * *and* want it to follow the phone. Collapsing them into one list would mean eight entries
 * where four of them differ only in a way the system can already answer.
 */
export interface Appearance {
  readonly family: ThemeFamily;
  /** `system` follows the platform. The other two state a preference. */
  readonly mode: 'system' | Mode;
}

/** The appearance a device has until somebody chooses otherwise. */
export const DEFAULT_APPEARANCE: Appearance = { family: 'base', mode: 'system' };

/**
 * The stored form: `family:mode`.
 *
 * A string rather than two columns, because the store keeps settings as text and this is one
 * choice made in one place. Round-tripped by `parseAppearance`, which is total.
 */
export function formatAppearance(appearance: Appearance): string {
  return `${appearance.family}:${appearance.mode}`;
}

/**
 * Read a stored appearance back. **Anything unrecognised falls back to the default.**
 *
 * Total on purpose. This value comes off a device that may have been written by an older
 * build, or a newer one, or by a theme family that has since been removed — and a person whose
 * app refuses to start because their saved theme no longer exists has lost more than a colour.
 */
export function parseAppearance(stored: string | undefined): Appearance {
  if (stored === undefined) return DEFAULT_APPEARANCE;
  const [family, mode] = stored.split(':');
  const families: readonly string[] = THEME_FAMILIES;
  if (family === undefined || !families.includes(family)) return DEFAULT_APPEARANCE;
  if (mode !== 'system' && mode !== 'light' && mode !== 'dark') return DEFAULT_APPEARANCE;
  return { family: family as ThemeFamily, mode };
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /** Force a palette. For tests and for the conformance suite, which runs every component in both. */
  readonly theme?: Theme;
  /**
   * What the person chose. Absent means the default, which is the base pair following the
   * platform — exactly what this provider did before there was anything to choose.
   */
  readonly appearance?: Appearance;
}

/**
 * Which theme applies, given an explicit override and whatever the platform said.
 *
 * Extracted and exported because it is the **decision**, and a decision buried in a component
 * can only be tested by mocking a platform hook — which tests the mock. The three inputs that
 * matter are `null` (no preference yet), `'light'`/`'dark'` (a stated preference), and an
 * override, and all three are checked directly.
 *
 * `null` is not a preference for light. It is the absence of one, and the manifest's
 * `defaultTheme` is what fills it.
 */
export function resolveThemeName(
  scheme: ColorSchemeName | null | undefined,
  override?: Theme,
  appearance: Appearance = DEFAULT_APPEARANCE,
): Theme {
  if (override !== undefined) return override;
  // A stated mode is a stated mode. Only `system` asks the platform, which is the whole
  // difference between the three choices a person is offered.
  if (appearance.mode !== 'system') return themeName(appearance.family, appearance.mode);
  // Allow-list rather than "not dark, therefore light". React Native's `ColorSchemeName` is
  // `'light' | 'dark' | 'unspecified' | null | undefined`, and `'unspecified'` is EXACTLY the
  // no-preference case this fallback exists for — a check written as `=== 'dark' ? dark :
  // light` silently treats it as a stated preference for light. tsc caught that here; the
  // first version of this signature omitted `'unspecified'` entirely.
  if (scheme === 'light' || scheme === 'dark') return themeName(appearance.family, scheme);
  return themeName(appearance.family, themeMode(nativeDefaultTheme));
}

/**
 * HeroUI's provider configuration.
 *
 * Hoisted to a module constant so it is one object rather than a new one per render, and so
 * the two settings that are DECISIONS sit where they can be read.
 *
 * `stylingPrinciples: false` silences a console banner on every mount. It is advice about
 * className-first styling that this repository deliberately does not follow — colour comes
 * through `style` here, because Uniwind resolves className in Metro and jest never runs Metro
 * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 *
 * Animation is NOT globally disabled. `'disable-all'` would take scale and opacity with it,
 * and the manifest allows both — it is only colour that may never be animated. That is handled
 * per component with `feedbackVariant="scale"`, and `verify-motion.mjs` rejects a component
 * that allows the highlight instead.
 */
const HEROUI_CONFIG = { devInfo: { stylingPrinciples: false } } as const;

export function ThemeProvider({
  children,
  theme,
  appearance,
}: ThemeProviderProps): React.JSX.Element {
  /*
   * react-native types useColorScheme as `null | undefined | ColorSchemeName`, and the
   * platform genuinely returns null before the first appearance event. `tsc` agrees the guard
   * is needed — assigning null to its ReturnType compiles. This rule resolves the module
   * differently and disagrees; deleting a guard because a linter overruled a measurement is
   * the wrong way round.
   */
  const scheme = useColorScheme();
  const name = resolveThemeName(scheme, theme, appearance);
  return (
    <ThemeContext.Provider value={{ name, mode: themeMode(name), colors: nativeColors[name] }}>
      {/*
        HeroUI's provider supplies the animation-settings and portal contexts its components
        read on first render — without it a Button throws rather than rendering. It sits INSIDE
        our context deliberately: `name` above is the resolved theme, and the manifest is what
        resolved it, so nothing downstream can reach a theme our gates did not check.
      */}
      <HeroUINativeProvider config={HEROUI_CONFIG}>{children}</HeroUINativeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * The current theme.
 *
 * **Throws outside a provider** rather than falling back. A silent fallback would let a
 * component render with light-theme colours inside a dark screen and look merely wrong,
 * which is the kind of defect that survives review because it is plausible.
 */
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (value === undefined)
    throw new Error(
      'useTheme() outside a <ThemeProvider>. Every surface must be wrapped, because a ' +
        'component that guesses its theme renders plausible wrong colours rather than failing.',
    );
  return value;
}
