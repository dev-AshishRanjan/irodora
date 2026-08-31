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
import { Button, Surface, Swatch, swatchAccessibleName, Text } from '@irodora/ui';
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
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Slot → label. Total, so a fourth slot is a compile error rather than a blank column. */
const SLOT_KEYS = {
  top: 'outfit.top',
  trouser: 'outfit.trouser',
  shoe: 'outfit.shoe',
} as const satisfies Record<OutfitSlot, MessageKey>;

export interface OutfitBuilderProps {
  readonly wardrobe: readonly StoredGarment[];
  /** Everything `regenerate` needs that this screen does not own. */
  readonly context: Omit<RegenerateInput, 'draft' | 'wardrobe'>;
  readonly initialDraft?: OutfitDraft;
}

export function OutfitBuilder({
  wardrobe,
  context,
  initialDraft,
}: OutfitBuilderProps): React.JSX.Element {
  const { t } = useMessages();
  const [draft, setDraft] = useState<OutfitDraft>(initialDraft ?? []);

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
  }, []);

  const wearable = wardrobe.filter((g) => slotFor(g) !== null);

  return (
    <ScrollView>
      <View style={{ padding: 16, gap: 16 }}>
        <Text size="title" color="foreground" heading>
          {t('outfit.title')}
        </Text>

        {wearable.length === 0 ? (
          <Text size="body" color="foreground.2">
            {t('outfit.empty')}
          </Text>
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
                    {best.score.components.map((c) => (
                      <Text key={c.component} size="small" color="foreground.2" numeric>
                        {`${c.component}: ${String(Math.round(c.score))}`}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Surface>
          );
        })}
      </View>
    </ScrollView>
  );
}
