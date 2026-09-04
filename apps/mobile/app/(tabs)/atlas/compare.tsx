import { Stack } from 'expo-router';
import { Compare } from '../../../src/screens/Compare';

/**
 * The route. Navigation options only.
 *
 * Compare takes no route parameter: both slots are chosen on the screen, so there is no
 * navigation state to carry. `initialA` / `initialB` exist for a test or a future "compare with
 * this one" entry point from the colour detail screen — which would be a navigation flow, and
 * is not in F-019's acceptance list.
 */
export default function CompareRoute(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Compare />
    </>
  );
}
