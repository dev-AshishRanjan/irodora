import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { outfitWeights, parseWeightContent } from '@irodora/recommendation';
import { Shopping } from '../../../src/screens/Shopping';
import { colorOf } from '../../../src/wardrobe';
import { allEntries } from '../../../src/corpus';
import { ruleSet } from '../../../src/rules';
import { WEIGHTS_TEXT } from '../../../src/rules/generated/weights';
import { activeProfile, toWorking } from '../../../src/profile/store';
import { engineProfile } from '../../../src/outfit/builder';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the wires the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen, for the reason
 * `app/outfit.tsx` gives: it reaches `expo-sqlite`, which needs a device, and a screen
 * importing it could not be rendered by jest — which is where the accessibility guarantees
 * are actually checked.
 *
 * ## Without a profile there is still a screen, unlike the outfit builder
 *
 * `app/outfit.tsx` renders nothing at all when nobody has set a profile up, because every one
 * of its answers needs one. **Two of this screen's three do not.** A person with no profile can
 * still be told they already own something almost identical, and that is arguably the most
 * useful thing this screen says — so the profile is passed as `null` and `shoppingCheck`
 * returns what it can rather than the route deciding there is nothing to show.
 *
 * ## The reference set and the weights are read once
 *
 * Both are immutable at a pinned version, so building them per render would be work with a
 * guaranteed identical answer. The same memo `app/outfit.tsx` holds, for the same reason.
 */
export default function ShoppingRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const stored = activeProfile(repo);

  const context = useMemo(
    () => ({
      profile: stored === null ? null : engineProfile(toWorking(stored)),
      rules: ruleSet(),
      weights: outfitWeights(parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json')),
      reference: allEntries().map((e) => ({
        id: e.entry.slug,
        color: colorOf({
          id: e.entry.slug,
          created_at: 0,
          updated_at: 0,
          deleted_at: null,
          name: e.entry.name.en,
          xyz_x: e.entry.color.xyz[0],
          xyz_y: e.entry.color.xyz[1],
          xyz_z: e.entry.color.xyz[2],
          lab_l: e.derived.lab[0],
          lab_a: e.derived.lab[1],
          lab_b: e.derived.lab[2],
          oklch_l: e.derived.oklch[0],
          oklch_c: e.derived.oklch[1],
          oklch_h: e.derived.oklch[2],
          hex: e.derived.hex,
          source: 'reference',
          confidence: 1,
          corpus_slug: e.entry.slug,
          capture_illuminant: null,
          capture_quality: null,
          capture_samples: null,
          capture_variance: null,
        }),
      })),
    }),
    [stored],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Shopping
        wardrobe={repo.listGarments()}
        context={context}
        onAddGarment={() => {
          router.push('/wardrobe/add');
        }}
      />
    </>
  );
}
