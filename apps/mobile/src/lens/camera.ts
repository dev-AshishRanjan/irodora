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
 *
 * ## The cap is read in the BODY, and it threw on every frame when it was not (F-138)
 *
 * This was `max = MAX_SAMPLES_PER_FRAME` — a parameter default — and the Lens showed
 * *"the frame processor threw: Property 'MAX_SAMPLES_PER_FRAME' doesn't exist"* over a live
 * preview. The plugin captures the constant correctly; it is in `__closure`. What it also does
 * is unpack the closure as the **first statement of the body**:
 *
 * ```js
 * (function sampleStride(regionPixels, max = MAX_SAMPLES_PER_FRAME) {
 *   const { MAX_SAMPLES_PER_FRAME } = this.__closure;   // too late
 * ```
 *
 * A parameter default is evaluated **before** the body, in the parameter scope, which cannot
 * see a body-level `const`. The lookup falls through to the worklet runtime's global object,
 * where nothing of that name exists.
 *
 * So the rule, one layer in from F-116's: **a worklet may reference a captured variable only
 * from its body.** `verify-worklet-defaults.mjs` enforces it by reading the plugin's own
 * emitted code, and every test here passed throughout because they call this on the JS thread,
 * where the real module binding exists.
 */
export function sampleStride(regionPixels: number, max?: number): number {
  'worklet';
  const cap = max ?? MAX_SAMPLES_PER_FRAME;
  if (regionPixels <= cap) return 1;
  return Math.max(1, Math.ceil(regionPixels / cap));
}

/**
 * The preview's aspect ratio, width over height.
 *
 * A CONSTANT SHARED BY THREE PLACES, and that is the point of it being here: the screen sizes the
 * preview box with it, this file converts through it, and the reticle is drawn inside it. Three
 * copies of one number is three chances for the marks and the reading to disagree.
 */
export const PREVIEW_ASPECT = 3 / 4;

/**
 * A point in a rectangle, as fractions of its width and height.
 *
 * Structurally `PhotoPoint`, and named separately here because `photo.ts` reaches the store and
 * a worklet may not: this file is the one both threads can import.
 */
export interface FramePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a tap on the preview lands in the frame.
 *
 * ## The two rectangles are not the same rectangle
 *
 * A tap arrives as a fraction of the **preview**, which is a fixed 3:4 box. The region is sampled
 * from the **frame**, whose aspect is whatever the device negotiated. `resizeMode` is `cover`, so
 * a frame of any other shape is scaled to fill the box and the overflow is **cropped equally on
 * the long axis** — meaning the middle of the preview is the middle of the frame, and everything
 * else is not.
 *
 * Reading the region at the raw preview fraction would put the marks somewhere the engine is not
 * looking, which `viewfinder.tsx` already names as worse than having no marks at all.
 *
 * ```
 * frame wider than the preview          frame taller than the preview
 * ┌───────┬────────┬───────┐            ┌──────────────┐  ← cropped
 * │cropped│ shown  │cropped│            ├──────────────┤
 * └───────┴────────┴───────┘            │    shown     │
 *   visible = previewAspect/frameAspect ├──────────────┤
 *                                       └──────────────┘  ← cropped
 * ```
 *
 * ## `'worklet'`, and F-116 is why it says so itself
 *
 * `sampleFrame` calls this from the frame-processor thread, and **a worklet may only call other
 * worklets**. Without the directive the Worklets plugin captures this as an ordinary JS-thread
 * function and invoking it throws on the first frame — the failure that took the app down as soon
 * as the Lens opened. The caller being marked is not enough; anything a worklet reaches must say
 * so in its own source.
 */
export function framePoint(at: FramePoint, frameWidth: number, frameHeight: number): FramePoint {
  'worklet';
  // NOT `v < 0 ? 0 : v > 1 ? 1 : v`, which passes NaN straight through — both comparisons are
  // false for it. A press CAN report a coordinate this arithmetic cannot use, and a NaN here
  // becomes a NaN index into the pixel buffer and a colour read from nothing.
  // `'worklet'` ON THE HELPER TOO, and `verify-worklet-reach.mjs` is what said so. A worklet may
  // only call other worklets, and "the caller is marked" is not enough — F-116 crashed the app on
  // exactly this, one function deeper.
  const clamp = (v: number): number => {
    'worklet';
    return Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0.5;
  };
  // A frame with no size is not something to divide by. The centre is the honest answer and it
  // is where the region starts.
  if (frameWidth <= 0 || frameHeight <= 0) return { x: 0.5, y: 0.5 };

  const frameAspect = frameWidth / frameHeight;
  if (frameAspect > PREVIEW_ASPECT) {
    // Wider than the box: the sides are cropped, the full height is shown.
    const visible = PREVIEW_ASPECT / frameAspect;
    return { x: clamp((1 - visible) / 2 + clamp(at.x) * visible), y: clamp(at.y) };
  }
  // Taller than the box — or exactly its shape, where `visible` is 1 and this is the identity.
  const visible = frameAspect / PREVIEW_ASPECT;
  return { x: clamp(at.x), y: clamp((1 - visible) / 2 + clamp(at.y) * visible) };
}
