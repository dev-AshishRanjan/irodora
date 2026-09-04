import { useState } from 'react';
import { Stack } from 'expo-router';
import { AddGarment } from '../../../src/screens/AddGarment';
import { takeReading } from '../../../src/lens/handoff';
import { devicePicker } from '../../../src/wardrobe/picker';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the two wires the screen cannot make itself.
 *
 * `deviceRepository()` and `devicePicker()` are imported **here** rather than in the screen
 * because both reach a device — `expo-sqlite` and `expo-image-picker` — and a screen importing
 * either could not be rendered by jest, which is where the accessibility guarantees are
 * actually checked. The seam is proven from both ends: `typecheck` says `Repository` satisfies
 * `WardrobeStore`, and the screen suite drives all four paths through fakes.
 *
 * ## The reading is taken ONCE, in an initialiser
 *
 * `takeReading` consumes. Calling it during a re-render would hand back the reading the first
 * time and `null` on every keystroke after, so the offered colour would appear and then vanish
 * while somebody was typing a brand into the field below it. The profile route takes its own
 * reading the same way and for the same reason (F-097).
 *
 * **Addressed to `'wardrobe'`** (F-043). Before the destination existed, a reading meant for
 * here would have been eaten by profile setup if the person passed through it on the way — and
 * neither screen could tell that from nobody having scanned at all.
 */
export default function AddGarmentRoute(): React.JSX.Element {
  const [offered] = useState(() => takeReading('wardrobe'));

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <AddGarment store={deviceRepository()} imageSource={devicePicker()} offered={offered} />
    </>
  );
}
