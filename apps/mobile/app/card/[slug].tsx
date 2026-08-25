import { Stack, useLocalSearchParams } from 'expo-router';
import { ColourCard } from '../../src/screens/ColourCard';

/**
 * The colour card route. Navigation options and the parameter, and nothing else.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat — the same shape
 * and the same reasoning as `app/atlas/[slug].tsx`: a malformed path reaches the screen as a
 * slug that does not resolve, which it already renders as "not in this corpus version".
 */
export default function ColourCardRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <ColourCard slug={slug} />
    </>
  );
}
