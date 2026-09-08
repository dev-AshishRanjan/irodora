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

import { Card, Row, Screen, Stack, Swatch, Text } from '@irodora/ui';
import type { HarmonyColor } from '@irodora/color-harmony';
import { displayFromOklch } from '../engine';
import { COMBINATIONS_SHOWN, combinationsFor, type Combination } from '../combinations';
import { colorFor, entryBySlug } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

export interface CombinationsProps {
  /** The colour this is about. A route parameter, so a miss is a state rather than a crash. */
  readonly slug: string;
  /** Open a colour. Supplied by the route; absent in the conformance suite. */
  readonly onOpenColour?: (slug: string) => void;
}

/** The size a proposed colour is drawn at. Large enough to judge, small enough to fit a row. */
const COMPANION = 56;

/**
 * A generated colour, ready to draw.
 *
 * `displayFromOklch` is this app's existing answer for a computed colour and it is reused
 * rather than re-derived — it routes the OKLCh through XYZ, produces the hex the same way every
 * other surface does, and records `source: 'declared'` with confidence 1.
 *
 * **A NOTE ON THAT PROVENANCE, because it is the honest place to put it.** The four sources are
 * `reference | calibrated | estimated | declared`, and a companion is none of them exactly: it
 * is not a capture, not a published value, and not a hex somebody typed — it is a coordinate an
 * engine computed from another colour. `declared` is the untracked bucket and is what this app
 * already uses for exactly this, so following it keeps one answer rather than inventing a
 * second. That the model has no `derived` source is a real gap and it is recorded as F-207
 * rather than closed in passing: changing the provenance union is ADR-0005's territory.
 */
function companion(c: HarmonyColor): ReturnType<typeof displayFromOklch> {
  return displayFromOklch([c.oklch[0], c.oklch[1], c.oklch[2]]);
}

export function Combinations({ slug, onOpenColour }: CombinationsProps): React.JSX.Element {
  const { t, script } = useMessages();
  const subject = entryBySlug(slug);

  if (subject === null)
    return (
      <Screen title={t('combos.title')} script={script}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </Screen>
    );

  const { oklch } = subject.derived;

  /*
   * ALL TWELVE, SPLIT — not five with seven discarded.
   *
   * The ranking decides what a person sees first; it does not decide what they are allowed
   * to see. A screen that generated twelve relationships and rendered five would be making
   * an editorial choice look like a limit, and the seven it dropped would be work this
   * product does and never shows — which is the exact defect this whole release is about.
   */
  const all = combinationsFor([oklch[0], oklch[1], oklch[2]]);
  const leading = all.slice(0, COMBINATIONS_SHOWN);
  const rest = all.slice(COMBINATIONS_SHOWN);

  const subjectName = `${subject.entry.name.kanji} ${subject.entry.name.en}`;

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

      <Card
        level="2"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {subjectName}
          </Text>
        }
      >
        <Swatch
          name={subject.entry.name.en}
          hex={subject.derived.hex}
          color={colorFor(subject.entry)}
          script={script}
          {...(onOpenColour === undefined
            ? {}
            : {
                onPress: () => {
                  onOpenColour(slug);
                },
              })}
        />
      </Card>

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
