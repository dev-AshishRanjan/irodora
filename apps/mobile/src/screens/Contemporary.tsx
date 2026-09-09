/**
 * What you could actually buy in this colour (FR-72).
 *
 * ## Two kinds, and the screen never blurs them
 *
 * A **computed** equivalent carries its ΔE00 and says it was computed. An **editorial** one
 * carries a note, a source and a reviewer. They are a discriminated union, so the branch below is
 * not a style choice — reading a delta off an editorial equivalent does not compile.
 *
 * That distinction is the feature. A computed neighbour presented as editorial judgement is a
 * claim nobody made, which is the same move ADR-0005 makes for provenance.
 *
 * ## The word this screen may never use
 *
 * *Match.* Naming returns the closest reference ranked by ΔE00 and this returns the nearest
 * member of a curated palette; neither is an assertion that one colour IS another (FR-7,
 * ADR-0031). The claims lint enforces it in both languages.
 *
 * ## Nothing here computes
 *
 * `equivalentsFor` in [`../contemporary.ts`](../contemporary.ts) does all of it, and is reachable
 * by a test that never renders anything. This file formats and labels.
 */

import { Card, Pair, Row, Screen, Stack, Surface, Swatch, Text } from '@irodora/ui';
import { View } from 'react-native';

import {
  equivalentsFor,
  EQUIVALENT_CEILING,
  type Equivalent,
  type Equivalents,
} from '../contemporary';
import { colorFor, entryBySlug } from '../corpus';
import { useMessages } from '../i18n/useMessages';

export interface ContemporaryProps {
  /** The colour this is about. A route parameter, so a miss is a state rather than a crash. */
  readonly slug: string;
  /** Open a colour. Supplied by the route; absent in the conformance suite. */
  readonly onOpenColour?: (slug: string) => void;
  /**
   * The equivalents to draw, instead of the ones this colour has.
   *
   * **For the EDITORIAL branch, which no published entry can reach.** An editorial equivalent
   * needs a note, a source and a reviewer, and the corpus this app ships carries none — so
   * without this, the branch below would be a tree nobody has ever rendered, which is the shape
   * that costs this repository an increment every time it recurs.
   *
   * The same affordance `Compare`, `PaletteStudio` and the Lens already have, for the same
   * reason: a registry that can only reach one branch is checking half a screen.
   */
  readonly initialEquivalents?: Equivalents;
}

export function Contemporary({
  slug,
  onOpenColour,
  initialEquivalents,
}: ContemporaryProps): React.JSX.Element {
  const { t, script } = useMessages();
  const subject = entryBySlug(slug);

  if (subject === null)
    return (
      <Screen title={t('contemporary.title')} script={script}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </Screen>
    );

  const { membership, computed, editorial, nothingNear } =
    initialEquivalents ?? equivalentsFor(subject);

  /*
   * The subject as a half of a pair, built once.
   *
   * Hoisted rather than read inside `Computed` because a narrowing does not survive into a
   * closure — `subject` is `PublishedEntry | null` at the point that function is defined, and
   * TypeScript is right about that even though the early return makes it unreachable.
   */
  const half = {
    name: subject.entry.name.en,
    hex: subject.derived.hex,
    color: colorFor(subject.entry),
  };
  const subjectSlug = subject.entry.slug;
  const subjectName = `${subject.entry.name.kanji} ${subject.entry.name.en}`;

  /** One computed equivalent: the pair, then the number, then which palettes it is in. */
  function Computed({ item }: { readonly item: Equivalent }): React.JSX.Element | null {
    if (item.kind !== 'computed') return null;
    return (
      /*
        THE PAIR IS MEDIA (F-184), and that is not a rename.

        F-151 established that this screen answers "how close is this" AT THE BOUNDARY — a
        number beside two separated swatches is a number somebody has to take on trust. It then
        put the pair inside a padded `Surface`, so the two colours meeting each other sat
        16px in from the card's own edge, framed. **The frame is the thing F-151 was removing**,
        one level out.

        `media` escapes the padding. The pair now meets the card's edge, and the numbers below
        it are inset — which is the shape the argument asked for and the padded box could not
        express.
      */
      <Card
        level="1"
        media={
          <Pair
            a={half}
            b={{
              name: item.entry.entry.name.en,
              hex: item.entry.derived.hex,
              color: colorFor(item.entry.entry),
            }}
            script={script}
          />
        }
      >
        <Stack gap="sm">
          <Row gap="sm" align="baseline">
            <Text size="small" color="foreground" script={script}>
              {t('contemporary.computed')}
            </Text>
            <View style={{ flex: 1 }} />
            {/* Tabular and selectable, with its unit and its space, like every figure (FR-48). */}
            <Text size="small" color="foreground" numeric selectable>
              {item.deltaE00.toFixed(2)}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {t('unit.deltaE00')}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {t('space.cielab')}
            </Text>
          </Row>

          {item.inPalettes.map((p) => (
            <Text key={p.paletteSlug} size="xs" color="foreground.2" script={script}>
              {`${t('contemporary.inPalette')} ${p.paletteName} · ${p.role}`}
            </Text>
          ))}
        </Stack>
      </Card>
    );
  }

  /** One editorial equivalent: the note, then who said it and where it came from. */
  function Editorial({ item }: { readonly item: Equivalent }): React.JSX.Element | null {
    if (item.kind !== 'editorial') return null;
    return (
      /*
        THE HEADER SAYS WHAT KIND OF CLAIM THIS IS; THE FOOTER SAYS WHOSE (F-184).

        These were four Texts in a stack: the word "editorial", the note, the source, the
        reviewer — all the same weight, all the same inset, so the KIND and the PROVENANCE read
        as continuations of the note rather than as the frame around it. That is the flattening
        48 identical surfaces produced, and it matters most here: this screen's whole job is
        keeping a computed neighbour and a recorded judgement distinguishable, and it was
        drawing them in the same box.
      */
      <Card
        level="1"
        header={
          <Text size="small" color="foreground" script={script}>
            {t('contemporary.editorial')}
          </Text>
        }
        footer={
          <Stack gap="xs">
            {/*
              THE PROVENANCE, ALWAYS. An editorial equivalent is somebody's recorded judgement,
              and a judgement without a name on it is the corpus's authority lent to an opinion.
            */}
            <Text size="xs" color="foreground.2" script={script}>
              {`${t('contemporary.source')} ${item.provenance.source}`}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {`${t('contemporary.reviewedBy')} ${item.provenance.verifiedBy}`}
            </Text>
          </Stack>
        }
      >
        <Text size="body" color="foreground" script={script}>
          {item.note}
        </Text>
      </Card>
    );
  }

  return (
    <Screen title={t('contemporary.title')} script={script}>
      <Text size="small" color="foreground.2" script={script}>
        {t('contemporary.what')}
      </Text>

      {/*
        WHERE THE REFERENCE SET COMES FROM, said on the screen. A person deciding what to buy
        deserves to know they are being shown this product's own curated palettes rather than an
        industry standard nobody here licensed.
      */}
      <Text size="xs" color="foreground.2" script={script}>
        {t('contemporary.source.note')}
      </Text>

      {/*
        THE SUBJECT SITS HIGHER THAN THE ANSWERS (F-184).

        `level="2"` rather than 1, and it is the first time this product has used the elevation
        scale for anything: all 48 surfaces in the screens were level 1, so a card that was the
        SUBJECT of a page and a card that was one of its several ANSWERS were drawn identically.
        Depth by tint is what the scale is for, and nothing had spent it.

        Its name is a header rather than a first child, so the rule separates the colour being
        asked about from the colour itself.
      */}
      <Card
        level="2"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {subjectName}
          </Text>
        }
      >
        <Swatch
          name={half.name}
          hex={half.hex}
          color={half.color}
          script={script}
          {...(onOpenColour === undefined
            ? {}
            : {
                onPress: () => {
                  onOpenColour(subjectSlug);
                },
              })}
        />
      </Card>

      {/*
        BEING IN A PALETTE IS A DIFFERENT SENTENCE from being near one, and it comes first: a
        colour that is already in Quiet Neutrals does not need its nearest neighbour explained.
      */}
      {/*
        A NOTE, NOT A CARD, and the distinction is the point of having both. This is a short list
        of palettes the colour is already in — no media, no provenance to foot, nothing to
        separate with a rule. `Surface` is the right shape for it, and converting every box to a
        Card would recreate the sameness this feature exists to end, one component along.
      */}
      {membership.length === 0 ? null : (
        <Card
          level="1"
          padding="lg"
          header={
            <Text size="body" color="foreground" script={script} heading>
              {t('contemporary.itself')}
            </Text>
          }
        >
          <Stack gap="xs">
            {membership.map((p) => (
              <Text key={p.paletteSlug} size="small" color="foreground" script={script}>
                {`${p.paletteName} · ${p.role}`}
              </Text>
            ))}
          </Stack>
        </Card>
      )}

      {editorial.map((item, i) => (
        <Editorial key={`editorial-${String(i)}`} item={item} />
      ))}

      {nothingNear ? (
        /*
          NOTHING WITHIN THE CEILING IS AN ANSWER. The reference set is 28 colours wide, so a
          colour can genuinely have no near neighbour in it — and offering the least distant
          thing with a number beside it is how a product ends up asserting a correspondence it
          cannot stand behind.
        */
        <Surface
          /* surface-not-card: a refusal and the threshold it was measured against; a heading would name a section that is one sentence long. */
          level="1"
          padding="lg"
        >
          <Stack gap="xs">
            <Text size="body" color="foreground" script={script}>
              {t('contemporary.none')}
            </Text>
            <Row gap="sm" align="baseline">
              <Text size="xs" color="foreground.2" script={script}>
                {t('contemporary.noneHint')}
              </Text>
              <Text size="xs" color="foreground.2" numeric>
                {EQUIVALENT_CEILING.toFixed(2)}
              </Text>
            </Row>
          </Stack>
        </Surface>
      ) : (
        computed.map((item, i) => <Computed key={`computed-${String(i)}`} item={item} />)
      )}
    </Screen>
  );
}
