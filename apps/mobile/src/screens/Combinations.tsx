/**
 * What goes with a colour (FR-6, FR-73).
 *
 * ## The feature the release is for
 *
 * `@irodora/color-harmony` has generated twelve relationships since F-014 — every colour
 * gamut-mapped, every one carrying the ΔE00 the mapping cost — and **nothing had ever called
 * it**. Reported as *"if shirt is a color, then what color could pants should be … that was the
 * whole point of this app."*
 *
 * ## Nothing here computes
 *
 * [`../combinations.ts`](../combinations.ts) decides which relationships to offer and in what
 * order, and the engine produces every colour. This file formats and labels — the same division
 * `Contemporary` and `Compare` keep, and the reason a test can reach every decision on this
 * screen without rendering anything.
 *
 * ## The word this screen may never use
 *
 * *Should.* These are relationships that exist between colours, not advice about what to wear —
 * and the difference is the whole of NFR-21 pointed at a recommendation. A product that turned
 * a geometric fact into an instruction would be doing what ADR-0031 exists to prevent, in the
 * one place people most want to be told what to do.
 *
 * ## The gamut cost is shown rather than hidden
 *
 * A colour outside the display's reach is still offered, with the number saying how far the
 * shown one is from the asked-for one. *"Less vivid"* is a disclaimer; `ΔE00 1.8` is a
 * measurement, and every figure on this screen carries its unit and its space (FR-48).
 *
 * **A relationship that lost nothing says so.** Zero is a value, not an absence — a screen that
 * simply omitted the line would leave a person unable to tell "nothing moved" from "nobody
 * checked".
 */

import { Button, Card, Row, Screen, Stack, Swatch, Text } from '@irodora/ui';
import type { HarmonyColor } from '@irodora/color-harmony';
import { displayFromOklch } from '../engine';
import { COMBINATIONS_SHOWN, combinationsFor, type Combination } from '../combinations';
import type { PersonalProfile, RuleSet } from '@irodora/recommendation';
import { colorFor, combinationsContaining, entryBySlug } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/**
 * What the screen is about (F-197).
 *
 * ## Why this is a union and not a slug
 *
 * The harmony engine takes an OKLCh. It never needed a corpus entry — that was an accident of
 * F-194 having exactly one caller, and it is what stopped a **garment** from asking the question
 * at all. A garment's colour is a hex somebody captured or typed; it is not in the corpus.
 *
 * The alternative was to resolve a garment to its nearest published colour, and it was rejected:
 * `Wardrobe` forbids the disclosure that would make it honest —
 *
 * > *Report a distance. A garment is IN a group; printing "ΔE00 4.2 from ai-iro" beside a jumper
 * > would present a measurement as a property of the garment.*
 *
 * — so the honest version needs a number that screen may not print, and the dishonest version
 * quietly answers about a different colour than the one asked about.
 *
 * ## The consequence, which is correct
 *
 * **Curated combinations only exist for a corpus colour.** They are keyed by slug because an
 * editor chose specific published colours (F-196). A free colour gets the generated half, and
 * the screen says that is what it got rather than leaving a section silently missing.
 */
export type CombinationSubject =
  | { readonly kind: 'entry'; readonly slug: string }
  | {
      readonly kind: 'colour';
      readonly oklch: readonly [number, number, number];
      readonly hex: string;
      /**
       * What to call it.
       *
       * Supplied by the caller — a garment's name, or its type. Where there is neither, the
       * caller passes the hex, which is the rule this screen already follows for a generated
       * companion: a colour with no name is shown by its value rather than given one.
       */
      readonly label: string;
    };

export interface CombinationsProps {
  /** What this is about. A route parameter, so a miss is a state rather than a crash. */
  readonly subject: CombinationSubject;
  /** Open a colour. Supplied by the route; absent in the conformance suite. */
  readonly onOpenColour?: (slug: string) => void;
  /**
   * Put this colour on a body (F-195).
   *
   * The relationships on this screen are geometry — what sits well beside what. This is the way
   * to the other question, which needs a slot and a ranking rather than a wheel.
   */
  readonly onWearIt?: ((slug: string) => void) | undefined;
  /**
   * The person to weight the ranking by, or `null` for somebody without a profile (F-198).
   *
   * Injected rather than read here, for the reason every screen in this app injects its ports:
   * a branch that depends on device state is a branch no conformance subject can render.
   */
  readonly profile?: PersonalProfile | null;
  /**
   * The published rule set. Supplied by the route, and required whenever a profile is.
   *
   * Taken as a parameter rather than imported so this screen never reaches content itself — the
   * division `Wear` and `Shopping` already keep.
   */
  readonly rules?: RuleSet;
  /**
   * Make a generated companion the colour being compared against (F-200).
   *
   * Takes the hex and the OKLCh rather than a slug, because a companion HAS no slug — it is a
   * coordinate the engine produced. A target is something to compare against rather than
   * something to store, so a colour whose only provenance is *this engine computed it* is a
   * legitimate one.
   */
  readonly onArmCompanion?:
    | ((colour: {
        readonly hex: string;
        readonly oklch: readonly [number, number, number];
      }) => void)
    | undefined;
}

/** The size a proposed colour is drawn at. Large enough to judge, small enough to fit a row. */
const COMPANION = 56;

/**
 * A generated colour, ready to draw.
 *
 * `displayFromOklch` is this app's existing answer for a computed colour and it is reused
 * rather than re-derived — it routes the OKLCh through XYZ, produces the hex the same way every
 * other surface does, and records `source: 'derived'` with confidence 1.
 *
 * **THE GAP THIS COMMENT USED TO RECORD IS CLOSED (F-207).** A companion is not a capture,
 * not a published value and not a hex somebody typed; it is a coordinate an engine computed
 * from another colour. It was filed as `declared` because that was the only untracked bucket
 * available, and `declared` means a person asserted it. ADR-0100 added `derived`, and
 * `displayFromOklch` reports it.
 */
function companion(c: HarmonyColor): ReturnType<typeof displayFromOklch> {
  return displayFromOklch([c.oklch[0], c.oklch[1], c.oklch[2]]);
}

export function Combinations({
  subject,
  onOpenColour,
  onWearIt,
  profile = null,
  rules,
  onArmCompanion,
}: CombinationsProps): React.JSX.Element {
  const { t, script } = useMessages();

  /*
   * A CORPUS ENTRY IS RESOLVED; A FREE COLOUR IS ALREADY WHAT IT IS.
   *
   * `entry` is null for a colour subject, and that is the ONE test the rest of the screen makes:
   * curated combinations, the "open this colour" affordance and the entry's name all hang off
   * it. A miss on a slug lands in the same branch as a slug that resolves to nothing, because
   * from here they are the same fact — there is no corpus colour to be about.
   */
  const entry = subject.kind === 'entry' ? entryBySlug(subject.slug) : null;

  if (subject.kind === 'entry' && entry === null)
    return (
      <Screen title={t('combos.title')} script={script}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </Screen>
    );

  const oklch: readonly [number, number, number] =
    entry === null
      ? (subject as { readonly oklch: readonly [number, number, number] }).oklch
      : [entry.derived.oklch[0], entry.derived.oklch[1], entry.derived.oklch[2]];

  /*
   * ALL TWELVE, SPLIT — not five with seven discarded.
   *
   * The ranking decides what a person sees first; it does not decide what they are allowed
   * to see. A screen that generated twelve relationships and rendered five would be making
   * an editorial choice look like a limit, and the seven it dropped would be work this
   * product does and never shows — which is the exact defect this whole release is about.
   */
  /*
   * WEIGHTED ONLY WHEN BOTH HALVES ARE PRESENT. A profile without the rule set is not half a
   * weighting — `scoreColor` reads the published weights and the falloff from it, so scoring
   * against a default would be inventing content in code, which is what F-029 exists to prevent.
   */
  const weighting = profile === null || rules === undefined ? undefined : { profile, rules };
  const all = combinationsFor([oklch[0], oklch[1], oklch[2]], weighting);
  const leading = all.slice(0, COMBINATIONS_SHOWN);
  const rest = all.slice(COMBINATIONS_SHOWN);

  const subjectName =
    entry === null
      ? (subject as { readonly label: string }).label
      : `${entry.entry.name.kanji} ${entry.entry.name.en}`;

  /*
   * THE CURATED ONES, AND THEY COME FIRST (F-196).
   *
   * A combination an editor chose, with a derivation recorded against it, is a stronger claim
   * than one this engine produced from geometry — so it is not buried under twelve generated
   * relationships. Most colours are in none of them, and that is a legitimate answer: the
   * section is absent rather than apologising for being empty.
   */
  const curated = entry === null ? [] : combinationsContaining(entry.entry.slug);

  /** One relationship: what it is, what it proposes, and what showing it cost. */
  function One({ combination }: { readonly combination: Combination }): React.JSX.Element {
    return (
      <Card
        level="1"
        header={
          <Row gap="sm" align="start">
            <Text size="body" color="foreground" script={script} heading>
              {t(`combo.${combination.kind}` as MessageKey)}
            </Text>
          </Row>
        }
        footer={
          <Stack gap="xs">
            {/*
              LABELLED GENERATED, ALWAYS (criterion 3). A relationship computed from geometry and
              one recorded by a curator are different claims, and F-196 adds the second — so the
              first has to say which it is before there is anything to confuse it with.
            */}
            <Text size="xs" color="foreground.2" script={script}>
              {t('combos.generated')}
            </Text>
            {/*
              THE GAMUT COST, AND ZERO IS A VALUE. A screen that omitted the line when nothing
              moved would leave a person unable to tell "nothing moved" from "nobody checked".
            */}
            {/*
              THE SEPARATION, ALWAYS, AND NEVER AS A VERDICT (F-198).

              A figure on every card rather than a badge on the poor ones: measured over the
              shipped corpus, 53% of relationships fall below the convention, and a mark that
              appears half the time reads as an alarm. `cvd.hard` is added only when it does
              fall below — and it says "these two are hard to tell apart", an observation about
              the colours, never a claim about the reader's vision.
            */}
            {combination.separation === null ? null : (
              <Row gap="sm" wrap>
                <Text size="xs" color="foreground.2" script={script}>
                  {t('cvd.separation')}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {combination.separation.separation.toFixed(1)}
                </Text>
                <Text size="xs" color="foreground.2" script={script}>
                  {t(`cvd.${combination.separation.deficiency}` as MessageKey)}
                </Text>
                <Text size="xs" color="foreground.2" script={script}>
                  {t('combos.severity')}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {combination.separation.severity.toFixed(2)}
                </Text>
                {combination.separation.close ? (
                  <Text size="xs" color="foreground.2" script={script}>
                    {t('cvd.hard')}
                  </Text>
                ) : null}
              </Row>
            )}

            {/*
              HOW WELL IT SUITS THE PERSON, when there is a person. `null` and a real 50 are
              different facts (F-195), so the line is absent rather than showing a midpoint.
            */}
            {combination.personalFit === null ? null : (
              <Row gap="sm">
                <Text size="xs" color="foreground.2" script={script}>
                  {t('combos.personal')}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {String(combination.personalFit)}
                </Text>
              </Row>
            )}

            {combination.wasMapped ? (
              <Row gap="sm">
                <Text size="xs" color="foreground.2" script={script}>
                  {t('combos.cost')}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {combination.gamutCost.toFixed(2)}
                </Text>
                <Text size="xs" color="foreground.2" script={script}>
                  {t('unit.deltaE00')}
                </Text>
                <Text size="xs" color="foreground.2" script={script}>
                  {t('space.cielab')}
                </Text>
              </Row>
            ) : (
              <Text size="xs" color="foreground.2" script={script}>
                {t('combos.exact')}
              </Text>
            )}
          </Stack>
        }
      >
        <Row gap="sm" wrap>
          {combination.companions.map((c) => {
            const shown = companion(c);
            return (
              <Swatch
                key={`${combination.kind}-${shown.hex}`}
                /*
                  NAMED BY ITS VALUE, because it has no other name. A generated colour is not a
                  corpus entry and inventing a name for it would be inventing an editorial claim
                  — `swatchAccessibleName` puts the hex, the source and the confidence into the
                  announcement, so a screen reader hears what it is and where it came from.
                */
                name={shown.hex}
                hex={shown.hex}
                color={shown.color}
                size={COMPANION}
                script={script}
                {...(onArmCompanion === undefined
                  ? {}
                  : {
                      /*
                        A TAP ARMS IT (F-200). The swatch is already the target-sized control on
                        this screen and it had no action; giving it one costs no layout and no
                        extra reading order. The bar that appears is what says it worked.
                      */
                      onPress: () => {
                        onArmCompanion({
                          hex: shown.hex,
                          oklch: [c.oklch[0], c.oklch[1], c.oklch[2]],
                        });
                      },
                    })}
              />
            );
          })}
        </Row>
      </Card>
    );
  }

  return (
    <Screen title={t('combos.title')} script={script}>
      {/*
        WHAT THIS IS, AND WHAT IT IS NOT. NFR-21's weight falls here: these are relationships
        that exist between colours, not advice about what to wear. The claims lint holds the
        wording in both languages.
      */}
      <Text size="small" color="foreground.2" script={script}>
        {t('combos.what')}
      </Text>

      {/*
        THE MISSING HALF, NAMED ONCE (F-198). The same shape `Wear` uses: the other answers
        stand, and the ordering says what it is based on rather than implying it knows the
        person. Placed at the top because it is about the whole list, not about one card.
      */}
      {weighting === undefined ? (
        <Text size="small" color="foreground.2" script={script}>
          {t('combos.personalNone')}
        </Text>
      ) : null}

      <Card
        level="2"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {subjectName}
          </Text>
        }
      >
        {entry === null ? (
          /*
            A FREE COLOUR, DRAWN AS ITSELF. `displayFromOklch` produces the Color with its
            provenance, the same helper every generated companion goes through — so the swatch
            announces what it is and where it came from rather than borrowing a corpus entry's
            identity.
          */
          <Swatch
            name={subjectName}
            hex={displayFromOklch([oklch[0], oklch[1], oklch[2]]).hex}
            color={displayFromOklch([oklch[0], oklch[1], oklch[2]]).color}
            script={script}
          />
        ) : (
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            script={script}
            {...(onOpenColour === undefined
              ? {}
              : {
                  onPress: () => {
                    onOpenColour(entry.entry.slug);
                  },
                })}
          />
        )}
      </Card>

      {/*
        WHY THERE ARE NO CURATED ONES, SAID OUT LOUD (F-197). A section that was simply absent
        would leave a person unable to tell "nobody has curated a combination for this" from
        "this product does not do that" — and for a colour outside the corpus the answer is
        structural: an editor chooses published colours, and this is not one.
      */}
      {entry === null ? (
        <Text size="small" color="foreground.2" script={script}>
          {t('combos.notInCorpus')}
        </Text>
      ) : null}

      {curated.length === 0 ? null : (
        <Stack gap="sm">
          <Text size="small" color="foreground.2" script={script}>
            {t('combos.curatedWhat')}
          </Text>
          {curated.map(({ combination, role }) => (
            <Card
              key={combination.slug}
              level="1"
              header={
                <Stack gap="xs">
                  <Text size="body" color="foreground" script={script} heading>
                    {`${combination.name.ja} ${combination.name.en}`}
                  </Text>
                  <Row gap="sm">
                    {/*
                      CURATED, NEVER MERELY UNLABELLED. The generated cards below say
                      "Generated"; a curated one that said nothing would be told apart only by
                      where it sits on the screen, which is not a distinction a person can rely
                      on (F-194's note, one release on).
                    */}
                    <Text size="xs" color="foreground.2" script={script}>
                      {t('combos.curated')}
                    </Text>
                    <Text size="xs" color="foreground.2" script={script}>
                      {t(`combos.intent.${combination.intent}` as MessageKey)}
                    </Text>
                    {/*
                      WHICH PART THIS COLOUR PLAYS. A person arrived here holding one colour,
                      and "this is the lead" and "this is one of the companions" are different
                      things to know before looking at the rest.
                    */}
                    {role === 'lead' ? (
                      <Text size="xs" color="foreground.2" script={script}>
                        {t('combos.lead')}
                      </Text>
                    ) : null}
                  </Row>
                </Stack>
              }
            >
              <Row gap="sm" wrap>
                {combination.colors.map((m) => {
                  const member = entryBySlug(m.slug);
                  return member === null ? null : (
                    <Swatch
                      key={m.slug}
                      name={member.entry.name.en}
                      hex={member.derived.hex}
                      color={colorFor(member.entry)}
                      size={COMPANION}
                      script={script}
                      {...(onOpenColour === undefined
                        ? {}
                        : {
                            onPress: () => {
                              onOpenColour(m.slug);
                            },
                          })}
                    />
                  );
                })}
              </Row>
            </Card>
          ))}
        </Stack>
      )}

      {/*
        FROM RELATIONSHIPS TO GARMENTS (F-195). Placed above the list rather than under it: a
        person who came here holding a shirt is asking the garment question, and making them
        scroll past twelve relationships to find it would answer a question they did not ask
        first.
      */}
      {onWearIt === undefined || entry === null ? null : (
        <Button
          label={t('wear.open')}
          variant="secondary"
          onPress={() => {
            // Non-null inside this branch — the guard above is what makes "wear it" a corpus
            // question: `Wear` ranks the corpus for a SLUG, and a free colour has none.
            onWearIt(entry.entry.slug);
          }}
          script={script}
        />
      )}

      {leading.map((c) => (
        <One key={c.kind} combination={c} />
      ))}

      {/*
        THE REST, UNDER A HEADING RATHER THAN BEHIND ONE. These change lightness or chroma
        rather than hue, so they are variations on the colour rather than companions to it —
        which is why they come second, and is not a reason to withhold them. A tonal ramp is
        genuinely what somebody wants for a second garment in the same family.
      */}
      {rest.length === 0 ? null : (
        <Text size="small" color="foreground.2" script={script} heading>
          {t('combos.more')}
        </Text>
      )}
      {rest.map((c) => (
        <One key={c.kind} combination={c} />
      ))}
    </Screen>
  );
}
