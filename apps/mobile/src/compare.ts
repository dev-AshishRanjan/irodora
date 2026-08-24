/**
 * Every number that separates two corpus colours.
 *
 * ## Why this is a module and not a hook
 *
 * A number a component computes inline is a number no test can reach without rendering. This
 * is the same reasoning that put the engine behind `engine.ts`: the metric set is assembled
 * once, here, and `compare.test.ts` asserts its properties directly.
 *
 * ## The line F-018's boundary #24 drew, and why this file sits on the far side of it
 *
 * The bundle carries what each colour **is** — `lab`, `oklch`, `rgb`, `hex`, frozen at publish
 * time. It carries nothing about what two colours are **to each other**. So every value here is
 * a derived answer, computed now, by the engine:
 *
 * | Read from the bundle | Computed here |
 * |---|---|
 * | `derived.lab`, `derived.oklch`, `derived.rgb` | ΔE00, the per-axis deltas, separation, contrast |
 *
 * Nothing recomputes a stored value, and the boundary forbids the imports that would.
 *
 * ## No colour maths is written in this file
 *
 * Every number comes from a package with a golden dataset behind it, including the circular
 * hue arithmetic — `hueDelta` already exists, and *"the mean of 350° and 10° is 0°, not 180°"*
 * is exactly the mistake a fresh implementation makes ([`AGENTS.md` §7]).
 *
 * ## Two asymmetries that are reported rather than smoothed over
 *
 * **WCAG is symmetric; APCA is not.** Which colour is the text changes an APCA reading and does
 * not change a WCAG one, because dark-on-light and light-on-dark are different perceptual
 * problems. Both APCA directions are returned, so a surface cannot show one and imply the
 * other is the same.
 *
 * **Separation carries its decomposition, not only its score.** A number labelled "62" with
 * nothing beside it is a grade nobody can check; `separationDetail` returns the ΔE00 and the
 * lightness difference the score was built from, and those travel with it.
 */

import { deltaE00, apcaLc, wcagContrast } from '@irodora/color-difference';
import { hueDelta } from '@irodora/color-spaces';
import { separationDetail, type Deficiency, type SeparationDetail } from '@irodora/cvd-engine';
import type { PublishedEntry } from './corpus';

/** The deficiencies shown, in the order they are shown. */
export const COMPARED_DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

/**
 * The severity every simulation runs at.
 *
 * The strongest Machado tabulates. Compare is a professional read-out, so the useful question
 * is the worst case rather than an average one — and stating the severity is what keeps the
 * answer from being read as "what a person with this deficiency sees".
 */
export const COMPARED_SEVERITY = 1;

/** One axis, both values and their signed difference. */
export interface AxisDelta {
  readonly a: number;
  readonly b: number;
  /** `b - a`, signed. A direction is information; an absolute value throws it away. */
  readonly delta: number;
}

export interface CompareMetrics {
  /** CIELAB (D65). The ranking authority. */
  readonly deltaE00: number;
  /** CIELAB (D65), per axis. */
  readonly lab: {
    readonly l: AxisDelta;
    readonly a: AxisDelta;
    readonly b: AxisDelta;
  };
  /** OKLCh. `h` uses the shortest signed arc, so 350° → 10° is +20 rather than −340. */
  readonly oklch: {
    readonly l: AxisDelta;
    readonly c: AxisDelta;
    readonly h: AxisDelta;
  };
  /** One per deficiency, at `COMPARED_SEVERITY`, each carrying its own decomposition. */
  readonly separation: readonly SeparationDetail[];
  readonly contrast: {
    /** WCAG 2.x ratio, encoded sRGB. Symmetric. */
    readonly wcagRatio: number;
    /** APCA Lc with A as the background and B as the text. */
    readonly apcaBOnA: number;
    /** APCA Lc with B as the background and A as the text. Not the negation of the other. */
    readonly apcaAOnB: number;
  };
}

const axis = (a: number, b: number): AxisDelta => ({ a, b, delta: b - a });

/**
 * Assemble the metric set for two published entries.
 *
 * Takes `PublishedEntry` rather than two hexes, so a caller cannot hand it a colour whose
 * origin nobody recorded — the same reason `Swatch` takes a `Color` (ADR-0005).
 */
export function compare(a: PublishedEntry, b: PublishedEntry): CompareMetrics {
  const [la, aa, ba] = a.derived.lab;
  const [lb, ab, bb] = b.derived.lab;
  const [ola, oca, oha] = a.derived.oklch;
  const [olb, ocb, ohb] = b.derived.oklch;

  return {
    deltaE00: deltaE00(a.derived.lab, b.derived.lab),
    lab: { l: axis(la, lb), a: axis(aa, ab), b: axis(ba, bb) },
    oklch: {
      l: axis(ola, olb),
      c: axis(oca, ocb),
      // `delta` is overwritten with the shortest signed ARC. Subtracting two hue angles is the
      // one place in this file where the obvious arithmetic is wrong.
      h: { a: oha, b: ohb, delta: hueDelta(oha, ohb) },
    },
    separation: COMPARED_DEFICIENCIES.map((d) =>
      separationDetail(a.derived.rgb, b.derived.rgb, d, COMPARED_SEVERITY),
    ),
    contrast: {
      wcagRatio: wcagContrast(a.derived.rgb, b.derived.rgb),
      apcaBOnA: apcaLc(a.derived.rgb, b.derived.rgb),
      apcaAOnB: apcaLc(b.derived.rgb, a.derived.rgb),
    },
  };
}
