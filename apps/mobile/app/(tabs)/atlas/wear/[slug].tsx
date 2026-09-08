import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Wear } from '../../../../src/screens/Wear';
import { activeProfile, toWorking } from '../../../../src/profile/store';
import { engineProfile } from '../../../../src/outfit/builder';
import { deviceRepository } from '../../../../src/store/repository';

/**
 * Wear it. Navigation options, and the wires the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen, for the reason
 * `wardrobe/shopping.tsx` gives: it reaches `expo-sqlite`, which needs a device, and a screen
 * importing it could not be rendered by jest — which is where the accessibility guarantees are
 * actually checked.
 *
 * ## Without a profile there is still a screen
 *
 * The same position `wardrobe/shopping.tsx` takes, and for the same reason: half of this
 * screen's answer does not need a profile. How a colour sits with the one in hand is figured
 * from the two colours, and only *does it suit you* requires a person. So the profile is passed
 * as `null` and the screen returns what it can, rather than the route deciding there is nothing
 * to show.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat. Taking the first
 * element means a malformed URL reaches the screen as a slug that does not resolve — which the
 * screen renders as a sentence — rather than throwing before anything is drawn.
 */
export default function WearRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const stored = activeProfile(repo);
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');

  // Narrowed once per stored profile rather than per render: `engineProfile` is a pure
  // narrowing of an immutable row, so repeating it would be work with an identical answer.
  const profile = useMemo(
    () => (stored === null ? null : engineProfile(toWorking(stored))),
    [stored],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Wear
        slug={slug}
        profile={profile}
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
        onBuildProfile={() => {
          router.push('/profile');
        }}
      />
    </>
  );
}
