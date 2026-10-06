/**
 * The step pill — where a person is in a guided flow, in one line (F-235, criterion 3; mockup 17).
 *
 * `17` draws *Step 2 of 4 • Undertone & Temperature (90s Test)* in a `surface.2` pill 19 dp tall, its
 * one line in `caption` and `foreground`. It is a badge: read, never pressed (`Chip form="badge"`),
 * at its own height rather than the badge's 21.
 *
 * - **The words are the caller's** (the catalogue's, per locale), and they must print the step and
 *   the total: a pill that said *Undertone & Temperature* alone would drop where the person is. The
 *   component refuses words that do not, as `Button` refuses a back name without its word (F-234).
 * - **The figures are tabular**, so the pill does not change width as the step moves.
 */

import { Chip } from './Chip.js';
import type { Script } from './layout.js';

/** The pill's drawn height, in dp. */
export const STEP_PILL_HEIGHT = 19;

export interface StepPillProps {
  /** Which step, from 1. */
  readonly step: number;
  /** Of how many. */
  readonly total: number;
  /** The line, printing both figures: `Step 2 of 4 • Undertone & Temperature`. */
  readonly text: string;
  readonly script?: Script;
  readonly testID?: string;
}

/** Whether `text` prints `n` as a number of its own, not as a digit of another. */
function prints(text: string, n: number): boolean {
  return new RegExp(`(^|\\D)${String(n)}(\\D|$)`, 'u').test(text);
}

export function StepPill({
  step,
  total,
  text,
  script = 'latin',
  testID,
}: StepPillProps): React.JSX.Element {
  if (!Number.isInteger(step) || !Number.isInteger(total) || step < 1 || step > total) {
    throw new RangeError(`StepPill: step ${String(step)} of ${String(total)} is not a step`);
  }
  if (!prints(text, step) || !prints(text, total)) {
    throw new Error(
      `StepPill: "${text}" must print the step (${String(step)}) and the total (${String(total)})`,
    );
  }
  return (
    <Chip
      form="badge"
      label={text}
      fill="surface.2"
      radius="pill"
      height={STEP_PILL_HEIGHT}
      size="caption"
      numeric
      script={script}
      {...(testID === undefined ? {} : { testID })}
    />
  );
}
