import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Contemporary } from '../../../../src/screens/Contemporary';

/**
 * The contemporary-equivalents route (F-155, FR-72).
 *
 * **Its own screen, which is criterion 5.** The reporter was explicit that the Lens stays
 * decluttered, so this is a way *out* of it rather than more content on it — and the same route
 * serves the colour page, which is where somebody who is already looking at a colour would ask.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat. Taking the first
 * element rather than asserting a shape means a malformed URL reaches the screen as a slug that
 * does not resolve — which the screen renders as a state — instead of throwing before anything
 * is drawn.
 */
export default function ContemporaryRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Contemporary
        slug={slug}
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
      />
    </>
  );
}
