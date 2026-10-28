/**
 * Colour Finder — mockup `09` (F-250): a query, the three perceptual dimensions of a search point, and
 * the nearest corpus colours ranked by ΔE00 from it (FR-47).
 *
 * ## A query names a set and sets a point (ADR-0158)
 *
 * What a person types is read as a hex, a phrase or a name (`find()`), or the way they chose with a
 * chip (`findAs()`). It names a set — the whole corpus for a hex, the region for a phrase, the matches
 * for a name — and sets the point the three sliders show: the hex's own, the set's medoid, or the
 * corpus medoid while the field is empty. The sliders move that point; the cards are the set ranked by
 * ΔE00 from it, recomputed in the render that makes the change — `09`'s *Instantaneous*. The point is
 * a search target: never drawn as a colour, never called a measurement (rule 11).
 *
 * ## Saying which question it answered is still the feature (F-151)
 *
 * A single field that routes three ways will sometimes route differently from what a person meant:
 * `beaded` is a word and also a hex. The chips say which reading is in effect — the one `find()` made,
 * or the one the person chose — so results that look wrong carry their reason on the screen, and a
 * tap reads the text the other way (ADR-0160 D1).
 *
 * ## Nothing here searches or ranks
 *
 * `finder-readout.ts` holds the state and computes every figure and word; `finder.ts` searches and
 * ranks through the corpus's one index. This file composes `09` and formats nothing of its own.
 */

import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import {
  Appear,
  Arrival,
  Card,
  ChoiceGroup,
  EmptyState,
  Illustration,
  Screen,
  SearchField,
  Slider,
  Stack,
  Swatch,
  Text,
  type Sample,
} from '@irodora/ui';
import { colorFor } from '../corpus';
import type { NearestEntry, Reading } from '../finder';
import {
  answerOf,
  AXES,
  AXIS_LABEL_KEYS,
  AXIS_NAME_KEYS,
  BACK_GLYPH_09,
  choose,
  CLEAR_GLYPH,
  cleared,
  clearedText,
  FINDER_APP_BAR,
  FINDER_ART,
  MODE_CHIP,
  MODE_KEYS,
  moved,
  QUERY_CLEAR_GLYPH,
  READINGS,
  readingInEffect,
  RESULT_HEIGHT,
  resultLines,
  SLIDER_RANGE,
  sliderReadings,
  start,
  typed,
  type FinderState,
} from '../finder-readout';
import { japaneseRun } from '../i18n';
import { useMessages } from '../i18n/useMessages';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: the set a
 * query names is empty, or the reading chosen cannot read the text — `00`'s caption with its hint.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/** Words laid over a sample are read by the sample's own name, once (F-248's tile form). */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

export interface FinderProps {
  /** A query to open on, so a test or a deep link can start on a known answer. */
  readonly initialQuery?: string;
  /** A reading chosen at the start, as if its chip had been tapped. */
  readonly initialReading?: Reading;
  /** Back to the Atlas. Absent in the conformance suite, and then no back is drawn. */
  readonly onBack?: () => void;
  /** Open a colour. Supplied by the route; absent, a card is an image rather than a control. */
  readonly onOpenColour?: (slug: string) => void;
}

export function Finder({
  initialQuery,
  initialReading,
  onBack,
  onOpenColour,
}: FinderProps = {}): React.JSX.Element {
  const { t, locale, script } = useMessages();
  const [state, setState] = useState<FinderState>(() => {
    const opened = initialQuery === undefined ? start() : typed(start(), initialQuery);
    return initialReading === undefined ? opened : choose(opened, initialReading);
  });

  // Recomputed on every change — a keystroke, a chip, a slider tick — in the render that makes it.
  const answer = useMemo(() => answerOf(state), [state]);
  const readings = useMemo(() => sliderReadings(state.point, locale, t), [state.point, locale, t]);
  const reading = readingInEffect(state);

  const header = (
    <View>
      {/*
        THE ART LAYER, first and behind everything (F-247's lesson; ADR-0161 D6): `09`'s leaves on the
        ground, under the opaque cards, clipped at the list's top — no word sits on a stroke.
      */}
      <View
        pointerEvents="none"
        testID="finder.art"
        style={{
          position: 'absolute',
          top: -nativeSpacing.lg,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', ...FINDER_ART }}>
          <Illustration
            name="leaves"
            tone="backdrop"
            color="foreground"
            width={FINDER_ART.width}
            testID="finder.art.leaves"
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: nativeSpacing.md }}>
        {/* `09.search`: the field and its clear, then the chips; md at the sides, lg under the chips. */}
        <Card level="1" radius="sm" padding="sm" testID="finder.search">
          <View
            testID="finder.search.body"
            style={{ paddingHorizontal: nativeSpacing.sm, paddingBottom: nativeSpacing.md }}
          >
            <SearchField
              bare
              label={t('finder.search')}
              value={state.text}
              onChangeText={(text) => {
                setState((s) => typed(s, text));
              }}
              size="body"
              autoCorrect={false}
              autoCapitalize="none"
              testID="finder.search.query"
              clear={{
                label: t('finder.queryClear'),
                size: QUERY_CLEAR_GLYPH,
                onPress: () => {
                  setState((s) => clearedText(s));
                },
                testID: 'finder.search.clear',
              }}
            />
            <View style={{ marginTop: nativeSpacing.sm }}>
              <ChoiceGroup
                label={t('finder.readAs')}
                value={reading}
                options={READINGS.map((r) => ({ value: r, label: t(MODE_KEYS[r]) }))}
                onChange={(r) => {
                  if (r !== null) setState((s) => choose(s, r));
                }}
                pills={{
                  height: MODE_CHIP,
                  gap: 'sm',
                  restFill: 'surface.3',
                  selectedFill: 'surface.3',
                  radius: 'md',
                }}
                script={script}
                testID="finder.modes"
              />
            </View>
          </View>
        </Card>

        <View style={{ marginTop: nativeSpacing.md }}>
          <Text
            size="body"
            weight={500}
            color="foreground"
            heading
            script={script}
            testID="finder.dimensions"
          >
            {t('finder.dimensions')}
          </Text>
        </View>

        {/* The title → the card: drawn tighter than the scale, named `xs` (ADR-0161 D1). */}
        <View style={{ marginTop: nativeSpacing.xs }}>
          <Card level="1" radius="sm" padding="sm" testID="finder.sliders">
            <View
              testID="finder.sliders.body"
              style={{ paddingTop: nativeSpacing.md, paddingBottom: nativeSpacing.sm }}
            >
              <Stack gap="md">
                {AXES.map((axis, i) => (
                  <Slider
                    key={axis}
                    layout="row"
                    label={t(AXIS_LABEL_KEYS[axis])}
                    name={t(AXIS_NAME_KEYS[axis])}
                    value={state.point[i] ?? 0}
                    min={SLIDER_RANGE[axis].min}
                    max={SLIDER_RANGE[axis].max}
                    step={SLIDER_RANGE[axis].step}
                    valueLabel={readings[axis].text}
                    valueName={readings[axis].spoken}
                    valueColor="foreground.2"
                    onValueChange={(v) => {
                      setState((s) => moved(s, axis, v));
                    }}
                    script={script}
                    testID={`finder.sliders.${axis}`}
                  />
                ))}
              </Stack>
            </View>
          </Card>
        </View>

        <View style={{ marginTop: nativeSpacing.md, marginBottom: nativeSpacing.xs }}>
          <Text
            size="body"
            weight={500}
            color="foreground"
            heading
            script={script}
            testID="finder.nearest"
          >
            {t('finder.nearest')}
          </Text>
        </View>
      </View>
    </View>
  );

  function ResultCard({ item, index }: { item: NearestEntry; index: number }): React.JSX.Element {
    const { entry } = item;
    const lines = resultLines(item, index, t);
    const sample: Sample = { hex: entry.derived.hex, color: colorFor(entry.entry) };
    const id = `finder.result.${String(index)}`;
    return (
      <View style={{ flex: 1, minHeight: RESULT_HEIGHT }} testID={id}>
        {/*
          THE CARD IS THE SAMPLE (R9 §5; ADR-0161 D2): the colour, with its words on it in the one ink
          that clears 4.5:1 against it (C8, ADR-0116). One stop for a screen reader — the sample's own
          name and provenance — with the words hidden beneath it (ADR-0160 D5).
        */}
        <Swatch
          name={lines.spoken}
          hex={entry.derived.hex}
          color={sample.color}
          width="fill"
          height="fill"
          corner="md"
          keyline={false}
          group={false}
          testID={`${id}.open`}
          {...(onOpenColour === undefined
            ? {}
            : {
                onPress: () => {
                  onOpenColour(entry.entry.slug);
                },
              })}
        >
          <View
            pointerEvents="none"
            style={{
              flexGrow: 1,
              paddingVertical: nativeSpacing.sm,
              paddingHorizontal: nativeSpacing.md,
              gap: nativeSpacing.xs,
            }}
            {...HIDDEN}
          >
            <Text
              size="body"
              weight={500}
              face="gothic"
              on={sample}
              script={script}
              testID={`${id}.name`}
            >
              {lines.name}
            </Text>
            <Text size="body" on={sample} testID={`${id}.english`}>
              {lines.english}
            </Text>
            <Text size="label" on={sample} numeric selectable testID={`${id}.distance`}>
              {lines.distance}
            </Text>
            {lines.oklch === undefined ? null : (
              <Text size="label" on={sample} numeric selectable testID={`${id}.oklch`}>
                {lines.oklch}
              </Text>
            )}
          </View>
        </Swatch>
      </View>
    );
  }

  return (
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        height: FINDER_APP_BAR,
        inset: nativeSpacing.md,
        gap: nativeSpacing.sm,
        script,
        ...(onBack === undefined
          ? {}
          : {
              back: {
                glyph: 'back' as const,
                label: t('tab.atlas'),
                name: t('detail.backToAtlas'),
                size: BACK_GLYPH_09,
                onPress: onBack,
              },
            }),
        title: {
          text: t('finder.title'),
          // The run repeats 検索 in Japanese, so it is drawn in English only (ADR-0159 D5).
          ...(script === 'japanese' ? {} : { ja: japaneseRun('finder.title') }),
          align: 'centre',
          placement: 'bar',
          layout: 'inline',
          size: 'body',
          weight: 600,
        },
        trailing: {
          button: {
            variant: 'plain',
            glyph: 'close',
            glyphSize: CLEAR_GLYPH,
            label: t('finder.clear'),
            name: t('finder.clearName'),
            step: 'body',
            script,
            onPress: () => {
              setState(cleared());
            },
            testID: 'finder.clear',
          },
        },
      }}
    >
      {/*
        A LIST ARRIVES ONCE (F-266, ADR-0133 §7): the first answer's cards stagger in; a card a later
        change brings is simply there. The scope draws no view, so the list's `flex: 1` is untouched.
      */}
      <Arrival>
        <FlatList
          data={answer.results}
          numColumns={2}
          keyExtractor={(item) => item.entry.entry.slug}
          // An ELEMENT, never a component type: a new type each render would remount the field.
          ListHeaderComponent={header}
          ListEmptyComponent={
            // 00's empty (F-236): what would change it is the field above (ADR-0160 D8).
            <View style={{ paddingHorizontal: nativeSpacing.md }}>
              <EmptyState
                message={t('finder.none')}
                {...(answer.hint === undefined ? {} : { hint: t(answer.hint) })}
                resolvedHere
                script={script}
              />
            </View>
          }
          columnWrapperStyle={{ paddingHorizontal: nativeSpacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: nativeSpacing.sm }} />}
          renderItem={({ item, index }) => (
            // TWO TO A ROW, `sm` APART: each cell padded `xs` on its inner side; a row is one height.
            <View
              style={{
                flex: 1,
                maxWidth: '50%',
                ...(index % 2 === 0
                  ? { paddingRight: nativeSpacing.xs }
                  : { paddingLeft: nativeSpacing.xs }),
              }}
            >
              <Appear index={index} fill>
                <ResultCard item={item} index={index} />
              </Appear>
            </View>
          )}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: nativeSpacing.lg, paddingBottom: nativeSpacing.md }}
          showsVerticalScrollIndicator={false}
        />
      </Arrival>
    </Screen>
  );
}
