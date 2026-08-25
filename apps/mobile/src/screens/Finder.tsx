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
 * ## Nothing here searches
 *
 * `find()` in [`../finder.ts`](../finder.ts) does all of it, and is tested without rendering
 * anything. This file formats. It does not know what a hex looks like, what a term is, or how
 * ΔE00 is computed.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { SearchField, Surface, Swatch, Text, useTheme } from '@irodora/ui';
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
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const [query, setQuery] = useState(initialQuery ?? '');

  // Recomputed only when the query changes. `find` is a filter over 120 entries plus, for a
  // hex, a bounded two-stage search — cheap, but not cheap enough to redo on every re-render.
  const result = useMemo(() => find(query), [query]);
  const shown = result.entries.slice(0, LIST_LIMIT);

  function Row({ entry, distance }: { entry: PublishedEntry; distance?: number }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.entry.name.kanji} ${entry.entry.name.en}`}
        onPress={() => {
          onOpenColour?.(entry.entry.slug);
        }}
        style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 6 }}>
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            size={40}
          />
          <View style={{ gap: 2, flexShrink: 1 }}>
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
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('finder.title')}
      </Text>

      <SearchField label={t('finder.search')} value={query} onChangeText={setQuery} />
      <Text size="xs" color="foreground.2" script={script}>
        {t('finder.hint')}
      </Text>

      {result.kind === 'empty' ? (
        <Text size="small" color="foreground.2" script={script}>
          {t('finder.empty')}
        </Text>
      ) : (
        <>
          {/*
            WHICH QUESTION WAS ANSWERED. A single field that routes three ways will sometimes
            route differently from what the person meant, and this is the difference between
            "these results are wrong" and "ah, it read that as a hex".
          */}
          <Text size="body" color="foreground" script={script} heading>
            {t(ANSWERED[result.kind])}
          </Text>

          {result.region === undefined ? null : (
            <Surface level="1" padding={12}>
              <View style={{ gap: 4 }}>
                <Text size="label" color="foreground.2" script={script} heading>
                  {t('finder.region')}
                </Text>
                {LEXICON_AXES.map((axis) => {
                  const range = result.region?.[axis];
                  if (range === undefined) return null;
                  return (
                    <View
                      key={axis}
                      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
                    >
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
                    </View>
                  );
                })}
                {/*
                  The vocabulary that produced this answer. Without it the region is a number
                  nobody can reproduce once the lexicon moves.
                */}
                <Text size="xs" color="foreground.2" script={script}>
                  {`${t('finder.vocabulary')} ${result.lexiconVersion ?? ''}`}
                </Text>
              </View>
            </Surface>
          )}

          {shown.length === 0 ? (
            <View style={{ gap: 4 }}>
              <Text size="small" color="foreground" script={script}>
                {t('finder.none')}
              </Text>
              <Text size="xs" color="foreground.2" script={script}>
                {t(NOTHING[result.kind])}
              </Text>
            </View>
          ) : (
            <Surface level="1" padding={12}>
              <View>
                <Text size="xs" color="foreground.2" script={script}>
                  {`${t('atlas.showing')} ${String(shown.length)} / ${String(result.entries.length)}`}
                </Text>
                {shown.map((entry, i) => (
                  <Row
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
        </>
      )}
    </ScrollView>
  );
}
