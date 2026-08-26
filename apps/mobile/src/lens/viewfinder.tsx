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

import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  type CameraSessionConfig,
  type Frame,
} from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@irodora/ui';
import { readCaptureSpace, sampleStride, type FrameSample } from './camera';
import { read } from './modes';
import type { CaptureSpace, LensReading } from './reading';
import type { LensPermission } from '../screens/Lens';

/**
 * The fraction of the frame's shorter side the crosshair region spans.
 *
 * A region rather than a pixel is FR-15's whole point: one pixel is a sensor artefact with a
 * colour attached. A tenth of the frame is small enough to point precisely and large enough to
 * clear FR-15's floor of 1000 usable samples on any camera this would run on.
 */
export const REGION_FRACTION = 0.1;

/** FR-13's mode, and the ceiling that goes with it (`MODE_CEILING.live` is 0.7). */
const MODE = 'live' as const;

export interface ViewfinderProps {
  /** Called with each reading the frame output produces. */
  readonly onReading: (reading: LensReading) => void;
}

/**
 * Map VisionCamera's permission model onto the screen's three states.
 *
 * Exported and pure so it can be tested without a camera. The distinction it preserves is the
 * one the copy depends on: *not asked yet* and *asked and refused* are different screens, and
 * only the first one has a button that would help.
 */
export function permissionState(
  hasPermission: boolean,
  canRequestPermission: boolean,
): LensPermission {
  if (hasPermission) return 'granted';
  return canRequestPermission ? 'undetermined' : 'denied';
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
export function Viewfinder({ onReading }: ViewfinderProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const device = useCameraDevice('back');

  /*
   * The negotiated capture space. `unknown` until the session says otherwise — see the header:
   * this is the one value that must never be guessed, and the confidence ceiling already prices
   * in not knowing it.
   */
  const [space, setSpace] = useState<CaptureSpace>('unknown');

  /** Reduce a frame sample to a reading, on the JS thread, through the engine. */
  const deliver = useCallback(
    (sample: FrameSample) => {
      onReading(
        read(MODE, {
          region: { samples: sample.samples, width: sample.width, height: sample.height },
          space: sample.space,
        }),
      );
    },
    [onReading],
  );

  const frameOutput = useFrameOutput({
    /*
     * `rgb`, and ADR-0075 is the argument. The camera converts natively; the worklet reads bytes
     * and computes nothing. Asking for `yuv` would leave a planar buffer that only a
     * hand-written YUV→RGB matrix could turn into a colour — arithmetic the engine does not
     * provide and `apps/mobile/AGENTS.md` forbids the app from inventing.
     */
    pixelFormat: 'rgb',
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
      try {
        const sample = sampleFrame(frame, space);
        if (sample !== null) scheduleOnRN(deliver, sample);
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
      />
      {/*
        THE CROSSHAIR. An outline rather than a filled shape: anything opaque over the region
        would change what the person sees of the colour they are pointing at, which is the one
        thing this surface exists to show them honestly.

        `pointerEvents="none"` so the overlay never swallows a gesture meant for the camera.
      */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={{
            position: 'absolute',
            left: '45%',
            top: '45%',
            width: '10%',
            height: '10%',
            borderWidth: 2,
            borderColor: colors['border.strong'],
          }}
        />
      </View>
    </View>
  );
}

/**
 * Walk the centre region of a frame and return a bounded sample.
 *
 * **A worklet.** It reads bytes and steps over them; it computes no colour.
 *
 * Returns `null` rather than guessing whenever the buffer is not the shape this can read. A
 * frame it cannot walk is not an RGBA frame by default — that assumption is the one thing this
 * whole module is arranged to avoid.
 */
function sampleFrame(frame: Frame, space: CaptureSpace): FrameSample | null {
  'worklet';
  const size = Math.floor(Math.min(frame.width, frame.height) * REGION_FRACTION);
  if (size <= 0 || !frame.hasPixelBuffer) return null;

  const pixels = new Uint8Array(frame.getPixelBuffer());
  const bytesPerPixel = Math.floor(frame.bytesPerRow / frame.width);
  if (bytesPerPixel < 3) return null;

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
    samples,
    space,
    width: Math.ceil(size / stride),
    height: Math.ceil(size / stride),
  };
}
