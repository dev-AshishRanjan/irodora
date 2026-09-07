/**
 * The front door (F-146, F-164, FR-71).
 *
 * ## The audit, because this is the second rewrite
 *
 * F-146 replaced ten identical secondary buttons with three editorial sections. That was the
 * right direction and it was reported again as *"unprofessional, not organised… unattractive"*,
 * which is worth taking at face value. What was actually wrong:
 *
 * | | |
 * |---|---|
 * | **It never said what the product is for** | The wordmark reads *Irodora*, a name nobody knows, and the only sentence about the product sat at the FOOT in `xs` grey: *"The engine is running on this device."* Developer copy, in a footnote slot |
 * | **Three sections, identical in shape** | `Section` title, content; three times. The sameness moved from ten buttons to three blocks rather than leaving |
 * | **The hierarchy contradicted the content** | *Last reading* led unconditionally, so a new install opened on an EMPTY STATE with a second one under it. The first impression was two apologies and a footnote |
 * | **Boldness was spent twice** | The 140px samples, and a bare integer at `display.2` — the second-largest thing on the page was the number of garments |
 *
 * ## What it is now
 *
 * **The wordmark, then what the product does, in three fragments.** They are the brief's own
 * questions — *what colour is this, what goes with it, does it suit me* — and three short lines
 * is not a paragraph. Under them, the differentiator that was buried in the footer: all of it
 * happens on the phone.
 *
 * **Then a colour, at photographic scale, whichever one there is to show.** [`homeLead`](../home.ts)
 * decides: a person with readings gets theirs; a person with none gets today's corpus colour,
 * because the corpus is never empty and there is always a colour to lead with. Leading with an
 * absence was a choice, and it was the wrong one.
 *
 * **Then two quiet blocks** — the wardrobe as a strip, and whichever of the two colours did not
 * lead. Three different shapes, largest first, which is the rhythm the single column lacked.
 *
 * ## Where the boldness is spent
 *
 * On one colour, at size. `visual-taste` names that as the one place to spend it on this
 * product, and *a page with three bold moves has none* — so the wardrobe count is a label beside
 * its swatches rather than a number at `display.2`, and the footer is gone.
 *
 * ## What it does not decide
 *
 * Which colour appears anywhere, and which block leads. [`../home.ts`](../home.ts) works both out
 * and it is pure — so the rules are written where somebody can disagree with them rather than
 * buried in a render.
 */

import { useMemo } from 'react';
import { Pressable } from 'react-native';
import { Button, Row, Screen, Section, Stack, Swatch, Text, Wordmark } from '@irodora/ui';
import { entrySwatch, homeContent, homeLead } from '../home';
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
 * The size the LEADING colour is shown at.
 *
 * 180px, and it is the one bold move on the page. A swatch at 72 beside three lines of 13px type
 * — which is what this screen had before F-146 — makes the artefact the product exists to show
 * the smallest considered thing on it.
 *
 * `visual-taste`: *spend boldness in one place*, and here it is the colour. Everything below it
 * holds still.
 */
const LEAD_SAMPLE = 180;

/** The size a colour is shown at in a block that is not leading. Quiet, and still legible. */
const QUIET_SAMPLE = 96;

/** A wardrobe colour in the strip. Small enough to read as a set rather than as five things. */
const STRIP_SAMPLE = 40;

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
  const lead = homeLead(content);

  /** The reading block, at whichever size its position calls for. */
  const readingBlock = (size: number): React.JSX.Element | null =>
    content.lastReading === null ? null : (
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
          size={size}
        />
        <Stack gap="xs">
          <Text
            size={size === LEAD_SAMPLE ? 'display.2' : 'title'}
            color="foreground"
            script={script}
          >
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
    );

  /** Today's colour, likewise. Pressable at both sizes — it goes to the corpus entry. */
  const todayBlock = (size: number): React.JSX.Element | null =>
    content.today === null ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={content.today.entry.name.en}
        onPress={() => {
          if (content.today !== null) onOpenColour?.(content.today.entry.slug);
        }}
      >
        <Row gap="lg" align="start">
          <Swatch name={content.today.entry.name.en} {...entrySwatch(content.today)} size={size} />
          <Stack gap="xs">
            {/*
              The kanji leads, with the reading beneath it. That order is the corpus's own — the
              entry is a Japanese colour and its name is the Japanese one; the English is a gloss.
            */}
            <Text
              size={size === LEAD_SAMPLE ? 'display.2' : 'title'}
              color="foreground"
              script="japanese"
            >
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
    );

  return (
    <Screen script={script}>
      {/*
        THE PROPOSITION, and it is the whole of criterion 1.

        `display.1` — 72px, the top of the scale, and the token whose exemption named F-146. Then
        three fragments at `title`, which are the brief's own questions rather than a slogan
        somebody wrote: what colour is this, what goes with it, does it suit me.

        NO CLAIM ABOUT ACCURACY anywhere in it. A front door is where an overstatement would be
        least noticed and most damaging, and NFR-21's lint is binding here like everywhere else.
      */}
      <Stack gap="lg">
        <Wordmark size="display.1" script={script} heading />
        <Stack gap="xs">
          <Text size="title" color="foreground" script={script}>
            {t('home.what1')}
          </Text>
          <Text size="title" color="foreground" script={script}>
            {t('home.what2')}
          </Text>
          <Text size="title" color="foreground.2" script={script}>
            {t('home.what3')}
          </Text>
        </Stack>
        {/*
          MOVED UP OUT OF THE FOOTER. It was two lines of `xs` grey at the foot of the page,
          which is where a technical note goes — and it is not a technical note. Nothing else in
          this category can say it.
        */}
        <Text size="small" color="foreground.2" script={script}>
          {t('home.onDevice')}
        </Text>
      </Stack>

      {/* THE LEAD: one colour, at size. Whichever one there is. */}
      {lead === 'reading' ? (
        <Section title={t('home.lastReading')} script={script}>
          {readingBlock(LEAD_SAMPLE)}
        </Section>
      ) : lead === 'today' ? (
        <Section title={t('home.today')} script={script}>
          {todayBlock(LEAD_SAMPLE)}
          <Text size="xs" color="foreground.2" script={script}>
            {t('home.todayNote')}
          </Text>
        </Section>
      ) : null}

      {/*
        THE WARDROBE, as a strip.

        The count was a bare integer at `display.2` — the second-biggest thing on the page, spent
        on a number, while the colours it was about sat at 44px. It is a label beside its swatches
        now, which is what it always was.
      */}
      <Section title={t('home.wardrobe')} script={script}>
        {content.wardrobe.count === 0 ? (
          <Stack gap="md">
            <Text size="body" color="foreground.2" script={script}>
              {t('home.wardrobeEmpty')}
            </Text>
            <Button
              label={t('home.addGarment')}
              variant="secondary"
              onPress={() => {
                onAddGarment?.();
              }}
              script={script}
            />
          </Stack>
        ) : (
          <Stack gap="sm">
            <Row gap="sm" wrap>
              {content.wardrobe.colors.map((c) => (
                <Swatch
                  key={c.id}
                  name={c.name}
                  hex={c.hex}
                  color={colorOf(c)}
                  size={STRIP_SAMPLE}
                />
              ))}
            </Row>
            <Text size="label" color="foreground.2" script={script} numeric>
              {`${String(content.wardrobe.count)} ${t('home.wardrobeCount')}`}
            </Text>
          </Stack>
        )}
      </Section>

      {/*
        WHICHEVER COLOUR DID NOT LEAD, quietly. On a new install this is where the Lens is
        offered — one line and one action, rather than the two lines of grey it had: a person who
        has taken no readings does not need the mechanism explained twice.
      */}
      {lead === 'reading' ? (
        <Section title={t('home.today')} script={script}>
          {todayBlock(QUIET_SAMPLE)}
          <Text size="xs" color="foreground.2" script={script}>
            {t('home.todayNote')}
          </Text>
        </Section>
      ) : (
        <Section title={t('home.lastReading')} script={script}>
          <Stack gap="md">
            <Text size="body" color="foreground.2" script={script}>
              {t('home.noReadings')}
            </Text>
            <Button
              label={t('home.takeReading')}
              onPress={() => {
                onOpenLens?.();
              }}
              script={script}
            />
          </Stack>
        </Section>
      )}
    </Screen>
  );
}
