import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Combinations } from '../../../../src/screens/Combinations';
import { activeProfile, toWorking } from '../../../../src/profile/store';
import { engineProfile } from '../../../../src/outfit/builder';
import { deviceRepository } from '../../../../src/store/repository';
import { ruleSet } from '../../../../src/rules';
import { useTarget } from '../../../../src/target';
import { displayFromOklch } from '../../../../src/engine';

/**
 * What goes with a colour. Navigation options and the parameter, and nothing else.
 *
 * `/atlas/with/<slug>` reads as what it is: *what goes with this one*. It sits under `atlas`
 * because the colour it is about is a corpus colour — F-197 adds the reading and the garment,
 * and those arrive from elsewhere.
 *
 * `slug` arrives as `string | string[]` for the reason `[slug].tsx` gives: a route parameter can
 * repeat, and taking the first element means a malformed URL reaches the screen as a slug that
 * does not resolve rather than throwing before anything is drawn.
 */
export default function CombinationsRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const { arm } = useTarget();
  const stored = activeProfile(repo);
  // Narrowed once per stored profile: `engineProfile` is a pure narrowing of an immutable row.
  const profile = useMemo(
    () => (stored === null ? null : engineProfile(toWorking(stored))),
    [stored],
  );
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Combinations
        subject={{ kind: 'entry', slug }}
        // F-198: the ranking is weighted where there is somebody to weight it by.
        profile={profile}
        rules={ruleSet()}
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
        // The other question: a slot, and a ranking for the rest (F-195).
        /*
          A GENERATED COLOUR CAN BE A TARGET, and it carries no slug because it has none. The
          Color comes from `displayFromOklch` — the same helper the swatch was drawn with — so
          the target's provenance is the one the engine actually produced.
        */
        onArmCompanion={(colour) => {
          const shown = displayFromOklch([colour.oklch[0], colour.oklch[1], colour.oklch[2]]);
          arm({
            hex: shown.hex,
            oklch: colour.oklch,
            color: shown.color,
            // Named by its value, because it has no other name — the rule this screen already
            // follows for every generated companion.
            label: shown.hex,
            slug: null,
          });
        }}
        onWearIt={(s) => {
          router.push(`/atlas/wear/${s}`);
        }}
      />
    </>
  );
}
