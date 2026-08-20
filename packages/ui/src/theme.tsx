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
import { useColorScheme, type ColorSchemeName } from 'react-native';
import { nativeColors, nativeDefaultTheme, type Theme } from '@irodora/design-tokens';

/** Colour tokens for one theme, exactly as the manifest declares them. */
export type ThemeColors = (typeof nativeColors)[Theme];

export interface ThemeValue {
  readonly name: Theme;
  readonly colors: ThemeColors;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /** Force a theme. For tests and for the conformance suite, which runs every component in both. */
  readonly theme?: Theme;
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
): Theme {
  if (override !== undefined) return override;
  // Allow-list rather than "not dark, therefore light". React Native's `ColorSchemeName` is
  // `'light' | 'dark' | 'unspecified' | null | undefined`, and `'unspecified'` is EXACTLY the
  // no-preference case this fallback exists for — a check written as `=== 'dark' ? dark :
  // light` silently treats it as a stated preference for light. tsc caught that here; the
  // first version of this signature omitted `'unspecified'` entirely.
  if (scheme === 'light' || scheme === 'dark') return scheme;
  return nativeDefaultTheme;
}

export function ThemeProvider({ children, theme }: ThemeProviderProps): React.JSX.Element {
  /*
   * react-native types useColorScheme as `null | undefined | ColorSchemeName`, and the
   * platform genuinely returns null before the first appearance event. `tsc` agrees the guard
   * is needed — assigning null to its ReturnType compiles. This rule resolves the module
   * differently and disagrees; deleting a guard because a linter overruled a measurement is
   * the wrong way round.
   */
  const scheme = useColorScheme();
  const name = resolveThemeName(scheme, theme);
  return (
    <ThemeContext.Provider value={{ name, colors: nativeColors[name] }}>
      {children}
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
