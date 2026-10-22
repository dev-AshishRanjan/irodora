import { useCallback, useMemo, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ColourDetail } from '../../../src/screens/ColourDetail';
import { colorFor, entryBySlug } from '../../../src/corpus';
import { useTarget } from '../../../src/target';
import { useBookmarks } from '../../../src/bookmarks';
import { activeProfile } from '../../../src/profile/store';
import { deviceRepository } from '../../../src/store/repository';
import { rankingContext } from '../../../src/wardrobe/coverage';
import { galleryImages } from '../../../src/wardrobe/gallery';

/**
 * The colour detail route: the parameter, the stores, and where each of `06`'s drawn actions goes
 * (ADR-0147 D3). The screen draws `06`'s own app bar, so the platform header is off.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat. Taking the first
 * element rather than asserting a shape means a malformed URL reaches the screen as a slug that
 * does not resolve — which the screen already renders as "not in this corpus version" — instead
 * of throwing before anything is drawn.
 */
export default function ColourDetailRoute(): React.JSX.Element {
  const router = useRouter();
  const { arm } = useTarget();
  const { bookmarked, setBookmarked } = useBookmarks();
  // Typed OPTIONAL, because it is: the router gives no guarantee for a malformed path.
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  // The REAL repository: a screen wired to an in-memory store looks identical until a person
  // closes the app (`screens.test.tsx` asserts it for every route that takes one).
  const repo = deviceRepository();

  /*
   * READ AGAIN WHENEVER THE PAGE COMES BACK INTO VIEW, as Home is (F-242's review, S7): a garment
   * added on the Wardrobe tab, or a profile finished, reaches *Wearable Combinations* the next time
   * this page is shown rather than the next time something else re-renders it.
   */
  const [, setShown] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setShown((n) => n + 1);
    }, []),
  );

  const stored = activeProfile(repo);
  const garments = repo.listGarments();
  // What the ranking turns on: the profile as last written (each read returns a new object).
  const profileKey = stored === null ? 'none' : `${stored.id}:${String(stored.updatedAt)}`;
  const ranking = useMemo(() => rankingContext(stored), [profileKey]);
  const images = useMemo(() => galleryImages(repo), [repo]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ColourDetail
        slug={slug}
        bookmarked={bookmarked.has(slug)}
        onBookmark={(on) => {
          setBookmarked(slug, on);
        }}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/atlas');
        }}
        onShareCard={(s) => {
          router.push(`/atlas/card/${s}`);
        }}
        // THIS colour: bare, the export route exports the latest palette (E-215).
        onExport={(s) => {
          router.push(`/profile/export?slug=${s}`);
        }}
        onWearIt={(s) => {
          router.push(`/atlas/wear/${s}`);
        }}
        /*
          ARMING READS THE CORPUS HERE, not in the screen. The target carries the colour and its
          provenance rather than a slug, so whatever compares against it later does not have to
          resolve one. Then the Lens, which shows 04 while a target is armed (F-200).
        */
        onHoldAsTarget={(s) => {
          const found = entryBySlug(s);
          if (found === null) return;
          arm({
            hex: found.derived.hex,
            oklch: [found.derived.oklch[0], found.derived.oklch[1], found.derived.oklch[2]],
            color: colorFor(found.entry),
            label: `${found.entry.name.kanji} ${found.entry.name.en}`,
            slug: found.entry.slug,
          });
          router.push('/lens');
        }}
        wardrobe={garments}
        photoOf={images.uri}
        ranking={ranking}
        onOpenGarment={(id) => {
          router.push(`/wardrobe/with/${id}`);
        }}
        onScanGarment={() => {
          router.push('/lens');
        }}
        onAddGarment={() => {
          router.push('/wardrobe/add');
        }}
      />
    </>
  );
}
