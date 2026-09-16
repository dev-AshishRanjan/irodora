/**
 * A control whose only content is a glyph — and which therefore cannot exist without a name.
 *
 * ## Why `label` is required, not merely recommended
 *
 * A glyph is decorative ({@link Glyph}): beside a word it adds nothing a screen reader should
 * announce twice. Alone in a control it is the whole of what a sighted person reads, and a screen
 * reader has nothing to say for it unless the control is named. F-228's second criterion is that
 * every such control is named, so the name is a REQUIRED prop and the careless version does not
 * compile — the move F-140 made for spacing. The conformance suite still checks the rendered name;
 * the type is what stops the unnamed one being written in the first place.
 *
 * ## What it draws, and what it leaves to the surface
 *
 * The glyph, at the mockups' weight, in a tap target — and nothing else. The square and circular
 * containers `00` draws are F-232's, and the inventories record each icon-only control's plate in
 * its own `tokens` (thirty `ui:Button` elements with an icon and no copy). A container chosen here
 * would be one answer imposed before the feature that owns the question has read the board.
 *
 * ## Built as `Button` is
 *
 * On HeroUI's `Button` (ADR-0062), with `feedbackVariant="scale"` for the reason `Button` gives:
 * the default highlight animates a background colour. `isIconOnly` is HeroUI's own flag for this
 * layout. Colour comes through `style` and props, never `className` — jest never runs Metro.
 */

import { Button as HeroButton } from 'heroui-native';
import type { PressableProps } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Glyph, type GlyphName } from './Glyph.js';
import { useTheme, type ThemeColors } from './theme.js';

export type IconButtonProps = Omit<
  PressableProps,
  'style' | 'children' | 'disabled' | 'accessibilityLabel' | 'aria-label'
> & {
  /** The glyph, by the name its inventory binds. */
  readonly name: GlyphName;
  /**
   * What the control does, for a screen reader — "Share this colour", not "Share icon". Required:
   * the glyph is all a sighted person sees, and this is all a screen-reader user hears.
   */
  readonly label: string;
  /** The glyph's ink, as a theme token. The surface's inventory names it. */
  readonly color?: keyof ThemeColors;
  /** The glyph's size in dp; the line weight holds at every size ({@link glyphStroke}). */
  readonly size?: number;
  /** The drawn active state, for the glyphs a mockup draws filled. */
  readonly filled?: boolean;
  readonly disabled?: boolean;
  readonly loading?: boolean;
};

export function IconButton({
  name,
  label,
  color = 'foreground',
  size = 24,
  filled = false,
  disabled = false,
  loading = false,
  ...rest
}: IconButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  return (
    <HeroButton
      accessibilityRole="button"
      accessibilityLabel={label}
      // Both flags, from the same two props — HeroUI sets `disabled` and nothing else.
      accessibilityState={{ disabled: inert, busy: loading }}
      isDisabled={inert}
      isIconOnly
      variant="ghost"
      feedbackVariant="scale"
      {...rest}
      style={{
        // DECLARED, because a glyph is 24 dp and a finger is not (WCAG 2.2, ADR-0055).
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        // Every declared state renders differently; `Button`'s dimming, for the same reason.
        opacity: inert ? 0.5 : 1,
      }}
    >
      <Glyph name={name} color={colors[color]} size={size} filled={filled} />
    </HeroButton>
  );
}
