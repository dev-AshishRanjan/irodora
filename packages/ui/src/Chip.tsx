/**
 * A selectable filter chip.
 *
 * ## Why this is a component rather than a `Pressable` on the Atlas
 *
 * It was a `Pressable` on the Atlas first, and the conformance suite caught it: a control built
 * inside a screen is checked by **nothing**. `packages/ui`'s run covers this registry, the
 * app's run covers screens as `static` subjects, and an interactive control living in a screen
 * file falls between them — it has focus, active, disabled and loading states that no suite
 * ever asks it to render differently.
 *
 * ADR-0054 already says every component is either consumed by a real screen or registered, and
 * `a11y-scope.mjs` computes the closure. What it cannot see is a control that was never a
 * component in the first place. So the rule that matters is the converse: **an interactive
 * control belongs in the library, and a screen stays `static`.**
 *
 * ## Selection is never colour alone
 *
 * Golden rule 13. The tick is inside the label rather than beside it, so a screen reader
 * announces the selection as part of the name — and `accessibilityState.selected` carries it
 * again for assistive technology that reads state separately. Two channels plus the fill.
 */

import { Pressable, View, type PressableProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { SelectionMark, selectionStyle, selectionTone } from './selection.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';
import { useTheme } from './theme.js';

export type ChipProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> & {
  /** The visible label. Also the accessible name, so the two cannot diverge. */
  readonly label: string;
  readonly selected?: boolean;
  /**
   * Focused by an external keyboard or Switch Control.
   *
   * A distinct state from `selected`: focus is where the cursor is, selection is what was
   * chosen, and a control that renders them identically has one of them in name only.
   */
  readonly focused?: boolean;
  readonly disabled?: boolean;
  /** The result behind this chip is still being computed. Announced as busy, not only dimmed. */
  /** The result behind this chip is still being computed. Announced as busy, not only dimmed. */
  readonly loading?: boolean;
  /**
   * The script the label is written in.
   *
   * Latin by default, matching `Text`. It matters because ADR-0057 §6 bundles a Japanese
   * subset — Latin keeps the platform font because Latin has no tofu failure mode, and the
   * script that CAN fail silently is the one that gets the bundled face. Leading differs too.
   */
  readonly script?: Script;
};

/**
 * The accessible name, assembled here so no call site can forget the selection channel.
 *
 * Exported so the conformance suite can assert its shape rather than re-deriving it.
 */
export function chipAccessibleName(label: string, selected: boolean): string {
  return selected ? `${label} ✓` : label;
}

/**
 * The badge on a chip, smaller than the default.
 *
 * A chip is only `nativeTapTarget` tall and its label runs the full width, so the 18px badge
 * a swatch carries would sit on the text. 14 is the largest that clears a `small` label at
 * the chip's padding, and it is still a drawn glyph rather than a character.
 */
const SELECTION_MARK_CHIP = 14;

export function Chip({
  label,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  script = 'latin',
  ...rest
}: ChipProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  /*
   * THE SHARED TREATMENT (F-176), where this drew its own.
   *
   * It filled with `inverse` — a near-white plate on dark and a near-black one on light. That
   * read as selected and it was a THIRD answer to the question `Swatch` and `Tabs` each
   * answered differently, which is what was reported.
   *
   * Both pairings are DECLARED in the manifest — `accent.muted` pairsWith `foreground` and
   * `foreground.2`, `surface.2` pairsWith `foreground`. Pairing tokens the manifest does not
   * declare together is a contrast-gate failure, so this choice is not free.
   */
  const tone = selectionTone({ selected, focused }, colors);
  const foreground = selected ? ('foreground' as const) : ('foreground.2' as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={chipAccessibleName(label, selected)}
      // `selected` twice on purpose: in the name for a reader that announces only the label,
      // and in the state for one that reads state separately.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      {...rest}
      style={{
        // BOTH minimums. A chip is content-width, so a short label — "All", "Warm" — is
        // comfortably under 44px wide without this, and the conformance suite caught exactly
        // that. WCAG 2.2 asks for the target, not for the text.
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        alignItems: 'center',
        borderRadius: nativeRadius.sm,
        paddingHorizontal: nativeSpacing.md,
        justifyContent: 'center',
        backgroundColor: colors['surface.2'],
        /*
         * Focus is still a RING rather than a fill, for the reason this file already gave: it
         * has to be visible on a chip that is ALREADY selected, and a fill change would be
         * indistinguishable from selection. What changed is that the ring is now reserved in
         * every state, so focusing a chip no longer resizes it — and the ring is `ring`
         * rather than `border.strong`, which is the token that exists for exactly this.
         */
        ...selectionStyle(tone),
        // Every declared state renders differently. A control returning the same tree for
        // default and disabled has defined the state in name only.
        opacity: inert ? 0.5 : 1,
      }}
    >
      <SelectionMark visible={tone.mark} size={SELECTION_MARK_CHIP} />
      <View>
        <Text size="small" color={foreground} script={script}>
          {loading
            ? `${chipAccessibleName(label, selected)}…`
            : chipAccessibleName(label, selected)}
        </Text>
      </View>
    </Pressable>
  );
}
