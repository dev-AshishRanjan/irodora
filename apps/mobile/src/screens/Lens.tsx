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
 * So the viewfinder arrives as a **node**. `app/(tabs)/lens.tsx` passes the real one;
 * `test/screens.test.tsx` passes `null` and checks every pixel this file is responsible for.
 * The precedent is `app/profile.tsx`, which imports `deviceRepository` in the route for exactly
 * this reason: *"a screen that imported it could not be rendered by jest at all"*.
 *
 * The split is worth more than the checker. Everything here is layout, copy and formatting —
 * the parts that go wrong quietly — and none of it needs a phone to be wrong in front of you.
 *
 * ## This file holds no state either, and that is F-160
 *
 * It used to own the result panel's open flag. That flag was the reported defect: a `Sheet`
 * renders the same tree open or shut, so nothing in this suite could see it, and the panel
 * reopened on every frame.
 *
 * The whole machine now lives in [`lens/capture.ts`](../lens/capture.ts), where a sequence can
 * be asserted, and every state a person can reach arrives here as a prop. The payoff is not
 * only that the machine is tested — it is that the conformance registry can draw **still**,
 * **live**, **awaiting** and **held**, which it could not do while the state was inside.
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

import { useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
} from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import {
  Button,
  Chip,
  Row,
  Screen,
  Sheet,
  Stack,
  Surface,
  Swatch,
  Text,
  useTheme,
} from '@irodora/ui';
import { displayFromOklch } from '../engine';
import { nearestByOklch, type NearestEntry } from '../finder';
import { colorFor } from '../corpus';
import { readingOklch, worthOffering } from '../profile/photo';
import { LENS_MODES, type CaptureFailure, type LensMode, type PhotoState } from '../lens/capture';
import { pointFrom, reticleBox, type PhotoPoint } from '../lens/photo';
import type { CaptureSpace, LensReading } from '../lens/reading';
import type { LensPermission } from '../lens/permission';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** How many corpus names a capture is given. Three is a comparison; eight is a list to read. */
export const LENS_NAME_LIMIT = 3;

/**
 * How many a live readout is given — the same three, and **the engine refused anything less**.
 *
 * This was briefly `1`, on the reasoning that a list reordering itself fifteen times a second is
 * unreadable and FR-13 asks for *the* name. `nameColor` threw:
 *
 * > *limit must be an integer of at least 3; got 1. A single answer is an identification, and
 * > this product does not assert that a colour IS a corpus entry (FR-7, ADR-0031) — it offers
 * > the closest digital references and lets the reader judge.*
 *
 * The readability argument was real and the conclusion was still a claim: one name under a live
 * swatch says *this is Ai*, which is the sentence this product exists not to say. The floor is
 * deliberately not clamped, so a caller asking for one answer finds out rather than being
 * quietly given three.
 *
 * The layout answers the readability problem instead — see the strip below, where the three are
 * one line rather than three.
 */
export const LENS_LIVE_NAME_LIMIT = LENS_NAME_LIMIT;

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

/**
 * Capture quality → its label. **FR-18's classification, on screen for the first time.**
 *
 * The engine has produced this word since R2 — `'excellent' | 'good' | 'fair' | 'poor'` — and
 * no screen rendered it. What the Lens showed instead was `confidence.toFixed(2)`, a bare
 * decimal whose own type comment reads *"Never a probability"* and which looks like nothing
 * else.
 *
 * FR-18 is explicit that the classification is what *"blocks a confident claim and returns a
 * specific, actionable instruction"*. A word a person can act on was being discarded in favour
 * of a number they cannot interpret.
 *
 * The label describes the CAPTURE, never the colour. "Good" means the frame was well exposed
 * and evenly lit; it says nothing about how close the reading is to the garment, and NFR-21
 * would not allow it to.
 */
const QUALITY_KEYS: Readonly<Record<LensReading['quality'], MessageKey>> = {
  excellent: 'lens.quality.excellent',
  good: 'lens.quality.good',
  fair: 'lens.quality.fair',
  poor: 'lens.quality.poor',
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

/**
 * How long each arm of the photograph's corner marks is.
 *
 * The viewfinder's `BRACKET`, restated rather than imported, because that one lives in a file
 * this one must not import — it reaches the camera. The two are the same length for the same
 * reason and would look wrong if they were not, which is a real cost of the split and is
 * cheaper than making this screen unrenderable.
 */
const BRACKET = 12;

/**
 * A number as a percentage a style will accept.
 *
 * `restrict-template-expressions` refuses a bare number in a template and `String()` produces a
 * plain `string`, which is not the template-literal type `ViewStyle.left` wants. The assertion is
 * the seam between those two rules and is safe by construction — a number, then a literal `%`.
 * `viewfinder.tsx` carries the same three lines for the same pair of rules.
 */
const percent = (value: number): DimensionValue => `${String(value)}%` as DimensionValue;

/** The four corners of the reticle, each with the two borders that make its L. */
const PHOTO_CORNERS = [
  { key: 'top-left', at: { left: 0, top: 0 }, edge: { borderTopWidth: 1, borderLeftWidth: 1 } },
  { key: 'top-right', at: { right: 0, top: 0 }, edge: { borderTopWidth: 1, borderRightWidth: 1 } },
  {
    key: 'bottom-left',
    at: { left: 0, bottom: 0 },
    edge: { borderBottomWidth: 1, borderLeftWidth: 1 },
  },
  {
    key: 'bottom-right',
    at: { right: 0, bottom: 0 },
    edge: { borderBottomWidth: 1, borderRightWidth: 1 },
  },
] as const;

/** What the last attempt failed at → the sentence that says so. */
const FAILURE_KEYS: Readonly<Record<CaptureFailure, MessageKey>> = {
  capture: 'lens.captureFailed',
  photo: 'lens.photoFailed',
};

/** Mode → the chip that chooses it, and the sentence that says what it does. */
const MODE_KEYS: Readonly<
  Record<LensMode, { readonly label: MessageKey; readonly hint: MessageKey }>
> = {
  still: { label: 'lens.mode.still', hint: 'lens.mode.stillHint' },
  live: { label: 'lens.mode.live', hint: 'lens.mode.liveHint' },
};

export interface LensProps {
  /**
   * The live viewfinder, or `null`.
   *
   * A node rather than a component: this file must not import anything that reaches a native
   * module, or it stops being renderable and the conformance registry loses a screen.
   */
  readonly viewfinder?: React.ReactNode;
  /**
   * The capture on screen, or `null`.
   *
   * **The result panel is open exactly when this is not null.** No second flag — see
   * `lens/capture.ts` for why the flag that used to be here was the defect.
   */
  readonly capture?: LensReading | null;
  /**
   * The running readout, in live mode. FR-13's continuous pick.
   *
   * Separate from {@link LensProps.capture} because a number that moves is a different fact
   * from a reading somebody took, and one field for both is what made the first look like the
   * second.
   */
  readonly live?: LensReading | null;
  /** How the Lens is taking readings. */
  readonly mode?: LensMode;
  /**
   * The photograph being read, or `null` for the camera.
   *
   * When one is here it replaces the viewfinder entirely — the camera is not sampling, so a
   * live preview under a picture would be a moving image nothing was reading.
   */
  readonly photo?: PhotoState | null;
  /** A photograph is being fetched and decoded. */
  readonly opening?: boolean;
  /** The shutter has been pressed and no frame has come back yet. */
  readonly awaiting?: boolean;
  /** What the last attempt failed at, or `null`. */
  readonly failed?: CaptureFailure | null;
  /**
   * Why there is no reading, when the frame output can say.
   *
   * It is not copy in the product's voice and it is not meant to be: *"waiting"* was the whole
   * of what this screen could say about four different failures — no frames at all, a GPU-only
   * buffer, a planar format, a zero-sized region — and a person looking at a live preview that
   * produces nothing cannot tell those apart, nor report which one they have.
   */
  readonly diagnostic?: string | null;
  readonly permission?: LensPermission;
  /** Ask for camera access. Absent in the conformance suite. */
  readonly onRequestPermission?: () => void;
  /** Take a reading now. The one obvious action on this screen. */
  readonly onCapture?: () => void;
  /** Choose how readings are taken. Choosing `still` while live is running is the stop. */
  readonly onModeChange?: (mode: LensMode) => void;
  /** Open a photograph from the library (FR-40). */
  readonly onOpenPhoto?: () => void;
  /** Put the photograph away and go back to the camera. */
  readonly onUseCamera?: () => void;
  /** The person tapped the photograph. Fractions of its width and height. */
  readonly onPoint?: (at: PhotoPoint) => void;
  /** Close the result and go back to the frame. */
  readonly onDismiss?: () => void;
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
  capture = null,
  live = null,
  mode = 'still',
  photo = null,
  opening = false,
  awaiting = false,
  failed = null,
  diagnostic = null,
  permission = 'undetermined',
  onRequestPermission,
  onCapture,
  onModeChange,
  onOpenPhoto,
  onUseCamera,
  onPoint,
  onDismiss,
  onUseForProfile,
  onUseForWardrobe,
  onOpenColour,
}: LensProps = {}): React.JSX.Element {
  const { t, script } = useMessages();
  const { colors } = useTheme();

  /*
   * THE MEASURED SIZE OF THE PHOTOGRAPH ON SCREEN, in a ref rather than in state.
   *
   * A press reports `locationX` and `locationY` relative to the pressable and says nothing about
   * how big it is, so the fractions need the laid-out size — and nothing RENDERS from that size,
   * so putting it in state would re-render the screen for a value only a handler reads.
   *
   * It stays a ref for the same reason this file has no other state: the F-158 defect was a
   * screen holding a fact about the reading, and this is a fact about the box.
   */
  const photoBox = useRef({ width: 0, height: 0 });

  /*
   * Everything derived from the capture, in one place, so a `null` capture has one branch
   * rather than six.
   */
  const oklch = capture === null ? null : readingOklch(capture);
  const display = oklch === null ? null : displayFromOklch(oklch);
  const nearest: readonly NearestEntry[] =
    oklch === null ? [] : nearestByOklch(oklch, LENS_NAME_LIMIT);

  /*
   * The live readout, and it is computed only while it is on screen — `live` is `null` in still
   * mode, so this whole block costs nothing there. In live mode it runs at frame rate, which is
   * what FR-13 asks for: *"shows name, hex and OKLCH live"*.
   */
  const liveOklch = live === null || capture !== null ? null : readingOklch(live);
  const liveDisplay = liveOklch === null ? null : displayFromOklch(liveOklch);
  const liveNearest: readonly NearestEntry[] =
    liveOklch === null ? [] : nearestByOklch(liveOklch, LENS_LIVE_NAME_LIMIT);

  /*
   * ONE PREDICATE FOR BOTH DESTINATIONS, and `worthOffering` is the right one despite living in
   * a profile module. Its rule is `confidence > CONFIDENCE_NONE && usableSamples > 0` — not a
   * profile-grade bar but "this reading has any signal at all", and a reading with no usable
   * samples is not a colour whatever it is for. A second predicate here would be a second
   * answer to one question, and the wardrobe would then disagree with the profile about what a
   * reading is worth.
   */
  const usable = capture !== null && worthOffering(capture);
  const offerable = usable && onUseForProfile !== undefined;
  const offerableToWardrobe = usable && onUseForWardrobe !== undefined;

  const granted = permission === 'granted';

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

      {photo !== null ? (
        /*
          THE PHOTOGRAPH, WHERE THE CAMERA WOULD BE.

          Its container takes the picture's own aspect ratio, which is what makes the tap
          arithmetic honest: with the box the same shape as the image, the image exactly fills it
          under any resize mode, so a fraction of the box is the same fraction of the picture.
          A letterboxed `contain` would put bars in the measurement and a `cover` would crop it,
          and either would mean the reticle sat somewhere the reading did not come from.
        */
        <Surface level="1">
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={t('lens.photoTarget')}
            style={{ aspectRatio: photo.width / photo.height, width: '100%' }}
            onLayout={(event: LayoutChangeEvent) => {
              photoBox.current = event.nativeEvent.layout;
            }}
            onPress={(event) => {
              onPoint?.(
                pointFrom(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                  photoBox.current,
                ),
              );
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessible={false}
            />
            {/*
              THE RETICLE, over the region that will actually be read — `reticleBox` is the same
              clamp `sampleAt` applies, in fractions, so the marks cannot point somewhere the
              engine is not looking. Two tones for the reason the viewfinder's are (F-068): the
              other side of this line is an arbitrary photograph, and a single grey disappears
              over a pale one.
            */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {(() => {
                const box = reticleBox(photo, photo.at);
                return (
                  <View
                    style={{
                      position: 'absolute',
                      left: percent(box.left),
                      top: percent(box.top),
                      width: percent(box.width),
                      height: percent(box.height),
                    }}
                  >
                    {PHOTO_CORNERS.map((corner) => (
                      <View
                        key={corner.key}
                        style={{
                          position: 'absolute',
                          ...corner.at,
                          width: BRACKET,
                          height: BRACKET,
                          ...corner.edge,
                          borderColor: colors['swatch.hairline.inverse'],
                        }}
                      >
                        <View
                          style={{
                            width: BRACKET,
                            height: BRACKET,
                            ...corner.edge,
                            borderColor: colors['swatch.hairline'],
                          }}
                        />
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          </Pressable>
        </Surface>
      ) : granted ? (
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
          // something a person can land on — so it must say what it is. A viewfinder is visual
          // content a screen reader cannot use, which is exactly what `image` announces;
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
        THE ONE OBVIOUS ACTION, and its position never moves.

        It sits directly under the frame and above everything that can grow, because the two
        things below it — the status line and the live readout — appear and disappear. A control
        that slides under somebody's thumb between one glance and the next is a control they
        mis-tap, and this is the one they will press most.

        `loading` rather than a separate spinner: the button already announces `busy` through
        `accessibilityState`, so the wait is stated to a screen reader as well as drawn.
      */}
      {granted || photo !== null ? (
        <Stack gap="md">
          <Button
            label={t(awaiting ? 'lens.capturing' : 'lens.capture')}
            loading={awaiting}
            disabled={opening}
            {...(onCapture === undefined ? {} : { onPress: onCapture })}
          />

          {/*
            FR-40'S FOURTH PATH, and it is a control rather than a mode.

            Beside the shutter rather than among the chips: the chips choose how the CAMERA
            reads, and a photograph is not the camera — it is a different thing to read. While
            one is open this button becomes the way back, which is one control for one axis
            instead of two that can disagree about which source is live.
          */}
          <Button
            label={t(
              photo !== null ? 'lens.useCamera' : opening ? 'lens.opening' : 'lens.openPhoto',
            )}
            variant="secondary"
            loading={opening}
            {...(photo !== null
              ? onUseCamera === undefined
                ? {}
                : { onPress: onUseCamera }
              : onOpenPhoto === undefined
                ? {}
                : { onPress: onOpenPhoto })}
          />

          {/*
            THE MODE, AND THE STOP, AS ONE CONTROL.

            Two chips rather than a button that toggles: a toggle says what it will do next and
            a chip says what is true now, and *"which mode is active"* is the thing that was
            reported as unknowable. `selected` carries it in three channels — the fill, the ✓ in
            the accessible name, and `accessibilityState.selected` (F-163).

            Choosing `still` while live is running IS the stop. A third control labelled "stop"
            would be a second way to say one thing, and the two would eventually disagree about
            what state the Lens was in.
          */}
          <Row gap="sm" wrap>
            {photo !== null
              ? null
              : LENS_MODES.map((option) => (
                  <Chip
                    key={option}
                    label={t(MODE_KEYS[option].label)}
                    selected={mode === option}
                    {...(onModeChange === undefined
                      ? {}
                      : {
                          onPress: () => {
                            onModeChange(option);
                          },
                        })}
                  />
                ))}
          </Row>

          {/*
            WHAT THE CHOSEN MODE DOES, in a sentence. The chips say which one is on; this says
            what that means — including, in live mode, where the stop is.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t(photo === null ? MODE_KEYS[mode].hint : 'lens.photoHint')}
          </Text>
        </Stack>
      ) : null}

      {/*
        WHY THERE IS NOTHING TO SHOW, when there is nothing to show.

        Four distinct states, and each says something different. Silence in still mode at rest is
        deliberate: nothing has gone wrong and nothing is pending — the button above already
        says what to do, and a line explaining that a camera nobody has asked anything of has
        produced no colour would be noise on the resting state of the screen.
      */}
      {capture === null ? (
        <Stack gap="xs">
          {failed !== null ? (
            <Text size="small" color="foreground" script={script}>
              {t(FAILURE_KEYS[failed])}
            </Text>
          ) : !granted && photo === null ? (
            <Text size="small" color="foreground.2" script={script}>
              {t('lens.noReading')}
            </Text>
          ) : photo !== null ? null : mode === 'live' && live === null ? (
            <Text size="small" color="foreground.2" script={script}>
              {t('lens.waiting')}
            </Text>
          ) : null}
          {diagnostic === null || (!granted && photo === null) ? null : (
            <Text size="xs" color="foreground.2" script="latin">
              {diagnostic}
            </Text>
          )}
        </Stack>
      ) : null}

      {/*
        FR-13'S LIVE PICK, and it is a strip rather than a panel.

        The requirement is *"shows name, hex and OKLCH live"*, and until now that was drawn in a
        sheet — which is how a number updating fifteen times a second came to look like a result
        somebody had taken. A strip under the frame is the honest shape for a value that is
        still moving: it is small, it is beside the thing producing it, and there is nothing on
        it to act on. Acting on a colour is what the shutter is for.
      */}
      {liveDisplay === null || live === null ? null : (
        <Surface level="1" padding="md">
          <Stack gap="sm">
            <Text size="label" color="foreground.2" script={script}>
              {t('lens.liveReadout')}
            </Text>
            <Row gap="md">
              <Swatch
                name={t('lens.reading')}
                hex={liveDisplay.hex}
                color={liveDisplay.color}
                size={40}
              />
              <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
                <Text size="small" color="foreground" numeric selectable>
                  {liveDisplay.hex}
                </Text>
                <Text size="xs" color="foreground.2" numeric selectable>
                  {`L ${liveDisplay.oklch[0].toFixed(3)}  C ${liveDisplay.oklch[1].toFixed(3)}  h ${liveDisplay.oklch[2].toFixed(1)}°`}
                </Text>
                {/*
                  THREE NAMES, ONE LINE. The count is the corpus rule's (see
                  {@link LENS_LIVE_NAME_LIMIT}); the single line is this strip's answer to what
                  that rule costs a readout updating at frame rate. Three stacked lines
                  reordering themselves is unreadable; one line of three is a set, which is what
                  "the closest references, judge for yourself" looks like at a glance.

                  No ΔE00 figures here. They belong to a capture — a number nobody can read
                  before it changes is not a number they can act on.
                */}
                {liveNearest.length === 0 ? null : (
                  <Text size="xs" color="foreground.2" script={script}>
                    {liveNearest
                      .map(({ entry }) => `${entry.entry.name.kanji} ${entry.entry.name.en}`)
                      .join(' · ')}
                  </Text>
                )}
              </View>
            </Row>
          </Stack>
        </Surface>
      )}

      {/*
        THE CAPTURE LIVES IN A SHEET (F-158), and the split is where the copy points.

        WHAT IS IN IT: the readout, the nearest names, and both offers. All three are about the
        COLOUR, and acting on them used to mean scrolling the camera off the screen — a person
        deciding whether to keep a reading was doing it without the frame it came from.

        WHAT STAYED OUTSIDE: the privacy line, the viewfinder, the permission states, the
        shutter and the mode. The instruction moved IN with the reading it belongs to; the
        controls stay out, because they are about the next capture rather than this one.
      */}
      <Sheet
        open={capture !== null}
        onOpenChange={(open) => {
          if (!open) onDismiss?.();
        }}
        title={t('lens.sheetTitle')}
        closeLabel={t('lens.sheetClose')}
        script={script}
      >
        {/*
          GUARDED, AND NOT BECAUSE OF THE SHEET'S OWN STATE. `open` decides what is VISIBLE;
          children are constructed either way, so every one of these reads `capture` and
          `display` whether or not the panel is on screen. The old ternary carried this guard and
          the move dropped it — four Lens tests went red on `Cannot read properties of null`,
          before any of them had opened a sheet.
        */}
        {capture === null || display === null ? null : (
          <>
            <Surface level="1" padding="lg">
              <Stack gap="md">
                {/*
                  ONE READOUT, WHERE THERE WERE THREE ELEMENTS.

                  It was a "Conditions" pair, a "Confidence" pair, and — on the screen behind
                  this sheet — an amber `Status` carrying the instruction. Three things, one of
                  them styled as a fault, for what is a single description of one capture.

                  THE ORDER IS FR-17'S and it has not moved: the conditions come before the
                  value, because a number shown first has already been read by the time its
                  qualifier arrives. What changed is that the conditions now include the one the
                  engine actually classifies.

                  NO STATUS, NO AMBER. A poor reading says "Poor", which is a word rather than a
                  colour — so NFR-9's rule about colour never being the only channel is met by
                  there being no colour channel to depend on at all. An instruction is guidance
                  about the NEXT capture, not a report of something broken.

                  NO HEADING OF ITS OWN. This carried `lens.readout` — "This reading" — which is
                  word for word the sheet's title, so the panel said it twice with nothing
                  between. The sheet names the thing; its content does not need to name it again.
                */}
                <Stack gap="xs">
                  <Row gap="sm">
                    <Text size="small" color="foreground.2" script={script}>
                      {t('lens.quality')}
                    </Text>
                    <Text size="small" color="foreground" script={script}>
                      {t(QUALITY_KEYS[capture.quality])}
                    </Text>
                  </Row>

                  <Row gap="sm">
                    <Text size="small" color="foreground.2" script={script}>
                      {t('lens.light')}
                    </Text>
                    <Text size="small" color="foreground" script={script}>
                      {t(ILLUMINATION_KEYS[capture.illumination])}
                    </Text>
                  </Row>

                  <Row gap="sm">
                    <Text size="small" color="foreground.2" script={script}>
                      {t('lens.space')}
                    </Text>
                    <Text size="small" color="foreground" script={script}>
                      {t(SPACE_KEYS[capture.space])}
                    </Text>
                  </Row>

                  {/*
                    THE NUMBER STAYS, AND STOPS BEING THE HEADLINE. FR-15 produces it and it is
                    the honest ceiling, so removing it would be hiding the one figure that says
                    how far the engine is willing to go. It is subordinate to the word above,
                    and its label states the scale — a bare 0.87 reads as a percentage to
                    everyone who has ever seen one.
                  */}
                  <Row gap="sm">
                    <Text size="xs" color="foreground.2" script={script}>
                      {t('lens.confidence')}
                    </Text>
                    <Text size="xs" color="foreground.2" numeric selectable>
                      {capture.confidence.toFixed(2)}
                    </Text>
                  </Row>

                  {/*
                    WHAT TO DO NEXT (FR-18). Inside the readout rather than shouted from the
                    screen behind it: it belongs to this capture, and it is the sentence the
                    assessment produced for it.
                  */}
                  {capture.instruction === '' ? null : (
                    <Stack gap="xs">
                      <Text size="xs" color="foreground.2" script={script}>
                        {t('lens.next')}
                      </Text>
                      <Text size="small" color="foreground" script={script}>
                        {capture.instruction}
                      </Text>
                    </Stack>
                  )}
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
                      {`${t('lens.samples')} ${String(capture.usableSamples)}`}
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
                    onUseForProfile(capture);
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
                    onUseForWardrobe(capture);
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
