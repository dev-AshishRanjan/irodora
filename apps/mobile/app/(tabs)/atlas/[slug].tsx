import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ColourDetail } from '../../../src/screens/ColourDetail';
import { colorFor, entryBySlug } from '../../../src/corpus';
import { useTarget } from '../../../src/target';

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
  const router = useRouter();
  const { arm } = useTarget();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <ColourDetail
        slug={slug}
        onOpenCard={(s) => {
          router.push(`/atlas/card/${s}`);
        }}
        // The whole answer, from the one relationship the harmony panel previews (F-194).
        onOpenCombinations={(s) => {
          router.push(`/atlas/with/${s}`);
        }}
        /*
          ARMING READS THE CORPUS HERE, not in the screen. The target carries the colour and its
          provenance rather than a slug, so whatever compares against it later does not have to
          resolve one — and a colour the engine generated can be a target on the same terms.
        */
        onArmTarget={(s) => {
          const found = entryBySlug(s);
          if (found === null) return;
          arm({
            hex: found.derived.hex,
            oklch: [found.derived.oklch[0], found.derived.oklch[1], found.derived.oklch[2]],
            color: colorFor(found.entry),
            label: `${found.entry.name.kanji} ${found.entry.name.en}`,
            slug: found.entry.slug,
          });
        }}
        // Carries the colour, so the comparison opens on it rather than on two empty slots.
        onCompareWith={(s) => {
          router.push(`/atlas/compare?a=${s}`);
        }}
      />
    </>
  );
}
