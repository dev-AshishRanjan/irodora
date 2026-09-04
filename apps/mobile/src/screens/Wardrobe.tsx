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
import { Image, Pressable, SectionList, ScrollView, View } from 'react-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import {
  Bands,
  Button,
  Chip,
  EmptyState,
  Row,
  Screen,
  Stack,
  Surface,
  Swatch,
  swatchAccessibleName,
  Text,
  TextField,
  type Script,
} from '@irodora/ui';
import { GARMENT_SEASONS, type GarmentEnrichment, type StoredGarment } from '@irodora/store';
import type { Coverage, Gap } from '@irodora/optimization';
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
import { galleryImages, type GarmentImageStore, type GarmentImageUri } from '../wardrobe/gallery';
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
export interface BrowseStore extends GarmentImageStore {
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
    </Stack>
  );
}

export interface WardrobeProps {
  readonly store: BrowseStore;
  /**
   * What the wardrobe combines into, already computed.
   *
   * PASSED RATHER THAN COMPUTED HERE, and the reason is what this screen is for: it shows a
   * wardrobe, it does not score one. `coverage()` needs a profile, a reference set, the rule
   * set and the weights — four things a gallery has no business assembling, and the route
   * already assembles them for `Shopping`.
   *
   * Optional because it is genuinely absent: without a profile there is nothing to count
   * against, and the section is not drawn rather than drawn empty.
   */
  readonly coverage?: Coverage | undefined;
  /** The regions that would add the most, already computed. Same reasoning as {@link coverage}. */
  readonly gaps?: readonly Gap[] | undefined;
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
  /**
   * Go to the screen that adds a garment (F-139).
   *
   * `/wardrobe/add` existed as a route and the ONLY thing linking to it was the Lens, after a
   * successful camera reading — so a person who opened the wardrobe directly could not put
   * anything in it, and while the frame processor was throwing on every frame (F-138) there was
   * no way at all.
   *
   * Optional, and the ROUTE supplies it, which is the convention `Home` uses for ten
   * destinations: a screen that called `router.push` itself could not be rendered by the
   * conformance suite, which is where the accessibility guarantees are actually checked.
   */
  readonly onAddGarment?: (() => void) | undefined;
}

/**
 * How many cells fit across. Two, and the reason is the subject rather than the screen.
 *
 * A garment photograph has to be big enough to recognise the garment — not the category, the
 * GARMENT, the one in the wardrobe. Three across on a phone is a thumbnail grid, which is a
 * different product: it answers "how many do I have" rather than "which one is that".
 */
/**
 * How garments are bucketed by how many outfits they appear in.
 *
 * FIVE BUCKETS BECAUSE THE RAMP HAS FIVE STEPS — not the other way round. The ramp is a fixed
 * design decision (`chart.1`–`chart.5`) and the buckets are chosen to fit it, because a chart
 * that needed a sixth tone would be asking the design system to move for a convenience.
 *
 * THE EDGES ARE FIXED AND STATED. Deriving them from the data would make two wardrobes
 * incomparable and would make the chart change shape as garments were added — which reads as
 * the wardrobe changing when only the scale did. They are round numbers a person can hold: none,
 * a few, several, many, most.
 */
const BANDS = [
  { key: 'browse.band.none', upTo: 0 },
  { key: 'browse.band.few', upTo: 3 },
  { key: 'browse.band.some', upTo: 9 },
  { key: 'browse.band.many', upTo: 24 },
  { key: 'browse.band.most', upTo: Number.POSITIVE_INFINITY },
] as const satisfies readonly { readonly key: MessageKey; readonly upTo: number }[];

/**
 * Count the garments in each band.
 *
 * Exported so it can be tested without rendering: the bucketing is the part with edges, and an
 * off-by-one at a boundary is invisible in a bar and obvious in a number.
 */
export function coverageBands(perGarment: ReadonlyMap<string, number>): readonly number[] {
  const counts = BANDS.map(() => 0);
  for (const outfits of perGarment.values()) {
    const at = BANDS.findIndex((b) => outfits <= b.upTo);
    // `findIndex` cannot miss: the last band's ceiling is infinity. Guarded anyway, because a
    // silent `-1` would write to the end of the array and lose a garment.
    if (at >= 0) counts[at] = (counts[at] ?? 0) + 1;
  }
  return counts;
}

const COLUMNS = 2;

/** The swatch on a cell. Large enough to judge against the photograph it sits on. */
const CELL_SWATCH = 32;

interface CellProps {
  readonly garment: StoredGarment;
  readonly uri: GarmentImageUri;
  readonly label: string;
  readonly script: Script;
  readonly onPress: () => void;
}

/**
 * One garment in the gallery.
 *
 * ## The whole cell opens the editor
 *
 * It used to be a row with a secondary `Button` marked "Edit" beside it, so a wardrobe of forty
 * garments carried forty buttons. **A gallery cell that needs a separate control to open it is a
 * list with pictures** — and the button was also the thing that fixed the row height, which is
 * why the swatch was 44px.
 *
 * ## The photograph is the ground and the colour sits on it
 *
 * Which is criterion 1, and it is also the honest order: the photograph says which garment this
 * is, and the swatch says what colour the product MEASURED — a distinction that matters, because
 * a photograph is not a colour reading and must never be read as one. They are drawn as two
 * things for that reason rather than blended into one.
 *
 * `Swatch` is unchanged, so the mandatory neutral well comes with it. That well is doing more
 * work here than anywhere else in the product: the surround is an arbitrary photograph, which is
 * the worst case for simultaneous contrast.
 *
 * ## Without a photograph the colour becomes the cell
 *
 * Not a placeholder icon and not an empty frame. A garment with no picture still has the thing
 * the product is about, and showing it at cell scale is a complete presentation rather than a
 * degraded one.
 */
function GarmentCell({ garment, uri, label, script, onPress }: CellProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1 / COLUMNS }}
    >
      <Stack gap="sm">
        <View style={{ aspectRatio: 1, overflow: 'hidden', borderRadius: nativeRadius.md }}>
          {uri === null ? (
            <Swatch
              name={swatchAccessibleName(
                garment.color.name,
                garment.color.hex,
                colorOf(garment.color),
              )}
              hex={garment.color.hex}
              color={colorOf(garment.color)}
              size={CELL_PHOTO}
            />
          ) : (
            <>
              <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                // `cover`, so a garment shot in portrait is not letterboxed into a square with
                // bands of ground either side — the cell is a window onto the photograph rather
                // than a frame around it.
                resizeMode="cover"
                // The photograph is DECORATIVE to a screen reader: the cell already carries an
                // accessible name naming the garment and its measured colour, and a second
                // announcement of "image" adds nothing a person can act on.
                accessible={false}
              />
              <View
                style={{ position: 'absolute', left: nativeSpacing.sm, bottom: nativeSpacing.sm }}
              >
                <Swatch
                  name={swatchAccessibleName(
                    garment.color.name,
                    garment.color.hex,
                    colorOf(garment.color),
                  )}
                  hex={garment.color.hex}
                  color={colorOf(garment.color)}
                  size={CELL_SWATCH}
                />
              </View>
            </>
          )}
        </View>
        <Text size="small" color="foreground" script={script}>
          {garment.name ?? garment.type}
        </Text>
      </Stack>
    </Pressable>
  );
}

/** The colour a photo-less cell is drawn at. Square, to match a photographed cell exactly. */
const CELL_PHOTO = 160;

export function Wardrobe({
  store,
  coverage,
  gaps,
  initialSelected = null,
  initialFilter = NO_FILTER,
  onAddGarment,
}: WardrobeProps): React.JSX.Element {
  const { t, script, locale } = useMessages();

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
   * THE IMAGE ACCESSOR, held for the life of this screen.
   *
   * Not a module-level cache: that would outlive the wardrobe it describes and hand a stale
   * photograph to a garment whose picture had changed. `useMemo` on `store` because the store
   * is the thing it reads through — a new store is a different wardrobe.
   */
  const images = useMemo(() => galleryImages(store), [store]);

  /**
   * The groups, chunked into rows of {@link COLUMNS}.
   *
   * The chunking is here rather than in the renderer so that a section's row count is a fact
   * about the data — which is what `SectionList` keys and virtualises on.
   */
  const sections = useMemo(
    () =>
      groups.map((group) => {
        const rows: StoredGarment[][] = [];
        for (let i = 0; i < group.garments.length; i += COLUMNS)
          rows.push([...group.garments.slice(i, i + COLUMNS)]);
        return {
          title:
            group.family === UNGROUPED ? t('browse.ungrouped') : familyLabel(group.family, locale),
          count: group.garments.length,
          data: rows,
        };
      }),
    [groups, locale, t],
  );

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
      <Screen title={t('browse.editing')} script={script}>
        <Surface level="1" padding="md">
          <Row gap="lg">
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
          </Row>
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
      </Screen>
    );

  return (
    <Screen title={t('browse.title')} script={script}>
      {/*
        THE PERSISTENT ADD, and it is not the same thing as the empty state's (F-139).
        An empty-state button gets the FIRST garment in. This is how the second one gets in —
        without it, adding remains a thing you can only do once, or through the Lens.

        DRAWN ONLY WHEN THERE IS SOMETHING HERE, and the first draft got that wrong: with both
        controls rendered an empty wardrobe had TWO buttons carrying the accessible name "Add a
        garment", which a screen reader announces twice and which the suite caught as
        "Found multiple elements with accessibility label". One affordance per screen — the
        empty state owns it when the wardrobe is empty, this owns it afterwards.
      */}
      {garments.length === 0 || onAddGarment === undefined ? null : (
        <View style={{ alignItems: 'flex-start' }}>
          <Button label={t('browse.add')} variant="secondary" onPress={onAddGarment} />
        </View>
      )}

      {/*
        THE CONTROLS COME BEFORE THE RESULT, and are drawn whenever there is a wardrobe at all —
        including when the filter matches nothing, because a filter bar that disappeared with its
        own result would leave somebody unable to clear it.
      */}
      {garments.length === 0 ? null : (
        <Surface level="1" padding="md">
          <Stack gap="md">
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
          </Stack>
        </Surface>
      )}

      {garments.length === 0 ? (
        /*
          AN EMPTY WARDROBE NOW OFFERS THE WAY TO FILL IT (F-139). The hint said "add a garment"
          and there was nothing to press; the only route to `/wardrobe/add` was through the
          Lens. `EmptyState`'s props are a union, so this could not have been written without
          declaring whether the action is here or elsewhere.
        */
        onAddGarment === undefined ? (
          <EmptyState
            message={t('browse.empty')}
            hint={t('browse.emptyHint')}
            script={script}
            resolvedHere
          />
        ) : (
          <EmptyState
            message={t('browse.empty')}
            hint={t('browse.emptyHint')}
            script={script}
            action={{ label: t('browse.add'), onPress: onAddGarment }}
          />
        )
      ) : groups.length === 0 ? (
        /*
          NOTHING MATCHES IS NOT AN EMPTY WARDROBE (criterion 2). Two different situations with
          two different things to do about them — one is "add a garment", the other is "clear a
          filter" — and a screen that showed one sentence for both would send somebody to add a
          coat they already own.
        */
        /*
          THE ACTION IS ON THIS SCREEN, so `resolvedHere` (F-139). Clearing the filter is a
          control the bar above already draws — offering "add a garment" here would send
          somebody to buy a coat they already own.
        */
        <EmptyState
          message={t('browse.filterNone')}
          hint={t('browse.filterNoneHint')}
          script={script}
          resolvedHere
        />
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

          {/*
            COVERAGE AND GAPS (criterion 3) — the first chart in the product.

            `chart.1`–`chart.5` had been emitted and unread since F-048 with the reason "there is
            no chart in the product", and this feature was named as the one that would change
            that. The ramp is near-achromatic on purpose: a data series must stay separable
            without hue (golden rule 13), and that was decided before there was anything to plot
            so it could not be decided under deadline.

            NEVER BY COLOUR ALONE. Every band carries its own words and its own number, so the
            whole reading survives with the bars removed — which is not a fallback but the
            primary text.

            BOTH NOTES ARE LOAD-BEARING, not hedging. `valid` is a count at a threshold this
            build chose, and `wouldUnlock` is a projection from a synthetic colour at a region's
            centre — there is no such garment. Golden rule 11 applies to a chart as much as to a
            sentence.
          */}
          {coverage === undefined ? null : (
            <Surface level="1" padding="md">
              <Stack gap="md">
                <Text size="body" color="foreground" script={script} heading>
                  {t('browse.coverage')}
                </Text>
                {garments.length < 2 ? (
                  <Text size="small" color="foreground.2" script={script}>
                    {t('browse.coverageOne')}
                  </Text>
                ) : (
                  <>
                    <Bands
                      unit={t('browse.coverageUnit')}
                      script={script}
                      bands={coverageBands(coverage.perGarment).map((value, i) => ({
                        label: t(BANDS[i]?.key ?? 'browse.band.most'),
                        value,
                      }))}
                    />
                    <Text size="xs" color="foreground.2" script={script}>
                      {t('browse.coverageNote')}
                    </Text>
                  </>
                )}
              </Stack>
            </Surface>
          )}

          {gaps === undefined || gaps.length === 0 ? null : (
            <Surface level="1" padding="md">
              <Stack gap="md">
                <Text size="body" color="foreground" script={script} heading>
                  {t('browse.gaps')}
                </Text>
                <Bands
                  unit={t('browse.gapsUnit')}
                  script={script}
                  bands={gaps.map((gap) => ({
                    // THE PUBLISHED WORDS, never this screen's. `Gap.terms` comes from the
                    // phrase lexicon with a rationale an editor wrote, which is the only reason
                    // a phrase like "warm light neutral" can appear in the product at all.
                    label: gap.terms.join(' '),
                    value: gap.wouldUnlock,
                  }))}
                />
                <Text size="xs" color="foreground.2" script={script}>
                  {t('browse.gapsNote')}
                </Text>
              </Stack>
            </Surface>
          )}

          {/*
            THE GALLERY (F-150 criteria 1, 2 and 4).

            A `SectionList` OVER ROWS, which is the shape that keeps two things that pull in
            opposite directions. `numColumns` does not exist on `SectionList`, so each section's
            garments are chunked into rows of {@link COLUMNS} and a ROW is the item.

            WHY VIRTUALISE AT ALL: every visible cell asks for a photograph, and each one is a
            BLOB read plus a base64 encode. The cache in `gallery.ts` holds twelve — about a
            screen — so drawing a hundred cells at once would thrash it and decode a hundred
            photographs to show twelve. Virtualising is what makes the cache's bound the right
            bound rather than an arbitrary one.

            WHY KEEP THE SECTIONS: the family heading is the SECOND CHANNEL. A reader who cannot
            separate two of these greens still reads two family words and navigates by heading —
            and a flat grid with the family word repeated on every cell would keep the word while
            losing the navigation.
          */}
          <SectionList
            sections={sections}
            keyExtractor={(row) => row.map((g) => g.id).join('|')}
            renderSectionHeader={({ section }) => (
              <Stack gap="xs" padding="sm">
                <Text size="body" color="foreground" script={script} heading>
                  {section.title}
                </Text>
                <Text size="small" color="foreground.2" script={script}>
                  {`${t('browse.count')}: ${String(section.count)}`}
                </Text>
              </Stack>
            )}
            renderItem={({ item: row }) => (
              <Row gap="md" align="start">
                {row.map((garment) => (
                  <GarmentCell
                    key={garment.id}
                    garment={garment}
                    uri={images.uri(garment.id)}
                    label={`${garment.name ?? garment.type} — ${swatchAccessibleName(
                      garment.color.name,
                      garment.color.hex,
                      colorOf(garment.color),
                    )}`}
                    script={script}
                    onPress={() => {
                      open(garment);
                    }}
                  />
                ))}
                {/*
                  A ROW OF ONE STILL OCCUPIES TWO COLUMNS. Without this the last cell of an odd
                  section stretches to full width and reads as a different, larger kind of thing
                  — which is the single-garment state (criterion 4) arriving by accident in the
                  middle of a large wardrobe.
                */}
                {row.length < COLUMNS ? <View style={{ flex: 1 / COLUMNS }} /> : null}
              </Row>
            )}
            ItemSeparatorComponent={() => <View style={{ height: nativeSpacing.md }} />}
            SectionSeparatorComponent={() => <View style={{ height: nativeSpacing.sm }} />}
            scrollEnabled={false}
            initialNumToRender={4}
            windowSize={5}
            removeClippedSubviews
          />
        </>
      )}
    </Screen>
  );
}
