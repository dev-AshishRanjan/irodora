/**
 * How far a reading is from the target, and which way (FR-74, F-201).
 *
 * F-200 armed the target. This is the half that answers against it, and it completes the
 * report: *"scan a colour and check its similarity/difference against a target colour."*
 *
 * ## Nothing here computes a difference of its own
 *
 * - **ΔE00** — `deltaE00` from `@irodora/color-difference`, CIELAB (D65), the same one
 *   `compare.ts` ranks with.
 * - **Warm or cool** — `temperatureOf` from `@irodora/recommendation`, with the **published**
 *   poles from `content/rules`. It is the definition the outfit engine scores with, and a
 *   second one here would be the second place this product decides what warm means (E-005).
 * - **The hue arc** — `hueDelta`, the shortest signed one. Subtracting two hue angles is the
 *   one place the obvious arithmetic is wrong.
 *
 * ## Why `compare()` is not reused
 *
 * It takes two `PublishedEntry` values, deliberately — *"so a caller cannot hand it a colour
 * whose origin nobody recorded"*. **Neither side here is one:** a reading is a capture, and a
 * target may be a colour the engine generated.
 *
 * The rule is right and is kept. This takes `Color` on both sides, which carries provenance
 * under ADR-0005 for exactly that reason. A signature taking two triples would let an
 * unrecorded colour through, and is what is being refused.
 *
 * ## The word "match" appears nowhere
 *
 * `similarityPercent` exists in `@irodora/color-naming` and is **not** used. A percentage
 * invites *"96% match"*, which is a claim about identity that a distance does not make. This
 * reports a distance and a decomposition, and the claims lint holds the wording.
 */

import { deltaE00 } from '@irodora/color-difference';
import { hueDelta, xyzToLab, xyzToOklch } from '@irodora/color-spaces';
import { temperatureOf } from '@irodora/recommendation';
import type { Color } from '@irodora/color-core';
import type { CaptureQuality, Illumination } from '@irodora/color-sampling';

/** The published warm and cool poles, as the rule set holds them. */
export interface TemperaturePoles {
  readonly warm: number;
  readonly cool: number;
}

/**
 * How small a difference is reported as none.
 *
 * **Conventions, and stated as conventions.** They are not perceptual thresholds — nobody here
 * has measured what a person notices — they exist so a difference too small to act on is
 * reported as *the same* rather than as a direction somebody might chase.
 *
 * The lightness band is the coarser of the two because OKLCh L spans [0,1] and a 0.01 step is
 * already at the edge of visible on a good display; chroma at these levels is a much shorter
 * axis, so the same absolute band there would swallow real differences.
 */
export const SAME_LIGHTNESS = 0.01;
export const SAME_CHROMA = 0.005;
/** Temperature is a [-1,1] bias, so the band is on that scale rather than on degrees. */
export const SAME_TEMPERATURE = 0.05;

/** Which way an axis is off. `same` is a value, not an absence. */
export type Direction = 'same' | 'more' | 'less';

export interface AxisDifference {
  /** Signed, target → reading. A direction is information; an absolute value throws it away. */
  readonly delta: number;
  readonly direction: Direction;
}

/** What was true of the capture itself, carried so a number is never read without it. */
export interface CaptureConditions {
  readonly quality: CaptureQuality;
  readonly illumination: Illumination;
  /** In [0,1], already capped by every ceiling that applies. Never a probability. */
  readonly confidence: number;
}

export interface TargetDifference {
  /** CIELAB (D65). The distance, and the only single number this reports. */
  readonly deltaE00: number;
  /** OKLCh L, target → reading. */
  readonly lightness: AxisDifference;
  /** OKLCh C, target → reading. */
  readonly chroma: AxisDifference;
  /**
   * Warm against cool, target → reading, on `temperatureOf`'s [-1,1] scale.
   *
   * **Hue direction is expressed as temperature and not as a rotation.** "+40° of hue" is a
   * measurement a person cannot act on and "clockwise" means nothing to anybody. Warm and cool
   * is the one hue-direction vocabulary this product has a published definition for.
   */
  readonly temperature: AxisDifference;
  /** The shortest signed hue arc in degrees, reported beside the word so nothing is hidden. */
  readonly hueArc: number;
  readonly capture: CaptureConditions;
  /**
   * Whether the capture was poor, independent of the distance.
   *
   * **A perfect ΔE00 from a poor capture is still a poor capture** — which is the case criterion
   * 4 exists for, and the reason this is read off the quality rather than inferred from the
   * number.
   */
  readonly poorCapture: boolean;
}

/** The three axes this reports, in the order the screen draws them. */
export const AGAINST_AXES = ['lightness', 'chroma', 'temperature'] as const;
export type AgainstAxis = (typeof AGAINST_AXES)[number];

/** Every direction an axis can report. `same` is one of them, because it is a value. */
export const DIRECTIONS: readonly Direction[] = ['same', 'more', 'less'];

/**
 * Every message key the panel can render for an axis (F-201).
 *
 * **Derived from the two lists, not written beside them.** The screen builds
 * `against.<direction>.<axis>`, so no literal exists in source and `i18n.test.ts`'s unused-key
 * scan — which is a source-literal scan — cannot see the consumer. That exclusion is safe only
 * while both directions are pinned, exactly as it is for `explain.*` (F-052), `outfit.*`
 * (F-124), `combo.*` (F-194) and `combos.intent.*` (F-196).
 */
export const AGAINST_MESSAGE_KEYS: readonly string[] = DIRECTIONS.flatMap((direction) =>
  AGAINST_AXES.map((axis) => `against.${direction}.${axis}`),
);

/**
 * The label for each axis, built the same way the screen builds it.
 *
 * **Pinned in ONE direction, deliberately, and that is safe here.** The forward direction —
 * every axis has a label — is asserted. The reverse is covered for free by the unused-key scan
 * itself: a leftover `against.something` that nothing renders is not in this list, so it is not
 * excluded from the scan, so the scan reports it. That is not true of the direction strings
 * above, which is why those are pinned both ways.
 */
export const AGAINST_AXIS_KEYS: readonly string[] = AGAINST_AXES.map((axis) => `against.${axis}`);

const directionOf = (delta: number, band: number): Direction =>
  Math.abs(delta) <= band ? 'same' : delta > 0 ? 'more' : 'less';

/**
 * The difference between a reading and the target it was held against.
 *
 * Both sides are `Color`, so both carry provenance. Pure: the same two colours and the same
 * poles always produce the same answer.
 */
export function differenceFrom(
  target: Color,
  reading: Color,
  capture: CaptureConditions,
  poles: TemperaturePoles,
): TargetDifference {
  const targetLab = xyzToLab(target.xyz);
  const readingLab = xyzToLab(reading.xyz);
  const [tl, tc, th] = xyzToOklch(target.xyz);
  const [rl, rc, rh] = xyzToOklch(reading.xyz);

  const dl = rl - tl;
  const dc = rc - tc;
  const dt = temperatureOf(rc, rh, poles) - temperatureOf(tc, th, poles);

  return {
    deltaE00: deltaE00(targetLab, readingLab),
    lightness: { delta: dl, direction: directionOf(dl, SAME_LIGHTNESS) },
    chroma: { delta: dc, direction: directionOf(dc, SAME_CHROMA) },
    temperature: { delta: dt, direction: directionOf(dt, SAME_TEMPERATURE) },
    // The SHORTEST arc: 350° against 10° is +20, not −340.
    hueArc: hueDelta(th, rh),
    capture,
    /*
     * READ OFF THE QUALITY, NEVER INFERRED FROM THE DISTANCE. A reading that happens to land on
     * the target is not evidence that the capture was good — it is evidence that a bad number
     * and a good one can look alike, which is exactly what criterion 4 is about.
     */
    poorCapture: capture.quality === 'poor',
  };
}
