import { useCallback } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { GoesWith } from '../../../../src/screens/GoesWith';
import { buildHref, wearHref } from '../../../../src/goes-with';

/**
 * What goes with a colour — `19` (F-252, ADR-0171). Navigation options and the parameter.
 *
 * `/atlas/with/<slug>` reads as what it is: *what goes with this one*. It sits under `atlas` because
 * the colour it is about is a corpus colour.
 *
 * - **The screen draws its own app bar** (`19.header`), so the stack's header is off, as 06's and
 *   07's are.
 * - **It reads no profile and no store**: 19 lists nothing a person writes, and orders nothing by a
 *   person (ADR-0168 D6), so nothing is re-read on focus.
 * - **Back** goes to the Atlas with `navigate`, as 06 and 09 do (ADR-0147's amendment): it returns
 *   where the Atlas is in the stack and opens it where it is not (Home and the Lens push this route).
 * - **Wear** opens 07 with the anchor as the top and the row in the trousers; **Build** opens 07 for
 *   the anchor (ADR-0171 D3, D4).
 *
 * `slug` arrives as `string | string[]` for the reason `[slug].tsx` gives: a route parameter can
 * repeat, and taking the first element means a malformed URL reaches the screen as a slug that does
 * not resolve rather than throwing before anything is drawn.
 */
export default function GoesWithRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  const onBack = useCallback(() => {
    router.navigate('/atlas');
  }, [router]);
  const onWear = useCallback(
    (row: string) => {
      router.push(wearHref(slug, row));
    },
    [router, slug],
  );
  const onBuild = useCallback(() => {
    router.push(buildHref(slug));
  }, [router, slug]);
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GoesWith slug={slug} onBack={onBack} onWear={onWear} onBuild={onBuild} />
    </>
  );
}
