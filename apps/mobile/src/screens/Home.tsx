import { View } from 'react-native';
import { Surface, Swatch, Text, useTheme } from '@irodora/ui';
import { differenceOklch, displayFromOklch } from '../engine.js';
import type { Triple } from '@irodora/color-spaces';

/**
 * The home screen's CONTENT, separated from its route.
 *
 * `app/index.tsx` owns the navigation options (`Stack.Screen`) and nothing else. That split is
 * not cosmetic: `Stack.Screen` throws *"Couldn't find a route object"* outside a navigator, so
 * a screen that sets its own options can only be rendered by mounting a navigator around it —
 * and the conformance suite would then be testing expo-router rather than the screen.
 *
 * ## Two defects the conformance suite found here
 *
 * **The theme was read, not received.** This screen called `useColorScheme()` directly, so
 * asking it to render `dark` produced light colours — every token unresolvable in the theme it
 * was told to be in. It reads `useTheme()` now, which is the whole reason `ThemeProvider`
 * exists: a component that decides its own theme cannot be checked in the other one.
 *
 * **`foreground.3` at 13 px and 14 px, five times.** A `largeText` token, restricted by the
 * manifest to >= 18.66 px. Now impossible rather than fixed — `<Text size="small">` will not
 * accept that token, and the failure is a compile error at the call site.
 *
 * Every value here is still computed by the engine at render time. Nothing on this screen is a
 * typed colour.
 */

/** Two colours a person could actually be deciding between. Declared, not measured. */
const INDIGO: Triple = [0.42, 0.09, 264];
const BLUE_BLACK: Triple = [0.32, 0.05, 268];
const SAMPLES: readonly { readonly label: string; readonly oklch: Triple }[] = [
  { label: 'Indigo', oklch: INDIGO },
  { label: 'Blue-black', oklch: BLUE_BLACK },
];

export function Home(): React.JSX.Element {
  const { colors } = useTheme();
  const swatches = SAMPLES.map((s) => ({ ...s, display: displayFromOklch(s.oklch) }));
  const difference = differenceOklch(INDIGO, BLUE_BLACK);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 20 }}>
      <Text size="title" color="foreground">
        The engine is running on this device
      </Text>

      {swatches.map(({ label, display }) => (
        <Surface key={label} level="1" padding={12}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            {/*
              The Swatch requires a `Color`, not a hex — provenance is in the type, so a
              sample whose origin nobody recorded cannot be rendered (ADR-0005).
            */}
            <Swatch name={label} hex={display.hex} color={display.color} size={72} />
            <View style={{ gap: 2, flexShrink: 1 }}>
              {/*
                `foreground.2`, not `foreground.3`. At `size="small"` the type will not accept
                a largeText-only token, so this is a compile error rather than a review note.
              */}
              <Text size="small" color="foreground.2">
                {display.hex}
              </Text>
              <Text size="small" color="foreground.2">
                {`OKLCh ${display.oklch.map((n) => n.toFixed(3)).join(' ')}`}
              </Text>
              <Text size="small" color="foreground.2">
                {`source: ${display.color.provenance.source}`}
              </Text>
            </View>
          </View>
        </Surface>
      ))}

      <Text size="small" color="foreground.2">
        {`ΔE00 between them: ${difference.toFixed(2)}`}
      </Text>
      <Text size="small" color="foreground.2">
        Computed here, offline. Nothing was sent anywhere.
      </Text>
    </View>
  );
}
