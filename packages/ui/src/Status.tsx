/**
 * A status, in all three channels or not at all.
 *
 * ## Not a HeroUI wrapper, because Alert is a different component
 *
 * HeroUI's nearest equivalent is `Alert`, which is a **banner** — a titled, described block
 * that occupies a row of the layout. This is an inline status that sits beside the thing it
 * describes, and ADR-0044's three channels (colour on the WORDS, an icon whose shape differs,
 * a visible label) do not survive being poured into a banner.
 *
 * What would actually be inherited is `statusPresentation()`, and that is already ours. See
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md).
 *
 * This composes `statusPresentation()` from `@irodora/design-tokens` rather than re-deriving
 * the rule. That function already refuses to compile without colour, icon and text, and
 * throws on a whitespace label — the front-door version of the same violation. Reimplementing
 * the check here would give NFR-9 two definitions, and the one that drifts is always the one
 * nobody is looking at.
 *
 * **The text is visible, not an `accessibilityLabel`.** A label only assistive technology can
 * reach still leaves a sighted person with colour-vision deficiency looking at two dots that
 * differ by hue. That distinction is the whole of NFR-9, and it is why `StatusPresentation`
 * calls the field `text`.
 */

import { View } from 'react-native';
import {
  nativeSpacing,
  STATUS_PAIRING,
  statusPresentation,
  type StatusKind,
} from '@irodora/design-tokens';
import { Icon, type IconToken } from './Icon.js';
import { Text } from './Text.js';
import { useTheme, type ThemeColors } from './theme.js';
import type { Script } from './layout.js';

export interface StatusProps {
  readonly kind: StatusKind;
  /** The visible label. Required, and an empty one throws — see `statusPresentation`. */
  readonly text: string;
  /**
   * A status token may not sit beside a colour sample without a separator (F-069). Declared
   * rather than assumed, so the rendered scan can see the claim.
   *
   * **THE SEPARATOR IS `surface.1`, AND IT USED TO BE `swatch.well` (F-205).**
   *
   * The rule was right and the ground was wrong. `status.ok` on `swatch.well` measured APCA
   * **Lc 43.6** against a floor of 45 — below it since before anybody looked, and passing WCAG
   * at 4.98:1 the whole time, which is how it stayed invisible.
   *
   * It could not be fixed by moving the colour. `status.ok` needs L 0.68 to clear the floor on
   * the well; at 0.68 its salience against `background` overtakes `status.warn` and breaks the
   * rank ADR-0053 fixed. Raising `warn` to make room drops its CVD separation from `status.bad`
   * to 54, under the declared minimum of 60. **There is no value that satisfies all three.**
   *
   * `surface.1` is darker than the well — L 0.210 against 0.290 — so every status token gains
   * contrast on it, and `status.ok` measures Lc 46.5. It is also the better separator on its own
   * terms: a darker ground reads as a caption area rather than as more of the swatch.
   */
  readonly adjacentToSample?: boolean;
  /** The script the label is written in. Latin by default, matching `Text`. */
  readonly script?: Script;
}

export function Status({
  kind,
  text,
  adjacentToSample = false,
  script = 'latin',
}: StatusProps): React.JSX.Element {
  const { colors } = useTheme();
  const presentation = statusPresentation(kind, STATUS_PAIRING[kind], text);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpacing.sm,
        ...(adjacentToSample
          ? { backgroundColor: colors['swatch.well'], padding: nativeSpacing.sm }
          : {}),
      }}
    >
      <Icon
        token={presentation.iconToken as IconToken}
        color={presentation.colorToken as keyof ThemeColors}
        size={14}
      />
      <Text
        size="small"
        color={presentation.colorToken as 'status.ok' | 'status.warn' | 'status.bad'}
        script={script}
      >
        {presentation.text}
      </Text>
    </View>
  );
}
