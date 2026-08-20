/**
 * A status, in all three channels or not at all.
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
import { STATUS_PAIRING, statusPresentation, type StatusKind } from '@irodora/design-tokens';
import { Icon, type IconToken } from './Icon.js';
import { Text } from './Text.js';
import { useTheme, type ThemeColors } from './theme.js';

export interface StatusProps {
  readonly kind: StatusKind;
  /** The visible label. Required, and an empty one throws — see `statusPresentation`. */
  readonly text: string;
  /**
   * A status token may not sit beside a colour sample without the `swatch.well` separator
   * (F-069). Declared rather than assumed, so the rendered scan can see the claim.
   */
  readonly adjacentToSample?: boolean;
}

export function Status({ kind, text, adjacentToSample = false }: StatusProps): React.JSX.Element {
  const { colors } = useTheme();
  const presentation = statusPresentation(kind, STATUS_PAIRING[kind], text);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        ...(adjacentToSample ? { backgroundColor: colors['swatch.well'], padding: 6 } : {}),
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
      >
        {presentation.text}
      </Text>
    </View>
  );
}
