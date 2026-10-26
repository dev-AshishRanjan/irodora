/**
 * Wear It — `07`, the outfit combination (FR-31, FR-32, FR-34, FR-38; F-248).
 *
 * ## The page
 *
 * A colour is the top, and the engine fills the other three slots — trousers, shoes, and an outer
 * layer — under the occasion chosen. A card says what the engine computed about the four together,
 * and the pills offer the slot in hand one step along each axis. Everything is built exactly as `07`
 * draws it ([`R9-MOCKUP-FIDELITY.md`](../../../../docs/design/R9-MOCKUP-FIDELITY.md), rule 14); what
 * `07` does not draw and a done criterion needs is listed there (§4 E4) and decided by ADR-0152.
 *
 * ## Nothing here computes
 *
 * [`../wear.ts`](../wear.ts) builds the combination — the rankings under the occasion's published
 * weighting, the colour each slot shows, the alternatives around it, the card's four figures — and
 * every number in it is the engine's. This file lays it out and words it, the division every rebuilt
 * screen keeps.
 *
 * ## The two things this screen may never do
 *
 * **It may not say what anybody should wear.** These are ranked colours with a stated basis; the
 * sheet says so in `wear.what`, and the claims lint holds the wording in both languages.
 *
 * **It may not show a number that means less than it looks like it means.** Without a profile there
 * is no fit figure at all (ADR-0150), the sheet shows the pairing figure and names the missing half,
 * and the save to the Lab — which draws nothing without a profile — says why it cannot be used.
 */

import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import type { OutfitSlot, PersonalProfile } from '@irodora/recommendation';
import {
  Button,
  Card,
  ChoiceGroup,
  Chip,
  EmptyState,
  Row,
  Screen,
  Sheet,
  Stack,
  Swatch,
  Text,
  useTheme,
  type Action,
  type Sample,
} from '@irodora/ui';
import { colorFor, type PublishedEntry } from '../corpus';
import { isMessageKey } from '../i18n/index';
import { useMessages } from '../i18n/useMessages';
import { capitalised } from '../notation';
import type { WornCombination } from '../outfit/fromWear';
import type { ScreenStates } from '../states';
import { rankingContext } from '../wardrobe/coverage';
import {
  anchorLine,
  ANCHOR,
  BACK_GLYPH,
  backName,
  chooseOccasion,
  contrastLine,
  DIVIDER,
  ENGINE_SLOT,
  EXPORT,
  fitLine,
  HARMONY_KEYS,
  LABEL_COLUMN,
  LOCK_GLYPH,
  OCCASION,
  OCCASION_KEYS,
  PILL,
  pillLabel,
  putInHand,
  RESTING_WEAR,
  SAVE,
  separationLine,
  shownFactors,
  shownColours,
  shownScore,
  SLOT_TITLE_KEYS,
  slotName,
  substitute,
  swap,
  SWAP,
  SWAP_COMPACT,
  SWAP_COMPACT_GLYPH,
  SWAP_GLYPH,
  toggleLock,
  WEAR_APP_BAR,
  WEAR_OCCASIONS,
  wearCombination,
  type RankedSlot,
  type WearSlot,
  type WearState,
} from '../wear';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: the corpus
 * does not hold the colour this screen is about.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/** The words drawn on a tile are read through its press target, so they are hidden once. */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

export interface WearProps {
  /** The colour in hand. A route parameter, so a miss is a state rather than a crash. */
  readonly slug: string;
  /**
   * The person to score against, or `null` for somebody who has not built a profile. Injected for
   * the reason every screen injects its ports: a branch that depends on device state is a branch no
   * conformance subject can render.
   */
  readonly profile?: PersonalProfile | null;
  /** Where the page starts: `07` as drawn (Office, slot 2 in hand) unless a test says otherwise. */
  readonly initial?: Partial<WearState>;
  /** A slot whose sheet starts open: a test reaches the sheet with it. */
  readonly initialSheet?: RankedSlot;
  /** `07.back`: back to the colour. */
  readonly onBack?: () => void;
  /** `07.actions.save`: hand the combination to the Outfit Lab (ADR-0152 D5). */
  readonly onSaveToLab?: (combination: WornCombination) => void;
  /** `07.actions.export`: export the combination's colours, the colour in hand first (D6). */
  readonly onExport?: (colours: readonly string[]) => void;
  /** The sheet's *Open this colour*. */
  readonly onOpenColour?: (slug: string) => void;
  /** The sheet's *Shop for this*, carrying the slot it was ranked for (F-199). */
  readonly onShopFor?: (slug: string, slot: OutfitSlot) => void;
  /** The sheet's *Add to wardrobe*: an offer; nothing is stored until the person saves (F-199). */
  readonly onAddToWardrobe?: (slug: string) => void;
}

export function Wear({
  slug,
  profile = null,
  initial,
  initialSheet,
  onBack,
  onSaveToLab,
  onExport,
  onOpenColour,
  onShopFor,
  onAddToWardrobe,
}: WearProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();
  const [state, setState] = useState<WearState>({ ...RESTING_WEAR, ...initial });
  const [sheet, setSheet] = useState<RankedSlot | null>(initialSheet ?? null);
  /*
   * WHAT AN OUTFIT IS SCORED AGAINST BESIDE ITS RULES: the Lab's own weights and reference (E-208),
   * neither of which depends on a person — the profile is passed on its own, and the rules are the
   * state's occasion's, read in `wearCombination` so the page cannot rank under one occasion while its
   * control shows another.
   */
  const context = useMemo(() => rankingContext(null), []);
  const combination = useMemo(
    () => wearCombination(slug, state, profile, context),
    [slug, state, profile, context],
  );

  const bar = { height: WEAR_APP_BAR, inset: nativeSpacing.md, gap: nativeSpacing.sm, script };

  if (combination === null)
    return (
      /*
        A COLOUR THIS CORPUS DOES NOT HOLD (F-236, E4, ADR-0128 §6): 00's caption under the app bar,
        whose back is the way out — a second control would be a second way to do one thing.
      */
      <Screen
        scroll={false}
        bleed
        script={script}
        appBar={{
          ...bar,
          ...(onBack === undefined
            ? {}
            : {
                back: {
                  glyph: 'back' as const,
                  name: t('detail.backToAtlas'),
                  size: BACK_GLYPH,
                  onPress: onBack,
                },
              }),
        }}
      >
        <View style={{ padding: nativeSpacing.md }}>
          <EmptyState message={t('detail.notFound')} resolvedHere script={script} />
        </View>
      </Screen>
    );

  const { anchor, slots, placed, rankings, alternatives, intelligence, personalKnown } =
    combination;
  const anchorSample: Sample = { hex: anchor.derived.hex, color: colorFor(anchor.entry) };
  const romaji = capitalised(anchor.entry.name.romaji);
  const slotOf = (key: RankedSlot): WearSlot | undefined => slots.find((s) => s.key === key);
  const inHandLocked = state.locked[state.inHand];

  /*
   * WHAT THE TWO ACTIONS CARRY: the combination as `07` shows it, the colour in hand first. The Lab
   * has three slots, so the outer layer stays here (F-257); the export takes all four.
   */
  const shownSlug = (key: RankedSlot): string | null => slotOf(key)?.entry?.entry.slug ?? null;
  const worn: WornCombination = {
    top: anchor.entry.slug,
    trouser: shownSlug('trouser'),
    shoe: shownSlug('shoe'),
  };
  const colours = shownColours(combination);

  const actions: Action[] = [
    ...(onSaveToLab === undefined
      ? []
      : [
          {
            label: t('wear.saveToLab'),
            height: SAVE,
            radius: 'pill' as const,
            step: 'label' as const,
            script,
            // THE LAB DRAWS NOTHING WITHOUT A PROFILE, so the save is disabled with its reason in the
            // bar's note (ADR-0152 D5, E4) rather than leading somewhere empty.
            disabled: !personalKnown,
            onPress: () => {
              onSaveToLab(worn);
            },
          },
        ]),
    ...(onExport === undefined
      ? []
      : [
          {
            variant: 'secondary' as const,
            edge: 'border' as const,
            label: t('wear.exportTokens'),
            height: EXPORT,
            radius: 'pill' as const,
            step: 'label' as const,
            script,
            onPress: () => {
              onExport(colours);
            },
          },
        ]),
  ];
  const [first, second] = actions;
  const actionBar =
    first === undefined
      ? undefined
      : {
          actions: second === undefined ? ([first] as const) : ([first, second] as const),
          rule: true,
          gap: nativeSpacing.sm,
          // `07.actions`: rule → buttons 10.9 dp and buttons → foot 10.9, `sm`; the sides 14.3 and 11.6,
          // one value, so siblings drawn alike: `md` and `sm` tie, and the smaller is taken (R9 §2).
          padding: { top: nativeSpacing.sm, bottom: nativeSpacing.sm, side: nativeSpacing.sm },
          ...(onSaveToLab !== undefined && !personalKnown
            ? { note: t('wear.saveNeedsProfile') }
            : {}),
          script,
        };

  /**
   * One of the four slots, drawn on its colour (`07.slots.slot-n`): `slot` is `null` for the colour in
   * hand. A function the render calls rather than a component it declares — one declared in a render
   * is a new type every render, and React would remount all four tiles on every Swap.
   */
  function tile(
    slot: WearSlot | null,
    entry: PublishedEntry | null,
    titleKey: (typeof SLOT_TITLE_KEYS)[keyof typeof SLOT_TITLE_KEYS],
  ): React.JSX.Element {
    const title = t(titleKey);
    if (entry === null)
      // A RANKING WITH NOTHING IN IT: the slot's title and the sentence, on the page's own ground.
      return (
        <View
          style={{
            flex: 1,
            padding: nativeSpacing.sm,
            gap: nativeSpacing.xs,
            borderRadius: nativeRadius.sm,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text size="label" color="foreground" numeric script={script}>
            {title}
          </Text>
          <Text size="label" color="foreground.2" script={script}>
            {t('wear.none')}
          </Text>
        </View>
      );

    const sample: Sample = { hex: entry.derived.hex, color: colorFor(entry.entry) };
    const name = slotName(entry, slot === null);
    const key = slot?.key;
    const inHand = key !== undefined && key === state.inHand;
    const locked = slot?.locked ?? false;
    const ranking = key === undefined ? [] : rankings[key].ranked;
    /*
     * THE TILE'S CONTROL (out of hand): the compact Swap on the sample, or 13's Locked badge when the
     * slot is locked (ADR-0152 D2, E4) — a locked slot's colour does not move, so a Swap would do
     * nothing.
     */
    const trailing =
      key === undefined || inHand ? null : locked ? (
        <Chip
          form="badge"
          icon="lock"
          fill="surface.3"
          radius="sm"
          label={t('lab.locked')}
          script={script}
        />
      ) : (
        <Button
          variant="secondary"
          on={sample}
          label={t('wear.swap')}
          name={`${t('wear.swap')} ${title}`}
          glyph="refresh"
          glyphAt="trailing"
          glyphSize={SWAP_COMPACT_GLYPH}
          height={SWAP_COMPACT}
          radius="sm"
          step="caption"
          script={script}
          onPress={() => {
            setState((s) => swap(s, key, ranking, placed));
          }}
          testID={`wear.slot.${key}.swap`}
        />
      );
    /*
     * ONE STOP PER TILE (F-248's review, S4): the sample's own node carries the slot's title, its name,
     * its hex and its provenance — the press target on a ranked tile, an image on the colour in hand's —
     * so the words drawn over it are hidden once rather than read twice.
     */
    const words = HIDDEN;
    /** The tile's id, and its words' (`.title`, `.hex`, `.name`): the colour in hand's is `top`. */
    const id = `wear.slot.${key ?? 'top'}`;

    return (
      <View style={{ flex: 1 }} testID={id}>
        {/*
          THE SAMPLE IS THE PRESS TARGET, UNDER THE WORDS (ADR-0152 D1): on a ranked tile it puts the slot
          in hand and opens its sheet. Its node lies under the tile's words, which let a touch through,
          and beside its controls, never around them — a control inside another is one a screen reader
          cannot reach (ADR-0153 D8).
        */}
        <Swatch
          name={`${title}, ${name}`}
          hex={entry.derived.hex}
          color={sample.color}
          width="fill"
          height="fill"
          corner="sm"
          keyline={false}
          group={false}
          testID={`${id}.open`}
          {...(key === undefined
            ? {}
            : {
                onPress: () => {
                  setState((s) => putInHand(s, key));
                  setSheet(key);
                },
              })}
        >
          <View pointerEvents="box-none" style={{ flexGrow: 1, padding: nativeSpacing.sm }}>
            <Row pointerEvents="box-none" gap="xs" align="start">
              <View pointerEvents="none" style={{ flex: 1 }} {...words}>
                <Text size="label" on={sample} numeric script={script} testID={`${id}.title`}>
                  {title}
                </Text>
              </View>
              {trailing}
            </Row>
            {/*
              title → hex → name at `xs`, each tighter than the scale (named, ADR-0153 D1): the line
              insets already part them.
            */}
            <View
              pointerEvents="none"
              style={{ gap: nativeSpacing.xs, marginTop: nativeSpacing.xs }}
              {...words}
            >
              <Text size="label" on={sample} numeric selectable testID={`${id}.hex`}>
                {entry.derived.hex}
              </Text>
              <Text size="body" on={sample} testID={`${id}.name`}>
                {name}
              </Text>
            </View>
            {key === undefined || !inHand ? null : (
              /*
                THE SLOT IN HAND (ADR-0152 D1, D2): Swap and Lock under its name, each the tonal level-3
                button `07` fills them with (ADR-0153 D2). Lock is a toggle announced as selected; its
                padlock is `glyph.lock`, and its word — *Lock* or *Locked* — carries the state, so the
                gold is never the only channel.
              */
              // A touch between the two buttons reaches the sample's press target under them.
              <View pointerEvents="box-none" style={{ marginTop: nativeSpacing.xs }}>
                <Row gap="xs" wrap>
                  <Button
                    variant="tonal"
                    level={3}
                    label={t('wear.swap')}
                    name={`${t('wear.swap')} ${title}`}
                    glyph="refresh"
                    glyphAt="trailing"
                    glyphSize={SWAP_GLYPH}
                    height={SWAP}
                    radius="sm"
                    step="label"
                    script={script}
                    disabled={locked}
                    onPress={() => {
                      setState((s) => swap(s, key, ranking, placed));
                    }}
                    testID={`wear.slot.${key}.swap`}
                  />
                  <Button
                    variant="tonal"
                    level={3}
                    label={locked ? t('wear.locked') : t('wear.lock')}
                    name={`${locked ? t('wear.locked') : t('wear.lock')} ${title}`}
                    glyph="lock-solid"
                    glyphTint="glyph.lock"
                    glyphAt="trailing"
                    glyphSize={LOCK_GLYPH}
                    height={SWAP}
                    radius="sm"
                    step="label"
                    script={script}
                    selected={locked}
                    onPress={() => {
                      setState((s) => toggleLock(s, key, placed));
                    }}
                    testID={`wear.slot.${key}.lock`}
                  />
                </Row>
              </View>
            )}
          </View>
        </Swatch>
      </View>
    );
  }

  /** The card's rows (`07.intelligence.*`): a label column, and the engine's figure in words. */
  const contrast = contrastLine(intelligence.contrast);
  const rows: readonly { readonly key: string; readonly label: string; readonly value: string }[] =
    [
      { key: 'harmony', label: t('wear.harmony'), value: t(HARMONY_KEYS[intelligence.harmony]) },
      { key: 'fit', label: t('wear.fit'), value: fitLine(intelligence.fit, t, script) },
      {
        key: 'cvd',
        label: t('wear.cvd'),
        value: separationLine(intelligence.separation, t, script),
      },
      // No trousers to measure the top against, no contrast row: a figure nobody computed is not drawn.
      ...(contrast === null
        ? []
        : [{ key: 'contrast', label: t('wear.contrast'), value: contrast }]),
    ];

  /** The slot whose sheet is open, and what it holds (ADR-0152 D4). */
  const opened = sheet === null ? undefined : slotOf(sheet);
  const candidate = opened?.candidate ?? null;
  const openedEntry = opened?.entry ?? null;
  const factors = candidate === null ? [] : shownFactors(candidate, personalKnown);

  return (
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        ...bar,
        ...(onBack === undefined
          ? {}
          : {
              back: {
                glyph: 'back' as const,
                label: romaji,
                name: backName(anchor, t, script),
                size: BACK_GLYPH,
                weight: 500 as const,
                onPress: onBack,
              },
            }),
        // `07.divider` and `07.title`: the rule and the page's name, each at body 500 (ADR-0153 D4).
        divider: DIVIDER,
        title: {
          text: t('wear.title'),
          align: 'leading',
          placement: 'bar',
          layout: 'inline',
          size: 'body',
          weight: 500,
        },
      }}
      {...(actionBar === undefined ? {} : { actionBar })}
    >
      <ScrollView
        testID="wear.scroll"
        style={{ flex: 1 }}
        // The card → the bar's rule: 21.8 dp, `lg`, the leaked label's space kept (F-246's rule).
        contentContainerStyle={{ paddingTop: nativeSpacing.xl, paddingBottom: nativeSpacing.lg }}
      >
        {/* `07.anchor`: the colour in hand, at the page's inset. */}
        <View style={{ paddingHorizontal: nativeSpacing.md }}>
          <Card level="1" padding="sm" radius="md" testID="wear.anchor">
            <Row gap="sm" align="center">
              {/*
                ONE STOP FOR THE COLOUR (F-248's review, M7): the sample is an image named by the line
                beside it, and does nothing, so it is no button; the line, drawn, is read through it.
              */}
              <Swatch
                size={ANCHOR}
                corner="sm"
                name={anchorLine(anchor)}
                hex={anchor.derived.hex}
                color={anchorSample.color}
                group={false}
              />
              {/* name → category at `xs`: tighter than the scale, named (ADR-0153 D1). */}
              <View style={{ flex: 1, gap: nativeSpacing.xs }}>
                <Text size="body" weight={500} color="foreground" numeric selectable {...HIDDEN}>
                  <Text size="body" weight={500} color="foreground" script="japanese">
                    {anchor.entry.name.kanji}
                  </Text>
                  {anchorLine(anchor).slice(anchor.entry.name.kanji.length)}
                </Text>
                <Text size="label" color="foreground.2" script={script}>
                  {t('outfit.top')}
                </Text>
              </View>
            </Row>
          </Card>
        </View>

        {/* `07.occasion`: FR-34's published weightings, each segment sized by its words (D6). */}
        <View
          style={{
            marginTop: nativeSpacing.xl,
            paddingLeft: nativeSpacing.md,
            paddingRight: nativeSpacing.xs,
          }}
        >
          <ChoiceGroup
            label={t('wear.occasion')}
            options={WEAR_OCCASIONS.map((o) => ({ value: o, label: t(OCCASION_KEYS[o]) }))}
            value={state.occasion}
            onChange={(o) => {
              if (o !== null) setState((s) => chooseOccasion(s, o));
            }}
            segmented={{
              mark: 'dot',
              selectedFill: 'accent',
              radius: 'sm',
              height: OCCASION,
              fit: 'content',
            }}
            script={script}
            testID="wear.occasion"
          />
        </View>

        {/* `07.slots`: four tiles, two to a row, each row as tall as its taller tile. */}
        <View
          style={{
            marginTop: nativeSpacing.xl,
            paddingHorizontal: nativeSpacing.sm,
            gap: nativeSpacing.sm,
          }}
        >
          <Row gap="sm" align="stretch">
            {tile(null, anchor, SLOT_TITLE_KEYS.top)}
            {tile(
              slotOf('trouser') ?? null,
              slotOf('trouser')?.entry ?? null,
              SLOT_TITLE_KEYS.trouser,
            )}
          </Row>
          <Row gap="sm" align="stretch">
            {tile(slotOf('shoe') ?? null, slotOf('shoe')?.entry ?? null, SLOT_TITLE_KEYS.shoe)}
            {tile(slotOf('outer') ?? null, slotOf('outer')?.entry ?? null, SLOT_TITLE_KEYS.outer)}
          </Row>
        </View>

        {/*
          `07.intelligence`: the four figures and the slot in hand's pills. Inset `sm` leading and `xs`
          trailing, as drawn (the trailing 0.7 dp named, ADR-0153 D1).
        */}
        <View
          style={{
            marginTop: nativeSpacing.md,
            paddingLeft: nativeSpacing.sm,
            paddingRight: nativeSpacing.xs,
          }}
        >
          <Card level="1" padding="sm" radius="md" testID="wear.intelligence">
            <Text size="body" weight={600} color="foreground" script={script} heading>
              {t('wear.intelligence')}
            </Text>
            {/* The rows at `xs` apart: tighter than the scale, named (ADR-0153 D1). */}
            <View style={{ marginTop: nativeSpacing.lg, gap: nativeSpacing.xs }}>
              {rows.map((r) => (
                <Row key={r.key} align="start" testID={`wear.intelligence.${r.key}`}>
                  <View style={{ width: LABEL_COLUMN }}>
                    <Text size="label" color="foreground.2" script={script}>
                      {r.label}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text size="label" color="foreground" script={script} numeric>
                      {r.value}
                    </Text>
                  </View>
                </Row>
              ))}
            </View>
            {/* `07.intelligence.rule`: it runs `sm − xs` past the card's padding, ending `xs` short. */}
            <View
              testID="wear.intelligence.rule"
              style={{
                marginTop: nativeSpacing.sm,
                marginRight: -(nativeSpacing.sm - nativeSpacing.xs),
                height: 1,
                backgroundColor: colors.border,
              }}
            />
            {/*
              THE PILLS (ADR-0152 D3): the slot in hand's alternatives, relative to the colour it shows,
              as many as the engine returns. A locked slot does not move, so its pills are unavailable.
            */}
            <View style={{ marginTop: nativeSpacing.xl }}>
              <Row gap="xs" wrap>
                {alternatives.map((a) => (
                  <Chip
                    key={a.axis}
                    label={pillLabel(a, state.inHand, t)}
                    height={PILL}
                    radius="sm"
                    size="caption"
                    disabled={inHandLocked}
                    script={script}
                    onPress={() => {
                      setState((s) => substitute(s, s.inHand, a.candidate.id));
                    }}
                    testID={`wear.pill.${a.axis}`}
                  />
                ))}
              </Row>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/*
        THE SLOT'S SHEET (ADR-0152 D4, E4): `03`'s floating sheet. What the old page drew per candidate
        — its rank, its figures and reasons or the missing half, `wear.what`, and where it can go — for
        the colour the slot shows.
      */}
      <Sheet
        form="floating"
        open={opened !== undefined}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
        title={opened === undefined ? t('wear.title') : t(SLOT_TITLE_KEYS[opened.key])}
        closeLabel={t('wear.sheetClose')}
        handleLabel={t('wear.sheetHandle')}
        handleHint={t('wear.sheetHandleHint')}
        testID="wear.sheet"
        {...(opened === undefined || openedEntry === null
          ? {}
          : {
              footer: (
                <Row gap="sm" wrap>
                  {onOpenColour === undefined ? null : (
                    <Button
                      variant="secondary"
                      label={t('wear.openColour')}
                      script={script}
                      onPress={() => {
                        onOpenColour(openedEntry.entry.slug);
                      }}
                    />
                  )}
                  {onShopFor === undefined ? null : (
                    <Button
                      variant="secondary"
                      label={t('wear.shopFor')}
                      script={script}
                      onPress={() => {
                        onShopFor(openedEntry.entry.slug, ENGINE_SLOT[opened.key]);
                      }}
                    />
                  )}
                  {onAddToWardrobe === undefined ? null : (
                    <Button
                      variant="secondary"
                      label={t('wear.addToWardrobe')}
                      script={script}
                      onPress={() => {
                        onAddToWardrobe(openedEntry.entry.slug);
                      }}
                    />
                  )}
                </Row>
              ),
            })}
      >
        {opened === undefined || openedEntry === null ? null : (
          <Stack gap="sm">
            <Text size="body" weight={500} color="foreground" heading>
              {slotName(openedEntry, false)}
            </Text>
            <Text size="label" color="foreground.2" script={script} numeric>
              {opened.rank === null
                ? t('wear.unranked')
                : `${t('wear.rank')} ${String(opened.rank)} / ${String(opened.of)}`}
            </Text>
            {candidate === null ? null : (
              /*
                THE FIGURE, AND WHICH FIGURE IT IS: the blend with a profile, the pairing without one —
                named, because only one of them is available without a person (F-195).
              */
              <Row gap="sm">
                <Text size="label" color="foreground.2" script={script}>
                  {personalKnown ? t('wear.overall') : t('wear.pairing')}
                </Text>
                <Text size="label" color="foreground" numeric selectable>
                  {String(shownScore(candidate, personalKnown))}
                </Text>
              </Row>
            )}
            {/*
              ALL FOUR FACTORS, OR NONE, AND THE MISSING HALF NAMED: without a profile the explanation
              object reports a perfect fit on four axes nobody measured (`wear.ts`), so it is not drawn.
            */}
            {personalKnown ? (
              <Stack gap="xs">
                {factors.map((f, i) => (
                  <Text
                    key={`${String(i)}-${f.messageKey}`}
                    size="caption"
                    color="foreground.2"
                    script={script}
                  >
                    {isMessageKey(f.messageKey) ? t(f.messageKey) : f.messageKey}
                  </Text>
                ))}
              </Stack>
            ) : (
              <Text size="caption" color="foreground.2" script={script}>
                {t('wear.noProfile')}
              </Text>
            )}
            <Text size="caption" color="foreground.2" script={script}>
              {t('wear.what')}
            </Text>
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}
