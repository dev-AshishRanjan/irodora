/**
 * Icons, and the registry that makes NFR-9's structural guarantee reach the screen.
 *
 * ## Not a HeroUI wrapper, and there is no HeroUI to wrap
 *
 * HeroUI ships **no icon primitive** — it expects `react-native-svg` and your own glyphs. So
 * this stays exactly as it was, and the reasoning below (ADR-0054's, about tofu and about
 * shapes differing rather than colours) survives ADR-0062 untouched. See [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md).
 *
 * ## What was actually missing
 *
 * `statusPresentation()` has refused to compile without an icon token since F-003, and
 * ACCESSIBILITY.md §4 says a status expressible only as colour cannot be constructed. But
 * `icon.check`, `icon.alert` and `icon.cross` appeared **only** in `statusPairing` and
 * resolved to nothing at all — no registry, no component, no glyph. The guarantee was true of
 * the *type* and unproven of the *render*: three strings in a JSON file.
 *
 * The registry closes that, and its test asserts coverage **in both directions** — every
 * manifest icon token has a glyph, and every glyph is a manifest icon token. One direction
 * alone lets the registry grow names nothing declares, or lets a declared token quietly lose
 * its glyph.
 *
 * ## Why the glyphs are drawn rather than imported
 *
 * [ADR-0054](../../../docs/adr/0054-react-native-core-primitives-and-ui-stays-a-package.md)
 * takes no third-party foundation dependency, and an icon font would reintroduce the coverage
 * problem ADR-0057 exists to solve — a missing glyph renders as tofu, silently.
 *
 * **The shapes differ, not only the colours** (NFR-9). A check, a triangle and a cross are
 * distinguishable in greyscale, under every simulated deficiency, and at thumbnail size —
 * which is the actual requirement. Three dots in three colours would satisfy every "has an
 * icon" check and fail the person the rule is for.
 */

import { View, type ViewStyle } from 'react-native';
import type { STATUS_PAIRING } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';

/** Every icon token the manifest declares, as a union derived from it. */
export type IconToken = (typeof STATUS_PAIRING)[keyof typeof STATUS_PAIRING]['iconToken'];

type Glyph = (color: string, size: number) => React.JSX.Element;

const bar = (color: string, style: ViewStyle): React.JSX.Element => (
  <View style={{ position: 'absolute', backgroundColor: color, borderRadius: 1, ...style }} />
);

/**
 * The glyphs.
 *
 * Keyed by manifest token name, so the registry cannot drift from the manifest by renaming.
 * `satisfies` rather than a type annotation: it checks completeness while keeping the literal
 * key set, which is what the both-directions test reads.
 */
const GLYPHS = {
  'icon.check': (color, size) => (
    <>
      {bar(color, {
        left: size * 0.16,
        top: size * 0.52,
        width: size * 0.34,
        height: size * 0.14,
        transform: [{ rotate: '45deg' }],
      })}
      {bar(color, {
        left: size * 0.36,
        top: size * 0.42,
        width: size * 0.56,
        height: size * 0.14,
        transform: [{ rotate: '-45deg' }],
      })}
    </>
  ),
  // A triangle, via the border trick — RN has no polygon primitive and this needs no asset.
  'icon.alert': (color, size) => (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: size * 0.1,
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size * 0.8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        backgroundColor: 'transparent',
      }}
    />
  ),
  'icon.cross': (color, size) => (
    <>
      {bar(color, {
        left: size * 0.1,
        top: size * 0.43,
        width: size * 0.8,
        height: size * 0.14,
        transform: [{ rotate: '45deg' }],
      })}
      {bar(color, {
        left: size * 0.1,
        top: size * 0.43,
        width: size * 0.8,
        height: size * 0.14,
        transform: [{ rotate: '-45deg' }],
      })}
    </>
  ),
} satisfies Record<IconToken, Glyph>;

/** The registry's own key set, for the both-directions coverage test. */
export const ICON_TOKENS = Object.keys(GLYPHS) as readonly IconToken[];

export interface IconProps {
  readonly token: IconToken;
  readonly color: keyof ThemeColors;
  readonly size?: number;
  /**
   * An icon is **decorative here by default**, because the `Status` it sits in carries the
   * meaning in text. Marking it as an image with no name would add a stop for a screen-reader
   * user that says nothing; giving it a name would announce the meaning twice.
   */
  readonly accessibilityLabel?: string;
}

export function Icon({
  token,
  color,
  size = 16,
  accessibilityLabel,
}: IconProps): React.JSX.Element {
  const { colors } = useTheme();
  const draw = GLYPHS[token];
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      {...(accessibilityLabel === undefined
        ? {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
          }
        : { accessibilityRole: 'image' as const, accessibilityLabel })}
      style={{ width: size, height: size }}
    >
      {draw(colors[color], size)}
    </View>
  );
}
