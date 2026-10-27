/**
 * A stored palette as an export subject (FR-51, F-129).
 *
 * ## One place that decides what an export contains
 *
 * `Export.tsx` takes an `ExportSubject` and does not build one. This is where a palette becomes
 * one — and it is the only such place, because a second way to assemble a subject would be a
 * second answer to *what is in the file*, and the two would drift while both looked right.
 *
 * ## The versions are read, never composed
 *
 * FR-10's envelope is *"the versions that produced it"*, and every one of them is already a
 * constant somewhere in this app: the corpus label from the published bundle, the rules version
 * from the published weights, the engine version from its own manifest. **Nothing here invents
 * or formats a version** — a string assembled at this layer would be a claim about what produced
 * the file, made by the layer least able to know.
 */

import { CORPUS_LABEL, entryBySlug, type PublishedEntry } from '../corpus';
import { deltaE00 } from '@irodora/color-difference';
import { ENGINE_VERSION } from '@irodora/color-spaces';
import { ruleSet } from '../rules';
import type { ExportColour, ExportSubject } from '@irodora/export';
import type { StoredPalette } from '@irodora/store';

/**
 * A palette member as an export colour.
 *
 * Every coordinate is **read from the stored row**, never recomputed. The row was written under
 * a pinned engine version, and deriving `lab` again here would put today's engine's answer in a
 * file that claims yesterday's (FR-10, E-001) — the same rule the wardrobe's grouping follows.
 */
function colourOf(member: StoredPalette['members'][number]): ExportColour {
  const row = member.color;
  return {
    id: member.slug,
    name: row.name,
    hex: row.hex,
    lab: [row.lab_l, row.lab_a, row.lab_b],
    // CIELCh from CIELAB is the polar form of the same value, not a conversion to another
    // space — so it is arithmetic on stored numbers rather than a trip through the engine.
    lch: [row.lab_l, Math.hypot(row.lab_a, row.lab_b), lchHue(row.lab_a, row.lab_b)],
    oklch: [row.oklch_l, row.oklch_c, row.oklch_h],
    source: row.source,
  };
}

/** The hue angle in degrees, normalised to [0, 360). `atan2` returns (-180, 180]. */
function lchHue(a: number, b: number): number {
  const degrees = (Math.atan2(b, a) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

/**
 * A stored palette, ready to export.
 *
 * The English name is the title: a filename is derived from it (`filenameFor`), and a Japanese
 * one would slugify to nothing on most of the corpus — which is a real limit rather than a
 * preference, and the reason `slugify` has its own tests.
 */
export function paletteSubject(palette: StoredPalette): ExportSubject {
  return {
    title: palette.nameEn,
    envelope: envelope(),
    colours: palette.members.map((member) => colourOf(member)),
  };
}

/** The versions that produced a file (FR-10): read, never composed. One envelope for every subject. */
function envelope(): ExportSubject['envelope'] {
  return { engine: ENGINE_VERSION, corpus: CORPUS_LABEL, rules: ruleSet().versionId };
}

/**
 * A corpus colour as an export colour. Every coordinate is the bundle's own derivation, read and
 * never recomputed, for the reason `colourOf` gives.
 */
function corpusColour(entry: PublishedEntry): ExportColour {
  const { derived } = entry;
  return {
    id: entry.entry.slug,
    name: entry.entry.name.en,
    hex: derived.hex,
    lab: [derived.lab[0], derived.lab[1], derived.lab[2]],
    lch: [derived.lch[0], derived.lch[1], derived.lch[2]],
    oklch: [derived.oklch[0], derived.oklch[1], derived.oklch[2]],
    // A corpus colour is a reference, as `colorFor` declares it.
    source: 'reference',
  };
}

/**
 * One corpus colour, ready to export (F-247, ADR-0147: `06`'s export glyph). The English name is the
 * title, as a palette's is.
 */
export function colourSubject(entry: PublishedEntry): ExportSubject {
  return { title: entry.entry.name.en, envelope: envelope(), colours: [corpusColour(entry)] };
}

/**
 * A combination, ready to export (F-248, ADR-0152 D6: `07`'s *Export Palette Tokens*): its colours
 * in the order `07` draws them, the colour in hand first. The title is their English names joined,
 * so the file says what is in it, and its filename is derived from that (`filenameFor`).
 */
export function combinationSubject(entries: readonly PublishedEntry[]): ExportSubject {
  return {
    title: entries.map((e) => e.entry.name.en).join(' + '),
    envelope: envelope(),
    colours: entries.map(corpusColour),
  };
}

/**
 * 08's pair (F-249, ADR-0156 D3): its two colours and their ΔE00 row (FR-65), titled as a
 * combination is. The ΔE00 is the engine's, computed now from the two records' CIELAB.
 */
export function pairSubject(a: PublishedEntry, b: PublishedEntry): ExportSubject {
  return {
    ...combinationSubject([a, b]),
    deltas: [
      {
        fromId: a.entry.slug,
        toId: b.entry.slug,
        deltaE00: deltaE00(a.derived.lab, b.derived.lab),
      },
    ],
  };
}

/** The separator between the slugs of the export route's `colours` and `pair` parameters. */
export const COLOURS_SEPARATOR = ',';

/**
 * The corpus colours a `colours` route parameter names, in its order — or `null` when it is absent,
 * empty, or names any colour this corpus does not hold. A combination with a colour missing is not
 * the combination somebody chose, so it is not exported in part.
 */
function combinationOf(colours: string | undefined): readonly PublishedEntry[] | null {
  if (colours === undefined || colours === '') return null;
  const entries = colours.split(COLOURS_SEPARATOR).map((slug) => entryBySlug(slug));
  return entries.every((e): e is PublishedEntry => e !== null) ? entries : null;
}

/**
 * What the export route exports (F-247, E-215; F-248, E-222): the combination `07` asked for, when
 * every colour it names is one this corpus holds; otherwise the colour the colour page asked for,
 * likewise; otherwise the palette saved most recently, as before `06` had an export glyph; otherwise
 * nothing, and the screen says so. A slug the corpus does not hold names no colour, so it falls back
 * as a bare open does.
 */
export function exportSubjectFor(
  slug: string | undefined,
  palettes: readonly StoredPalette[],
  colours?: string,
  pair?: string,
): ExportSubject | null {
  // 08's pair first (F-249): exactly two different corpus colours, or nothing — never a guess. A pair
  // the route was given and cannot read exports nothing rather than another subject (review, M2).
  if (pair !== undefined && pair !== '') {
    const two = combinationOf(pair);
    const [a, b] = two ?? [];
    return two?.length === 2 && a !== undefined && b !== undefined && a.entry.slug !== b.entry.slug
      ? pairSubject(a, b)
      : null;
  }
  const combination = combinationOf(colours);
  if (combination !== null) return combinationSubject(combination);
  const colour = slug === undefined ? null : entryBySlug(slug);
  if (colour !== null) return colourSubject(colour);
  // The LAST one, because `listPalettes` is in creation order and the most recent is what
  // somebody was just working on.
  const latest = palettes.at(-1);
  return latest === undefined ? null : paletteSubject(latest);
}
