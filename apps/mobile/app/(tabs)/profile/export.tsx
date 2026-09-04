import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Export } from '../../../src/screens/Export';
import { deviceSink } from '../../../src/export/device';
import { paletteSubject } from '../../../src/export/subject';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the two wires the screen cannot make itself.
 *
 * `deviceSink()` and `deviceRepository()` are imported **here** because both reach a device —
 * `expo-file-system`, `expo-sharing` and `expo-sqlite` — and a screen importing any of them
 * could not be rendered by jest, which is where the accessibility guarantees are checked.
 *
 * ## The most recent palette, and why not a chooser
 *
 * The subject is the palette saved most recently. A picker would be a second surface for
 * something Palette Studio already lists, and FR-51 asks that an export can be produced rather
 * than that this screen own palette selection. When the Studio grows an "export this one"
 * control, it passes its own palette and this default stops being the only way in.
 *
 * `null` when nothing is saved — the screen says so rather than offering six formats for
 * nothing.
 */
export default function ExportRoute(): React.JSX.Element {
  const router = useRouter();
  const subject = useMemo(() => {
    const palettes = deviceRepository().listPalettes();
    // The LAST one, because `listPalettes` is in creation order and the most recent is what
    // somebody was just working on.
    const latest = palettes.at(-1);
    return latest === undefined ? null : paletteSubject(latest);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Export
        subject={subject}
        sink={deviceSink()}
        onBuildPalette={() => {
          router.push('/atlas/palettes');
        }}
      />
    </>
  );
}
