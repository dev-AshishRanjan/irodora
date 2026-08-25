/**
 * One camera reading into a profile the person has not agreed to yet.
 *
 * > *Photo-assisted setup — camera provides an initial estimate the user corrects. Every
 * > derived dimension is presented as editable with its confidence; the profile is never
 * > finalised without user confirmation.* — FR-27
 *
 * ## What a single reading can honestly support, and the one it cannot
 *
 * | Dimension | From the reading |
 * |---|---|
 * | `lightness` | a range around the reading's own OKLCh **L** |
 * | `temperature` | a bias from its **hue** |
 * | `chroma` | a tolerance ceiling from its own **C** |
 * | `contrast` | **nothing** |
 *
 * **`contrast` abstains, at confidence 0.** A contrast preference is about the separation
 * between two garments, and a reading of one region does not contain a second colour to be
 * separated from. A photo path that answered all seven would be inventing exactly the dimension
 * nobody would check — and the guided path is right there for anyone who wants it answered.
 *
 * That is the difference between a gap and a lie: the estimate says *"not asked yet"* against
 * that row, in the same words the guided path uses for a dimension it never reached.
 *
 * ## Nothing here can hold an image
 *
 * The input is a `LensReading`, and
 * [`../lens/reading.ts`](../lens/reading.ts) records why that is the mechanism rather than the
 * convention: **there is no field a frame, a buffer, a path or a URI could be assigned to**, so
 * passing one does not compile. This module inherits that guarantee by taking the type; it does
 * not restate it, and `test/profile.test.ts` asserts it with `ts-expect-error` so the assertion
 * fails on an unused directive if it ever stops being true.
 *
 * ## No colour maths
 *
 * One conversion, through `@irodora/color-spaces`, at the boundary. Everything after it is
 * comparison and clamping. `apps/mobile/AGENTS.md`: *the engine is imported, never ported*, and
 * [E-008](../../../../.harness/state/effects.json) records that a mobile-side reimplementation
 * makes the same surface measure differently on two platforms with no single-platform test able
 * to see it.
 */

import { displayP3ToXyz, srgbToXyz, xyzToOklch, type Triple } from '@irodora/color-spaces';
import type { PublishedEntry } from '@irodora/corpus';
import { allEntries } from '../corpus';
import type { LensReading } from '../lens/reading';
import type { Profile } from './dimensions';
import {
  CHROMA_PAD,
  CONFIDENCE_MAJORITY,
  CONFIDENCE_NONE,
  deriveAccents,
  deriveAvoid,
  deriveNeutrals,
  LIGHTNESS_PAD,
} from './derive';

/**
 * The most confidence a photo estimate may carry, whatever the capture was like.
 *
 * **0.5 — below `CONFIDENCE_MAJORITY`**, so an estimate from one reading never outranks a
 * guided answer that two people out of three disagreed on.
 *
 * A **convention, not a measurement** (NFR-2). NFR-23 requires this path to be validated across
 * every ITA° band before anybody may say how well it performs, and nobody has: F-037 owns that
 * study and it has not run. A higher ceiling would be a number with nothing behind it, and
 * [ADR-0010](../../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) §2 is
 * blunt about why — under a warm bulb it is the *lighting* that gets measured.
 *
 * **The day this constant can change is the day F-037 publishes per-band accuracy.** Until
 * then it is not a threshold to tune, and raising it is a claim rather than a configuration
 * change.
 */
export const PHOTO_CEILING = 0.5;

/** How wide a lightness range one reading justifies, either side of the reading's own L. */
export const PHOTO_LIGHTNESS_SPREAD = 0.18;

/**
 * How far from neutral a hue has to sit before it is called warm or cool, in OKLCh degrees
 * from the yellow–blue axis.
 *
 * Warm is the arc around 60° and cool the arc around 240°, and the bias is how far along the
 * arc the reading fell rather than which half it landed in — so a hue near the boundary
 * produces a bias near zero rather than a confident answer that flips on a degree.
 */
export const WARM_HUE = 60;
export const COOL_HUE = 240;

/**
 * The reading in OKLCh, converted through the space the platform reported.
 *
 * `unknown` converts **as sRGB, deliberately and not silently**. A value has to be produced,
 * sRGB is the only defensible default for a consumer capture, and the cost is already priced
 * in: `SPACE_CONFIDENCE_CEILING.unknown` is 0.6 and `reading.confidence` carries it before this
 * function is ever called. What `apps/mobile/AGENTS.md` forbids is *assuming* the space — this
 * branch does not assume it, it records that the platform declined to say and pays for it.
 */
export function readingOklch(reading: LensReading): Triple {
  const rgb: Triple = [reading.rgb[0], reading.rgb[1], reading.rgb[2]];
  const xyz = reading.space === 'display-p3' ? displayP3ToXyz(rgb) : srgbToXyz(rgb);
  return xyzToOklch(xyz);
}

/**
 * Signed distance around the hue circle from `from` to `to`, in degrees, in [-180, 180].
 *
 * Circular, because 350° and 10° are 20° apart. Written out rather than reached for from the
 * engine because it is not colour arithmetic — it is the arithmetic of a circle, and the engine
 * has no opinion about how far a hue is from an arbitrary reference this module chose.
 */
function hueGap(from: number, to: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return d;
}

/**
 * Warm–cool bias in [-1, +1] from a hue.
 *
 * Distance to the warm reference against distance to the cool one, normalised. A hue equidistant
 * from both returns 0 — which is the honest answer for a colour that is neither, and the answer
 * a threshold comparison would never give.
 */
export function biasFromHue(hue: number): number {
  const toWarm = Math.abs(hueGap(hue, WARM_HUE));
  const toCool = Math.abs(hueGap(hue, COOL_HUE));
  const span = toWarm + toCool;
  if (span === 0) return 0;
  return (toCool - toWarm) / span;
}

/** Clamp to a closed interval. */
const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/**
 * A profile proposed from one reading. **Nothing about it is saved by producing it.**
 *
 * `id` is passed in so an estimate can update the profile this device already has rather than
 * minting a second one — the same reason the guided flow holds its id in state.
 *
 * `entries` is injected for the same reason it is on `deriveProfile`: so the derivation is
 * testable against a fixed set, including the empty one.
 */
export function estimateFromReading(
  id: string,
  reading: LensReading,
  entries: readonly PublishedEntry[] = allEntries(),
): Profile {
  const [l, c, h] = readingOklch(reading);

  /*
   * EVERY DIMENSION TAKES THE SAME CEILING, and it is the minimum of the two — never a product.
   * The reading's own confidence already combines the capture space, the illumination and the
   * quality by taking a minimum (`cappedConfidence`), for the reason that file gives: three
   * ceilings multiplied produce a number lower than any single assessment justified, which is a
   * different lie from the one being avoided but still a lie.
   */
  const confidence = Math.min(PHOTO_CEILING, reading.confidence);

  const lightness = {
    min: clamp(l - PHOTO_LIGHTNESS_SPREAD, 0, 1),
    max: clamp(l + PHOTO_LIGHTNESS_SPREAD, 0, 1),
  };

  /*
   * The bias is SCALED BY THE CONFIDENCE, and this is the one place the ceiling does more than
   * label the answer. A washed-out reading under an unknown illuminant should not produce
   * "fully warm" with a quiet 0.3 beside it — the estimate itself should be nearer the middle,
   * because that is what a poor reading actually supports. The lightness and chroma ranges need
   * no equivalent: they are already centred on the reading, and widening them by uncertainty
   * would produce a range that excludes nothing.
   */
  const bias = clamp(biasFromHue(h) * (confidence / PHOTO_CEILING), -1, 1);

  const chroma = { min: 0, max: clamp(c + CHROMA_PAD, 0, 1) };

  const listConfidence = confidence;

  return {
    id,
    method: 'photo-assisted',
    lightness,
    temperatureBias: bias,
    chroma,
    /*
     * The abstention. `medium` is the value the column must hold — it is NOT NULL, and every
     * value in the union is a claim — so the honest signal is the CONFIDENCE, which is zero and
     * renders as "not asked yet" in the same words the guided path uses for a trial nobody
     * answered. The person sets it, or they run the comparisons.
     */
    contrast: 'medium',
    confidence: {
      lightness: confidence,
      temperature: confidence,
      chroma: confidence,
      contrast: CONFIDENCE_NONE,
      neutrals: listConfidence,
      accents: listConfidence,
      avoid: listConfidence,
    },
    origin: {
      lightness: 'derived',
      temperature: 'derived',
      chroma: 'derived',
      contrast: 'derived',
      neutrals: 'derived',
      accents: 'derived',
      avoid: 'derived',
    },
    // The same three functions the guided path uses, not a second set that agrees today. A
    // list that differed by which path produced it would make "your neutrals" mean two things.
    neutrals: deriveNeutrals(entries, lightness, bias),
    accents: deriveAccents(entries, bias),
    avoid: deriveAvoid(entries, chroma, bias),
  };
}

/**
 * Whether an estimate is confident enough to be worth showing at all.
 *
 * A reading the capture assessment already called unusable produces an estimate built on it,
 * and offering that as a starting point wastes a correction on noise. The threshold is the
 * reading's own — this adds no second opinion about capture quality, which
 * `@irodora/color-sampling` owns.
 */
export function worthOffering(reading: LensReading): boolean {
  return reading.confidence > CONFIDENCE_NONE && reading.usableSamples > 0;
}

export { CONFIDENCE_MAJORITY, LIGHTNESS_PAD };
