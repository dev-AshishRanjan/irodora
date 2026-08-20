import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@irodora/ui';

/**
 * The root layout.
 *
 * **Both themes are first-class, and neither is a variant of the other.** The manifest defines
 * `light` and `dark` independently and gate 9 checks every declared pairing in both — including
 * the salience rank, which inverted between them until F-067 because the system had held OKLCh
 * lightness constant across two grounds of opposite polarity
 * ([ADR-0053](../../../docs/adr/0053-dark-status-salience-matches-light-and-error-gets-lighter.md)).
 *
 * The theme now comes from **`ThemeProvider`**, not from a `useColorScheme()` call in each
 * screen. This file used to write `useColorScheme() ?? 'light'` — a no-preference fallback
 * nobody recorded, disagreeing with the manifest's `"defaultTheme": "dark"`. Worse, a screen
 * that reads the platform directly renders light colours when asked to render dark, which is
 * exactly what the conformance suite caught on the home screen in F-017.
 *
 * Colours come from the generated token module. **No literal may appear in a screen** — that is
 * what makes the contrast gate's guarantee reach the pixels rather than stopping at a JSON file.
 */
function Chrome(): React.JSX.Element {
  const { name, colors } = useTheme();
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <Chrome />
    </ThemeProvider>
  );
}
