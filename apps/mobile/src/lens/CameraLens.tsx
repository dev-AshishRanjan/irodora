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
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { router } from 'expo-router';
import { Lens } from '../screens/Lens';
import { Viewfinder, useLensPermission } from './viewfinder';
import { offerReading } from './handoff';
import {
  CAPTURE_IDLE,
  CAPTURE_TIMEOUT_MS,
  demandFor,
  nextCapture,
  type CaptureKind,
  type LensMode,
} from './capture';
import type { LensReading } from './reading';

export default function CameraLens(): React.JSX.Element {
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

  const onCapture = useCallback(() => {
    dispatch({ kind: 'shutter' });
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
   * Hand the reading over and go to profile setup.
   *
   * `offerReading` leaves it in a one-shot slot rather than a route parameter — see
   * `handoff.ts` for why a URL is the wrong place for it and why the offer is consumed rather
   * than left standing.
   */
  const useForProfile = useCallback((taken: LensReading) => {
    offerReading(taken, 'profile');
    router.push('/profile');
  }, []);

  /**
   * Hand the reading to the wardrobe and go to the add screen (F-125).
   *
   * **This is the call that did not exist.** `READING_DESTINATIONS` has had `'wardrobe'` since
   * F-043 and `app/wardrobe/add.tsx` has been reading that address ever since, so
   * `AddGarment`'s "use the Lens reading" control was unreachable on a device — a consumer with
   * no producer, invisible because every test supplied the reading itself.
   *
   * Addressed to `'wardrobe'`, which is the whole of E-042: an unaddressed offer would be eaten
   * by profile setup if the person passed through it on the way, and neither screen could tell
   * that from nobody having scanned.
   */
  const useForWardrobe = useCallback((taken: LensReading) => {
    offerReading(taken, 'wardrobe');
    router.push('/wardrobe/add');
  }, []);

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
        <Viewfinder demand={demand} onReading={takeReading} onDiagnostic={setDiagnostic} />
      ) : null,
    [permission, demand, takeReading],
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
      onCapture={onCapture}
      onModeChange={onModeChange}
      onDismiss={onDismiss}
      onUseForProfile={useForProfile}
      onUseForWardrobe={useForWardrobe}
      onOpenColour={(slug) => {
        router.push(`/atlas/${slug}`);
      }}
    />
  );
}
