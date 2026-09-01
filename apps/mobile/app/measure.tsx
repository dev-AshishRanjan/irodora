import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { Measure, type ReferenceLibrary } from '../src/screens/Measure';
import { allEntries, colorFor, CORPUS_LABEL, entryBySlug } from '../src/corpus';
import { deviceRepository } from '../src/store/repository';
import { deviceLocale } from '../src/i18n/index';

/**
 * The route. Navigation options, and the libraries the screen cannot assemble itself.
 *
 * `deviceRepository()` is imported **here** rather than in the screen, for the reason
 * `app/outfit.tsx` gives: it reaches `expo-sqlite`, which needs a device, and a screen
 * importing it could not be rendered by jest — where the accessibility guarantees are checked.
 *
 * ## The libraries are the corpus and the palettes on this device
 *
 * Two, and no more. An industry library — a fan deck, a printer's set — is **licensed content
 * this product does not have**, and shipping a list under somebody else's name that we made up
 * would be the worst available provenance failure in a product whose argument is provenance.
 *
 * A saved palette is a named subset of the corpus (its members are slugs), so a palette library
 * introduces no colour the bundle does not already publish. That is what keeps every reference
 * on this screen a value somebody can look up.
 *
 * ## How many entries the corpus library offers
 *
 * All of them. This is the professional surface, the person is looking for the specific patch
 * they measured, and truncating the list to keep the screen short would mean the reference they
 * want is the one that is missing.
 */
export default function MeasureRoute(): React.JSX.Element {
  const repo = deviceRepository();
  const locale = deviceLocale();

  const libraries = useMemo((): readonly ReferenceLibrary[] => {
    const corpus: ReferenceLibrary = {
      id: 'corpus',
      // The VERSION, not a translated word: a reference library is only a reference if you can
      // say which edition of it you compared against (FR-10, ADR-0046).
      name: `Irodora ${CORPUS_LABEL}`,
      entries: allEntries().map((e) => ({
        id: e.entry.slug,
        name: e.entry.name.en,
        color: colorFor(e.entry),
      })),
    };

    const palettes = repo.listPalettes().map((palette): ReferenceLibrary => {
      const entries = palette.members
        // `member.slug` rather than `member.color.corpus_slug`: the store already refused a
        // member whose column was null rather than defaulting it, so this is the resolved value.
        .map((member) => entryBySlug(member.slug))
        .filter((found): found is NonNullable<typeof found> => found !== null)
        .map((found) => ({
          id: `${palette.id}:${found.entry.slug}`,
          name: found.entry.name.en,
          color: colorFor(found.entry),
        }));
      // A palette carries both names. Picking one here rather than in the screen keeps
      // `ReferenceLibrary.name` a plain value — it is a title somebody typed, not copy.
      return { id: palette.id, name: locale === 'ja' ? palette.nameJa : palette.nameEn, entries };
    });

    // A palette whose members are all gone from this corpus version contributes no reference,
    // and an empty library on screen reads as a bug rather than as an empty palette.
    return [corpus, ...palettes.filter((l) => l.entries.length > 0)];
  }, [locale, repo]);

  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Measure libraries={libraries} />
    </>
  );
}
