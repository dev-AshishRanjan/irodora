/**
 * Browse the wardrobe, and correct a garment (FR-41, F-122).
 *
 * ## What was missing, and how it stayed missing
 *
 * `app/wardrobe/` held exactly one route — `add.tsx`. A garment could be created and then never
 * seen again, and a price typed once at creation could never be corrected. FR-41 was recorded in
 * `REQUIREMENTS-COVERAGE.md` as covered by **F-042**, which built the schema and the repository:
 * real work, verified by `e2e, a11y` — two gates that **cannot apply to a package**. So the
 * requirement was marked delivered by something that could not have delivered it, and nothing
 * disagreed [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 *
 * ## The grouping is not decided here
 *
 * `groupByColour` in [`../wardrobe/browse.ts`](../wardrobe/browse.ts) decides it, the way
 * `draftProblem` decides saveability for the Add screen and `palette.ts` does for the Studio.
 * This file draws the answer. A screen that grouped colours itself would be a second opinion on
 * a question `nearestByLab` already answers, and the copy would drift from the code.
 *
 * ## Colour is never the only channel
 *
 * Every group carries its **family word** as a heading, and every garment its **type** as text.
 * Somebody who cannot separate two of these greens still reads two headings, and the swatch's
 * accessible name carries the hex and the provenance besides. That is not a nicety here — the
 * whole screen is an argument about colour, which makes it the easiest place in the app to build
 * something that means nothing without it.
 *
 * ## The editor is a state, not a route
 *
 * "Opened" in the ordinary sense. It also keeps **both branches renderable by the conformance
 * registry** without mounting a navigator, which is what gates 8 and 9 actually check — a second
 * route would put the editing branch beyond the reach of the accessibility suite.
 *
 * ## What this screen must not do
 *
 * Report a distance. A garment is *in* a group; printing "ΔE00 4.2 from ai-iro" beside a jumper
 * would present a measurement as a property of the garment, which is FR-13's rule about naming a
 * capture, one level along.
 */

import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Chip,
  Surface,
  Swatch,
  swatchAccessibleName,
  Text,
  TextField,
  useTheme,
} from '@irodora/ui';
import { GARMENT_SEASONS, type GarmentEnrichment, type StoredGarment } from '@irodora/store';
import {
  filterGarments,
  filterOptions,
  groupByColour,
  NO_FILTER,
  textPatch,
  UNGROUPED,
  type WardrobeFilter,
} from '../wardrobe/browse';
import { colorOf } from '../wardrobe';
import { costEntry, minorToMajor, type CostEntryProblem } from '../wardrobe/cost';
import { familyLabel } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/**
 * What browsing and editing need from the store, and nothing else.
 *
 * Structurally identical to `WearStore`, and deliberately **not** the same type. They are the
 * same two methods for different reasons, and a shared port would make its consumers constrain
 * each other: the day this editor needs `deleteGarment`, widening a merged type would hand the
 * outfit builder a delete it must not have. Narrow ports are cheap; a wrong one is not.
 */
export interface BrowseStore {
  enrichGarment(id: string, patch: GarmentEnrichment, now: number): void;
  listGarments(): readonly StoredGarment[];
}

/** Why a typed price was not recorded. Total, so a new problem is a compile error. */
const COST_PROBLEM_KEYS = {
  noAmount: 'wardrobe.costNoAmount',
  badAmount: 'wardrobe.costBadAmount',
  badCurrency: 'wardrobe.costBadCurrency',
  tooPrecise: 'wardrobe.costTooPrecise',
} as const satisfies Record<CostEntryProblem, MessageKey>;

/**
 * Season → the word the Atlas already uses for it (F-131).
 *
 * Total over `GARMENT_SEASONS`, so a fifth season added to the schema is a compile error here
 * rather than a chip with no label.
 */
const SEASON_KEYS = {
  spring: 'season.spring',
  summer: 'season.summer',
  autumn: 'season.autumn',
  winter: 'season.winter',
} as const satisfies Record<(typeof GARMENT_SEASONS)[number], MessageKey>;

/** The seven text fields, in the order they are drawn. One list, so the form cannot disagree. */
const TEXT_FIELDS = [
  { key: 'name', label: 'browse.name', hint: 'browse.nameHint' },
  { key: 'pattern', label: 'browse.pattern', hint: 'browse.patternHint' },
  { key: 'material', label: 'browse.material', hint: 'browse.materialHint' },
  { key: 'formality', label: 'browse.formality', hint: 'browse.formalityHint' },
  { key: 'brand', label: 'wardrobe.brand', hint: null },
  { key: 'size', label: 'wardrobe.size', hint: null },
  { key: 'purchaseDate', label: 'browse.purchaseDate', hint: 'browse.purchaseDateHint' },
] as const satisfies readonly {
  readonly key: keyof GarmentEnrichment;
  readonly label: MessageKey;
  readonly hint: MessageKey | null;
}[];

type TextFieldKey = (typeof TEXT_FIELDS)[number]['key'];

/** Nothing open, nothing typed. Derived from the list, so a new field cannot be forgotten here. */
const EMPTY_TEXT = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, ''])) as Record<
  TextFieldKey,
  string
>;

/** The form's text, seeded from what is stored. `null` in the store is an empty field. */
function seedText(garment: StoredGarment): Record<TextFieldKey, string> {
  return {
    name: garment.name ?? '',
    pattern: garment.pattern ?? '',
    material: garment.material ?? '',
    formality: garment.formality ?? '',
    brand: garment.brand ?? '',
    size: garment.size ?? '',
    purchaseDate: garment.purchaseDate ?? '',
  };
}

/**
 * One axis of the filter, as a row of chips (F-131).
 *
 * Modelled on the Atlas's own filter row, and `Chip` rather than a control built here: an
 * interactive control assembled inside a screen is checked by nothing — the conformance registry
 * exercises focus, active and disabled states for components registered in `packages/ui`, and a
 * hand-rolled Pressable has none of that.
 *
 * **Choosing the selected chip clears the axis**, so every axis can be widened again without a
 * separate control per row. The "all" chip says the same thing for a reader who does not know
 * that.
 */
function FilterRow<K extends string>({
  label,
  options,
  selected,
  onChange,
  allLabel,
  script,
}: {
  readonly label: string;
  readonly options: readonly { readonly value: K; readonly label: string }[];
  readonly selected: K | null;
  readonly onChange: (value: K | null) => void;
  readonly allLabel: string;
  readonly script: 'latin' | 'japanese';
}): React.JSX.Element | null {
  // An axis the wardrobe carries no values for is not drawn. A row with only "all" in it is a
  // control that cannot do anything, and it reads as a feature that is broken rather than absent.
  if (options.length === 0) return null;

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
          label={allLabel}
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

export interface WardrobeProps {
  readonly store: BrowseStore;
  /**
   * A garment to open on arrival.
   *
   * The registry uses it to render the editing branch, which is otherwise reachable only through
   * a tap the static conformance suite never performs — and an unrendered branch is one whose
   * contrast and accessibility nothing has checked.
   */
  readonly initialSelected?: string | null;
  /**
   * A filter to arrive with (F-131).
   *
   * The registry uses it to render the narrowed and the nothing-matches branches, which are
   * otherwise reachable only through a tap the static conformance suite never performs.
   */
  readonly initialFilter?: WardrobeFilter;
}

export function Wardrobe({
  store,
  initialSelected = null,
  initialFilter = NO_FILTER,
}: WardrobeProps): React.JSX.Element {
  const { t, script, locale } = useMessages();
  const { colors } = useTheme();

  const [garments, setGarments] = useState<readonly StoredGarment[]>(() => store.listGarments());
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<WardrobeFilter>(initialFilter);

  const selected = garments.find((g) => g.id === selectedId) ?? null;

  /*
   * FILTER, THEN GROUP — and never the other way round (F-131, criterion 3).
   *
   * `groupByColour` takes a list and returns groups, which is what F-122 built it for: the
   * filter composes in front of it and the grouping needs no idea that filtering exists. A
   * screen that grouped first and then dropped garments from the groups would leave empty
   * groups behind, and their headings would name colours the reader can no longer see.
   */
  const shown = useMemo(() => filterGarments(garments, filter), [garments, filter]);
  const groups = useMemo(() => groupByColour(shown), [shown]);

  /*
   * The options come from the WHOLE wardrobe, not from what is currently shown.
   *
   * Deriving them from `shown` would make a chip disappear the moment it was used, so the
   * filter could be narrowed but never widened without clearing — the classic self-erasing
   * filter bar.
   */
  const options = useMemo(() => filterOptions(garments), [garments]);
  const narrowed = filter.type !== null || filter.season !== null || filter.formality !== null;

  const [text, setText] = useState<Record<TextFieldKey, string>>(() =>
    selected === null ? EMPTY_TEXT : seedText(selected),
  );
  const [amountText, setAmountText] = useState(() =>
    selected?.costMinor != null && selected.currency !== null
      ? minorToMajor(selected.costMinor, selected.currency)
      : '',
  );
  const [currencyText, setCurrencyText] = useState(() => selected?.currency ?? '');

  const open = useCallback((garment: StoredGarment) => {
    setSelectedId(garment.id);
    setText(seedText(garment));
    setAmountText(
      garment.costMinor != null && garment.currency !== null
        ? minorToMajor(garment.costMinor, garment.currency)
        : '',
    );
    setCurrencyText(garment.currency ?? '');
    setSaved(false);
  }, []);

  const money = costEntry(amountText, currencyText);
  // Silent until somebody has typed. An empty optional field is not a mistake, and a form that
  // opened complaining about the commonest case would be wrong about it.
  const moneyTyped = amountText.trim() !== '' || currencyText.trim() !== '';
  const moneyProblem = moneyTyped && !money.ok ? money.problem : null;

  const save = useCallback(() => {
    if (selected === null) return;

    /*
     * Every text field, each through `textPatch` — which writes `null` for an emptied one.
     * `GarmentEnrichment` reads `undefined` as *leave it* and `null` as *erase it*, so writing
     * `''` would store an empty brand where somebody meant to remove one.
     */
    let patch: GarmentEnrichment = {};
    for (const field of TEXT_FIELDS) patch = { ...patch, ...textPatch(field.key, text[field.key]) };

    /*
     * The price is written only when it parsed, or cleared only when the field is empty.
     *
     * A typed price that `costEntry` refuses writes NOTHING — neither the old value nor a half —
     * because a cost with no currency is a number nobody can read back (E-052, F-051). The
     * sentence beside the field says why while it can still be fixed.
     */
    if (money.ok) patch = { ...patch, ...money.patch };
    else if (!moneyTyped) patch = { ...patch, costMinor: null, currency: null };

    const now = Date.now();
    store.enrichGarment(selected.id, patch, now);
    setGarments(store.listGarments());
    setSaved(true);
  }, [money, moneyTyped, selected, store, text]);

  if (selected !== null)
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        <Text size="title" color="foreground" script={script} heading>
          {t('browse.editing')}
        </Text>

        <Surface level="1" padding={12}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Swatch
              name={swatchAccessibleName(
                selected.color.name,
                selected.color.hex,
                colorOf(selected.color),
              )}
              hex={selected.color.hex}
              color={colorOf(selected.color)}
              size={56}
            />
            <Text size="body" color="foreground" script={script}>
              {selected.type}
            </Text>
          </View>
        </Surface>

        <Text size="small" color="foreground.2" script={script}>
          {t('browse.clearing')}
        </Text>

        {TEXT_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={t(field.label)}
            /*
              SPREAD, not `hint={undefined}`. `exactOptionalPropertyTypes` is on, so an explicit
              `undefined` is not the same as an absent property — and a field is complete without
              a hint, which is exactly why the prop is optional.
            */
            {...(field.hint === null ? {} : { hint: t(field.hint) })}
            script={script}
            value={text[field.key]}
            onChangeText={(next) => {
              setText((current) => ({ ...current, [field.key]: next }));
              setSaved(false);
            }}
          />
        ))}

        <TextField
          label={t('wardrobe.cost')}
          hint={t('wardrobe.costHint')}
          script={script}
          value={amountText}
          onChangeText={(next) => {
            setAmountText(next);
            setSaved(false);
          }}
        />
        <TextField
          label={t('wardrobe.currency')}
          hint={t('wardrobe.currencyHint')}
          script={script}
          value={currencyText}
          onChangeText={(next) => {
            setCurrencyText(next);
            setSaved(false);
          }}
        />
        {moneyProblem === null ? null : (
          <Text size="small" color="foreground.2" script={script}>
            {t(COST_PROBLEM_KEYS[moneyProblem])}
          </Text>
        )}

        <Button label={t('browse.save')} onPress={save} />
        {!saved ? null : (
          <Text size="small" color="foreground.2" script={script}>
            {t('browse.saved')}
          </Text>
        )}
        <Button
          label={t('browse.back')}
          variant="secondary"
          onPress={() => {
            setSelectedId(null);
            setSaved(false);
          }}
        />
      </ScrollView>
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('browse.title')}
      </Text>

      {/*
        THE CONTROLS COME BEFORE THE RESULT, and are drawn whenever there is a wardrobe at all —
        including when the filter matches nothing, because a filter bar that disappeared with its
        own result would leave somebody unable to clear it.
      */}
      {garments.length === 0 ? null : (
        <Surface level="1" padding={12}>
          <View style={{ gap: 12 }}>
            <Text size="body" color="foreground" script={script} heading>
              {t('browse.filters')}
            </Text>

            <FilterRow
              label={t('browse.filterType')}
              options={options.types.map((v) => ({ value: v, label: v }))}
              selected={filter.type}
              onChange={(type) => {
                setFilter((f) => ({ ...f, type }));
              }}
              allLabel={t('atlas.all')}
              script={script}
            />
            <FilterRow
              label={t('browse.filterSeason')}
              options={GARMENT_SEASONS.map((v) => ({ value: v, label: t(SEASON_KEYS[v]) }))}
              selected={filter.season}
              onChange={(season) => {
                setFilter((f) => ({ ...f, season }));
              }}
              allLabel={t('atlas.all')}
              script={script}
            />
            <FilterRow
              label={t('browse.filterFormality')}
              options={options.formalities.map((v) => ({ value: v, label: v }))}
              selected={filter.formality}
              onChange={(formality) => {
                setFilter((f) => ({ ...f, formality }));
              }}
              allLabel={t('atlas.all')}
              script={script}
            />

            {/*
              WHAT IS CURRENTLY APPLIED, said in words (criterion 1). The selected chips carry it
              visually; a reader using a screen reader meets them one at a time and would have to
              hold three rows in their head to know what they were looking at.
            */}
            {!narrowed ? null : (
              <>
                <Text size="small" color="foreground.2" script={script}>
                  {`${t('browse.filterApplied')}: ${[
                    filter.type,
                    filter.season === null ? null : t(SEASON_KEYS[filter.season]),
                    filter.formality,
                  ]
                    .filter((v) => v !== null)
                    .join(' · ')}`}
                </Text>
                <Button
                  label={t('atlas.clear')}
                  variant="secondary"
                  onPress={() => {
                    setFilter(NO_FILTER);
                  }}
                />
              </>
            )}
          </View>
        </Surface>
      )}

      {garments.length === 0 ? (
        <>
          <Text size="body" color="foreground" script={script}>
            {t('browse.empty')}
          </Text>
          <Text size="small" color="foreground.2" script={script}>
            {t('browse.emptyHint')}
          </Text>
        </>
      ) : groups.length === 0 ? (
        /*
          NOTHING MATCHES IS NOT AN EMPTY WARDROBE (criterion 2). Two different situations with
          two different things to do about them — one is "add a garment", the other is "clear a
          filter" — and a screen that showed one sentence for both would send somebody to add a
          coat they already own.
        */
        <>
          <Text size="body" color="foreground" script={script}>
            {t('browse.filterNone')}
          </Text>
          <Text size="small" color="foreground.2" script={script}>
            {t('browse.filterNoneHint')}
          </Text>
        </>
      ) : (
        <>
          {/*
            Says what the grouping IS, rather than letting a reader infer that the app has decided
            each garment's colour has a name. It has decided which published colours it sits
            nearest to, which is a weaker and true claim (ADR-0031).
          */}
          <Text size="small" color="foreground.2" script={script}>
            {t('browse.grouping')}
          </Text>

          {groups.map((group) => (
            <Surface key={group.family} level="1" padding={12}>
              <View style={{ gap: 12 }}>
                {/*
                  THE HEADING IS THE SECOND CHANNEL. A reader who cannot separate two of these
                  greens still reads two family words, and navigates between them by heading.
                */}
                <Text size="body" color="foreground" script={script} heading>
                  {group.family === UNGROUPED
                    ? t('browse.ungrouped')
                    : familyLabel(group.family, locale)}
                </Text>
                <Text size="small" color="foreground.2" script={script}>
                  {`${t('browse.count')}: ${String(group.garments.length)}`}
                </Text>

                {group.garments.map((garment) => (
                  <View
                    key={garment.id}
                    style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
                  >
                    <Swatch
                      name={swatchAccessibleName(
                        garment.color.name,
                        garment.color.hex,
                        colorOf(garment.color),
                      )}
                      hex={garment.color.hex}
                      color={colorOf(garment.color)}
                      size={44}
                    />
                    <View style={{ gap: 4, flexShrink: 1 }}>
                      <Text size="body" color="foreground" script={script}>
                        {garment.name ?? garment.type}
                      </Text>
                      {garment.name === null ? null : (
                        <Text size="small" color="foreground.2" script={script}>
                          {garment.type}
                        </Text>
                      )}
                    </View>
                    <Button
                      label={t('browse.edit')}
                      variant="secondary"
                      onPress={() => {
                        open(garment);
                      }}
                    />
                  </View>
                ))}
              </View>
            </Surface>
          ))}
        </>
      )}
    </ScrollView>
  );
}
