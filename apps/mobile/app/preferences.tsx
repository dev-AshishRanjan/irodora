import { Stack } from 'expo-router';
import { Preferences } from '../src/screens/Preferences';
import { deviceRepository } from '../src/store/repository';

/**
 * The route. Navigation options, and the one wire the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen because it reaches
 * `expo-sqlite`, which needs a device — a screen that imported it could not be rendered by
 * jest, and the screen suite is where the accessibility guarantees are actually checked. The
 * same seam `palettes.tsx` uses, for the same reason.
 *
 * Proven from both ends: `typecheck` says `Repository` satisfies `PreferenceStore`, and
 * `screens.test.tsx` asserts this file passes the real repository rather than something that
 * merely compiles.
 */
export default function PreferencesRoute(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Preferences store={deviceRepository()} />
    </>
  );
}
