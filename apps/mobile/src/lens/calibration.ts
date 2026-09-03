/**
 * A reading, corrected against a card, as a `Color` labelled `calibrated` (FR-16).
 *
 * The maths is `@irodora/color-calibration`; this file is the boundary — it decides what the
 * app is allowed to say about a corrected reading, which is a product question rather than a
 * colour-science one.
 *
 * ## The confidence does NOT go up, and that is deliberate
 *
 * `docs/architecture/color-engine.md` says calibrated mode "raises the confidence ceiling".
 * It does not, here, and the deviation has an ADR
 * ([ADR-0087](../../../../docs/adr/0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md)).
 *
 * The short version: raising it would assert that correction improves accuracy — which is
 * **NFR-2**, which is `attested` on F-053 and discharged by F-063's device matrix session, and
 * which no measurement has yet demonstrated. A number that goes up because the code path
 * changed is a claim the system cannot support (golden rule 11, ADR-0031). What the correction
 * DOES produce is a residual, and the residual is recorded — so when the session happens, the
 * evidence is already sitting beside every calibrated reading.
 *
 * ## An unknown capture space cannot be corrected
 *
 * A correction is solved in a stated space and applied in the same one. Applying an sRGB-solved
 * matrix to values that turned out to be Display P3 is a wrong answer that looks like a right
 * one, and `readCaptureSpace` exists precisely because this app does not guess which it is
 * ([`camera.ts`](camera.ts)). So `unknown` is refused rather than assumed — the same rule,
 * applied where it costs something.
 */

import { fromXyz, type Color } from '@irodora/color-core';
import { linearSrgbToXyz } from '@irodora/color-spaces';
import { applyCorrection, type Correction, type ObservedSpace } from '@irodora/color-calibration';

import type { CaptureSpace, LensReading } from './reading';

/** Why a reading could not be corrected. Reported, never thrown — see `calibrate`. */
export type CalibrationRefusal = 'unknownSpace' | 'spaceMismatch';

/** The outcome of correcting one reading. */
export type CalibratedReading =
  | { readonly ok: true; readonly color: Color; readonly correction: Correction }
  | { readonly ok: false; readonly why: CalibrationRefusal; readonly instruction: string };

/**
 * The capture space as the solver names it, or `null` when it cannot be named.
 *
 * Exported because the mapping is the whole content of the `unknown` decision, and a test that
 * pins it is worth more than one that pins the branch that uses it.
 */
export function observedSpace(space: CaptureSpace): ObservedSpace | null {
  if (space === 'srgb') return 'srgb';
  if (space === 'display-p3') return 'display-p3';
  return null;
}

/**
 * Correct a reading with a solved correction.
 *
 * Reports rather than throws, for the reason `verifyCard` does: a viewfinder polls, and a
 * caller finding out that this camera will not say what space it captures in should not be
 * doing it by catching an exception once per frame.
 */
export function calibrate(reading: LensReading, correction: Correction): CalibratedReading {
  const space = observedSpace(reading.space);

  if (space === null)
    return {
      ok: false,
      why: 'unknownSpace',
      instruction:
        'This camera does not report which colour space it captures in, so a correction ' +
        'cannot be applied to it. The reading is still available uncalibrated.',
    };

  if (space !== correction.space)
    return {
      ok: false,
      why: 'spaceMismatch',
      instruction:
        `The correction was solved for ${correction.space} and this reading is ${space}. ` +
        'Scan the card again in this mode.',
    };

  const corrected = applyCorrection(correction, [reading.rgb[0], reading.rgb[1], reading.rgb[2]]);

  return {
    ok: true,
    correction,
    /*
     * `calibrated`, and the four conditions travel with it — `CapturedSource` requires them
     * and ADR-0005 makes that structural rather than a note. The confidence is the READING's,
     * unchanged: see the header, and ADR-0087.
     *
     * `originSpace: 'linear-srgb'` is not a lie of convenience — the correction's output IS
     * linear sRGB, and recording the space a value arrived in is what makes a round-trip
     * honest only back to it.
     */
    color: fromXyz(linearSrgbToXyz(corrected), {
      source: 'calibrated',
      confidence: reading.confidence,
      originSpace: 'linear-srgb',
      conditions: {
        illuminant: reading.illumination,
        quality: reading.quality,
        sampleCount: reading.usableSamples,
        variance: reading.variance,
      },
    }),
  };
}
