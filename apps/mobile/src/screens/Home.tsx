import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button, Row, Screen, Surface, Swatch, Text } from '@irodora/ui';
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
  /** Open Compare. Same shape and same reason as onOpenAtlas. */
  readonly onOpenCompare?: () => void;
  /** Open Palette Studio. Same shape and same reason as onOpenAtlas. */
  readonly onOpenStudio?: () => void;
  /** Open the Colour Finder. Same shape and same reason as onOpenAtlas. */
  readonly onOpenFinder?: () => void;
  /** Open guided profile setup. Same shape and same reason as onOpenAtlas. */
  readonly onOpenProfile?: () => void;
  /**
   * Open the Lens. Same shape and same reason as onOpenAtlas, and the sharpest instance of it:
   * `read()` and four capture modes shipped in F-040 and `estimateFromReading` in F-027, and
   * until F-097 nothing on any screen led to a camera at all.
   */
  readonly onOpenLens?: () => void;
  /**
   * Open the shopping check (F-052). Same shape and same reason as onOpenAtlas.
   *
   * Last in the list because it is the only entry that needs something already in the
   * wardrobe to say anything useful, and a first-run home screen should not lead with the
   * one door that opens onto "add something first".
   */
  readonly onOpenShopping?: () => void;
  /**
   * Open the professional surface (F-055). Same shape and same reason as onOpenAtlas.
   *
   * **No entitlement check guards this entry, and there is none to add.** FR-61 says the
   * professional readouts are available to every user *because none exists* (ADR-0051), so the
   * button is unconditional — which is a decision worth stating rather than a line worth
   * omitting.
   */
  readonly onOpenMeasure?: () => void;
  /**
   * Open the wardrobe (F-122). Same shape and same reason as onOpenAtlas, and another instance
   * of it: `app/wardrobe/` held only `add.tsx`, so a garment could be created and then never
   * seen again — the schema, the repository and the add screen all shipped and verified, with
   * nowhere to look at the result.
   */
  readonly onOpenWardrobe?: () => void;
  /**
   * Open the export surface (F-129). Same shape and same reason as onOpenAtlas.
   *
   * F-056 built six writers with a contract test over all six, and **nothing in the app called
   * any of them** — six formats and no way to produce a file.
   */
  readonly onOpenExport?: () => void;
}

export function Home({
  onOpenAtlas,
  onOpenCompare,
  onOpenStudio,
  onOpenFinder,
  onOpenProfile,
  onOpenLens,
  onOpenShopping,
  onOpenMeasure,
  onOpenWardrobe,
  onOpenExport,
}: HomeProps = {}): React.JSX.Element {
  const { t, script } = useMessages();
  const swatches = SAMPLES.map((s) => ({ ...s, display: displayFromOklch(s.oklch) }));
  const difference = differenceOklch(INDIGO, BLUE_BLACK);

  return (
    /*
      F-104'S LESSON NOW LIVES IN THE COMPONENT (F-140).

      This screen was a fixed `View` with `flex: 1`, so everything past the fold was simply
      unreachable — on a six-button home screen the last two entry points could not be tapped
      at all, and the symptom reads as "the app is missing features" rather than as a layout
      bug. Nothing could have caught it: a react-test-renderer tree has no viewport and no Yoga
      pass, so "rendered" and "reachable" are the same thing there and different things on a
      phone [[a-gate-must-model-what-renders-not-what-is-physically-correct]].

      `Screen` scrolls by DEFAULT for that reason, and it is the one place the padding-versus-
      contentContainerStyle distinction is now written down. A screen that genuinely owns its
      viewport says `scroll={false}` at the call site, which is a decision somebody made rather
      than a default they inherited.
    */
    <Screen title={t('home.title')} script={script}>
      {swatches.map(({ nameKey, display }) => (
        <Surface key={nameKey} level="1" padding="md">
          <Row gap="lg">
            {/*
              The Swatch requires a `Color`, not a hex — provenance is in the type, so a
              sample whose origin nobody recorded cannot be rendered (ADR-0005).
            */}
            <Swatch name={t(nameKey)} hex={display.hex} color={display.color} size={72} />
            <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
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
          </Row>
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

      <Button
        label={t('home.openCompare')}
        variant="secondary"
        onPress={() => {
          onOpenCompare?.();
        }}
      />

      <Button
        label={t('home.openStudio')}
        variant="secondary"
        onPress={() => {
          onOpenStudio?.();
        }}
      />

      <Button
        label={t('home.openFinder')}
        variant="secondary"
        onPress={() => {
          onOpenFinder?.();
        }}
      />

      <Button
        label={t('home.openProfile')}
        variant="secondary"
        onPress={() => {
          onOpenProfile?.();
        }}
      />

      <Button
        label={t('home.openLens')}
        variant="secondary"
        onPress={() => {
          onOpenLens?.();
        }}
      />

      <Button
        label={t('home.openShopping')}
        variant="secondary"
        onPress={() => {
          onOpenShopping?.();
        }}
      />

      <Button
        label={t('home.openWardrobe')}
        variant="secondary"
        onPress={() => {
          onOpenWardrobe?.();
        }}
      />

      <Button
        label={t('home.openExport')}
        variant="secondary"
        onPress={() => {
          onOpenExport?.();
        }}
      />

      <Button
        label={t('home.openMeasure')}
        variant="secondary"
        onPress={() => {
          onOpenMeasure?.();
        }}
      />
    </Screen>
  );
}
