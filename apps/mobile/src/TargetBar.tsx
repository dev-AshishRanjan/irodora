/**
 * The armed target, visible wherever it is armed (F-200, criterion 1).
 *
 * ## Why this is rendered by the root layout
 *
 * *Visible wherever it is armed* means every screen, and a bar each screen had to remember to
 * draw would be absent from the next one somebody wrote. Rendering it above the router costs
 * every screen nothing and cannot be forgotten.
 *
 * ## It carries its own way out
 *
 * Criterion 2 is that a target is *disarmed deliberately, never silently*. The control that
 * does it lives here rather than on the screen that armed it — a person who armed a colour four
 * screens ago should not have to find that screen again to stop comparing.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button, Row, Surface, swatchAccessibleName, Swatch, Text, useTheme } from '@irodora/ui';
import { useMessages } from './i18n/useMessages';
import type { TargetColour } from './target';

/** The size the target is drawn at. Small — this is a reminder, not the subject of a screen. */
const MARK = 32;

export interface TargetBarProps {
  readonly target: TargetColour;
  readonly onDisarm: () => void;
}

export function TargetBar({ target, onDisarm }: TargetBarProps): React.JSX.Element {
  const { t, script } = useMessages();
  const { colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* `xs`, the smallest the scale offers: a bar spanning the width should not read as a card,
          and the token set has no "none" — inventing one for this would be a design-system
          decision made to satisfy one component. */}
      <Surface
        /* surface-not-card: a bar, not content — a swatch and a label pinned above the screen, with no heading and nothing a header slot could hold. */
        level="1"
        padding="sm"
        radius="xs"
      >
        <Row gap="sm" align="center">
          <Swatch
            name={swatchAccessibleName(target.label, target.hex, target.color)}
            hex={target.hex}
            color={target.color}
            size={MARK}
            script={script}
          />
          <View style={{ flexShrink: 1, gap: nativeSpacing.xs }}>
            {/*
              LABELLED AS A TARGET, not merely shown. A swatch in a bar with no word for what it
              is doing there reads as decoration, and the whole point is that a person knows a
              comparison is armed.
            */}
            <Text size="xs" color="foreground.2" script={script}>
              {t('target.armed')}
            </Text>
            <Text size="small" color="foreground" script={script}>
              {target.label}
            </Text>
          </View>
          <Button
            label={t('target.disarm')}
            variant="secondary"
            onPress={onDisarm}
            script={script}
          />
        </Row>
      </Surface>
    </View>
  );
}
