import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import NotoSansJP from '../assets/fonts/NotoSansJP-Subset.ttf';
import { DEVICE_FAMILY, durations, ThemeProvider, useTheme } from '@irodora/ui';
import { installRandomSource } from '../src/store/random';
import { AppearanceProvider, useAppearance } from '../src/appearance';
import { deviceRepository } from '../src/store/repository';
import { Launch } from '../src/launch';

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

/*
 * THE NATIVE SPLASH STAYS UP UNTIL WE HAVE DRAWN SOMETHING (F-190).
 *
 * At module scope, beside `installRandomSource()` and for the same reason: this is the first
 * module Expo Router loads, which makes it the earliest point that is also a place somebody
 * would think to look.
 *
 * **Nothing called this before**, and `expo-splash-screen` hides the splash as soon as the
 * React root renders its first frame — which was `<></>` while the Japanese font subset
 * loaded. So every cold start went splash → BLANK SCREEN → app. That is what gets reported as
 * "the app flashes white when I open it", and it is a bigger defect than the missing animation
 * that prompted this feature.
 *
 * The promise is deliberately not awaited: it resolves once the native module has been told,
 * and there is nothing to do with the answer. A rejection means the splash was already gone,
 * which is the state this call exists to prevent and cannot then repair.
 */
void SplashScreen.preventAutoHideAsync();

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
  const { mode, colors } = useTheme();
  return (
    <>
      {/*
        THE MODE, NOT THE NAME (F-153). This read `name === 'dark'`, which was the same
        question while there were two palettes called `light` and `dark`. There are eight now,
        and `fuka.dark` is a dark reading whose name is neither.
      */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          /*
            THE SCREEN TRANSITION (F-144). `view` (260) is the manifest's duration for one
            screen replacing another, and it is passed rather than left to the platform default
            so that a push moves at the same speed as everything else in the product.

            WHAT IS VERIFIED HERE is that the token reaches the navigator. WHAT IS NOT is the
            frame timing: `animationDuration` is honoured by the native stack for some
            animation types and not others, and never on the web. Reduced motion is handled by
            the OS for screen transitions — this is the one seam where the platform owns it,
            which is why `durations` is read directly and not through `useMotion`.
          */
          animation: 'slide_from_right',
          animationDuration: durations.view,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/*
          THE ROOT STACK NOW HOLDS ONE THING: the tab group (F-145).

          Its header is off because the tabs own the chrome below it — leaving it on puts a
          navigation bar above the tab bar's own screens, which is two headers for one page and
          is the first thing that looks wrong when a flat route table is grouped.

          The stack stays rather than being replaced by `<Tabs>` directly, because a modal or a
          full-screen route that must sit ABOVE the bar — a camera permission prompt, say — has
          nowhere else to go.
        */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

/** Reads the choice and hands it to the theme. One line, and it has to be a component. */
function Themed({ launch }: { readonly launch?: React.ReactNode }): React.JSX.Element {
  const { appearance, device } = useAppearance();
  /*
   * THE DERIVED PALETTE, ONLY WHEN IT WAS BOTH CHOSEN AND CHECKED (F-154).
   *
   * Both conditions matter. A person who has not chosen the device colour should not get it,
   * and a seed that did not pass the contrast and CVD checks is not applied at all — the base
   * theme stays and Preferences says why. There is no third branch where something unchecked
   * reaches the screen.
   */
  const palette =
    appearance.family === DEVICE_FAMILY && device.kind === 'applied'
      ? { name: device.name, mode: device.mode, colors: device.colors }
      : undefined;

  return (
    <ThemeProvider appearance={appearance} {...(palette === undefined ? {} : { palette })}>
      <Chrome />
      {/*
        THE LAUNCH OVERLAY LIVES INSIDE THE THEME (F-190), because it paints `background` and
        draws the mark in `foreground` — the same two tokens the native splash was composited
        from. Outside the provider it would have no theme to read and would have to invent one,
        which is the "a colour nobody chose" hazard every overlay in this product refuses.

        AFTER `Chrome`, so it is above it: the app mounts underneath immediately and a cold
        start never waits on decoration.
      */}
      {launch}
    </ThemeProvider>
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

  /*
   * THE LAUNCH OVERLAY, AND THE ORDER IS THE FEATURE.
   *
   * `launching` starts true and the overlay renders ON TOP of the app rather than instead of
   * it — so the app mounts underneath immediately and a cold start never waits on decoration.
   */
  const [launching, setLaunching] = useState(true);

  /*
   * The native splash goes only once OUR first frame is on screen. Hiding it before that is the
   * blank frame again, one layer up.
   */
  const onShown = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);
  const onDone = useCallback(() => {
    setLaunching(false);
  }, []);

  /*
   * STILL NOTHING WHILE THE FONT LOADS — and now that is correct rather than a gap, because the
   * native splash is still up. A frame drawn before the face is ready falls back to the
   * platform font, which is the silent failure ADR-0057 bundles a subset to avoid.
   */
  if (!loaded) return <></>;

  /*
   * THE SAFE-AREA PROVIDER IS EXPLICIT, not inherited.
   *
   * expo-router mounts one of its own, and relying on that is how the app ended up painting
   * under the status bar for three features without anyone noticing: F-145 turned the header
   * off, nothing else was insetting anything, and there was no place in our source that said
   * insets were somebody's job.
   *
   * Rendered here so the dependency is visible where the tree is assembled. A nested provider
   * is supported and inherits, so this is safe whether or not the router supplies one.
   */
  /*
   * THE CHOSEN APPEARANCE, READ BEFORE THE FIRST FRAME (F-153).
   *
   * `AppearanceProvider` sits OUTSIDE `ThemeProvider` because the theme is derived from the
   * choice; `Themed` is the one-line component that reads the first and feeds the second,
   * which a provider cannot do for itself.
   *
   * The repository is reached here rather than inside the provider, for the reason every
   * store seam in this app gives: `expo-sqlite` needs a device, and a module that imported it
   * could not be rendered by the suite where the accessibility guarantees are checked.
   */
  return (
    <SafeAreaProvider>
      <AppearanceProvider store={deviceRepository()}>
        <Themed launch={launching ? <Launch onShown={onShown} onDone={onDone} /> : null} />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
