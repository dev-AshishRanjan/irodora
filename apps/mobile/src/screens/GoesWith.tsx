/**
 * What Goes With This — `19` (F-252), on `/atlas/with/[slug]`.
 *
 * The colour in hand, then the corpus colours that stand in a hue relationship to it, curated first
 * (ADR-0168), each with its relationship and its ΔE00 from the anchor, and a *Wear* that opens `07`
 * with both worn (ADR-0171). *Build Complete 4-Piece Outfit* opens `07` for the anchor alone.
 *
 * - **Every word and figure is the corpus's or the engine's** (ADR-0170): `19`'s names and figures are
 *   sample content (E1). The one record outside sRGB says so after its figure (ADR-0169, rule 11).
 * - **The filter** opens `03`'s sheet with one choice in `05`'s pills (E4, ADR-0171 D5); while a
 *   relationship is chosen, *Showing n / N* and *Clear* sit on the rows heading's line.
 * - **States** (ADR-0171 D6): a colour this corpus does not hold shows the back above `00`'s caption; a
 *   colour with no row in a hue relationship (near grey) keeps its card, and `00`'s caption takes the
 *   rows' place while Build still answers.
 *
 * Composition is ADR-0172's; every drawn size is `goes-with.ts`'s, recomputed from `19.json` by
 * `goes-with-fidelity.test`.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import {
  APP_BAR_INSET,
  Appear,
  Arrival,
  Button,
  Card,
  ChoiceGroup,
  EmptyState,
  RankedRow,
  Row,
  Screen,
  Sheet,
  Swatch,
  Text,
  type MeasureFigure,
} from '@irodora/ui';
import { SEASON_PILL } from '../atlas';
import { colorFor, entryBySlug, type PublishedEntry } from '../corpus';
import { renderNote } from '../detail';
import {
  ANCHOR_RING,
  ANCHOR_SAMPLE,
  anchorName,
  anchorSlotLine,
  ARROW_GLYPH,
  BACK_GLYPH,
  BUILD,
  DIVIDER,
  distanceFigure,
  EMPTY_KEYS,
  FILTER_GLYPH,
  FILTER_KEYS,
  filterOptions,
  filterRows,
  goesWith,
  relationshipWords,
  wearName,
  WITH_APP_BAR,
  type FilterChoice,
  type GoesWithRow,
} from '../goes-with';
import { japaneseRun, type MessageKey } from '../i18n/index';
import { useMessages } from '../i18n/useMessages';
import { oklchLine } from '../notation';
import type { ScreenStates } from '../states';

/**
 * `00`'s caption takes the page where the colour is not in this corpus, and the rows' place where no
 * corpus colour stands in a hue relationship to it (ADR-0171 D6).
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

type T = (key: MessageKey) => string;
type Script = 'latin' | 'japanese';

export interface GoesWithProps {
  /** The colour in hand. A route parameter, so a miss is a state rather than a crash. */
  readonly slug: string;
  /** `19.back`: to the Atlas. */
  readonly onBack?: () => void;
  /** A row's *Wear*: `07` with the anchor and this row's colour (ADR-0171 D3). */
  readonly onWear: (row: string) => void;
  /** *Build Complete 4-Piece Outfit*: `07` for the anchor (D4). */
  readonly onBuild?: () => void;
  /** A relationship chosen at the start: a test reaches the narrowed list with it. 19 draws all. */
  readonly initialFilter?: FilterChoice;
  /** The filter's sheet open at the start: a test reaches the sheet with it. */
  readonly initialSheet?: boolean;
}

export function GoesWith({
  slug,
  onBack,
  onWear,
  onBuild,
  initialFilter = 'all',
  initialSheet = false,
}: GoesWithProps): React.JSX.Element {
  const { t, script } = useMessages();
  const anchor = useMemo(() => entryBySlug(slug), [slug]);
  const answer = useMemo(() => (anchor === null ? null : goesWith(anchor)), [anchor]);
  const [choice, setChoice] = useState<FilterChoice>(initialFilter);
  const [sheet, setSheet] = useState(initialSheet);
  const openSheet = useCallback(() => {
    setSheet(true);
  }, []);
  const clear = useCallback(() => {
    setChoice('all');
  }, []);
  const choose = useCallback((next: FilterChoice | null) => {
    setChoice(next ?? 'all');
  }, []);

  const rows = answer?.rows ?? [];
  const options = useMemo(() => filterOptions(rows), [rows]);
  // A choice the list does not hold (a test's, or a stale one) shows every row: none empties it.
  const chosen = options.includes(choice) ? choice : 'all';
  const shown = useMemo(() => filterRows(rows, chosen), [rows, chosen]);

  const bar = {
    height: WITH_APP_BAR,
    fill: 'surface.1' as const,
    rule: false,
    inset: APP_BAR_INSET,
    gap: nativeSpacing.sm,
    script,
    ...(onBack === undefined
      ? {}
      : {
          back: {
            glyph: 'back' as const,
            label: t('tab.atlas'),
            name: t('detail.backToAtlas'),
            size: BACK_GLYPH,
            onPress: onBack,
          },
        }),
  };

  if (anchor === null || answer === null)
    return (
      /*
        A COLOUR THIS CORPUS DOES NOT HOLD (ADR-0128 §6): 00's caption under the app bar, whose back is
        the way out — a second control would be a second way to do one thing.
      */
      <Screen script={script} padding="md" appBar={bar}>
        <EmptyState message={t('detail.notFound')} resolvedHere script={script} />
      </Screen>
    );

  return (
    <Screen
      script={script}
      padding="sm"
      appBar={{
        ...bar,
        // `19.header-divider` and `19.title`: the rule, then the page's name with its Japanese run.
        divider: DIVIDER,
        title: {
          text: t('with.title'),
          // In Japanese the run is the title itself (the OQ-48 interim, ADR-0170 D1).
          ...(script === 'japanese' ? {} : { ja: japaneseRun('with.title') }),
          align: 'leading',
          placement: 'bar',
          layout: 'inline',
          size: 'body',
          weight: 600,
        },
        trailing: {
          icons: [
            {
              glyph: 'filter',
              label: t('with.filter'),
              size: FILTER_GLYPH,
              onPress: openSheet,
              testID: 'with.filter',
            },
          ],
          targetRoom: true,
        },
      }}
      {...(onBuild === undefined
        ? {}
        : {
            actionBar: {
              fill: 'surface.1' as const,
              rule: true,
              padding: { top: nativeSpacing.md, side: nativeSpacing.sm, bottom: nativeSpacing.sm },
              actions: [
                {
                  variant: 'tonal' as const,
                  level: 3 as const,
                  label: t('with.build'),
                  glyph: 'arrow-right' as const,
                  glyphSize: ARROW_GLYPH,
                  // *4-Piece* is a figure: tabular, as every figure (FR-48, C9).
                  numeric: true,
                  height: BUILD,
                  radius: 'sm' as const,
                  script,
                  onPress: onBuild,
                  testID: 'with.build',
                },
              ],
              script,
            },
          })}
    >
      {/* `19.anchor.heading`: at md from the screen's edge, the page's sm plus sm. */}
      <View style={{ paddingHorizontal: nativeSpacing.sm }}>
        <Text
          size="label"
          weight={500}
          color="foreground.2"
          script={script}
          heading
          testID="with.anchor.heading"
        >
          {t('with.anchorHeading')}
        </Text>
      </View>
      <View style={{ marginTop: nativeSpacing.xs }}>
        <AnchorCard anchor={anchor} t={t} script={script} />
      </View>

      {/*
        THE ROWS HEADING, AND WHAT NARROWS THE LIST BESIDE IT (05's line, ADR-0171 D5): *Showing n / N*
        and *Clear* sit at its trailing end only while a relationship is chosen.
      */}
      {/* The card → the rows heading: 24.5 dp less the label's line inset, lg (ADR-0172 D1). */}
      <View style={{ marginTop: nativeSpacing.lg, paddingHorizontal: nativeSpacing.sm }}>
        <Row justify="between" align="center" gap="sm" wrap testID="with.rows.heading.row">
          <Text
            size="label"
            weight={500}
            color="foreground.2"
            script={script}
            heading
            testID="with.rows.heading"
          >
            {t('with.rowsHeading')}
          </Text>
          {chosen === 'all' ? null : (
            <Row align="center" gap="sm">
              <Text
                size="caption"
                color="foreground.2"
                script={script}
                numeric
                testID="with.showing"
              >
                {`${t('atlas.showing')} ${String(shown.length)} / ${String(rows.length)}`}
              </Text>
              <Button
                label={t('atlas.clear')}
                variant="plain"
                step="caption"
                script={script}
                onPress={clear}
                testID="with.clear"
              />
            </Row>
          )}
        </Row>
      </View>

      <View style={{ marginTop: nativeSpacing.xs }}>
        {answer.rows.filter((r) => r.source === 'geometric').length === 0 ? (
          <View style={{ marginBottom: rows.length === 0 ? 0 : nativeSpacing.sm }}>
            <EmptyState
              message={t(EMPTY_KEYS[answer.chromatic ? 'none' : 'nearGrey'])}
              hint={t('with.emptyHint')}
              resolvedHere
              script={script}
            />
          </View>
        ) : null}
        <Arrival>
          <View style={{ gap: nativeSpacing.sm }}>
            {shown.map((row, i) => (
              <Appear key={row.entry.entry.slug} index={i}>
                <GoesWithRow
                  row={row}
                  index={i}
                  anchor={anchor}
                  onWear={onWear}
                  t={t}
                  script={script}
                />
              </Appear>
            ))}
          </View>
        </Arrival>
      </View>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        options={options}
        value={chosen}
        onChange={choose}
        t={t}
        script={script}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ the anchor */

interface AnchorCardProps {
  readonly anchor: PublishedEntry;
  readonly t: T;
  readonly script: Script;
}

/**
 * `19.anchor`: the ring around the sample, then the name, the OKLCh line and the slot line, centred on
 * the ring (ADR-0172 D3). The sample is an image named by the name; it does nothing.
 */
const AnchorCard = memo(function AnchorCard({
  anchor,
  t,
  script,
}: AnchorCardProps): React.JSX.Element {
  const note = renderNote(anchor, t);
  const oklch = oklchLine(anchor.derived.oklch, t('coord.oklch'), ': ');
  const name = anchorName(anchor);
  return (
    <Card level="1" padding="md" radius="md" testID="with.anchor">
      <Row gap="md" align="center">
        <Swatch
          anchor={ANCHOR_RING}
          width={ANCHOR_SAMPLE.width}
          height={ANCHOR_SAMPLE.height}
          corner="sm"
          keyline={false}
          name={name}
          hex={anchor.derived.hex}
          color={colorFor(anchor.entry)}
          testID="with.anchor.swatch"
        />
        {/* name → OKLCh → slot at `xs`: tighter than the scale, named (ADR-0172 D1). */}
        <View style={{ flex: 1, gap: nativeSpacing.xs }}>
          <Text size="body" weight={500} color="foreground" numeric testID="with.anchor.name">
            <Text size="body" weight={500} color="foreground" script="japanese">
              {anchor.entry.name.kanji}
            </Text>
            {name.slice(anchor.entry.name.kanji.length)}
          </Text>
          <Text size="label" color="foreground.2" numeric testID="with.anchor.oklch">
            {oklch}
            {/* The note in the locale's own face: in Japanese it is Japanese words (F-152). */}
            {note === null ? null : (
              <Text size="label" color="foreground.2" script={script} numeric>
                {` • ${note}`}
              </Text>
            )}
          </Text>
          <Text size="label" color="foreground.2" script={script} testID="with.anchor.slot">
            {anchorSlotLine(t, script)}
          </Text>
        </View>
      </Row>
    </Card>
  );
});

/* ------------------------------------------------------------------ a row */

interface RowProps {
  readonly row: GoesWithRow;
  readonly index: number;
  readonly anchor: PublishedEntry;
  readonly onWear: (row: string) => void;
  readonly t: T;
  readonly script: Script;
}

/** `19.rows.row-N`: `RankedRow`'s harmony form, its Wear carrying the row's slug. */
const GoesWithRow = memo(function GoesWithRow({
  row,
  index,
  anchor,
  onWear,
  t,
  script,
}: RowProps): React.JSX.Element {
  const slug = row.entry.entry.slug;
  const wear = useCallback(() => {
    onWear(slug);
  }, [onWear, slug]);
  const distance: MeasureFigure = {
    kind: 'measure',
    value: distanceFigure(row),
    places: 1,
    quantity: 'ΔE00',
    space: 'CIEDE2000',
  };
  const note = renderNote(row.entry, t);
  return (
    <RankedRow
      form="harmony"
      sample={{
        name: row.entry.entry.name.en,
        hex: row.entry.derived.hex,
        color: colorFor(row.entry.entry),
      }}
      name={row.entry.entry.name.en}
      ja={row.entry.entry.name.kanji}
      relationship={relationshipWords(row, t, script)}
      distance={distance}
      {...(note === null ? {} : { note })}
      action={{
        label: t('with.wear'),
        name: wearName(row.entry, anchor, t, script),
        onPress: wear,
      }}
      script={script}
      testID={`with.row.${String(index)}`}
    />
  );
});

/* ------------------------------------------------------------------ the filter */

interface FilterSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly options: readonly FilterChoice[];
  readonly value: FilterChoice;
  readonly onChange: (value: FilterChoice | null) => void;
  readonly t: T;
  readonly script: Script;
}

/** `03`'s floating sheet, one choice in `05`'s pills, the chosen one dotted (ADR-0171 D5, ADR-0141). */
const FilterSheet = memo(function FilterSheet({
  open,
  onOpenChange,
  options,
  value,
  onChange,
  t,
  script,
}: FilterSheetProps): React.JSX.Element {
  return (
    <Sheet
      form="floating"
      open={open}
      onOpenChange={onOpenChange}
      title={t('with.filterTitle')}
      closeLabel={t('atlas.facetsClose')}
      handleLabel={t('atlas.facetsHandle')}
      handleHint={t('atlas.facetsHandleHint')}
      testID="with.sheet"
    >
      <ChoiceGroup
        label={t('with.filterTitle')}
        options={options.map((o) => ({ value: o, label: t(FILTER_KEYS[o]) }))}
        value={value}
        onChange={onChange}
        pills={{
          height: SEASON_PILL,
          selectedFill: 'accent',
          selectedEdge: false,
          size: 'caption',
          gap: 'xs',
        }}
        script={script}
        testID="with.filter.choice"
      />
    </Sheet>
  );
});
