/**
 * The front door, as mockup `01` draws it (F-242; FR-71, FR-73).
 *
 * ## What `01` draws, top to bottom
 *
 * - **The lockup** (`01.header.lockup`): the mark beside the name, one figure (F-230, ADR-0123).
 * - **Three proposition lines** in the serif (`01.header.tagline`) — the brief's own questions —
 *   with the on-device pill beside the third (`01.header.chip`).
 * - **The hero** (`01.hero`): the day's corpus colour at full width, its kanji, kana, name and
 *   OKLCh set on the sample (C8), and *What Goes With This →* beneath it.
 * - **The Wardrobe Preview** (`01.wardrobe`): a count pill and the five newest garments, each with
 *   its texture badge where a material is recorded (ADR-0137).
 * - **The colour card** (`01.colour-card`): the same colour's classification and provenance, its
 *   sample at the right.
 * - **Plum-blossom line-art**, top right and down each side.
 *
 * The tab bar under it is the tab layout's (F-234).
 *
 * ## What it binds, and what it does not draw
 *
 * Nothing on this page is copied from the drawing (R9 §4 E1): the colour is the corpus's, the
 * figures the engine's, the garments the store's. `01` draws no reading, so this screen reads no
 * colour row but a garment's own (ADR-0138): the newest `saved_color` row of any source was shown
 * here as *Last reading* until F-242, which is how a palette's corpus colour came to be presented
 * as a measurement (F-337). A colour the Lens read is shown as its garment's tile.
 *
 * ## The rules live in `../home.ts`
 *
 * Which colour, how many garments, what the pill says, what a tile is called: worked out there,
 * pure, so the rules are written where somebody can disagree with them rather than in JSX.
 */

import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { Coverage } from '@irodora/optimization';
import { nativeSpacing } from '@irodora/design-tokens';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Illustration,
  Row,
  Screen,
  Stack,
  Swatch,
  Text,
  TextureBadge,
  Wordmark,
} from '@irodora/ui';
import {
  entrySwatch,
  garmentTileName,
  heroName,
  heroSpoken,
  HOME_HERO,
  HOME_TILES,
  homeContent,
  oklchLine,
  recordedMaterial,
  wardrobeCountLabel,
  wardrobeCountName,
  wardrobeTileSize,
} from '../home';
import { colorOf } from '../wardrobe';
import { useMessages } from '../i18n/useMessages';
import type { StoredGarment } from '@irodora/store';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: an empty
 * wardrobe — the one panel `01` draws that can be empty. The day's colour is always there.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/** What this screen needs from the repository, and nothing else: the garments (ADR-0138 D2). */
export interface HomeStore {
  listGarments(): readonly StoredGarment[];
}

export interface HomeProps {
  readonly store: HomeStore;
  /** Injected so a conformance subject can render a fixed day rather than the machine's. */
  readonly now?: () => number;
  /**
   * The wardrobe's valid outfits against the stored profile (`coverage()`, FR-42), worked out by
   * the route (`src/wardrobe/coverage.ts`). Absent without a profile, and the pill then says the
   * garment count alone (R9 §4 E2).
   */
  readonly coverage?: Pick<Coverage, 'valid' | 'threshold'> | undefined;
  /** *What Goes With This →*: the day's colour's combinations, by its slug (F-202). */
  readonly onOpenCombinations?: ((slug: string) => void) | undefined;
  /** A garment tile: that garment's combinations, by its id (ADR-0138 D5). */
  readonly onOpenGarment?: ((id: string) => void) | undefined;
  /** 27's *Scan First Garment*, on an empty wardrobe. */
  readonly onOpenLens?: (() => void) | undefined;
}

/**
 * `01`'s three plum branches, in the frame's dp (2 px per dp), measured from its inventory. Each is
 * drawn at its box's height in the drawing's own proportion, and the two on the sides run on past
 * the screen's edge, as `01` draws them, where the art layer clips them.
 */
export const HOME_ART = {
  /** `01.header.line-art`: x 235.5–384, y 7.5, 148.5 wide. */
  header: { right: 0, top: 7.5, width: 148.5 },
  /** `01.side-art-right`: 36 dp of a branch 104 tall, from y 140. */
  right: { right: -84, top: 140, width: 120 },
  /** `01.side-art`: 36 dp of a branch 189 tall, from y 421. */
  left: { left: -182, top: 421, width: 218 },
} as const;

/** `01.hero.cta`: a full-width pill, drawn 35.5 dp tall. */
const CTA_HEIGHT = 35.5;
/** `01.header.chip`: drawn 20 dp tall. */
const ON_DEVICE_HEIGHT = 20;
/** `01.wardrobe.count`: drawn 18 dp tall. */
const COUNT_HEIGHT = 18;
/** `01.hero.sample`'s line, 5 px across at 2 px per dp (raw.keylinePx, C20). */
const HERO_KEYLINE = 2.5;
/** `01.colour-card.sample`: 52 × 40 dp. */
const CARD_SAMPLE = { width: 52, height: 40 } as const;

export function Home({
  store,
  now = () => Date.now(),
  coverage,
  onOpenCombinations,
  onOpenGarment,
  onOpenLens,
}: HomeProps): React.JSX.Element {
  const { t, script } = useMessages();
  const { width } = useWindowDimensions();

  // Read once per render and selected purely; the memo saves re-reading the wardrobe on a re-render.
  const content = useMemo(() => homeContent(store.listGarments(), now()), [store, now]);
  const today = content.today;
  const sample = today === null ? null : entrySwatch(today);
  const tile = wardrobeTileSize(width);
  const garments = content.wardrobe.garments;
  const countLabel = wardrobeCountLabel(content.wardrobe.count, coverage, t, script);

  return (
    <Screen padding="xl" script={script}>
      {/*
        THE ART LAYER, behind everything and touching nothing. It spans the frame, not the content:
        it starts at the screen's top-left (the inset taken back) and clips what runs past the edge.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -nativeSpacing.xl,
          left: -nativeSpacing.xl,
          right: -nativeSpacing.xl,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', ...HOME_ART.header }}>
          <Illustration
            name="plum-branch"
            tone="backdrop"
            color="foreground"
            width={HOME_ART.header.width}
          />
        </View>
        <View style={{ position: 'absolute', ...HOME_ART.right }}>
          <Illustration
            name="plum-branch"
            tone="backdrop"
            color="foreground"
            width={HOME_ART.right.width}
          />
        </View>
        <View style={{ position: 'absolute', ...HOME_ART.left }}>
          <Illustration
            name="plum-branch"
            tone="backdrop"
            color="foreground"
            width={HOME_ART.left.width}
          />
        </View>
      </View>

      <Stack gap="md">
        {/*
          THE HEADER: the lockup in a column of its own (E-173), then the proposition and the pill
          beside its last line. NO CLAIM ABOUT ACCURACY in either: the pill says where the engine
          runs, which is true by construction (ADR-0051), and nothing about how well.
        */}
        <Stack gap="md">
          <Wordmark form="app" heading />
          <Row align="end" gap="md" wrap>
            <Text size="body" face="serif" color="foreground" script={script} heading>
              {`${t('home.what1')}\n${t('home.what2')}\n${t('home.what3')}`}
            </Text>
            <View>
              <Chip
                form="badge"
                label={t('home.onDevice')}
                height={ON_DEVICE_HEIGHT}
                size="caption"
                // "100%" is a figure, so it is set as one (FR-48, C9).
                numeric
                script={script}
              />
            </View>
          </Row>
        </Stack>

        {/* The three cards, at `01`'s interval between them: 7.5 and 5.5 dp, a tie, so `xs` (§2). */}
        <Stack gap="xs">
          {today === null || sample === null ? null : (
            <Card level="1" testID="home.hero">
              <Stack gap="sm">
                <Swatch
                  width="fill"
                  height={HOME_HERO}
                  keylineWidth={HERO_KEYLINE}
                  // EVERYTHING PRINTED ON IT, IN ITS NAME (WCAG 1.3.1): a Swatch is one control, so
                  // the text drawn on it is heard only through its name (F-242's review, S4).
                  name={heroSpoken(today, t('coord.oklch'))}
                  hex={sample.hex}
                  color={sample.color}
                >
                  {/*
                    THE NAMES ON THE SAMPLE (C8): each set with `on`, which takes the ink that
                    clears 4.5:1 on this colour (ADR-0116). The kanji leads, as the corpus orders
                    them; the line under it is the engine's derivation, never `01`'s figures (E1).
                  */}
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'flex-end',
                      paddingHorizontal: nativeSpacing.md,
                      paddingBottom: nativeSpacing.sm,
                    }}
                  >
                    {/* At 400, as 01 records it: the Japanese title step is 600 (F-242's review, B1). */}
                    <Text size="title" on={sample} script="japanese" weight={400}>
                      {today.entry.name.kanji}
                    </Text>
                    <Text size="label" on={sample} script="japanese" weight={400}>
                      {today.entry.name.kana}
                    </Text>
                    <Text size="label" on={sample} weight={500}>
                      {heroName(today.entry.name)}
                    </Text>
                    <Text size="label" on={sample} numeric>
                      {oklchLine(today.derived.oklch, t('coord.oklch'))}
                    </Text>
                  </View>
                </Swatch>
                {onOpenCombinations === undefined ? null : (
                  <Button
                    label={t('home.whatGoesWithThis')}
                    glyph="arrow-right"
                    height={CTA_HEIGHT}
                    script={script}
                    onPress={() => {
                      onOpenCombinations(today.entry.slug);
                    }}
                  />
                )}
              </Stack>
            </Card>
          )}

          {content.wardrobe.count === 0 ? (
            /*
              THE EMPTY WARDROBE IS 27'S CARD (F-236), in `01.wardrobe`'s place: the same data
              condition as the Wardrobe screen's, so the same heading, body and way out. Without the
              Lens it is 00's caption, which offers nothing it cannot do.
            */
            onOpenLens !== undefined ? (
              <EmptyState
                title={t('wardrobe.empty.title')}
                body={t('wardrobe.empty.body')}
                action={{ label: t('wardrobe.empty.scan'), onPress: onOpenLens }}
                script={script}
              />
            ) : (
              <EmptyState message={t('home.wardrobeEmpty')} resolvedHere script={script} />
            )
          ) : (
            <Card level="1" testID="home.wardrobe">
              <Stack gap="md">
                {/*
                  ONE LINE AS 01 DRAWS IT, AND TWO WHERE IT WILL NOT FIT (F-242's review, S1): in
                  Japanese, on a narrow phone or at 200 % text the pill would be clipped by the card,
                  and content may not be lost (WCAG 1.4.4, NFR-8). So the pill wraps below the title.
                */}
                <Row justify="between" gap="sm" wrap>
                  <Text size="body" weight={500} color="foreground" script={script} heading>
                    {t('home.wardrobePreview')}
                  </Text>
                  <View>
                    <Chip
                      form="badge"
                      label={countLabel}
                      name={wardrobeCountName(countLabel, coverage, t)}
                      height={COUNT_HEIGHT}
                      size="caption"
                      numeric
                      script={script}
                    />
                  </View>
                </Row>
                {/* `01`'s row of five, spread across the card; fewer start at the left. */}
                <Row {...(garments.length === HOME_TILES ? { justify: 'between' as const } : {})}>
                  {garments.map((g) => {
                    const hex = g.color.hex;
                    const color = colorOf(g.color);
                    return (
                      <Swatch
                        key={g.id}
                        size={tile}
                        name={garmentTileName(g, t)}
                        hex={hex}
                        color={color}
                        {...(onOpenGarment === undefined
                          ? {}
                          : {
                              onPress: () => {
                                onOpenGarment(g.id);
                              },
                            })}
                      >
                        {recordedMaterial(g) === null ? null : (
                          <View
                            style={{
                              position: 'absolute',
                              right: nativeSpacing.xs,
                              bottom: nativeSpacing.xs,
                            }}
                          >
                            <TextureBadge on={{ hex, color }} />
                          </View>
                        )}
                      </Swatch>
                    );
                  })}
                </Row>
              </Stack>
            </Card>
          )}

          {today === null || sample === null ? null : (
            <Card level="1" testID="home.colourCard">
              <Row align="start" gap="md">
                <View style={{ flex: 1 }}>
                  {/*
                    THE CLASSIFICATION, TRUE (E1, FR-23): `01` heads this card "traditional", and no
                    entry is. The note is the entry's own provenance, printed as the colour page
                    prints it: a citation, in the script it is written in.
                  */}
                  <Text size="body" weight={500} color="foreground" script={script} heading>
                    {t('home.colourCard')}
                  </Text>
                  {/* A citation carries its year, a figure (FR-48, C9). */}
                  <Text size="label" color="foreground.2" script="latin" numeric>
                    {today.entry.provenance.source}
                  </Text>
                </View>
                <Swatch
                  width={CARD_SAMPLE.width}
                  height={CARD_SAMPLE.height}
                  name={today.entry.name.en}
                  hex={sample.hex}
                  color={sample.color}
                />
              </Row>
            </Card>
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
