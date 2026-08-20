import { Stack } from 'expo-router';
import { Home } from '../src/screens/Home.js';

/**
 * The route. Navigation options only.
 *
 * The screen's content is `src/screens/Home.tsx` so it can be rendered — and therefore
 * checked — without mounting a navigator around it.
 */
export default function Index(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Home />
    </>
  );
}
