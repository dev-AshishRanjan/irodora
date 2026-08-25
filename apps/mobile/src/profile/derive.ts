/**
 * Twelve answers into seven dimensions, deterministically.
 *
 * ## What this may and may not claim
 *
 * It produces a **tendency with a confidence**, and the confidence is capped at 0.75 because
 * that is all agreement across three forced choices can support. Nothing here is a
 * measurement, nothing is calibrated, and no copy built on it may say otherwise
 * ([ADR-0031](../../../../docs/adr/0031-measurement-claims-policy.md), golden rule 11).
 *
 * ## It computes no colour maths
 *
 * Every number it reads — `L`, `C`, the taxonomy bands — is a **published** value taken from
 * the verified bundle exactly as the engine wrote it at publish time. Not one conversion
 * happens here. Re-deriving even one would be today's engine answering for a published
 * version, which is the failure FR-10 exists to prevent and
 * `scripts/verify-guards.mjs` enforces from outside.
 *
 * ## Confidence is agreement, not count
 *
 * Three unanimous answers and three answers from a person who was guessing look identical if
 * you count them. What separates them is whether they agreed. So a split answer produces a
 * *wider* range and a *lower* confidence at the same time, from the same fact — which is the
 * property that makes the two numbers consistent rather than two independent guesses.
 */

import type { PublishedEntry } from '@irodora/corpus';
import { allEntries } from '../corpus';
import type { Profile } from './dimensions';
import { TRIALS, TRIALS_PER_AXIS, type TrialAnswer, type TrialAxis } from './trials';

/**
 * The ceiling on a guided derivation, and the value one disagreement drops it to.
 *
 * **Never 1.** A confidence of 1 on this path would say the twelve taps settled the question,
 * and the compatibility engine (F-028) weights by exactly this number — so an overstated
 * confidence is not a cosmetic error, it is a recommendation given more authority than it
 * earned.
 */
export const CONFIDENCE_UNANIMOUS = 0.75;
export const CONFIDENCE_MAJORITY = 0.5;
/** No answers at all — a dimension nobody has evidence for. */
export const CONFIDENCE_NONE = 0;

/** How much room a range gets beyond the swatches that produced it. */
export const LIGHTNESS_PAD = 0.08;
export const CHROMA_PAD = 0.02;

/** Above this, a temperature bias is treated as a preference rather than as noise. */
export const TEMPERATURE_DECISIVE = 1 / 3;

/** At most this many slugs in a derived list. Longer is not more useful, it is less readable. */
export const LIST_LENGTH = 5;

/** Agreement → confidence. `agreed` is the size of the larger side, never the smaller. */
export function confidenceFrom(agreed: number, total: number): number {
  if (total === 0) return CONFIDENCE_NONE;
  return agreed === total ? CONFIDENCE_UNANIMOUS : CONFIDENCE_MAJORITY;
}

interface AxisTally {
  /** How many times the person chose the `a` pole. */
  readonly a: number;
  readonly total: number;
  /** The entries behind the options they chose. */
  readonly chosen: readonly PublishedEntry[];
}

function tally(
  axis: TrialAxis,
  answers: readonly TrialAnswer[],
  entry: (slug: string) => PublishedEntry | null,
): AxisTally {
  let a = 0;
  let total = 0;
  const chosen: PublishedEntry[] = [];
  for (const t of TRIALS) {
    if (t.axis !== axis) continue;
    const answer = answers.find((x) => x.trialId === t.id);
    if (answer === undefined) continue;
    total += 1;
    if (answer.pole === 'a') a += 1;
    const option = t.options.find((o) => o.pole === answer.pole);
    for (const slug of option?.slugs ?? []) {
      // A slug the bundle does not have is SKIPPED rather than defaulted. The corpus check in
      // `test/profile.test.ts` makes this unreachable in a shipped build; reaching it at
      // runtime would mean the bundle and the trials came from different generations, and a
      // substitute colour would silently change what the answer meant.
      const found = entry(slug);
      if (found !== null) chosen.push(found);
    }
  }
  return { a, total, chosen };
}

/** The larger side of a tally — the number `confidenceFrom` wants. */
const agreed = (t: AxisTally): number => Math.max(t.a, t.total - t.a);

/**
 * A range around the values the person actually chose.
 *
 * Split answers span further apart, so the range comes out **wider** — which is the honest
 * consequence of disagreement rather than a separate uncertainty knob. The pad is what stops
 * three answers at nearly the same lightness from producing a range narrower than any garment
 * could satisfy.
 */
function rangeOf(
  values: readonly number[],
  pad: number,
  ceiling: number,
): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: ceiling };
  const min = Math.max(0, Math.min(...values) - pad);
  const max = Math.min(ceiling, Math.max(...values) + pad);
  return { min, max };
}

/** Warm, cool, or neither — the taxonomy's own word for an entry. */
const temperatureOf = (e: PublishedEntry): string => e.entry.taxonomy.temperature;

/**
 * Derive a profile from a set of answers.
 *
 * `entries` is injected so the derivation is testable against a fixed set rather than against
 * whatever the bundle happens to hold — and so a test can construct the empty and the
 * one-sided cases, which are the ones a real corpus will not produce on demand.
 */
export function deriveProfile(
  id: string,
  answers: readonly TrialAnswer[],
  entries: readonly PublishedEntry[] = allEntries(),
): Profile {
  const bySlug = new Map(entries.map((e) => [e.entry.slug, e]));
  const entry = (slug: string): PublishedEntry | null => bySlug.get(slug) ?? null;

  const temperature = tally('temperature', answers, entry);
  const lightness = tally('lightness', answers, entry);
  const chroma = tally('chroma', answers, entry);
  const contrast = tally('contrast', answers, entry);

  /*
   * -1 fully cool … +1 fully warm, in steps of 2/3. With three trials the reachable values are
   * -1, -1/3, +1/3, +1 — so "leans warm" and "is warm" are different numbers, which is what
   * FR-30 asks a tendency to be. Zero is reachable only when nothing was answered.
   */
  const bias = temperature.total === 0 ? 0 : (2 * temperature.a) / temperature.total - 1;

  const lightnessRange = rangeOf(
    lightness.chosen.map((e) => e.derived.oklch[0]),
    LIGHTNESS_PAD,
    1,
  );
  const chromaRange = rangeOf(
    chroma.chosen.map((e) => e.derived.oklch[1]),
    CHROMA_PAD,
    1,
  );

  /*
   * Three high-contrast choices is a preference; two is a leaning. `medium` covers both middle
   * cases rather than splitting them, because a three-valued column cannot express "slightly
   * more than medium" and pretending it can would put a distinction in the data that the
   * question never asked about.
   */
  const contrastPreference =
    contrast.total === 0
      ? 'medium'
      : contrast.a === contrast.total
        ? 'high'
        : contrast.a === 0
          ? 'low'
          : 'medium';

  const confidence = {
    lightness: confidenceFrom(agreed(lightness), lightness.total),
    temperature: confidenceFrom(agreed(temperature), temperature.total),
    chroma: confidenceFrom(agreed(chroma), chroma.total),
    contrast: confidenceFrom(agreed(contrast), contrast.total),
  };

  const neutrals = deriveNeutrals(entries, lightnessRange, bias);
  const accents = deriveAccents(entries, bias);
  const avoid = deriveAvoid(entries, chromaRange, bias);

  return {
    id,
    method: 'guided',
    lightness: lightnessRange,
    temperatureBias: bias,
    chroma: chromaRange,
    contrast: contrastPreference,
    confidence: {
      ...confidence,
      /*
       * A LIST IS ONLY AS CONFIDENT AS THE DIMENSIONS IT WAS BUILT FROM, and the minimum is
       * the honest combiner: a neutrals list filtered by an uncertain temperature reading is
       * uncertain no matter how sure the lightness range was. A mean would launder the weak
       * half into the strong one, and the compatibility engine reads these numbers as weights.
       */
      neutrals: Math.min(confidence.lightness, confidence.temperature),
      accents: confidence.temperature,
      avoid: Math.min(confidence.temperature, confidence.chroma),
    },
    // Everything a derivation produces is `derived` by definition. `applyDerivation` is what
    // decides whether it may replace what is already there.
    origin: {
      lightness: 'derived',
      temperature: 'derived',
      chroma: 'derived',
      contrast: 'derived',
      neutrals: 'derived',
      accents: 'derived',
      avoid: 'derived',
    },
    neutrals,
    accents,
    avoid,
  };
}

/** Whether an entry's temperature sits with a bias. A `neutral` entry sits with anything. */
function agreesWithBias(e: PublishedEntry, bias: number): boolean {
  if (Math.abs(bias) < TEMPERATURE_DECISIVE) return true;
  const want = bias > 0 ? 'warm' : 'cool';
  const temp = temperatureOf(e);
  return temp === want || temp === 'neutral';
}

/**
 * Neutrals: low-chroma entries inside the lightness range, temperature-compatible.
 *
 * Ranked by **closeness to the middle of the range** rather than by chroma, because the
 * question a neutral answers is "what can I wear next to anything" and the middle of the
 * person's own range is the answer.
 */
export function deriveNeutrals(
  entries: readonly PublishedEntry[],
  lightness: { min: number; max: number },
  bias: number,
): readonly string[] {
  const middle = (lightness.min + lightness.max) / 2;
  return entries
    .filter((e) => e.entry.taxonomy.chromaBand === 'low')
    .filter((e) => e.derived.oklch[0] >= lightness.min && e.derived.oklch[0] <= lightness.max)
    .filter((e) => agreesWithBias(e, bias))
    .sort(
      (x, y) =>
        Math.abs(x.derived.oklch[0] - middle) - Math.abs(y.derived.oklch[0] - middle) ||
        x.entry.slug.localeCompare(y.entry.slug),
    )
    .slice(0, LIST_LENGTH)
    .map((e) => e.entry.slug);
}

/**
 * Accents: the most chromatic entries that agree with the temperature.
 *
 * **Deliberately NOT filtered by the lightness range.** An accent is a small area — a scarf, a
 * lining, a bag — and the lightness that suits next to the face is a constraint on the large
 * areas, not on the small ones. Filtering accents by it would return the same colours as
 * `neutrals` with more chroma, which is not what the word means.
 */
export function deriveAccents(entries: readonly PublishedEntry[], bias: number): readonly string[] {
  return entries
    .filter((e) => agreesWithBias(e, bias))
    .sort(
      (x, y) => y.derived.oklch[1] - x.derived.oklch[1] || x.entry.slug.localeCompare(y.entry.slug),
    )
    .slice(0, LIST_LENGTH)
    .map((e) => e.entry.slug);
}

/**
 * Avoid: entries that contradict the profile on both axes it can contradict.
 *
 * More chromatic than the tolerance **and** on the opposite side of a decisive temperature
 * bias. Requiring both is what keeps the list short and defensible: a colour that is merely
 * saturated is not difficult for someone with a wide chroma range, and a cool colour is not
 * difficult for someone who leans warm only slightly.
 *
 * **An indecisive bias produces a chroma-only list**, and where even that finds nothing the
 * list is empty. An empty avoid-list is a real answer — "nothing in this corpus contradicts
 * what you told us" — and inventing entries to fill it would be the product asserting a
 * difficulty it has no evidence for.
 */
export function deriveAvoid(
  entries: readonly PublishedEntry[],
  chroma: { min: number; max: number },
  bias: number,
): readonly string[] {
  const decisive = Math.abs(bias) >= TEMPERATURE_DECISIVE;
  const opposite = bias > 0 ? 'cool' : 'warm';
  return entries
    .filter((e) => e.derived.oklch[1] > chroma.max)
    .filter((e) => !decisive || temperatureOf(e) === opposite)
    .sort(
      (x, y) => y.derived.oklch[1] - x.derived.oklch[1] || x.entry.slug.localeCompare(y.entry.slug),
    )
    .slice(0, LIST_LENGTH)
    .map((e) => e.entry.slug);
}

/** Whether every trial has an answer. The screen will not finish until this is true. */
export function isComplete(answers: readonly TrialAnswer[]): boolean {
  return TRIALS.every((t) => answers.some((a) => a.trialId === t.id));
}

/** How many trials remain. For the progress indicator, and for the reason on a disabled button. */
export function remaining(answers: readonly TrialAnswer[]): number {
  return TRIALS.filter((t) => !answers.some((a) => a.trialId === t.id)).length;
}

export { TRIALS_PER_AXIS };
