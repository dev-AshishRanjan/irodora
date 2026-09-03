/**
 * A colour as a card (FR-50).
 *
 * ## The card is a document, and this file only displays it
 *
 * `cardSvg` in [`../card.ts`](../card.ts) builds the SVG, and it is the artefact the criterion
 * is about: the same entry at the same corpus version produces the same string on both
 * platforms. This screen renders that string and adds nothing to it — no colour, no text, no
 * layout decision that could differ between the card people see and the card they would send.
 *
 * ## The thumbnail is shown, not asserted about elsewhere
 *
 * *"Must read at thumbnail size"* is the design brief's requirement, and the arithmetic behind
 * it is checked in `card.test.ts`. Showing the same document at that size, beside the full one,
 * is what lets a person disagree with the arithmetic — which is worth more than a passing test
 * nobody can see.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { SvgXml } from 'react-native-svg';
import { Screen, Stack, Surface, Text, useTheme } from '@irodora/ui';
import { cardSvg, CARD_HEIGHT, CARD_WIDTH, THUMBNAIL_WIDTH } from '../card';
import { CORPUS_LABEL, entryBySlug } from '../corpus';
// The SAME map the detail screen uses. Two copies of the FR-23 vocabulary would drift, and the
// one that drifts would be the one on the artefact that leaves the app.
import { CLASSIFICATION_KEYS } from './ColourDetail';
import { useMessages } from '../i18n/useMessages';

/** How wide the full card is drawn. The document's own aspect does the rest. */
const DISPLAY_WIDTH = 320;

export interface ColourCardProps {
  readonly slug: string;
}

export function ColourCard({ slug }: ColourCardProps): React.JSX.Element {
  const { colors, name } = useTheme();
  const { t, script } = useMessages();
  const entry = entryBySlug(slug);

  if (entry === null)
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: nativeSpacing.xl }}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </View>
    );

  /*
   * The card is drawn in the ACTIVE theme, so the thing a person shares matches the thing they
   * were looking at. `useTheme` is the single source for that (F-017's defect was a screen
   * deciding its own theme, which made it uncheckable in the other one).
   */
  const svg = cardSvg(entry, {
    theme: name,
    corpusVersion: CORPUS_LABEL,
    labels: {
      // The entry's OWN classification, never a word chosen here. FR-23 travels with the card
      // because the card is the artefact most likely to be read with none of its context.
      classification: t(CLASSIFICATION_KEYS[entry.entry.classification]),
      attribution: t('card.attribution'),
    },
  });

  const ratio = CARD_HEIGHT / CARD_WIDTH;

  return (
    <Screen title={t('card.title')} script={script}>
      <SvgXml xml={svg} width={DISPLAY_WIDTH} height={DISPLAY_WIDTH * ratio} />

      <Surface level="1" padding="md">
        <Stack gap="sm">
          <Text size="label" color="foreground.2" script={script} heading>
            {t('card.thumbnail')}
          </Text>
          {/*
            THE SAME DOCUMENT, at the size a chat preview gives it. Shown rather than described,
            so a person can disagree with the arithmetic in card.test.ts instead of taking it.
          */}
          <SvgXml xml={svg} width={THUMBNAIL_WIDTH} height={THUMBNAIL_WIDTH * ratio} />
        </Stack>
      </Surface>

      <Text size="small" color="foreground.2" script={script}>
        {t('card.note')}
      </Text>
      {/*
        Said rather than left to be discovered. Getting the card out as a file is FR-51, which
        is R5 — a boundary, not an omission.
      */}
      <Text size="xs" color="foreground.2" script={script}>
        {t('card.export')}
      </Text>
    </Screen>
  );
}
