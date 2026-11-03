import { useCallback, useMemo, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLOURS_SEPARATOR } from '../../../src/export/subject';
import { offerCombination } from '../../../src/outfit/fromWear';
import { draftFromStored, draftOf } from '../../../src/palette';
import { activeProfile } from '../../../src/profile/store';
import { PaletteBuilder } from '../../../src/screens/PaletteBuilder';
import { PaletteStudio } from '../../../src/screens/PaletteStudio';
import { deviceRepository } from '../../../src/store/repository';

/**
 * The route: `10` and its draft state `16` (F-251, ADR-0165 D1). One route, by its parameters:
 *
 * - `/atlas/palettes` — `10`, *Curated Systems*; `?view=custom` — *My Custom Palettes*;
 * - `?draft=new` — `16`, an empty draft; `?draft=‹stored id›` — `16`, editing that palette;
 * - `?colours=a,b` — `16` with `08`'s pair, A locked in slot 1 (E-227).
 *
 * `deviceRepository()` is imported **here** rather than in the screens because it reaches
 * `expo-sqlite`, which needs a device — a screen that imported it could not be rendered by jest, and
 * the screen suite is where the accessibility guarantees are checked. `screens.test.tsx` asserts this
 * file passes the real repository to both; neither is a substitute for the device attestation.
 *
 * A parameter is never trusted to name something: a slug the corpus does not hold, or an id the
 * device does not, opens an empty draft rather than another palette.
 *
 * 16 is pushed over 10, so its Back and *Create & Save* GO BACK to the catalogue beneath rather than
 * navigate to this route again — which reuses the screen on top and leaves a second, stale catalogue
 * under it (F-251's review, S1). The catalogue reads the store again each time it comes into view;
 * a palette just saved is listed, under My Custom Palettes. Opened on a draft with nothing beneath
 * (a deep link), the builder replaces itself with the catalogue instead.
 */
export default function PalettesRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    colours?: string | string[];
    draft?: string | string[];
    view?: string | string[];
  }>();
  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const colours = first(params.colours);
  const draft = first(params.draft);
  const view = first(params.view) === 'custom' ? 'custom' : 'curated';
  const repo = deviceRepository();
  const editing = useMemo(
    () =>
      draft === undefined || draft === 'new'
        ? undefined
        : repo.listPalettes().find((p) => p.id === draft),
    [draft, repo],
  );
  const initialDraft = useMemo(() => {
    if (colours !== undefined) return draftOf(colours.split(COLOURS_SEPARATOR));
    return editing === undefined ? null : draftFromStored(editing);
  }, [colours, editing]);
  const building = colours !== undefined || draft !== undefined;

  // Read again whenever the catalogue comes back into view (S1), as the colour page and Home are.
  const [shown, setShown] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setShown((n) => n + 1);
    }, []),
  );
  const toCatalogue = (view: 'curated' | 'custom'): void => {
    if (router.canGoBack()) router.back();
    else router.replace(view === 'custom' ? '/atlas/palettes?view=custom' : '/atlas/palettes');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {building ? (
        <PaletteBuilder
          store={repo}
          {...(initialDraft === null ? {} : { initialDraft })}
          {...(editing === undefined || initialDraft === null ? {} : { editingId: editing.id })}
          onBack={() => {
            toCatalogue('curated');
          }}
          onSaved={() => {
            toCatalogue('custom');
          }}
        />
      ) : (
        <PaletteStudio
          store={repo}
          initialView={view}
          revision={shown}
          hasProfile={activeProfile(repo) !== null}
          onBack={() => {
            router.navigate('/atlas');
          }}
          onCreate={() => {
            router.push('/atlas/palettes?draft=new');
          }}
          onApply={(combination) => {
            offerCombination(combination);
            router.push('/wardrobe/outfit');
          }}
          onExport={(href) => {
            router.push(href);
          }}
          onEdit={(id) => {
            router.push(`/atlas/palettes?draft=${encodeURIComponent(id)}`);
          }}
        />
      )}
    </>
  );
}
