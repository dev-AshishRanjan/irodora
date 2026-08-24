import { View } from 'react-native';
import { Button, Surface, Swatch, Text, useTheme } from '@irodora/ui';
import { differenceOklch, displayFromOklch } from '../engine';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';
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
 * typed colour, and after F-017 nothing on it is a typed user-facing string either.
 */

/** Two colours a person could actually be deciding between. Declared, not measured. */
const INDIGO: Triple = [0.42, 0.09, 264];
const BLUE_BLACK: Triple = [0.32, 0.05, 268];
const SAMPLES: readonly { readonly nameKey: MessageKey; readonly oklch: Triple }[] = [
  { nameKey: 'sample.indigo', oklch: INDIGO },
  { nameKey: 'sample.blueBlack', oklch: BLUE_BLACK },
];

export interface HomeProps {
  /**
   * Open the Atlas. Supplied by the route, absent in the conformance suite.
   *
   * Home is where a person lands, so an Atlas with no route to it would be the shape of
   * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] — 120 colours, every gate
   * green, and nothing on screen leading to any of them.
   */
  readonly onOpenAtlas?: () => void;
}

export function Home({ onOpenAtlas }: HomeProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const swatches = SAMPLES.map((s) => ({ ...s, display: displayFromOklch(s.oklch) }));
  const difference = differenceOklch(INDIGO, BLUE_BLACK);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 20 }}>
      {/*
        `heading` (F-088). A screen reader navigates by heading, and without the role this
        announced as ordinary text — the screen had no structure to move through at all.
        ACCESSIBILITY.md A11 states the requirement; the conformance suite asserts the role
        reaches the rendered node rather than trusting the prop was passed.
      */}
      <Text size="title" color="foreground" script={script} heading>
        {t('home.title')}
      </Text>

      {swatches.map(({ nameKey, display }) => (
        <Surface key={nameKey} level="1" padding={12}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            {/*
              The Swatch requires a `Color`, not a hex — provenance is in the type, so a
              sample whose origin nobody recorded cannot be rendered (ADR-0005).
            */}
            <Swatch name={t(nameKey)} hex={display.hex} color={display.color} size={72} />
            <View style={{ gap: 2, flexShrink: 1 }}>
              {/*
                `foreground.2`, not `foreground.3`. At `size="small"` the type will not accept
                a largeText-only token, so this is a compile error rather than a review note.
              */}
              <Text size="small" color="foreground.2" script={script}>
                {`${t('colour.hex')} ${display.hex}`}
              </Text>
              <Text size="small" color="foreground.2" script={script}>
                {`${t('colour.coordinates')} ${display.oklch.map((n) => n.toFixed(3)).join(' ')}`}
              </Text>
              <Text size="small" color="foreground.2" script={script}>
                {`${t('colour.source')}: ${display.color.provenance.source}`}
              </Text>
            </View>
          </View>
        </Surface>
      ))}

      <Text size="small" color="foreground.2" script={script}>
        {`${t('colour.difference')} ${t('colour.differenceUnit')} ${difference.toFixed(2)}`}
      </Text>
      <Text size="small" color="foreground.2" script={script}>
        {t('home.offline')}
      </Text>

      <Button
        label={t('home.openAtlas')}
        onPress={() => {
          onOpenAtlas?.();
        }}
      />
    </View>
  );
}
