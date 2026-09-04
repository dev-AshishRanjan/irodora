/**
 * The Lens — a colour under a crosshair, and what the app is willing to say about it (FR-13).
 *
 * ## This file holds no camera, and that is the design
 *
 * A VisionCamera view cannot be rendered by jest, and `scripts/a11y-scope.mjs` fails on a screen
 * the conformance registry does not reach. A `Lens` that imported `react-native-vision-camera`
 * would therefore be either unregistered — reported, and rightly — or registered with a render
 * that never runs, which is the worse of the two because it looks like coverage.
 *
 * So the viewfinder arrives as a **node**. `app/lens.tsx` passes the real one;
 * `test/screens.test.tsx` passes `null` and checks every pixel this file is responsible for.
 * The precedent is `app/profile.tsx`, which imports `deviceRepository` in the route for exactly
 * this reason: *"a screen that imported it could not be rendered by jest at all"*.
 *
 * The split is worth more than the checker. Everything here is layout, copy and formatting —
 * the parts that go wrong quietly — and none of it needs a phone to be wrong in front of you.
 *
 * ## What it says about a reading, and in what order
 *
 * FR-17: **the capture conditions come before the value.** A hex shown first and qualified
 * afterwards is a number people have already read. So the order is illumination, capture space
 * and confidence, then the colour, then the nearest names.
 *
 * `instruction` is the reading's own sentence about what to change, built by F-040's quality
 * assessment. It is shown verbatim rather than re-derived from `quality` here — a second
 * opinion about a capture this file did not see would be the app arguing with itself.
 *
 * **No measurement claim, anywhere.** A camera reading is `estimated` provenance, and NFR-21's
 * copy lint binds the word "measured" to `reference` and `calibrated` (ADR-0031). The screen
 * says what it read and how sure it is; it never says how accurate it is, because nobody has
 * established that — NFR-23's study belongs to F-037 and has not run.
 *
 * ## It does not know what it is looking at
 *
 * There is no face detection here, no guidance toward a person, and no vocabulary for one.
 * [ADR-0010](../../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) refuses a
 * skin sample on four grounds, and the strongest guarantee against it is the one this surface
 * has by construction: it reads a colour under a crosshair and has no idea what is in front of
 * the lens.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { Button, Row, Screen, Sheet, Stack, Status, Surface, Swatch, Text } from '@irodora/ui';
import { displayFromOklch } from '../engine';
import { nearestByOklch, type NearestEntry } from '../finder';
import { colorFor } from '../corpus';
import { readingOklch, worthOffering } from '../profile/photo';
import type { CaptureSpace, LensReading } from '../lens/reading';
import type { LensPermission } from '../lens/permission';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** How many corpus names a reading is given. Three is a comparison; eight is a list to read. */
export const LENS_NAME_LIMIT = 3;

/**
 * Re-exported so a caller of this screen needs one import, while the definition lives beside
 * the mapping that produces it — in a file with no native import (F-104).
 */
export type { LensPermission } from '../lens/permission';

/** Capture space → the label that names it. Total, so a fourth space is a compile error. */
const SPACE_KEYS: Readonly<Record<CaptureSpace, MessageKey>> = {
  srgb: 'lens.space.srgb',
  'display-p3': 'lens.space.displayP3',
  unknown: 'lens.space.unknown',
};

/** Illumination → its label. FR-17 shows this BEFORE the value, never as a footnote. */
const ILLUMINATION_KEYS: Readonly<Record<LensReading['illumination'], MessageKey>> = {
  daylight: 'lens.light.daylight',
  'warm-indoor': 'lens.light.warmIndoor',
  'cool-indoor': 'lens.light.coolIndoor',
  mixed: 'lens.light.mixed',
  'low-light': 'lens.light.lowLight',
  unknown: 'lens.light.unknown',
};

export interface LensProps {
  /**
   * The live viewfinder, or `null`.
   *
   * A node rather than a component: this file must not import anything that reaches a native
   * module, or it stops being renderable and the conformance registry loses a screen.
   */
  readonly viewfinder?: React.ReactNode;
  /** The latest reading, or `null` before there is one. */
  readonly reading?: LensReading | null;
  /**
   * Why there is no reading, when the frame output can say.
   *
   * Shown **only** in the empty state, and never beside a reading. It is not copy in the
   * product's voice and it is not meant to be: *"waiting"* was the whole of what this screen
   * could say about four different failures — no frames at all, a GPU-only buffer, a planar
   * format, a zero-sized region — and a person looking at a live preview that produces nothing
   * cannot tell those apart, nor report which one they have.
   */
  readonly diagnostic?: string | null;
  readonly permission?: LensPermission;
  /** Ask for camera access. Absent in the conformance suite. */
  readonly onRequestPermission?: () => void;
  /** Hand this reading to profile setup (FR-27). Absent when nothing can receive it. */
  readonly onUseForProfile?: (reading: LensReading) => void;
  /**
   * Hand this reading to the wardrobe (FR-40, F-125).
   *
   * The wardrobe has been able to RECEIVE one since F-043 — `app/wardrobe/add.tsx` calls
   * `takeReading('wardrobe')` and `AddGarment` draws a control for it — but **nothing in the
   * app ever sent one**, so that control could not be reached on a device. A consumer with no
   * producer [[a-column-nothing-writes-makes-its-own-feature-unfalsifiable]], and invisible
   * because every test supplied the reading itself.
   */
  readonly onUseForWardrobe?: (reading: LensReading) => void;
  /** Open a corpus entry. Supplied by the route. */
  readonly onOpenColour?: (slug: string) => void;
}

export function Lens({
  viewfinder = null,
  reading = null,
  diagnostic = null,
  permission = 'undetermined',
  onRequestPermission,
  onUseForProfile,
  onUseForWardrobe,
  onOpenColour,
}: LensProps = {}): React.JSX.Element {
  const { t, script } = useMessages();

  /*
   * Everything derived from the reading, in one place, so a `null` reading has one branch
   * rather than six.
   */
  const oklch = reading === null ? null : readingOklch(reading);
  const display = oklch === null ? null : displayFromOklch(oklch);
  const nearest: readonly NearestEntry[] =
    oklch === null ? [] : nearestByOklch(oklch, LENS_NAME_LIMIT);

  /*
   * FR-27's offer, and it is the READING's verdict rather than this screen's. `worthOffering`
   * is the same function `ProfileSetup` uses to decide whether to propose an estimate — asking
   * it here as well means the button cannot appear for a reading the next screen would refuse,
   * which is a dead end a person would otherwise find by pressing it.
   */
  /*
   * ONE PREDICATE FOR BOTH DESTINATIONS, and `worthOffering` is the right one despite living in
   * a profile module. Its rule is `confidence > CONFIDENCE_NONE && usableSamples > 0` — not a
   * profile-grade bar but "this reading has any signal at all", and a reading with no usable
   * samples is not a colour whatever it is for. A second predicate here would be a second
   * answer to one question, and the wardrobe would then disagree with the profile about what a
   * reading is worth.
   */
  /*
   * THE SHEET FOLLOWS THE READING (F-158).
   *
   * It opens when a reading arrives and closes when the person dismisses it; a NEW reading opens
   * it again, which is why the effect keys on the reading itself rather than on whether one
   * exists. Dismissing is not "I am done with the Lens" — it is "let me see the frame" — and the
   * next reading is a new answer to the question they went back to ask.
   */
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    if (reading !== null) setSheetOpen(true);
  }, [reading]);

  const usable = reading !== null && worthOffering(reading);
  const offerable = usable && onUseForProfile !== undefined;
  const offerableToWardrobe = usable && onUseForWardrobe !== undefined;

  return (
    <Screen title={t('lens.title')} script={script}>
      {/*
        The privacy sentence, first and unconditional. It is the same claim
        `NSCameraUsageDescription` makes at the moment permission is requested, and somebody who
        granted that permission a week ago should not have to remember it.
      */}
      <Text size="small" color="foreground.2" script={script}>
        {t('lens.privacy')}
      </Text>

      {permission === 'granted' ? (
        // `Surface level="1"` rather than `colors['surface.1']`. The token is RESOLVED through
        // `nativeElevation` rather than named by a literal, which is how every other surface in
        // the app reaches its background — and gate 8's own proof depends on that being true:
        // its decoy removes the elevation map and asserts `surface.1` goes unreached, which a
        // literal here would have silently defeated.
        <Surface
          level="1"
          accessible
          // `image`, and it is the honest role rather than the one that silences the checker.
          // `accessible` groups the region into one node, and gate 8 reads any grouped node as
          // something a person can land on — so it must say what it is. A live viewfinder is
          // visual content a screen reader cannot use, which is exactly what `image` announces;
          // calling it a `button` would be a lie, and leaving it silent tells a screen-reader
          // user nothing about the thing producing every number below it.
          accessibilityRole="image"
          accessibilityLabel={t('lens.viewfinder')}
        >
          <View style={{ minHeight: nativeTapTarget, overflow: 'hidden' }}>{viewfinder}</View>
        </Surface>
      ) : (
        <Surface level="1" padding="lg">
          <Stack gap="sm">
            <Text size="body" color="foreground" script={script}>
              {t(permission === 'denied' ? 'lens.deniedTitle' : 'lens.askTitle')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t(permission === 'denied' ? 'lens.deniedBody' : 'lens.askBody')}
            </Text>
            {permission === 'undetermined' && onRequestPermission !== undefined ? (
              <Button label={t('lens.ask')} onPress={onRequestPermission} />
            ) : null}
          </Stack>
        </Surface>
      )}

      {/*
        The instruction, when the capture assessment produced one, and OUTSIDE the reading card
        on purpose: a status token may not sit beside a colour sample without the `swatch.well`
        separator (F-069), and the honest way to satisfy that is not to sit beside one.

        `warn` rather than `bad`: a reading with an instruction is usable and improvable, which
        is a different thing from a reading that failed.
      */}
      {reading === null || reading.instruction === '' ? null : (
        <Status kind="warn" text={reading.instruction} />
      )}

      {reading === null || display === null ? (
        /*
         * NOT a placeholder swatch and not a zero. A neutral rectangle where the colour goes is
         * indistinguishable from having read a grey, and `#000000` is a reading somebody could
         * act on. The empty state says there is no reading, in words.
         */
        <Stack gap="xs">
          <Text size="small" color="foreground.2" script={script}>
            {t(permission === 'granted' ? 'lens.waiting' : 'lens.noReading')}
          </Text>
          {diagnostic === null || permission !== 'granted' ? null : (
            <Text size="xs" color="foreground.2" script="latin">
              {diagnostic}
            </Text>
          )}
        </Stack>
      ) : null}
      {/*
        THE READING LIVES IN A SHEET (F-158), and the split is where the copy points.

        WHAT MOVED: the reading card, the nearest names, and both offers. All three are about the
        COLOUR, and acting on them used to mean scrolling the camera off the screen — a person
        deciding whether to keep a reading was doing it without the frame it came from.

        WHAT STAYED: the privacy line, the viewfinder, the permission states, and the capture
        instruction. The instruction especially, and this is the whole reason there is a line to
        draw: it says what to change ABOUT THE FRAME, so putting it in a panel over the frame is
        telling somebody to adjust something they can no longer see.
      */}
      <Sheet
        open={sheetOpen && display !== null}
        onOpenChange={setSheetOpen}
        title={t('lens.sheetTitle')}
        closeLabel={t('lens.sheetClose')}
        script={script}
      >
        {/*
          GUARDED, AND NOT BECAUSE OF THE SHEET'S OWN STATE. `open` decides what is VISIBLE;
          children are constructed either way, so every one of these reads `reading` and
          `display` whether or not the panel is on screen. The old ternary carried this guard and
          the move dropped it — four Lens tests went red on `Cannot read properties of null`,
          before any of them had opened a sheet.
        */}
        {reading === null || display === null ? null : (
          <>
            <Surface level="1" padding="lg">
              <Stack gap="md">
                {/*
                  FR-17: THE CONDITIONS COME FIRST. Illumination, then the capture space, then how
                  sure the reading is — all three before a single colour value, because a number
                  shown first has already been read by the time its qualifier arrives.
                */}
                <Stack gap="xs">
                  <Text size="label" color="foreground.2" script={script}>
                    {t('lens.conditions')}
                  </Text>
                  <Text size="small" color="foreground" script={script}>
                    {`${t(ILLUMINATION_KEYS[reading.illumination])} · ${t(SPACE_KEYS[reading.space])}`}
                  </Text>
                  <Text size="small" color="foreground.2" script={script}>
                    {t('lens.confidence')}
                  </Text>
                  <Text size="small" color="foreground" numeric selectable>
                    {reading.confidence.toFixed(2)}
                  </Text>
                </Stack>

                <Row gap="md">
                  <Swatch
                    name={t('lens.reading')}
                    hex={display.hex}
                    color={display.color}
                    size={56}
                  />
                  <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
                    <Text size="body" color="foreground" numeric selectable>
                      {display.hex}
                    </Text>
                    {/*
                      OKLCh with its units, like every other number in this app (FR-48). Three
                      decimals on L and C and one on h is what the corpus prints, so a reading and a
                      published entry can be compared by eye without one looking more precise than
                      the other.
                    */}
                    <Text size="small" color="foreground.2" numeric selectable>
                      {`L ${display.oklch[0].toFixed(3)}  C ${display.oklch[1].toFixed(3)}  h ${display.oklch[2].toFixed(1)}°`}
                    </Text>
                    <Text size="xs" color="foreground.2" script={script}>
                      {`${t('lens.samples')} ${String(reading.usableSamples)}`}
                    </Text>
                  </View>
                </Row>
              </Stack>
            </Surface>

            {nearest.length === 0 ? null : (
              <Stack gap="sm">
                <Text size="label" color="foreground.2" script={script}>
                  {t('lens.nearest')}
                </Text>
                {nearest.map(({ entry, deltaE00 }) => (
                  <View
                    key={entry.entry.slug}
                    style={{ flexDirection: 'row', gap: nativeSpacing.md, alignItems: 'center' }}
                  >
                    <Swatch
                      name={entry.entry.name.en}
                      hex={entry.derived.hex}
                      color={colorFor(entry.entry)}
                      size={32}
                      // Spread, not `onPress={... : undefined}`: under `exactOptionalPropertyTypes`
                      // an absent handler and a present-and-undefined one are different things, and
                      // `Swatch` renders a Pressable for the first case only.
                      {...(onOpenColour === undefined
                        ? {}
                        : {
                            onPress: () => {
                              onOpenColour(entry.entry.slug);
                            },
                          })}
                    />
                    <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
                      <Text size="small" color="foreground" script={script}>
                        {`${entry.entry.name.kanji} ${entry.entry.name.en}`}
                      </Text>
                      <Text size="xs" color="foreground.2" numeric selectable>
                        {`${deltaE00.toFixed(2)} ${t('unit.deltaE00')}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </Stack>
            )}

            {/*
            FR-27's hand-off. An OFFER, and the note says what it will and will not do: it proposes
            a starting point, every dimension stays editable, and nothing is saved until the person
            says so on the next screen. That is not reassurance — it is the difference between this
            button and the one every competitor ships.
          */}
            {offerable ? (
              <Stack gap="sm">
                <Button
                  label={t('lens.useForProfile')}
                  onPress={() => {
                    onUseForProfile(reading);
                  }}
                />
                <Text size="xs" color="foreground.2" script={script}>
                  {t('lens.useForProfileNote')}
                </Text>
              </Stack>
            ) : null}

            {/*
            SECOND, AND THE ORDER IS DELIBERATE. The profile offer has been here since F-097 and a
            screen that reorders its controls is one people mis-tap. This is appended rather than
            inserted, and the note under it says what will be stored — an estimate with the
            conditions it was taken in (ADR-0005), never a claim that the colour IS a corpus entry.
          */}
            {offerableToWardrobe ? (
              <Stack gap="sm">
                <Button
                  label={t('lens.useForWardrobe')}
                  variant="secondary"
                  onPress={() => {
                    onUseForWardrobe(reading);
                  }}
                />
                <Text size="xs" color="foreground.2" script={script}>
                  {t('lens.useForWardrobeNote')}
                </Text>
              </Stack>
            ) : null}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
