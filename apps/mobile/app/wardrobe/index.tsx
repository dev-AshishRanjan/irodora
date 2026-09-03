import { Stack, useRouter } from 'expo-router';
import { Wardrobe } from '../../src/screens/Wardrobe';
import { deviceRepository } from '../../src/store/repository';

/**
 * The route. Navigation options, and the one wire the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen because it reaches a
 * device — `expo-sqlite` — and a screen importing it could not be rendered by jest, which is
 * where the accessibility guarantees are actually checked. The seam is proven from both ends:
 * `typecheck` says `Repository` satisfies `BrowseStore`, and the screen suite drives both
 * branches through a fake.
 *
 * `/wardrobe` rather than `/wardrobe/browse`: this is what the segment is *for*, and `add.tsx`
 * sits beside it as the thing you do to a wardrobe rather than a peer of it.
 */
/*
 * THE ROUTE MAKES THE WIRE, NOT THE SCREEN (F-139).
 *
 * A screen that called `router.push` itself could not be rendered by the conformance suite —
 * `useRouter` needs a navigator around it — and that suite is where the accessibility and
 * contrast guarantees are actually checked. So the screen takes a callback and this supplies
 * it, which is the convention `app/index.tsx` already uses for ten destinations.
 */
export default function WardrobeRoute(): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Wardrobe
        store={deviceRepository()}
        onAddGarment={() => {
          router.push('/wardrobe/add');
        }}
      />
    </>
  );
}
