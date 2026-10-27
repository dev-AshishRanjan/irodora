import { useMemo } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { COLOURS_SEPARATOR } from '../../../src/export/subject';
import { draftOf } from '../../../src/palette';
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
 *
 * `colours` opens the Studio on a draft of those colours, the first the anchor (F-249: `08`'s *Add Pair
 * to Palette Studio*, ADR-0156 D5). A draft, not a write: nothing is stored until the person names it
 * and saves, and a slug the corpus does not hold opens the Studio empty.
 */
export default function PalettesRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ colours?: string | string[] }>();
  const colours = Array.isArray(params.colours) ? params.colours[0] : params.colours;
  const initialDraft = useMemo(
    () => (colours === undefined ? null : draftOf(colours.split(COLOURS_SEPARATOR))),
    [colours],
  );
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <PaletteStudio
        store={deviceRepository()}
        {...(initialDraft === null ? {} : { initialDraft })}
      />
    </>
  );
}
