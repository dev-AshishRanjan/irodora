/**
 * The label the colour-vision preview carries on every screen while it is on (F-240, ADR-0131 §5).
 *
 * F-240's second criterion: *"the mode is labelled on screen while it is on"*. No mockup draws an
 * app-wide indication of the mode — `15` draws the pills that choose it — so this is an E4 surface,
 * composed from `15`'s own badge vocabulary: a `surface.2` pill with the `contrast` glyph naming the
 * mode in words, and one caption line under it saying what the screen is (a simulation, by which
 * model, at which severity), where the model is an approximation (tritanopia), and what it does not
 * reach (photographs and the camera). The words carry the mode (golden rule 13).
 *
 * It sits directly above the tab bar, which is on every route (FR-71, F-145), so it reaches every
 * screen through an invariant that is already tested. It is not interactive: the way back is the
 * section that chose it. It takes the mode as a prop rather than reading it, so the conformance
 * registry can render it in the declared palette while the preview sweep renders it simulated.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Chip, Text, type VisionMode } from '@irodora/ui';
import { useMessages } from './i18n/useMessages';
import type { MessageKey } from './i18n';

/** Each simulated mode's name, as `15` prints it. */
const MODE_KEYS: Readonly<Record<Exclude<VisionMode, 'standard'>, MessageKey>> = {
  protanopia: 'vision.mode.protanopia',
  deuteranopia: 'vision.mode.deuteranopia',
  tritanopia: 'vision.mode.tritanopia',
};

export const VISION_STRIP_TEST_ID = 'vision.strip';

export function VisionStrip({ mode }: { readonly mode: VisionMode }): React.JSX.Element | null {
  const { t, script } = useMessages();
  if (mode === 'standard') return null;
  // Each script's own separator, as the pipeline's and the refusal's are.
  const colon = script === 'japanese' ? '：' : ': ';
  return (
    <View
      testID={VISION_STRIP_TEST_ID}
      style={{
        paddingHorizontal: nativeSpacing.md,
        paddingVertical: nativeSpacing.xs,
        gap: nativeSpacing.xs,
        alignItems: 'flex-start',
      }}
    >
      <Chip
        form="badge"
        icon="contrast"
        fill="surface.2"
        label={`${t('vision.strip.label')}${colon}${t(MODE_KEYS[mode])}`}
        script={script}
      />
      <Text size="caption" color="foreground.2" script={script}>
        {mode === 'tritanopia'
          ? `${t('vision.strip.model')}${script === 'japanese' ? '' : ' '}${t('vision.strip.tritan')}`
          : t('vision.strip.model')}
      </Text>
    </View>
  );
}
