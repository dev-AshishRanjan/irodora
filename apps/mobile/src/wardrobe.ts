/**
 * The wardrobe, from the screen's side (FR-40, F-043).
 *
 * ## What is here and what is deliberately not
 *
 * The screen decides nothing about whether a garment can be saved — `draftProblem` does, and
 * it is one function so jest can exercise every branch without rendering anything. This is
 * `palette.ts`'s shape for the same reason: a rule stated in a component is a rule nobody can
 * test at the granularity it fails at.
 *
 * What is **not** here is any colour arithmetic. A reading becomes stored values through
 * `readingOklch` and the engine's own conversions, and a corpus entry contributes the values
 * **as published** — nothing recomputes one, because a value re-derived at save time is
 * today's engine's answer for a version that was pinned on purpose (FR-10, E-001).
 *
 * ## Two required fields, and the type is what holds the line
 *
 * FR-40: *"never more than two required fields"*. `@irodora/store`'s `NewGarment` has exactly
 * three properties — id, type, colour — and the id is generated, so a caller supplies two.
 * That is the enforcement; `draftProblem` only picks which sentence to show while one is
 * missing. A screen cannot add a third requirement without adding a field to a type that
 * `store` owns and F-042's `ts-expect-error` guards.
 */

import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import type {
  GarmentEnrichment,
  NewGarment,
  NewSavedColor,
  SanitisedImage,
  StoredGarment,
} from '@irodora/store';
import { CORPUS_LABEL, entryBySlug } from './corpus';
import { displayFromOklch } from './engine';
import type { LensReading } from './lens/reading';
import { readingOklch } from './profile/photo';

/**
 * What the add-garment screen is allowed to do to the database.
 *
 * Narrow on purpose, and it is the rule `palette.ts` states: this module and the screens must
 * be renderable by jest, and `expo-sqlite` needs a device. The route supplies the real
 * repository; a test supplies a fake. A screen taking `Repository` could not be rendered at
 * all, and the screen suite is where NFR-8 and NFR-9 are actually checked.
 */
export interface WardrobeStore {
  createGarment(garment: NewGarment, now: number): void;
  enrichGarment(id: string, patch: GarmentEnrichment, now: number): void;
  putGarmentImage(garmentId: string, image: SanitisedImage, now: number): void;
  listGarments(): readonly StoredGarment[];
}

/** Where a draft's colour came from. The four paths of FR-40 reduce to two colour origins. */
export type ColourOrigin =
  | { readonly kind: 'corpus'; readonly slug: string }
  | { readonly kind: 'reading'; readonly reading: LensReading };

/**
 * A garment being added.
 *
 * `image` is separate from `colour` because they are independent: a photograph does not
 * determine the colour (the Lens does that, or the person does), and a colour does not need a
 * photograph. Conflating them would make "add a jumper by name" impossible without a camera.
 */
export interface GarmentDraft {
  readonly type: string;
  readonly colour: ColourOrigin | null;
  readonly image: SanitisedImage | null;
  /** Everything progressive. Never blocks a save — that is the whole of criterion 3. */
  readonly enrichment: GarmentEnrichment;
}

export const EMPTY_DRAFT: GarmentDraft = {
  type: '',
  colour: null,
  image: null,
  enrichment: {},
};

export type DraftProblem = 'noColour' | 'noType' | 'unknownSlug';

/**
 * Why this draft cannot be saved — or `null` if it can.
 *
 * **Exactly two things can block a save, and a third would be a defect.** That is FR-40's
 * *"never more than two required fields"* expressed as the only reachable return values, which
 * is why `unknownSlug` is separate rather than folded into `noColour`: a draft holding a slug
 * the bundle no longer publishes is not a person who forgot to choose, and telling them to
 * choose a colour when they already did would be the worst available message.
 *
 * A disabled control with no stated reason is the accessibility failure that looks like polish
 * — so this returns something to say rather than a boolean.
 */
export function draftProblem(draft: GarmentDraft): DraftProblem | null {
  if (draft.type.trim() === '') return 'noType';
  if (draft.colour === null) return 'noColour';
  if (draft.colour.kind === 'corpus' && entryBySlug(draft.colour.slug) === null)
    return 'unknownSlug';
  return null;
}

/**
 * A corpus entry as a stored colour, **as published**.
 *
 * Every value comes off the bundle. Nothing here recomputes one: re-deriving `lab` at save
 * time would record today's engine's answer against a version that was pinned precisely so
 * that could not happen.
 */
function colourFromCorpus(slug: string, id: string): NewSavedColor {
  const found = entryBySlug(slug);
  if (found === null)
    throw new Error(
      `"${slug}" is not in corpus version ${CORPUS_LABEL}. A draft may only hold published ` +
        'entries, so this means the bundle changed under a draft in progress.',
    );
  return {
    id,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    // A published entry is a reference value with a recorded origin (ADR-0005).
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
  };
}

/**
 * A Lens reading as a stored colour.
 *
 * **`source: 'estimated'` and the reading's own confidence, never 1.** ADR-0005 makes
 * provenance part of the value, and a camera estimate recorded as a reference would be the
 * back door into the type — the row would be indistinguishable from a published colour by
 * everything downstream, including anything that later decided what it was safe to claim.
 *
 * `corpus_slug` is `null` and always will be: a capture is not an entry, and F-042's colour
 * reuse keys on the slug precisely so two captures of the same jumper stay two measurements.
 */
function colourFromReading(reading: LensReading, id: string): NewSavedColor {
  const oklch = readingOklch(reading);
  const display = displayFromOklch(oklch);
  // Back to XYZ through the engine, so Lab and the hex are the engine's answers rather than
  // this file's. Importing the conversion is E-008's rule; the alternative is arithmetic here
  // that no cross-platform test would ever compare.
  const xyz = oklchToXyz(oklch);
  const lab = xyzToLab(xyz);
  return {
    id,
    // THE HEX, NOT THE NEAREST CORPUS NAME. Naming a capture after the entry it lands closest
    // to would be an assertion of identity, which is exactly what FR-13 forbids and what the
    // claims lint bans phrases for — "this is Kon" is a claim no camera can support. A hex is
    // a fact about the value. The person names the GARMENT if they want a name, which is a
    // different field on a different row.
    name: display.hex,
    xyz_x: xyz[0],
    xyz_y: xyz[1],
    xyz_z: xyz[2],
    lab_l: lab[0],
    lab_a: lab[1],
    lab_b: lab[2],
    oklch_l: oklch[0],
    oklch_c: oklch[1],
    oklch_h: oklch[2],
    hex: display.hex,
    source: 'estimated',
    confidence: reading.confidence,
    corpus_slug: null,
  };
}

/**
 * The draft as a store write.
 *
 * Throws if the draft does not satisfy `draftProblem`, and the throw is the point: a garment
 * that exists is a garment that was complete, and a screen that got its own guard wrong cannot
 * produce a half-row.
 */
export function toStoreWrite(draft: GarmentDraft, newId: () => string): NewGarment {
  const problem = draftProblem(draft);
  if (problem !== null)
    throw new Error(
      `a garment draft cannot be written while ${problem} — the screen's save control should ` +
        'be disabled, and this throw is what makes that a guarantee rather than a habit.',
    );
  const colour = draft.colour;
  if (colour === null) throw new Error('unreachable: draftProblem returned null with no colour');

  return {
    id: newId(),
    type: draft.type.trim(),
    color:
      colour.kind === 'corpus'
        ? colourFromCorpus(colour.slug, newId())
        : colourFromReading(colour.reading, newId()),
  };
}

/** Whether a draft carries anything beyond the two required fields. Used to label the save. */
export function hasEnrichment(draft: GarmentDraft): boolean {
  return draft.image !== null || Object.keys(draft.enrichment).length > 0;
}
