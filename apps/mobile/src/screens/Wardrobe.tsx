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
  Surface,
  Swatch,
  swatchAccessibleName,
  Text,
  TextField,
  useTheme,
} from '@irodora/ui';
import type { GarmentEnrichment, StoredGarment } from '@irodora/store';
import { groupByColour, textPatch, UNGROUPED } from '../wardrobe/browse';
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
}

export function Wardrobe({ store, initialSelected = null }: WardrobeProps): React.JSX.Element {
  const { t, script, locale } = useMessages();
  const { colors } = useTheme();

  const [garments, setGarments] = useState<readonly StoredGarment[]>(() => store.listGarments());
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [saved, setSaved] = useState(false);

  const selected = garments.find((g) => g.id === selectedId) ?? null;

  /*
   * The grouping is memoised on the garments, not recomputed per render.
   *
   * `familyOf` ranks one colour against the whole corpus, once per garment. That is fine for a
   * wardrobe of tens and it is not free, and a screen that redid it on every keystroke in the
   * editor below would be doing the corpus scan while somebody typed a brand.
   */
  const groups = useMemo(() => groupByColour(garments), [garments]);

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

      {groups.length === 0 ? (
        <>
          <Text size="body" color="foreground" script={script}>
            {t('browse.empty')}
          </Text>
          <Text size="small" color="foreground.2" script={script}>
            {t('browse.emptyHint')}
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
