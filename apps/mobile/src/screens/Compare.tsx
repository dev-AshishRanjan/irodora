/**
 * Two colours, and every number that separates them (FR-48).
 *
 * ## Every row carries three things
 *
 * > *All metrics shown with their units and the space they were computed in.*
 *
 * The number, its unit, and where it was computed. "ΔE00 4.2" without "CIELAB (D65)" beside it
 * is the failure that criterion names: the same quantity computed in a different space is a
 * different claim, and this repository has already been bitten by exactly that — culori read
 * 10% low because our D65 Lab was handed to its D50 mode
 * [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]].
 *
 * ## Numbers are tabular, and that is C9 rather than a preference
 *
 * Every figure on this screen goes through `<Text numeric>`. A professional scans a column of
 * deltas; proportional digits make the column ragged enough that the comparison the table
 * exists for has to be done one row at a time.
 *
 * ## Nothing here is computed
 *
 * `compare()` assembles the metric set, so a number this screen shows is reachable by a test
 * that never renders anything. The screen formats and labels; it does not calculate.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { SearchField, Surface, Swatch, Text, useTheme } from '@irodora/ui';
import { compare, type AxisDelta, type CompareMetrics } from '../compare';
import { allEntries, colorFor, entryBySlug, type PublishedEntry } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Deficiency → catalogue key. Total, so a fourth deficiency is a compile error. */
const CVD_KEYS = {
  protan: 'cvd.protan',
  deutan: 'cvd.deutan',
  tritan: 'cvd.tritan',
} as const satisfies Record<string, MessageKey>;

/** How many matches a slot offers. Enough to choose from, few enough to scan. */
const MATCH_LIMIT = 8;

/** A signed number, with its sign shown. A delta without its direction is half a fact. */
const signed = (n: number, places = 2): string =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(places)}`;

function matches(query: string): readonly PublishedEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  return allEntries()
    .filter((e) =>
      [
        e.entry.name.kanji,
        e.entry.name.kana,
        e.entry.name.romaji,
        e.entry.name.en,
        e.entry.slug,
      ].some((v) => v.toLowerCase().includes(q)),
    )
    .slice(0, MATCH_LIMIT);
}

export interface CompareProps {
  /** Optional starting pair, so a route or a test can open on a known comparison. */
  readonly initialA?: string;
  readonly initialB?: string;
}

export function Compare({ initialA, initialB }: CompareProps = {}): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const entries = useMemo(() => allEntries(), []);

  /*
   * Defaults are the first and last entries rather than the first two: the first two are
   * adjacent in slug order and therefore usually adjacent in colour, so the screen would open
   * on a comparison that shows almost nothing.
   */
  const [aSlug, setA] = useState(initialA ?? entries[0]?.entry.slug ?? '');
  const [bSlug, setB] = useState(initialB ?? entries[entries.length - 1]?.entry.slug ?? '');
  const [aQuery, setAQuery] = useState('');
  const [bQuery, setBQuery] = useState('');

  const a = entryBySlug(aSlug);
  const b = entryBySlug(bSlug);

  if (a === null || b === null)
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </View>
    );

  const metrics: CompareMetrics = compare(a, b);
  const same = a.entry.slug === b.entry.slug;

  /** A metric row: label, value, unit, and the space it was computed in. */
  function Metric({
    label,
    value,
    unit,
    space,
  }: {
    readonly label: string;
    readonly value: string;
    readonly unit?: string;
    readonly space: string;
  }): React.JSX.Element {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 6 }}>
        <View style={{ flex: 1 }}>
          <Text size="small" color="foreground" script={script}>
            {label}
          </Text>
          {/*
            The computation space, on every row. FR-48 asks for it explicitly, and it is the
            difference between a number and a claim.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {space}
          </Text>
        </View>
        {/*
          `selectable` is how a value is copyable without a button that would need its own
          label, its own state and its own place in the tap-target budget.
        */}
        <Text size="small" color="foreground" numeric selectable>
          {value}
        </Text>
        {/*
          The unit is NOT `numeric`. "Lc" and "ΔE00" are symbols, not figures — tabular-nums
          has nothing to align in them, and marking them numeric made "every tabular figure is
          selectable" fail on a node that is a label rather than a value.
        */}
        {unit === undefined ? null : (
          <Text size="xs" color="foreground.2" script={script}>
            {unit}
          </Text>
        )}
      </View>
    );
  }

  function AxisRow({
    label,
    axis,
    places,
    suffix,
  }: {
    readonly label: string;
    readonly axis: AxisDelta;
    readonly places: number;
    readonly suffix?: string;
  }): React.JSX.Element {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 4 }}>
        <Text size="small" color="foreground.2" script={script}>
          {label}
        </Text>
        <View style={{ flex: 1 }} />
        {/* Both values and the delta, in one row, so the column reads down. */}
        <Text size="xs" color="foreground.2" numeric selectable>
          {`${axis.a.toFixed(places)}${suffix ?? ''}`}
        </Text>
        <Text size="xs" color="foreground.2" numeric selectable>
          {`${axis.b.toFixed(places)}${suffix ?? ''}`}
        </Text>
        <Text size="small" color="foreground" numeric selectable>
          {`${signed(axis.delta, places)}${suffix ?? ''}`}
        </Text>
      </View>
    );
  }

  function Slot({
    label,
    entry,
    query,
    onQuery,
    onPick,
  }: {
    readonly label: string;
    readonly entry: PublishedEntry;
    readonly query: string;
    readonly onQuery: (q: string) => void;
    readonly onPick: (slug: string) => void;
  }): React.JSX.Element {
    const found = matches(query);
    return (
      <Surface level="1" padding={12}>
        <View style={{ gap: 8 }}>
          <Text size="label" color="foreground.2" script={script} heading>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Swatch
              name={entry.entry.name.en}
              hex={entry.derived.hex}
              color={colorFor(entry.entry)}
              size={56}
            />
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Text size="body" color="foreground" script={script}>
                {`${entry.entry.name.kanji} ${entry.entry.name.en}`}
              </Text>
              <Text size="small" color="foreground.2" numeric selectable>
                {entry.derived.hex}
              </Text>
            </View>
          </View>

          <SearchField label={t('compare.choose')} value={query} onChangeText={onQuery} />

          {found.map((m) => (
            <Pressable
              key={m.entry.slug}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${m.entry.name.en}`}
              onPress={() => {
                onPick(m.entry.slug);
                onQuery('');
              }}
              style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
            >
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Swatch
                  name={m.entry.name.en}
                  hex={m.derived.hex}
                  color={colorFor(m.entry)}
                  size={32}
                />
                <Text size="small" color="foreground.2" script={script}>
                  {`${m.entry.name.kanji} ${m.entry.name.en}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Surface>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('compare.title')}
      </Text>

      <Slot label={t('compare.slotA')} entry={a} query={aQuery} onQuery={setAQuery} onPick={setA} />
      <Slot label={t('compare.slotB')} entry={b} query={bQuery} onQuery={setBQuery} onPick={setB} />

      {same ? (
        <Text size="small" color="foreground.2" script={script}>
          {t('compare.sameColour')}
        </Text>
      ) : null}

      <Surface level="1" padding={16}>
        <View style={{ gap: 4 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('compare.difference')}
          </Text>
          <Metric
            label={t('compare.difference')}
            value={metrics.deltaE00.toFixed(2)}
            unit={t('unit.deltaE00')}
            space={t('space.cielab')}
          />
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 4 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('compare.perAxis')}
          </Text>
          <Text size="xs" color="foreground.2" script={script}>
            {t('space.cielab')}
          </Text>
          <AxisRow label={t('axis.labL')} axis={metrics.lab.l} places={2} />
          <AxisRow label={t('axis.labA')} axis={metrics.lab.a} places={2} />
          <AxisRow label={t('axis.labB')} axis={metrics.lab.b} places={2} />
          <Text size="xs" color="foreground.2" script={script}>
            {t('space.oklch')}
          </Text>
          <AxisRow label={t('axis.oklchL')} axis={metrics.oklch.l} places={3} />
          <AxisRow label={t('axis.oklchC')} axis={metrics.oklch.c} places={3} />
          {/*
            Degrees, and the delta is the shortest signed ARC rather than a subtraction — the
            one axis where the obvious arithmetic gives a plausible wrong answer.
          */}
          <AxisRow label={t('axis.oklchH')} axis={metrics.oklch.h} places={1} suffix="°" />
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 4 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('compare.separation')}
          </Text>
          {metrics.separation.map((s) => (
            <View key={s.deficiency} style={{ gap: 2, paddingVertical: 4 }}>
              <Text size="small" color="foreground" script={script}>
                {t(CVD_KEYS[s.deficiency])}
              </Text>
              {/*
                The DECOMPOSITION, not only the score. A number labelled "62" with nothing
                beside it is a grade nobody can check.
              */}
              <Metric
                label={t('separation.score')}
                value={`${s.score.toFixed(0)}/100`}
                space={t('space.srgb')}
              />
              <Metric
                label={t('separation.deltaE00')}
                value={s.deltaE00.toFixed(2)}
                unit={t('unit.deltaE00')}
                space={t('space.cielab')}
              />
              <Metric
                label={t('separation.lightness')}
                value={s.lightnessDifference.toFixed(2)}
                space={t('space.cielab')}
              />
            </View>
          ))}
          <Text size="xs" color="foreground.2" script={script}>
            {t('separation.severity')}
          </Text>
          <Text size="xs" color="foreground.2" script={script}>
            {t('cvd.note')}
          </Text>
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 4 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('compare.contrast')}
          </Text>
          <Metric
            label={t('contrast.wcag')}
            value={`${metrics.contrast.wcagRatio.toFixed(2)}:1`}
            space={t('space.srgb')}
          />
          <Metric
            label={t('contrast.apcaBOnA')}
            value={signed(metrics.contrast.apcaBOnA, 1)}
            unit={t('unit.lc')}
            space={t('space.srgb')}
          />
          <Metric
            label={t('contrast.apcaAOnB')}
            value={signed(metrics.contrast.apcaAOnB, 1)}
            unit={t('unit.lc')}
            space={t('space.srgb')}
          />
          {/*
            Said rather than left to be inferred: one of these is symmetric and two are not,
            and a reader who assumed otherwise would draw the wrong conclusion from the pair.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t('contrast.apcaNote')}
          </Text>
        </View>
      </Surface>
    </ScrollView>
  );
}
