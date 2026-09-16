/**
 * The shadow a mockup draws, as a style — and nothing anywhere else.
 *
 * ## Why this is one function rather than a prop
 *
 * Depth in this product is TINT (ADR-0044): a surface lifts by taking a lighter token, because a
 * shadow tints what it surrounds and a colour sample must not be judged against a tinted surround.
 * Mockup `25` draws one exception — its light cards sit on the washi ground with a soft downward
 * shadow — and ADR-0103 allows exactly that one: light mode, elevation level 1.
 *
 * Expressed as a lookup against the manifest rather than as a component prop, so a screen cannot
 * ask for a shadow: what carries one is a fact about the theme and the level, and the manifest is
 * where it is declared. A component that wanted a shadow somewhere else would have to publish it.
 */

import { nativeShadow } from '@irodora/design-tokens';
import type { ViewStyle } from 'react-native';
import type { ThemeColors } from './theme.js';

/**
 * What the manifest may declare — the object, or "none".
 *
 * Written out here because the EMITTED value is whichever one the manifest holds: a concrete
 * object today, the string the day a person withdraws the shadow. Read through the union, a
 * consumer compiles against both; read through the emitted literal type, `=== 'none'` is an error
 * until the manifest changes and then the field access is. The narrowing belongs at the boundary.
 */
export type DeclaredShadow =
  | 'none'
  | {
      readonly modes: readonly string[];
      readonly levels: readonly string[];
      readonly ink: string;
      readonly opacity: number;
      readonly offsetY: number;
      readonly blur: number;
    };

/**
 * The declaration, widened to what the manifest MAY hold.
 *
 * A function rather than a typed const, because TypeScript narrows a const to the type of its
 * initialiser: annotating it `DeclaredShadow` and assigning the emitted object leaves the object,
 * and `=== 'none'` is then an error about a comparison that is exactly the point. Widening at a
 * return type keeps both branches reachable to the compiler, which is what lets this module go on
 * compiling the day a person withdraws the shadow.
 */
function declaredShadow(): DeclaredShadow {
  return nativeShadow;
}

/** `#RRGGBB` at an alpha, as the `rgba()` a box shadow takes. Anything else is returned as it came. */
function inkAt(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(color);
  if (hex === null) return color;
  const [r, g, b] = [hex[1], hex[2], hex[3]].map((part) => parseInt(part ?? '0', 16));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

/**
 * The shadow for a theme mode and elevation level — `{}` wherever the manifest declares none.
 *
 * Returns a style rather than a boolean so the caller spreads it and never composes one itself.
 */
export function elevationShadow(
  mode: string,
  level: string,
  colors: ThemeColors,
): Pick<ViewStyle, 'boxShadow'> {
  const declared = declaredShadow();
  if (declared === 'none') return {};
  if (!declared.modes.includes(mode) || !declared.levels.includes(level)) return {};
  const ink = colors[declared.ink as keyof ThemeColors];
  return {
    boxShadow: `0px ${String(declared.offsetY)}px ${String(declared.blur)}px ${inkAt(
      ink,
      declared.opacity,
    )}`,
  };
}
