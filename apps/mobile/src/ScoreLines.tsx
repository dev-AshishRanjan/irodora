/**
 * A score's lines: the overall beside its components, never instead of them (FR-32, F-031).
 *
 * One renderer for every place an outfit's score is shown — the Lab's proposals, the Lab's whole
 * draft, and a saved lookbook entry (F-238) — so a score looks one way wherever it is read, and
 * F-257's rebuild of 13's score card changes all three at once.
 *
 * A component, not a screen, so it lives beside `TargetBar` rather than in `screens/`, whose every
 * file declares its data conditions. Extracted from `OutfitBuilder` unchanged: a fragment, so the rendered tree is the one the
 * proposals drew before, and the inset pin and the sweep's counts are what say so.
 *
 * ## The sentence, not the identifier (F-124, E-053)
 *
 * `isMessageKey` narrows rather than casts, so a key the catalogue lacks still renders — as the raw
 * identifier, visibly wrong — instead of blanking the line. That is how the gap was found.
 */

import { Text } from '@irodora/ui';
import type { ShownScore } from './outfit/lookbook';
import { useMessages } from './i18n/useMessages';
import { isMessageKey } from './i18n/index';

export function ScoreLines({ score }: { readonly score: ShownScore }): React.JSX.Element {
  const { t, script } = useMessages();
  return (
    <>
      <Text size="body" color="foreground" numeric script={script}>
        {`${t('outfit.overall')}: ${String(Math.round(score.overall))}`}
      </Text>
      {score.components.map((c) => (
        <Text key={c.component} size="label" color="foreground.2" numeric script={script}>
          {`${isMessageKey(c.messageKey) ? t(c.messageKey) : c.messageKey} — ${String(Math.round(c.score))}`}
        </Text>
      ))}
    </>
  );
}
