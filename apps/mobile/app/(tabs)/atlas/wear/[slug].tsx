import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Wear } from '../../../../src/screens/Wear';
import { activeProfile, toWorking } from '../../../../src/profile/store';
import { engineProfile, wordForSlot } from '../../../../src/outfit/builder';
import { offerCombination } from '../../../../src/outfit/fromWear';
import { offerCorpusColour } from '../../../../src/lens/handoff';
import { entryBySlug } from '../../../../src/corpus';
import { COLOURS_SEPARATOR } from '../../../../src/export/subject';
import { deviceRepository } from '../../../../src/store/repository';
import { startWith } from '../../../../src/wear';

/**
 * Wear It (`07`). Navigation options, and the wires the screen cannot make itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen, for the reason
 * `wardrobe/shopping.tsx` gives: it reaches `expo-sqlite`, which needs a device, and a screen
 * importing it could not be rendered by jest — which is where the accessibility guarantees are
 * actually checked.
 *
 * ## The screen draws its own app bar
 *
 * `07` draws the back word, a rule and the page's name in one bar (F-248, ADR-0153 D4), so the
 * stack's header is off, as the colour page's is.
 *
 * ## Without a profile there is still a page
 *
 * Half of its answer does not need one: how colours sit together is figured from the colours, and
 * only *does it suit you* requires a person. So the profile is passed as `null`, the screen draws what
 * it can, and the save to the Lab — which draws nothing without one — says why it cannot be used.
 *
 * `slug` arrives as `string | string[]` because a route parameter can repeat. Taking the first
 * element means a malformed URL reaches the screen as a slug that does not resolve — which the
 * screen renders as a sentence — rather than throwing before anything is drawn.
 */
export default function WearRoute(): React.JSX.Element {
  const router = useRouter();
  const repo = deviceRepository();
  const stored = activeProfile(repo);
  const params = useLocalSearchParams<{ slug?: string | string[]; with?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? (params.slug[0] ?? '') : (params.slug ?? '');
  /*
    FROM A ROW OF 19 (F-252, ADR-0171 D3): `with` puts that row's colour in the trousers, locked, the
    anchor as the top. An unknown slug, or the anchor's own, is ignored and 07 opens as drawn.
  */
  const withSlug = Array.isArray(params.with) ? params.with[0] : params.with;
  const initial = useMemo(() => startWith(withSlug, slug), [withSlug, slug]);

  // Narrowed once per stored profile rather than per render: `engineProfile` is a pure narrowing
  // of an immutable row, so repeating it would be work with an identical answer.
  const profile = useMemo(
    () => (stored === null ? null : engineProfile(toWorking(stored))),
    [stored],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Wear
        slug={slug}
        profile={profile}
        {...(initial === undefined ? {} : { initial })}
        /*
          BACK TO THE COLOUR (ADR-0152 D6), or to the Atlas for a colour this corpus does not hold —
          there is no colour page to go back to. `navigate`, so a colour opened from here and backed
          out of does not stack a second copy of the page.
        */
        onBack={() => {
          router.navigate(entryBySlug(slug) === null ? '/atlas' : `/atlas/${slug}`);
        }}
        /*
          AN OFFER, NOT A WRITE (ADR-0152 D5). The combination is left in the mailbox and the Lab
          opens with the nearest owned garment in each slot; nothing is stored until its own save.
        */
        onSaveToLab={(combination) => {
          offerCombination(combination);
          router.push('/wardrobe/outfit');
        }}
        onExport={(colours) => {
          router.push(`/profile/export?colours=${colours.join(COLOURS_SEPARATOR)}`);
        }}
        onOpenColour={(s) => {
          router.push(`/atlas/${s}`);
        }}
        /*
          THE SLOT TRAVELS AS A TYPE WORD, because that is what the shopping check takes.
          `wordForSlot` is the inverse of `slotFor`, and the round trip is asserted — a word the
          check cannot map back would drop the slot silently.
        */
        onShopFor={(s, slot) => {
          router.push(`/wardrobe/shopping?slug=${s}&type=${wordForSlot(slot)}`);
        }}
        /*
          AN OFFER, NOT A WRITE. The colour is left in the mailbox and `AddGarment` proposes it;
          nothing reaches the database until the person saves.
        */
        onAddToWardrobe={(s) => {
          offerCorpusColour(s, 'wardrobe');
          router.push('/wardrobe/add');
        }}
      />
    </>
  );
}
