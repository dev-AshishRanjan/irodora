/**
 * The navigation glyphs: the five tabs, and nothing else.
 *
 * ## Not the status icons, and not a second set of drawings
 *
 * `Icon` holds the status tokens and asserts them both ways against `statusPairing`. A tab is not a
 * status, so this stays its own list with the same discipline applied to its own subject: every tab
 * has a glyph, every glyph here belongs to a tab, asserted both ways by the app's `tab-icons` test.
 *
 * **The drawings are not here any more.** As of F-228 every glyph a mockup draws lives once, in
 * {@link Glyph}, and these five are entries in it. What this module owns is the LIST — which five
 * glyphs the tab bar may name — and the size a tab draws them at.
 *
 * ## Whose drawings
 *
 * The tab bar is drawn nine ways across the mockups; §6 C1 settles it by P5 as `01`'s — Home ·
 * Atlas · Lens · Wardrobe · Profile. So the house, the globe, the camera, the shirt and the person
 * are `01`'s, and they replaced the four squares, the framed circle and the two rectangles this file
 * drew before any mockup existed.
 *
 * ## They differ in SILHOUETTE
 *
 * A pointed roof, a sphere, a camera, a shirt, a head over shoulders — told apart with no colour, at
 * 20 dp, under any deficiency (NFR-9). The `cvd` gate covers the colour half; this is the half a gate
 * cannot check, and the tab test holds that no two tabs share a glyph.
 */

import { Glyph, type GlyphName } from './Glyph.js';

/** The five tab glyphs. A subset of the registry's names, checked by the compiler. */
export const NAV_ICON_NAMES = [
  'home',
  'atlas',
  'lens',
  'wardrobe',
  'profile',
] as const satisfies readonly GlyphName[];

export type NavIconName = (typeof NAV_ICON_NAMES)[number];

export interface NavIconProps {
  readonly name: NavIconName;
  /** Resolved by the caller from a theme token — this component names no colour. */
  readonly color: string;
  readonly size?: number;
}

/**
 * A navigation glyph.
 *
 * **Decorative to a screen reader.** The tab it sits in carries the accessible name, and a second
 * announcement of "home, image" adds nothing a person can act on.
 */
export function NavIcon({ name, color, size = 20 }: NavIconProps): React.JSX.Element {
  return <Glyph name={name} color={color} size={size} />;
}
