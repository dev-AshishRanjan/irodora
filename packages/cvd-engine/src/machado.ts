/**
 * Machado, Oliveira & Fernandes (2009) — anomalous trichromacy at severity 0 to 1.
 *
 * The **common** case. Dichromacy (Brettel–Viénot, `brettel.ts`) is the total absence of one
 * cone class; anomalous trichromacy is a shifted response, it affects far more people, and it
 * is the case a severity slider exists for.
 *
 * ## Where these numbers come from, stated precisely
 *
 * Eleven matrices per deficiency, at severity 0.0 to 1.0 in 0.1 steps, from the Oliveira
 * lab's published precomputed tables for the 2009 paper. **They are transcribed from
 * `culori`'s on-disk copy of those tables**, which cites them directly — so for the
 * intermediate severities culori is the transcription *source*, not an independent check, and
 * asserting that our matrices match culori's would be vacuous. Saying so is the point; the
 * previous two features each shipped a transcription error, and both times the check that
 * looked strongest was the one comparing a value against a copy of itself.
 *
 * What *is* independent, and what the golden set actually asserts:
 *
 * 1. **The three severity-1.0 matrices were reproduced from memory before this file was
 *    written, and matched all 27 numbers exactly.** That validates the transcription
 *    *channel* rather than the transcription.
 * 2. **Severity 0.0 is exactly the identity** in all three tables.
 * 3. **Every row sums to 1 within 1e-6** — these transforms preserve luminance, and a
 *    mistyped digit almost anywhere breaks that.
 * 4. **The confusion-line behaviour** in `brettel.ts`' golden set is independent of these
 *    values entirely.
 *
 * ## Severity is continuous here, and is not in culori
 *
 * culori's interpolation is dead code: `Math.round(t % 0.1)` is always 0, so it snaps to the
 * nearest tabulated step and `filterDeficiencyDeuter(0.15)` returns the 0.1 result.
 * Acceptance criterion 1 requires severity 0 to 1 continuously, so this module interpolates
 * linearly between the tabulated matrices. **We therefore disagree with culori at every
 * severity that is not a multiple of 0.1, and that disagreement is ours being right.** The
 * oracle test compares only at the eleven tabulated points, where it is a real check.
 */

import { applyMatrix3, type Matrix3, type Rgb } from '@irodora/color-spaces';

/** Which cone class is affected. */
export type Deficiency = 'protan' | 'deutan' | 'tritan';

/** How many tabulated severities each table has: 0.0 to 1.0 in 0.1 steps. */
export const MACHADO_STEPS = 11;

/** The step between tabulated severities. */
export const MACHADO_STEP = 0.1;

/** No deficiency. Named so the unreachable fallback in machadoMatrix has something honest to return. */
const IDENTITY: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** protanomaly — severity 0.0 to 1.0 in 0.1 steps, row-major. Machado et al. (2009). */
export const MACHADO_PROTAN: readonly Matrix3[] = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0.856167, 0.182038, -0.038205, 0.029342, 0.955115, 0.015544, -0.00288, -0.001563, 1.004443],
  [0.734766, 0.334872, -0.069637, 0.05184, 0.919198, 0.028963, -0.004928, -0.004209, 1.009137],
  [0.630323, 0.465641, -0.095964, 0.069181, 0.890046, 0.040773, -0.006308, -0.007724, 1.014032],
  [0.539009, 0.579343, -0.118352, 0.082546, 0.866121, 0.051332, -0.007136, -0.011959, 1.019095],
  [0.458064, 0.679578, -0.137642, 0.092785, 0.846313, 0.060902, -0.007494, -0.016807, 1.024301],
  [0.38545, 0.769005, -0.154455, 0.100526, 0.829802, 0.069673, -0.007442, -0.02219, 1.029632],
  [0.319627, 0.849633, -0.169261, 0.106241, 0.815969, 0.07779, -0.007025, -0.028051, 1.035076],
  [0.259411, 0.923008, -0.18242, 0.110296, 0.80434, 0.085364, -0.006276, -0.034346, 1.040622],
  [0.203876, 0.990338, -0.194214, 0.112975, 0.794542, 0.092483, -0.005222, -0.041043, 1.046265],
  [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
];

/** deuteranomaly — severity 0.0 to 1.0 in 0.1 steps, row-major. Machado et al. (2009). */
export const MACHADO_DEUTAN: readonly Matrix3[] = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0.866435, 0.177704, -0.044139, 0.049567, 0.939063, 0.01137, -0.003453, 0.007233, 0.99622],
  [0.760729, 0.319078, -0.079807, 0.090568, 0.889315, 0.020117, -0.006027, 0.013325, 0.992702],
  [0.675425, 0.43385, -0.109275, 0.125303, 0.847755, 0.026942, -0.00795, 0.018572, 0.989378],
  [0.605511, 0.52856, -0.134071, 0.155318, 0.812366, 0.032316, -0.009376, 0.023176, 0.9862],
  [0.547494, 0.607765, -0.155259, 0.181692, 0.781742, 0.036566, -0.01041, 0.027275, 0.983136],
  [0.498864, 0.674741, -0.173604, 0.205199, 0.754872, 0.039929, -0.011131, 0.030969, 0.980162],
  [0.457771, 0.731899, -0.18967, 0.226409, 0.731012, 0.042579, -0.011595, 0.034333, 0.977261],
  [0.422823, 0.781057, -0.203881, 0.245752, 0.709602, 0.044646, -0.011843, 0.037423, 0.974421],
  [0.392952, 0.82361, -0.216562, 0.263559, 0.69021, 0.046232, -0.01191, 0.040281, 0.97163],
  [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
];

/** tritanomaly — severity 0.0 to 1.0 in 0.1 steps, row-major. Machado et al. (2009). */
export const MACHADO_TRITAN: readonly Matrix3[] = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0.92667, 0.092514, -0.019184, 0.021191, 0.964503, 0.014306, 0.008437, 0.054813, 0.93675],
  [0.89572, 0.13333, -0.02905, 0.029997, 0.9454, 0.024603, 0.013027, 0.104707, 0.882266],
  [0.905871, 0.127791, -0.033662, 0.026856, 0.941251, 0.031893, 0.01341, 0.148296, 0.838294],
  [0.948035, 0.08949, -0.037526, 0.014364, 0.946792, 0.038844, 0.010853, 0.193991, 0.795156],
  [1.017277, 0.027029, -0.044306, -0.006113, 0.958479, 0.047634, 0.006379, 0.248708, 0.744913],
  [1.104996, -0.046633, -0.058363, -0.032137, 0.971635, 0.060503, 0.001336, 0.317922, 0.680742],
  [1.193214, -0.109812, -0.083402, -0.058496, 0.97941, 0.079086, -0.002346, 0.403492, 0.598854],
  [1.257728, -0.139648, -0.118081, -0.078003, 0.975409, 0.102594, -0.003316, 0.501214, 0.502102],
  [1.278864, -0.125333, -0.153531, -0.084748, 0.957674, 0.127074, -0.000989, 0.601151, 0.399838],
  [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
];

/** The three tables, addressable by deficiency. */
export const MACHADO_TABLES: Record<Deficiency, readonly Matrix3[]> = {
  protan: MACHADO_PROTAN,
  deutan: MACHADO_DEUTAN,
  tritan: MACHADO_TRITAN,
};

/**
 * The Machado matrix for a continuous severity, linearly interpolated between the two
 * tabulated neighbours.
 *
 * Severity is clamped to `[0, 1]` rather than throwing. A caller passing 1.2 means "as severe
 * as it gets", and the alternative is an exception in the middle of scoring an outfit.
 */
export function machadoMatrix(deficiency: Deficiency, severity: number): Matrix3 {
  const table = MACHADO_TABLES[deficiency];
  const clamped = severity < 0 ? 0 : severity > 1 ? 1 : severity;

  const position = clamped / MACHADO_STEP;
  const lower = Math.floor(position);

  const first = table[lower];
  const second = table[lower + 1];

  // `lower` is derived from a value already clamped to [0, 1], so `first` is always present —
  // but the type says otherwise and a non-null assertion is banned in this zone for the reason
  // it usually is. Throwing here would be unreachable; returning the endpoint is not.
  if (!first) return table[MACHADO_STEPS - 1] ?? table[0] ?? IDENTITY;
  if (!second) return first;

  const weight = position - lower;
  if (weight === 0) return first;

  return first.map((v, i) => v + ((second[i] ?? v) - v) * weight) as unknown as Matrix3;
}

/**
 * Simulate anomalous trichromacy on an **encoded** sRGB colour.
 *
 * ## The convention here, and what is genuinely contested about it
 *
 * These matrices are applied to encoded (gamma-corrected) sRGB. That matches the paper's own
 * illustrations and it matches `culori`, which is where our transcription is checked against
 * — so it is the defensible choice, and changing it would change every published number in
 * this package.
 *
 * **It is not, however, the only convention, and the claim that "every reference
 * implementation applies them this way" was wrong** (corrected during F-003's colour-science
 * review). R's `colorspace` applied them to gamma-corrected sRGB up to 2.0-3, following the
 * paper's illustrations, and then *changed to linear RGB* because the derivation implicitly
 * relies on linear RGB. DaltonLens also applies them in linear. So this is a real fork in the
 * literature, not a settled fact.
 *
 * What makes our choice safe rather than merely conventional: the design system's `cvdPairs`
 * were recomputed under **both** conventions during F-003, across all eleven tabulated
 * severities, and the worst status pairing clears the declared minimum of 60 either way —
 * **61.9** applying the matrices in linear RGB against **64.0** applying them here. A
 * conclusion that survives both readings does not depend on which side of the fork we are on.
 *
 * Linearising first is still not a change to make casually: it changes every result, and it
 * reads as more correct while silently invalidating the golden data.
 */
export function simulateAnomalous(rgb: Rgb, deficiency: Deficiency, severity: number): Rgb {
  return applyMatrix3(machadoMatrix(deficiency, severity), rgb);
}
