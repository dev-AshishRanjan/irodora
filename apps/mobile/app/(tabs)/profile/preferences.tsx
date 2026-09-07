import { Stack } from 'expo-router';
import { Preferences } from '../../../src/screens/Preferences';
import { deviceRepository } from '../../../src/store/repository';
import { useAppearance } from '../../../src/appearance';

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
  /*
   * THE ROUTE READS THE HOOK, and the screen takes props (F-153). `useAppearance()` throws
   * outside its provider and the conformance suite renders `Preferences` without one — a
   * screen that reached for the context could not be checked by the suite where the
   * accessibility guarantees are actually verified. The same seam as the repository, one
   * level up.
   */
  const { appearance, choose, device } = useAppearance();
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Preferences
        store={deviceRepository()}
        appearance={appearance}
        onChooseAppearance={choose}
        device={device}
      />
    </>
  );
}
