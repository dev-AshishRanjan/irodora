/**
 * The outfit builder (FR-33, F-045).
 *
 * ## Three slots, and locking is the whole interaction
 *
 * Fill a slot, lock the ones you have decided about, regenerate the rest. A locked slot is
 * never proposed against — `regenerate` in [`../outfit/builder.ts`](../outfit/builder.ts)
 * enforces that, and this file renders a control rather than restating the rule.
 *
 * ## The score is shown as its components, never as a number alone
 *
 * F-031's criterion 2, at the surface it was built for: *"all component scores are shown; the
 * overall never replaces them"*. That feature could not demonstrate it — nothing rendered a
 * score — and its own note said so. This screen is where six numbers first reach a person, so
 * the overall appears **beside** its components and never instead of them.
 *
 * ## Cost per wear lives here because this is where garments are (F-051)
 *
 * FR-46 needs two things this screen already has and nothing else in the app does: a garment a
 * person is looking at, and the moment they decide they are wearing it. There is no wardrobe
 * browse surface — FR-41 has no screen — so a cost-per-wear line on a garment detail page
 * would be a page invented to hold it.
 *
 * The number is read from the **stored row, by id**, never from the copy sitting in the draft:
 * recording a wear changes the count, and a placed copy captured before the tap would show the
 * old figure for as long as the outfit stayed on screen.
 *
 * ## Why the scores carry no colour channel
 *
 * F-069: a status colour may not sit beside a colour sample without a `swatch.well` between
 * them, because simultaneous contrast changes how the sample reads. This screen is mostly
 * samples. The component scores are therefore numbers and words — golden rule 13 satisfied by
 * having nothing to satisfy — and `screens.test.tsx` runs `checkStatusAdjacency` over every
 * screen, so the next person to reach for a status token here is told rather than trusted.
 *
 * ## Saving to the lookbook (F-238, ADR-0136 D4)
 *
 * The proposals each score the locked pieces plus one candidate. A saved outfit is the WHOLE
 * draft, so once every slot is filled the controls show that outfit's own score — one engine call
 * over every placed piece — and *Save Outfit to Lookbook* beside it, so what is stored is what the
 * person saw. The button is disabled with its reason on a line beneath it, as *I wore this* is,
 * until every slot holds a garment and while this outfit is already saved. Without a `lookbook`
 * prop none of it is drawn, and the screen is the one it was.
 */

import { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import {
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  Stack,
  Surface,
  Swatch,
  swatchAccessibleName,
  Text,
} from '@irodora/ui';
import { OUTFIT_SLOTS, type OutfitSlot } from '@irodora/recommendation';
import type { NewOutfit, OutfitEnvelope, StoredGarment } from '@irodora/store';
import {
  place,
  regenerate,
  setLocked,
  slotFor,
  type OutfitDraft,
  type RegenerateInput,
} from '../outfit/builder';
import { colorOf } from '../wardrobe';
import {
  costPerWear,
  formatMinor,
  wearRecorded,
  type CostPerWearUnknown,
  type WearStore,
} from '../wardrobe/cost';
import {
  draftKey,
  isComplete,
  outfitRecord,
  scoreDraft,
  shownScoreOfScore,
} from '../outfit/lookbook';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';
import { ScoreLines } from '../ScoreLines';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: nothing in
 * the wardrobe can be worn.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/** Slot → label. Total, so a fourth slot is a compile error rather than a blank column. */
const SLOT_KEYS = {
  top: 'outfit.top',
  trouser: 'outfit.trouser',
  shoe: 'outfit.shoe',
} as const satisfies Record<OutfitSlot, MessageKey>;

/**
 * Why there is no cost per wear. Total, so a fourth reason is a compile error.
 *
 * Three sentences rather than one *"unknown"*, because they are three different situations
 * with three different things to do about them — and the difference is the requirement
 * (FR-46: *"absent data yields unknown, never an invented estimate"*).
 */
const COST_UNKNOWN_KEYS = {
  noCost: 'outfit.costNoCost',
  noCurrency: 'outfit.costNoCurrency',
  neverWorn: 'outfit.costNeverWorn',
} as const satisfies Record<CostPerWearUnknown, MessageKey>;

/** What the Lab needs to save to the lookbook (F-238). The route supplies it from the provider. */
export interface OutfitLookbook {
  /** The versions a save is scored by, built by the route from the stored profile and the rules. */
  readonly envelope: OutfitEnvelope;
  /** The compositions already in the lookbook, so a saved outfit says so. */
  readonly saved: ReadonlySet<string>;
  readonly onSave: (outfit: NewOutfit) => void;
}

export interface OutfitBuilderProps {
  readonly wardrobe: readonly StoredGarment[];
  /** Everything `regenerate` needs that this screen does not own. */
  readonly context: Omit<RegenerateInput, 'draft' | 'wardrobe'>;
  readonly initialDraft?: OutfitDraft;
  /**
   * Where a wear is recorded (F-051).
   *
   * Required, and narrow. A default that quietly did not persist would look identical to one
   * that did until the app was reopened — the reason `AddGarment` takes its store the same
   * way — and the narrow port is what stops this screen from being able to create a garment.
   */
  readonly store: WearStore;
  /**
   * Go to the screen that adds a garment (F-139).
   *
   * This screen depends on a wardrobe and said so — "Nothing in your wardrobe fits a slot yet.
   * Add a top, trousers or shoes." — with no way to get there. Optional, and the ROUTE supplies
   * it: a screen that called `router.push` itself could not be rendered by the conformance
   * suite, which is where accessibility is actually checked.
   *
   * Note the narrow `WearStore` above is what stops THIS screen creating a garment itself —
   * so pointing at the screen that can is the only honest way out of the empty state.
   */
  readonly onAddGarment?: (() => void) | undefined;
  /** Save the whole outfit to the lookbook (F-238). Absent, no save is drawn. */
  readonly lookbook?: OutfitLookbook;
}

export function OutfitBuilder({
  wardrobe: initialWardrobe,
  context,
  initialDraft,
  store,
  onAddGarment,
  lookbook,
}: OutfitBuilderProps): React.JSX.Element {
  const { t, script } = useMessages();
  const [draft, setDraft] = useState<OutfitDraft>(initialDraft ?? []);
  /*
   * The wardrobe is state seeded from the prop, because recording a wear changes it and the
   * route has no other reason to re-render. `AddGarment` holds its count the same way.
   */
  const [wardrobe, setWardrobe] = useState<readonly StoredGarment[]>(initialWardrobe);
  const [worn, setWorn] = useState(false);

  /*
   * Derived, not stored. A proposal held in state would go stale the moment a lock changed,
   * and "regenerate" would become a button that reconciles two copies of the same answer.
   * The engine is pure and the wardrobe is small, so recomputing is the simpler correct thing.
   */
  const proposals = useMemo(
    () => regenerate({ ...context, draft, wardrobe }),
    [context, draft, wardrobe],
  );

  /*
   * THE WHOLE OUTFIT'S SCORE, once every slot is filled (F-238). Derived like the proposals, so it
   * cannot go stale against a lock or a swap; null while a slot is empty, because an outfit is one
   * garment per slot and a partial one is not what would be saved.
   */
  const draftScore = useMemo(
    () => (lookbook !== undefined && isComplete(draft) ? scoreDraft(draft, context) : null),
    [lookbook, draft, context],
  );
  const alreadySaved = lookbook?.saved.has(draftKey(draft)) === true;

  const toggleLock = useCallback((slot: OutfitSlot, locked: boolean) => {
    setDraft((d) => setLocked(d, slot, locked));
  }, []);

  const choose = useCallback((slot: OutfitSlot, garment: StoredGarment) => {
    setDraft((d) => place(d, slot, garment));
    // The confirmation below names THIS outfit. Changing a piece makes it a different one.
    setWorn(false);
  }, []);

  const wearable = wardrobe.filter((g) => slotFor(g) !== null);

  /**
   * The stored row for a placed garment.
   *
   * The draft holds the garment as it was when it was placed. After a wear is recorded that
   * copy is one behind, and showing cost per wear from it would report the figure the tap was
   * meant to change.
   */
  const stored = useCallback(
    (garment: StoredGarment): StoredGarment => wardrobe.find((w) => w.id === garment.id) ?? garment,
    [wardrobe],
  );

  /**
   * One more wear on every piece in the outfit.
   *
   * **Deduplicated by id.** No garment type maps to two slots today, so the set and the list
   * are the same length — but if one ever did, a garment worn once would have been counted
   * twice, and a wear count that drifts upward makes cost per wear quietly too low for the
   * rest of that garment's life.
   */
  const wore = useCallback(() => {
    const now = Date.now();
    const seen = new Set<string>();
    for (const piece of draft) {
      if (seen.has(piece.garment.id)) continue;
      seen.add(piece.garment.id);
      const row = wardrobe.find((w) => w.id === piece.garment.id) ?? piece.garment;
      store.enrichGarment(row.id, wearRecorded(row), now);
    }
    setWardrobe(store.listGarments());
    setWorn(true);
  }, [draft, store, wardrobe]);

  return (
    <Screen title={t('outfit.title')} script={script}>
      {/*
        NOTHING FITS A SLOT, AND NOW THERE IS A WAY TO CHANGE THAT (F-139). This named the
        action — "add a top, trousers or shoes" — and offered nothing to press.
      */}
      {wearable.length === 0 ? (
        onAddGarment === undefined ? (
          <EmptyState message={t('outfit.empty')} resolvedHere script={script} />
        ) : (
          <EmptyState
            title={t('wardrobe.empty.title')}
            body={t('outfit.empty')}
            action={{ label: t('browse.add'), onPress: onAddGarment }}
            script={script}
          />
        )
      ) : null}

      {OUTFIT_SLOTS.map((slot) => {
        const placed = draft.find((p) => p.slot === slot);
        const proposal = proposals.find((p) => p.slot === slot);
        const best = proposal?.ranked[0];

        return (
          <Card
            level="1"
            padding="sm"
            header={
              <Text size="body" color="foreground" heading script={script}>
                {t(SLOT_KEYS[slot])}
              </Text>
            }
          >
            <Stack gap="sm">
              {placed === undefined ? (
                <Text size="body" color="foreground.2" script={script}>
                  {t('outfit.slotEmpty')}
                </Text>
              ) : (
                <Row gap="sm">
                  <Swatch
                    caption="name"
                    name={placed.garment.color.name}
                    hex={placed.garment.color.hex}
                    color={colorOf(placed.garment.color)}
                    size={48}
                  />
                  <Text size="body" color="foreground" script={script}>
                    {placed.garment.name ?? placed.garment.type}
                  </Text>
                  <Button
                    label={placed.locked ? t('outfit.unlock') : t('outfit.lock')}
                    onPress={() => {
                      toggleLock(slot, !placed.locked);
                    }}
                    script={script}
                  />
                </Row>
              )}

              {/*
               * COST PER WEAR, OR THE REASON THERE IS NOT ONE (F-051, FR-46).
               *
               * The basis line is not decoration. A figure shown on its own asks to be
               * believed; shown beside the price and the count it came from, it can be
               * checked — and the two numbers are already in hand because `costPerWear`
               * carries its inputs back for exactly this.
               */}
              {placed === undefined
                ? null
                : (() => {
                    const answer = costPerWear(stored(placed.garment));
                    if (!answer.known)
                      return (
                        <Text size="label" color="foreground.2" script={script}>
                          {t(COST_UNKNOWN_KEYS[answer.reason])}
                        </Text>
                      );
                    return (
                      <Stack gap="xs">
                        <Text size="body" color="foreground" numeric script={script}>
                          {`${t('outfit.perWear')}: ${formatMinor(answer.minorPerWear, answer.currency)} ${answer.currency}`}
                        </Text>
                        <Text size="label" color="foreground.2" numeric script={script}>
                          {`${t('outfit.perWearBasis')}: ${formatMinor(answer.costMinor, answer.currency)} ${answer.currency} / ${String(answer.wearCount)}`}
                        </Text>
                      </Stack>
                    );
                  })()}

              {/*
               * A locked slot is not proposed against, which is why there is nothing to show
               * here rather than a disabled list. The sentence says why, because a section
               * that simply vanishes reads as a bug.
               */}
              {placed?.locked === true ? (
                <Text size="body" color="foreground.2" script={script}>
                  {t('outfit.lockedNote')}
                </Text>
              ) : null}

              {best === undefined ? null : (
                <Stack gap="sm">
                  <Text size="body" color="foreground.2" script={script}>
                    {t('outfit.suggested')}
                  </Text>
                  <Row gap="sm" wrap>
                    {(proposal?.ranked ?? []).slice(0, 6).map((r) => (
                      <Pressable
                        key={r.garment.id}
                        accessibilityRole="button"
                        accessibilityLabel={swatchAccessibleName(
                          r.garment.color.name,
                          r.garment.color.hex,
                          colorOf(r.garment.color),
                        )}
                        onPress={() => {
                          choose(slot, r.garment);
                        }}
                        style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
                      >
                        <Swatch
                          caption="name"
                          name={r.garment.color.name}
                          hex={r.garment.color.hex}
                          color={colorOf(r.garment.color)}
                          size={40}
                          selected={placed?.garment.id === r.garment.id}
                        />
                      </Pressable>
                    ))}
                  </Row>

                  {/*
                   * THE OVERALL BESIDE ITS COMPONENTS, NEVER INSTEAD OF THEM. F-031 built six
                   * component scores and could not show them — nothing rendered a score, and
                   * its note said so. This is where they first reach a person. The lines are
                   * `ScoreLines`, shared with the whole draft and the lookbook (F-238).
                   */}
                  <ScoreLines score={shownScoreOfScore(best.score)} />
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}

      {/*
       * WHERE A WEAR IS RECORDED (F-051, FR-46).
       *
       * `wear_count` has been a column since F-042 and nothing has ever incremented it, so
       * cost per wear was a division whose denominator could only ever be zero. This is the
       * only moment in the app at which a person says they are wearing something.
       *
       * The control is DISABLED WITH A REASON rather than absent: a section that appears
       * only once you have done the thing it asks for cannot teach you to do it, and a
       * disabled control with no stated reason is the accessibility failure that looks
       * like polish.
       */}
      <Surface
        /* surface-not-card: a control group led by its button. The action is the subject. */
        level="1"
      >
        <Stack gap="sm">
          <Button
            label={t('outfit.wore')}
            disabled={draft.length === 0}
            onPress={wore}
            script={script}
          />
          {draft.length === 0 ? (
            <Text size="body" color="foreground.2" script={script}>
              {t('outfit.woreNothing')}
            </Text>
          ) : null}
          {worn ? (
            <Text size="body" color="foreground.2" script={script}>
              {t('outfit.woreDone')}
            </Text>
          ) : null}

          {/*
            SAVE OUTFIT TO LOOKBOOK (F-238, ADR-0136 D4). 13 draws it in the action bar; F-257 moves
            it there. Disabled with its reason, never absent, for the reason *I wore this* gives.
          */}
          {lookbook === undefined ? null : (
            <Stack gap="sm">
              {draftScore === null ? null : (
                <Stack gap="xs">
                  <Text size="body" color="foreground" heading script={script}>
                    {t('lookbook.wholeOutfit')}
                  </Text>
                  <ScoreLines score={shownScoreOfScore(draftScore)} />
                </Stack>
              )}
              <Button
                label={t('lab.saveToLookbook')}
                disabled={draftScore === null || alreadySaved}
                onPress={() => {
                  if (draftScore === null) return;
                  lookbook.onSave(outfitRecord(draft, draftScore, lookbook.envelope));
                  /*
                   * HEARD, NOT ONLY SHOWN (WCAG 4.1.3). The button disables and the line below
                   * changes, and neither moves focus — so a screen-reader user would otherwise hear
                   * nothing happen. Announced once, on the save, as the state card announces a refusal.
                   */
                  AccessibilityInfo.announceForAccessibility(t('lookbook.alreadySaved'));
                }}
                script={script}
              />
              {/* A polite live region: Android reads the reason when it changes. */}
              <View accessibilityLiveRegion="polite">
                {draftScore === null ? (
                  <Text size="body" color="foreground.2" script={script}>
                    {t('lookbook.needsEverySlot')}
                  </Text>
                ) : alreadySaved ? (
                  <Text size="body" color="foreground.2" script={script}>
                    {t('lookbook.alreadySaved')}
                  </Text>
                ) : null}
              </View>
            </Stack>
          )}
        </Stack>
      </Surface>
    </Screen>
  );
}
