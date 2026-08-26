import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import NotoSansJP from '../assets/fonts/NotoSansJP-Subset.ttf';
import { ThemeProvider, useTheme } from '@irodora/ui';
import { installRandomSource } from '../src/store/random';

/*
 * THE CSPRNG, INSTALLED BEFORE ANY SCREEN RENDERS (F-104).
 *
 * At module scope, not in an effect. React Native has no `crypto` global, so until this runs
 * every `uuidv7()` and the database key generator take the port's refusal branch — and a
 * screen that rendered first would fail in a way that looks intermittent. The root layout is
 * the first module Expo Router loads, which makes this the earliest point that is also a
 * place somebody would think to look.
 *
 * It THROWS on a source it cannot verify. That is deliberate: this value keys the database
 * (NFR-13), and a startup crash with a sentence is better than a key nobody can reproduce.
 */
installRandomSource();

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
  /*
   * The bundled Japanese subset (ADR-0057, F-076). Its coverage over the corpus and the
   * message catalogue is checked by `gate:content`, so a corpus publish that introduces a
   * character this face lacks fails the build rather than showing a tofu box on a device.
   *
   * Rendering is held until it loads. A frame drawn before the face is ready falls back to
   * the platform font, which is the silent failure the whole decision exists to avoid — it
   * would look like a font that simply differs rather than one that is missing.
   */
  const [loaded] = useFonts({
    NotoSansJP,
  });
  if (!loaded) return <></>;

  return (
    <ThemeProvider>
      <Chrome />
    </ThemeProvider>
  );
}
