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
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Chip, SearchField, Surface, Swatch, Text, useTheme } from '@irodora/ui';
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

export function Atlas({ onSelect }: AtlasProps): React.JSX.Element {
  const { colors } = useTheme();
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
      <View style={{ gap: 8 }}>
        <Text size="label" color="foreground.2" script={script}>
          {label}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
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
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('atlas.title')}
      </Text>

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
        </View>
      ) : null}

      {shown.length === 0 ? (
        <Surface level="1" padding={16}>
          <View style={{ gap: 8 }}>
            <Text size="body" color="foreground" script={script}>
              {t('atlas.empty')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t('atlas.emptyHint')}
            </Text>
          </View>
        </Surface>
      ) : null}

      <View style={{ gap: 8 }}>
        {shown.map(({ entry, derived }) => (
          <Pressable
            key={entry.slug}
            accessibilityRole="button"
            accessibilityLabel={`${entry.name.en} ${entry.name.romaji}`}
            onPress={() => {
              onSelect?.(entry.slug);
            }}
            // A row is comfortably taller than this in practice. Declared anyway, because the
            // conformance suite reads what a component DECLARES — a JS render tree has no Yoga
            // pass — and "it happens to be tall enough" is a measurement nobody took.
            style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
          >
            <Surface level="1" padding={12}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {/*
                  `derived.hex` — the engine's answer AT PUBLISH TIME, not recomputed here.
                  The Color comes from the entry's own authored XYZ, so this path converts
                  nothing at all.
                */}
                <Swatch name={entry.name.en} hex={derived.hex} color={colorFor(entry)} size={56} />
                <View style={{ gap: 4, flexShrink: 1 }}>
                  <Text size="body" color="foreground" script={script}>
                    {`${entry.name.kanji} ${entry.name.en}`}
                  </Text>
                  <Text size="small" color="foreground.2" script={script}>
                    {`${entry.name.kana} · ${entry.name.romaji}`}
                  </Text>
                  <Text size="small" color="foreground.2" script={script}>
                    {`${familyLabel(entry.taxonomy.family, locale)} · ${t(TEMPERATURE_KEYS[entry.taxonomy.temperature])} · ${derived.hex}`}
                  </Text>
                </View>
              </View>
            </Surface>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
