import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { outfitWeights, parseWeightContent } from '@irodora/recommendation';
import { coverage, gaps, type CoverageGarment } from '@irodora/optimization';
import { Wardrobe } from '../../../src/screens/Wardrobe';
import { deviceRepository } from '../../../src/store/repository';
import { referenceSet } from '../../../src/wardrobe/reference';
import { colorOf } from '../../../src/wardrobe';
import { slotFor } from '../../../src/outfit/builder';
import { ruleSet } from '../../../src/rules';
import { WEIGHTS_TEXT } from '../../../src/rules/generated/weights';
import { activeProfile, toWorking } from '../../../src/profile/store';
import { engineProfile } from '../../../src/outfit/builder';
import { lexicon } from '../../../src/finder';

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

  /*
   * COVERAGE AND GAPS ARE ASSEMBLED HERE, NOT IN THE SCREEN (F-150 criterion 3).
   *
   * `coverage()` needs a profile, a reference set, the rule set and the weights. A gallery has
   * no business gathering four things to draw a bar chart — and a screen that did could not be
   * rendered by the conformance suite, which is the same reason `deviceRepository()` is
   * imported here rather than there.
   *
   * `shopping.tsx` assembles the same context, and `referenceSet()` is now shared between them
   * rather than written out twice: it is twenty fields per corpus entry, most of them the nulls
   * that say "this is a published reference, not something we measured".
   *
   * WITHOUT A PROFILE THERE IS NOTHING TO COUNT AGAINST, and the screen omits the section rather
   * than drawing it empty. That is a real state — a wardrobe is useful before anybody has
   * answered a single trial — not a loading condition.
   */
  const analysis = useMemo(() => {
    if (stored === null) return { coverage: undefined, gaps: undefined };

    const placeable = repo
      .listGarments()
      .map((g): CoverageGarment | null => {
        const slot = slotFor(g);
        return slot === null ? null : { id: g.id, slot, color: colorOf(g.color) };
      })
      .filter((g): g is CoverageGarment => g !== null);

    const context = {
      profile: engineProfile(toWorking(stored)),
      rules: ruleSet(),
      weights: outfitWeights(parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json')),
      reference: referenceSet(),
    };

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
      />
    </>
  );
}
