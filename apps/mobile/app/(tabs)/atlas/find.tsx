import { Stack, useRouter } from 'expo-router';
import { Finder } from '../../../src/screens/Finder';

/**
 * The route. Navigation options and one callback.
 *
 * The screen's content lives in `src/screens/` so it can be rendered — and therefore checked —
 * without mounting a navigator around it.
 */
export default function FindRoute(): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Finder
        onOpenColour={(slug) => {
          router.push(`/atlas/${slug}`);
        }}
      />
    </>
  );
}
