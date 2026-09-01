/**
 * The camera seam: what the worklet does, what crosses, and the one question a device has to
 * answer.
 *
 * ## The architecture, and why it is drawn here
 *
 * ```
 *  worklet thread                    │  JS thread
 *  ────────────────────────────────  │  ──────────────────────────
 *  frame arrives (yuv)               │
 *  read pixelFormat + colour space   │
 *  convert in the processor          │
 *  sample a BOUNDED set of pixels  ──┼─▶  @irodora/color-sampling
 *  dispose the frame                 │    → LensReading (numbers only)
 * ```
 *
 * **The frame never crosses.** A 1080p frame is ~2 million pixels; what crosses is a bounded
 * sample — FR-15's floor is 1000, so roughly three orders of magnitude smaller, and it is a
 * flat array of numbers with no reference to the buffer it came from. The frame is disposed on
 * the worklet thread, where it was created.
 *
 * ## The open question, recorded because it needs a device and not an opinion
 *
 * **Can the engine run inside the worklet?** A worklet cannot call arbitrary JavaScript, so
 * `@irodora/color-sampling` may not be reachable from one. Two honest answers, and the third
 * option is the one that must not happen:
 *
 * 1. **Sample in the worklet, aggregate on the JS thread** — what this module does. The maths
 *    stays in the engine; a bounded array crosses.
 * 2. **Compile the engine for the worklet runtime**, so the whole reduction happens there and
 *    only the reading crosses. Strictly better if it works, and it needs a device to find out.
 * 3. **Reimplement the arithmetic in the worklet.** Forbidden — `apps/mobile/AGENTS.md`, and
 *    [E-008](../../../../.harness/state/effects.json) records that no single-platform test can
 *    see the resulting divergence. There is a lint that fails the build on it.
 *
 * (1) and (2) share this seam, so choosing (2) later is an optimisation rather than a rewrite.
 * That is why the seam is drawn here rather than after someone has a phone.
 */

import type { CaptureSpace } from './reading';
import type { Sample } from '@irodora/color-sampling';

/**
 * The most pixels that may cross in one go.
 *
 * Above FR-15's floor of 1000 with headroom for rejection — the region is partitioned *after*
 * it crosses, so some of what is sent will be discarded, and sending exactly 1000 would leave
 * fewer than 1000 usable.
 */
export const MAX_SAMPLES_PER_FRAME = 2000;

/**
 * What a frame processor is allowed to hand back.
 *
 * Deliberately not `unknown[]` or a buffer: the shape is fixed, bounded, and contains nothing
 * that could reference the frame. The **type** is what keeps the frame on its own thread.
 */
export interface FrameSample {
  readonly samples: readonly Sample[];
  readonly space: CaptureSpace;
  /** Region dimensions, so quality assessment can measure blur and uniformity spatially. */
  readonly width: number;
  readonly height: number;
}

/**
 * Read the capture colour space from whatever the platform reported.
 *
 * **Never assumes.** `apps/mobile/AGENTS.md` states the rule with the wrong version beside it:
 * branching on `Platform.OS === 'ios'` to "assume P3" is an assumption about what iOS means,
 * and it ages badly — it was wrong before P3 devices existed and will be wrong again.
 *
 * An unrecognised value is `unknown`, which caps confidence rather than falling back to sRGB.
 * Falling back would produce a confident answer that is wrong in exactly the saturated colours
 * this product exists for.
 */
export function readCaptureSpace(reported: string | null | undefined): CaptureSpace {
  if (reported === null || reported === undefined) return 'unknown';
  const normalised = reported.toLowerCase().replace(/[\s_]/gu, '-');

  /*
   * A PIXEL FORMAT IS NOT A COLOUR SPACE, and this is where that could have been confused.
   *
   * `rgb-rgb-8-bit` is a VisionCamera 5 pixel format — a memory layout — and it contains the
   * substring `rgb-8`, which the sRGB rule below would have accepted. That is precisely the
   * assumption `apps/mobile/AGENTS.md` forbids: it would report a confident sRGB reading for a
   * frame whose colour space nobody stated.
   *
   * Anything naming a bit depth is a layout. Rejected first, so the rules below cannot see it.
   * F-097 found this while wiring the real API; nothing had ever passed such a string in.
   */
  if (normalised.includes('bit') || normalised.includes('bayer')) return 'unknown';

  // `p3-d65` is VisionCamera 5's own name for Display-P3 (F-097). Added because the session
  // reports it, not because it looked plausible — the vocabulary a reader accepts should come
  // from what the platform actually says.
  if (normalised.includes('display-p3') || normalised === 'p3' || normalised.startsWith('p3-'))
    return 'display-p3';
  if (normalised.includes('srgb') || normalised.includes('rgb-8')) return 'srgb';
  // Rec.2020, Adobe RGB, Dolby Vision, an Apple Log variant, or a string nobody here has seen.
  // Not sRGB, and not a guess.
  return 'unknown';
}

/**
 * How many pixels to step over when walking a region, so the sample stays bounded.
 *
 * Returns at least 1. A stride of 0 would loop forever on the worklet thread, which on a
 * camera pipeline is not a hang anyone can debug — the preview simply stops.
 *
 * ## `'worklet'`, and the app crashed without it
 *
 * `sampleFrame` in `viewfinder.tsx` is a worklet — it runs on the frame-processor thread — and
 * it calls this. **A worklet may only call other worklets.** Without this directive the
 * Worklets babel plugin captures this as an ordinary JS-thread function, and invoking it from
 * the frame thread throws the moment the first frame arrives, which took the app down as soon
 * as the Lens opened.
 *
 * It is still an ordinary function everywhere else: the directive makes it *available* on a
 * worklet runtime, it does not stop the JS thread calling it, which is why the tests below
 * exercise it directly and always passed.
 *
 * **Nothing in this repository can catch this.** Jest has one runtime and no worklet boundary,
 * so a missing directive is invisible to every gate — the same shape as
 * `a-global-that-exists-in-your-test-runtime-is-invisible-to-every-check`. The rule to carry:
 * anything a worklet reaches must say so in its own source, and the caller being marked is not
 * enough.
 */
export function sampleStride(regionPixels: number, max = MAX_SAMPLES_PER_FRAME): number {
  'worklet';
  if (regionPixels <= max) return 1;
  return Math.max(1, Math.ceil(regionPixels / max));
}
