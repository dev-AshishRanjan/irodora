/**
 * Colour Finder — one field, and the app saying which question it answered (FR-47).
 *
 * ## Saying which question it answered is the feature, not the polish
 *
 * A single field that routes between three kinds of search will sometimes route differently
 * from what the person meant: `beaded` is a word and also a valid hex. A screen that silently
 * picked one leaves them staring at results that look wrong for no visible reason. So every
 * answer is labelled with the question it answered, and a phrase answer additionally shows the
 * **region** the words resolved to and the **vocabulary version** that resolved them.
 *
 * That last one is FR-10's habit applied to search: an answer that cannot say what produced it
 * cannot be reproduced after the vocabulary moves.
 *
 * ## The results do not move (F-151)
 *
 * Two things used to shift them. The answer line was a small grey sentence before a query and a
 * heading after it — two heights in the slot everything below depends on — so the list jumped on
 * the first keystroke, under the thumb that had just typed it. And the region panel appears for a
 * phrase answer and nothing else, so one more word could make forty rows slide up the screen.
 *
 * The line is now the same line in every state, and the region moved BELOW the results, where it
 * reads better anyway: it is provenance, and provenance goes with the answer rather than in
 * front of it.
 *
 * ## Nothing here searches
 *
 * `find()` in [`../finder.ts`](../finder.ts) does all of it, and is tested without rendering
 * anything. This file formats. It does not know what a hex looks like, what a term is, or how
 * ΔE00 is computed.
 */

import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { Row, Screen, SearchField, Stack, Surface, Swatch, Text } from '@irodora/ui';
import { LEXICON_AXES, type LexiconAxis } from '@irodora/corpus';
import { find, type FinderKind } from '../finder';
import { colorFor, type PublishedEntry } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Answer kind → the sentence that names it. Total, so a fourth kind is a compile error. */
const ANSWERED: Readonly<Record<Exclude<FinderKind, 'empty'>, MessageKey>> = {
  hex: 'finder.answered.hex',
  phrase: 'finder.answered.phrase',
  name: 'finder.answered.name',
};

/** Answer kind → the hint shown when it found nothing. Each says something different. */
const NOTHING: Readonly<Record<Exclude<FinderKind, 'empty'>, MessageKey>> = {
  hex: 'finder.noneHexHint',
  phrase: 'finder.nonePhraseHint',
  name: 'finder.noneNameHint',
};

/** Axis → its label. Reused from the Atlas's filters, so one word has one name. */
const AXIS_KEYS: Readonly<Record<LexiconAxis, MessageKey>> = {
  lightness: 'filter.lightness',
  chroma: 'filter.chroma',
  hue: 'axis.hue',
};

/** How many results a list shows before it stops. A phrase can match most of the corpus. */
const LIST_LIMIT = 40;

export interface FinderProps {
  /** Open a colour. Supplied by the route; absent in the conformance suite. */
  readonly onOpenColour?: (slug: string) => void;
  /** A query to open on, so a test or a deep link can start on a known answer. */
  readonly initialQuery?: string;
}

export function Finder({ onOpenColour, initialQuery }: FinderProps = {}): React.JSX.Element {
  const { t, script } = useMessages();
  const [query, setQuery] = useState(initialQuery ?? '');

  // Recomputed only when the query changes. `find` is a filter over 120 entries plus, for a
  // hex, a bounded two-stage search — cheap, but not cheap enough to redo on every re-render.
  const result = useMemo(() => find(query), [query]);
  const shown = result.entries.slice(0, LIST_LIMIT);

  function ResultRow({ entry, distance }: { entry: PublishedEntry; distance?: number }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.entry.name.kanji} ${entry.entry.name.en}`}
        onPress={() => {
          onOpenColour?.(entry.entry.slug);
        }}
        style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
      >
        <Row gap="md" padY="sm">
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            size={40}
          />
          <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
            <Text size="body" color="foreground" script={script}>
              {`${entry.entry.name.kanji} ${entry.entry.name.en}`}
            </Text>
            <Text size="small" color="foreground.2" numeric selectable>
              {entry.derived.hex}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          {/*
            The distance, on a hex answer only. It is the thing that makes "nearest" a claim a
            reader can check rather than an ordering they have to trust — and it carries its
            unit, like every other number in this app (FR-48).
          */}
          {distance === undefined ? null : (
            <View style={{ alignItems: 'flex-end' }}>
              <Text size="small" color="foreground" numeric selectable>
                {distance.toFixed(2)}
              </Text>
              <Text size="xs" color="foreground.2" script={script}>
                {t('unit.deltaE00')}
              </Text>
            </View>
          )}
        </Row>
      </Pressable>
    );
  }

  return (
    <Screen title={t('finder.title')} script={script}>
      <SearchField label={t('finder.search')} value={query} onChangeText={setQuery} />
      <Text size="xs" color="foreground.2" script={script}>
        {t('finder.hint')}
      </Text>

      {/*
        WHICH QUESTION WAS ANSWERED — ONE LINE, ALWAYS (F-151).

        A single field that routes three ways will sometimes route differently from what the
        person meant, and this is the difference between "these results are wrong" and "ah, it
        read that as a hex".

        It is now the SAME line in every state, including the empty one. It used to be a small
        grey sentence before a query and a heading after it, which is two different heights in
        the one slot everything below depends on — so the results moved on the first keystroke,
        under the thumb that had just typed it.
      */}
      <Text size="body" color="foreground" script={script} heading>
        {result.kind === 'empty' ? t('finder.empty') : t(ANSWERED[result.kind])}
      </Text>

      {result.kind === 'empty' ? null : (
        <>
          {shown.length === 0 ? (
            <Stack gap="xs">
              <Text size="small" color="foreground" script={script}>
                {t('finder.none')}
              </Text>
              <Text size="xs" color="foreground.2" script={script}>
                {t(NOTHING[result.kind])}
              </Text>
            </Stack>
          ) : (
            <Surface level="1" padding="md">
              <View>
                <Text size="xs" color="foreground.2" script={script}>
                  {`${t('atlas.showing')} ${String(shown.length)} / ${String(result.entries.length)}`}
                </Text>
                {shown.map((entry, i) => (
                  <ResultRow
                    key={entry.entry.slug}
                    entry={entry}
                    {...(result.distances === undefined
                      ? {}
                      : { distance: result.distances[i] ?? 0 })}
                  />
                ))}
              </View>
            </Surface>
          )}

          {/*
            THE REGION, AFTER THE RESULTS AND NOT BEFORE THEM.

            This panel appears for a phrase answer and for nothing else, so above the list it was
            the layout jump: type one more word, the words stop resolving, the panel vanishes and
            forty rows slide up the screen.

            Below, it costs nothing and reads better — it is PROVENANCE, and provenance in this
            product goes with the answer rather than in front of it. The vocabulary version is
            here for FR-10's reason: an answer that cannot say what produced it cannot be
            reproduced once the lexicon moves.
          */}
          {result.region === undefined ? null : (
            <Surface level="1" padding="md">
              <Stack gap="xs">
                <Text size="label" color="foreground.2" script={script} heading>
                  {t('finder.region')}
                </Text>
                {LEXICON_AXES.map((axis) => {
                  const range = result.region?.[axis];
                  if (range === undefined) return null;
                  return (
                    <Row key={axis} gap="sm" align="baseline">
                      <Text size="small" color="foreground.2" script={script}>
                        {t(AXIS_KEYS[axis])}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text size="small" color="foreground" numeric selectable>
                        {`${range.min.toFixed(axis === 'hue' ? 0 : 3)} – ${range.max.toFixed(axis === 'hue' ? 0 : 3)}`}
                      </Text>
                      <Text size="xs" color="foreground.2" script={script}>
                        {t('space.oklch')}
                      </Text>
                    </Row>
                  );
                })}
                <Text size="xs" color="foreground.2" script={script}>
                  {`${t('finder.vocabulary')} ${result.lexiconVersion ?? ''}`}
                </Text>
              </Stack>
            </Surface>
          )}
        </>
      )}
    </Screen>
  );
}
