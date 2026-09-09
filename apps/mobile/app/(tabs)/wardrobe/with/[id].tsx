import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Combinations } from '../../../../src/screens/Combinations';
import { deviceRepository } from '../../../../src/store/repository';

/**
 * What goes with a garment (F-197).
 *
 * **The id travels, not the colour.** The row is read here and its OKLCh handed to the screen,
 * so no colour data goes in a URL and the answer is about the garment's own value — not about
 * the nearest published colour to it, which is the substitution `Wardrobe` cannot disclose
 * without printing a distance it is forbidden to print.
 *
 * `deviceRepository()` is imported **here** rather than in the screen for the reason every
 * other device-reading route gives: it reaches `expo-sqlite`, and a screen importing it could
 * not be rendered by jest, which is where the accessibility guarantees are checked.
 *
 * A garment that does not resolve reaches the screen as a colour subject it cannot build, so the
 * miss is answered the same way a bad slug is — a sentence, not a crash.
 */
export default function GarmentCombinationsRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');

  const garment = repo.listGarments().find((g) => g.id === id) ?? null;

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Combinations
        subject={
          garment === null
            ? // No such garment. An entry subject with an unresolvable slug is the screen's
              // existing "not in this corpus" state, and reusing it keeps one miss branch
              // rather than inventing a second that says the same thing.
              { kind: 'entry', slug: '' }
            : {
                kind: 'colour',
                oklch: [garment.color.oklch_l, garment.color.oklch_c, garment.color.oklch_h],
                hex: garment.color.hex,
                // The garment's name if it has one, else its type — and the colour's own name
                // last. Never invented: every one of these is a word somebody typed.
                label: garment.name ?? garment.type,
              }
        }
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
      />
    </>
  );
}
