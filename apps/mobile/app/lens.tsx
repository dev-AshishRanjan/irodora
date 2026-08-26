import { useCallback, useState } from 'react';
import { Stack, router } from 'expo-router';
import { Lens } from '../src/screens/Lens';
import { Viewfinder, useLensPermission } from '../src/lens/viewfinder';
import { offerReading } from '../src/lens/handoff';
import type { LensReading } from '../src/lens/reading';

/**
 * The route. Navigation options, the camera, and the hand-off — and nothing else.
 *
 * `Viewfinder` and `useLensPermission` are imported **here** rather than in the screen: they
 * reach `react-native-vision-camera`, which is a native module, so a screen that imported them
 * could not be rendered by jest at all — and the screen suite is where NFR-8 and the conformance
 * checks actually run. Same reasoning as `profile.tsx` and `deviceRepository`.
 *
 * The result is that `src/screens/Lens.tsx` is fully checked by gate 8 and this file is the only
 * part of the feature that a device has to prove.
 */
export default function LensRoute(): React.JSX.Element {
  const { permission, request } = useLensPermission();
  const [reading, setReading] = useState<LensReading | null>(null);

  /**
   * Hand the reading over and go to profile setup.
   *
   * `offerReading` leaves it in a one-shot slot rather than a route parameter — see
   * `src/lens/handoff.ts` for why a URL is the wrong place for it and why the offer is consumed
   * rather than left standing.
   */
  const useForProfile = useCallback((taken: LensReading) => {
    offerReading(taken);
    router.push('/profile');
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Lens' }} />
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
    </>
  );
}
