import { useState } from 'react';
import { Stack } from 'expo-router';
import { ProfileSetup } from '../src/screens/ProfileSetup';
import { deviceRepository } from '../src/store/repository';
import { takeReading } from '../src/lens/handoff';

/**
 * The route. Navigation options and the store, and nothing else.
 *
 * `deviceRepository` is imported **here** rather than in the screen: it reaches `expo-sqlite`,
 * which needs a device, so a screen that imported it could not be rendered by jest at all —
 * and the screen suite is where NFR-8 and NFR-9 are actually checked. `Repository` satisfies
 * `ProfileStore` structurally, so this is a pass-through and `typecheck` proves they agree.
 */
export default function ProfileRoute(): React.JSX.Element {
  /*
   * The offered reading, taken ONCE (F-097).
   *
   * In state rather than read on every render: `takeReading` consumes, so calling it during a
   * re-render would hand back the reading the first time and `null` every time after — the
   * estimate would appear and then vanish on the next keystroke. Reading it in the initialiser
   * takes the offer exactly once per mount, which is what "an offer" means.
   */
  const [reading] = useState(() => takeReading());

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      {/*
        Spread rather than `reading={reading ?? undefined}`. Under `exactOptionalPropertyTypes`
        an optional prop promises the key is either ABSENT or a reading — never
        present-and-undefined — and the screen's own `reading === undefined` test is what
        decides which privacy sentence it shows. Passing the key with `undefined` in it would
        make "no camera was used" depend on a distinction the type system exists to remove.
      */}
      <ProfileSetup store={deviceRepository()} {...(reading === null ? {} : { reading })} />
    </>
  );
}
