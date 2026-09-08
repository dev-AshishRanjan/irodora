import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Combinations } from '../../../../src/screens/Combinations';

/**
 * What goes with a colour. Navigation options and the parameter, and nothing else.
 *
 * `/atlas/with/<slug>` reads as what it is: *what goes with this one*. It sits under `atlas`
 * because the colour it is about is a corpus colour — F-197 adds the reading and the garment,
 * and those arrive from elsewhere.
 *
 * `slug` arrives as `string | string[]` for the reason `[slug].tsx` gives: a route parameter can
 * repeat, and taking the first element means a malformed URL reaches the screen as a slug that
 * does not resolve rather than throwing before anything is drawn.
 */
export default function CombinationsRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Combinations
        slug={slug}
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
      />
    </>
  );
}
