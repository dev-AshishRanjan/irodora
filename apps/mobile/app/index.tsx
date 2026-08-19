import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';
import { differenceOklch, displayFromOklch } from '../src/engine';
import type { Triple } from '@irodora/color-spaces';

/**
 * The floor, and the proof that it is a floor rather than a placeholder.
 *
 * Every value on this screen is **computed by the engine at render time** — the hexes are not
 * typed anywhere, and the ΔE00 figure is the real metric over the real conversion path. A screen
 * that hard-coded them would look identical and prove nothing, which is exactly the failure this
 * repository has already shipped once, in a different shape.
 *
 * It is deliberately plain. The design system is F-017; the Atlas is F-018; the Lens is F-040.
 * Building any of them here would be scope creep past a `wip_limit` of 1.
 */

/** Two colours a person could actually be deciding between. Declared, not measured. */
const INDIGO: Triple = [0.42, 0.09, 264];
const BLUE_BLACK: Triple = [0.32, 0.05, 268];
const SAMPLES: readonly { readonly label: string; readonly oklch: Triple }[] = [
  { label: 'Indigo', oklch: INDIGO },
  { label: 'Blue-black', oklch: BLUE_BLACK },
];

export default function Index() {
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

  const swatches = SAMPLES.map((s) => ({ ...s, display: displayFromOklch(s.oklch) }));
  const difference = differenceOklch(INDIGO, BLUE_BLACK);

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.heading, { color: theme.foreground }]}>
          The engine is running on this device
        </Text>

        {swatches.map(({ label, display }) => (
          <View key={label} style={styles.row}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: display.hex, borderColor: theme['swatch.hairline'] },
              ]}
            />
            <View style={styles.detail}>
              <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
              {/* The hex is DERIVED. Nothing on this screen types a colour value. */}
              <Text style={[styles.mono, { color: theme['foreground.2'] }]}>{display.hex}</Text>
              <Text style={[styles.mono, { color: theme['foreground.3'] }]}>
                {`OKLCh ${display.oklch.map((n) => n.toFixed(3)).join(' ')}`}
              </Text>
              {/* Provenance is not optional — a Color cannot exist without it (ADR-0005). */}
              <Text style={[styles.mono, { color: theme['foreground.3'] }]}>
                {`source: ${display.color.provenance.source}`}
              </Text>
            </View>
          </View>
        ))}

        <Text style={[styles.body, { color: theme['foreground.2'] }]}>
          {`ΔE00 between them: ${difference.toFixed(2)}`}
        </Text>
        <Text style={[styles.body, { color: theme['foreground.3'] }]}>
          Computed here, offline. Nothing was sent anywhere.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 20 },
  heading: { fontSize: 20, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  // radius 0, forever. Corner radius removes sampled area from exactly the region the eye uses
  // to judge a flat colour, and the effect grows as the swatch shrinks (DESIGN-SYSTEM.md).
  swatch: { width: 72, height: 72, borderRadius: 0, borderWidth: 1 },
  detail: { gap: 2, flexShrink: 1 },
  label: { fontSize: 16, fontWeight: '500' },
  mono: { fontSize: 13, fontVariant: ['tabular-nums'] },
  body: { fontSize: 14 },
});
