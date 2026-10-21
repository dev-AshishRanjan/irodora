/**
 * The Colour Atlas, as mockup `05` draws it (F-246; FR-20, FR-47).
 *
 * ## What `05` draws, top to bottom
 *
 * - **The bar** (`05.header`): *Colour Atlas • 日本に着想を得た色* at the leading edge and the
 *   overflow (`05.more`); under it the count pill (`05.count`) and three pills — *Compare*, *Finder*,
 *   *Palettes* — then the bar's rule.
 * - **The search** (`05.search`): one outlined field with its glyph, its placeholder the promise of
 *   what it answers (ADR-0143 D1), and the bookmark toggle at its end (ADR-0135).
 * - **The season pills** (`05.filters.season.*`): *All* and the four seasons, the chosen one filled
 *   and led by its dot (ADR-0141).
 * - **The family chips** (`05.filters.family.*`) under *Colour Family*: ADR-0108's order, each with
 *   its group's dot, in a row that runs off the right edge (ADR-0143 D3, D4).
 * - **The heading** *Atlas*, and the grid: two cards to a row, each a sample over its kanji and hex,
 *   its romaji, its OKLCh line and the season it was authored with (ADR-0140).
 *
 * The tab bar under it is the tab layout's (C1).
 *
 * ## The acceptance criterion that shapes the list
 *
 * > Every corpus entry reachable in 3 interactions or fewer from the atlas root.
 *
 * So the grid lists **the whole corpus**, and the field and the filters narrow it rather than reveal
 * it. That makes the criterion checkable by reading the list's data, which is what `screens.test.tsx`
 * does.
 *
 * ## Every number here came from the bundle
 *
 * `hex`, `oklch` and every dot are the engine's answers at publish time, frozen. Nothing on this
 * screen converts a colour, and `verify-guards.mjs` boundary #24 is what stops that from being a
 * promise — recomputing a bundled value would look identical, pass every test, and return *today's*
 * engine's answer for a published version.
 *
 * ## The rules live in `../atlas.ts`
 *
 * What the field matches, what the filters keep, what a card and the count say, which colour a chip's
 * dot is: worked out there, pure, so the rules are written where somebody can disagree with them
 * rather than in JSX.
 *
 * ## The bookmarked colours are read back here (F-237, ADR-0135)
 *
 * `06` bookmarks a corpus colour, so every bookmark is an entry this list already holds. The search
 * field carries a bookmark toggle at its trailing end: on, the list narrows to the bookmarked
 * entries, together with the query and every filter, and *Clear* turns it off with the rest. It is
 * screen state, never stored — a filter that narrowed the Atlas at the next launch would hide the
 * corpus behind a choice nobody remembers making. With nothing bookmarked it says so, in `00`'s
 * caption, because the way out is the toggle on this screen.
 */

import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import {
  Appear,
  Arrival,
  Button,
  Card,
  Chip,
  ChoiceGroup,
  EmptyState,
  Row,
  Screen,
  SearchField,
  Sheet,
  Stack,
  Swatch,
  Text,
  useTheme,
} from '@irodora/ui';
import {
  APP_BAR,
  ATLAS_MEDIA_INSET,
  ATLAS_SAMPLE,
  atlasCardName,
  atlasCountLabel,
  atlasNarrowed,
  atlasOklch,
  atlasShown,
  capitalisedRomaji,
  CHROMA_KEYS,
  COUNT_PILL,
  FAMILY_CHIP,
  familyDot,
  familyGroups,
  LIGHTNESS_KEYS,
  MORE_GLYPH,
  NAV_PILL,
  NO_FILTERS,
  SEARCH_FIELD,
  SEARCH_GLYPH,
  SEASON_KEYS,
  SEASON_PILL,
  SEASONS,
  seasonLine,
  TEMPERATURE_KEYS,
  type AtlasFilters,
  type Season,
} from '../atlas';
import {
  allEntries,
  colorFor,
  CORPUS_ENTRY_COUNT,
  CORPUS_LABEL,
  type PublishedEntry,
} from '../corpus';
import { japaneseRun, type MessageKey } from '../i18n/index';
import { useMessages } from '../i18n/useMessages';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: nothing
 * matches the search and the filters.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/**
 * Corpus vocabulary → catalogue key: written once, in `../atlas` (F-246), and re-exported here for
 * the screens that read them from the Atlas (the colour page).
 */
export { CHROMA_KEYS, LIGHTNESS_KEYS, SEASON_KEYS, TEMPERATURE_KEYS };

export interface AtlasProps {
  /** The route supplies navigation. Absent, the screen still renders — which is how it is checked. */
  readonly onSelect?: (slug: string) => void;
  /**
   * `05`'s three pills: *Compare*, *Finder*, *Palettes* (F-181, ADR-0143 D7).
   *
   * Optional and supplied by the route, like every destination here: a screen that called
   * `router.push` itself could not be rendered by the conformance suite.
   */
  readonly onOpenFinder?: (() => void) | undefined;
  readonly onOpenCompare?: (() => void) | undefined;
  readonly onOpenPalettes?: (() => void) | undefined;
  /**
   * The search as the screen opens. The Finder's `initialQuery` and the Wardrobe's `initialFilter`
   * exist for the same reason: a screen with nothing matching is a tree the conformance suite has
   * to be able to render (F-236), and typing into it is not something a render can do.
   */
  readonly initialQuery?: string;
  /**
   * The bookmarked slugs (F-237). The route reads them from the provider; absent, no toggle is
   * drawn and nothing is narrowed by it.
   */
  readonly bookmarked?: ReadonlySet<string>;
  /** The toggle as the screen opens, for the reason `initialQuery` exists. */
  readonly initialBookmarkedOnly?: boolean;
  /** The season pill chosen as the screen opens: the chosen pill's form, rendered (ADR-0141). */
  readonly initialSeason?: Season;
  /** *More filters* open as the screen opens: the sheet's tree, rendered (ADR-0143 D5). */
  readonly initialFacetsOpen?: boolean;
}

/**
 * One entry, as `05` draws a card (ADR-0140).
 *
 * **One control** (ADR-0143 D8): the card is the button, and its name carries everything it prints
 * and the English it does not. The sample inside takes the same action, so a tap on the colour is
 * not swallowed by its own pressable, and is hidden from assistive technology so the card is
 * announced once. Without a destination it is no control at all: a button that goes nowhere is
 * worse than a card that is read.
 *
 * **The kanji leads**, in the sans `05` draws (C6), with the hex beside it; the romaji under them,
 * then the engine's OKLCh line, on every card; and the season the entry was authored with, or
 * nothing where none was — never an era, which no entry holds.
 */
function AtlasCard({
  item,
  index,
  script,
  t,
  onSelect,
}: {
  readonly item: PublishedEntry;
  readonly index: number;
  readonly script: 'latin' | 'japanese';
  readonly t: (key: MessageKey) => string;
  readonly onSelect: (() => void) | undefined;
}): React.JSX.Element {
  const { entry, derived } = item;
  const season = seasonLine(item, t, script);
  const press = onSelect === undefined ? {} : { onPress: onSelect };
  return (
    <Card
      level="1"
      radius="sm"
      padding="sm"
      fill
      mediaInset={ATLAS_MEDIA_INSET}
      {...(onSelect === undefined
        ? {}
        : { onPress: onSelect, label: atlasCardName(item, t, script) })}
      testID={`atlas.card.${String(index)}`}
      media={
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {/*
            `derived.hex` — the engine's answer AT PUBLISH TIME, not recomputed here. The Color
            comes from the entry's own authored XYZ, so this path converts nothing at all.
          */}
          <Swatch
            width="fill"
            height={ATLAS_SAMPLE}
            corner="sm"
            keyline
            name={entry.name.en}
            hex={derived.hex}
            color={colorFor(entry)}
            {...press}
          />
        </View>
      }
    >
      <Stack gap="xs">
        {/* A long kanji and the hex share a narrow card: the row wraps, never clips (§4 E3). */}
        <Row justify="between" align="start" wrap>
          <Text size="body" face="gothic" weight={400} color="foreground" script="japanese">
            {entry.name.kanji}
          </Text>
          <Text size="caption" color="foreground.2" numeric>
            {derived.hex}
          </Text>
        </Row>
        <Text size="label" weight={500} color="foreground" script="latin">
          {capitalisedRomaji(entry.name.romaji)}
        </Text>
        <Text size="caption" color="foreground.2" numeric>
          {atlasOklch(derived.oklch, t('coord.oklch'))}
        </Text>
        {season === null ? null : (
          <Text size="caption" color="foreground.3.card" script={script}>
            {season}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function Atlas({
  onSelect,
  onOpenFinder,
  onOpenCompare,
  onOpenPalettes,
  initialQuery = '',
  bookmarked,
  initialBookmarkedOnly = false,
  initialSeason,
  initialFacetsOpen = false,
}: AtlasProps): React.JSX.Element {
  const { t, script } = useMessages();
  const { colors } = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<AtlasFilters>(
    initialSeason === undefined ? NO_FILTERS : { ...NO_FILTERS, season: initialSeason },
  );
  const [bookmarkedOnly, setBookmarkedOnly] = useState(initialBookmarkedOnly);
  const [facetsOpen, setFacetsOpen] = useState(initialFacetsOpen);

  const entries = useMemo(() => allEntries(), []);
  const groups = useMemo(() => familyGroups(), []);
  // Only when the route supplied a set: a toggle that is not drawn narrows nothing.
  const onlyBookmarked = bookmarked !== undefined && bookmarkedOnly;
  const shown = atlasShown(entries, query, filters, onlyBookmarked ? bookmarked : null);
  /*
   * NONE BOOKMARKED IS NOT NOTHING MATCHING. Counted over this corpus's entries, not the set: a
   * bookmark for a slug the pinned corpus lacks (only a restore from another version can make one)
   * is kept, and never listed, so it does not make the list any less empty.
   */
  const noneBookmarked = onlyBookmarked && !entries.some((e) => bookmarked.has(e.entry.slug));
  const narrowed = atlasNarrowed(query, filters, onlyBookmarked);

  const clearAll = (): void => {
    setFilters(NO_FILTERS);
    setQuery('');
    setBookmarkedOnly(false);
  };
  const toggleGroup = (group: (typeof groups)[number]['group']): void => {
    const next = new Set(filters.groups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setFilters({ ...filters, groups: next });
  };

  /** A heading in `05`'s form: the family label's caption at 500. The facets sheet heads its rows so. */
  const label = (words: string): React.JSX.Element => (
    <Text size="caption" weight={500} color="foreground" script={script} heading>
      {words}
    </Text>
  );

  /**
   * One facet in the season row's form (ADR-0143 D5): a single choice with *All*, the chosen pill
   * filled in `accent` and led by its dot (ADR-0141).
   */
  const pills = {
    height: SEASON_PILL,
    selectedFill: 'accent',
    selectedEdge: false,
    size: 'caption',
    gap: 'xs',
  } as const;

  /** The three pills under the bar, as `05` draws them: outlined, 18.5 dp, the words at caption. */
  const nav = (key: MessageKey, onPress: (() => void) | undefined): React.JSX.Element | null =>
    onPress === undefined ? null : (
      <Button
        label={t(key)}
        variant="secondary"
        edge="border"
        height={NAV_PILL}
        step="caption"
        inset="sm"
        script={script}
        onPress={onPress}
      />
    );

  const countLabel = atlasCountLabel(CORPUS_ENTRY_COUNT, t, script);

  /**
   * Everything above the grid: the field, the seasons, the families, the rule and the heading.
   *
   * It is the FlatList's HEADER rather than a sibling, and that is the whole reason this screen
   * can virtualise. A `VirtualizedList` inside a plain `ScrollView` is a documented React
   * Native error — so `Screen` stops scrolling and the list scrolls instead, header and all.
   */
  const header = (
    <Stack gap="sm">
      {/*
        THE BOOKMARKED COLOURS, READ BACK (F-237, ADR-0135 D1): a toggle at the field's trailing
        end, in 06's glyph. On is the glyph filled and an announced `selected` (D2).
      */}
      <View style={{ paddingHorizontal: nativeSpacing.md }}>
        <SearchField
          label={t('atlas.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          height={SEARCH_FIELD}
          icon="search"
          iconSize={SEARCH_GLYPH}
          size="caption"
          {...(bookmarked === undefined
            ? {}
            : {
                trailing: {
                  glyph: 'bookmark',
                  label: t('atlas.bookmarkedOnly'),
                  selected: bookmarkedOnly,
                  onPress: () => {
                    setBookmarkedOnly(!bookmarkedOnly);
                  },
                  testID: 'atlas.bookmarked',
                },
              })}
        />
      </View>

      {/*
        THE SEASONS (ADR-0143 D2): a single choice with *All*. In English each pill carries its
        season's kanji, as 05 draws *Spring 春*; in Japanese the word is already the kanji.
      */}
      <View style={{ paddingHorizontal: nativeSpacing.md }}>
        <ChoiceGroup
          label={t('filter.season')}
          clearLabel={t('atlas.all')}
          options={SEASONS.map((s) => ({
            value: s,
            label: t(SEASON_KEYS[s]),
            ...(script === 'latin' ? { kanji: japaneseRun(SEASON_KEYS[s]) } : {}),
          }))}
          value={filters.season}
          onChange={(season) => {
            setFilters({ ...filters, season });
          }}
          pills={pills}
          script={script}
        />
      </View>

      {/*
        THE FAMILIES (ADR-0143 D3, D4): filter chips, any number on — OR within the row, AND with
        everything else. The row runs off the right edge, as 05 draws it, so it scrolls; each dot is
        its group's medoid, a corpus colour with its own provenance (rule 12). The label sits on its
        chips, `xs` above them: 05's 5.5 dp of ink less the label's own inset below it.
      */}
      <Stack gap="xs">
        <View style={{ paddingHorizontal: nativeSpacing.md }}>{label(t('atlas.family'))}</View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: nativeSpacing.md, gap: nativeSpacing.xs }}
        >
          {groups.map((g) => (
            <Chip
              key={g.group}
              label={g.romaji}
              kanji={g.kanji}
              dot={familyDot(g, entries)}
              ground="surface.1"
              height={FAMILY_CHIP}
              size="caption"
              selected={filters.groups.has(g.group)}
              onPress={() => {
                toggleGroup(g.group);
              }}
              testID={`atlas.family.${g.group}`}
            />
          ))}
        </ScrollView>
      </Stack>

      <View
        testID="atlas.filters.rule"
        style={{
          height: 1,
          marginHorizontal: nativeSpacing.md,
          backgroundColor: colors.border,
        }}
      />

      {/*
        THE HEADING, AND WHAT NARROWS THE LIST BESIDE IT (ADR-0143 D6): *Showing n / N* and *Clear*
        sit at its trailing end only while anything narrows the list — empty space in 05's drawn state.
      */}
      <View style={{ paddingHorizontal: nativeSpacing.md }}>
        <Row justify="between" align="center" gap="sm" wrap>
          <Text size="label" weight={600} color="foreground" script={script} heading>
            {t('atlas.heading')}
          </Text>
          {narrowed ? (
            <Row align="center" gap="sm">
              <Text size="caption" color="foreground.2" script={script} numeric>
                {`${t('atlas.showing')} ${String(shown.length)} / ${String(entries.length)}`}
              </Text>
              <Button
                label={t('atlas.clear')}
                variant="plain"
                step="caption"
                script={script}
                onPress={clearAll}
              />
            </Row>
          ) : null}
        </Row>
      </View>
    </Stack>
  );

  return (
    /*
      `scroll={false}` and `bleed` — F-104's shape, so it is worth being explicit. That defect was a
      fixed `View` whose content below the fold could not be reached at all. This is not that: the
      FlatList below scrolls, header and all, and carries `flex: 1` rather than inheriting a size.
      The frame takes no inset because 05's family row runs to the right edge and its grid to the
      tab bar: each block pads itself.
    */
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        height: APP_BAR,
        inset: nativeSpacing.md,
        gap: nativeSpacing.xs,
        rule: true,
        script,
        title: {
          text: t('atlas.title'),
          ja: japaneseRun('atlas.titleJa'),
          layout: 'inline',
          align: 'leading',
          placement: 'bar',
          size: 'body',
          weight: 600,
        },
        trailing: {
          icons: [
            {
              glyph: 'more',
              label: t('atlas.moreFilters'),
              size: MORE_GLYPH,
              onPress: () => {
                setFacetsOpen(true);
              },
            },
          ],
        },
        below: (
          /* The count and the three pills share a line as 05 draws it, and wrap where they cannot (E3). */
          <Row justify="between" align="center" gap="xs" wrap>
            <View>
              <Chip
                form="badge"
                fill="surface.2"
                icon="list"
                label={countLabel}
                // WHICH CORPUS, ONE SWIPE FROM THE ROOT (FR-25, ADR-0142): 05 draws no version line.
                name={`${countLabel}, ${t('atlas.corpus')} ${CORPUS_LABEL}`}
                height={COUNT_PILL}
                size="caption"
                numeric
                script={script}
                testID="atlas.count"
              />
            </View>
            <Row align="center" gap="xs" wrap>
              {nav('atlas.compare', onOpenCompare)}
              {nav('atlas.finder', onOpenFinder)}
              {nav('atlas.palettes', onOpenPalettes)}
            </Row>
          </Row>
        ),
      }}
    >
      {/*
        A LIST ARRIVES ONCE (F-266, ADR-0133 §7): the cards the first frame draws stagger in; a card
        scrolled into view, or re-mounted by the list's windowing, is simply there. The scope draws
        no view, so the list's `flex: 1` chain is untouched.
      */}
      <Arrival>
        <FlatList
          data={shown}
          numColumns={2}
          keyExtractor={(item) => item.entry.slug}
          ListHeaderComponent={header}
          // The heading to the first row: 05's 9 dp of ink less the heading's own inset below it.
          ListHeaderComponentStyle={{ paddingBottom: nativeSpacing.xs }}
          ListEmptyComponent={
            // 00's empty (F-236): the search and the filters that would change it are on this
            // screen — and with nothing bookmarked, the toggle that would (ADR-0135 D3).
            <View style={{ paddingHorizontal: nativeSpacing.md }}>
              {noneBookmarked ? (
                <EmptyState
                  message={t('atlas.bookmarkedNone')}
                  hint={t('atlas.bookmarkedNoneHint')}
                  resolvedHere
                  script={script}
                />
              ) : (
                <EmptyState
                  message={t('atlas.empty')}
                  hint={t('atlas.emptyHint')}
                  resolvedHere
                  script={script}
                />
              )}
            </View>
          }
          columnWrapperStyle={{ paddingHorizontal: nativeSpacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: nativeSpacing.sm }} />}
          renderItem={({ item, index }) => (
            /*
              TWO TO A ROW, `sm` APART (05's 10 dp): each cell padded `xs` on its inner side. A CELL
              FLEXES ACROSS THE ROW, AT MOST HALF OF IT: its width is the row's share (a lone last card
              stays half), and its height is the row's by stretch, which the card fills — so both cards
              in a row are one height, as 05 draws them (195.5 and 195.5, 184 and 184), whether or not
              each prints a season.
              THE ENTRANCE (F-144) wraps the card rather than animating it: the colour itself is
              never interpolated, and `verify-motion` rejects a transition on a sample.
            */
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
                <AtlasCard
                  item={item}
                  index={index}
                  script={script}
                  t={t}
                  onSelect={
                    onSelect === undefined
                      ? undefined
                      : () => {
                          onSelect(item.entry.slug);
                        }
                  }
                />
              </Appear>
            </View>
          )}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: nativeSpacing.xl,
            paddingBottom: nativeSpacing.md,
          }}
          showsVerticalScrollIndicator={false}
          /*
            Tuned for the device criterion 4 names rather than left at the defaults: three rows of
            cards fill a 640 dp viewport, so six is the first screen and ten windows ahead is the
            runway that keeps a fast flick from hitting blank cells on a four-year-old phone.
          */
          initialNumToRender={6}
          windowSize={10}
          removeClippedSubviews
        />
      </Arrival>

      {/*
        MORE FILTERS (ADR-0143 D5): FR-20's facets 05 does not draw, behind its overflow, in 03's
        floating sheet and 05's own parts — each a heading and a single choice in the season row's form.
      */}
      <Sheet
        form="floating"
        open={facetsOpen}
        onOpenChange={setFacetsOpen}
        title={t('atlas.moreFilters')}
        closeLabel={t('atlas.facetsClose')}
        handleLabel={t('atlas.facetsHandle')}
        handleHint={t('atlas.facetsHandleHint')}
        testID="atlas.facets"
      >
        <Stack gap="md">
          <Stack gap="sm">
            {label(t('filter.temperature'))}
            <ChoiceGroup
              label={t('filter.temperature')}
              clearLabel={t('atlas.all')}
              options={(Object.keys(TEMPERATURE_KEYS) as (keyof typeof TEMPERATURE_KEYS)[]).map(
                (v) => ({ value: v, label: t(TEMPERATURE_KEYS[v]) }),
              )}
              value={filters.temperature}
              onChange={(temperature) => {
                setFilters({ ...filters, temperature });
              }}
              pills={pills}
              script={script}
            />
          </Stack>
          <Stack gap="sm">
            {label(t('filter.lightness'))}
            <ChoiceGroup
              label={t('filter.lightness')}
              clearLabel={t('atlas.all')}
              options={(Object.keys(LIGHTNESS_KEYS) as (keyof typeof LIGHTNESS_KEYS)[]).map(
                (v) => ({ value: v, label: t(LIGHTNESS_KEYS[v]) }),
              )}
              value={filters.lightness}
              onChange={(lightness) => {
                setFilters({ ...filters, lightness });
              }}
              pills={pills}
              script={script}
            />
          </Stack>
          <Stack gap="sm">
            {label(t('filter.chroma'))}
            <ChoiceGroup
              label={t('filter.chroma')}
              clearLabel={t('atlas.all')}
              options={(Object.keys(CHROMA_KEYS) as (keyof typeof CHROMA_KEYS)[]).map((v) => ({
                value: v,
                label: t(CHROMA_KEYS[v]),
              }))}
              value={filters.chroma}
              onChange={(chroma) => {
                setFilters({ ...filters, chroma });
              }}
              pills={pills}
              script={script}
            />
          </Stack>
        </Stack>
      </Sheet>
    </Screen>
  );
}
