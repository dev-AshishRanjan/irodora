/**
 * Wear it (FR-31, FR-73).
 *
 * ## The feature
 *
 * A colour goes in a slot and the engine ranks colours for the others. `recommendOutfit` has
 * been exported since **F-030** and called by nothing; this is the surface it never had.
 *
 * ## Nothing here computes
 *
 * [`../wear.ts`](../wear.ts) builds the pool and resolves the slot; `recommendOutfit` produces
 * every number. This file formats and labels — the same division `Combinations`, `Contemporary`
 * and `Compare` keep.
 *
 * ## The two things this screen may never do
 *
 * **It may not say what anybody should wear.** These are ranked colours with a stated basis, and
 * a product that turned a score into an instruction would be doing what ADR-0031 exists to
 * prevent, in the place people most want to be told what to do.
 *
 * **It may not show a number that means less than it looks like it means.** Without a profile
 * the personal half of every blend is the engine's no-evidence midpoint, so the blend is pulled
 * toward the middle for every candidate — the ORDER is right and the MAGNITUDE is an artefact.
 * `shownScore` picks the honest figure, and the missing half is named rather than hidden.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  ChoiceGroup,
  EmptyState,
  Row,
  Screen,
  Stack,
  Swatch,
  Text,
} from '@irodora/ui';
import type { OutfitRecommendation, RankedCandidate } from '@irodora/recommendation';
import { OUTFIT_SLOTS, shownFactors, shownScore, wearWith, type OutfitSlot } from '../wear';
import { colorFor, entryBySlug } from '../corpus';
import { ruleSet } from '../rules';
import { useMessages } from '../i18n/useMessages';
import { isMessageKey, type MessageKey } from '../i18n/index';
import type { PersonalProfile } from '@irodora/recommendation';

export interface WearProps {
  /** The colour in hand. A route parameter, so a miss is a state rather than a crash. */
  readonly slug: string;
  /**
   * The person to score against, or `null` for somebody who has not built a profile.
   *
   * Injected rather than read here, for the reason every other screen in this app injects its
   * ports: a branch that depends on device state is a branch no conformance subject can render,
   * and criterion 3 is entirely about that branch.
   */
  readonly profile?: PersonalProfile | null;
  /** Which slot the colour starts in. Injected so a test can reach all three. */
  readonly initialSlot?: OutfitSlot;
  /** Open a colour. Supplied by the route; absent in the conformance suite. */
  readonly onOpenColour?: (slug: string) => void;
  /** Build a profile. Supplied by the route; the way out of the no-profile state. */
  readonly onBuildProfile?: () => void;
}

/** How many candidates are drawn per slot. FR-31 asks for 5 trousers and 4 shoes; this shows 6. */
const SHOWN_PER_SLOT = 6;

/** The size a candidate colour is drawn at. Large enough to judge against the source. */
const CANDIDATE = 56;

export function Wear({
  slug,
  profile = null,
  initialSlot,
  onOpenColour,
  onBuildProfile,
}: WearProps): React.JSX.Element {
  const { t, script } = useMessages();
  const [slot, setSlot] = useState<OutfitSlot>(initialSlot ?? 'top');

  /*
   * ONE LOOKUP, AND THE NULL COMES FROM IT.
   *
   * An earlier draft asked `entryBySlug` here, returned on null, and then asserted that
   * `wearWith` could not be null either — a relationship between two calls that the compiler
   * cannot see and that would become a crash the day `wearWith` gained a second reason to
   * refuse. The lint refused it, correctly.
   */
  const answer = wearWith(slug, slot, profile, ruleSet());
  if (answer === null)
    return (
      <Screen title={t('wear.title')} script={script}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </Screen>
    );

  /*
   * DESTRUCTURED, because TypeScript drops the null narrowing inside the two components declared
   * below — a closure does not carry the guard, and the alternative is the assertion the lint
   * just refused.
   */
  const { source: found, personalKnown, recommendations } = answer;
  const sourceName = `${found.entry.name.kanji} ${found.entry.name.en}`;

  /** One candidate: the colour, the figure it earned, and why — when there is a why. */
  function One({ candidate }: { readonly candidate: RankedCandidate }): React.JSX.Element {
    const entry = entryBySlug(candidate.id);
    const factors = shownFactors(candidate, personalKnown);
    return (
      <Card
        level="1"
        {...(onOpenColour === undefined || entry === null
          ? {}
          : {
              onPress: () => {
                onOpenColour(candidate.id);
              },
            })}
        header={
          <Row gap="sm" align="center">
            {entry === null ? null : (
              <Swatch
                name={entry.entry.name.en}
                hex={entry.derived.hex}
                color={colorFor(entry.entry)}
                size={CANDIDATE}
                script={script}
              />
            )}
            <Stack gap="xs">
              <Text size="body" color="foreground" script={script} heading>
                {entry === null ? candidate.id : `${entry.entry.name.kanji} ${entry.entry.name.en}`}
              </Text>
              {/*
                THE FIGURE, AND WHICH FIGURE IT IS. Named in the label rather than left as a bare
                number, because "match" and "how it sits with that colour" are different claims
                and only one of them is available without a profile.
              */}
              <Row gap="sm">
                <Text size="xs" color="foreground.2" script={script}>
                  {personalKnown ? t('wear.overall') : t('wear.pairing')}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {String(shownScore(candidate, personalKnown))}
                </Text>
              </Row>
            </Stack>
          </Row>
        }
      >
        {/*
          ALL FOUR FACTORS, ALWAYS, OR NONE AT ALL. FR-29 asks for a per-factor explanation and
          the engine returns every factor in order — a missing one is not an absent opinion, so
          none is filtered for being neutral. Without a profile there are none to draw: the
          object would report a perfect fit on four axes nobody has measured (see `wear.ts`).
        */}
        <Stack gap="xs">
          {factors.map((f, i) => (
            <Text
              key={`${candidate.id}-${String(i)}`}
              size="xs"
              color="foreground.2"
              script={script}
            >
              {isMessageKey(f.messageKey) ? t(f.messageKey) : f.messageKey}
            </Text>
          ))}
        </Stack>
      </Card>
    );
  }

  /** One slot's ranking. */
  function Slot({ rec }: { readonly rec: OutfitRecommendation }): React.JSX.Element {
    const shown = rec.ranked.slice(0, SHOWN_PER_SLOT);
    return (
      <Stack gap="sm">
        <Text size="body" color="foreground" script={script} heading>
          {t(`outfit.${rec.slot}` as MessageKey)}
        </Text>
        {shown.length === 0 ? (
          <EmptyState art="pairing" message={t('wear.none')} resolvedHere script={script} />
        ) : (
          shown.map((c) => <One key={c.id} candidate={c} />)
        )}
      </Stack>
    );
  }

  return (
    <Screen title={t('wear.title')} script={script}>
      {/*
        WHAT THIS IS, AND WHAT IT IS NOT. NFR-21's weight falls here: a ranked list is not an
        instruction. The claims lint holds the wording in both languages.
      */}
      <Text size="small" color="foreground.2" script={script}>
        {t('wear.what')}
      </Text>

      <Card
        level="2"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {sourceName}
          </Text>
        }
      >
        <Stack gap="sm">
          <Swatch
            name={found.entry.name.en}
            hex={found.derived.hex}
            color={colorFor(found.entry)}
            script={script}
          />
          {/*
            THE SLOT IS CHOSEN, NOT ASSUMED (criterion 1). Without this control "a colour
            resolves into a slot" would mean "we picked one for you" — and the engine's answer
            genuinely differs: a colour in the trouser slot asks for tops and shoes instead.
          */}
          <ChoiceGroup
            label={t('wear.slot')}
            options={OUTFIT_SLOTS.map((s) => ({
              value: s,
              label: t(`outfit.${s}` as MessageKey),
            }))}
            value={slot}
            onChange={(v) => {
              if (v !== null) setSlot(v);
            }}
            script={script}
          />
        </Stack>
      </Card>

      {/*
        THE MISSING HALF, NAMED (criterion 3). The other answers stand — which is why this sits
        beside them rather than replacing them, the shape `shopping.ts` already uses for exactly
        this state.
      */}
      {personalKnown ? null : (
        <Card level="1">
          <Stack gap="sm">
            <Text size="small" color="foreground.2" script={script}>
              {t('wear.noProfile')}
            </Text>
            {onBuildProfile === undefined ? null : (
              <Button
                label={t('wear.buildProfile')}
                variant="secondary"
                onPress={onBuildProfile}
                script={script}
              />
            )}
          </Stack>
        </Card>
      )}

      {recommendations.map((rec) => (
        <Slot key={rec.slot} rec={rec} />
      ))}
    </Screen>
  );
}
