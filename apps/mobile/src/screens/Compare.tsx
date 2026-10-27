/**
 * Mockup `08`: two colours and every number that separates them (FR-48, F-249).
 *
 * ## What it draws, top to bottom
 *
 * - The app bar: back to the Atlas, *Colour Compare • 比較* centred, the download glyph, a rule.
 * - The pair card: two samples **drawn apart**, as `08` draws them, a 1 dp seam the card's whole
 *   height between them ([ADR-0154](../../../../docs/adr/0154-08s-compare-samples-are-drawn-apart-as-08-draws-them.md)).
 *   Under each sample its kanji and romaji, its hex and OKLCh, and *Change A* / *Change B*.
 * - Two cards side by side: the distance table and the contrast and colour-vision table, each the
 *   ruled `ReadoutTable` (`compare-readout.ts` decides every figure and word, ADR-0155).
 * - The pinned bar: *Export Precision Delta PDF* and *Add Pair to Palette Studio*.
 * - `08`'s plum branch, behind everything, under the opaque cards (ADR-0157 D5).
 *
 * ## Nothing here is computed
 *
 * `compare()` assembles the numbers and `pairReadout` prints them; the screen lays them out. A number
 * this screen shows is reachable by a test that never renders anything.
 *
 * ## Two colours, always two
 *
 * The pair opens on `?a` (or the corpus's first entry) against the last (ADR-0156 D1). *Change A* and
 * *Change B* open `03`'s floating sheet over the Finder's own query, the other slot's colour left out,
 * so the page can never compare a colour with itself.
 *
 * ## An absent handler is an absent control
 *
 * A route passes what it can do; a conformance subject or a test passes what it needs to fire.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import {
  Button,
  Card,
  EmptyState,
  Illustration,
  ReadoutTable,
  Row,
  Screen,
  SearchField,
  Sheet,
  Stack,
  Swatch,
  swatchAccessibleName,
  Text,
  useTheme,
  type Action,
} from '@irodora/ui';
import {
  ACTION,
  BACK_GLYPH,
  CHANGE,
  COMPARE_APP_BAR,
  COMPARE_ART,
  EXPORT_GLYPH,
  choose,
  initialPair,
  nameLine,
  pairReadout,
  pairSampleSize,
  pickList,
  SEAM,
  type PairState,
  type Side,
} from '../compare-readout';
import { colorFor, entryBySlug, type PublishedEntry } from '../corpus';
import { japaneseRun } from '../i18n';
import { useMessages } from '../i18n/useMessages';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: the route's
 * `?a` names a colour this corpus does not hold, or the chooser's query matches no colour — each
 * `00`'s caption, its fix on the screen (the back, the field).
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

export interface CompareProps {
  /** `?a`: the colour the page opens on. Unknown to the corpus, the page is the absent state. */
  readonly initialA?: string;
  /** B, for a test or a subject that opens on a known pair; never A. */
  readonly initialB?: string;
  /** A slot whose sheet starts open: a test reaches the chooser with it. */
  readonly initialPicking?: Side;
  /** What the open sheet's field starts with. */
  readonly initialQuery?: string;
  /** `08.back`: to the Atlas. */
  readonly onBack?: () => void;
  /** `08.export`: the pair to Export, every format (ADR-0156 D3). */
  readonly onExport?: (a: string, b: string) => void;
  /** `08.actions.pdf`: the pair to Export, PDF chosen (D4). */
  readonly onExportPdf?: (a: string, b: string) => void;
  /** `08.actions.studio`: the pair to the Studio as a draft (D5). */
  readonly onAddToStudio?: (a: string, b: string) => void;
}

export function Compare({
  initialA,
  initialB,
  initialPicking,
  initialQuery = '',
  onBack,
  onExport,
  onExportPdf,
  onAddToStudio,
}: CompareProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const { t, locale, script } = useMessages();
  const { width } = useWindowDimensions();
  const [pair, setPair] = useState<PairState | null>(() => {
    const opened = initialPair(initialA);
    return opened === null || initialB === undefined ? opened : choose(opened, 'b', initialB);
  });
  const [picking, setPicking] = useState<Side | null>(initialPicking ?? null);
  const [query, setQuery] = useState(initialQuery);

  const a = pair === null ? null : entryBySlug(pair.a);
  const b = pair === null ? null : entryBySlug(pair.b);
  const readout = useMemo(
    () => (a === null || b === null ? null : pairReadout(a, b, t, locale, script)),
    [a, b, t, locale, script],
  );

  const back =
    onBack === undefined
      ? {}
      : {
          back: {
            glyph: 'back' as const,
            label: t('tab.atlas'),
            name: t('detail.backToAtlas'),
            size: BACK_GLYPH,
            weight: 500 as const,
            onPress: onBack,
          },
        };
  const bar = {
    height: COMPARE_APP_BAR,
    inset: nativeSpacing.md,
    gap: nativeSpacing.sm,
    rule: true,
    script,
  };

  if (pair === null || a === null || b === null || readout === null)
    return (
      /*
        A COLOUR THIS CORPUS DOES NOT HOLD (F-236, E4, ADR-0128 §6): 00's caption under the app bar,
        whose back is the way out — a second control would be a second way to do one thing.
      */
      <Screen scroll={false} bleed script={script} appBar={{ ...bar, ...back }}>
        <View style={{ padding: nativeSpacing.md }}>
          <EmptyState message={t('detail.notFound')} resolvedHere script={script} />
        </View>
      </Screen>
    );

  const sampleSize = pairSampleSize(width);
  const actions: Action[] = [
    ...(onExportPdf === undefined
      ? []
      : [
          {
            label: t('compare.exportPdf'),
            height: ACTION,
            radius: 'sm' as const,
            step: 'caption' as const,
            script,
            onPress: () => {
              onExportPdf(pair.a, pair.b);
            },
          },
        ]),
    ...(onAddToStudio === undefined
      ? []
      : [
          {
            variant: 'secondary' as const,
            edge: 'border' as const,
            fill: 'surface.1' as const,
            weight: 500 as const,
            label: t('compare.addToStudio'),
            height: ACTION,
            radius: 'sm' as const,
            step: 'caption' as const,
            script,
            onPress: () => {
              onAddToStudio(pair.a, pair.b);
            },
          },
        ]),
  ];
  const [first, second] = actions;

  /** One half of the pair card: the sample, its name and meta, and its Change. */
  function half(side: Side, entry: PublishedEntry): React.JSX.Element {
    const name = readout?.names[side] ?? '';
    const changeLabel = t(side === 'a' ? 'compare.changeA' : 'compare.changeB');
    return (
      <View
        style={{
          flex: 1,
          paddingVertical: nativeSpacing.sm,
          ...(side === 'a'
            ? { paddingLeft: nativeSpacing.sm }
            : { paddingRight: nativeSpacing.sm }),
        }}
      >
        <Stack gap="sm">
          {/*
            THE SAMPLE, ALONE IN ITS NODE (E-224's lesson): no control sits inside an accessible
            sample. `08` draws no keyline, so it carries the line only where it would lose its edge.
          */}
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            size={sampleSize}
            corner="sm"
            keyline={false}
            // Apart from its children (it has none): an IMAGE named with its provenance, never a button —
            // the sample does nothing (F-249's review, S5; F-248 S4's form).
            group={false}
            testID={`compare.${side}.swatch`}
          />
          <Stack gap="xs">
            <Text size="label" color="foreground" script={script} testID={`compare.${side}.name`}>
              {name}
            </Text>
            <Text
              size="caption"
              color="foreground.2"
              numeric
              selectable
              testID={`compare.${side}.meta`}
            >
              {readout?.meta[side] ?? ''}
            </Text>
          </Stack>
          <Button
            variant="secondary"
            edge="border"
            weight={500}
            label={changeLabel}
            name={`${changeLabel}: ${name}`}
            height={CHANGE}
            radius="sm"
            step="caption"
            script={script}
            testID={`compare.${side}.change`}
            onPress={() => {
              setQuery('');
              setPicking(side);
            }}
          />
        </Stack>
      </View>
    );
  }

  const list = picking === null ? [] : pickList(query, picking, pair);
  const chosen = picking === null ? null : pair[picking];

  return (
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        ...bar,
        ...back,
        title: {
          text: t('compare.title'),
          align: 'centre',
          placement: 'bar',
          layout: 'inline',
          // The run repeats 比較 in Japanese, so it is drawn in English only (ADR-0142 D5's interim).
          ...(script === 'japanese' ? {} : { ja: japaneseRun('compare.title') }),
          size: 'label',
          weight: 500,
        },
        ...(onExport === undefined
          ? {}
          : {
              trailing: {
                targetRoom: true as const,
                icons: [
                  {
                    glyph: 'download' as const,
                    label: t('compare.export'),
                    size: EXPORT_GLYPH,
                    onPress: () => {
                      onExport(pair.a, pair.b);
                    },
                    testID: 'compare.export',
                  },
                ] as const,
              },
            }),
      }}
      {...(first === undefined
        ? {}
        : {
            actionBar: {
              actions: second === undefined ? ([first] as const) : ([first, second] as const),
              rule: true,
              gap: nativeSpacing.sm,
              // `08.actions`: rule → buttons 17, buttons → foot 17.5, sides 16.5 dp: `md` (ADR-0157).
              padding: { top: nativeSpacing.md, bottom: nativeSpacing.md, side: nativeSpacing.md },
              script,
            },
          })}
    >
      <ScrollView
        testID="compare.scroll"
        style={{ flex: 1 }}
        // The rule → the pair card: 42 dp, `xxl`, the leaked heading's space kept (F-246's rule); the
        // cards → the bar's rule 12.5, `md`.
        contentContainerStyle={{ paddingTop: nativeSpacing.xxl, paddingBottom: nativeSpacing.md }}
      >
        {/*
          THE ART LAYER, first and behind everything (F-247's lesson): `08`'s plum branch, clipped at
          the frame, every stroke under an opaque card or in the page's inset — no word sits on one.
        */}
        <View
          pointerEvents="none"
          testID="compare.art"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
        >
          {(['top', 'right', 'left'] as const).map((k) => (
            <View key={k} style={{ position: 'absolute', ...COMPARE_ART[k] }}>
              <Illustration
                name="plum-branch"
                tone="backdrop"
                color="foreground"
                width={COMPARE_ART[k].width}
                testID={`compare.art.${k}`}
              />
            </View>
          ))}
        </View>

        {/* `08.pair`: the two halves in the card's media slot, so the seam meets both its edges. */}
        <View style={{ paddingHorizontal: nativeSpacing.md }}>
          <Card
            level="1"
            radius="sm"
            testID="compare.pair"
            media={
              <Row gap="sm" align="stretch">
                {half('a', a)}
                <View
                  testID="compare.seam"
                  importantForAccessibility="no"
                  accessibilityElementsHidden
                  style={{ width: SEAM, backgroundColor: colors.border }}
                />
                {half('b', b)}
              </Row>
            }
          />
        </View>

        {/* The pair card → the two cards: 32 dp, `xl`, the leaked caption's space kept. */}
        <View style={{ height: nativeSpacing.xl }} />
        <View style={{ paddingHorizontal: nativeSpacing.md }}>
          <Row gap="sm" align="stretch">
            <View style={{ flex: 1 }}>
              <Card level="1" padding="sm" radius="sm" fill testID="compare.metrics">
                <Stack gap="xs">
                  <Text size="caption" weight={600} color="foreground" script={script} heading>
                    {t('compare.metrics')}
                  </Text>
                  <ReadoutTable
                    form="ruled"
                    layout="columns"
                    rows={readout.metrics}
                    script={script}
                    testID="compare.metrics.table"
                  />
                </Stack>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card level="1" padding="sm" radius="sm" fill testID="compare.access">
                <Stack gap="xs">
                  <Text size="caption" weight={600} color="foreground" script={script} heading>
                    {t('compare.access')}
                  </Text>
                  <ReadoutTable
                    form="ruled"
                    layout="stacked"
                    rows={readout.access}
                    script={script}
                    testID="compare.access.table"
                  />
                </Stack>
              </Card>
            </View>
          </Row>
        </View>
      </ScrollView>

      {/*
        THE CHOOSER (ADR-0156 D2, E4): `03`'s floating sheet over the Finder's own query. The other
        slot's colour is never listed; the slot's own is marked and announced as chosen.
      */}
      <Sheet
        form="floating"
        open={picking !== null}
        onOpenChange={(open) => {
          if (!open) setPicking(null);
        }}
        title={t(picking === 'b' ? 'compare.pickB' : 'compare.pickA')}
        closeLabel={t('compare.pickClose')}
        handleLabel={t('compare.pickHandle')}
        handleHint={t('compare.pickHandleHint')}
        testID="compare.pick"
      >
        {picking === null ? null : (
          <Stack gap="sm">
            <SearchField label={t('compare.choose')} value={query} onChangeText={setQuery} />
            {list.length === 0 ? (
              <EmptyState message={t('compare.noMatch')} resolvedHere script={script} />
            ) : (
              /*
              A PLAIN LIST, NOT A FLATLIST: the sheet already scrolls its body, and a virtualised list
              inside a scroller is one React Native refuses to window.
            */
              <Stack gap="xs">
                {list.map((item) => {
                  const selected = item.entry.slug === chosen;
                  // The card's own name form, kanji then romaji (review, M16); the English is in the spoken name.
                  const words = nameLine(item);
                  return (
                    <Pressable
                      key={item.entry.slug}
                      testID={`compare.pick.${item.entry.slug}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${words}, ${swatchAccessibleName(
                        item.entry.name.en,
                        item.derived.hex,
                        colorFor(item.entry),
                      )}`}
                      onPress={() => {
                        setPair((p) => (p === null ? p : choose(p, picking, item.entry.slug)));
                        setPicking(null);
                      }}
                      style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
                    >
                      <Row gap="sm">
                        <View
                          importantForAccessibility="no-hide-descendants"
                          accessibilityElementsHidden
                        >
                          <Swatch
                            name={item.entry.name.en}
                            hex={item.derived.hex}
                            color={colorFor(item.entry)}
                            size={32}
                            corner="sm"
                            selected={selected}
                          />
                        </View>
                        <Text size="label" color="foreground" script={script}>
                          {words}
                        </Text>
                      </Row>
                    </Pressable>
                  );
                })}
              </Stack>
            )}
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}
