/**
 * The one file in the app that touches the camera (F-097).
 *
 * ## Why it is here and not in `src/screens/`
 *
 * `react-native-vision-camera` is a native module. Importing it makes a module unrenderable by
 * jest, and `scripts/a11y-scope.mjs` requires every component in `src/screens/` to be reachable
 * from the conformance registry. A `Lens` screen that imported this would be a screen the
 * accessibility gate could not check — so the screen takes a **node** and this file supplies it.
 *
 * `app/profile.tsx` set the precedent with `deviceRepository`: the device-bound thing is
 * imported by the route, not by the screen, *"so a screen that imported it could not be
 * rendered by jest at all"*.
 *
 * ## What crosses the bridge
 *
 * Nothing but numbers, and a type enforces it rather than care.
 * [`camera.ts`](./camera.ts) defines `FrameSample` — a bounded array of `Sample`, a capture
 * space, and the region's dimensions. There is no field a frame, a buffer, a path or a URI
 * could be assigned to, so the frame cannot leave the worklet thread even by accident.
 *
 * The reduction from samples to a `LensReading` is `read()` in [`modes.ts`](./modes.ts), which
 * calls `@irodora/color-sampling`. **No colour arithmetic happens in this file** — see
 * [ADR-0075](../../../../docs/adr/0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md)
 * for the one place that rule forced a decision, and `scripts/verify-engine-purity.mjs` for the
 * lint that keeps it.
 *
 * ## The capture space comes from the session, not from the frame
 *
 * A `Frame` in VisionCamera 5 reports a **pixel format** (`rgb-rgba-8-bit`, `yuv-420-8-bit-full`)
 * and no colour space. A pixel format is a memory layout; treating one as a colour space is the
 * assumption `apps/mobile/AGENTS.md` forbids by name.
 *
 * The colour space is negotiated per session and arrives on `onSessionConfigSelected` as
 * `selectedVideoDynamicRange.colorSpace`. Until that callback has fired the space is
 * **`unknown`**, which caps the reading's confidence at `SPACE_CONFIDENCE_CEILING.unknown`
 * rather than defaulting to sRGB. A low first reading is the correct answer to *"nobody has told
 * us yet"*.
 *
 * ## Written against a device nobody here has
 *
 * Said plainly, because the alternative is that somebody reads this file and assumes it has run.
 * F-040 recorded the open question — whether `@irodora/color-sampling` is reachable from a
 * worklet at all — and it needs a phone to answer. Whether the code inside this seam runs is
 * F-097's attested criterion, not a claim this file gets to make.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  type CameraSessionConfig,
  type Frame,
} from 'react-native-vision-camera';
import { createSynchronizable, scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@irodora/ui';
import { readCaptureSpace, sampleStride, type FrameSample } from './camera';
import { read } from './modes';
import type { CaptureSpace, LensReading } from './reading';
// From `./permission`, which imports nothing native — so the mapping stays testable while
// this file cannot be loaded outside a device build at all.
import { permissionState, type LensPermission } from './permission';

/**
 * The fraction of the frame's shorter side the crosshair region spans.
 *
 * A region rather than a pixel is FR-15's whole point: one pixel is a sensor artefact with a
 * colour attached. A tenth of the frame is small enough to point precisely and large enough to
 * clear FR-15's floor of 1000 usable samples on any camera this would run on.
 */
export const REGION_FRACTION = 0.1;

/**
 * Where the reticle's corner marks sit, derived from {@link REGION_FRACTION}.
 *
 * DERIVED, NEVER TYPED TWICE. The old overlay hard-coded `left: '45%'` and `width: '10%'`
 * beside a `REGION_FRACTION` of `0.1` — two statements of one fact, and the marks would have
 * gone on pointing at the old area the moment the sampled region changed. A reticle that lies
 * about where the colour is read is worse than none: it is an instruction to aim somewhere the
 * engine is not looking.
 */
const REGION_PERCENT = REGION_FRACTION * 100;

/**
 * How far the region sits from each edge.
 *
 * ONE VALUE, NOT TWO: the region is a centred square, so the inset from left equals the inset
 * from right. It was briefly written as two constants holding the same expression, which is a
 * place for them to drift apart.
 *
 * Typed as `DimensionValue` so the percentage is a percentage to TypeScript as well: a bare
 * template produces `string`, and `ViewStyle.left` takes the template-literal type
 * \`\${number}%\` rather than any string.
 */
//
// `String()` around the number, then asserted: `restrict-template-expressions` refuses a
// bare number in a template, and `String()` produces a plain `string` which is not the
// template-literal type `ViewStyle.left` wants. The assertion is the seam between those two
// rules, and it is safe by construction — the expression is a number and the suffix is a
// literal `%`.
const REGION_EDGE = `${String((100 - REGION_PERCENT) / 2)}%` as DimensionValue;

/** How long each arm of a corner mark is. Short enough to mark a corner, not to draw a box. */
const BRACKET = 12;

/** The four corners, each with the two borders that make its L. */
const CORNERS = [
  {
    key: 'top-left',
    at: { left: REGION_EDGE, top: REGION_EDGE },
    outer: { borderTopWidth: 1, borderLeftWidth: 1 },
  },
  {
    key: 'top-right',
    at: { right: REGION_EDGE, top: REGION_EDGE },
    outer: { borderTopWidth: 1, borderRightWidth: 1 },
  },
  {
    key: 'bottom-left',
    at: { left: REGION_EDGE, bottom: REGION_EDGE },
    outer: { borderBottomWidth: 1, borderLeftWidth: 1 },
  },
  {
    key: 'bottom-right',
    at: { right: REGION_EDGE, bottom: REGION_EDGE },
    outer: { borderBottomWidth: 1, borderRightWidth: 1 },
  },
] as const;

/** FR-13's mode, and the ceiling that goes with it (`MODE_CEILING.live` is 0.7). */
const MODE = 'live' as const;

export interface ViewfinderProps {
  /** Called with each reading the frame output produces. */
  readonly onReading: (reading: LensReading) => void;
  /**
   * Called when the frame output produces no reading, with the reason.
   *
   * Exists because "a live preview and no reading" was the whole of what the Lens could say
   * about four different failures. The reason reaches the screen rather than a log, because a
   * log on a phone is not something the person holding it can read.
   */
  readonly onDiagnostic?: (why: string) => void;
}

/**
 * The camera permission, in the shape `Lens` wants, plus the request.
 *
 * A hook rather than a value passed from the route: permission can change while the screen is
 * open — someone grants it in Settings and comes back — and VisionCamera's own hook re-reads it
 * on `AppState` change. A value captured at mount would leave the screen explaining that access
 * was refused, over a working camera.
 */
export function useLensPermission(): { permission: LensPermission; request: () => void } {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const request = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);
  return { permission: permissionState(hasPermission, canRequestPermission), request };
}

/**
 * The live viewfinder.
 *
 * Returns `null` when the device has no back camera. Not an error and not a spinner: a device
 * with no camera is one this feature does not work on, and the screen's own empty state already
 * says there is no reading.
 */
export function Viewfinder({ onReading, onDiagnostic }: ViewfinderProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const device = useCameraDevice('back');
  const seenFrame = useRef(false);

  /**
   * How many times the worklet has been entered, counted **on the frame thread**.
   *
   * A `Synchronizable` rather than a ref: a ref lives on the JS runtime and a worklet cannot
   * write to it, and a `scheduleOnRN` ping per frame would be bridge traffic at frame rate to
   * report a number nobody reads until something is wrong.
   *
   * It exists because the first version of this diagnostic could not tell two very different
   * failures apart. `seenFrame` is set inside the JS callbacks, so a worklet that runs and then
   * throws — a serialization problem, a missing runtime — looked exactly like a frame processor
   * that was never invoked at all. This counts the entry, before anything can fail.
   */
  const entered = useMemo(() => createSynchronizable(0), []);

  /**
   * The last sample, the last refusal, and the last thrown message — all written on the frame
   * thread, all read by a poll on the JS thread.
   *
   * **This is a second delivery path, not a nicety.** `scheduleOnRN` is the push, and the device
   * has now shown it delivering nothing while the worklet ran fifty-one times. A `Synchronizable`
   * is written *before* the push is attempted, so whatever the push depends on and lacks, the
   * sample still gets out.
   *
   * The poll does nothing at all while the push is working — see `pushed` below.
   */
  const latest = useMemo(() => createSynchronizable<FrameSample | null>(null), []);
  const refusal = useMemo(() => createSynchronizable<string | null>(null), []);
  const thrown = useMemo(() => createSynchronizable<string | null>(null), []);

  /**
   * Whether `scheduleOnRN` has ever delivered.
   *
   * Separate from `seenFrame` on purpose: the poll must not mark the push as working, or one
   * polled reading would switch the poll off and the Lens would freeze on a single frame.
   */
  const pushed = useRef(false);

  /*
   * The negotiated capture space. `unknown` until the session says otherwise — see the header:
   * this is the one value that must never be guessed, and the confidence ceiling already prices
   * in not knowing it.
   */
  const [space, setSpace] = useState<CaptureSpace>('unknown');

  /** Reduce a frame sample to a reading, on the JS thread, through the engine. */
  const deliver = useCallback(
    (sample: FrameSample) => {
      seenFrame.current = true;
      pushed.current = true;
      onReading(
        read(MODE, {
          region: { samples: sample.samples, width: sample.width, height: sample.height },
          space: sample.space,
        }),
      );
    },
    [onReading],
  );

  /**
   * A refused frame, on the JS thread.
   *
   * Sent for every refused frame rather than throttled in the worklet: a worklet cannot hold
   * state between calls to count them, and React drops a `setState` to an identical string
   * without re-rendering — so a steady stream of the same reason costs one bridge hop per frame
   * and no renders. The frames it describes are ones we are doing no work on anyway.
   */
  const report = useCallback(
    (why: string) => {
      seenFrame.current = true;
      pushed.current = true;
      onDiagnostic?.(why);
    },
    [onDiagnostic],
  );

  /*
   * THE ONE FAILURE NO FRAME CAN REPORT: no frames at all. If the output never starts, `onFrame`
   * never runs, so neither `deliver` nor `report` is ever reached and the screen would wait
   * forever with nothing to say. Two seconds is long enough that a working camera has delivered
   * many frames and short enough that somebody is still holding the phone up.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (seenFrame.current) return;
      const frames = entered.getBlocking();
      onDiagnostic?.(
        frames === 0
          ? 'the frame processor was never called — the camera delivered no frames to it'
          : `the frame processor ran ${String(frames)} time(s) but nothing reached the app`,
      );
    }, 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [onDiagnostic, entered]);

  /*
   * THE SECOND DELIVERY PATH.
   *
   * The device showed the worklet running fifty-one times while nothing reached the app, which
   * leaves two possibilities — `sampleFrame` throws, or `scheduleOnRN` cannot reach the RN
   * runtime from the one VisionCamera built for this thread. This poll answers both: the sample
   * and any thrown message are written to a Synchronizable BEFORE the push is attempted, so they
   * survive whichever of the two it is.
   *
   * **It costs nothing when the push works.** `pushed` is set only by the `scheduleOnRN`
   * callbacks, so the first successful push turns this into an early return four times a second.
   * It is deliberately NOT `seenFrame`: a polled reading setting that flag would switch the poll
   * off after one frame and freeze the Lens on it.
   *
   * Four times a second rather than per frame. A live pick that updates at 4 Hz is usable; the
   * NFR-4 budget for live pick is 50 ms perceived and this is a fallback, not the design.
   */
  useEffect(() => {
    const id = setInterval(() => {
      if (pushed.current) return;

      /*
       * A READING BEATS AN ERROR, and the order is the whole point. If it is `scheduleOnRN`
       * that fails, then EVERY frame writes both a good sample and a thrown message — and the
       * app is working, through this path, with nothing worth putting on screen. Reading
       * `thrown` first would paper a live viewfinder over with an error about a mechanism the
       * person holding the phone is no longer using.
       */
      const sample = latest.getDirty();
      if (sample !== null) {
        seenFrame.current = true;
        onReading(
          read(MODE, {
            region: { samples: sample.samples, width: sample.width, height: sample.height },
            space: sample.space,
          }),
        );
        return;
      }

      const why = refusal.getDirty();
      if (why !== null) {
        seenFrame.current = true;
        onDiagnostic?.(why);
        return;
      }

      // Nothing was sampled and nothing was refused, so the sampling itself is what failed.
      const failure = thrown.getDirty();
      if (failure !== null) onDiagnostic?.(`the frame processor threw: ${failure}`);
    }, 250);
    return () => {
      clearInterval(id);
    };
  }, [latest, refusal, thrown, onReading, onDiagnostic]);

  const frameOutput = useFrameOutput({
    /*
     * `rgb`, and ADR-0075 is the argument. The camera converts natively; the worklet reads bytes
     * and computes nothing. Asking for `yuv` would leave a planar buffer that only a
     * hand-written YUV→RGB matrix could turn into a colour — arithmetic the engine does not
     * provide and `apps/mobile/AGENTS.md` forbids the app from inventing.
     */
    pixelFormat: 'rgb',
    /*
     * Frames the pipeline threw away. Without this the hook installs its own handler that calls
     * `console.warn` — which on a phone is a message nobody will ever read. A camera producing
     * frames and dropping every one of them is a completely different fault from one producing
     * none, and until now the screen showed the same nothing for both.
     */
    onFrameDropped: (reason) => {
      onDiagnostic?.(`the camera dropped a frame: ${reason}`);
    },
    onFrame: (frame: Frame) => {
      'worklet';
      /*
       * EVERYTHING IN HERE RUNS ON THE FRAME-PROCESSOR THREAD.
       *
       * It may read pixels and step over them. It may not compute a colour.
       *
       * The frame is disposed in a `finally`: VisionCamera drops subsequent frames while one is
       * retained, and a stalled preview is not a failure anybody can debug from the outside.
       */
      // FIRST, before anything that can throw: the frame thread reached this callback.
      entered.setBlocking((n) => n + 1);
      try {
        const outcome = sampleFrame(frame, space);

        /*
         * PUT IT WHERE THE JS THREAD CAN FETCH IT **BEFORE** TRYING TO PUSH IT.
         *
         * `scheduleOnRN` is the push, and from a non-RN runtime it goes through
         * `globalThis.__workletsModuleProxy` and `globalThis.__serializer`. Reading the
         * worklets source, both should be installed on the runtime
         * `createWorkletRuntimeForThread` builds — but F-120 watched this worklet run 51 times
         * and deliver nothing, and "should" is not a thing to stake the feature on. If the push
         * throws, the sample is lost and looks exactly like a sample never taken. Written here
         * first, it survives that.
         */
        if (outcome.ok) latest.setBlocking(outcome.sample);
        else refusal.setBlocking(outcome.why);

        if (outcome.ok) scheduleOnRN(deliver, outcome.sample);
        else scheduleOnRN(report, outcome.why);
      } catch (error: unknown) {
        /*
         * THE MESSAGE, NOT A SHRUG.
         *
         * `react-native-vision-camera-worklets` wraps this callback in its own try/catch and
         * sends whatever it catches to `console.error` — which on somebody's phone is nowhere.
         * So a throw here repeats on every frame in total silence: `entered` keeps counting,
         * the preview stays live, and the screen has nothing to say. This is the sentence that
         * names it, carried out on the one mechanism already proven to work from this thread.
         */
        thrown.setBlocking(error instanceof Error ? error.message : String(error));
      } finally {
        frame.dispose();
      }
    },
  });

  const onSessionConfigSelected = useCallback((config: CameraSessionConfig) => {
    // The ONE honest source for the capture space. `readCaptureSpace` returns `unknown` for
    // anything it does not recognise rather than falling back to sRGB.
    setSpace(readCaptureSpace(config.selectedVideoDynamicRange?.colorSpace));
  }, []);

  if (device === undefined) return null;

  return (
    // No background: the camera fills this box, and the screen already wraps it in a
    // `Surface`. Naming a colour token by literal here would also defeat gate 8's decoy for
    // `nativeElevation`, which asserts that `surface.1` is reached only THROUGH the map.
    <View style={{ aspectRatio: 3 / 4 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[frameOutput]}
        onSessionConfigSelected={onSessionConfigSelected}
        /*
         * THE CAMERA'S OWN ERROR CHANNEL, which this screen ignored entirely until now.
         *
         * VisionCamera offers `onError` and defaults it to a handler that logs. A session that
         * starts a preview and then fails to configure an output reports it HERE and nowhere a
         * person can see — so a working preview with no readings was the symptom, and the
         * explanation was going to a log on a phone.
         */
        onError={(error) => {
          onDiagnostic?.(`camera error: ${error.message}`);
        }}
      />
      {/*
        THE RETICLE (F-149), and both changes to it are colour science rather than taste.

        IT DOES NOT ENCLOSE THE REGION. It was a closed 2px rule on all four sides, and a hard
        border around a colour changes how that colour reads — simultaneous contrast is the
        entire reason `swatch.well` exists, and this is that hazard applied to the live subject
        somebody is judging. Corner marks say where the sample is taken without framing it, so
        what surrounds the colour is the scene rather than our rule.

        IT IS TWO-TONE, for the reason `Swatch`'s keyline is (F-068): the other side of this
        line is an arbitrary camera image. A single grey — `border.strong` — is nearly
        invisible over a pale garment, on the one surface where the marker must always be
        findable. The same gamut-verified pair is reused rather than a new one invented: the
        better of the two tones reaches 4.23 against the worst possible sample and they differ
        from each other by ~18:1 whatever sits behind them.

        `pointerEvents="none"` so the overlay never swallows a gesture meant for the camera.
      */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {CORNERS.map((corner) => (
          <View
            key={corner.key}
            style={{
              position: 'absolute',
              ...corner.at,
              width: BRACKET,
              height: BRACKET,
              ...corner.outer,
              borderColor: colors['swatch.hairline.inverse'],
            }}
          >
            {/*
              The inner tone, inset by the outer's own border so the two read as parallel
              hairlines rather than as one thick edge — the same nesting `Swatch` uses.
            */}
            <View
              style={{
                width: BRACKET,
                height: BRACKET,
                ...corner.outer,
                borderColor: colors['swatch.hairline'],
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Walk the centre region of a frame and return a bounded sample.
 *
 * **A worklet.** It reads bytes and steps over them; it computes no colour.
 *
 * Refuses rather than guessing whenever the buffer is not the shape this can read. A frame it
 * cannot walk is not an RGBA frame by default — that assumption is the one thing this whole
 * module is arranged to avoid.
 *
 * ## It now says WHY it refused
 *
 * It used to return `null`. Refusing was right; **refusing silently was not.** The Lens showed a
 * live preview and no reading, forever, with nothing anywhere saying which of four things had
 * happened — no frames at all, a GPU-only buffer, a planar format, or a region of zero size.
 * A frame processor that declines every frame and reports nothing is indistinguishable from one
 * that is not running.
 */
type FrameOutcome =
  | { readonly ok: true; readonly sample: FrameSample }
  | { readonly ok: false; readonly why: string };

function sampleFrame(frame: Frame, space: CaptureSpace): FrameOutcome {
  'worklet';
  const size = Math.floor(Math.min(frame.width, frame.height) * REGION_FRACTION);
  if (size <= 0)
    return { ok: false, why: `frame ${String(frame.width)}x${String(frame.height)} is too small` };

  /*
   * A GPU-only buffer. `pixelFormat: 'rgb'` asks for CPU-readable RGB, but the negotiated
   * format is the device's answer rather than our request.
   */
  if (!frame.hasPixelBuffer) return { ok: false, why: 'the frame has no CPU pixel buffer' };

  /*
   * `hasPixelBuffer` is a promise about the format, not about this call succeeding. A throw here
   * would leave the frame thread with nothing to say — the wrapper in
   * `react-native-vision-camera-worklets` catches everything `onFrame` throws and sends it to
   * `console.error`, which is not somewhere the person holding the phone can read. A refusal
   * carries the reason to the screen instead.
   */
  let pixels: Uint8Array;
  try {
    pixels = new Uint8Array(frame.getPixelBuffer());
  } catch (error: unknown) {
    return {
      ok: false,
      why: `the pixel buffer could not be read: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const bytesPerPixel = Math.floor(frame.bytesPerRow / frame.width);
  /*
   * Fewer than three bytes per pixel means a planar (YUV) buffer, whose `getPixelBuffer()` the
   * library documents as undefined behaviour. Reading it would produce a plausible colour from
   * the wrong bytes, which is worse than reading nothing.
   */
  if (bytesPerPixel < 3)
    return {
      ok: false,
      why: `${String(bytesPerPixel)} byte(s) per pixel — the frame is planar, not RGB`,
    };

  const left = Math.floor((frame.width - size) / 2);
  const top = Math.floor((frame.height - size) / 2);
  const stride = sampleStride(size * size);

  const samples = [];
  for (let y = 0; y < size; y += stride)
    for (let x = 0; x < size; x += stride) {
      /*
       * `bytesPerRow`, NOT `width * bytesPerPixel`. Rows are padded to an alignment boundary on
       * both platforms, and a walk that assumes they are not drifts a little further left with
       * every row — producing a plausible colour sampled from the wrong place.
       */
      const at = (top + y) * frame.bytesPerRow + (left + x) * bytesPerPixel;
      samples.push({
        r: (pixels[at] ?? 0) / 255,
        g: (pixels[at + 1] ?? 0) / 255,
        b: (pixels[at + 2] ?? 0) / 255,
        alpha: bytesPerPixel > 3 ? (pixels[at + 3] ?? 255) / 255 : 1,
      });
    }

  return {
    ok: true,
    sample: {
      samples,
      space,
      width: Math.ceil(size / stride),
      height: Math.ceil(size / stride),
    },
  };
}
