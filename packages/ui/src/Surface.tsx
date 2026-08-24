/**
 * A tonal surface.
 *
 * ## Not a HeroUI wrapper, and this is the case where wrapping would be actively wrong
 *
 * HeroUI's `Surface` exists and its variants map cleanly onto our levels. It also renders an
 * optional background layer through `ThemeBackground` / `GlassView` — **a blur.**
 *
 * A blur tints what it surrounds. That is the entire reason `swatch.well` exists, and the
 * reason the note below says a shadow is refused at parse time. Adopting HeroUI's Surface
 * would mean permanently carrying a code path that must never run next to a colour sample,
 * guarded by nothing but everyone remembering. See [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md).
 *
 * Elevation here lifts by **tint**, never by shadow — the manifest refuses a shadow at parse
 * time, and the reason is not stylistic: a shadow tints what it surrounds, and anything that
 * tints what surrounds a colour sample changes how that sample reads. Simultaneous contrast
 * is the whole reason `swatch.well` exists.
 */

import { View, type ViewProps } from 'react-native';
import { nativeElevation, nativeRadius } from '@irodora/design-tokens';
import { useTheme, type ThemeColors } from './theme.js';

/** The elevation levels the manifest declares, as a union derived from it. */
export type ElevationLevel = keyof typeof nativeElevation;

export type SurfaceProps = Omit<ViewProps, 'style'> & {
  readonly level?: ElevationLevel;
  readonly radius?: keyof typeof nativeRadius;
  readonly padding?: number;
};

export function Surface({
  level = '1',
  radius = 'md',
  padding = 0,
  children,
  ...rest
}: SurfaceProps): React.JSX.Element {
  const { colors } = useTheme();
  // The level names a token; the token names a colour. Neither is written here.
  const token = nativeElevation[level] as keyof ThemeColors;
  return (
    <View
      {...rest}
      style={{
        backgroundColor: colors[token],
        borderRadius: nativeRadius[radius],
        padding,
      }}
    >
      {children}
    </View>
  );
}
