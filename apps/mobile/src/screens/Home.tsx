/**
 * The front door (F-146, FR-71).
 *
 * ## What it was
 *
 * A title, two swatches at 72px, three lines of grey text, and **ten identical secondary
 * buttons**. Boldness was spent nowhere, so the visual-taste pre-flight failed at its first
 * question: this screen could have been any product.
 *
 * F-145 gave those buttons a tab bar to be replaced by. **They are gone**: every destination is a
 * tab or lives inside one, and leaving the list would mean the tab bar had been added *beside*
 * the old navigation rather than instead of it.
 *
 * ## What it is
 *
 * The wordmark at `display.1` — 72px, the top of the scale, and the token whose exemption named
 * this feature. Then three blocks, in the order of what a person came for:
 *
 * 1. **The last reading**, at photographic scale on its neutral well.
 * 2. **The wardrobe** — a count, and the colours in it.
 * 3. **Today's colour** — one corpus entry, chosen by the date.
 *
 * ## Where the boldness is spent
 *
 * On the colours, at size. The visual-taste skill names that as the one place to spend it on this
 * product, and everything else here holds still: one type scale, one rule per section, no
 * accent, no card that is not a `Surface`.
 *
 * ## What it does not decide
 *
 * Which colour appears anywhere. [`../home.ts`](../home.ts) works that out, and it is pure — so
 * the rule for "today's colour" is written where somebody can disagree with it rather than
 * buried in a render.
 */

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button, Row, Screen, Section, Stack, Swatch, Text, Wordmark } from '@irodora/ui';
import { entrySwatch, homeContent, isFirstRun } from '../home';
import { colorOf } from '../wardrobe';
import { useMessages } from '../i18n/useMessages';
import type { SavedColorRow, StoredGarment } from '@irodora/store';

/** What this screen needs from the repository, and nothing else, so a test can supply it. */
export interface HomeStore {
  listColors(): readonly SavedColorRow[];
  listGarments(): readonly StoredGarment[];
}

export interface HomeProps {
  readonly store: HomeStore;
  /** Injected so a conformance subject can render a fixed day rather than the machine's. */
  readonly now?: () => number;
  /** Open the Lens. Supplied by the route; the tab bar is the other way there. */
  readonly onOpenLens?: () => void;
  /** Open the Atlas — specifically, today's colour. */
  readonly onOpenColour?: (slug: string) => void;
  /** Add a garment, from the first-run wardrobe block. */
  readonly onAddGarment?: () => void;
}

/**
 * The size a colour is shown at here.
 *
 * 140px rather than the 72 this screen used, and it is the single change that most decides
 * whether the page reads as a product or as a form. A swatch at 72 beside three lines of 13px
 * text makes the artefact the product exists to show the smallest considered thing on the screen.
 */
const SAMPLE = 140;

export function Home({
  store,
  now = () => Date.now(),
  onOpenLens,
  onOpenColour,
  onAddGarment,
}: HomeProps): React.JSX.Element {
  const { t, script } = useMessages();

  // The store is read once per render and the selection is pure, so this memo is about not
  // re-scanning the wardrobe on every re-render rather than about correctness.
  const content = useMemo(
    () => homeContent(store.listColors(), store.listGarments(), now()),
    [store, now],
  );
  const first = isFirstRun(content);

  return (
    <Screen script={script}>
      {/*
        `display.1`. The token has existed since F-003 and was declared unreached with the reason
        "no screen leads with a display size; every one of them opens at `title`". This is the
        screen that leads with one, and the declaration is gone.
      */}
      <Wordmark size="display.1" script={script} heading />

      {/* THE LAST READING. */}
      <Section title={t('home.lastReading')} script={script}>
        {content.lastReading === null ? (
          <Stack gap="lg">
            <Text size="body" color="foreground.2" script={script}>
              {t('home.noReadings')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t('home.noReadingsHint')}
            </Text>
            <Button
              label={t('home.takeReading')}
              onPress={() => {
                onOpenLens?.();
              }}
            />
          </Stack>
        ) : (
          <Row gap="lg" align="start">
            {/*
              The Swatch requires a `Color`, so a reading with no provenance cannot be drawn
              (ADR-0005). The row carries its own — `source` and `confidence` are NOT NULL columns
              precisely so this is always true.
            */}
            <Swatch
              name={content.lastReading.name}
              hex={content.lastReading.hex}
              color={colorOf(content.lastReading)}
              size={SAMPLE}
            />
            <Stack gap="xs">
              <Text size="title" color="foreground" script={script}>
                {content.lastReading.name}
              </Text>
              <Text size="small" color="foreground.2" numeric selectable>
                {content.lastReading.hex}
              </Text>
              {/*
                The source, always. A reading's origin is what makes it checkable, and hiding it
                behind a tap is what ADR-0005 and FR-24 exist to prevent.
              */}
              <Text size="xs" color="foreground.2" script={script}>
                {content.lastReading.source}
              </Text>
            </Stack>
          </Row>
        )}
      </Section>

      {/* THE WARDROBE. */}
      <Section title={t('home.wardrobe')} script={script}>
        {content.wardrobe.count === 0 ? (
          <Stack gap="lg">
            <Text size="body" color="foreground.2" script={script}>
              {t('home.wardrobeEmpty')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t('home.wardrobeEmptyHint')}
            </Text>
            <Button
              label={t('home.addGarment')}
              variant="secondary"
              onPress={() => {
                onAddGarment?.();
              }}
            />
          </Stack>
        ) : (
          <Stack gap="md">
            <Text size="display.2" color="foreground" numeric>
              {String(content.wardrobe.count)}
            </Text>
            <Text size="label" color="foreground.2" script={script}>
              {t('home.wardrobeCount')}
            </Text>
            <Row gap="sm" wrap>
              {content.wardrobe.colors.map((c) => (
                <Swatch key={c.id} name={c.name} hex={c.hex} color={colorOf(c)} size={44} />
              ))}
            </Row>
          </Stack>
        )}
      </Section>

      {/* TODAY. Always present — the corpus always has 120 entries. */}
      {content.today === null ? null : (
        <Section title={t('home.today')} script={script}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={content.today.entry.name.en}
            onPress={() => {
              if (content.today !== null) onOpenColour?.(content.today.entry.slug);
            }}
          >
            <Row gap="lg" align="start">
              <Swatch
                name={content.today.entry.name.en}
                {...entrySwatch(content.today)}
                size={SAMPLE}
              />
              <Stack gap="xs">
                {/*
                  The kanji leads, with the reading beneath it. That order is the corpus's own —
                  the entry is a Japanese colour and its name is the Japanese one; the English is
                  a gloss.
                */}
                <Text size="title" color="foreground" script="japanese">
                  {content.today.entry.name.kanji}
                </Text>
                <Text size="small" color="foreground.2" script="japanese">
                  {content.today.entry.name.kana}
                </Text>
                <Text size="small" color="foreground.2" script={script}>
                  {content.today.entry.name.en}
                </Text>
              </Stack>
            </Row>
          </Pressable>
          {/*
            SAYS WHAT IT IS. Not "chosen for you", not "recommended" — a rotation by date, and
            the note says so. The claims lint is binding here and a front door is where an
            overstatement would be least noticed.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t('home.todayNote')}
          </Text>
        </Section>
      )}

      {/*
        The one statement that was the old `home.title`: "The engine is running on this device."
        It sits at the foot as the sentence it always was, rather than at the top in a title slot
        because that was the only slot there was.
      */}
      <View style={{ paddingTop: first ? nativeSpacing.xl2 : nativeSpacing.lg }}>
        <Text size="xs" color="foreground.2" script={script}>
          {t('home.title')}
        </Text>
        <Text size="xs" color="foreground.2" script={script}>
          {t('home.offline')}
        </Text>
      </View>
    </Screen>
  );
}
