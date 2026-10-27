import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Compare } from '../../../src/screens/Compare';
import { COLOURS_SEPARATOR } from '../../../src/export/subject';

/**
 * The route: `08`'s app bar replaces the platform header, and each drawn action has its target
 * (F-249, ADR-0156).
 *
 * `?a` is the colour the page opens on (F-181: the colour page's *Compare* carries it). Absent, the
 * page opens on the corpus's first and last entries; a colour this corpus does not hold is the
 * absent state, whose back is the way out.
 *
 * `string | string[]` for the reason `[slug].tsx` gives: a query parameter can repeat, and taking the
 * first element means a malformed URL reaches the screen as a slug that does not resolve rather than
 * throwing before anything is drawn.
 */
export default function CompareRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ a?: string | string[] }>();
  const a = Array.isArray(params.a) ? params.a[0] : params.a;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Compare
        {...(a === undefined || a === '' ? {} : { initialA: a })}
        // BACK TO THE ATLAS (D6). `navigate`, so the Atlas is not stacked a second time.
        onBack={() => {
          router.navigate('/atlas');
        }}
        // THE PAIR TO EXPORT (D3): both colours and their ΔE00 row, every format.
        onExport={(first, second) => {
          router.push(`/profile/export?pair=${first}${COLOURS_SEPARATOR}${second}`);
        }}
        // THE SAME, PDF CHOSEN (D4). F-263 composes the document.
        onExportPdf={(first, second) => {
          router.push(`/profile/export?pair=${first}${COLOURS_SEPARATOR}${second}&format=pdf`);
        }}
        // A DRAFT, NOT A WRITE (D5): the Studio opens on the two colours, A the anchor, unsaved.
        onAddToStudio={(first, second) => {
          router.push(`/atlas/palettes?colours=${first}${COLOURS_SEPARATOR}${second}`);
        }}
      />
    </>
  );
}
