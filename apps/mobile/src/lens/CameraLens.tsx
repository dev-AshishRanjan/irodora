/**
 * The Lens, with the camera attached — everything that needs a native module.
 *
 * ## Why this file exists, and why it is loaded lazily
 *
 * `react-native-vision-camera` builds its native binding **at module scope**:
 *
 * ```ts
 * export const VisionCamera = NitroModules.createHybridObject<CameraFactory>('CameraFactory')
 * ```
 *
 * So *importing* it throws when the HybridObject is not registered — the error
 * [`permission.ts`](./permission.ts) already records from CI:
 *
 * ```
 * Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.
 * ```
 *
 * While the route imported this statically, that throw happened during module evaluation, before
 * any component rendered — so **no error boundary could catch it and the whole app closed** the
 * moment somebody pressed "Read a colour with the camera". A screen failing must never do that.
 *
 * Loaded through `React.lazy` from [`app/(tabs)/lens.tsx`](../../app/(tabs)/lens.tsx), the same
 * failure becomes a rejected promise inside a boundary: the app stays up and shows what went
 * wrong, which is both the honest behaviour and the only way anybody can report the real cause.
 *
 * ## What is left here, and what deliberately is not
 *
 * Wiring. The capture machine is a pure module ([`capture.ts`](./capture.ts)) tested as a
 * sequence, and the screen is presentational — so what lives in the one file jest cannot render
 * is a `useReducer`, a timer, and a derivation. That is the arrangement F-160 was after: the
 * untestable file should hold the least interesting code in the feature.
 *
 * ## The photograph arrives through a port, for the reason the wardrobe's does
 *
 * `expo-image-picker` needs a device, a permission dialogue and a person, so
 * `app/(tabs)/lens.tsx` supplies an {@link ImageSource} and this calls it. That keeps the one
 * device-bound step out of everything that decodes, bounds or draws — `lens/photo.ts` is a pure
 * module with a test that reads real files, and the screen is renderable with a photograph
 * already open.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Lens } from '../screens/Lens';
import { Viewfinder, useLensPermission } from './viewfinder';
import { lensExits } from './exits';
import type { TargetColour } from '../target';
import type { TemperaturePoles } from '../against-target';
import { noHaptics, type Haptics } from '../haptics';
import {
  CAPTURE_IDLE,
  CAPTURE_TIMEOUT_MS,
  demandFor,
  nextCapture,
  type CaptureKind,
  type LensMode,
} from './capture';
import {
  ImageRejected,
  openPhoto,
  PHOTO_CENTRE,
  PhotoUnreadable,
  readPhoto,
  type DecodedPhoto,
  type PhotoPoint,
} from './photo';
import { base64FromBytes } from '../wardrobe/source';
import type { ImageSource } from '../wardrobe/source';
import type { LensReading } from './reading';

export interface CameraLensProps {
  /** The photo library, as a port. Supplied by the route; see the header. */
  readonly imageSource: ImageSource;
  /**
   * The colour being compared against, and the poles needed to say warmer or cooler (F-201).
   *
   * Both come from the ROUTE. This component owns the camera, not the content — a module that
   * read the rule set here would put content loading behind a lazy native import.
   */
  readonly target?: TargetColour | null;
  readonly poles?: TemperaturePoles;
  /**
   * The haptic port (F-206). A reading TAKEN is a commit; aiming at one is not.
   *
   * Supplied by the route, like every device seam here — `expo-haptics` reaches native code and
   * a screen importing it could not be rendered by jest.
   */
  readonly haptics?: Haptics;
}

export default function CameraLens({
  imageSource,
  target = null,
  poles,
  haptics = noHaptics,
}: CameraLensProps): React.JSX.Element {
  const { permission, request } = useLensPermission();
  const [capture, dispatch] = useReducer(nextCapture, CAPTURE_IDLE);
  /**
   * Why there is no reading, when the frame output can say.
   *
   * Held here rather than in `Viewfinder` because the screen owns the layout, and cleared the
   * moment a reading arrives — a stale reason under a live reading would be worse than none.
   */
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  /**
   * The decoded photograph — up to a hundred megabytes of it.
   *
   * A ref rather than reducer state, deliberately. Only the shutter handler reads these pixels,
   * nothing renders from them, and React compares state on every dispatch: putting a buffer this
   * size where a live readout dispatches at frame rate would be work with no result. What the
   * screen needs — the URI, the dimensions, the chosen point — is in the reducer.
   */
  const photoPixels = useRef<DecodedPhoto | null>(null);

  /**
   * What the frame processor should be doing.
   *
   * **Derived, never stored.** A second copy of this is exactly how a camera comes to keep
   * sampling after everything on screen says it has stopped.
   */
  const demand = demandFor(capture);

  const takeReading = useCallback((reading: LensReading, of: CaptureKind) => {
    setDiagnostic(null);
    dispatch({ kind: 'reading', reading, of });
  }, []);

  /**
   * Take a reading.
   *
   * TWO PATHS, ONE CONTROL. A photograph is already decoded, so its reading exists the moment
   * the shutter is pressed and is dispatched directly — there is nothing to await and no frame
   * to time out. The camera has to be asked, so it goes through `shutter` and the demand.
   */
  const onCapture = useCallback(() => {
    const photo = photoPixels.current;
    if (photo === null) {
      // The camera is asked. Where it reads is `capture.aim`, already on the frame thread.
      dispatch({ kind: 'shutter' });
      return;
    }
    /*
     * A COMMIT (F-206), and it fires HERE rather than on the shutter branch above.
     *
     * The branch that dispatches `shutter` has not taken a reading — it has ASKED the camera
     * for one, and the answer arrives later or not at all. A haptic there would confirm an
     * intention, and the two differ exactly when the capture fails.
     */
    haptics.commit();
    dispatch({ kind: 'reading', reading: readPhoto(photo, pointRef.current), of: 'capture' });
  }, [haptics]);

  /**
   * Where in the photograph to read, mirrored out of the reducer.
   *
   * `onCapture` must not depend on the point, or it would be rebuilt on every tap and the
   * memoised viewfinder below would lose its bail-out. A ref written during commit is the
   * value at the moment the shutter is pressed, which is the only moment it is read.
   */
  const pointRef = useRef<PhotoPoint>(PHOTO_CENTRE);

  const onPoint = useCallback((at: PhotoPoint) => {
    pointRef.current = at;
    dispatch({ kind: 'point', at });
  }, []);

  /**
   * Open a photograph: pick it, bound it, decode it.
   *
   * THE ORDER IS THE SECURITY PROPERTY. `openPhoto` runs `ingestImage` first — bytes, then the
   * type from the magic numbers, then the pixel count from the header — and only then decodes.
   * Nothing here can hand raw bytes to a decoder, because `decodePhoto` does not accept them.
   *
   * Both refusals reach the screen as a sentence rather than a log. `ImageRejected` means the
   * file was not accepted at all; `PhotoUnreadable` means it was and then could not be read.
   * They are different enough to be worth telling apart, and a person who picked a 40-megapixel
   * panorama should be told that rather than shown a shrug.
   */
  const onOpenPhoto = useCallback(async () => {
    dispatch({ kind: 'opening' });
    try {
      const bytes = await imageSource.pickFromLibrary();
      if (bytes === null) {
        dispatch({ kind: 'cancelled' });
        return;
      }

      const { photo, image } = openPhoto(bytes);
      photoPixels.current = photo;
      pointRef.current = PHOTO_CENTRE;
      setDiagnostic(null);
      dispatch({
        kind: 'photo',
        photo: {
          // The SANITISED bytes, which are also the ones that were decoded — so what is shown
          // and what is measured are the same image, EXIF rotation included (or rather
          // excluded, from both).
          uri: `data:image/${image.format};base64,${base64FromBytes(image.bytes)}`,
          width: image.width,
          height: image.height,
          at: PHOTO_CENTRE,
        },
      });
    } catch (error: unknown) {
      if (!(error instanceof ImageRejected) && !(error instanceof PhotoUnreadable)) throw error;
      photoPixels.current = null;
      setDiagnostic(error.message);
      dispatch({ kind: 'refused' });
    }
  }, [imageSource]);

  const onUseCamera = useCallback(() => {
    photoPixels.current = null;
    pointRef.current = PHOTO_CENTRE;
    setDiagnostic(null);
    dispatch({ kind: 'camera' });
  }, []);

  const onModeChange = useCallback((mode: LensMode) => {
    dispatch({ kind: 'mode', mode });
  }, []);

  const onDismiss = useCallback(() => {
    dispatch({ kind: 'dismissed' });
  }, []);

  /*
   * A CAPTURE THAT NEVER ARRIVES HAS TO END.
   *
   * Without this the button sits on "Reading…" forever when the camera delivers nothing, which
   * is the silent failure this whole feature exists to remove — the person pressed a control and
   * the app simply stopped answering. The viewfinder's own diagnostic fires first and says WHY;
   * this says that it is over.
   */
  useEffect(() => {
    if (!capture.awaiting) return undefined;
    const timer = setTimeout(() => {
      dispatch({ kind: 'timeout' });
    }, CAPTURE_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [capture.awaiting]);

  /**
   * EVERY WAY OUT OF THE LENS, AND EACH OF THEM CLOSES THE PANEL FIRST (F-178).
   *
   * This file used to hold four independent handlers that navigated, and **not one of them
   * cleared the capture** — so the sheet, which is open exactly while `held !== null` and is
   * portalled, stayed mounted over whatever the router pushed. Reported as *"it redirects to
   * another page, but the bottom sheet is still open as fullscreen"*.
   *
   * Correcting four call sites would have worked today and not survived the fifth. The rule now
   * lives in `exits.ts`, where an exit is a ROW and closing the panel is not something a row
   * does. `lens-exits.test.ts` refuses a `router.push` anywhere in this file, which is what
   * stops a fifth door being cut beside the table instead of in it.
   */
  const exits = useMemo(
    () =>
      lensExits({
        dismiss: onDismiss,
        navigate: (href) => {
          router.push(href);
        },
      }),
    [onDismiss],
  );

  /*
   * MEMOISED ON THE DEMAND, and it pairs with `memo(ViewfinderView)`.
   *
   * In live mode the screen re-renders at frame rate. Without this the element is rebuilt each
   * time — and while `memo` would still bail out on equal props, building a new element per
   * frame for a camera session is work with no result. The dependency list is the demand and
   * three stable callbacks, so this rebuilds when the Lens actually changes what it is asking
   * for, and not otherwise.
   */
  const viewfinder = useMemo(
    () =>
      permission === 'granted' ? (
        <Viewfinder
          demand={demand}
          at={capture.aim}
          onReading={takeReading}
          onDiagnostic={setDiagnostic}
        />
      ) : null,
    [permission, demand, capture.aim, takeReading],
  );

  return (
    <Lens
      viewfinder={viewfinder}
      capture={capture.held}
      live={capture.live}
      mode={capture.mode}
      awaiting={capture.awaiting}
      failed={capture.failed}
      diagnostic={diagnostic}
      permission={permission}
      onRequestPermission={request}
      photo={capture.photo}
      opening={capture.opening}
      onCapture={onCapture}
      onModeChange={onModeChange}
      onOpenPhoto={() => {
        void onOpenPhoto();
      }}
      onUseCamera={onUseCamera}
      onPoint={onPoint}
      onDismiss={onDismiss}
      onUseForProfile={exits.useForProfile}
      onUseForWardrobe={exits.useForWardrobe}
      // F-155 criterion 5: a reading leads to the contemporary colours of its nearest entry, on
      // their own screen. The Lens stays decluttered; this is a way OUT of it.
      onOpenContemporary={exits.openContemporary}
      // F-197: the other question about the same nearest entry.
      onOpenCombinations={exits.openCombinations}
      // F-201: the comparison, when one is armed.
      target={target}
      {...(poles === undefined ? {} : { poles })}
      onOpenColour={exits.openColour}
    />
  );
}
