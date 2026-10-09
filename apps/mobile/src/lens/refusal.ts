/**
 * Which captures the Lens refuses, and what it says about one (F-236; ADR-0128 D1). Pure.
 *
 * FR-18: *"Poor quality blocks a confident claim and returns a specific, actionable instruction."*
 * The engine already sorts every capture into four classes by how many of its checks failed; a
 * **poor** one — three or more — is refused. The refusal names the engine's FIRST failure, in its
 * own fix-first order, so the one thing a person is asked to change is the one worth changing first.
 *
 * What the refused state says, and where each word comes from:
 *
 * - **the heading** — *Reading Refused* and the check's name. A camera estimate is a reading, never
 *   a measurement (E2, golden rule 11);
 * - **the body** — the check's quantity and the threshold it holds a capture to, read from the
 *   engine's `QUALITY_THRESHOLDS` through its rule table (never retyped here), then what to do.
 *
 * No confidence is printed (D10): a refused reading has none to give, and `27` draws none.
 */

import {
  QUALITY_CHECK_RULES,
  QUALITY_THRESHOLDS,
  type QualityCheck,
} from '@irodora/color-sampling';
import type { MessageKey } from '../i18n';
import type { LensReading } from './reading';

/**
 * The check a reading is refused for, or `null` when it is not refused.
 *
 * **It fails closed** (F-236's review, M1). The engine calls a capture poor because three or more
 * of its checks failed (`checks.test` holds that), so a poor reading naming no failure is the class
 * and its failures disagreeing: a defect, not a capture. Returning `null` would open the result sheet
 * on a poor capture, which D1 refuses, and naming a check would print a reason nobody measured; so it
 * throws, and the error boundary shows a fault.
 */
export function refusalOf(
  reading: Pick<LensReading, 'quality' | 'qualityFailures'>,
): QualityCheck | null {
  if (reading.quality !== 'poor') return null;
  const first = reading.qualityFailures[0];
  if (first === undefined)
    throw new Error(
      'refusalOf: a poor reading names no failed check — the engine’s class and its failures disagree',
    );
  return first;
}

/** Each check's words: its name, the quantity it reads, and what to do. */
const CHECK_KEYS: Readonly<
  Record<
    QualityCheck,
    { readonly name: MessageKey; readonly reason: MessageKey; readonly fix: MessageKey }
  >
> = {
  samples: {
    name: 'lens.check.samples.name',
    reason: 'lens.check.samples.reason',
    fix: 'lens.check.samples.fix',
  },
  clipping: {
    name: 'lens.check.clipping.name',
    reason: 'lens.check.clipping.reason',
    fix: 'lens.check.clipping.fix',
  },
  evenness: {
    name: 'lens.check.evenness.name',
    reason: 'lens.check.evenness.reason',
    fix: 'lens.check.evenness.fix',
  },
  sharpness: {
    name: 'lens.check.sharpness.name',
    reason: 'lens.check.sharpness.reason',
    fix: 'lens.check.sharpness.fix',
  },
  singleColour: {
    name: 'lens.check.singleColour.name',
    reason: 'lens.check.singleColour.reason',
    fix: 'lens.check.singleColour.fix',
  },
};

/** How each check's threshold reads: a count, a share of the region, or the engine's own figure. */
const FORMS: Readonly<Record<QualityCheck, 'count' | 'share' | 'figure'>> = {
  samples: 'count',
  clipping: 'share',
  evenness: 'share',
  sharpness: 'figure',
  singleColour: 'figure',
};

/** The threshold a check holds a capture to, as a person reads it. Deterministic on every engine. */
export function thresholdText(check: QualityCheck): string {
  const limit = QUALITY_THRESHOLDS[QUALITY_CHECK_RULES[check].threshold];
  switch (FORMS[check]) {
    case 'count':
      // Grouped by hand: `toLocaleString` is the platform's ICU, which NFR-3 keeps out of a figure.
      return String(limit).replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
    case 'share':
      return `${String(Math.round(limit * 100))}%`;
    case 'figure':
      return String(limit);
  }
}

/** The refused state's heading and body for one check, in the person's language. */
export function refusalText(
  check: QualityCheck,
  say: (key: MessageKey) => string,
  script: 'latin' | 'japanese',
): { readonly title: string; readonly body: string } {
  const keys = CHECK_KEYS[check];
  // Each script's own punctuation: a full-width colon and full stop, and no space between sentences.
  const [colon, stop, gap] = script === 'japanese' ? ['：', '。', ''] : [': ', '.', ' '];
  return {
    title: `${say('lens.refused.title')}${colon}${say(keys.name)}`,
    body: `${say(keys.reason)}${colon}${thresholdText(check)}${stop}${gap}${say(keys.fix)}`,
  };
}
