import { Stack, useRouter } from 'expo-router';
import { Atlas } from '../../src/screens/Atlas';

/**
 * The route. Navigation options and the one navigation callback, and nothing else.
 *
 * The screen's content lives in `src/screens/Atlas.tsx` so it can be rendered — and therefore
 * checked — without mounting a navigator around it. `Stack.Screen` throws *"Couldn't find a
 * route object"* outside a navigator, so a screen that set its own options could only be tested
 * with expo-router wrapped around it, and the conformance suite would then be testing the
 * router.
 */
export default function AtlasRoute(): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Atlas
        onSelect={(slug) => {
          router.push(`/atlas/${slug}`);
        }}
      />
    </>
  );
}
