import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WRITERS } from '@irodora/export';
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
 * that colour is the subject; `07`'s *Export Palette Tokens* opens it with the combination's
 * `colours` (F-248, ADR-0152 D6), and those are; `08`'s glyph and its *Export Precision Delta PDF* open
 * it with the `pair` (F-249, ADR-0156 D3/D4) — its two colours and their ΔE00 row — the PDF with
 * `format=pdf` chosen on arrival. Opened bare, the subject is the palette saved most recently. A picker
 * would be a second surface for something Palette Studio already lists, and FR-51 asks that an
 * export can be produced rather than that this screen own palette selection.
 *
 * `null` when there is neither — the screen says so rather than offering six formats for nothing.
 * Which subject, decided in `exportSubjectFor`, where a test can reach it.
 */
export default function ExportRoute(): React.JSX.Element {
  const router = useRouter();
  // Typed OPTIONAL, because it is: a bare open carries no parameter.
  const params = useLocalSearchParams<{
    slug?: string | string[];
    colours?: string | string[];
    pair?: string | string[];
    palette?: string | string[];
    saved?: string | string[];
    format?: string | string[];
  }>();
  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const slug = first(params.slug);
  const colours = first(params.colours);
  const pair = first(params.pair);
  // 10's palettes (F-251, ADR-0165 D2): a curated slug or a saved id.
  const palette = first(params.palette);
  const saved = first(params.saved);
  // A writer's own name, or nothing: a parameter is never trusted to name a format (ADR-0156 D4).
  const format = WRITERS.find((w) => w.format === first(params.format))?.format;
  const subject = useMemo(
    () => exportSubjectFor(slug, deviceRepository().listPalettes(), colours, pair, palette, saved),
    [slug, colours, pair, palette, saved],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Export
        subject={subject}
        {...(format === undefined ? {} : { initialFormat: format })}
        sink={deviceSink()}
        onBuildPalette={() => {
          router.push('/atlas/palettes');
        }}
      />
    </>
  );
}
