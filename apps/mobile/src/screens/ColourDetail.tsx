/**
 * One colour, as mockup `06` draws it (F-247) — and in Japanese, `26`'s words and Japanese type on
 * `06`'s layout (R9 C3).
 *
 * Top to bottom: the app bar (*← Atlas*, bookmark, share, export, a rule); the sample with the layer
 * stacked behind its trailing edge; the kanji beside the kana and *Romaji • English*; the *Family •
 * Era • Season* pill; three cards — the readout, the provenance, the person's own garments — and the
 * pinned action bar.
 *
 * ## What it says, and where that is decided
 *
 * Every word and value on this page is worked out in `../detail` and drawn here: the readout is the
 * record's own derivation, with Display-P3 the engine's conversion of its XYZ (`engine.ts`); the
 * provenance card leads with the classification (FR-23) and says the source, its type, its licence
 * and the check the record holds (FR-24, F-084) — never *Verified*, never a period no entry claims
 * (ADR-0146). The garments are the builder's own ranking with this colour as a top, and only their
 * order is shown (ADR-0148).
 *
 * ## What left the page
 *
 * The description, XYZ and CIELCh, the bands, the full register, palettes, relations, the
 * colour-vision block and *Compare with* — each still reachable where ADR-0147 lists it. `06` draws
 * none of them, and a page that kept them would be a second design beside the one drawn.
 *
 * ## Every drawn action is a prop
 *
 * The route supplies them; an absent handler is an absent control, so the conformance suite renders
 * the page without a navigator and nothing on it does nothing.
 */

import { useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import type { StoredGarment } from '@irodora/store';
import {
  Card,
  Chip,
  EmptyState,
  Glyph,
  Illustration,
  ReadoutTable,
  Row,
  Screen,
  Stack,
  Swatch,
  Text,
  useTheme,
  type AppBarIcon,
} from '@irodora/ui';
import { colorFor, entryBySlug } from '../corpus';
import {
  ART_WIDTH,
  BACK_GLYPH,
  BOOKMARK_GLYPH,
  combinationCaption,
  combinationName,
  DETAIL_APP_BAR,
  EXPORT_GLYPH,
  HERO_HEIGHT,
  HERO_KEYLINE,
  HOLD,
  HOLD_GLYPH,
  nameLine,
  PHOTO,
  PILL,
  provenanceBody,
  provenanceLead,
  RANK,
  readoutRows,
  reviewLine,
  reviewRecorded,
  SEAL_GLYPH,
  SHARE_GLYPH,
  STACK_HEIGHT,
  STACK_WIDTH,
  taxonomyLine,
  WEAR,
  wearableCombinations,
  type WearableCombination,
} from '../detail';
import { displayP3Of } from '../engine';
import { useMessages } from '../i18n/useMessages';
import type { RankingContext } from '../outfit/builder';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: the corpus
 * does not hold the colour this screen is about. An empty wardrobe is a card's state on a page that
 * is otherwise whole, not the page's.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/**
 * The record's vocabulary → catalogue keys: written once, in `../detail` (F-247), and the
 * classification's re-exported here for the colour card, which reads it from this screen (F-023).
 */
export { CLASSIFICATION_KEYS } from '../detail';

/**
 * A pressed garment dims, as the Wardrobe's cells do: opacity, because `motion.animatable` is
 * opacity and transform, and a hand-rolled `Pressable` otherwise gives no sign it was touched.
 */
const PRESSED_OPACITY = 0.7;

export interface ColourDetailProps {
  readonly slug: string;
  /** Whether this colour is bookmarked (ADR-0135): the app bar's bookmark is drawn on. */
  readonly bookmarked?: boolean;
  /** Bookmark it, or take the bookmark off: called with the state the toggle moves to. */
  readonly onBookmark?: (on: boolean) => void;
  /** `06.back`: back to the Atlas. */
  readonly onBack?: () => void;
  /** `06.share`: this colour's card (26's binding; the card's own share is F-253's). */
  readonly onShareCard?: (slug: string) => void;
  /** `06.export`: the export, of this colour. */
  readonly onExport?: (slug: string) => void;
  /** `06.actions.wear`: `07`, what to wear with it. */
  readonly onWearIt?: (slug: string) => void;
  /** `06.actions.hold`: arm this colour as the Lens's target, and open the Lens. */
  readonly onHoldAsTarget?: (slug: string) => void;
  /**
   * The person's garments, read by the route. Absent, the combinations card is not drawn: the
   * page cannot say what goes with a wardrobe it was not given.
   */
  readonly wardrobe?: readonly StoredGarment[];
  /** A garment's photograph as a `data:` URI, or `null` without one (`wardrobe/gallery.ts`). */
  readonly photoOf?: (garmentId: string) => string | null;
  /** What a garment is ranked against (`wardrobe/coverage.ts#rankingContext`). */
  readonly ranking?: RankingContext;
  /** A combination: open that garment. */
  readonly onOpenGarment?: (garmentId: string) => void;
  /** 27's empty wardrobe: scan the first garment. */
  readonly onScanGarment?: () => void;
  /** Garments, but none that pairs with a top: add one. */
  readonly onAddGarment?: () => void;
}

/** Up to three icons as the app bar types them: the tuple, or nothing. */
function upToThree(
  icons: readonly AppBarIcon[],
):
  | readonly [AppBarIcon]
  | readonly [AppBarIcon, AppBarIcon]
  | readonly [AppBarIcon, AppBarIcon, AppBarIcon]
  | null {
  const [a, b, c] = icons;
  if (a === undefined) return null;
  if (b === undefined) return [a];
  if (c === undefined) return [a, b];
  return [a, b, c];
}

export function ColourDetail({
  slug,
  bookmarked = false,
  onBookmark,
  onBack,
  onShareCard,
  onExport,
  onWearIt,
  onHoldAsTarget,
  wardrobe,
  photoOf,
  ranking,
  onOpenGarment,
  onScanGarment,
  onAddGarment,
}: ColourDetailProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const found = entryBySlug(slug);
  const combinations = useMemo(
    () =>
      found === null || wardrobe === undefined || ranking === undefined
        ? null
        : wearableCombinations(found, wardrobe, ranking),
    [found, wardrobe, ranking],
  );

  /*
   * THE APP BAR (`06.header`): the Atlas's word beside the back glyph, named for where it goes, and
   * the three icons at the trailing end. The row is the platform's target tall (`targetRoom`), so an
   * icon's slop lies inside its parent on Android as F-237's header box kept it (E-216); at `06`'s
   * pitch the three targets still overlap, which F-305 holds.
   */
  const back =
    onBack === undefined
      ? {}
      : {
          back: {
            glyph: 'back' as const,
            label: t('tab.atlas'),
            name: t('detail.backToAtlas'),
            size: BACK_GLYPH,
            onPress: onBack,
          },
        };
  const bar = {
    rule: true,
    height: DETAIL_APP_BAR,
    inset: nativeSpacing.md,
    gap: nativeSpacing.md,
    script,
  };

  if (found === null)
    return (
      /*
        A COLOUR THIS CORPUS DOES NOT HOLD (F-236, ADR-0147 D4): 00's caption under the app bar,
        whose back is the way out — a second control would be a second way to do one thing.
      */
      <Screen scroll={false} bleed script={script} appBar={{ ...back, ...bar }}>
        <View style={{ padding: nativeSpacing.md }}>
          <EmptyState message={t('detail.notFound')} resolvedHere script={script} />
        </View>
      </Screen>
    );

  const { entry, derived } = found;
  const sample = { hex: derived.hex, color: colorFor(entry) };
  const icons = upToThree([
    ...(onBookmark === undefined
      ? []
      : [
          {
            glyph: 'bookmark' as const,
            label: t('detail.bookmark'),
            selected: bookmarked,
            size: BOOKMARK_GLYPH,
            testID: 'detail.bookmark',
            onPress: () => {
              onBookmark(!bookmarked);
            },
          },
        ]),
    ...(onShareCard === undefined
      ? []
      : [
          {
            glyph: 'share' as const,
            label: t('detail.shareCard'),
            size: SHARE_GLYPH,
            onPress: () => {
              onShareCard(slug);
            },
          },
        ]),
    ...(onExport === undefined
      ? []
      : [
          {
            glyph: 'export' as const,
            label: t('detail.export'),
            size: EXPORT_GLYPH,
            onPress: () => {
              onExport(slug);
            },
          },
        ]),
  ]);

  /*
   * THE ACTION BAR (`06.actions`), pinned above the tab bar: *Wear It*, filled, and *Hold as Target*,
   * outlined, sharing the screen's width at their drawn heights (ADR-0145 D4).
   */
  const wear =
    onWearIt === undefined
      ? null
      : {
          label: t('detail.wearIt'),
          glyph: 'arrow-right' as const,
          height: WEAR,
          radius: 'sm' as const,
          script,
          testID: 'detail.wearIt',
          onPress: () => {
            onWearIt(slug);
          },
        };
  const hold =
    onHoldAsTarget === undefined
      ? null
      : {
          variant: 'secondary' as const,
          edge: 'border' as const,
          label: t('detail.holdAsTarget'),
          glyph: 'reticle' as const,
          glyphSize: HOLD_GLYPH,
          height: HOLD,
          radius: 'sm' as const,
          script,
          testID: 'detail.holdAsTarget',
          onPress: () => {
            onHoldAsTarget(slug);
          },
        };
  const actions =
    wear !== null && hold !== null
      ? ([wear, hold] as const)
      : wear !== null
        ? ([wear] as const)
        : hold !== null
          ? ([hold] as const)
          : null;

  // 26 draws the provenance lines at `body` where 06 draws `label` (ADR-0146 D5).
  const prose = script === 'japanese' ? 'body' : 'label';
  const colon = script === 'japanese' ? '：' : ': ';

  return (
    /*
      THE FRAME BLEEDS, AND THE PAGE SCROLLS IN ITS OWN SCROLLER (F-246's shape): `06` draws two
      insets — the sample and the names at `md`, the cards at `xs` — which one padded frame cannot
      give. The scroller carries `flex: 1`, so the action bar below it stays where it is drawn.
    */
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        ...back,
        ...bar,
        ...(icons === null ? {} : { trailing: { targetRoom: true, icons } }),
      }}
      {...(actions === null
        ? {}
        : {
            actionBar: {
              actions,
              fill: 'surface.1',
              rule: true,
              gap: nativeSpacing.sm,
              padding: { top: nativeSpacing.md, bottom: nativeSpacing.sm, side: nativeSpacing.md },
            },
          })}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: nativeSpacing.sm, paddingBottom: nativeSpacing.md }}
      >
        <Stack gap="md">
          <View style={{ paddingHorizontal: nativeSpacing.md }}>
            <Stack gap="xs">
              {/*
                THE SAMPLE, AND THE LAYER STACKED BEHIND IT (`06.swatch`, `06.swatch.stack`). The layer
                is drawn first, so the sample is over it: it shows `STACK_WIDTH` past the sample's
                trailing edge and runs on under the sample's rounded corners, so the two meet square
                as `06` draws them. It is the entry's own colour (ADR-0146 D6) and decorative, so it is
                hidden from assistive technology.
              */}
              <View style={{ paddingRight: STACK_WIDTH }}>
                <View
                  testID="detail.stack"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: (HERO_HEIGHT - STACK_HEIGHT) / 2,
                  }}
                >
                  <Swatch
                    width={STACK_WIDTH + nativeRadius.sm}
                    height={STACK_HEIGHT}
                    keyline={false}
                    corner="sm"
                    name={entry.name.en}
                    hex={sample.hex}
                    color={sample.color}
                  />
                </View>
                <Swatch
                  width="fill"
                  height={HERO_HEIGHT}
                  keylineWidth={HERO_KEYLINE}
                  corner="sm"
                  name={entry.name.en}
                  hex={sample.hex}
                  color={sample.color}
                />
              </View>
              {/* THE NAMES (`06.kanji`, `.kana`, `.name`) and the pill, indented `sm` under the sample. */}
              <View style={{ paddingLeft: nativeSpacing.sm }}>
                <Stack gap="xs" align="start">
                  <Row gap="sm" align="center" wrap>
                    <Text
                      size={script === 'japanese' ? 'kanjiHeroJa' : 'kanjiHero'}
                      face="gothic"
                      weight={400}
                      color="foreground"
                      script="japanese"
                      heading
                    >
                      {entry.name.kanji}
                    </Text>
                    <Stack gap="xs">
                      <Text size="body" face="gothic" color="foreground.2" script="japanese">
                        {entry.name.kana}
                      </Text>
                      <Text size="body" color="foreground.2" script="latin">
                        {nameLine(found)}
                      </Text>
                    </Stack>
                  </Row>
                  <Chip
                    form="badge"
                    wrap
                    fill="surface.2"
                    height={PILL}
                    size="label"
                    label={taxonomyLine(found, t, script)}
                    script={script}
                    testID="detail.taxonomy"
                  />
                </Stack>
              </View>
            </Stack>
          </View>

          {/* THE CARDS, fitted to the screen's width (ADR-0145): `06` draws them 0.8 dp in, so `xs`. */}
          <View style={{ paddingHorizontal: nativeSpacing.xs }}>
            <Stack gap="md">
              <Card level="1" padding="md" radius="md" testID="detail.readout">
                <Stack gap="sm">
                  <Text size="title" weight={600} color="foreground" script={script} heading>
                    {t('detail.readout')}
                  </Text>
                  <ReadoutTable
                    form="table"
                    rows={readoutRows(found, t, displayP3Of(entry.color.xyz))}
                    script={script}
                    testID="detail.readout.table"
                  />
                </Stack>
              </Card>
              <Stack gap="sm">
                <Card level="1" padding="md" radius="md" testID="detail.provenance">
                  {/*
                    THE PLUM BRANCH BEHIND THE WORDS (`06.provenance.art`): at its drawn size and its
                    place from the card's top and trailing edge (ADR-0145 D3), inked at `06`'s card
                    tone (ADR-0149). Drawn first, so the words are over it.
                  */}
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', top: nativeSpacing.xs, right: nativeSpacing.sm }}
                  >
                    <Illustration
                      name="plum-branch"
                      color="foreground"
                      tone="card"
                      width={ART_WIDTH}
                    />
                  </View>
                  <Stack gap="xs">
                    <Text size="title" weight={600} color="foreground" script={script} heading>
                      {t('detail.provenance')}
                    </Text>
                    <Text size={prose} color="foreground.2" script={script}>
                      <Text size={prose} weight={600} color="foreground" script={script}>
                        {`${provenanceLead(found, t)}${colon}`}
                      </Text>
                      {provenanceBody(found, t)}
                    </Text>
                    <Row gap="xs" align="center" wrap>
                      <Text size={prose} color="foreground.2" script={script} numeric>
                        <Text size={prose} weight={600} color="foreground" script={script}>
                          {`${t('detail.review')}${colon}`}
                        </Text>
                        {reviewLine(found, t)}
                      </Text>
                      {/* The seal only where a check is recorded; the words carry the status (rule 13). */}
                      {reviewRecorded(found) ? (
                        <Glyph name="seal-check" color={colors['glyph.seal']} size={SEAL_GLYPH} />
                      ) : null}
                    </Row>
                  </Stack>
                </Card>
                {combinations === null ? null : combinations.length > 0 ? (
                  <Card level="1" padding="md" radius="md" testID="detail.combinations">
                    <Stack gap="sm">
                      <Text size="title" weight={600} color="foreground" script={script} heading>
                        {t('detail.combinations')}
                      </Text>
                      <Row gap="md" align="start" wrap>
                        {combinations.map((c) => (
                          <CombinationItem
                            key={c.garment.id}
                            combination={c}
                            uri={photoOf === undefined ? null : photoOf(c.garment.id)}
                            script={script}
                            {...(onOpenGarment === undefined
                              ? {}
                              : {
                                  onPress: () => {
                                    onOpenGarment(c.garment.id);
                                  },
                                })}
                          />
                        ))}
                      </Row>
                    </Stack>
                  </Card>
                ) : wardrobe?.length === 0 ? (
                  /*
                    THE EMPTY WARDROBE IS 27'S CARD (ADR-0148 D4), in the combinations' place: Home's
                    heading, body and way out, which opens the Lens.
                  */
                  onScanGarment === undefined ? null : (
                    <EmptyState
                      title={t('wardrobe.empty.title')}
                      body={t('wardrobe.empty.body')}
                      action={{ label: t('wardrobe.empty.scan'), onPress: onScanGarment }}
                      script={script}
                    />
                  )
                ) : onAddGarment === undefined ? null : (
                  // Garments, but none that pairs with a top: 27's card, and a way to add one.
                  <EmptyState
                    title={t('detail.combinationsNone.title')}
                    body={t('detail.combinationsNone.body')}
                    action={{ label: t('detail.combinationsNone.add'), onPress: onAddGarment }}
                    script={script}
                  />
                )}
              </Stack>
            </Stack>
          </View>
        </Stack>
      </ScrollView>
    </Screen>
  );
}

/**
 * One of the person's garments (`06.combinations.item-n`): its photograph in `06`'s circle, or —
 * without one — its colour as a sample, which no mockup draws round (E4, C7); the number at its
 * corner; its name over its hex. ONE control, named in full, because a tap anywhere on it opens the
 * garment; what it draws inside is hidden from assistive technology, which hears the name.
 */
function CombinationItem({
  combination,
  uri,
  script,
  onPress,
}: {
  readonly combination: WearableCombination;
  readonly uri: string | null;
  readonly script: 'latin' | 'japanese';
  readonly onPress?: () => void;
}): React.JSX.Element {
  const n = String(combination.rank);
  const drawn = (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Stack gap="xs" align="center">
        <View testID={`detail.combination.${n}.photo`} style={{ width: PHOTO, height: PHOTO }}>
          {uri === null ? (
            <Swatch
              width={PHOTO}
              height={PHOTO}
              corner="md"
              name={combination.garment.color.name}
              hex={combination.hex}
              color={combination.color}
            />
          ) : (
            <Image
              source={{ uri }}
              style={{ width: PHOTO, height: PHOTO, borderRadius: nativeRadius.pill }}
              resizeMode="cover"
              accessible={false}
            />
          )}
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <Chip
              form="badge"
              fill="surface.2"
              height={RANK}
              size="caption"
              numeric
              label={n}
              testID={`detail.combination.${n}.rank`}
            />
          </View>
        </View>
        {/* A long name wraps under its own photograph rather than pushing its neighbours (E3). */}
        <View style={{ maxWidth: PHOTO + nativeSpacing.md }}>
          <Text size="caption" color="foreground.2" script={script} align="center" numeric>
            {combinationCaption(combination)}
          </Text>
        </View>
      </Stack>
    </View>
  );
  return onPress === undefined ? (
    <View accessible accessibilityLabel={combinationName(combination)}>
      {drawn}
    </View>
  ) : (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={combinationName(combination)}
      testID={`detail.combination.${n}`}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
    >
      {drawn}
    </Pressable>
  );
}
