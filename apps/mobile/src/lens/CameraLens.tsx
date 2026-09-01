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
 * Loaded through `React.lazy` from [`app/lens.tsx`](../../app/lens.tsx), the same failure becomes
 * a rejected promise inside a boundary: the app stays up and shows what went wrong, which is
 * both the honest behaviour and the only way anybody can report the real cause.
 */

import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Lens } from '../screens/Lens';
import { Viewfinder, useLensPermission } from './viewfinder';
import { offerReading } from './handoff';
import type { LensReading } from './reading';

export default function CameraLens(): React.JSX.Element {
  const { permission, request } = useLensPermission();
  const [reading, setReading] = useState<LensReading | null>(null);

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

  return (
    <Lens
      viewfinder={permission === 'granted' ? <Viewfinder onReading={setReading} /> : null}
      reading={reading}
      permission={permission}
      onRequestPermission={request}
      onUseForProfile={useForProfile}
      onOpenColour={(slug) => {
        router.push(`/atlas/${slug}`);
      }}
    />
  );
}
