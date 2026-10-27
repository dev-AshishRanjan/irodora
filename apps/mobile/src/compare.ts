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

import {
  apcaLc,
  deltaE00,
  deltaE00Terms,
  deltaEok,
  wcagContrast,
  type Ciede2000Terms,
} from '@irodora/color-difference';
import { hueDelta, oklchToOklab } from '@irodora/color-spaces';
import { warmCoolRelation, type WarmCoolRelation } from '@irodora/recommendation';
import { separationDetail, type Deficiency, type SeparationDetail } from '@irodora/cvd-engine';
import { colorFor, type PublishedEntry } from './corpus';
import { ruleSet } from './rules';

/** The deficiencies shown, in the order they are shown. */
export const COMPARED_DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

/**
 * The severity a simulation runs at when nobody has moved it.
 *
 * The strongest Machado tabulates. Compare is a professional read-out, so the useful *opening*
 * question is the worst case rather than an average one — and stating the severity is what
 * keeps the answer from being read as "what a person with this deficiency sees".
 *
 * **It is a default rather than a constant since F-156.** `machadoMatrix` interpolates between
 * the tabulated steps for any severity in 0–1, and the engine's own docblock says so twice —
 * *"anomalous trichromacy at any severity. The common case, and the one a severity slider is
 * for"*. There was no slider, so the whole range existed and one point of it was reachable.
 *
 * **08 draws no severity control (F-249, ADR-0156 D7)**: its -anopia rows are this default, the
 * dichromat's case. The parameter stays for a caller that needs another severity.
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
  /**
   * The CIEDE2000 weighted terms (F-249): the lightness, chroma and hue components ADR-0125 bands
   * each axis reading by. Its `deltaE00` is the same double as the field above.
   */
  readonly terms: Ciede2000Terms;
  /** OKLab, the Euclidean distance of the two records' OKLab triples (08's ΔEok). */
  readonly deltaEok: number;
  /**
   * CIELAB LCh (D65), from the record's own `derived.lch` (F-249): 08's ΔL*, ΔC* and ΔH. `h`'s delta
   * is the shortest signed arc, `hueDelta`, in degrees — the hue ANGLE difference.
   */
  readonly lch: {
    readonly l: AxisDelta;
    readonly c: AxisDelta;
    readonly h: AxisDelta;
  };
  /** The pair's warm–cool relation: the outfit harmony component's own measure (E-226). */
  readonly temperature: WarmCoolRelation;
  /** One per deficiency, at the severity `compare()` was given, each carrying its own decomposition. */
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
export function compare(
  a: PublishedEntry,
  b: PublishedEntry,
  /**
   * The severity the three simulations run at, 0–1.
   *
   * A parameter with a default rather than a second function: every caller that does not care
   * keeps the worst case, and the one that does passes a number. Two functions would be two
   * places for the default to live.
   */
  severity: number = COMPARED_SEVERITY,
): CompareMetrics {
  const [ca, cca, cha] = a.derived.lch;
  const [cb, ccb, chb] = b.derived.lch;

  return {
    deltaE00: deltaE00(a.derived.lab, b.derived.lab),
    terms: deltaE00Terms(a.derived.lab, b.derived.lab),
    deltaEok: deltaEok(oklchToOklab(a.derived.oklch), oklchToOklab(b.derived.oklch)),
    lch: {
      l: axis(ca, cb),
      c: axis(cca, ccb),
      // The shortest signed ARC, as OKLCh's below: the obvious subtraction is wrong across 0°.
      h: { a: cha, b: chb, delta: hueDelta(cha, chb) },
    },
    temperature: warmCoolRelation([colorFor(a.entry), colorFor(b.entry)], ruleSet()),
    separation: COMPARED_DEFICIENCIES.map((d) =>
      separationDetail(a.derived.rgb, b.derived.rgb, d, severity),
    ),
    contrast: {
      wcagRatio: wcagContrast(a.derived.rgb, b.derived.rgb),
      apcaBOnA: apcaLc(a.derived.rgb, b.derived.rgb),
      apcaAOnB: apcaLc(b.derived.rgb, a.derived.rgb),
    },
  };
}
