/**
 * The capture pipeline, as the working state shows it (F-236; ADR-0128 D4 and D5). Pure.
 *
 * `27` draws the Lens at work as a ring and two monospace lines: the step under way, with an
 * ellipsis, and the step that follows, naming its illuminant. What `27` prints there are claims an
 * RGB camera cannot make (E2, §4 row 27); this is what the pipeline really does:
 *
 * 1. **acquire the pixels** — wait for a camera frame, or decode the chosen photo;
 * 2. **convert them** — to OKLCh under the canonical white, D65.
 *
 * The ring shows the share of those steps done (D4): a value somebody computed, never a guessed
 * percentage. Acquisition is the only step that takes time a person can see — conversion is
 * synchronous — so the ring reads 0 while the Lens waits, and the reading replaces it (R4).
 */

import { CANONICAL_ILLUMINANT } from '@irodora/color-spaces';
import type { MessageKey } from '../i18n';

/**
 * The correlated colour temperature of CIE illuminant D65, in kelvin.
 *
 * **6504 K, the value CIE colorimetry publishes for it.** D65 was defined at a nominal 6500 K; when
 * the second radiation constant c₂ was revised in 1968 from 1.4380 to 1.4388 × 10⁻² m·K, the same
 * spectral distribution came to sit at 6500 × 1.4388 / 1.4380 ≈ 6504 K. `lens-pipeline.test` holds
 * the figure against McCamy's approximation from the engine's own D65 chromaticity, so a change of
 * canonical white fails there. `27` prints 5500 K, which is D55's (E2).
 */
export const D65_CCT_K = 6504;

/** Where the pixels come from. */
export type CaptureSource = 'camera' | 'photo';

/** A step of the pipeline. */
export type PipelineStep = 'frame' | 'decode' | 'convert';

/** The pipeline's two steps, in order: acquire the pixels, then convert them. */
export function captureSteps(source: CaptureSource): readonly [PipelineStep, PipelineStep] {
  return [source === 'camera' ? 'frame' : 'decode', 'convert'];
}

/** The ring's value: the share of the steps done (D4). */
export function pipelineProgress(steps: readonly PipelineStep[], done: number): number {
  if (!Number.isInteger(done) || done < 0 || done > steps.length || steps.length === 0)
    throw new RangeError(
      `pipelineProgress: ${String(done)} of ${String(steps.length)} steps is not a count of steps done`,
    );
  return done / steps.length;
}

/** What each step says, by catalogue key. */
const STEP_KEYS: Readonly<Record<PipelineStep, MessageKey>> = {
  frame: 'lens.pipeline.frame',
  decode: 'lens.pipeline.decode',
  convert: 'lens.pipeline.convert',
};

/**
 * A step's words. The conversion names the canonical illuminant and its temperature from the
 * engine and this module, never from copy, so a translation cannot print a different white.
 */
export function stepText(step: PipelineStep, say: (key: MessageKey) => string): string {
  const words = say(STEP_KEYS[step]);
  return step === 'convert' ? `${words}: ${CANONICAL_ILLUMINANT} (${String(D65_CCT_K)}K)` : words;
}

/** The ring's value in words, read after its name: *Step 1 / 2*. */
export function progressText(
  steps: readonly PipelineStep[],
  done: number,
  say: (key: MessageKey) => string,
): string {
  pipelineProgress(steps, done);
  // The step under way is the one after those done; a finished pipeline is on its last.
  return `${say('lens.pipeline.step')} ${String(Math.min(done + 1, steps.length))} / ${String(steps.length)}`;
}
