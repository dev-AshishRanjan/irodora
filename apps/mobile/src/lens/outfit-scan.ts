/**
 * The outfit scanner (FR-36, F-054).
 *
 * > *Estimates per-garment colours with confidence and returns the full score set.
 * > Classical CV only, with manual region override always available.*
 *
 * ## One region walk turned into three, and every judgement is an engine call
 *
 * A worn outfit photographed head to toe is vertically stratified: a top above trousers above
 * shoes. So the classical-CV question is **where are the two horizontal boundaries**, and it is
 * answered by measuring the colour of each row and looking for the two largest perceptual jumps
 * between adjacent rows. That is 1-D edge detection over a row profile — deterministic, and
 * explainable to somebody who asks why it put the line there.
 *
 * **No colour arithmetic lives here.** Row colours come from `aggregate`, which averages in
 * linear light [[averaging-non-linear-srgb-reads-too-dark]]; the jumps come from
 * `differenceOklch`, which routes through Lab because ΔE00 is defined there and not on OKLCh;
 * the per-band reading comes from `read`, which is the same function the other four capture
 * modes use. What this file adds is an `argmax` over numbers the engine produced.
 *
 * That boundary matters more here than almost anywhere: **a band-finder is exactly where
 * somebody inlines an average or a distance**, and a mobile-only re-implementation makes the
 * same fabric measure differently on two surfaces with both suites passing (E-008).
 *
 * ## The manual override is the only input path, which is the strongest form of it
 *
 * `scanOutfit` takes bands. It does not find them. `proposeBands` is a separate function whose
 * result is one legal argument among many, so *"manual region override always available"* is a
 * property of the API rather than a feature somebody remembered to add.
 *
 * ## What it refuses, and why each refusal exists
 *
 * | Situation | Why a number would be a lie |
 * |---|---|
 * | A frame with no real boundaries | Two largest jumps exist in a photograph of a wall |
 * | A frame too short for three bands | There is nothing to divide |
 * | A band with no usable pixels | **`aggregate([])` returns black**, with a quality assessment attached |
 * | Any slot unread | `scoreOutfit` would describe an outfit nobody is wearing |
 *
 * The third is not a style preference. `mean([])` is `0` in `@irodora/color-sampling`, on
 * purpose and correctly for its own callers — so a band whose every pixel was rejected produces
 * `rgb: [0, 0, 0]` and a confidence derived from a quality assessment of nothing. **Black,
 * reported as a measurement.** Zero usable pixels is not a low-confidence reading; it is no
 * reading, and it is refused before `read` is ever called.
 */

import { fromXyz, type Color } from '@irodora/color-core';
import { oklchToXyz } from '@irodora/color-spaces';
import { aggregate, partition, type Sample } from '@irodora/color-sampling';
import {
  OUTFIT_SLOTS,
  scoreOutfit,
  type Candidate,
  type OutfitComponent,
  type OutfitPiece,
  type OutfitScore,
  type OutfitSlot,
  type PersonalProfile,
  type RuleSet,
} from '@irodora/recommendation';
import { differenceOklch } from '../engine';
import { readingOklch } from '../profile/photo';
import { read } from './modes';
import type { CaptureSpace, LensReading } from './reading';

/**
 * A frame, as the scanner sees it: samples in row-major order.
 *
 * **Still no field a buffer could be assigned to.** `Sample` is four numbers, so this is a
 * larger `Region` and not a new kind of thing — the rule that only numbers cross the bridge
 * (NFR-12, ADR-0026) is unchanged by walking more of the frame.
 */
export interface ScanFrame {
  readonly samples: readonly Sample[];
  readonly width: number;
  readonly height: number;
  readonly space: CaptureSpace;
}

/** One horizontal band, `top` inclusive and `bottom` exclusive, in rows. */
export interface Band {
  readonly slot: OutfitSlot;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The ΔE00 below which a jump between adjacent rows is not a garment edge.
 *
 * **A judgement, and labelled as one** — unlike `DUPLICATE_DELTA_E`, which FR-44 states. Two
 * largest jumps exist in any frame, including a photograph of a wall, so without a floor this
 * would always find an outfit.
 *
 * 5 is the value at which two colours in the same category are no longer called the same thing
 * (FR-44's number, reused here as a lower bound rather than re-derived): if the top and the
 * trousers are closer than that, nothing downstream would treat them as different colours
 * either, and drawing a line between them claims a distinction the rest of the product does not
 * make.
 *
 * Exported because **"three garments found" means nothing without it.**
 */
export const BOUNDARY_DELTA_E = 5;

/**
 * The fewest rows a band may span.
 *
 * Two adjacent rows either side of a real edge both show a large jump, so without a minimum
 * separation the two "largest" jumps are usually one edge counted twice — and the result is
 * two garments and a one-row sliver. A twelfth of the frame is the smallest a garment can be
 * and still be worth measuring; it is a shape decision, not a measurement.
 */
export const MIN_BAND_FRACTION = 1 / 12;

/** Why no bands could be proposed. */
export type ProposalRefusal = 'malformed' | 'tooShort' | 'noBoundaries';

/** Bands, or the reason there are none — with the measurement behind the refusal. */
export type BandProposal =
  | { readonly found: true; readonly bands: readonly Band[]; readonly strengths: readonly number[] }
  | {
      readonly found: false;
      readonly reason: ProposalRefusal;
      /** The two best jumps that were measured. Empty when nothing could be measured at all. */
      readonly strengths: readonly number[];
    };

/** Why a slot produced no reading. */
export type SlotRefusal = 'noPixels' | 'outsideFrame';

/** One garment's result. A reading, or the reason there is not one. */
export type SlotResult =
  | { readonly slot: OutfitSlot; readonly read: true; readonly reading: LensReading }
  | { readonly slot: OutfitSlot; readonly read: false; readonly reason: SlotRefusal };

export interface OutfitScan {
  readonly slots: readonly SlotResult[];
  /**
   * The six-component score, or `null` when any slot went unread.
   *
   * **Never a score over two garments and a guess.** `scoreOutfit` describes a composed outfit;
   * handing it a partial one returns a number about an outfit nobody is wearing, and the
   * number would look exactly like a real one.
   */
  readonly score: OutfitScore | null;
}

/** Everything the score needs that a frame does not carry. */
export interface ScanContext {
  readonly profile: PersonalProfile;
  readonly rules: RuleSet;
  readonly reference: readonly Candidate[];
  readonly weights: Readonly<Record<OutfitComponent, number>>;
}

/** The samples of one row. Row-major, so a row is a contiguous slice. */
const rowOf = (frame: ScanFrame, row: number): readonly Sample[] =>
  frame.samples.slice(row * frame.width, (row + 1) * frame.width);

/**
 * A row's colour in OKLCh, through the engine and through the capture space.
 *
 * `trimmedMean` rather than `mean`: a row crossing a button, a zip or a fold should not have
 * its colour pulled by the few pixels that are not fabric, and the trimmed mean is what the
 * capture modes already use for the same reason.
 */
function rowColour(frame: ScanFrame, row: number): readonly [number, number, number] {
  const { trimmedMean } = aggregate(rowOf(frame, row));
  return readingOklch({
    rgb: [trimmedMean.r, trimmedMean.g, trimmedMean.b],
    space: frame.space,
  });
}

/**
 * Where the garments change, by measurement (FR-36's *"classical CV only"*).
 *
 * ## The algorithm, in one paragraph
 *
 * Take each row's colour. Take the ΔE00 between each adjacent pair — that is the row profile. The
 * two largest values in it, subject to a minimum separation, are the boundaries. Reject the
 * result if either is weaker than `BOUNDARY_DELTA_E`.
 *
 * ## Why the minimum separation is not optional
 *
 * A real edge produces a large jump at the row that crosses it **and** large jumps either side,
 * because a row that is half top and half trousers differs from both. Taking the two largest
 * values without a separation therefore returns one edge twice, and a band one row tall. The
 * separation is what makes "two boundaries" mean "two garments".
 */
export function proposeBands(frame: ScanFrame): BandProposal {
  if (frame.width <= 0 || frame.height <= 0 || frame.samples.length !== frame.width * frame.height)
    return { found: false, reason: 'malformed', strengths: [] };

  const minBand = Math.max(1, Math.floor(frame.height * MIN_BAND_FRACTION));
  // Three bands of the minimum height, and a boundary needs a row either side of it.
  if (frame.height < minBand * 3) return { found: false, reason: 'tooShort', strengths: [] };

  const colours = Array.from({ length: frame.height }, (_, row) => rowColour(frame, row));
  /*
   * `profile[i]` is the jump between row i and row i+1 — so a boundary AT index i means row
   * i+1 starts a new band. Keeping that off-by-one in one place is why the profile is built
   * separately rather than inline in the search below.
   */
  const jumps = colours
    .slice(0, -1)
    .map((colour, i) => differenceOklch(colour, colours[i + 1] ?? colour));

  const first = strongestJump(jumps, minBand, frame.height - minBand, []);
  if (first === null) return { found: false, reason: 'noBoundaries', strengths: [] };
  const second = strongestJump(jumps, minBand, frame.height - minBand, [first]);
  if (second === null)
    return { found: false, reason: 'noBoundaries', strengths: [jumps[first] ?? 0] };

  const [upper, lower] = first < second ? [first, second] : [second, first];
  const strengths = [jumps[upper] ?? 0, jumps[lower] ?? 0];
  if (strengths.some((s) => s < BOUNDARY_DELTA_E))
    return { found: false, reason: 'noBoundaries', strengths };

  return {
    found: true,
    strengths,
    bands: [
      { slot: 'top', top: 0, bottom: upper + 1 },
      { slot: 'trouser', top: upper + 1, bottom: lower + 1 },
      { slot: 'shoe', top: lower + 1, bottom: frame.height },
    ],
  };
}

/**
 * The largest jump in `[low, high)` that is at least `low` rows from every jump already taken.
 *
 * Returns an index into the jump profile, or `null` when no candidate survives the separation.
 */
function strongestJump(
  jumps: readonly number[],
  separation: number,
  high: number,
  taken: readonly number[],
): number | null {
  let best: number | null = null;
  for (let i = separation - 1; i < high && i < jumps.length; i += 1) {
    if (taken.some((t) => Math.abs(t - i) < separation)) continue;
    if (best === null || (jumps[i] ?? 0) > (jumps[best] ?? 0)) best = i;
  }
  return best;
}

/**
 * A reading as a `Color`, with the provenance ADR-0005 requires.
 *
 * **`estimated`, never `reference`, and the four conditions travel with it.** A camera estimate
 * recorded as a reference would be indistinguishable downstream from a published value —
 * including to anything that later decided what it was safe to claim.
 *
 * Exported for the test that pins this decision to `wardrobe.ts`'s. That file builds a stored
 * *row* from a reading and this one builds a `Color`; they are different functions sharing one
 * decision, and a test asserting they agree is stronger than a shared helper with one caller,
 * because it fails if either drifts.
 */
export function colorFromReading(reading: LensReading): Color {
  return fromXyz(oklchToXyz(readingOklch(reading)), {
    source: 'estimated',
    confidence: reading.confidence,
    originSpace: 'oklch',
    conditions: {
      illuminant: reading.illumination,
      quality: reading.quality,
      sampleCount: reading.usableSamples,
      variance: reading.variance,
    },
  });
}

/**
 * Read every band and score what they make together.
 *
 * `garment-scan` is the mode, not `precision`: the person framed an outfit, not a swatch, and
 * `MODE_CEILING` is what stops this claiming the certainty of a deliberate single capture.
 */
export function scanOutfit(
  frame: ScanFrame,
  bands: readonly Band[],
  context: ScanContext,
): OutfitScan {
  const slots = OUTFIT_SLOTS.map((slot): SlotResult => {
    const band = bands.find((b) => b.slot === slot);
    if (band === undefined || band.top < 0 || band.bottom > frame.height || band.bottom <= band.top)
      return { slot, read: false, reason: 'outsideFrame' };

    const samples = frame.samples.slice(band.top * frame.width, band.bottom * frame.width);
    /*
     * PARTITION BEFORE `read`, not inside it. `read` calls `partition` too and would happily
     * aggregate what survives — but `aggregate([])` returns black, so a band whose every pixel
     * was clipped comes back as a confident measurement of nothing. Asking first is the only
     * way to tell "dark garment" from "no garment".
     */
    const { kept } = partition(samples);
    if (kept.length === 0) return { slot, read: false, reason: 'noPixels' };

    return {
      slot,
      read: true,
      reading: read('garment-scan', {
        region: { samples, width: frame.width, height: band.bottom - band.top },
        space: frame.space,
      }),
    };
  });

  const readings = slots.filter((s): s is Extract<SlotResult, { read: true }> => s.read);
  if (readings.length !== OUTFIT_SLOTS.length) return { slots, score: null };

  const pieces: OutfitPiece[] = readings.map((s) => ({
    slot: s.slot,
    color: colorFromReading(s.reading),
  }));

  return {
    slots,
    score: scoreOutfit(pieces, context.reference, context.profile, context.rules, context.weights),
  };
}
