/**
 * The palette a person is building, and the schema that decides whether it can be saved.
 *
 * ## The criterion, and how it is met
 *
 * > *Palettes validate against the same schema as corpus palettes.* — FR-49
 *
 * `save()` calls **`parsePalette`** — the same function `content/palettes/*.json` goes
 * through. Nothing here re-implements a rule the schema already states, and that is the whole
 * design: the two things a palette editor breaks are *"at least one member is the anchor"* and
 * *"ranks are contiguous from 1"*, and both are already someone else's failing test with a
 * message that explains itself.
 *
 * The alternative — a set of checks in the screen that agree with the schema today — is the
 * shape where the two drift and the corpus one is the one nobody is looking at.
 *
 * ## A draft holds slugs, not colours
 *
 * A member is a slug and a role. The colour is looked up from the verified bundle at the
 * moment of saving, so nothing here can hold a value that disagrees with the corpus, and no
 * derived value is ever recomputed
 * ([ADR-0046](../../../docs/adr/0046-published-corpus-is-an-immutable-generated-bundle.md)).
 *
 * ## What this module is NOT
 *
 * It computes no colour maths. Not one conversion, not one difference. Members are corpus
 * entries and their values come from the bundle exactly as published.
 */

import {
  CorpusError,
  DEVICE_LOCAL_AUTHOR_ID,
  DEVICE_LOCAL_SOURCE_ID,
  parsePalette,
  type CorpusPalette,
  type PaletteRole,
} from '@irodora/corpus';
import type { NewPalette, NewPaletteMember, StoredPalette } from '@irodora/store';
import { CORPUS_LABEL, entryBySlug } from './corpus';

/**
 * What the Studio needs from storage, and nothing more.
 *
 * Narrower than `Repository` on purpose. The screen has no business reading colours, writing
 * one, or touching the change log, and a port that offered those would make it possible to.
 * `Repository` satisfies this structurally, so the device wiring is a pass-through and
 * `typecheck` is what proves the two agree.
 */
export interface PaletteStore {
  savePalette(palette: NewPalette, now: number): void;
  listPalettes(): readonly StoredPalette[];
  deletePalette(id: string, now: number): void;
}

/** One member of a draft: which colour, and what it does in the palette. */
export interface DraftMember {
  readonly slug: string;
  readonly role: PaletteRole;
}

export interface PaletteDraft {
  /** What the person typed. One name, in one language — see `toCorpusRecord`. */
  readonly name: string;
  /** In the order the person put them. Position is rank; rank is weight. */
  readonly members: readonly DraftMember[];
}

export const EMPTY_DRAFT: PaletteDraft = { name: '', members: [] };

/**
 * The role a colour takes when it is added.
 *
 * The **first** member becomes the anchor, every later one a neutral. Not a convenience: a
 * palette without an anchor is a colour list rather than a palette (spec §4), and a Studio
 * whose first action produces an unsaveable draft would teach that the schema is an obstacle.
 * The person can change any role afterwards; what they cannot do is start out invalid.
 */
const roleForNewMember = (existing: number): PaletteRole => (existing === 0 ? 'anchor' : 'neutral');

export function addMember(draft: PaletteDraft, slug: string): PaletteDraft {
  // Adding a colour twice is rejected here rather than at the schema, because the schema's
  // answer — "weighting by repetition is not a thing this schema does" — is the right message
  // for an editor reviewing a file and the wrong one for somebody who tapped the same swatch
  // twice. The RULE is still the schema's; this is the same rule applied earlier.
  if (draft.members.some((m) => m.slug === slug)) return draft;
  return {
    ...draft,
    members: [...draft.members, { slug, role: roleForNewMember(draft.members.length) }],
  };
}

export function removeMember(draft: PaletteDraft, slug: string): PaletteDraft {
  return { ...draft, members: draft.members.filter((m) => m.slug !== slug) };
}

/**
 * Move a member one place. **A move at either end is a no-op**, not a wrap.
 *
 * Wrapping is what a modulo produces and it is never what anybody wants: pressing "up" on the
 * first member and watching it appear at the bottom is a reordering the person did not ask
 * for, at the moment they are least expecting one.
 */
export function moveMember(draft: PaletteDraft, slug: string, by: -1 | 1): PaletteDraft {
  const from = draft.members.findIndex((m) => m.slug === slug);
  if (from === -1) return draft;
  const to = from + by;
  if (to < 0 || to >= draft.members.length) return draft;
  const members = [...draft.members];
  const [moved] = members.splice(from, 1);
  if (moved === undefined) return draft;
  members.splice(to, 0, moved);
  return { ...draft, members };
}

export function setRole(draft: PaletteDraft, slug: string, role: PaletteRole): PaletteDraft {
  return {
    ...draft,
    members: draft.members.map((m) => (m.slug === slug ? { ...m, role } : m)),
  };
}

export function rename(draft: PaletteDraft, name: string): PaletteDraft {
  return { ...draft, name };
}

/**
 * The weight ladder: rank 1 takes 1.0, the rest descend from 0.9 to 0.6.
 *
 * **Derived, because the person does not author it.** FR-49 asks for roles and ordering, not
 * for a number between 0 and 1 per colour — but the corpus schema requires `weight` in
 * `(0, 1]`, so it has to come from somewhere, and the only honest source is the ordering the
 * person *did* choose. That makes reordering mean something, which is the only reason a
 * reorder control is worth having.
 *
 * **It does not reproduce the seed palettes.** Theirs are hand-authored and vary — 焼土 sits at
 * 0.6 in one and a different ladder appears in another — because an editor weighed each set.
 * A formula claiming to reproduce editorial judgement would be claiming something it cannot
 * do; this one states its rule and stops there.
 *
 * The floor is 0.6 rather than 0: a zero weight is a colour that is in the palette and
 * contributes nothing, which the schema rejects by name.
 */
export function deriveWeights(count: number): readonly number[] {
  if (count <= 0) return [];
  const round = (n: number): number => Math.round(n * 100) / 100;
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return 1;
    if (count === 2) return 0.9;
    // Linear from 0.9 at rank 2 to 0.6 at rank `count`.
    return round(0.9 - (0.3 * (i - 1)) / (count - 2));
  });
}

/** What the record cannot know from the draft alone. Passed in, never read from a clock here. */
export interface SaveContext {
  /** The palette's row id, which doubles as its corpus slug. */
  readonly id: string;
  /** `YYYY-MM-DD`, from the device. Injected so the record is testable at a chosen date. */
  readonly today: string;
}

/**
 * The draft as a corpus-schema record.
 *
 * Returns `unknown` on purpose: the only way to get a `CorpusPalette` out of this module is
 * through `parsePalette`, so no caller can hold one that was never validated. That is the same
 * move `Color` makes with provenance
 * [[provenance-in-the-type-is-what-makes-honesty-structural]].
 *
 * ## Every provenance field, and why it is true
 *
 * The corpus schema was written for provenanced editorial content and a palette built on a
 * phone is not that. Rather than leave the fields to be filled in plausibly, each one says
 * what is actually the case — see
 * [ADR-0067](../../../docs/adr/0067-a-palette-built-on-a-device-is-validated-by-the-corpus-schema-and-says-it-came-from-a-device.md).
 *
 * `name.en` and `name.ja` are the same string because **we do not translate user content**.
 * There is one name — the one the person typed, in whatever language they typed it — and
 * putting it in both fields says that, where inventing a second one would not.
 */
export function toCorpusRecord(draft: PaletteDraft, context: SaveContext): unknown {
  const weights = deriveWeights(draft.members.length);
  return {
    // The row's uuid. A uuid is valid kebab-case, it is unique without a registry, and unlike
    // a slugified name it does not claim to be a name — two palettes may share a name.
    slug: context.id,
    name: { en: draft.name, ja: draft.name },
    // `editorial` is the honest member of OUR_OWN_CURATION for something neither canonical nor
    // ours. Its LABEL ("Irodora original") is never rendered for a palette somebody else made;
    // the Studio shows where it came from in its own words.
    classification: 'editorial',
    category: 'contemporary',
    colors: draft.members.map((m, i) => ({
      slug: m.slug,
      role: m.role,
      // Rank is 1-based and contiguous by construction — the schema checks it anyway, which
      // is what catches a future edit that renumbers on delete and gets it wrong.
      rank: i + 1,
      weight: weights[i] ?? 1,
    })),
    provenance: {
      source: 'Built in Palette Studio on this device',
      sourceId: DEVICE_LOCAL_SOURCE_ID,
      sourceType: 'editorial',
      publisher: null,
      publishedYear: null,
      rightsHolder: null,
      sourceLicence: 'Not licensed for distribution — private to this device',
      sourceUrl: null,
      derivation:
        'Assembled by hand in Palette Studio from published corpus entries of version ' +
        `${CORPUS_LABEL}. No colour value was measured, converted or altered; each member ` +
        'is the entry as published.',
      authoredBy: DEVICE_LOCAL_AUTHOR_ID,
      authoredAt: context.today,
      // Null, and `status: "draft"` is why. A palette on a phone has not been reviewed by
      // anybody, and the schema refuses a reviewer on an unreviewed record — which is the
      // rule doing its job rather than getting in the way.
      verifiedBy: null,
      verifiedAt: null,
      reviewIndependence: null,
      editorialNotes: 'Built on a device by the person using the app.',
    },
    unknowns: {
      'provenance.publisher': 'built on a device, so there is no publisher',
      'provenance.publishedYear': 'built on a device, so there is no publication date',
      'provenance.rightsHolder': 'the person who built it; Irodora holds no rights in it',
      'provenance.sourceUrl': 'never published anywhere',
    },
    status: 'draft',
    // The corpus version the members were taken from. The fact that matters later: a palette
    // built against this version keeps the colours it was built from when a newer one
    // supersedes an entry.
    versionId: CORPUS_LABEL,
  };
}

/**
 * Validate a draft. Throws a `CorpusError` naming the field, or returns the parsed palette.
 *
 * The throw is the point. A caller cannot obtain a `CorpusPalette` without going through the
 * schema, so "was this checked?" is not a question anybody has to ask.
 */
export function validateDraft(draft: PaletteDraft, context: SaveContext): CorpusPalette {
  return parsePalette(toCorpusRecord(draft, context), 'palette studio');
}

/** Which sentence to show when the schema refuses a draft. */
export type DraftProblem = 'empty' | 'noAnchor' | 'noName' | 'other';

/**
 * Why this draft cannot be saved — or `null` if it can.
 *
 * **The schema decides; this only picks the sentence.** The `try` is the whole check: a draft
 * is saveable exactly when `parsePalette` accepts it. The branches below choose which
 * translated explanation to show, and `other` exists because a classification that guessed
 * would be worse than one that admits it does not recognise the case.
 *
 * The property that makes the split safe: if this classification is wrong, the palette still
 * does not save. Presentation cannot widen what the schema allows, because the schema runs
 * again on the way to the database.
 *
 * A disabled control with no stated reason is the accessibility failure that looks like
 * polish, which is why this returns something to say rather than a boolean.
 */
export function draftProblem(draft: PaletteDraft, context: SaveContext): DraftProblem | null {
  try {
    validateDraft(draft, context);
    return null;
  } catch (error) {
    if (!(error instanceof CorpusError)) throw error;
    if (draft.members.length === 0) return 'empty';
    if (!draft.members.some((m) => m.role === 'anchor')) return 'noAnchor';
    if (draft.name.trim() === '') return 'noName';
    return 'other';
  }
}

/**
 * The draft as a store write, with each member's colour taken from the verified bundle.
 *
 * `validateDraft` runs first and its result is discarded — deliberately. What is wanted is
 * the **throw**: a draft that does not parse never reaches the database, so a row that exists
 * is a row that validated.
 */
export function toStoreWrite(
  draft: PaletteDraft,
  context: SaveContext,
  newColorId: () => string,
): NewPalette {
  validateDraft(draft, context);

  const weights = deriveWeights(draft.members.length);
  const members: NewPaletteMember[] = draft.members.map((m, i) => {
    const found = entryBySlug(m.slug);
    if (found === null)
      throw new CorpusError(
        'palette studio',
        `colors[${String(i)}].slug`,
        `"${m.slug}" is not in corpus version ${CORPUS_LABEL}. A draft may only hold ` +
          'published entries, so this means the bundle changed under a draft in progress.',
      );
    return {
      color: {
        id: newColorId(),
        name: found.entry.name.en,
        // Canonical XYZ and the derived values AS PUBLISHED. Nothing here recomputes one:
        // a value re-derived at save time would be today's engine's answer for a published
        // version, which is exactly what FR-10 exists to prevent.
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
        // A published corpus entry is a reference value with a recorded origin (ADR-0005).
        source: 'reference',
        confidence: 1,
        corpus_slug: m.slug,
      },
      role: m.role,
      rank: i + 1,
      weight: weights[i] ?? 1,
    };
  });

  return {
    id: context.id,
    nameEn: draft.name,
    nameJa: draft.name,
    classification: 'editorial',
    category: 'contemporary',
    versionId: CORPUS_LABEL,
    members,
  };
}

/** A stored palette, back to a draft — for reopening one that was saved. */
export function draftFrom(
  members: readonly { readonly slug: string; readonly role: string }[],
  name: string,
): PaletteDraft {
  return {
    name,
    members: members.map((m) => ({ slug: m.slug, role: m.role as PaletteRole })),
  };
}
