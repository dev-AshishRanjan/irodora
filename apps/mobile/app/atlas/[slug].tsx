import { Stack, useLocalSearchParams } from 'expo-router';
import { ColourDetail } from '../../src/screens/ColourDetail';

/**
 * The colour detail route. Navigation options and the parameter, and nothing else.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat. Taking the first
 * element rather than asserting a shape means a malformed URL reaches the screen as a slug that
 * does not resolve — which the screen already renders as "not in this corpus version" — instead
 * of throwing before anything is drawn.
 */
export default function ColourDetailRoute(): React.JSX.Element {
  // Typed OPTIONAL, because it is. The non-optional form type-checks and then makes the
  // `?? ''` below an "unnecessary condition" — the lint reporting, correctly, that the type
  // was claiming a guarantee the router does not give for a malformed path.
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <ColourDetail slug={slug} />
    </>
  );
}
