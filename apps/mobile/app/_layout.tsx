import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';

/**
 * The root layout.
 *
 * **Both themes are first-class, and neither is a variant of the other.** The manifest defines
 * `light` and `dark` independently and gate 9 checks every declared pairing in both — including
 * the salience rank, which inverted between them until F-067 because the system had held OKLCh
 * lightness constant across two grounds of opposite polarity
 * ([ADR-0053](../../../docs/adr/0053-dark-status-salience-matches-light-and-error-gets-lighter.md)).
 *
 * Colours come from the generated token module. **No literal may appear in a screen** — that is
 * what makes the contrast gate's guarantee reach the pixels rather than stopping at a JSON file.
 */
export default function RootLayout() {
  /*
   * react-native types useColorScheme as `null | undefined | ColorSchemeName`, and the platform
   * genuinely returns null before the first appearance event. `tsc` agrees the guard is needed —
   * assigning null to ReturnType<typeof useColorScheme> compiles. This rule resolves the module
   * differently and disagrees; deleting a guard because a linter overruled a measurement is the
   * wrong way round.
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const scheme = useColorScheme() ?? 'light';
  const theme = scheme === 'dark' ? nativeColors.dark : nativeColors.light;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
          contentStyle: { backgroundColor: theme.background },
        }}
      />
    </>
  );
}
