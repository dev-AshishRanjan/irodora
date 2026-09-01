/**
 * What the Lens shows when the camera module cannot be loaded at all.
 *
 * ## This is a real screen, not a placeholder
 *
 * The failure it reports is the one that used to close the app: `react-native-vision-camera`
 * creates its native binding at module scope, so an unregistered HybridObject throws during
 * *import* rather than during render.
 *
 * **It shows the error text on purpose.** Normally a raw error message is the wrong thing to put
 * in front of somebody — but this failure is structural rather than transient: no retry helps,
 * the rest of the app works, and the only useful thing a person can do is tell somebody what it
 * said. Hiding it behind "something went wrong" would remove the one piece of information that
 * makes the report actionable, and there is nothing sensitive in it.
 *
 * The copy above it says the part that matters to the person: the rest of the app is fine, and
 * every colour tool that does not need a camera still works.
 */

import { ScrollView, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Surface, Text, useTheme } from '@irodora/ui';
import { useMessages } from '../i18n/useMessages';

export interface CameraUnavailableProps {
  /** Whatever was thrown while loading the camera module. */
  readonly error: unknown;
}

/**
 * The message, however the failure was thrown. Never `[object Object]`.
 *
 * `JSON.stringify` is typed as returning `string` but returns `undefined` for `undefined`, a
 * function, or a symbol — so the result is checked rather than trusted, and anything circular
 * falls through to `String()`.
 */
export function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    const json: string | undefined = JSON.stringify(error);
    return typeof json === 'string' ? json : String(error);
  } catch {
    return String(error);
  }
}

export function CameraUnavailable({ error }: CameraUnavailableProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: nativeSpacing.xl, gap: nativeSpacing.lg }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('lens.unavailable')}
      </Text>
      <Text size="body" color="foreground" script={script}>
        {t('lens.unavailableBody')}
      </Text>

      <Surface level="1" padding={16}>
        <View style={{ gap: nativeSpacing.xs }}>
          <Text size="small" color="foreground.2" script={script}>
            {t('lens.unavailableDetail')}
          </Text>
          {/*
            Monospaced would be better and there is no monospace step in the type scale, which
            is a real gap and not worth inventing a token for here. `foreground` rather than
            `foreground.2`: this is the line somebody is being asked to read out.
          */}
          <Text size="small" color="foreground" script="latin">
            {describe(error)}
          </Text>
        </View>
      </Surface>
    </ScrollView>
  );
}
