import { Stack } from 'expo-router';
import { ProfileSetup } from '../src/screens/ProfileSetup';
import { deviceRepository } from '../src/store/repository';

/**
 * The route. Navigation options and the store, and nothing else.
 *
 * `deviceRepository` is imported **here** rather than in the screen: it reaches `expo-sqlite`,
 * which needs a device, so a screen that imported it could not be rendered by jest at all —
 * and the screen suite is where NFR-8 and NFR-9 are actually checked. `Repository` satisfies
 * `ProfileStore` structurally, so this is a pass-through and `typecheck` proves they agree.
 */
export default function ProfileRoute(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ProfileSetup store={deviceRepository()} />
    </>
  );
}
