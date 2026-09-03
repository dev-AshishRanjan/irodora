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
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Button, EmptyState, Surface, Swatch, swatchAccessibleName, Text } from '@irodora/ui';
import { OUTFIT_SLOTS, type OutfitSlot } from '@irodora/recommendation';
import type { StoredGarment } from '@irodora/store';
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
import { useMessages } from '../i18n/useMessages';
import { isMessageKey, type MessageKey } from '../i18n/index';

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
}

export function OutfitBuilder({
  wardrobe: initialWardrobe,
  context,
  initialDraft,
  store,
  onAddGarment,
}: OutfitBuilderProps): React.JSX.Element {
  const { t } = useMessages();
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
    <ScrollView>
      <View style={{ padding: 16, gap: 16 }}>
        <Text size="title" color="foreground" heading>
          {t('outfit.title')}
        </Text>

        {/*
          NOTHING FITS A SLOT, AND NOW THERE IS A WAY TO CHANGE THAT (F-139). This named the
          action — "add a top, trousers or shoes" — and offered nothing to press.
        */}
        {wearable.length === 0 ? (
          onAddGarment === undefined ? (
            <EmptyState message={t('outfit.empty')} resolvedHere />
          ) : (
            <EmptyState
              message={t('outfit.empty')}
              action={{ label: t('browse.add'), onPress: onAddGarment }}
            />
          )
        ) : null}

        {OUTFIT_SLOTS.map((slot) => {
          const placed = draft.find((p) => p.slot === slot);
          const proposal = proposals.find((p) => p.slot === slot);
          const best = proposal?.ranked[0];

          return (
            <Surface key={slot} level="1">
              <View style={{ padding: 12, gap: 12 }}>
                <Text size="body" color="foreground" heading>
                  {t(SLOT_KEYS[slot])}
                </Text>

                {placed === undefined ? (
                  <Text size="body" color="foreground.2">
                    {t('outfit.slotEmpty')}
                  </Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Swatch
                      name={placed.garment.color.name}
                      hex={placed.garment.color.hex}
                      color={colorOf(placed.garment.color)}
                      size={48}
                    />
                    <Text size="body" color="foreground">
                      {placed.garment.name ?? placed.garment.type}
                    </Text>
                    <Button
                      label={placed.locked ? t('outfit.unlock') : t('outfit.lock')}
                      onPress={() => {
                        toggleLock(slot, !placed.locked);
                      }}
                    />
                  </View>
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
                          <Text size="small" color="foreground.2">
                            {t(COST_UNKNOWN_KEYS[answer.reason])}
                          </Text>
                        );
                      return (
                        <View style={{ gap: 4 }}>
                          <Text size="body" color="foreground" numeric>
                            {`${t('outfit.perWear')}: ${formatMinor(answer.minorPerWear, answer.currency)} ${answer.currency}`}
                          </Text>
                          <Text size="small" color="foreground.2" numeric>
                            {`${t('outfit.perWearBasis')}: ${formatMinor(answer.costMinor, answer.currency)} ${answer.currency} / ${String(answer.wearCount)}`}
                          </Text>
                        </View>
                      );
                    })()}

                {/*
                 * A locked slot is not proposed against, which is why there is nothing to show
                 * here rather than a disabled list. The sentence says why, because a section
                 * that simply vanishes reads as a bug.
                 */}
                {placed?.locked === true ? (
                  <Text size="body" color="foreground.2">
                    {t('outfit.lockedNote')}
                  </Text>
                ) : null}

                {best === undefined ? null : (
                  <View style={{ gap: 8 }}>
                    <Text size="body" color="foreground.2">
                      {t('outfit.suggested')}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                            name={r.garment.color.name}
                            hex={r.garment.color.hex}
                            color={colorOf(r.garment.color)}
                            size={40}
                            selected={placed?.garment.id === r.garment.id}
                          />
                        </Pressable>
                      ))}
                    </View>

                    {/*
                     * THE OVERALL BESIDE ITS COMPONENTS, NEVER INSTEAD OF THEM. F-031 built six
                     * component scores and could not show them — nothing rendered a score, and
                     * its note said so. This is where they first reach a person.
                     */}
                    <Text size="body" color="foreground" numeric>
                      {`${t('outfit.overall')}: ${String(Math.round(best.score.overall))}`}
                    </Text>
                    {/*
                     * THE SENTENCE, NOT THE IDENTIFIER (F-124, FR-32).
                     *
                     * This rendered `${c.component}: ${score}` — 'corpusAffinity', in English, in
                     * both locales, because none of the engine's eighteen keys was in either
                     * catalogue. A Japanese reader saw six English words beside six numbers, and
                     * an English one saw a variable name.
                     *
                     * `isMessageKey` narrows rather than casts, so a key the catalogue lacks
                     * still renders — as the raw identifier, visibly wrong — instead of blanking
                     * the line. That is how the gap was found in the first place (E-053).
                     */}
                    {best.score.components.map((c) => (
                      <Text key={c.component} size="small" color="foreground.2" numeric>
                        {`${isMessageKey(c.messageKey) ? t(c.messageKey) : c.messageKey} — ${String(Math.round(c.score))}`}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Surface>
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
        <Surface level="1">
          <View style={{ padding: 12, gap: 12 }}>
            <Button label={t('outfit.wore')} disabled={draft.length === 0} onPress={wore} />
            {draft.length === 0 ? (
              <Text size="body" color="foreground.2">
                {t('outfit.woreNothing')}
              </Text>
            ) : null}
            {worn ? (
              <Text size="body" color="foreground.2">
                {t('outfit.woreDone')}
              </Text>
            ) : null}
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
}
