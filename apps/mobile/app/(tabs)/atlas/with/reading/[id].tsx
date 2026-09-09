import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Combinations } from '../../../../../src/screens/Combinations';
import { deviceRepository } from '../../../../../src/store/repository';

/**
 * What goes with a reading (F-202, criterion 3).
 *
 * **A reading has no slug and never will.** `SavedColorRow.corpus_slug` is `null` for a Lens
 * capture — *"its origin is a camera, which is what `source` already says"* — so the colour
 * subject F-197 added is the only honest way for a reading to ask this question. The alternative
 * was resolving it to the nearest published colour, which would answer about a different colour
 * than the one somebody scanned.
 *
 * **The id travels, not the colour**, and the row is read here: the same shape and the same
 * reasoning as `/wardrobe/with/[id]`, and the convention every device-reading route follows.
 *
 * A row that does not resolve reaches the screen as an entry subject with an unresolvable slug,
 * which is the existing "not in this corpus" state — one miss branch rather than a second that
 * says the same thing.
 */
export default function ReadingCombinationsRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');

  const row = repo.listColors().find((c) => c.id === id) ?? null;

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Combinations
        subject={
          row === null
            ? { kind: 'entry', slug: '' }
            : {
                kind: 'colour',
                oklch: [row.oklch_l, row.oklch_c, row.oklch_h],
                hex: row.hex,
                // The name the reading was saved under. Never invented: `name` is a NOT NULL
                // column and carries whatever the person or the capture put there.
                label: row.name,
              }
        }
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
      />
    </>
  );
}
