import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { coverage } from '@irodora/optimization';
import { Home } from '../../src/screens/Home';
import { activeProfile } from '../../src/profile/store';
import { deviceRepository } from '../../src/store/repository';
import { coverageContext, placeableGarments } from '../../src/wardrobe/coverage';

/**
 * The route. The wires the screen cannot make itself, and nothing else.
 *
 * ## Three ways out, each one `01` draws
 *
 * *What Goes With This →* opens the day's colour's combinations; a wardrobe tile opens that
 * garment's; 27's *Scan First Garment*, on an empty wardrobe, opens the Lens. Home pushes no
 * reading route any more: `01` draws no reading (ADR-0138), so `/atlas/with/reading/[id]` waits for
 * `03`'s *Wear It* (F-244) and is declared unreachable until then.
 *
 * `Stack.Screen` is absent: this route is inside the tab group, and the tab layout owns the chrome.
 */
export default function Index(): React.JSX.Element {
  const router = useRouter();
  // The REAL repository, not a fake. `screens.test.tsx` asserts this for every route that takes
  // one, because a screen wired to an in-memory store looks identical until a person closes the app.
  const repo = deviceRepository();

  /*
   * READ AGAIN WHENEVER HOME COMES BACK INTO VIEW (F-242's review, S7). A tab stays mounted, and
   * React Navigation holds a screen still until something it reads changes, so a garment added on
   * the Wardrobe tab would not reach Home's preview or its count until something else re-rendered
   * it. Focus is that something: each time Home is shown, it renders, and the store is read.
   */
  const [, setShown] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setShown((n) => n + 1);
    }, []),
  );

  const stored = activeProfile(repo);
  /*
   * THE COUNT PILL'S VALID OUTFITS (ADR-0138 D6), from the one context the Wardrobe's dial uses
   * (E-208), so `01`'s pill and `11`'s dial cannot disagree. Without a profile there is nothing to
   * count against, and the pill says the garment count alone.
   */
  const garments = repo.listGarments();
  // What the count turns on: the profile as it was last written, and each garment as it was last
  // written. Each read returns new objects, so the keys are what say something changed (M7).
  const profileKey = stored === null ? 'none' : `${stored.id}:${String(stored.updatedAt)}`;
  const wardrobeKey = garments.map((g) => `${g.id}:${String(g.updatedAt)}`).join(',');
  const counted = useMemo(() => {
    const context = coverageContext(stored);
    return context === undefined ? undefined : coverage(placeableGarments(garments), context);
    // `stored` and `garments` are read again on every render; the two keys say they changed.
  }, [profileKey, wardrobeKey]);

  return (
    <Home
      store={repo}
      coverage={counted}
      onOpenCombinations={(slug) => {
        router.push(`/atlas/with/${slug}`);
      }}
      onOpenGarment={(id) => {
        router.push(`/wardrobe/with/${id}`);
      }}
      onOpenLens={() => {
        router.push('/lens');
      }}
    />
  );
}
