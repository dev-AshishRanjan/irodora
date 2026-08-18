/**
 * Editorial harmonies — curated corpus palettes, kept distinct from geometric ones.
 *
 * ## Why they are a separate family at all
 *
 * A geometric harmony is computable: anyone with the same maths gets the same answer, and it
 * carries no claim about anybody's judgement. An editorial harmony is **a curated relationship
 * from the corpus**, and it is valuable *precisely because it is not derivable from geometry*.
 *
 * That difference is exactly why it must carry attribution. An editorial harmony presented
 * without its source is our own curation offered as if it were a fact about colour — the
 * dishonesty [ADR-0007](../../../docs/adr/0007-colour-corpus-provenance-and-licensing.md)
 * exists to prevent, pointed at harmonies instead of at colours. So `provenance` is **required**
 * here and **forbidden** on a geometric result, and both directions are enforced.
 *
 * ## A correction to this feature's plan
 *
 * The plan said "an editorial harmony still stands in some relationship". That is not true in
 * general: a curator assembling Quiet Neutrals is not obliged to have picked a triad, and
 * labelling it as one afterwards would be inventing a geometric claim the curator never made.
 *
 * So `kind` is `null` for editorial harmonies. Family and kind remain separate axes — which was
 * the right call — but the correct reading is that an editorial harmony has **no geometric
 * kind**, not that it secretly has one we should guess.
 *
 * ## No dependency on `@irodora/corpus`
 *
 * `EditorialSource` describes the published bundle structurally, for the same reason
 * `@irodora/color-naming` does: `@irodora/color-core` is the facade and already depends on this
 * package, so `harmony → corpus → color-core → harmony` is a cycle. The compatibility guard
 * lives in `packages/corpus`, where the schema is owned.
 */

import {
  gamutMapDetail,
  oklchToXyz,
  srgbToXyz,
  xyzToOklch,
  type Triple,
} from '@irodora/color-spaces';
import { HarmonyError } from './errors.js';
import type { Harmony, HarmonyColor } from './generate.js';
import type { Oklch } from './geometry.js';

/**
 * The shape of a published corpus bundle this reads.
 *
 * A palette names colour **slugs**; the OKLCh comes from the entries. Both halves are needed, so
 * an editorial harmony cannot be built from palettes alone.
 */
export interface EditorialSource {
  readonly label: string;
  readonly entries: readonly {
    readonly entry: { readonly slug: string };
    readonly derived: { readonly oklch: Triple };
  }[];
  readonly palettes: readonly {
    readonly palette: {
      readonly slug: string;
      readonly colors: readonly { readonly slug: string; readonly rank: number }[];
    };
  }[];
}

/** Map an OKLCh into sRGB, recording nothing that was not asked for. */
function land(requested: Oklch): HarmonyColor {
  const requestedXyz = oklchToXyz(requested);
  const mapping = gamutMapDetail(requestedXyz, 'srgb');
  const shownXyz = srgbToXyz(mapping.rgb);
  return {
    oklch: xyzToOklch(shownXyz),
    xyz: shownXyz,
    requested,
    wasGamutMapped: !mapping.wasInGamut,
    gamutDeltaE00: 0,
  };
}

/**
 * Turn every palette in a published bundle into an editorial harmony.
 *
 * Colours are ordered by the palette's `rank`, because rank is the curator's stated order and
 * re-sorting it would discard the judgement that makes the palette editorial in the first place.
 *
 * A palette naming a slug the bundle does not contain **throws**. The corpus `content` gate
 * already rejects that (a relation pointing at a missing slug), so reaching it here means the
 * bundle was assembled by something other than the publisher — and silently dropping the colour
 * would produce a harmony that is missing a member with no indication.
 */
export function editorialHarmoniesFrom(source: EditorialSource): readonly Harmony[] {
  if (source.label.length === 0)
    throw new HarmonyError('editorialHarmoniesFrom', 'the bundle has no version label');

  const oklchBySlug = new Map(source.entries.map((e) => [e.entry.slug, e.derived.oklch]));

  return source.palettes.map(({ palette }) => {
    const ordered = [...palette.colors].sort((a, b) => a.rank - b.rank);

    const colors = ordered.map((member) => {
      const oklch = oklchBySlug.get(member.slug);
      if (oklch === undefined)
        throw new HarmonyError(
          'editorialHarmoniesFrom',
          `palette "${palette.slug}" names colour "${member.slug}", which is not in bundle ` +
            `"${source.label}". Dropping it would return a harmony missing a member with ` +
            'nothing to say so.',
        );
      return land(oklch);
    });

    if (colors.length === 0)
      throw new HarmonyError('editorialHarmoniesFrom', `palette "${palette.slug}" has no colours`);

    return {
      family: 'editorial',
      // No geometric kind. A curator is not obliged to have picked a triad, and labelling one
      // afterwards would invent a claim they never made.
      kind: null,
      source: colors[0]?.oklch ?? [0, 0, 0],
      colors,
      provenance: { paletteSlug: palette.slug, corpusVersion: source.label },
    };
  });
}
