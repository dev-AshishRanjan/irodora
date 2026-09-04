import { Stack } from 'expo-router';
import { PaletteStudio } from '../../../src/screens/PaletteStudio';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the one wire the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen because it reaches
 * `expo-sqlite`, which needs a device — a screen that imported it could not be rendered by
 * jest, and the screen suite is where the accessibility guarantees are actually checked.
 *
 * The seam is proven from both ends: `typecheck` says `Repository` satisfies `PaletteStore`,
 * and `screens.test.tsx` asserts this file passes the real repository rather than something
 * that merely compiles. Neither is a substitute for the device attestation on F-041.
 */
export default function PalettesRoute(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <PaletteStudio store={deviceRepository()} />
    </>
  );
}
