/**
 * The Colour Atlas — every published entry, reachable without a filter (FR-20).
 *
 * ## The acceptance criterion that shapes the layout
 *
 * > Every corpus entry reachable in 3 interactions or fewer from the atlas root.
 *
 * So the root lists **the whole corpus**, and filters narrow it rather than reveal it. A
 * design where a family has to be chosen before anything appears would put every entry at two
 * interactions and would make the corpus feel smaller than it is — but the real objection is
 * that "reachable" would then depend on a filter set nobody enumerated. Listing everything
 * makes the criterion checkable by walking the rendered tree, which is what `screens.test.tsx`
 * does.
 *
 * ## Every number here came from the bundle
 *
 * `hex` is `derived.hex`, computed by the engine at publish time and frozen. Nothing on this
 * screen converts a colour, and `verify-guards.mjs` boundary #24 is what stops that from being
 * a promise — recomputing a bundled value would look identical, pass every test, and return
 * *today's* engine's answer for a published version.
 *
 * ## Filters are values from the data, not a hand-written list
 *
 * `families()` reads the corpus. A family added by a future publish appears in the filter
 * without anyone editing this file; a hand-written list would silently omit it and the entries
 * would be unreachable by that route.
 *
 * **Family is shown as the corpus authored it**, in both locales. The corpus has no translated
 * taxonomy vocabulary and inventing one here would be putting words in the editor's mouth —
 * recorded as F-090 rather than papered over with a lookup table.
 *
 * ## The chips and the search field are components, not controls written here
 *
 * They started as a `Pressable` and a `TextInput` in this file, and the conformance suite
 * caught it: an interactive control built inside a screen is checked by nothing. `Chip` and
 * `SearchField` now live in `@irodora/ui` where the suite asks them to render focus, active,
 * disabled and loading differently — and this screen stays `static`, which is what a screen
 * composed of checked components should be.
 */

import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { Chip, Row, Screen, SearchField, Stack, Surface, Swatch, Text } from '@irodora/ui';
import {
  allEntries,
  familyLabel,
  colorFor,
  families,
  CORPUS_ENTRY_COUNT,
  CORPUS_LABEL,
  CORPUS_PALETTE_COUNT,
  type PublishedEntry,
} from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/**
 * Corpus vocabulary → catalogue key.
 *
 * Written as total records rather than as template strings, so a value the corpus can hold and
 * the catalogue cannot name is a **compile error** rather than a blank on a screen. It is also
 * what keeps every one of these keys "used" for the unused-key check, including the ones the
 * seed corpus happens not to exercise.
 */
export const TEMPERATURE_KEYS = {
  warm: 'temperature.warm',
  cool: 'temperature.cool',
  neutral: 'temperature.neutral',
} as const satisfies Record<string, MessageKey>;

export const LIGHTNESS_KEYS = {
  dark: 'band.dark',
  mid: 'band.mid',
  light: 'band.light',
} as const satisfies Record<string, MessageKey>;

export const CHROMA_KEYS = {
  low: 'chroma.low',
  mid: 'chroma.mid',
  high: 'chroma.high',
} as const satisfies Record<string, MessageKey>;

export const SEASON_KEYS = {
  spring: 'season.spring',
  summer: 'season.summer',
  autumn: 'season.autumn',
  winter: 'season.winter',
} as const satisfies Record<string, MessageKey>;

/** What the filter bar can narrow by. `family` is data-driven and handled separately. */
interface Filters {
  readonly family: string | null;
  readonly temperature: keyof typeof TEMPERATURE_KEYS | null;
  readonly lightness: keyof typeof LIGHTNESS_KEYS | null;
  readonly chroma: keyof typeof CHROMA_KEYS | null;
  readonly season: keyof typeof SEASON_KEYS | null;
}

const NO_FILTERS: Filters = {
  family: null,
  temperature: null,
  lightness: null,
  chroma: null,
  season: null,
};

/**
 * Search across every form of the name, plus the slug.
 *
 * All four name forms, because a reader may know a colour by its kanji, its reading, its
 * romanisation or its English name, and a search that only matched one of them would be a
 * search that works in one language.
 */
function matchesQuery(entry: PublishedEntry, query: string): boolean {
  if (query.trim() === '') return true;
  const q = query.trim().toLowerCase();
  const { name, slug } = entry.entry;
  return [name.kanji, name.kana, name.romaji, name.en, slug].some((v) =>
    v.toLowerCase().includes(q),
  );
}

function matchesFilters(entry: PublishedEntry, f: Filters): boolean {
  const { taxonomy } = entry.entry;
  if (f.family !== null && taxonomy.family !== f.family) return false;
  if (f.temperature !== null && taxonomy.temperature !== f.temperature) return false;
  if (f.lightness !== null && taxonomy.lightnessBand !== f.lightness) return false;
  if (f.chroma !== null && taxonomy.chromaBand !== f.chroma) return false;
  if (f.season !== null && !(taxonomy.season ?? []).includes(f.season)) return false;
  return true;
}

export interface AtlasProps {
  /** The route supplies navigation. Absent, the screen still renders — which is how it is checked. */
  readonly onSelect?: (slug: string) => void;
}

/**
 * One entry, at photograph scale (F-147).
 *
 * ## What this replaces
 *
 * A 56px swatch beside three lines of CONCATENATED text — `${kanji} ${en}` on one line and
 * `${family} · ${temperature} · ${hex}` on another. Concatenation is the tell: five fields
 * flattened into two `Text` nodes because nothing had decided their relative weight. Giving each
 * its own node is what makes a hierarchy possible at all, and it is why the type scale had
 * nowhere to apply on this screen.
 *
 * ## The colour is the element, not an adornment on a row
 *
 * A full-width band, 180px tall, on the mandatory neutral well with the two-tone keyline intact.
 * The `Swatch` component is unchanged — it was never the defect. What was wrong is that the
 * artefact the product exists to show was the smallest considered thing on the screen.
 *
 * ## The name leads in Japanese
 *
 * Kanji at `display.2`, the kana beneath it, and the romaji and English subordinate to both.
 * That order is the corpus's own: these are Japanese colours and the English is a gloss. The hex
 * is `numeric` — tabular, so a column of them scans — and deliberately the smallest thing here.
 */
function AtlasEntry({
  item,
  locale,
  script,
  t,
  onSelect,
}: {
  readonly item: PublishedEntry;
  readonly locale: 'en' | 'ja';
  readonly script: 'latin' | 'japanese';
  readonly t: (key: MessageKey) => string;
  readonly onSelect: () => void;
}): React.JSX.Element {
  const { entry, derived } = item;
  return (
    <Pressable
      accessibilityRole="button"
      /*
        The accessible name carries what a sighted reader gets from the hierarchy above: the
        Japanese name, its reading, and the English. Without the reading a screen reader
        announces kanji it may not voice correctly, and the romaji is what makes the entry
        findable by somebody who cannot read the character.
      */
      accessibilityLabel={`${entry.name.kanji} ${entry.name.romaji} ${entry.name.en}`}
      onPress={onSelect}
      style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
    >
      <Stack gap="lg">
        {/*
          `derived.hex` — the engine's answer AT PUBLISH TIME, not recomputed here. The Color
          comes from the entry's own authored XYZ, so this path converts nothing at all.
        */}
        <Swatch
          name={entry.name.en}
          hex={derived.hex}
          color={colorFor(entry)}
          size={ENTRY_HEIGHT}
        />
        <Stack gap="xs">
          <Text size="display.2" color="foreground" script="japanese">
            {entry.name.kanji}
          </Text>
          <Text size="body" color="foreground.2" script="japanese">
            {entry.name.kana}
          </Text>
          <Text size="small" color="foreground.2" script={script}>
            {`${entry.name.romaji} · ${entry.name.en}`}
          </Text>
          <Row gap="sm">
            <Text size="xs" color="foreground.2" numeric selectable>
              {derived.hex}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {`${familyLabel(entry.taxonomy.family, locale)} · ${t(TEMPERATURE_KEYS[entry.taxonomy.temperature])}`}
            </Text>
          </Row>
        </Stack>
      </Stack>
    </Pressable>
  );
}

/**
 * How tall a colour is drawn in the list.
 *
 * Enough to judge, which is the criterion — a colour is judged by area, and 56px of it beside
 * three lines of text is a label rather than a sample. Not the full viewport either: browsing
 * 120 entries has to stay browsing.
 */
const ENTRY_HEIGHT = 180;

export function Atlas({ onSelect }: AtlasProps): React.JSX.Element {
  const { t, script, locale } = useMessages();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const entries = useMemo(() => allEntries(), []);
  const familyOptions = useMemo(() => families(), []);
  const shown = entries.filter((e) => matchesQuery(e, query) && matchesFilters(e, filters));

  const active = query.trim() !== '' || Object.values(filters).some((v) => v !== null);

  function FilterRow<K extends string>({
    label,
    options,
    selected,
    onChange,
  }: {
    readonly label: string;
    readonly options: readonly { readonly value: K; readonly label: string }[];
    readonly selected: K | null;
    readonly onChange: (value: K | null) => void;
  }): React.JSX.Element {
    return (
      <Stack gap="sm">
        <Text size="label" color="foreground.2" script={script}>
          {label}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: nativeSpacing.sm }}
        >
          <Chip
            label={t('atlas.all')}
            selected={selected === null}
            onPress={() => {
              onChange(null);
            }}
          />
          {options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={selected === o.value}
              onPress={() => {
                onChange(selected === o.value ? null : o.value);
              }}
            />
          ))}
        </ScrollView>
      </Stack>
    );
  }

  /**
   * Everything above the entries: the corpus line, the search field, the filters, the count.
   *
   * It is the FlatList's HEADER rather than a sibling, and that is the whole reason this screen
   * can virtualise. A `VirtualizedList` inside a plain `ScrollView` is a documented React
   * Native error — so `Screen` stops scrolling and the list scrolls instead, header and all.
   */
  const header = (
    <Stack gap="xl2">
      {/*
        The version is on the root screen rather than buried in a settings page. Which corpus
        the app holds is what makes every value on every detail screen reproducible (FR-25).
      */}
      <Text size="small" color="foreground.2" script={script}>
        {`${t('atlas.corpus')} ${CORPUS_LABEL} · ${String(CORPUS_ENTRY_COUNT)} ${t('atlas.colours')} · ${String(CORPUS_PALETTE_COUNT)} ${t('atlas.palettes')}`}
      </Text>

      <SearchField label={t('atlas.search')} value={query} onChangeText={setQuery} />

      <Text size="label" color="foreground.2" script={script} heading>
        {t('atlas.filters')}
      </Text>

      <FilterRow
        label={t('filter.family')}
        options={familyOptions.map((f) => ({
          value: f.family,
          label: `${familyLabel(f.family, locale)} ${String(f.count)}`,
        }))}
        selected={filters.family}
        onChange={(family) => {
          setFilters({ ...filters, family });
        }}
      />
      <FilterRow
        label={t('filter.temperature')}
        options={(Object.keys(TEMPERATURE_KEYS) as (keyof typeof TEMPERATURE_KEYS)[]).map((v) => ({
          value: v,
          label: t(TEMPERATURE_KEYS[v]),
        }))}
        selected={filters.temperature}
        onChange={(temperature) => {
          setFilters({ ...filters, temperature });
        }}
      />
      <FilterRow
        label={t('filter.lightness')}
        options={(Object.keys(LIGHTNESS_KEYS) as (keyof typeof LIGHTNESS_KEYS)[]).map((v) => ({
          value: v,
          label: t(LIGHTNESS_KEYS[v]),
        }))}
        selected={filters.lightness}
        onChange={(lightness) => {
          setFilters({ ...filters, lightness });
        }}
      />
      <FilterRow
        label={t('filter.chroma')}
        options={(Object.keys(CHROMA_KEYS) as (keyof typeof CHROMA_KEYS)[]).map((v) => ({
          value: v,
          label: t(CHROMA_KEYS[v]),
        }))}
        selected={filters.chroma}
        onChange={(chroma) => {
          setFilters({ ...filters, chroma });
        }}
      />
      <FilterRow
        label={t('filter.season')}
        options={(Object.keys(SEASON_KEYS) as (keyof typeof SEASON_KEYS)[]).map((v) => ({
          value: v,
          label: t(SEASON_KEYS[v]),
        }))}
        selected={filters.season}
        onChange={(season) => {
          setFilters({ ...filters, season });
        }}
      />

      {active ? (
        <Row gap="md">
          <Text size="small" color="foreground.2" script={script}>
            {`${t('atlas.showing')} ${String(shown.length)} / ${String(entries.length)}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('atlas.clear')}
            onPress={() => {
              setFilters(NO_FILTERS);
              setQuery('');
            }}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text size="small" color="link" script={script}>
              {t('atlas.clear')}
            </Text>
          </Pressable>
        </Row>
      ) : null}

      {shown.length === 0 ? (
        <Surface level="1" padding="lg">
          <Stack gap="sm">
            <Text size="body" color="foreground" script={script}>
              {t('atlas.empty')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t('atlas.emptyHint')}
            </Text>
          </Stack>
        </Surface>
      ) : null}
    </Stack>
  );

  return (
    /*
      `scroll={false}` — and this is F-104's shape, so it is worth being explicit.

      That defect was a fixed `View` whose content below the fold could not be reached at all.
      This is not that: the FlatList below scrolls, and it scrolls the header with it. What
      would reproduce F-104 is turning scrolling off here and NOT giving the list the height to
      scroll in, which is why the list carries `flex: 1` rather than inheriting a size.
    */
    <Screen title={t('atlas.title')} script={script} scroll={false} gap="lg">
      <FlatList
        data={shown}
        keyExtractor={(item) => item.entry.slug}
        ListHeaderComponent={header}
        /*
          THE EDITORIAL RHYTHM, and the two steps whose exemption named this feature.

          `xl5` (96) separates the CONTROLS from the WORK — the one interval on this screen that
          is a break rather than a gap. `xl4` (56) separates one entry from the next: each is a
          single large object, and 56 is what stops a column of them reading as a table.
        */
        ListHeaderComponentStyle={{ paddingBottom: nativeSpacing.xl5 }}
        ItemSeparatorComponent={() => <View style={{ height: nativeSpacing.xl4 }} />}
        renderItem={({ item }) => (
          <AtlasEntry
            item={item}
            locale={locale}
            script={script}
            t={t}
            onSelect={() => {
              onSelect?.(item.entry.slug);
            }}
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: nativeSpacing.xl3 }}
        showsVerticalScrollIndicator={false}
        /*
          Tuned for the device criterion 4 names rather than left at the defaults. A full-width
          entry is ~260px tall, so a 640px viewport holds between two and three: rendering ten
          ahead is roughly four screens of runway, which is what keeps a fast flick from hitting
          blank cells on a four-year-old mid-range phone.
        */
        initialNumToRender={6}
        windowSize={10}
        removeClippedSubviews
      />
    </Screen>
  );
}
