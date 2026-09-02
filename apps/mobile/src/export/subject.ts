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

import { CORPUS_LABEL } from '../corpus';
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
    envelope: {
      engine: ENGINE_VERSION,
      corpus: CORPUS_LABEL,
      rules: ruleSet().versionId,
    },
    colours: palette.members.map((member) => colourOf(member)),
  };
}
