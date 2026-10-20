import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { coverage, gaps } from '@irodora/optimization';
import { Wardrobe } from '../../../src/screens/Wardrobe';
import { deviceRepository } from '../../../src/store/repository';
import { coverageContext, placeableGarments } from '../../../src/wardrobe/coverage';
import { activeProfile } from '../../../src/profile/store';
import { lexicon } from '../../../src/finder';
import { useLookbook } from '../../../src/lookbook';

/**
 * The route. Navigation options, and the one wire the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen because it reaches a
 * device — `expo-sqlite` — and a screen importing it could not be rendered by jest, which is
 * where the accessibility guarantees are actually checked. The seam is proven from both ends:
 * `typecheck` says `Repository` satisfies `BrowseStore`, and the screen suite drives both
 * branches through a fake.
 *
 * `/wardrobe` rather than `/wardrobe/browse`: this is what the segment is *for*, and `add.tsx`
 * sits beside it as the thing you do to a wardrobe rather than a peer of it.
 */
/*
 * THE ROUTE MAKES THE WIRE, NOT THE SCREEN (F-139).
 *
 * A screen that called `router.push` itself could not be rendered by the conformance suite —
 * `useRouter` needs a navigator around it — and that suite is where the accessibility and
 * contrast guarantees are actually checked. So the screen takes a callback and this supplies
 * it, which is the convention `app/index.tsx` already uses for ten destinations.
 */
export default function WardrobeRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const stored = activeProfile(repo);
  // The saved outfits, read back under the Lookbook choice (F-238, ADR-0136).
  const lookbook = useLookbook();

  /*
   * COVERAGE AND GAPS ARE ASSEMBLED HERE, NOT IN THE SCREEN (F-150 criterion 3).
   *
   * `coverage()` needs a profile, a reference set, the rule set and the weights. A gallery has
   * no business gathering four things to draw a bar chart — and a screen that did could not be
   * rendered by the conformance suite, which is the same reason `deviceRepository()` is
   * imported here rather than there.
   *
   * The context itself is assembled once, in `src/wardrobe/coverage.ts`, for this dial and Home's
   * count pill (F-242, E-208), so the two cannot disagree. `shopping.tsx` still assembles its own,
   * sharing the one reference set: twenty fields per corpus entry, most of them the nulls that say
   * "this is a published reference, not something we measured".
   *
   * WITHOUT A PROFILE THERE IS NOTHING TO COUNT AGAINST, and the screen omits the section rather
   * than drawing it empty. That is a real state — a wardrobe is useful before anybody has
   * answered a single trial — not a loading condition.
   */
  const analysis = useMemo(() => {
    // One context for this dial and Home's count pill (F-242, E-208): src/wardrobe/coverage.ts.
    const context = coverageContext(stored);
    if (context === undefined) return { coverage: undefined, gaps: undefined };

    const placeable = placeableGarments(repo.listGarments());

    return {
      coverage: coverage(placeable, context),
      gaps: gaps(placeable, lexicon().terms, context),
    };
    // `repo` is a handle to the same database on every render, so it is not a dependency; what
    // the analysis actually turns on is the profile, and `stored` is that. There is no
    // exhaustive-deps rule configured here to disable — the list is honest rather than silenced.
  }, [stored]);

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Wardrobe
        store={repo}
        coverage={analysis.coverage}
        gaps={analysis.gaps}
        onAddGarment={() => {
          router.push('/wardrobe/add');
        }}
        onScan={() => {
          router.push('/lens');
        }}
        // What to DO with a wardrobe (F-182). Both were finished screens on routes nothing
        // navigated to, so the tab could fill up and never be used.
        // F-197: the garment's own colour, asked about by id.
        onOpenCombinations={(garmentId) => {
          router.push(`/wardrobe/with/${garmentId}`);
        }}
        onOpenOutfit={() => {
          router.push('/wardrobe/outfit');
        }}
        onOpenShopping={() => {
          router.push('/wardrobe/shopping');
        }}
        lookbook={{ outfits: lookbook.outfits, onRemove: lookbook.remove }}
      />
    </>
  );
}
