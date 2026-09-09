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
import type { Alternative, OutfitRecommendation, RankedCandidate } from '@irodora/recommendation';
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
  /**
   * Take this colour to the shopping check, carrying the slot it was ranked for (F-199).
   *
   * The slot is the reason this belongs here and not on the combinations screen: a ranked
   * candidate is the only colour in this product that HAS one.
   */
  readonly onShopFor?: ((slug: string, slot: OutfitSlot) => void) | undefined;
  /** Offer this colour to the wardrobe. Nothing is stored until the person saves (F-199). */
  readonly onAddToWardrobe?: ((slug: string) => void) | undefined;
}

/** How many candidates are drawn per slot. FR-31 asks for 5 trousers and 4 shoes; this shows 6. */
const SHOWN_PER_SLOT = 6;

/** The size a candidate colour is drawn at. Large enough to judge against the source. */
const CANDIDATE = 56;

/**
 * The swatch on an alternative.
 *
 * Smaller than a ranked candidate on purpose: an alternative is a sideways step from the top
 * pick, not a fifth thing competing with the four above it, and the size is the only channel
 * that says so without a sentence.
 */
const ALTERNATIVE = 40;

export function Wear({
  slug,
  profile = null,
  initialSlot,
  onOpenColour,
  onBuildProfile,
  onShopFor,
  onAddToWardrobe,
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
      /*
        NOT PRESSABLE AS A WHOLE, DELIBERATELY (F-199).

        `Card` makes the whole card one target (F-184), and this one now carries controls —
        putting buttons inside a pressable card nests pressables, which `ChoiceGroup` refused
        for the same reason one feature earlier. Three named controls also make "one
        interaction" true rather than "one interaction once you find the right part of the card".
      */
      <Card
        level="1"
        footer={
          entry === null ? undefined : (
            <Row gap="sm" wrap>
              {onOpenColour === undefined ? null : (
                <Button
                  label={t('wear.openColour')}
                  variant="secondary"
                  onPress={() => {
                    onOpenColour(candidate.id);
                  }}
                  script={script}
                />
              )}
              {onShopFor === undefined ? null : (
                <Button
                  label={t('wear.shopFor')}
                  variant="secondary"
                  onPress={() => {
                    onShopFor(candidate.id, candidate.slot);
                  }}
                  script={script}
                />
              )}
              {onAddToWardrobe === undefined ? null : (
                <Button
                  label={t('wear.addToWardrobe')}
                  variant="secondary"
                  onPress={() => {
                    onAddToWardrobe(candidate.id);
                  }}
                  script={script}
                />
              )}
            </Row>
          )
        }
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

  /**
   * One alternative: the direction, in words, and the colour that goes that way.
   *
   * **THE AXIS IS THE HEADING, AND IT IS WORDS.** A warmer colour does not look "warmer" beside
   * a cooler one unless something says which is which — the swatch cannot carry this, and
   * ADR-0076 had the same argument at the engine level when a grey at 66° was offered as warm.
   *
   * Same `Card` shape as a ranked candidate, at a smaller weight, rather than a new component:
   * the screen already has an idiom for an optional handler, and reusing it keeps these inside
   * a component the conformance suite covers.
   */
  function AlternativeCard({ alt }: { readonly alt: Alternative }): React.JSX.Element {
    const entry = entryBySlug(alt.candidate.id);
    return (
      <Card
        level="1"
        footer={
          entry === null || onOpenColour === undefined ? undefined : (
            <Button
              label={t('wear.openColour')}
              variant="secondary"
              onPress={() => {
                onOpenColour(alt.candidate.id);
              }}
              script={script}
            />
          )
        }
        header={
          <Row gap="sm" align="center">
            {entry === null ? null : (
              <Swatch
                name={entry.entry.name.en}
                hex={entry.derived.hex}
                color={colorFor(entry.entry)}
                size={ALTERNATIVE}
                script={script}
              />
            )}
            <Stack gap="xs">
              <Text size="body" color="foreground" script={script} heading>
                {t(`alt.${alt.axis}` as MessageKey)}
              </Text>
              <Text size="xs" color="foreground.2" script={script}>
                {entry === null
                  ? alt.candidate.id
                  : `${entry.entry.name.kanji} ${entry.entry.name.en}`}
              </Text>
            </Stack>
          </Row>
        }
      />
    );
  }

  /**
   * The alternatives for one slot, or nothing at all.
   *
   * **NO BRANCH FILLS A MISSING AXIS.** The engine omits an axis it has no candidate for —
   * *"three real ones and a missing fourth is an honest answer, while four where one is
   * mislabelled is not"* — and this maps what it returned. A screen that rendered four slots
   * and filled the gap would be inventing the one thing the engine refused to.
   *
   * An empty set draws NOTHING, heading included. A heading over nothing is this screen’s
   * version of "0 results".
   *
   * AN ALTERNATIVE ALREADY IN THE LIST ABOVE IS NOT A DUPLICATE: the label is the content, and
   * "like that, but cooler" is a different statement from "fourth". It can equally be a colour
   * the list never reached — `alternativesFor` searches every ranked candidate up to the
   * engine’s shortlist bound of 64, and six are shown.
   */
  function Alternatives({ rec }: { readonly rec: OutfitRecommendation }): React.JSX.Element | null {
    if (rec.alternatives.length === 0) return null;
    return (
      <Stack gap="xs">
        <Text size="xs" color="foreground.2" script={script}>
          {t('wear.alternatives')}
        </Text>
        {rec.alternatives.map((a) => (
          <AlternativeCard key={a.axis} alt={a} />
        ))}
      </Stack>
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
        {shown.length === 0 ? null : <Alternatives rec={rec} />}
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
