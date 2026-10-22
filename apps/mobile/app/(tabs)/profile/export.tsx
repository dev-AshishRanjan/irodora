import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Export } from '../../../src/screens/Export';
import { deviceSink } from '../../../src/export/device';
import { exportSubjectFor } from '../../../src/export/subject';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the two wires the screen cannot make itself.
 *
 * `deviceSink()` and `deviceRepository()` are imported **here** because both reach a device —
 * `expo-file-system`, `expo-sharing` and `expo-sqlite` — and a screen importing any of them
 * could not be rendered by jest, which is where the accessibility guarantees are checked.
 *
 * ## A colour, or the most recent palette, and why not a chooser
 *
 * The colour page's export glyph opens this route with the colour's `slug` (F-247, ADR-0147), and
 * that colour is the subject. Opened bare, the subject is the palette saved most recently. A picker
 * would be a second surface for something Palette Studio already lists, and FR-51 asks that an
 * export can be produced rather than that this screen own palette selection.
 *
 * `null` when there is neither — the screen says so rather than offering six formats for nothing.
 * Which subject, decided in `exportSubjectFor`, where a test can reach it.
 */
export default function ExportRoute(): React.JSX.Element {
  const router = useRouter();
  // Typed OPTIONAL, because it is: a bare open carries no parameter.
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const subject = useMemo(() => exportSubjectFor(slug, deviceRepository().listPalettes()), [slug]);

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
