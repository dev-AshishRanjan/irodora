/**
 * The shopping check (FR-52, F-052).
 *
 * ## Three measurements, and no verdict
 *
 * There is no *"buy it"* and no *"do not buy it"*, and their absence is deliberate. What the
 * screen can honestly produce is three numbers about a wardrobe it can see — how many more
 * outfits, how the colour scores against a profile, and what it is close to — each shown with
 * what it was measured against. The decision is somebody's own, about their money, and a
 * product that turned three measurements into one word would be hiding the parts that matter
 * behind the part that does not.
 *
 * ## Nothing is stored, and the screen says so
 *
 * The premise is a garment that has not been bought. `shoppingCheck` writes nothing and this
 * screen has no store prop to write with — the only way to keep something is to add it to the
 * wardrobe, which is a different screen and a deliberate act.
 *
 * ## The refusals get the same room as the answers
 *
 * A type with no slot, a person with no profile, an empty wardrobe: each is a sentence saying
 * which answer is unavailable and why, never a zero and never a blank. `shoppingCheck` returns
 * `null` for exactly these, so this file renders a state rather than deciding one
 * [[a-column-nothing-writes-makes-its-own-feature-unfalsifiable]].
 *
 * ## Why the explanation keys are checked rather than cast
 *
 * `FactorContribution.messageKey` is a `string` — the engine holds no catalogue by design
 * (FR-11) — so `t(key as MessageKey)` would compile and render an empty line the day the
 * engine names a key this catalogue lacks. It is narrowed instead, and the fallback shows the
 * raw key: visible and reportable rather than silently absent. E-053's test is what stops that
 * fallback ever being reached.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Surface, Swatch, swatchAccessibleName, Text, TextField } from '@irodora/ui';
import { coverage, type Coverage, type CoverageGarment } from '@irodora/optimization';
import type { StoredGarment } from '@irodora/store';
import { allEntries, colorFor } from '../corpus';
import { slotFor } from '../outfit/builder';
import { colorOf } from '../wardrobe';
import { CANDIDATE_ID, shoppingCheck, type ShoppingContext } from '../wardrobe/shopping';
import { useMessages } from '../i18n/useMessages';
import { MESSAGE_KEYS, type MessageKey } from '../i18n/index';

/** How many corpus entries the picker offers. The same twelve `AddGarment` shows. */
const PICKER_LIMIT = 12;

/**
 * Whether the engine named a key this catalogue has.
 *
 * A narrowing rather than a cast, so the failure is a visible raw key instead of a blank line.
 */
function isMessageKey(key: string): key is MessageKey {
  return (MESSAGE_KEYS as readonly string[]).includes(key);
}

export interface ShoppingProps {
  readonly wardrobe: readonly StoredGarment[];
  /** Everything the check needs that the wardrobe does not carry. `baseline` is added here. */
  readonly context: Omit<ShoppingContext, 'baseline'>;
  readonly initialType?: string;
  readonly initialSlug?: string;
}

export function Shopping({
  wardrobe,
  context,
  initialType = '',
  initialSlug,
}: ShoppingProps): React.JSX.Element {
  const { t } = useMessages();
  const [type, setType] = useState(initialType);
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);

  /*
   * The baseline does not depend on the candidate, and it is the expensive half — `t × r × s`
   * calls to the engine. Computed once per wardrobe so that typing a letter costs only
   * `applyChange`'s cross-product of the other two slots, which is the saving F-048 exists for.
   */
  const baseline: Coverage | undefined = useMemo(() => {
    if (context.profile === null) return undefined;
    const placeable = wardrobe
      .map((g): CoverageGarment | null => {
        const slot = slotFor(g);
        return slot === null ? null : { id: g.id, slot, color: colorOf(g.color) };
      })
      .filter((g): g is CoverageGarment => g !== null);
    return coverage(placeable, {
      reference: context.reference,
      profile: context.profile,
      rules: context.rules,
      weights: context.weights,
      ...(context.threshold === undefined ? {} : { threshold: context.threshold }),
    });
  }, [context, wardrobe]);

  const entry = slug === null ? null : (allEntries().find((e) => e.entry.slug === slug) ?? null);

  const check = useMemo(() => {
    if (entry === null || type.trim() === '') return null;
    return shoppingCheck({ type, color: colorFor(entry.entry) }, wardrobe, {
      ...context,
      baseline,
    });
  }, [baseline, context, entry, type, wardrobe]);

  const choose = useCallback((chosen: string) => {
    setSlug(chosen);
  }, []);

  const named = (id: string): string => {
    const found = wardrobe.find((g) => g.id === id);
    return found?.name ?? found?.type ?? id;
  };

  return (
    <ScrollView>
      <View style={{ padding: 16, gap: 16 }}>
        <Text size="title" color="foreground" heading>
          {t('shopping.title')}
        </Text>
        <Text size="body" color="foreground.2">
          {t('shopping.origin')}
        </Text>

        {wardrobe.length === 0 ? (
          <Text size="body" color="foreground.2">
            {t('shopping.empty')}
          </Text>
        ) : null}

        <TextField
          label={t('wardrobe.type')}
          hint={t('wardrobe.typeHint')}
          value={type}
          onChangeText={setType}
        />

        <Text size="body" color="foreground.2">
          {t('wardrobe.pickColour')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allEntries()
            .slice(0, PICKER_LIMIT)
            .map((e) => (
              <Pressable
                key={e.entry.slug}
                accessibilityRole="button"
                accessibilityLabel={swatchAccessibleName(
                  e.entry.name.en,
                  e.derived.hex,
                  colorFor(e.entry),
                )}
                onPress={() => {
                  choose(e.entry.slug);
                }}
                style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
              >
                <Swatch
                  name={e.entry.name.en}
                  hex={e.derived.hex}
                  color={colorFor(e.entry)}
                  size={48}
                  selected={slug === e.entry.slug}
                />
              </Pressable>
            ))}
        </View>

        {check === null ? null : (
          <>
            {/* ------------------------------------------------ outfits unlocked (FR-42) */}
            <Surface level="1">
              <View style={{ padding: 12, gap: 8 }}>
                {check.outfits === null ? (
                  <Text size="body" color="foreground.2">
                    {t('shopping.noSlot')}
                  </Text>
                ) : (
                  <>
                    <Text size="body" color="foreground" numeric>
                      {`${t('shopping.unlocked')}: ${String(check.outfits.unlocked)}`}
                    </Text>
                    {/*
                     * THE COUNT AND THE THRESHOLD TRAVEL TOGETHER. "Three more outfits" is a
                     * measurement with no units until it says out of how many, and counted at
                     * what — which is why F-048 exports COVERAGE_THRESHOLD at all.
                     */}
                    <Text size="small" color="foreground.2" numeric>
                      {`${t('shopping.now')}: ${String(check.outfits.now)}`}
                    </Text>
                    <Text size="small" color="foreground.2" numeric>
                      {`${t('shopping.countedAt')}: ${String(check.outfits.threshold)}`}
                    </Text>
                  </>
                )}
              </View>
            </Surface>

            {/* ------------------------------------ personal compatibility (FR-29) */}
            <Surface level="1">
              <View style={{ padding: 12, gap: 8 }}>
                {check.compatibility === null ? (
                  <Text size="body" color="foreground.2">
                    {t('shopping.noProfile')}
                  </Text>
                ) : (
                  <>
                    <Text size="body" color="foreground" numeric>
                      {`${t('shopping.compatibility')}: ${String(check.compatibility.score)}`}
                    </Text>
                    {/*
                     * ALL FOUR FACTORS, ALWAYS, BESIDE THE SCORE. FR-29 asks for a per-factor
                     * explanation and the engine returns every factor in order — a missing one
                     * is not an absent opinion, so none is filtered out for being neutral.
                     */}
                    {check.compatibility.factors.map((f) => (
                      <Text key={f.factor} size="small" color="foreground.2">
                        {isMessageKey(f.messageKey) ? t(f.messageKey) : f.messageKey}
                      </Text>
                    ))}
                    <Text size="small" color="foreground.2" numeric>
                      {`${t('shopping.evidence')}: ${check.compatibility.confidence.toFixed(2)}`}
                    </Text>
                  </>
                )}
              </View>
            </Surface>

            {/* ------------------------------------------- duplicate warning (FR-44) */}
            <Surface level="1">
              <View style={{ padding: 12, gap: 8 }}>
                {check.duplicates.length === 0 ? (
                  <Text size="body" color="foreground.2">
                    {t('shopping.noDuplicate')}
                  </Text>
                ) : (
                  <>
                    <Text size="body" color="foreground">
                      {t('shopping.duplicate')}
                    </Text>
                    {/*
                     * WITH THE MEASURED DIFFERENCE, which is half of FR-44's criterion and the
                     * reason `findDuplicates` returns pairs rather than a boolean.
                     */}
                    {check.duplicates.map((pair) => {
                      // The pair always contains the candidate; the OTHER half is the garment
                      // somebody owns, and naming it by id is the difference between "you own
                      // something like this" and "you own THAT jumper".
                      const other = pair.a.id === CANDIDATE_ID ? pair.b : pair.a;
                      return (
                        <Text
                          key={`${pair.a.id}-${pair.b.id}`}
                          size="small"
                          color="foreground.2"
                          numeric
                        >
                          {`${named(other.id)} — ${t('compare.difference')}: ${pair.difference.toFixed(1)}`}
                        </Text>
                      );
                    })}
                  </>
                )}
              </View>
            </Surface>
          </>
        )}
      </View>
    </ScrollView>
  );
}
