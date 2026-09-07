/**
 * What you could actually buy in a colour (FR-72).
 *
 * ## What "contemporary" is, in this product
 *
 * FR-22's curated palettes, and nothing else. Four of them carry `category: "contemporary"`, they
 * hold 28 entries between them, and each palette has editorial provenance and a named reviewer.
 * That is the only set here that is both *contemporary* and signed off — so "the nearest
 * contemporary reference by ΔE00" is exactly computable against it.
 *
 * The alternative would be an external reference set: Pantone, RAL, a retailer's range. Each is
 * licensed, none is in this repository, and inventing one would be the unsourced claim that
 * ADR-0005 and the content rules exist to prevent.
 *
 * ## Two kinds, and keeping them apart IS the feature
 *
 * A **computed** equivalent is arithmetic: the nearest palette member by ΔE00, with the delta.
 * An **editorial** equivalent is a person's recorded judgement, with provenance and a reviewer.
 *
 * Presenting a computed neighbour as editorial judgement is a claim nobody made — the same move
 * ADR-0005 makes for provenance, applied here. So they are a discriminated union rather than one
 * shape with a flag: a renderer that read the delta off an editorial equivalent does not compile.
 *
 * ## An entry that is already in a palette
 *
 * It is not its own nearest neighbour at ΔE00 0.00 with no explanation. It is *in* Quiet Neutrals,
 * and that is a different sentence — `membership` carries it, and the screen leads with it.
 *
 * ## Nothing here renders
 *
 * `equivalentsFor` is reachable by a test that never draws anything, which is the arrangement
 * `compare.ts` and `finder.ts` already establish. The screen formats and labels; it does not
 * calculate, and it does not decide what counts as near.
 */

import { deltaE00 } from '@irodora/color-difference';
import { allPalettes, entryBySlug, type PublishedEntry } from './corpus';

/** How many computed equivalents a surface offers. Enough to choose from, few enough to judge. */
export const EQUIVALENT_LIMIT = 3;

/**
 * The distance past which this product will not call something an equivalent.
 *
 * **A judgement, and stated as one.** ΔE00 5 is roughly where two colours stop reading as
 * versions of each other and start reading as different colours — but the reference set is 28
 * entries wide, so a colour can genuinely have no near neighbour in it. When that happens the
 * surface says there is none rather than offering the least distant thing and letting the number
 * carry a disclaimer nobody reads.
 */
export const EQUIVALENT_CEILING = 5;

/** A colour that appears in a contemporary palette, and which one. */
export interface PaletteMembership {
  readonly paletteSlug: string;
  readonly paletteName: string;
  readonly role: string;
}

/**
 * One equivalent.
 *
 * The discriminant is `kind`, and it is what criterion 3 asks for: an editorial equivalent has no
 * `deltaE00` field to read, and a computed one has no `note` or `provenance`. Neither can be
 * rendered as the other without a compile error.
 */
export type Equivalent =
  | {
      readonly kind: 'computed';
      readonly entry: PublishedEntry;
      /** The distance, in the space it was computed in. Shown, never hidden behind a word. */
      readonly deltaE00: number;
      /** Which contemporary palettes this colour is in. Never empty for a computed equivalent. */
      readonly inPalettes: readonly PaletteMembership[];
    }
  | {
      readonly kind: 'editorial';
      readonly entry: PublishedEntry | null;
      /** What a person recorded. Never generated, never translated by machine. */
      readonly note: string;
      /** Who said it and where it came from. The content gate enforces both. */
      readonly provenance: { readonly source: string; readonly verifiedBy: string };
    };

export interface Equivalents {
  /** The palettes this colour is itself in. A different sentence from "the nearest to it". */
  readonly membership: readonly PaletteMembership[];
  readonly computed: readonly Equivalent[];
  readonly editorial: readonly Equivalent[];
  /**
   * Nothing came within the ceiling.
   *
   * A state rather than an empty list, because "there is nothing near this colour in our
   * contemporary set" is a fact worth saying and an empty list reads as a bug.
   */
  readonly nothingNear: boolean;
}

/** Every entry that appears in a palette whose category is `contemporary`. */
function contemporaryMembers(): ReadonlyMap<string, PaletteMembership[]> {
  const members = new Map<string, PaletteMembership[]>();
  for (const { palette } of allPalettes()) {
    /*
     * `contemporary` ONLY. The seasonal palette is curated and signed off too, but it groups by
     * time of year rather than by what is current — and answering "what could I buy in this"
     * with a summer palette would be answering a different question.
     */
    if (palette.category !== 'contemporary') continue;
    for (const colour of palette.colors) {
      const list = members.get(colour.slug) ?? [];
      list.push({
        paletteSlug: palette.slug,
        paletteName: palette.name.en,
        role: colour.role,
      });
      members.set(colour.slug, list);
    }
  }
  return members;
}

/**
 * The contemporary colours that correspond to this one.
 *
 * Deterministic: the same entry gives the same answer, ordered by ΔE00 and then by slug so a tie
 * is broken by something stable rather than by the order a directory happened to be read in.
 */
export function equivalentsFor(subject: PublishedEntry): Equivalents {
  const members = contemporaryMembers();
  const membership = members.get(subject.entry.slug) ?? [];

  const ranked = [...members.entries()]
    .filter(([slug]) => slug !== subject.entry.slug)
    .flatMap(([slug, inPalettes]) => {
      const entry = entryBySlug(slug);
      if (entry === null) return [];
      return [
        {
          kind: 'computed' as const,
          entry,
          deltaE00: deltaE00(subject.derived.lab, entry.derived.lab),
          inPalettes,
        },
      ];
    })
    .sort(
      (a, b) => a.deltaE00 - b.deltaE00 || a.entry.entry.slug.localeCompare(b.entry.entry.slug),
    );

  const within = ranked.filter((e) => e.deltaE00 <= EQUIVALENT_CEILING);

  return {
    membership,
    computed: within.slice(0, EQUIVALENT_LIMIT),
    editorial: editorialFor(subject),
    // Membership is not nearness: a colour can be in a palette and still have nothing near it.
    nothingNear: within.length === 0,
  };
}

/**
 * The editorial equivalents recorded against this entry.
 *
 * **Empty on every published entry today**, and that is editorial work rather than a gap in the
 * code: an editorial equivalent needs a note, a source and a reviewer who is not its author, all
 * of which the content gate enforces and none of which a generator can supply. The path is proven
 * against the fixture corpus, which has fixture editors.
 */
export function editorialFor(subject: PublishedEntry): readonly Equivalent[] {
  const recorded = subject.entry.editorial.contemporaryEquivalents ?? [];
  return recorded.map((item) => ({
    kind: 'editorial' as const,
    entry: item.slug === null ? null : entryBySlug(item.slug),
    note: item.note,
    provenance: { source: item.source, verifiedBy: item.verifiedBy },
  }));
}

/** The nearest entry to an arbitrary Lab reading — the Lens's way into this surface (criterion 5). */
export function nearestEntryTo(lab: readonly [number, number, number]): PublishedEntry | null {
  let best: PublishedEntry | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of allPalettes().length === 0 ? [] : entriesForNearest()) {
    const delta = deltaE00(lab, candidate.derived.lab);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}

/** Split out so the loop above reads as a ranking rather than as a corpus query. */
function entriesForNearest(): readonly PublishedEntry[] {
  const members = contemporaryMembers();
  return [...members.keys()].flatMap((slug) => {
    const entry = entryBySlug(slug);
    return entry === null ? [] : [entry];
  });
}
