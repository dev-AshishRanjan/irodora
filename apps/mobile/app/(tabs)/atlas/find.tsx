import { Stack, useRouter } from 'expo-router';
import { Finder } from '../../../src/screens/Finder';

/**
 * The route. Navigation options and the callbacks.
 *
 * The screen draws `09`'s own app bar (F-250, F-234's chrome), so the stack's header is hidden. Back
 * NAVIGATES to the Atlas rather than popping: a deep link opens the Finder with nothing beneath it.
 */
export default function FindRoute(): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Finder
        onBack={() => {
          router.navigate('/atlas');
        }}
        onOpenColour={(slug) => {
          router.push(`/atlas/${slug}`);
        }}
      />
    </>
  );
}
