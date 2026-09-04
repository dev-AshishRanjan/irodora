import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { parseWeightContent } from '@irodora/recommendation';
import { OutfitBuilder } from '../../../src/screens/OutfitBuilder';
import { colorOf } from '../../../src/wardrobe';
import { allEntries } from '../../../src/corpus';
import { ruleSet } from '../../../src/rules';
import { WEIGHTS_TEXT } from '../../../src/rules/generated/weights';
import { activeProfile, toWorking } from '../../../src/profile/store';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route. Navigation options, and the wires the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen because it reaches
 * `expo-sqlite`, which needs a device — a screen importing it could not be rendered by jest,
 * and the screen suite is where the accessibility guarantees are actually checked.
 *
 * ## The reference set and the weights are content, and they are read once
 *
 * `reference` is the published corpus, which every scoring component measures against, and
 * the weights are the published rule set. Both are immutable at a pinned version, so building
 * them per render would be work with a guaranteed identical answer — and the memo is what
 * keeps "the same versions regenerate the same candidates" cheap rather than merely true.
 *
 * ## Without a profile there is nothing to score against
 *
 * `scoreOutfit`'s personal-fit component needs one. A default profile would be a claim about
 * somebody nobody asked, so the route sends them to set one up instead of inventing it.
 */
export default function OutfitRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const stored = activeProfile(repo);

  const context = useMemo(
    () => ({
      profile: stored === null ? null : toWorking(stored),
      rules: ruleSet(),
      weights: parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json'),
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
      {context.profile === null ? null : (
        <OutfitBuilder
          store={repo}
          wardrobe={repo.listGarments()}
          context={{
            profile: context.profile,
            rules: context.rules,
            weights: context.weights,
            reference: context.reference,
          }}
          onAddGarment={() => {
            router.push('/wardrobe/add');
          }}
        />
      )}
    </>
  );
}
