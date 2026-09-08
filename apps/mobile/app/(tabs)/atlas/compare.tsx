import { Stack, useLocalSearchParams } from 'expo-router';
import { Compare } from '../../../src/screens/Compare';

/**
 * The route. Navigation options only.
 *
 * F-019 wrote: *"Compare takes no route parameter … `initialA` / `initialB` exist for a test or
 * a future 'compare with this one' entry point from the colour detail screen."* F-181 is that
 * entry point, so the parameter is read now.
 *
 * **Optional, and absent is a state rather than an error.** Opened from the Atlas there is no
 * colour to carry and both slots start empty; opened from a colour page one is filled. Neither
 * is a special case in the screen, which has taken `initialA` from the start.
 *
 * `string | string[]` for the reason `[slug].tsx` gives: a query parameter can repeat, and
 * taking the first element means a malformed URL reaches the screen as a slug that does not
 * resolve rather than throwing before anything is drawn.
 */
export default function CompareRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ a?: string | string[] }>();
  const a = Array.isArray(params.a) ? params.a[0] : params.a;
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Compare {...(a === undefined || a === '' ? {} : { initialA: a })} />
    </>
  );
}
